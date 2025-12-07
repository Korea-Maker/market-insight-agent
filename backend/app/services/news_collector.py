"""
RSS 뉴스 수집 서비스
무료 암호화폐/경제 뉴스 RSS 피드에서 뉴스를 수집하고 번역하여 저장
"""
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Optional
import feedparser
from bs4 import BeautifulSoup
from deep_translator import GoogleTranslator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.database import AsyncSessionLocal
from app.models.news import News

logger = logging.getLogger(__name__)

# RSS 피드 소스 정의
RSS_FEEDS = {
    "CoinDesk": "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "CoinTelegraph": "https://cointelegraph.com/rss",
    "Bitcoin Magazine": "https://bitcoinmagazine.com/.rss/full/",
}


def parse_published_date(date_str: Optional[str]) -> Optional[datetime]:
    """
    RSS 피드의 발행 날짜 문자열을 datetime 객체로 변환
    
    Args:
        date_str: RSS 피드의 날짜 문자열
        
    Returns:
        datetime 객체 또는 None
    """
    if not date_str:
        return None
    
    try:
        # feedparser는 이미 파싱된 시간 튜플을 제공
        # 'published_parsed' 또는 'updated_parsed' 사용
        return datetime(*date_str[:6])
    except (ValueError, TypeError) as e:
        logger.warning(f"날짜 파싱 실패: {date_str}, 오류: {e}")
        return None


def clean_html(html_text: Optional[str]) -> Optional[str]:
    """
    HTML 태그를 제거하고 순수 텍스트만 추출
    
    Args:
        html_text: HTML이 포함된 텍스트
        
    Returns:
        정제된 텍스트
    """
    if not html_text:
        return None
    
    soup = BeautifulSoup(html_text, "html.parser")
    return soup.get_text(strip=True)[:500]  # 500자로 제한


async def translate_to_korean(text: str) -> Optional[str]:
    """
    텍스트를 한국어로 번역 (비동기 래퍼)
    
    Args:
        text: 번역할 텍스트
        
    Returns:
        번역된 텍스트 또는 None
    """
    try:
        # deep-translator는 동기 라이브러리이므로 별도 스레드에서 실행
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: GoogleTranslator(source='en', target='ko').translate(text)
        )
        return result
    except Exception as e:
        logger.warning(f"번역 실패: {text[:50]}..., 오류: {e}")
        return None


async def fetch_rss_feed(source: str, url: str) -> List[Dict]:
    """
    RSS 피드에서 뉴스 항목을 가져옴
    
    Args:
        source: 뉴스 소스 이름
        url: RSS 피드 URL
        
    Returns:
        뉴스 항목 리스트
    """
    try:
        # feedparser는 동기 라이브러리이므로 별도 스레드에서 실행
        loop = asyncio.get_event_loop()
        feed = await loop.run_in_executor(None, feedparser.parse, url)
        
        if feed.bozo:  # 파싱 오류 확인
            logger.warning(f"{source} RSS 피드 파싱 경고: {feed.bozo_exception}")
        
        news_items = []
        for entry in feed.entries[:10]:  # 최신 10개만 처리
            # 발행 시간 처리
            published = None
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                published = parse_published_date(entry.published_parsed)
            elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                published = parse_published_date(entry.updated_parsed)
            
            # 설명 처리 (HTML 제거)
            description = None
            if hasattr(entry, 'summary'):
                description = clean_html(entry.summary)
            elif hasattr(entry, 'description'):
                description = clean_html(entry.description)
            
            news_items.append({
                "title": entry.title,
                "link": entry.link,
                "published": published,
                "description": description,
                "source": source,
            })
        
        logger.info(f"{source}에서 {len(news_items)}개의 뉴스 항목 가져옴")
        return news_items
        
    except Exception as e:
        logger.error(f"{source} RSS 피드 가져오기 실패: {e}")
        return []


async def save_news_to_db(news_item: Dict) -> bool:
    """
    뉴스 항목을 데이터베이스에 저장
    
    Args:
        news_item: 뉴스 항목 딕셔너리
        
    Returns:
        저장 성공 여부
    """
    async with AsyncSessionLocal() as session:
        try:
            # 중복 체크 (링크 기반)
            stmt = select(News).where(News.link == news_item["link"])
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            
            if existing:
                logger.debug(f"이미 존재하는 뉴스: {news_item['link']}")
                return False
            
            # 제목 번역
            title_kr = await translate_to_korean(news_item["title"])
            
            # 새 뉴스 생성
            news = News(
                title=news_item["title"],
                title_kr=title_kr,
                link=news_item["link"],
                published=news_item.get("published"),
                source=news_item["source"],
                description=news_item.get("description"),
            )
            
            session.add(news)
            await session.commit()
            
            logger.info(f"새 뉴스 저장: {news_item['title'][:50]}... (출처: {news_item['source']})")
            return True
            
        except IntegrityError:
            # 동시성 문제로 중복 삽입 시도 시
            await session.rollback()
            logger.debug(f"중복 뉴스 삽입 시도: {news_item['link']}")
            return False
        except Exception as e:
            await session.rollback()
            logger.error(f"뉴스 저장 실패: {e}")
            return False


async def collect_news():
    """
    모든 RSS 피드에서 뉴스를 수집하고 저장
    스케줄러에 의해 주기적으로 호출됨
    """
    logger.info("뉴스 수집 시작...")
    
    total_collected = 0
    total_saved = 0
    
    # 모든 RSS 피드 순회
    for source, url in RSS_FEEDS.items():
        try:
            # RSS 피드에서 뉴스 가져오기
            news_items = await fetch_rss_feed(source, url)
            total_collected += len(news_items)
            
            # 각 뉴스 항목 저장 (순차 처리 - 번역 API rate limit 고려)
            for news_item in news_items:
                saved = await save_news_to_db(news_item)
                if saved:
                    total_saved += 1
                
                # 번역 API rate limit 방지를 위한 짧은 대기
                await asyncio.sleep(0.5)
            
        except Exception as e:
            logger.error(f"{source} 뉴스 수집 중 오류: {e}")
    
    logger.info(f"뉴스 수집 완료: {total_collected}개 수집, {total_saved}개 새로 저장")


async def run_news_collector():
    """
    뉴스 수집기 백그라운드 태스크
    주기적으로 뉴스를 수집
    """
    logger.info("뉴스 수집기 백그라운드 태스크 시작")
    
    while True:
        try:
            await collect_news()
            # 10초 대기 후 다음 수집
            await asyncio.sleep(10)
        except asyncio.CancelledError:
            logger.info("뉴스 수집기 태스크 취소됨")
            break
        except Exception as e:
            logger.error(f"뉴스 수집기 오류: {e}")
            # 오류 발생 시 30초 대기 후 재시도
            await asyncio.sleep(30)
