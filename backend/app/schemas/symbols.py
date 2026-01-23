"""
심볼 관련 Pydantic 스키마
"""
from typing import List, Optional
from pydantic import BaseModel


class SymbolInfo(BaseModel):
    """개별 심볼 정보"""
    symbol: str
    base_asset: str
    quote_asset: str
    status: str = "active"
    icon: str

    class Config:
        json_schema_extra = {
            "example": {
                "symbol": "BTCUSDT",
                "base_asset": "BTC",
                "quote_asset": "USDT",
                "status": "active",
                "icon": "btc"
            }
        }


class SupportedSymbolsResponse(BaseModel):
    """지원 심볼 목록 응답"""
    symbols: List[SymbolInfo]
    default_symbols: List[str]

    class Config:
        json_schema_extra = {
            "example": {
                "symbols": [
                    {
                        "symbol": "BTCUSDT",
                        "base_asset": "BTC",
                        "quote_asset": "USDT",
                        "status": "active",
                        "icon": "btc"
                    }
                ],
                "default_symbols": ["BTCUSDT", "ETHUSDT"]
            }
        }


class BatchCandlesRequest(BaseModel):
    """다중 심볼 캔들 요청"""
    symbols: List[str]
    interval: str = "1m"
    limit: int = 100


class CandleData(BaseModel):
    """캔들 데이터"""
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: float


class SymbolCandles(BaseModel):
    """심볼별 캔들 데이터"""
    candles: List[CandleData]


class BatchCandlesResponse(BaseModel):
    """다중 심볼 캔들 응답"""
    data: dict  # symbol -> SymbolCandles
