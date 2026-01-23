"""
시장 분석 API 라우터
AI 생성 시장 분석 결과를 조회하고 트리거하는 엔드포인트 제공 (v2)
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.market_insight import MarketInsight
from app.schemas.analysis import (
    MarketInsightResponse,
    MarketInsightListResponse,
    AnalysisTriggerResponse,
    NewsPreview,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


@router.get("/latest", response_model=MarketInsightResponse)
async def get_latest_analysis(
    symbol: str = Query("BTCUSDT", description="거래 쌍 (예: BTCUSDT)"),
    db: AsyncSession = Depends(get_db),
):
    """
    최신 시장 분석 조회

    - **symbol**: 거래 쌍 (기본값: BTCUSDT)

    특정 심볼에 대한 가장 최신 분석 결과 1개를 반환합니다.
    """
    try:
        query = (
            select(MarketInsight)
            .options(selectinload(MarketInsight.related_news))
            .where(MarketInsight.symbol == symbol)
            .order_by(desc(MarketInsight.created_at))
            .limit(1)
        )

        result = await db.execute(query)
        insight = result.scalar_one_or_none()

        if not insight:
            raise HTTPException(
                status_code=404,
                detail=f"심볼 '{symbol}'에 대한 분석 결과를 찾을 수 없습니다"
            )

        # 관련 뉴스 변환
        news_previews = [
            NewsPreview.model_validate(news) for news in insight.related_news
        ]

        # 응답 객체 생성
        response_data = MarketInsightResponse.model_validate(insight)
        response_data.related_news = news_previews

        logger.info(f"최신 분석 조회 성공: {symbol} (ID: {insight.id})")
        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"최신 분석 조회 실패: {symbol} - {str(e)}")
        raise HTTPException(status_code=500, detail=f"분석 조회 중 오류가 발생했습니다: {str(e)}")


@router.get("/history", response_model=MarketInsightListResponse)
async def get_analysis_history(
    symbol: str = Query("BTCUSDT", description="거래 쌍 (예: BTCUSDT)"),
    limit: int = Query(20, ge=1, le=100, description="가져올 항목 수 (최대 100)"),
    skip: int = Query(0, ge=0, description="건너뛸 항목 수"),
    db: AsyncSession = Depends(get_db),
):
    """
    시장 분석 이력 조회

    - **symbol**: 거래 쌍 (기본값: BTCUSDT)
    - **limit**: 가져올 항목 수 (기본값: 20, 최대 100)
    - **skip**: 페이지네이션을 위한 건너뛸 항목 수 (기본값: 0)

    특정 심볼에 대한 과거 분석 이력을 페이지네이션하여 반환합니다.
    """
    try:
        # 전체 개수 조회
        count_query = select(func.count()).select_from(MarketInsight).where(
            MarketInsight.symbol == symbol
        )
        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        # 분석 이력 조회 (selectinload로 관련 뉴스 즉시 로딩)
        query = (
            select(MarketInsight)
            .options(selectinload(MarketInsight.related_news))
            .where(MarketInsight.symbol == symbol)
            .order_by(desc(MarketInsight.created_at))
            .offset(skip)
            .limit(limit)
        )

        result = await db.execute(query)
        insights = result.scalars().all()

        # 각 분석 결과에 관련 뉴스 추가
        items = []
        for insight in insights:
            news_previews = [
                NewsPreview.model_validate(news) for news in insight.related_news
            ]
            response_data = MarketInsightResponse.model_validate(insight)
            response_data.related_news = news_previews
            items.append(response_data)

        logger.info(f"분석 이력 조회: {symbol} (total: {total}, skip: {skip}, limit: {limit})")

        return MarketInsightListResponse(
            total=total,
            items=items,
        )

    except Exception as e:
        logger.error(f"분석 이력 조회 실패: {symbol} - {str(e)}")
        raise HTTPException(status_code=500, detail=f"분석 이력 조회 중 오류가 발생했습니다: {str(e)}")


@router.post("/trigger", response_model=AnalysisTriggerResponse)
async def trigger_analysis(
    symbol: str = Query("BTCUSDT", description="거래 쌍 (예: BTCUSDT)"),
    db: AsyncSession = Depends(get_db),
):
    """
    수동 시장 분석 트리거 (관리자용)

    - **symbol**: 거래 쌍 (기본값: BTCUSDT)

    MarketInsightEngine을 호출하여 즉시 시장 분석을 수행합니다.
    분석 완료 후 생성된 insight_id를 반환합니다.

    **주의**: 이 엔드포인트는 관리자 전용이며, 향후 인증이 추가될 예정입니다.
    """
    try:
        # MarketInsightEngine 임포트 및 호출
        from app.services.market_insight_engine import MarketInsightEngine

        engine = MarketInsightEngine()
        insight = await engine.generate_insight(symbol=symbol)

        if insight is None:
            raise HTTPException(
                status_code=503,
                detail="OPENAI_API_KEY가 설정되지 않아 AI 분석을 수행할 수 없습니다. 환경 변수를 설정해주세요."
            )

        logger.info(f"분석 트리거 성공: {symbol} (ID: {insight.id})")

        return AnalysisTriggerResponse(
            message="분석이 성공적으로 완료되었습니다",
            insight_id=insight.id,
            recommendation=insight.recommendation.value,
        )

    except ImportError:
        logger.warning(f"분석 트리거 요청: {symbol} (MarketInsightEngine 미구현)")
        raise HTTPException(
            status_code=501,
            detail="MarketInsightEngine이 아직 구현되지 않았습니다. 백그라운드 자동 분석을 사용하세요."
        )
    except Exception as e:
        logger.error(f"분석 트리거 실패: {symbol} - {str(e)}")
        raise HTTPException(status_code=500, detail=f"분석 중 오류가 발생했습니다: {str(e)}")
