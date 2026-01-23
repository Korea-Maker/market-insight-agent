"""
뉴스 API 라우터
수집된 뉴스를 조회하는 엔드포인트 제공
"""
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.news import News

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/news",
    tags=["news"],
)


# Pydantic 응답 모델
class NewsResponse(BaseModel):
    """뉴스 응답 모델"""
    id: int
    title: str
    title_kr: Optional[str]
    link: str
    published: Optional[datetime]
    source: str
    description: Optional[str]
    description_kr: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class NewsListResponse(BaseModel):
    """뉴스 목록 응답 모델"""
    total: int
    items: List[NewsResponse]


@router.get("/", response_model=NewsListResponse)
async def get_news(
    skip: int = Query(0, ge=0, description="건너뛸 항목 수"),
    limit: int = Query(20, ge=1, le=100, description="가져올 항목 수 (최대 100)"),
    source: Optional[str] = Query(None, description="특정 소스로 필터링"),
    db: AsyncSession = Depends(get_db),
):
    """
    뉴스 목록 조회
    
    - **skip**: 페이지네이션을 위한 건너뛸 항목 수
    - **limit**: 가져올 항목 수 (최대 100)
    - **source**: 특정 소스로 필터링 (예: CoinDesk, CoinTelegraph)
    """
    # 기본 쿼리: 최신순 정렬
    query = select(News).order_by(desc(News.published), desc(News.created_at))
    count_query = select(func.count()).select_from(News)

    # 소스 필터링
    if source:
        query = query.where(News.source == source)
        count_query = count_query.where(News.source == source)

    # 전체 개수 조회
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # 페이지네이션 적용 및 뉴스 조회
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    news_items = result.scalars().all()

    return NewsListResponse(
        total=total,
        items=[NewsResponse.model_validate(item) for item in news_items]
    )


@router.get("/sources", response_model=List[str])
async def get_news_sources(db: AsyncSession = Depends(get_db)):
    """
    사용 가능한 뉴스 소스 목록 조회
    """
    query = select(News.source).distinct()
    result = await db.execute(query)
    return [row[0] for row in result.all()]


@router.get("/{news_id}", response_model=NewsResponse)
async def get_news_by_id(
    news_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    특정 뉴스 상세 조회

    - **news_id**: 뉴스 ID
    """
    query = select(News).where(News.id == news_id)
    result = await db.execute(query)
    news = result.scalar_one_or_none()

    if not news:
        raise HTTPException(status_code=404, detail="뉴스를 찾을 수 없습니다")

    return NewsResponse.model_validate(news)
