"""
RSS 뉴스 수집 서비스
무료 암호화폐/경제 뉴스 RSS 피드에서 뉴스를 수집하고 번역하여 저장
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional
import feedparser
import httpx
from bs4 import BeautifulSoup
from deep_translator import GoogleTranslator
from sqlalchemy import select, and_
from sqlalchemy.exc import IntegrityError

from app.core.database import AsyncSessionLocal
from app.models.news import News
from app.models.source import IntelligenceSource

logger = logging.getLogger(__name__)

# RSS 피드 소스 정의 (테스트 완료된 암호화폐/경제 뉴스 소스)
# 2026-01-22 기준 동작 확인된 피드만 포함
RSS_FEEDS = {
    # 주요 암호화폐 뉴스 (모두 테스트 완료)
    "CoinDesk": "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "CoinTelegraph": "https://cointelegraph.com/rss",
    "Decrypt": "https://decrypt.co/feed",
    "The Block": "https://www.theblock.co/rss.xml",
    "CryptoSlate": "https://cryptoslate.com/feed/",
    "NewsBTC": "https://www.newsbtc.com/feed/",
    "Bitcoinist": "https://bitcoinist.com/feed/",
    "U.Today": "https://u.today/rss",
    "AMBCrypto": "https://ambcrypto.com/feed/",
    # 일반 금융/경제 뉴스 (암호화폐 관련)
    "Investing.com Crypto": "https://www.investing.com/rss/news_301.rss",
}

# 기본 소스 정의 (데이터베이스 마이그레이션용)
# 테스트 완료된 10개 소스만 포함
DEFAULT_SOURCES = [
    # 주요 암호화폐 뉴스
    {"name": "CoinDesk", "url": "https://www.coindesk.com/arc/outboundfeeds/rss/", "source_type": "rss"},
    {"name": "CoinTelegraph", "url": "https://cointelegraph.com/rss", "source_type": "rss"},
    {"name": "Decrypt", "url": "https://decrypt.co/feed", "source_type": "rss"},
    {"name": "The Block", "url": "https://www.theblock.co/rss.xml", "source_type": "rss"},
    {"name": "CryptoSlate", "url": "https://cryptoslate.com/feed/", "source_type": "rss"},
    {"name": "NewsBTC", "url": "https://www.newsbtc.com/feed/", "source_type": "rss"},
    {"name": "Bitcoinist", "url": "https://bitcoinist.com/feed/", "source_type": "rss"},
    {"name": "U.Today", "url": "https://u.today/rss", "source_type": "rss"},
    {"name": "AMBCrypto", "url": "https://ambcrypto.com/feed/", "source_type": "rss"},
    # 일반 금융/경제 뉴스 (암호화폐 관련)
    {"name": "Investing.com Crypto", "url": "https://www.investing.com/rss/news_301.rss", "source_type": "rss"},
]


async def ensure_default_sources():
    """
    하드코딩된 기본 소스를 데이터베이스에 마이그레이션
    이미 존재하는 소스는 건너뜀 (이름 기준)
    """
    async with AsyncSessionLocal() as session:
        for source_data in DEFAULT_SOURCES:
            stmt = select(IntelligenceSource).where(IntelligenceSource.name == source_data["name"])
            result = await session.execute(stmt)
            if not result.scalar_one_or_none():
                source = IntelligenceSource(**source_data)
                session.add(source)
                logger.info(f"기본 소스 추가: {source_data['name']}")
        await session.commit()
        logger.info("기본 소스 마이그레이션 완료")


async def get_enabled_sources() -> List[Dict]:
    """
    데이터베이스에서 활성화된 RSS 소스 목록을 조회

    Returns:
        활성화된 소스 목록 [{"name": str, "url": str}, ...]
    """
    async with AsyncSessionLocal() as session:
        stmt = select(IntelligenceSource).where(
            and_(
                IntelligenceSource.is_enabled == True,
                IntelligenceSource.source_type == "rss"
            )
        )
        result = await session.execute(stmt)
        sources = result.scalars().all()

        enabled_sources = [
            {"name": source.name, "url": source.url}
            for source in sources
        ]

        logger.debug(f"활성화된 RSS 소스 {len(enabled_sources)}개 조회됨")
        return enabled_sources


async def update_source_success(source_name: str) -> None:
    """
    소스 수집 성공 시 상태 업데이트

    Args:
        source_name: 소스 이름
    """
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(IntelligenceSource).where(IntelligenceSource.name == source_name)
            result = await session.execute(stmt)
            source = result.scalar_one_or_none()

            if source:
                source.last_fetch_at = datetime.now(timezone.utc)
                source.last_success_at = datetime.now(timezone.utc)
                source.success_count = (source.success_count or 0) + 1
                source.last_error = None
                await session.commit()
                logger.debug(f"{source_name} 소스 성공 상태 업데이트 완료")
        except Exception as e:
            await session.rollback()
            logger.error(f"{source_name} 소스 성공 상태 업데이트 실패: {e}")


async def update_source_failure(source_name: str, error: str) -> None:
    """
    소스 수집 실패 시 상태 업데이트

    Args:
        source_name: 소스 이름
        error: 오류 메시지
    """
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(IntelligenceSource).where(IntelligenceSource.name == source_name)
            result = await session.execute(stmt)
            source = result.scalar_one_or_none()

            if source:
                source.last_fetch_at = datetime.now(timezone.utc)
                source.failure_count = (source.failure_count or 0) + 1
                source.last_error = str(error)[:1000]  # 오류 메시지 길이 제한
                await session.commit()
                logger.debug(f"{source_name} 소스 실패 상태 업데이트 완료")
        except Exception as e:
            await session.rollback()
            logger.error(f"{source_name} 소스 실패 상태 업데이트 실패: {e}")


def parse_published_date(date_tuple) -> Optional[datetime]:
    """
    RSS 피드의 발행 날짜를 datetime 객체로 변환

    Args:
        date_tuple: feedparser의 time.struct_time 튜플 또는 None

    Returns:
        datetime 객체 또는 None
    """
    if not date_tuple:
        return None

    try:
        # feedparser는 이미 파싱된 시간 튜플을 제공 (time.struct_time)
        # 'published_parsed' 또는 'updated_parsed'에서 받은 튜플 사용
        return datetime(*date_tuple[:6])
    except (ValueError, TypeError) as e:
        logger.warning(f"날짜 파싱 실패: {date_tuple}, 오류: {e}")
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
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None,
            lambda: GoogleTranslator(source='en', target='ko').translate(text)
        )
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
        # httpx로 RSS 피드 내용 가져오기 (SSL 검증 비활성화, 리다이렉트 자동 따라가기)
        async with httpx.AsyncClient(timeout=15.0, verify=False, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            content = response.text

        # feedparser로 파싱
        feed = feedparser.parse(content)

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

            # 설명 번역 (있는 경우)
            description = news_item.get("description")
            description_kr = None
            if description:
                description_kr = await translate_to_korean(description)

            # 새 뉴스 생성
            news = News(
                title=news_item["title"],
                title_kr=title_kr,
                link=news_item["link"],
                published=news_item.get("published"),
                source=news_item["source"],
                description=description,
                description_kr=description_kr,
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


async def process_single_source(source_info: Dict, semaphore: asyncio.Semaphore) -> tuple[int, int]:
    """
    단일 RSS 소스에서 뉴스를 수집하고 저장 (병렬 처리용)

    Args:
        source_info: 소스 정보 딕셔너리 {"name": str, "url": str}
        semaphore: 번역 API rate limit 관리용 세마포어

    Returns:
        (수집된 뉴스 수, 저장된 뉴스 수) 튜플
    """
    source = source_info["name"]
    url = source_info["url"]
    collected = 0
    saved = 0

    try:
        # RSS 피드에서 뉴스 가져오기
        news_items = await fetch_rss_feed(source, url)
        collected = len(news_items)

        # 각 뉴스 항목 병렬 저장 (세마포어로 동시 번역 수 제한)
        save_tasks = []
        for news_item in news_items:
            save_tasks.append(save_news_with_semaphore(news_item, semaphore))

        # 모든 저장 작업 병렬 실행
        results = await asyncio.gather(*save_tasks, return_exceptions=True)
        saved = sum(1 for r in results if r is True)

        # 소스 수집 성공 상태 업데이트
        await update_source_success(source)
        logger.info(f"{source}: {collected}개 수집, {saved}개 저장")

    except Exception as e:
        logger.error(f"{source} 뉴스 수집 중 오류: {e}")
        # 소스 수집 실패 상태 업데이트
        await update_source_failure(source, str(e))

    return collected, saved


async def save_news_with_semaphore(news_item: Dict, semaphore: asyncio.Semaphore) -> bool:
    """
    세마포어를 사용하여 뉴스를 저장 (번역 API rate limit 관리)

    Args:
        news_item: 뉴스 항목 딕셔너리
        semaphore: 동시 실행 수 제한용 세마포어

    Returns:
        저장 성공 여부
    """
    async with semaphore:
        result = await save_news_to_db(news_item)
        # 번역 API rate limit 방지를 위한 짧은 대기
        await asyncio.sleep(0.3)
        return result


async def collect_news():
    """
    모든 RSS 피드에서 뉴스를 수집하고 저장 (병렬 처리)
    스케줄러에 의해 주기적으로 호출됨
    데이터베이스에서 활성화된 소스를 조회하여 사용
    """
    logger.info("뉴스 수집 시작...")

    # 데이터베이스에서 활성화된 RSS 소스 조회
    enabled_sources = await get_enabled_sources()

    if not enabled_sources:
        logger.warning("활성화된 RSS 소스가 없습니다. 뉴스 수집을 건너뜁니다.")
        return

    logger.info(f"활성화된 RSS 소스 {len(enabled_sources)}개로 뉴스 수집 시작")

    # 번역 API rate limit 관리용 세마포어 (동시 최대 5개 번역)
    semaphore = asyncio.Semaphore(5)

    # 모든 RSS 소스를 병렬로 처리
    tasks = [process_single_source(source_info, semaphore) for source_info in enabled_sources]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # 결과 집계
    total_collected = 0
    total_saved = 0
    for result in results:
        if isinstance(result, tuple):
            collected, saved = result
            total_collected += collected
            total_saved += saved
        elif isinstance(result, Exception):
            logger.error(f"소스 처리 중 예외 발생: {result}")

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
