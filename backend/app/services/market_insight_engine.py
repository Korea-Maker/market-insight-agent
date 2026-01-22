"""
시장 분석 엔진 서비스
Claude API를 사용하여 시장 분석을 생성합니다.
"""
import anthropic
import json
import time
import asyncio
import logging
import re
from typing import Dict, List, Optional
from datetime import datetime

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.market_insight import MarketInsight, TradingRecommendation, RiskLevel
from app.services.market_data_aggregator import MarketDataAggregator, MarketSnapshot
from app.services.news_analyzer import NewsAnalyzer, NewsInsight

logger = logging.getLogger(__name__)


class MarketInsightEngine:
    """
    시장 분석 엔진
    Claude API를 사용하여 시장 데이터와 뉴스를 분석하고 인사이트를 생성합니다.
    """

    def __init__(self):
        """MarketInsightEngine 초기화"""
        # Anthropic API 키 확인
        api_key = getattr(settings, 'ANTHROPIC_API_KEY', None)
        if not api_key:
            logger.warning("ANTHROPIC_API_KEY가 설정되지 않았습니다. 분석 기능이 비활성화됩니다.")
            self.client = None
        else:
            self.client = anthropic.Anthropic(api_key=api_key)

        self.model = "claude-3-5-sonnet-20241022"
        self.market_aggregator = MarketDataAggregator()
        self.news_analyzer = NewsAnalyzer()

    def _get_system_prompt(self) -> str:
        """시스템 프롬프트 반환"""
        return """당신은 암호화폐 시장 분석 전문가입니다.
실시간 가격 데이터, 기술적 지표, 최신 뉴스를 종합하여 투자자에게 명확하고 실용적인 분석을 제공합니다.

분석 원칙:
1. 객관적 데이터 기반 분석
2. 명확한 근거 제시
3. 위험 요소 명시
4. 한국어로 이해하기 쉽게 설명

출력 형식 (JSON):
{
  "summary": "전체 시장 상황 요약 (2-3문장)",
  "price_reason": "가격이 현재 변동하는 주요 원인 (3-4문장)",
  "recommendation": "strong_buy|buy|hold|sell|strong_sell",
  "recommendation_reason": "추천 근거 (3-4문장)",
  "risk_level": "low|medium|high|very_high",
  "sentiment_score": 0-100 (숫자),
  "sentiment_label": "매우 긍정적|긍정적|중립|부정적|매우 부정적"
}

주의사항:
- 투자 조언이 아닌 참고 정보임을 인지
- 항상 위험 관리 강조"""

    def _build_analysis_prompt(
        self,
        market: MarketSnapshot,
        news_list: List[NewsInsight]
    ) -> str:
        """분석 프롬프트 생성"""
        # 시장 데이터 섹션
        market_section = f"""## 시장 데이터 ({market.symbol})

### 가격 정보
- 현재 가격: ${market.current_price:,.2f}
- 1시간 변동률: {market.price_change.change_1h_pct:+.2f}%
- 24시간 변동률: {market.price_change.change_24h_pct:+.2f}%
- 7일 변동률: {market.price_change.change_7d_pct:+.2f}%

### 거래량
- 24시간 거래량: {market.volume_analysis.volume_24h:,.0f}
- 7일 평균 대비 변화: {market.volume_analysis.volume_change_pct:+.2f}%

### 기술적 지표
- RSI(14): {market.technical_indicators.rsi_14:.2f}
- MACD: {market.technical_indicators.macd:.2f}
- MACD Signal: {market.technical_indicators.macd_signal:.2f}
- MACD Histogram: {market.technical_indicators.macd_histogram:.2f}
- 볼린저 밴드 상단: ${market.technical_indicators.bb_upper:,.2f}
- 볼린저 밴드 중단: ${market.technical_indicators.bb_middle:,.2f}
- 볼린저 밴드 하단: ${market.technical_indicators.bb_lower:,.2f}

### 변동성
- 24시간 변동성: {market.technical_indicators.volatility_24h:.2f}%
"""

        # 뉴스 섹션
        news_section = "## 최근 뉴스 분석\n\n"
        if news_list:
            for i, news in enumerate(news_list[:10], 1):
                sentiment_emoji = {
                    "positive": "긍정적",
                    "negative": "부정적",
                    "neutral": "중립"
                }.get(news.sentiment, "중립")

                news_section += f"""{i}. **{news.title}**
   - 소스: {news.source}
   - 감성: {sentiment_emoji} ({news.sentiment_score:+.2f})
   - 중요도: {news.importance:.2f}
   - 시장 영향: {news.market_impact}

"""
        else:
            news_section += "최근 관련 뉴스가 없습니다.\n"

        # 최종 프롬프트
        prompt = f"""다음 시장 데이터와 뉴스를 분석하여 JSON 형식으로 응답해주세요.

{market_section}

{news_section}

위 데이터를 종합하여 시장 분석을 JSON 형식으로 제공해주세요."""

        return prompt

    def _parse_claude_response(self, response_text: str) -> dict:
        """Claude 응답 파싱"""
        try:
            # JSON 블록 추출 시도 (```json ... ``` 형식)
            json_match = re.search(r'```json\s*([\s\S]*?)\s*```', response_text)
            if json_match:
                json_str = json_match.group(1)
            else:
                # JSON 형식이 바로 시작하는 경우
                json_match = re.search(r'\{[\s\S]*\}', response_text)
                if json_match:
                    json_str = json_match.group(0)
                else:
                    raise ValueError("JSON 형식을 찾을 수 없습니다")

            parsed = json.loads(json_str)

            # 필수 필드 검증
            required_fields = [
                "summary", "price_reason", "recommendation",
                "recommendation_reason", "risk_level",
                "sentiment_score", "sentiment_label"
            ]

            for field in required_fields:
                if field not in parsed:
                    logger.warning(f"필수 필드 누락: {field}")
                    parsed[field] = self._get_default_value(field)

            # Enum 변환 및 검증
            parsed["recommendation"] = self._validate_recommendation(
                parsed.get("recommendation", "hold")
            )
            parsed["risk_level"] = self._validate_risk_level(
                parsed.get("risk_level", "medium")
            )

            # sentiment_score 범위 검증
            score = parsed.get("sentiment_score", 50)
            if isinstance(score, (int, float)):
                parsed["sentiment_score"] = max(0, min(100, score))
            else:
                parsed["sentiment_score"] = 50

            return parsed

        except json.JSONDecodeError as e:
            logger.error(f"JSON 파싱 오류: {e}")
            return self._get_default_response()
        except Exception as e:
            logger.error(f"응답 파싱 오류: {e}")
            return self._get_default_response()

    def _get_default_value(self, field: str):
        """필드별 기본값 반환"""
        defaults = {
            "summary": "분석 데이터를 처리할 수 없습니다.",
            "price_reason": "가격 변동 원인을 분석할 수 없습니다.",
            "recommendation": "hold",
            "recommendation_reason": "충분한 데이터가 없어 관망을 권장합니다.",
            "risk_level": "medium",
            "sentiment_score": 50,
            "sentiment_label": "중립"
        }
        return defaults.get(field, None)

    def _get_default_response(self) -> dict:
        """기본 응답 반환 (파싱 실패 시)"""
        return {
            "summary": "시장 분석을 수행할 수 없습니다.",
            "price_reason": "데이터 처리 중 오류가 발생했습니다.",
            "recommendation": "hold",
            "recommendation_reason": "분석 오류로 인해 관망을 권장합니다.",
            "risk_level": "high",
            "sentiment_score": 50,
            "sentiment_label": "중립"
        }

    def _validate_recommendation(self, value: str) -> str:
        """매매 추천 값 검증"""
        valid_values = ["strong_buy", "buy", "hold", "sell", "strong_sell"]
        value_lower = value.lower().replace(" ", "_")
        if value_lower in valid_values:
            return value_lower
        return "hold"

    def _validate_risk_level(self, value: str) -> str:
        """위험도 값 검증"""
        valid_values = ["low", "medium", "high", "very_high"]
        value_lower = value.lower().replace(" ", "_")
        if value_lower in valid_values:
            return value_lower
        return "medium"

    async def generate_insight(self, symbol: str = "BTCUSDT") -> Optional[MarketInsight]:
        """
        시장 분석 생성

        Args:
            symbol: 분석할 심볼 (기본값: BTCUSDT)

        Returns:
            MarketInsight 객체 또는 None (API 키 미설정 시)
        """
        if not self.client:
            logger.warning("Claude API 클라이언트가 초기화되지 않았습니다.")
            return None

        start_time = time.time()

        try:
            logger.info(f"시장 분석 시작: {symbol}")

            # 1. 시장 데이터 수집
            async with self.market_aggregator:
                market_snapshot = await self.market_aggregator.get_market_snapshot(symbol)

            logger.info(f"시장 데이터 수집 완료: 가격=${market_snapshot.current_price:,.2f}")

            # 2. 뉴스 분석
            news_insights: List[NewsInsight] = []
            async with AsyncSessionLocal() as db:
                try:
                    news_insights = await self.news_analyzer.analyze_recent_news(
                        db=db,
                        hours=24,
                        symbol=symbol.replace("USDT", ""),
                        limit=20
                    )
                    logger.info(f"뉴스 분석 완료: {len(news_insights)}개")
                except Exception as e:
                    logger.warning(f"뉴스 분석 실패 (계속 진행): {e}")

            # 3. Claude API 호출
            prompt = self._build_analysis_prompt(market_snapshot, news_insights)

            response = self.client.messages.create(
                model=self.model,
                max_tokens=1500,
                temperature=0.3,
                system=self._get_system_prompt(),
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = response.content[0].text
            logger.info("Claude API 응답 수신 완료")

            # 4. 응답 파싱
            parsed_response = self._parse_claude_response(response_text)

            # 5. 처리 시간 계산
            processing_time_ms = int((time.time() - start_time) * 1000)

            # 6. MarketInsight 객체 생성
            insight = MarketInsight(
                symbol=symbol,
                current_price=market_snapshot.current_price,
                price_change_24h=market_snapshot.price_change.change_24h_pct,
                volume_24h=market_snapshot.volume_analysis.volume_24h,
                rsi_14=market_snapshot.technical_indicators.rsi_14,
                volatility_24h=market_snapshot.technical_indicators.volatility_24h,
                analysis_summary=parsed_response["summary"],
                price_change_reason=parsed_response["price_reason"],
                recommendation=TradingRecommendation(parsed_response["recommendation"]),
                recommendation_reason=parsed_response["recommendation_reason"],
                risk_level=RiskLevel(parsed_response["risk_level"]),
                market_sentiment_score=parsed_response["sentiment_score"],
                market_sentiment_label=parsed_response["sentiment_label"],
                ai_model=self.model,
                processing_time_ms=processing_time_ms
            )

            # 7. 데이터베이스 저장
            async with AsyncSessionLocal() as db:
                db.add(insight)
                await db.commit()
                await db.refresh(insight)
                logger.info(f"시장 분석 저장 완료: ID={insight.id}")

            logger.info(
                f"시장 분석 완료: {symbol}, "
                f"추천={insight.recommendation.value}, "
                f"처리시간={processing_time_ms}ms"
            )

            return insight

        except anthropic.APIError as e:
            logger.error(f"Claude API 오류: {e}")
            raise
        except Exception as e:
            logger.error(f"시장 분석 오류: {e}", exc_info=True)
            raise


async def run_market_insight_analyzer(interval_minutes: int = 5):
    """
    주기적으로 시장 분석 실행

    Args:
        interval_minutes: 분석 간격 (분)
    """
    engine = MarketInsightEngine()

    if not engine.client:
        logger.warning("ANTHROPIC_API_KEY가 설정되지 않아 시장 분석 백그라운드 태스크를 시작하지 않습니다.")
        return

    logger.info(f"시장 분석 백그라운드 태스크 시작 (간격: {interval_minutes}분)")

    while True:
        try:
            insight = await engine.generate_insight("BTCUSDT")
            if insight:
                logger.info(f"시장 분석 완료: {insight.recommendation.value}")
            await asyncio.sleep(interval_minutes * 60)
        except asyncio.CancelledError:
            logger.info("시장 분석 백그라운드 태스크 종료")
            break
        except Exception as e:
            logger.error(f"시장 분석 오류: {e}")
            # 오류 발생 시 1분 후 재시도
            await asyncio.sleep(60)
