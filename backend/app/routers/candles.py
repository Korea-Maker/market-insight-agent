"""
캔들 데이터 API 라우터
Binance API를 통해 과거 OHLC 데이터를 제공
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Candles"])

# Binance REST API URL
BINANCE_API_BASE = "https://api.binance.com/api/v3"


class CandleData(BaseModel):
    """캔들 데이터 모델"""
    time: int  # Unix timestamp in seconds
    open: float
    high: float
    low: float
    close: float
    volume: float


class CandlesResponse(BaseModel):
    """캔들 데이터 응답 모델"""
    symbol: str
    interval: str
    candles: list[CandleData]


async def fetch_binance_candles(
    symbol: str = "BTCUSDT",
    interval: str = "1m",
    limit: int = 500,
    end_time: Optional[int] = None,
) -> list[dict]:
    """
    Binance API에서 캔들 데이터 가져오기
    
    Args:
        symbol: 거래 쌍 (예: BTCUSDT)
        interval: 시간 간격 (1m, 5m, 15m, 1h, 4h, 1d 등)
        limit: 가져올 캔들 수 (최대 1000)
        end_time: 종료 시간 (Unix timestamp in milliseconds, 선택)
        
    Returns:
        Binance 캔들 데이터 리스트
    """
    try:
        url = f"{BINANCE_API_BASE}/klines"
        params = {
            "symbol": symbol.upper(),
            "interval": interval,
            "limit": min(limit, 1000),  # Binance 최대 제한
        }
        
        if end_time:
            params["endTime"] = end_time
        
        # 테스트 환경에서 SSL 검증 비활성화 (프로덕션에서는 제거)
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"Binance 캔들 데이터 수신: {len(data)}개")
            return data
            
    except httpx.HTTPError as e:
        logger.error(f"Binance API 요청 실패: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Binance API 요청 실패: {str(e)}"
        )
    except Exception as e:
        logger.error(f"캔들 데이터 가져오기 오류: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"캔들 데이터 가져오기 오류: {str(e)}"
        )


def parse_binance_candle(binance_candle: list) -> CandleData:
    """
    Binance 캔들 데이터를 정규화된 형식으로 변환
    
    Binance klines 응답 형식:
    [
        1499040000000,      // Open time
        "0.01634790",       // Open
        "0.80000000",       // High
        "0.01575800",       // Low
        "0.01577100",       // Close
        "148976.11427815",  // Volume
        1499644799999,      // Close time
        "2434.19055334",    // Quote asset volume
        308,                // Number of trades
        "1756.87402397",    // Taker buy base asset volume
        "28.46694368",      // Taker buy quote asset volume
        "0"                 // Ignore
    ]
    
    Args:
        binance_candle: Binance API에서 받은 캔들 데이터 배열
        
    Returns:
        정규화된 캔들 데이터
    """
    return CandleData(
        time=int(binance_candle[0] / 1000),  # milliseconds to seconds
        open=float(binance_candle[1]),
        high=float(binance_candle[2]),
        low=float(binance_candle[3]),
        close=float(binance_candle[4]),
        volume=float(binance_candle[5]),
    )


@router.get("/candles", response_model=CandlesResponse)
async def get_candles(
    symbol: str = Query(default="BTCUSDT", description="거래 쌍 (예: BTCUSDT)"),
    interval: str = Query(
        default="1m",
        description="시간 간격 (1m, 5m, 15m, 1h, 4h, 1d 등)",
        pattern="^(1m|3m|5m|15m|30m|1h|2h|4h|6h|8h|12h|1d|3d|1w|1M)$",
    ),
    limit: int = Query(default=500, ge=1, le=1000, description="가져올 캔들 수 (최대 1000)"),
    end_time: Optional[int] = Query(default=None, description="종료 시간 (Unix timestamp in milliseconds)"),
):
    """
    과거 캔들 데이터 가져오기
    
    Binance API를 통해 지정된 기간의 OHLC(Open, High, Low, Close) 데이터를 가져옵니다.
    
    Args:
        symbol: 거래 쌍 (기본값: BTCUSDT)
        interval: 시간 간격 (기본값: 1m)
        limit: 가져올 캔들 수 (기본값: 500, 최대: 1000)
        end_time: 종료 시간 (선택, Unix timestamp in milliseconds)
        
    Returns:
        캔들 데이터 리스트
    """
    # Binance API에서 데이터 가져오기
    binance_candles = await fetch_binance_candles(
        symbol=symbol,
        interval=interval,
        limit=limit,
        end_time=end_time,
    )

    # 데이터 정규화
    candles = [parse_binance_candle(candle) for candle in binance_candles]

    logger.info(f"캔들 데이터 반환: {len(candles)}개 ({symbol}, {interval})")

    return CandlesResponse(
        symbol=symbol.upper(),
        interval=interval,
        candles=candles,
    )
