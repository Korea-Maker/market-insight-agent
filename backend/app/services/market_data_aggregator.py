"""
Market Data Aggregator Service

Binance API에서 가격 데이터와 기술적 지표를 수집하는 서비스
"""

import httpx
import pandas as pd
import ta
from dataclasses import dataclass
from datetime import datetime
from typing import List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


@dataclass
class MarketSnapshot:
    """시장 스냅샷 데이터 클래스"""
    symbol: str
    timestamp: datetime

    # 가격 데이터
    current_price: float
    price_change_1h: float  # %
    price_change_24h: float  # %
    price_change_7d: float  # %

    # 거래량 데이터
    volume_24h: float
    volume_change_24h: float  # %

    # 기술적 지표
    rsi_14: Optional[float]  # 0-100
    macd: Optional[float]
    macd_signal: Optional[float]
    bb_upper: Optional[float]  # 볼린저 밴드
    bb_middle: Optional[float]
    bb_lower: Optional[float]

    # 변동성
    volatility_24h: Optional[float]  # %


class MarketDataAggregator:
    """Binance API에서 시장 데이터를 수집하고 분석하는 클래스"""

    def __init__(self):
        """Binance API URL 설정"""
        self.base_url = "https://api.binance.com/api/v3"
        self.ticker_price_url = f"{self.base_url}/ticker/price"
        self.klines_url = f"{self.base_url}/klines"

    async def __aenter__(self):
        """Async context manager 진입"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager 종료"""
        pass

    async def get_market_snapshot(self, symbol: str = "BTCUSDT") -> MarketSnapshot:
        """
        전체 시장 스냅샷 생성

        Args:
            symbol: 거래 심볼 (기본값: BTCUSDT)

        Returns:
            MarketSnapshot: 시장 스냅샷 데이터
        """
        logger.info(f"Fetching market snapshot for {symbol}")

        try:
            # 현재 가격 조회
            current_price = await self._fetch_current_price(symbol)

            # 1시간 캔들 데이터 (1시간 변동률 계산용)
            candles_1h = await self._fetch_candles(symbol, "1h", 2)
            price_change_1h = self._calculate_price_change(candles_1h)

            # 1시간 캔들 24개 (24시간 변동률 및 거래량 계산용)
            candles_24h = await self._fetch_candles(symbol, "1h", 24)
            price_change_24h = self._calculate_price_change(candles_24h)
            volume_24h, volume_change_24h = self._analyze_volume(candles_24h)

            # 일봉 7개 (7일 변동률 계산용)
            candles_7d = await self._fetch_candles(symbol, "1d", 7)
            price_change_7d = self._calculate_price_change(candles_7d)

            # 기술적 지표 계산용 캔들 데이터 (1시간봉 100개)
            candles_for_ta = await self._fetch_candles(symbol, "1h", 100)
            df = self._candles_to_dataframe(candles_for_ta)
            technical_indicators = self._calculate_technical_indicators(df)

            # 24시간 변동성 계산
            volatility_24h = self._calculate_volatility(candles_24h)

            return MarketSnapshot(
                symbol=symbol,
                timestamp=datetime.utcnow(),
                current_price=current_price,
                price_change_1h=price_change_1h,
                price_change_24h=price_change_24h,
                price_change_7d=price_change_7d,
                volume_24h=volume_24h,
                volume_change_24h=volume_change_24h,
                rsi_14=technical_indicators.get("rsi_14"),
                macd=technical_indicators.get("macd"),
                macd_signal=technical_indicators.get("macd_signal"),
                bb_upper=technical_indicators.get("bb_upper"),
                bb_middle=technical_indicators.get("bb_middle"),
                bb_lower=technical_indicators.get("bb_lower"),
                volatility_24h=volatility_24h,
            )

        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching market data for {symbol}: {e}")
            raise
        except Exception as e:
            logger.error(f"Error creating market snapshot for {symbol}: {e}")
            raise

    async def _fetch_current_price(self, symbol: str) -> float:
        """
        현재 가격 조회 (GET /ticker/price)

        Args:
            symbol: 거래 심볼

        Returns:
            float: 현재 가격
        """
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.get(
                self.ticker_price_url,
                params={"symbol": symbol}
            )
            response.raise_for_status()
            data = response.json()
            return float(data["price"])

    async def _fetch_candles(
        self,
        symbol: str,
        interval: str,
        limit: int
    ) -> List[dict]:
        """
        캔들 데이터 조회 (GET /klines)

        Args:
            symbol: 거래 심볼
            interval: 캔들 간격 (1m, 5m, 1h, 1d 등)
            limit: 조회할 캔들 수

        Returns:
            List[dict]: 캔들 데이터 리스트
        """
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.get(
                self.klines_url,
                params={
                    "symbol": symbol,
                    "interval": interval,
                    "limit": limit
                }
            )
            response.raise_for_status()
            data = response.json()

            # Binance klines 응답 형식 파싱
            # [open_time, open, high, low, close, volume, close_time, ...]
            candles = []
            for kline in data:
                candles.append({
                    "open_time": kline[0],
                    "open": float(kline[1]),
                    "high": float(kline[2]),
                    "low": float(kline[3]),
                    "close": float(kline[4]),
                    "volume": float(kline[5]),
                    "close_time": kline[6],
                    "quote_volume": float(kline[7]),
                    "trades": int(kline[8]),
                })

            return candles

    def _calculate_price_change(self, candles: List[dict]) -> float:
        """
        가격 변동률 계산

        Args:
            candles: 캔들 데이터 리스트

        Returns:
            float: 가격 변동률 (%)
        """
        if not candles or len(candles) < 2:
            return 0.0

        first_open = candles[0]["open"]
        last_close = candles[-1]["close"]

        if first_open == 0:
            return 0.0

        change_pct = ((last_close - first_open) / first_open) * 100
        return round(change_pct, 2)

    def _analyze_volume(self, candles: List[dict]) -> Tuple[float, float]:
        """
        거래량 분석

        Args:
            candles: 캔들 데이터 리스트

        Returns:
            Tuple[float, float]: (24시간 거래량, 거래량 변동률 %)
        """
        if not candles:
            return 0.0, 0.0

        # 총 거래량 (quote volume - USDT 기준)
        total_volume = sum(c["quote_volume"] for c in candles)

        # 거래량 변동률 계산 (전반부 vs 후반부)
        if len(candles) >= 2:
            mid = len(candles) // 2
            first_half_volume = sum(c["quote_volume"] for c in candles[:mid])
            second_half_volume = sum(c["quote_volume"] for c in candles[mid:])

            if first_half_volume > 0:
                volume_change = ((second_half_volume - first_half_volume) / first_half_volume) * 100
            else:
                volume_change = 0.0
        else:
            volume_change = 0.0

        return round(total_volume, 2), round(volume_change, 2)

    def _candles_to_dataframe(self, candles: List[dict]) -> pd.DataFrame:
        """
        캔들 데이터를 pandas DataFrame으로 변환

        Args:
            candles: 캔들 데이터 리스트

        Returns:
            pd.DataFrame: 캔들 데이터 DataFrame
        """
        df = pd.DataFrame(candles)
        df["open_time"] = pd.to_datetime(df["open_time"], unit="ms")
        df.set_index("open_time", inplace=True)
        return df

    def _calculate_technical_indicators(self, df: pd.DataFrame) -> dict:
        """
        기술적 지표 계산

        Args:
            df: 캔들 데이터 DataFrame

        Returns:
            dict: 기술적 지표 딕셔너리
        """
        indicators = {
            "rsi_14": None,
            "macd": None,
            "macd_signal": None,
            "bb_upper": None,
            "bb_middle": None,
            "bb_lower": None,
        }

        try:
            # RSI (14)
            rsi_indicator = ta.momentum.RSIIndicator(close=df["close"], window=14)
            rsi_values = rsi_indicator.rsi()
            if not rsi_values.empty and not pd.isna(rsi_values.iloc[-1]):
                indicators["rsi_14"] = round(rsi_values.iloc[-1], 2)

        except Exception as e:
            logger.warning(f"Error calculating RSI: {e}")

        try:
            # MACD
            macd_indicator = ta.trend.MACD(close=df["close"])
            macd_values = macd_indicator.macd()
            macd_signal_values = macd_indicator.macd_signal()

            if not macd_values.empty and not pd.isna(macd_values.iloc[-1]):
                indicators["macd"] = round(macd_values.iloc[-1], 2)

            if not macd_signal_values.empty and not pd.isna(macd_signal_values.iloc[-1]):
                indicators["macd_signal"] = round(macd_signal_values.iloc[-1], 2)

        except Exception as e:
            logger.warning(f"Error calculating MACD: {e}")

        try:
            # 볼린저 밴드 (20)
            bb_indicator = ta.volatility.BollingerBands(close=df["close"], window=20)
            bb_upper = bb_indicator.bollinger_hband()
            bb_middle = bb_indicator.bollinger_mavg()
            bb_lower = bb_indicator.bollinger_lband()

            if not bb_upper.empty and not pd.isna(bb_upper.iloc[-1]):
                indicators["bb_upper"] = round(bb_upper.iloc[-1], 2)

            if not bb_middle.empty and not pd.isna(bb_middle.iloc[-1]):
                indicators["bb_middle"] = round(bb_middle.iloc[-1], 2)

            if not bb_lower.empty and not pd.isna(bb_lower.iloc[-1]):
                indicators["bb_lower"] = round(bb_lower.iloc[-1], 2)

        except Exception as e:
            logger.warning(f"Error calculating Bollinger Bands: {e}")

        return indicators

    def _calculate_volatility(self, candles: List[dict]) -> Optional[float]:
        """
        24시간 변동성 계산

        Args:
            candles: 캔들 데이터 리스트

        Returns:
            Optional[float]: 변동성 (%)
        """
        if not candles or len(candles) < 2:
            return None

        try:
            df = pd.DataFrame(candles)
            # 종가 기준 수익률의 표준편차 * 100
            pct_change = df["close"].pct_change().dropna()
            if pct_change.empty:
                return None

            volatility = pct_change.std() * 100
            return round(volatility, 4)

        except Exception as e:
            logger.warning(f"Error calculating volatility: {e}")
            return None
