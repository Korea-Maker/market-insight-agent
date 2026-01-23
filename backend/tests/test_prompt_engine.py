"""
Prompt Engine 테스트
"""
import pytest
from dataclasses import dataclass
from typing import Optional

from app.services.llm.prompt_engine import (
    PromptEngine,
    PromptVersion,
    PromptTemplate,
    PROMPT_TEMPLATES,
)


# Mock MarketSnapshot for testing
@dataclass
class MockMarketSnapshot:
    symbol: str = "BTCUSDT"
    current_price: float = 50000.0
    price_change_1h: float = 1.5
    price_change_24h: float = -2.3
    price_change_7d: float = 5.0
    volume_24h: float = 1000000000.0
    volume_change_24h: float = 10.5
    rsi_14: Optional[float] = 55.0
    macd: Optional[float] = 100.0
    macd_signal: Optional[float] = 90.0
    bb_upper: Optional[float] = 52000.0
    bb_middle: Optional[float] = 50000.0
    bb_lower: Optional[float] = 48000.0
    volatility_24h: Optional[float] = 3.5


# Mock NewsInsight for testing
@dataclass
class MockNewsInsight:
    news_id: int = 1
    title: str = "Bitcoin reaches new high"
    source: str = "CoinDesk"
    sentiment: str = "positive"
    sentiment_score: float = 0.8
    importance: float = 0.9
    market_impact: str = "high"


class TestPromptVersion:
    """PromptVersion 테스트"""

    def test_versions_exist(self):
        """모든 버전이 정의되어 있는지 확인"""
        assert PromptVersion.V1_BASIC == "v1_basic"
        assert PromptVersion.V2_DETAILED == "v2_detailed"
        assert PromptVersion.V3_EXPERT == "v3_expert"


class TestPromptTemplates:
    """프롬프트 템플릿 저장소 테스트"""

    def test_v1_basic_exists(self):
        """V1 기본 템플릿 존재 확인"""
        assert "market_analysis_v1_basic" in PROMPT_TEMPLATES

    def test_v2_detailed_exists(self):
        """V2 상세 템플릿 존재 확인"""
        assert "market_analysis_v2_detailed" in PROMPT_TEMPLATES

    def test_v3_expert_exists(self):
        """V3 전문가 템플릿 존재 확인"""
        assert "market_analysis_v3_expert" in PROMPT_TEMPLATES

    def test_template_has_required_fields(self):
        """템플릿에 필수 필드가 있는지 확인"""
        template = PROMPT_TEMPLATES["market_analysis_v1_basic"]
        assert template.name == "market_analysis"
        assert template.version == PromptVersion.V1_BASIC
        assert len(template.system_prompt) > 0
        assert len(template.user_prompt_template) > 0


class TestPromptEngine:
    """PromptEngine 테스트"""

    def setup_method(self):
        """각 테스트 전 실행"""
        self.engine = PromptEngine()

    def test_get_template_v1(self):
        """V1 템플릿 조회"""
        template = self.engine.get_template("market_analysis", PromptVersion.V1_BASIC)
        assert template is not None
        assert template.version == PromptVersion.V1_BASIC

    def test_get_template_v2(self):
        """V2 템플릿 조회"""
        template = self.engine.get_template("market_analysis", PromptVersion.V2_DETAILED)
        assert template is not None
        assert template.version == PromptVersion.V2_DETAILED

    def test_get_template_default(self):
        """기본 템플릿 조회 (버전 미지정)"""
        template = self.engine.get_template("market_analysis")
        assert template is not None
        assert template.version == PromptVersion.V1_BASIC

    def test_get_template_not_found(self):
        """존재하지 않는 템플릿 조회"""
        template = self.engine.get_template("nonexistent")
        assert template is None

    def test_list_templates(self):
        """템플릿 목록 조회"""
        templates = self.engine.list_templates()
        assert len(templates) >= 3
        assert all("key" in t and "name" in t and "version" in t for t in templates)

    def test_format_currency_filter(self):
        """통화 포맷 필터 테스트"""
        assert self.engine._format_currency(1234.56) == "1,234.56"
        assert self.engine._format_currency(1000000) == "1,000,000.00"
        assert self.engine._format_currency(None) == "0.00"
        assert self.engine._format_currency("invalid") == "0.00"

    def test_format_percent_filter(self):
        """퍼센트 포맷 필터 테스트"""
        assert self.engine._format_percent(5.5) == "+5.50%"
        assert self.engine._format_percent(-3.2) == "-3.20%"
        assert self.engine._format_percent(None) == "0.00%"

    def test_safe_float_filter(self):
        """안전한 float 변환 필터 테스트"""
        assert self.engine._safe_float(10.5) == 10.5
        assert self.engine._safe_float("5.0") == 5.0
        assert self.engine._safe_float(None, 0.0) == 0.0
        assert self.engine._safe_float("invalid", 99.0) == 99.0

    def test_build_context_from_market_data(self):
        """시장 데이터에서 컨텍스트 생성"""
        market = MockMarketSnapshot()
        news_list = [MockNewsInsight()]

        context = self.engine.build_context_from_market_data(market, news_list)

        assert context["symbol"] == "BTCUSDT"
        assert context["current_price"] == 50000.0
        assert "price_change_24h" in context
        assert "rsi_14" in context
        assert "news_list" in context
        assert len(context["news_list"]) == 1

    def test_build_context_news_sentiment_counts(self):
        """뉴스 감성 카운트"""
        market = MockMarketSnapshot()
        news_list = [
            MockNewsInsight(sentiment="positive"),
            MockNewsInsight(sentiment="positive"),
            MockNewsInsight(sentiment="negative"),
            MockNewsInsight(sentiment="neutral"),
        ]

        context = self.engine.build_context_from_market_data(market, news_list)

        assert context["positive_news_count"] == 2
        assert context["negative_news_count"] == 1
        assert context["neutral_news_count"] == 1

    def test_build_context_bb_position(self):
        """볼린저 밴드 위치 계산"""
        # 상단 근접
        market = MockMarketSnapshot(current_price=51500.0, bb_middle=50000.0)
        context = self.engine.build_context_from_market_data(market, [])
        assert context["bb_position"] == "상단 근접"

        # 하단 근접
        market = MockMarketSnapshot(current_price=48500.0, bb_middle=50000.0)
        context = self.engine.build_context_from_market_data(market, [])
        assert context["bb_position"] == "하단 근접"

        # 중앙대
        market = MockMarketSnapshot(current_price=50000.0, bb_middle=50000.0)
        context = self.engine.build_context_from_market_data(market, [])
        assert context["bb_position"] == "중앙대"

    def test_build_context_volatility_level(self):
        """변동성 수준 계산"""
        # 고 변동성
        market = MockMarketSnapshot(volatility_24h=6.0)
        context = self.engine.build_context_from_market_data(market, [])
        assert context["volatility_level"] == "고"

        # 중 변동성
        market = MockMarketSnapshot(volatility_24h=3.0)
        context = self.engine.build_context_from_market_data(market, [])
        assert context["volatility_level"] == "중"

        # 저 변동성
        market = MockMarketSnapshot(volatility_24h=1.0)
        context = self.engine.build_context_from_market_data(market, [])
        assert context["volatility_level"] == "저"

    def test_build_market_analysis_prompt_v1(self):
        """V1 시장 분석 프롬프트 빌드"""
        market = MockMarketSnapshot()
        news_list = [MockNewsInsight()]

        system_prompt, user_prompt = self.engine.build_market_analysis_prompt(
            market, news_list, PromptVersion.V1_BASIC
        )

        assert len(system_prompt) > 0
        assert len(user_prompt) > 0
        assert "BTCUSDT" in user_prompt
        assert "50,000.00" in user_prompt  # 가격 포맷
        assert "Bitcoin reaches new high" in user_prompt  # 뉴스 제목

    def test_build_market_analysis_prompt_v2(self):
        """V2 시장 분석 프롬프트 빌드"""
        market = MockMarketSnapshot()
        news_list = [MockNewsInsight()]

        system_prompt, user_prompt = self.engine.build_market_analysis_prompt(
            market, news_list, PromptVersion.V2_DETAILED
        )

        assert len(system_prompt) > 0
        assert len(user_prompt) > 0
        assert "BTCUSDT" in user_prompt

    def test_build_market_analysis_prompt_no_news(self):
        """뉴스 없이 프롬프트 빌드"""
        market = MockMarketSnapshot()

        system_prompt, user_prompt = self.engine.build_market_analysis_prompt(
            market, [], PromptVersion.V1_BASIC
        )

        assert len(system_prompt) > 0
        assert len(user_prompt) > 0
        # V1에서는 뉴스가 없으면 "최근 관련 뉴스가 없습니다" 메시지
        assert "뉴스" in user_prompt

    def test_build_market_analysis_prompt_invalid_version(self):
        """잘못된 버전으로 프롬프트 빌드 시 에러"""
        market = MockMarketSnapshot()

        # 존재하지 않는 버전은 get_template에서 None 반환
        # build_market_analysis_prompt는 ValueError 발생
        with pytest.raises(ValueError):
            # 임시로 잘못된 버전 시뮬레이션
            self.engine.get_template = lambda name, version: None
            self.engine.build_market_analysis_prompt(
                market, [], PromptVersion.V1_BASIC
            )
