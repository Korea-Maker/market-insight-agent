"""
프롬프트 엔진

Jinja2 기반 프롬프트 템플릿 시스템
- 버전 관리
- 커스텀 필터
- 다중 템플릿 지원
"""

import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum

from jinja2 import Environment, BaseLoader, TemplateError


logger = logging.getLogger(__name__)


class PromptVersion(str, Enum):
    """프롬프트 버전"""
    V1_BASIC = "v1_basic"
    V2_DETAILED = "v2_detailed"
    V3_EXPERT = "v3_expert"


@dataclass
class PromptTemplate:
    """프롬프트 템플릿"""
    name: str
    version: PromptVersion
    system_prompt: str
    user_prompt_template: str
    description: str = ""
    required_vars: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


# 프롬프트 템플릿 저장소
PROMPT_TEMPLATES: Dict[str, PromptTemplate] = {
    "market_analysis_v1_basic": PromptTemplate(
        name="market_analysis",
        version=PromptVersion.V1_BASIC,
        description="기본 시장 분석 프롬프트",
        system_prompt="""당신은 암호화폐 시장 분석 전문가입니다.
실시간 가격 데이터, 기술적 지표, 최신 뉴스를 종합하여 투자자에게 명확하고 실용적인 분석을 제공합니다.

분석 원칙:
1. 객관적 데이터 기반 분석
2. 명확한 근거 제시
3. 위험 요소 명시
4. 한국어로 이해하기 쉽게 설명

반드시 유효한 JSON 형식으로만 응답하세요.""",
        user_prompt_template="""## 시장 데이터 ({{ symbol }})

### 가격 정보
- 현재 가격: ${{ current_price | format_currency }}
- 1시간 변동률: {{ price_change_1h }}%
- 24시간 변동률: {{ price_change_24h }}%
- 7일 변동률: {{ price_change_7d }}%

### 거래량
- 24시간 거래량: ${{ volume_24h | format_currency }}
- 거래량 변화율: {{ volume_change_24h }}%

### 기술적 지표
- RSI(14): {{ rsi_14 }}
- MACD: {{ macd }}
- MACD Signal: {{ macd_signal }}
- 볼린저 밴드 상단: ${{ bb_upper | format_currency }}
- 볼린저 밴드 중단: ${{ bb_middle | format_currency }}
- 볼린저 밴드 하단: ${{ bb_lower | format_currency }}

### 변동성
- 24시간 변동성: {{ volatility_24h }}%

## 최근 뉴스 분석
{% if news_list %}
{% for news in news_list[:10] %}
{{ loop.index }}. **{{ news.title }}**
   - 소스: {{ news.source }}
   - 감성: {{ news.sentiment_label }} ({{ news.sentiment_score }})
   - 중요도: {{ news.importance }}
   - 시장 영향: {{ news.market_impact }}
{% endfor %}
{% else %}
최근 관련 뉴스가 없습니다.
{% endif %}

위 데이터를 종합하여 다음 JSON 형식으로 시장 분석을 제공해주세요:
```json
{
  "summary": "전체 시장 상황 요약 (2-3문장)",
  "price_reason": "가격이 현재 변동하는 주요 원인 (3-4문장)",
  "recommendation": "strong_buy|buy|hold|sell|strong_sell",
  "recommendation_reason": "추천 근거 (3-4문장)",
  "risk_level": "low|medium|high|very_high",
  "sentiment_score": 0-100 (숫자),
  "sentiment_label": "매우 긍정적|긍정적|중립|부정적|매우 부정적"
}
```""",
        required_vars=["symbol", "current_price", "price_change_1h", "price_change_24h"]
    ),

    "market_analysis_v2_detailed": PromptTemplate(
        name="market_analysis",
        version=PromptVersion.V2_DETAILED,
        description="상세 시장 분석 프롬프트 (더 긴 분석)",
        system_prompt="""당신은 10년 이상 경력의 암호화폐 시장 분석 전문가입니다.
헤지펀드와 기관 투자자에게 자문을 제공해온 경험을 바탕으로 분석합니다.

분석 프레임워크:
1. 기술적 분석 (Technical Analysis)
   - 추세 분석: 상승/하락/횡보
   - 모멘텀 지표: RSI, MACD 해석
   - 가격대 분석: 지지선, 저항선

2. 펀더멘털 분석 (Fundamental Analysis)
   - 네트워크 활동
   - 거래량 패턴
   - 뉴스 영향도

3. 감성 분석 (Sentiment Analysis)
   - 시장 심리 지표
   - 뉴스 톤 분석
   - 공포/탐욕 수준

투자 경고: 모든 분석은 참고용이며, 투자 결정의 책임은 투자자에게 있습니다.

반드시 유효한 JSON 형식으로만 응답하세요.""",
        user_prompt_template="""# {{ symbol }} 종합 시장 분석 요청

## 1. 가격 데이터
| 지표 | 값 |
|------|-----|
| 현재 가격 | ${{ current_price | format_currency }} |
| 1시간 변동 | {{ price_change_1h }}% |
| 24시간 변동 | {{ price_change_24h }}% |
| 7일 변동 | {{ price_change_7d }}% |

## 2. 거래량 분석
- 24시간 거래량: ${{ volume_24h | format_currency }}
- 거래량 변화율: {{ volume_change_24h }}%
- 거래량 추세: {{ "상승" if volume_change_24h_num > 0 else "하락" if volume_change_24h_num < 0 else "보합" }}

## 3. 기술적 지표
### 모멘텀
- RSI(14): {{ rsi_14 }} {% if rsi_14_num > 70 %}(과매수 구간){% elif rsi_14_num < 30 %}(과매도 구간){% else %}(중립){% endif %}
- MACD: {{ macd }} / Signal: {{ macd_signal }}
- MACD 크로스: {{ "골든크로스" if macd_num > macd_signal_num else "데드크로스" if macd_num < macd_signal_num else "중립" }}

### 볼린저 밴드
- 상단: ${{ bb_upper | format_currency }}
- 중단: ${{ bb_middle | format_currency }}
- 하단: ${{ bb_lower | format_currency }}
- 현재 위치: {{ bb_position }}

### 변동성
- 24시간 변동성: {{ volatility_24h }}%
- 변동성 수준: {{ volatility_level }}

## 4. 뉴스 인사이트 (최근 24시간)
{% if news_list %}
{% for news in news_list[:10] %}
### 뉴스 {{ loop.index }}
- 제목: {{ news.title }}
- 소스: {{ news.source }}
- 감성: {{ news.sentiment_label }} (점수: {{ news.sentiment_score }})
- 중요도: {{ news.importance }}/1.0
- 예상 시장 영향: {{ news.market_impact }}
{% endfor %}
{% else %}
관련 뉴스 없음
{% endif %}

---

위 데이터를 종합 분석하여 다음 JSON 형식으로 응답해주세요:
```json
{
  "summary": "전체 시장 상황 요약 (3-4문장, 핵심 포인트 중심)",
  "price_reason": "가격 변동의 주요 원인 분석 (기술적+펀더멘털 요인)",
  "recommendation": "strong_buy|buy|hold|sell|strong_sell",
  "recommendation_reason": "추천 근거 (진입/청산 포인트 포함)",
  "risk_level": "low|medium|high|very_high",
  "sentiment_score": 0-100,
  "sentiment_label": "매우 긍정적|긍정적|중립|부정적|매우 부정적"
}
```""",
        required_vars=["symbol", "current_price"]
    ),

    "market_analysis_v3_expert": PromptTemplate(
        name="market_analysis",
        version=PromptVersion.V3_EXPERT,
        description="전문가급 심층 시장 분석 프롬프트",
        system_prompt="""당신은 골드만삭스, 모건스탠리 출신의 암호화폐 리서치 애널리스트입니다.
기관 투자자를 위한 심층 리서치 보고서를 작성합니다.

분석 방법론:
1. 다중 타임프레임 분석 (Multi-Timeframe Analysis)
2. 볼륨 프로파일 및 유동성 분석
3. 온체인 메트릭 해석 (간접)
4. 매크로 상관관계 분석

리스크 관리 원칙:
- 포지션 사이징 제안
- 손절/익절 레벨 명시
- 리스크/리워드 비율 계산

면책: 이 분석은 정보 제공 목적이며, 투자 조언이 아닙니다.

반드시 유효한 JSON 형식으로만 응답하세요.""",
        user_prompt_template="""# {{ symbol }} 기관급 심층 분석

## Executive Summary Request

### 가격 메트릭
| 타임프레임 | 변동률 | 분석 |
|-----------|--------|------|
| 1H | {{ price_change_1h }}% | 단기 모멘텀 |
| 24H | {{ price_change_24h }}% | 일중 추세 |
| 7D | {{ price_change_7d }}% | 주간 추세 |

현재가: ${{ current_price | format_currency }}

### 볼륨 분석
- 24H 거래량: ${{ volume_24h | format_currency }}
- 볼륨 변화: {{ volume_change_24h }}%
- 볼륨/가격 디버전스: {{ "있음" if volume_divergence else "없음" }}

### 기술적 지표 대시보드
```
RSI(14): {{ rsi_14 }} | {{ rsi_signal }}
MACD: {{ macd }} | Signal: {{ macd_signal }} | {{ macd_cross }}
BB Position: {{ bb_position }} | Width: {{ bb_width }}%
Volatility: {{ volatility_24h }}% | Level: {{ volatility_level }}
```

### 뉴스 센티먼트 스코어
{% if news_list %}
총 {{ news_list | length }}개 뉴스 분석
- 긍정: {{ positive_news_count }}개
- 부정: {{ negative_news_count }}개
- 중립: {{ neutral_news_count }}개

주요 뉴스:
{% for news in news_list[:5] %}
{{ loop.index }}. [{{ news.market_impact | upper }}] {{ news.title }}
   {{ news.sentiment_label }} | 중요도: {{ news.importance }}
{% endfor %}
{% else %}
뉴스 데이터 없음
{% endif %}

---

다음 JSON 형식으로 기관급 분석 보고서를 작성해주세요:
```json
{
  "summary": "시장 상황 종합 요약 (기관 투자자 관점, 4-5문장)",
  "price_reason": "가격 변동 심층 분석 (기술적, 펀더멘털, 센티먼트 요인 종합)",
  "recommendation": "strong_buy|buy|hold|sell|strong_sell",
  "recommendation_reason": "투자 근거 (진입가, 목표가, 손절가 포함)",
  "risk_level": "low|medium|high|very_high",
  "sentiment_score": 0-100,
  "sentiment_label": "매우 긍정적|긍정적|중립|부정적|매우 부정적"
}
```""",
        required_vars=["symbol", "current_price"]
    )
}


class PromptEngine:
    """
    프롬프트 엔진

    기능:
    - Jinja2 기반 템플릿 렌더링
    - 버전 관리
    - 커스텀 필터 지원
    - 템플릿 검증
    """

    def __init__(self):
        self._env = Environment(loader=BaseLoader())
        self._register_filters()

    def _register_filters(self):
        """커스텀 Jinja2 필터 등록"""
        self._env.filters['format_currency'] = self._format_currency
        self._env.filters['format_percent'] = self._format_percent
        self._env.filters['safe_float'] = self._safe_float

    @staticmethod
    def _format_currency(value: Any) -> str:
        """통화 포맷"""
        try:
            return f"{float(value):,.2f}"
        except (ValueError, TypeError):
            return "0.00"

    @staticmethod
    def _format_percent(value: Any) -> str:
        """퍼센트 포맷"""
        try:
            return f"{float(value):+.2f}%"
        except (ValueError, TypeError):
            return "0.00%"

    @staticmethod
    def _safe_float(value: Any, default: float = 0.0) -> float:
        """안전한 float 변환"""
        try:
            return float(value)
        except (ValueError, TypeError):
            return default

    def get_template(
        self,
        name: str,
        version: Optional[PromptVersion] = None
    ) -> Optional[PromptTemplate]:
        """
        템플릿 조회

        Args:
            name: 템플릿 이름 (예: "market_analysis")
            version: 버전 (None이면 V1_BASIC)

        Returns:
            PromptTemplate 또는 None
        """
        version = version or PromptVersion.V1_BASIC
        key = f"{name}_{version.value}"
        return PROMPT_TEMPLATES.get(key)

    def list_templates(self) -> List[Dict[str, str]]:
        """사용 가능한 템플릿 목록"""
        return [
            {
                "key": key,
                "name": tmpl.name,
                "version": tmpl.version.value,
                "description": tmpl.description,
            }
            for key, tmpl in PROMPT_TEMPLATES.items()
        ]

    def render_prompt(
        self,
        template: PromptTemplate,
        context: Dict[str, Any]
    ) -> str:
        """
        프롬프트 렌더링

        Args:
            template: 프롬프트 템플릿
            context: 렌더링 컨텍스트

        Returns:
            렌더링된 프롬프트

        Raises:
            TemplateError: 렌더링 오류 시
        """
        try:
            jinja_template = self._env.from_string(template.user_prompt_template)
            return jinja_template.render(**context)
        except TemplateError as e:
            logger.error(f"프롬프트 렌더링 오류: {e}")
            raise

    def build_context_from_market_data(
        self,
        market_snapshot: Any,
        news_list: List[Any]
    ) -> Dict[str, Any]:
        """
        MarketSnapshot과 NewsInsight 리스트에서 컨텍스트 생성

        Args:
            market_snapshot: MarketSnapshot 객체
            news_list: NewsInsight 객체 리스트

        Returns:
            템플릿 컨텍스트 딕셔너리
        """
        # 기본값 처리 함수
        def safe_value(val: Any, default: Any = 0.0) -> Any:
            return val if val is not None else default

        # 숫자 값 (비교 연산용)
        rsi_14_num = safe_value(market_snapshot.rsi_14, 50.0)
        macd_num = safe_value(market_snapshot.macd, 0.0)
        macd_signal_num = safe_value(market_snapshot.macd_signal, 0.0)
        volume_change_num = safe_value(market_snapshot.volume_change_24h, 0.0)
        volatility_num = safe_value(market_snapshot.volatility_24h, 0.0)

        # 볼린저 밴드 위치 계산
        bb_middle = safe_value(market_snapshot.bb_middle, market_snapshot.current_price)
        price = market_snapshot.current_price
        if price > bb_middle * 1.02:
            bb_position = "상단 근접"
        elif price < bb_middle * 0.98:
            bb_position = "하단 근접"
        else:
            bb_position = "중앙대"

        # 변동성 수준
        if volatility_num > 5:
            volatility_level = "고"
        elif volatility_num > 2:
            volatility_level = "중"
        else:
            volatility_level = "저"

        # 뉴스 분석
        sentiment_labels = {
            "positive": "긍정적",
            "negative": "부정적",
            "neutral": "중립"
        }

        news_dicts = []
        positive_count = 0
        negative_count = 0
        neutral_count = 0

        for n in news_list:
            sentiment = getattr(n, 'sentiment', 'neutral')
            if sentiment == 'positive':
                positive_count += 1
            elif sentiment == 'negative':
                negative_count += 1
            else:
                neutral_count += 1

            news_dicts.append({
                "title": getattr(n, 'title', ''),
                "source": getattr(n, 'source', ''),
                "sentiment": sentiment,
                "sentiment_score": f"{getattr(n, 'sentiment_score', 0):+.2f}",
                "sentiment_label": sentiment_labels.get(sentiment, "중립"),
                "importance": f"{getattr(n, 'importance', 0):.2f}",
                "market_impact": getattr(n, 'market_impact', 'low'),
            })

        # RSI 신호
        if rsi_14_num > 70:
            rsi_signal = "과매수"
        elif rsi_14_num < 30:
            rsi_signal = "과매도"
        else:
            rsi_signal = "중립"

        # MACD 크로스
        if macd_num > macd_signal_num:
            macd_cross = "골든크로스"
        elif macd_num < macd_signal_num:
            macd_cross = "데드크로스"
        else:
            macd_cross = "중립"

        # 볼륨/가격 디버전스
        price_change = safe_value(market_snapshot.price_change_24h, 0)
        volume_divergence = (
            (price_change > 0 and volume_change_num < 0) or
            (price_change < 0 and volume_change_num > 0)
        )

        return {
            # 기본 정보
            "symbol": market_snapshot.symbol,
            "current_price": market_snapshot.current_price,

            # 가격 변동 (문자열)
            "price_change_1h": f"{safe_value(market_snapshot.price_change_1h):+.2f}",
            "price_change_24h": f"{safe_value(market_snapshot.price_change_24h):+.2f}",
            "price_change_7d": f"{safe_value(market_snapshot.price_change_7d):+.2f}",

            # 거래량
            "volume_24h": safe_value(market_snapshot.volume_24h),
            "volume_change_24h": f"{volume_change_num:+.2f}",
            "volume_change_24h_num": volume_change_num,

            # 기술적 지표 (문자열)
            "rsi_14": f"{rsi_14_num:.2f}",
            "rsi_14_num": rsi_14_num,
            "rsi_signal": rsi_signal,
            "macd": f"{macd_num:.2f}",
            "macd_num": macd_num,
            "macd_signal": f"{macd_signal_num:.2f}",
            "macd_signal_num": macd_signal_num,
            "macd_cross": macd_cross,

            # 볼린저 밴드
            "bb_upper": safe_value(market_snapshot.bb_upper, market_snapshot.current_price),
            "bb_middle": bb_middle,
            "bb_lower": safe_value(market_snapshot.bb_lower, market_snapshot.current_price),
            "bb_position": bb_position,
            "bb_width": f"{((safe_value(market_snapshot.bb_upper, market_snapshot.current_price) - safe_value(market_snapshot.bb_lower, market_snapshot.current_price)) / bb_middle * 100):.2f}" if bb_middle else "0.00",

            # 변동성
            "volatility_24h": f"{volatility_num:.2f}",
            "volatility_level": volatility_level,

            # 디버전스
            "volume_divergence": volume_divergence,

            # 뉴스
            "news_list": news_dicts,
            "positive_news_count": positive_count,
            "negative_news_count": negative_count,
            "neutral_news_count": neutral_count,
        }

    def build_market_analysis_prompt(
        self,
        market_snapshot: Any,
        news_list: List[Any],
        version: PromptVersion = PromptVersion.V1_BASIC
    ) -> tuple[str, str]:
        """
        시장 분석 프롬프트 빌드

        Args:
            market_snapshot: MarketSnapshot 객체
            news_list: NewsInsight 객체 리스트
            version: 프롬프트 버전

        Returns:
            (system_prompt, user_prompt) 튜플

        Raises:
            ValueError: 템플릿을 찾을 수 없을 때
        """
        template = self.get_template("market_analysis", version)

        if not template:
            raise ValueError(
                f"템플릿을 찾을 수 없습니다: market_analysis_{version.value}"
            )

        context = self.build_context_from_market_data(market_snapshot, news_list)
        user_prompt = self.render_prompt(template, context)

        return template.system_prompt, user_prompt
