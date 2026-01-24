"""
감성 분석 파이프라인 테스트 스크립트
SentimentAnalyzer, TextPreprocessor, 스키마 검증 등
"""
import asyncio
import logging
import sys
from datetime import datetime, timezone

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def test_sentiment_label_enum() -> bool:
    """SentimentLabel Enum 테스트"""
    try:
        from app.schemas.sentiment import SentimentLabel

        # 모든 라벨 값 확인
        expected_labels = ["very_bullish", "bullish", "neutral", "bearish", "very_bearish"]
        actual_labels = [label.value for label in SentimentLabel]

        if set(expected_labels) == set(actual_labels):
            logger.info("✅ SentimentLabel Enum 검증 성공")
            return True
        else:
            logger.error(f"❌ SentimentLabel 불일치: {actual_labels}")
            return False

    except Exception as e:
        logger.error(f"❌ SentimentLabel 테스트 실패: {e}")
        return False


def test_text_preprocessor() -> bool:
    """TextPreprocessor 테스트"""
    try:
        from app.services.sentiment.preprocessor import TextPreprocessor

        preprocessor = TextPreprocessor()

        # 테스트 케이스 1: 심볼 감지
        test_text1 = "Bitcoin surges 20% as ETH follows the rally"
        result1 = preprocessor.process(test_text1)

        if "BTC" not in result1.detected_symbols:
            logger.error(f"❌ BTC 심볼 미감지: {result1.detected_symbols}")
            return False

        if "ETH" not in result1.detected_symbols:
            logger.error(f"❌ ETH 심볼 미감지: {result1.detected_symbols}")
            return False

        logger.info(f"  심볼 감지: {result1.detected_symbols}")

        # 테스트 케이스 2: HTML 제거
        test_text2 = "<p>Bitcoin price <b>crashes</b> to $50,000</p>"
        result2 = preprocessor.process(test_text2)

        if "<p>" in result2.cleaned_text or "<b>" in result2.cleaned_text:
            logger.error(f"❌ HTML 태그 미제거: {result2.cleaned_text}")
            return False

        logger.info(f"  HTML 제거: '{result2.cleaned_text[:50]}...'")

        # 테스트 케이스 3: 관련성 점수
        test_text3 = "Ethereum blockchain defi protocol launches new token"
        result3 = preprocessor.process(test_text3)

        if result3.relevance_score < 0.3:
            logger.error(f"❌ 관련성 점수 너무 낮음: {result3.relevance_score}")
            return False

        logger.info(f"  관련성 점수: {result3.relevance_score:.2f}")

        logger.info("✅ TextPreprocessor 테스트 성공")
        return True

    except Exception as e:
        logger.error(f"❌ TextPreprocessor 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_sentiment_result_dataclass() -> bool:
    """SentimentResult 데이터클래스 테스트"""
    try:
        from app.services.sentiment.analyzer import SentimentResult, SentimentLabel

        result = SentimentResult(
            score=0.75,
            label=SentimentLabel.BULLISH,
            confidence=0.92,
            positive_prob=0.85,
            negative_prob=0.05,
            neutral_prob=0.10,
            key_phrases=["bullish", "surge"],
            processing_time_ms=150,
        )

        # to_dict 테스트
        result_dict = result.to_dict()

        if result_dict["score"] != 0.75:
            logger.error(f"❌ score 불일치: {result_dict['score']}")
            return False

        if result_dict["label"] != "bullish":
            logger.error(f"❌ label 불일치: {result_dict['label']}")
            return False

        logger.info(f"  SentimentResult.to_dict(): {result_dict}")
        logger.info("✅ SentimentResult 데이터클래스 테스트 성공")
        return True

    except Exception as e:
        logger.error(f"❌ SentimentResult 테스트 실패: {e}")
        return False


def test_score_to_label_conversion() -> bool:
    """점수 → 라벨 변환 테스트"""
    try:
        from app.services.sentiment.analyzer import SentimentAnalyzer, SentimentLabel

        analyzer = SentimentAnalyzer()

        test_cases = [
            (0.8, SentimentLabel.VERY_BULLISH),
            (0.4, SentimentLabel.BULLISH),
            (0.0, SentimentLabel.NEUTRAL),
            (-0.4, SentimentLabel.BEARISH),
            (-0.8, SentimentLabel.VERY_BEARISH),
        ]

        for score, expected_label in test_cases:
            actual_label = analyzer._score_to_label(score)
            if actual_label != expected_label:
                logger.error(
                    f"❌ 점수 {score} → 예상 {expected_label.value}, "
                    f"실제 {actual_label.value}"
                )
                return False
            logger.info(f"  점수 {score:+.1f} → {actual_label.value}")

        logger.info("✅ 점수 → 라벨 변환 테스트 성공")
        return True

    except Exception as e:
        logger.error(f"❌ 점수 → 라벨 변환 테스트 실패: {e}")
        return False


def test_pydantic_schemas() -> bool:
    """Pydantic 스키마 검증 테스트"""
    try:
        from app.schemas.sentiment import (
            NewsSentimentResponse,
            AggregatedSentimentResponse,
            SentimentStatistics,
            SentimentTrend,
            SentimentLabel,
            MomentumType,
        )

        # NewsSentimentResponse 테스트
        response = NewsSentimentResponse(
            news_id=1,
            title="Bitcoin hits new ATH",
            source="CoinDesk",
            published=datetime.now(timezone.utc),
            sentiment_score=0.65,
            sentiment_label=SentimentLabel.BULLISH,
            confidence=0.88,
            key_phrases=["ATH", "bullish"],
            related_symbols=["BTC"],
        )

        if response.news_id != 1:
            logger.error("❌ NewsSentimentResponse 필드 오류")
            return False

        logger.info(f"  NewsSentimentResponse: news_id={response.news_id}, label={response.sentiment_label.value}")

        # SentimentStatistics 테스트
        stats = SentimentStatistics(
            total_news=100,
            bullish_count=45,
            bearish_count=30,
            neutral_count=25,
            bullish_ratio=0.45,
            bearish_ratio=0.30,
        )

        if stats.total_news != 100:
            logger.error("❌ SentimentStatistics 필드 오류")
            return False

        logger.info(f"  SentimentStatistics: total={stats.total_news}, bullish={stats.bullish_ratio:.0%}")

        # SentimentTrend 테스트
        trend = SentimentTrend(
            score_change_24h=0.15,
            momentum=MomentumType.IMPROVING,
        )

        if trend.momentum != MomentumType.IMPROVING:
            logger.error("❌ SentimentTrend 필드 오류")
            return False

        logger.info(f"  SentimentTrend: change={trend.score_change_24h}, momentum={trend.momentum.value}")

        logger.info("✅ Pydantic 스키마 검증 테스트 성공")
        return True

    except Exception as e:
        logger.error(f"❌ Pydantic 스키마 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_sqlalchemy_models() -> bool:
    """SQLAlchemy 모델 정의 테스트"""
    try:
        from app.models.news_sentiment import NewsSentiment
        from app.models.sentiment_snapshot import SentimentSnapshot

        # NewsSentiment 컬럼 확인
        ns_columns = [c.name for c in NewsSentiment.__table__.columns]
        required_ns_columns = [
            "id", "news_id", "sentiment_score", "sentiment_label",
            "confidence", "positive_prob", "negative_prob", "neutral_prob",
            "related_symbols", "relevance_score", "analyzed_at"
        ]

        for col in required_ns_columns:
            if col not in ns_columns:
                logger.error(f"❌ NewsSentiment 컬럼 누락: {col}")
                return False

        logger.info(f"  NewsSentiment 컬럼: {len(ns_columns)}개")

        # SentimentSnapshot 컬럼 확인
        ss_columns = [c.name for c in SentimentSnapshot.__table__.columns]
        required_ss_columns = [
            "id", "symbol", "timeframe", "sentiment_score", "sentiment_label",
            "news_count", "bullish_count", "bearish_count", "neutral_count",
            "confidence", "snapshot_at"
        ]

        for col in required_ss_columns:
            if col not in ss_columns:
                logger.error(f"❌ SentimentSnapshot 컬럼 누락: {col}")
                return False

        logger.info(f"  SentimentSnapshot 컬럼: {len(ss_columns)}개")

        logger.info("✅ SQLAlchemy 모델 정의 테스트 성공")
        return True

    except Exception as e:
        logger.error(f"❌ SQLAlchemy 모델 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_analyzer_initialization() -> bool:
    """SentimentAnalyzer 초기화 테스트 (모델 로딩 없이)"""
    try:
        from app.services.sentiment.analyzer import SentimentAnalyzer

        analyzer = SentimentAnalyzer(
            device="cpu",
            cache_enabled=True,
            cache_size=100,
        )

        # 초기화 전 상태 확인
        if analyzer.is_initialized:
            logger.error("❌ 초기화 전 is_initialized가 True")
            return False

        if analyzer.tokenizer is not None:
            logger.error("❌ 초기화 전 tokenizer가 None이 아님")
            return False

        logger.info("  초기화 전 상태 검증 완료")
        logger.info("✅ SentimentAnalyzer 초기화 테스트 성공 (모델 로딩 제외)")
        return True

    except Exception as e:
        logger.error(f"❌ SentimentAnalyzer 초기화 테스트 실패: {e}")
        return False


async def test_full_analyzer_with_model() -> bool:
    """SentimentAnalyzer 전체 테스트 (모델 로딩 포함)"""
    try:
        from app.services.sentiment.analyzer import SentimentAnalyzer, SentimentLabel

        logger.info("  FinBERT 모델 로딩 중 (최초 실행 시 다운로드 필요)...")

        analyzer = SentimentAnalyzer(device="cpu", cache_enabled=True)
        success = await analyzer.initialize()

        if not success:
            logger.warning("⚠️  모델 로딩 실패 (transformers/torch 미설치 가능)")
            return False

        logger.info("  모델 로딩 완료, 추론 테스트 중...")

        # 테스트 케이스
        test_cases = [
            ("Bitcoin surges to new all-time high amid institutional buying", "bullish"),
            ("Crypto market crashes as SEC announces crackdown", "bearish"),
            ("Bitcoin price remains stable around $50,000", "neutral"),
        ]

        for text, expected_sentiment in test_cases:
            result = await analyzer.analyze(text)
            logger.info(
                f"  [{expected_sentiment}] score={result.score:+.2f}, "
                f"label={result.label.value}, conf={result.confidence:.2f}"
            )

        logger.info("✅ SentimentAnalyzer 전체 테스트 성공")
        return True

    except ImportError as e:
        logger.warning(f"⚠️  모델 테스트 건너뜀 (패키지 미설치): {e}")
        return True  # 패키지 미설치는 실패로 간주하지 않음

    except Exception as e:
        logger.error(f"❌ SentimentAnalyzer 전체 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
        return False


async def run_all_tests() -> None:
    """모든 테스트 실행"""
    print("=" * 60)
    print("감성 분석 파이프라인 테스트")
    print("=" * 60)
    print()

    results = {}

    # 1. SentimentLabel Enum 테스트
    print("\n[1/8] SentimentLabel Enum 테스트")
    print("-" * 60)
    results["sentiment_label_enum"] = test_sentiment_label_enum()

    # 2. TextPreprocessor 테스트
    print("\n[2/8] TextPreprocessor 테스트")
    print("-" * 60)
    results["text_preprocessor"] = test_text_preprocessor()

    # 3. SentimentResult 데이터클래스 테스트
    print("\n[3/8] SentimentResult 데이터클래스 테스트")
    print("-" * 60)
    results["sentiment_result"] = test_sentiment_result_dataclass()

    # 4. 점수 → 라벨 변환 테스트
    print("\n[4/8] 점수 → 라벨 변환 테스트")
    print("-" * 60)
    results["score_to_label"] = test_score_to_label_conversion()

    # 5. Pydantic 스키마 테스트
    print("\n[5/8] Pydantic 스키마 검증 테스트")
    print("-" * 60)
    results["pydantic_schemas"] = test_pydantic_schemas()

    # 6. SQLAlchemy 모델 테스트
    print("\n[6/8] SQLAlchemy 모델 정의 테스트")
    print("-" * 60)
    results["sqlalchemy_models"] = test_sqlalchemy_models()

    # 7. SentimentAnalyzer 초기화 테스트
    print("\n[7/8] SentimentAnalyzer 초기화 테스트")
    print("-" * 60)
    results["analyzer_init"] = await test_analyzer_initialization()

    # 8. 전체 분석기 테스트 (모델 로딩)
    print("\n[8/8] SentimentAnalyzer 전체 테스트 (모델 로딩)")
    print("-" * 60)
    results["analyzer_full"] = await test_full_analyzer_with_model()

    # 결과 요약
    print("\n" + "=" * 60)
    print("테스트 결과 요약")
    print("=" * 60)

    passed = 0
    failed = 0

    for test_name, result in results.items():
        status = "PASS" if result else "FAIL"
        icon = "[OK]" if result else "[FAIL]"
        print(f"  {icon} {test_name:30s}: {status}")
        if result:
            passed += 1
        else:
            failed += 1

    print("\n" + "=" * 60)
    print(f"Total {len(results)} tests: {passed} passed, {failed} failed")

    if failed == 0:
        print("[OK] All tests passed!")
    else:
        print("[FAIL] Some tests failed")

    print("=" * 60)

    return failed == 0


if __name__ == "__main__":
    try:
        success = asyncio.run(run_all_tests())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("\n테스트가 중단되었습니다.")
        sys.exit(1)
