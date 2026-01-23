"""
프롬프트 빌더 모듈
시장 분석을 위한 GPT 프롬프트 생성
"""
from typing import List

from app.services.market_data_aggregator import MarketSnapshot
from app.services.news_analyzer import NewsInsight


SYSTEM_PROMPT = """당신은 암호화폐 시장 분석 전문가입니다.
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
- 항상 위험 관리 강조
- 반드시 유효한 JSON 형식으로만 응답"""


def build_market_section(market: MarketSnapshot) -> str:
    """시장 데이터 섹션 생성"""
    return f"""## 시장 데이터 ({market.symbol})

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


def build_news_section(news_list: List[NewsInsight]) -> str:
    """뉴스 분석 섹션 생성"""
    section = "## 최근 뉴스 분석\n\n"

    if not news_list:
        return section + "최근 관련 뉴스가 없습니다.\n"

    sentiment_labels = {
        "positive": "긍정적",
        "negative": "부정적",
        "neutral": "중립"
    }

    for i, news in enumerate(news_list[:10], 1):
        sentiment_label = sentiment_labels.get(news.sentiment, "중립")
        section += f"""{i}. **{news.title}**
   - 소스: {news.source}
   - 감성: {sentiment_label} ({news.sentiment_score:+.2f})
   - 중요도: {news.importance:.2f}
   - 시장 영향: {news.market_impact}

"""

    return section


def build_analysis_prompt(
    market: MarketSnapshot,
    news_list: List[NewsInsight]
) -> str:
    """분석 프롬프트 생성"""
    market_section = build_market_section(market)
    news_section = build_news_section(news_list)

    return f"""다음 시장 데이터와 뉴스를 분석하여 JSON 형식으로 응답해주세요.

{market_section}

{news_section}

위 데이터를 종합하여 시장 분석을 JSON 형식으로 제공해주세요. 반드시 유효한 JSON만 출력하세요."""
