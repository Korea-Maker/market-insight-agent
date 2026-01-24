"""
심볼 REST API 라우터
지원 심볼 목록 및 메타데이터 제공
"""
from typing import List
from fastapi import APIRouter

from app.core.config import settings
from app.schemas.symbols import SymbolInfo, SupportedSymbolsResponse

router = APIRouter(prefix="/api/symbols", tags=["symbols"])

# 지원 심볼 목록 (정적 정의)
SUPPORTED_SYMBOLS: List[SymbolInfo] = [
    SymbolInfo(symbol="BTCUSDT", base_asset="BTC", quote_asset="USDT", icon="btc"),
    SymbolInfo(symbol="ETHUSDT", base_asset="ETH", quote_asset="USDT", icon="eth"),
    SymbolInfo(symbol="BNBUSDT", base_asset="BNB", quote_asset="USDT", icon="bnb"),
    SymbolInfo(symbol="SOLUSDT", base_asset="SOL", quote_asset="USDT", icon="sol"),
    SymbolInfo(symbol="XRPUSDT", base_asset="XRP", quote_asset="USDT", icon="xrp"),
    SymbolInfo(symbol="ADAUSDT", base_asset="ADA", quote_asset="USDT", icon="ada"),
    SymbolInfo(symbol="DOGEUSDT", base_asset="DOGE", quote_asset="USDT", icon="doge"),
    SymbolInfo(symbol="MATICUSDT", base_asset="MATIC", quote_asset="USDT", icon="matic"),
    SymbolInfo(symbol="DOTUSDT", base_asset="DOT", quote_asset="USDT", icon="dot"),
    SymbolInfo(symbol="AVAXUSDT", base_asset="AVAX", quote_asset="USDT", icon="avax"),
    SymbolInfo(symbol="LINKUSDT", base_asset="LINK", quote_asset="USDT", icon="link"),
    SymbolInfo(symbol="UNIUSDT", base_asset="UNI", quote_asset="USDT", icon="uni"),
    SymbolInfo(symbol="AAVEUSDT", base_asset="AAVE", quote_asset="USDT", icon="aave"),
    SymbolInfo(symbol="LTCUSDT", base_asset="LTC", quote_asset="USDT", icon="ltc"),
    SymbolInfo(symbol="ATOMUSDT", base_asset="ATOM", quote_asset="USDT", icon="atom"),
]


@router.get("", response_model=SupportedSymbolsResponse)
async def get_supported_symbols() -> SupportedSymbolsResponse:
    """
    지원되는 심볼 목록 조회

    Returns:
        지원 심볼 목록 및 기본 심볼
    """
    return SupportedSymbolsResponse(
        symbols=SUPPORTED_SYMBOLS,
        default_symbols=settings.DEFAULT_SYMBOLS
    )


@router.get("/{symbol}", response_model=SymbolInfo)
async def get_symbol_info(symbol: str) -> SymbolInfo:
    """
    특정 심볼 정보 조회

    Args:
        symbol: 심볼명 (예: BTCUSDT)

    Returns:
        심볼 정보
    """
    symbol_upper = symbol.upper()
    for s in SUPPORTED_SYMBOLS:
        if s.symbol == symbol_upper:
            return s

    # 없는 심볼이면 기본 정보 생성
    # 실제로는 404를 반환하거나 Binance API에서 조회할 수 있음
    base = symbol_upper.replace("USDT", "").replace("BUSD", "")
    return SymbolInfo(
        symbol=symbol_upper,
        base_asset=base,
        quote_asset="USDT" if "USDT" in symbol_upper else "BUSD",
        icon=base.lower()
    )
