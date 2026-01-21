"""
소스 API 라우터
정보 소스(RSS 피드 등) CRUD 엔드포인트 제공
"""
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.source import IntelligenceSource

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/sources",
    tags=["sources"],
)


# Pydantic 응답 모델
class SourceResponse(BaseModel):
    """소스 응답 모델"""
    id: int
    name: str
    source_type: str
    url: str
    is_enabled: bool
    fetch_interval_seconds: int
    last_fetch_at: Optional[datetime]
    last_success_at: Optional[datetime]
    success_count: int
    failure_count: int
    last_error: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SourceListResponse(BaseModel):
    """소스 목록 응답 모델"""
    total: int
    items: List[SourceResponse]


class SourceCreateRequest(BaseModel):
    """소스 생성 요청 모델"""
    name: str = Field(..., min_length=1, max_length=100, description="소스 이름")
    source_type: str = Field(default="rss", max_length=50, description="소스 유형 (rss, api 등)")
    url: str = Field(..., min_length=1, max_length=1000, description="소스 URL")
    is_enabled: bool = Field(default=True, description="활성화 여부")
    fetch_interval_seconds: int = Field(default=600, ge=60, description="수집 주기 (초, 최소 60초)")


class SourceUpdateRequest(BaseModel):
    """소스 수정 요청 모델"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="소스 이름")
    source_type: Optional[str] = Field(None, max_length=50, description="소스 유형 (rss, api 등)")
    url: Optional[str] = Field(None, min_length=1, max_length=1000, description="소스 URL")
    is_enabled: Optional[bool] = Field(None, description="활성화 여부")
    fetch_interval_seconds: Optional[int] = Field(None, ge=60, description="수집 주기 (초, 최소 60초)")


@router.get("/", response_model=SourceListResponse)
async def get_sources(
    skip: int = Query(0, ge=0, description="건너뛸 항목 수"),
    limit: int = Query(20, ge=1, le=100, description="가져올 항목 수 (최대 100)"),
    source_type: Optional[str] = Query(None, description="특정 소스 유형으로 필터링"),
    is_enabled: Optional[bool] = Query(None, description="활성화 여부로 필터링"),
    db: AsyncSession = Depends(get_db),
):
    """
    소스 목록 조회

    - **skip**: 페이지네이션을 위한 건너뛸 항목 수
    - **limit**: 가져올 항목 수 (최대 100)
    - **source_type**: 특정 소스 유형으로 필터링 (예: rss, api)
    - **is_enabled**: 활성화 여부로 필터링
    """
    # 기본 쿼리: 생성일 최신순 정렬
    query = select(IntelligenceSource).order_by(desc(IntelligenceSource.created_at))
    count_query = select(func.count()).select_from(IntelligenceSource)

    # 소스 유형 필터링
    if source_type:
        query = query.where(IntelligenceSource.source_type == source_type)
        count_query = count_query.where(IntelligenceSource.source_type == source_type)

    # 활성화 여부 필터링
    if is_enabled is not None:
        query = query.where(IntelligenceSource.is_enabled == is_enabled)
        count_query = count_query.where(IntelligenceSource.is_enabled == is_enabled)

    # 전체 개수 조회
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # 페이지네이션 적용 및 소스 조회
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    source_items = result.scalars().all()

    return SourceListResponse(
        total=total,
        items=[SourceResponse.model_validate(item) for item in source_items]
    )


@router.post("/", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def create_source(
    request: SourceCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    새 소스 생성

    - **name**: 소스 이름 (유니크)
    - **source_type**: 소스 유형 (기본값: rss)
    - **url**: 소스 URL
    - **is_enabled**: 활성화 여부 (기본값: true)
    - **fetch_interval_seconds**: 수집 주기 (기본값: 600초)
    """
    # 이름 중복 확인
    existing_query = select(IntelligenceSource).where(IntelligenceSource.name == request.name)
    existing_result = await db.execute(existing_query)
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"이름이 '{request.name}'인 소스가 이미 존재합니다"
        )

    # 새 소스 생성
    new_source = IntelligenceSource(
        name=request.name,
        source_type=request.source_type,
        url=request.url,
        is_enabled=request.is_enabled,
        fetch_interval_seconds=request.fetch_interval_seconds,
    )

    db.add(new_source)
    await db.commit()
    await db.refresh(new_source)

    logger.info(f"새 소스 생성: {new_source.name} (ID: {new_source.id})")

    return SourceResponse.model_validate(new_source)


@router.get("/{source_id}", response_model=SourceResponse)
async def get_source_by_id(
    source_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    특정 소스 상세 조회

    - **source_id**: 소스 ID
    """
    query = select(IntelligenceSource).where(IntelligenceSource.id == source_id)
    result = await db.execute(query)
    source = result.scalar_one_or_none()

    if not source:
        raise HTTPException(status_code=404, detail="소스를 찾을 수 없습니다")

    return SourceResponse.model_validate(source)


@router.patch("/{source_id}", response_model=SourceResponse)
async def update_source(
    source_id: int,
    request: SourceUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    소스 수정

    - **source_id**: 소스 ID
    - 요청 본문에 수정할 필드만 포함
    """
    # 소스 조회
    query = select(IntelligenceSource).where(IntelligenceSource.id == source_id)
    result = await db.execute(query)
    source = result.scalar_one_or_none()

    if not source:
        raise HTTPException(status_code=404, detail="소스를 찾을 수 없습니다")

    # 이름 변경 시 중복 확인
    if request.name and request.name != source.name:
        existing_query = select(IntelligenceSource).where(IntelligenceSource.name == request.name)
        existing_result = await db.execute(existing_query)
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"이름이 '{request.name}'인 소스가 이미 존재합니다"
            )

    # 요청된 필드만 업데이트
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(source, field, value)

    await db.commit()
    await db.refresh(source)

    logger.info(f"소스 수정: {source.name} (ID: {source.id})")

    return SourceResponse.model_validate(source)


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    소스 삭제

    - **source_id**: 소스 ID
    """
    # 소스 조회
    query = select(IntelligenceSource).where(IntelligenceSource.id == source_id)
    result = await db.execute(query)
    source = result.scalar_one_or_none()

    if not source:
        raise HTTPException(status_code=404, detail="소스를 찾을 수 없습니다")

    source_name = source.name
    await db.delete(source)
    await db.commit()

    logger.info(f"소스 삭제: {source_name} (ID: {source_id})")

    return None
