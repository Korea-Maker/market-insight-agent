# 뉴스 감성 분석 파이프라인 (Sentiment Analysis Pipeline)

## Component Design Specification

**Version**: 1.0
**Date**: 2026-01-23
**Type**: Component Design
**Status**: Draft

---

## 1. 개요 (Overview)

### 1.1 목적
암호화폐 뉴스의 감성을 분석하여 시장 심리를 정량화하고, 트레이딩 의사결정에 활용 가능한 인사이트를 제공하는 파이프라인 컴포넌트.

### 1.2 현재 상태 분석
기존 `NewsAnalyzer` (`backend/app/services/news_analyzer.py`)는 **키워드 기반 규칙 분석**만 수행:
- 단순 긍정/부정 키워드 카운팅
- 문맥 파악 불가 (예: "Bitcoin crash fears overblown" → 부정으로 오분류)
- 복잡한 금융 표현 처리 미흡

### 1.3 목표
- **딥러닝 기반 감성 분석**: FinBERT/CryptoBERT 모델 활용
- **다중 신호 융합**: 뉴스 + 소셜 미디어 + 온체인 데이터
- **실시간 파이프라인**: 스트리밍 처리 및 캐싱 최적화
- **해석 가능성**: 감성 판단 근거 제공

---

## 2. 아키텍처 (Architecture)

### 2.1 컴포넌트 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Sentiment Analysis Pipeline                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   Ingestion  │───▶│ Preprocessing│───▶│   Analysis   │              │
│  │    Layer     │    │    Layer     │    │    Layer     │              │
│  └──────────────┘    └──────────────┘    └──────┬───────┘              │
│         │                                        │                      │
│         ▼                                        ▼                      │
│  ┌──────────────┐                       ┌──────────────┐               │
│  │  News Queue  │                       │  Aggregation │               │
│  │   (Redis)    │                       │    Layer     │               │
│  └──────────────┘                       └──────┬───────┘               │
│                                                 │                       │
│                                                 ▼                       │
│                                         ┌──────────────┐               │
│                                         │    Output    │               │
│                                         │    Layer     │               │
│                                         └──────────────┘               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 플로우

```
RSS Feed ──┐
           │    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
Twitter ───┼───▶│ Text Clean  │───▶│  Tokenize   │───▶│   FinBERT   │
           │    │ & Normalize │    │   (BERT)    │    │  Inference  │
Reddit ────┘    └─────────────┘    └─────────────┘    └──────┬──────┘
                                                              │
                                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  DB Store   │◀───│  Aggregate  │◀───│  Confidence │◀───│  Raw Score  │
│ (Postgres)  │    │  & Smooth   │    │   Filter    │    │  (-1 ~ +1)  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

---

## 3. 컴포넌트 상세 설계

### 3.1 SentimentAnalyzer (Core)

**책임**: 텍스트 감성 분석의 핵심 로직 수행

```python
# backend/app/services/sentiment/analyzer.py

from dataclasses import dataclass
from enum import Enum
from typing import Optional, List
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

class SentimentLabel(str, Enum):
    """감성 라벨"""
    VERY_BULLISH = "very_bullish"    # 0.6 ~ 1.0
    BULLISH = "bullish"              # 0.2 ~ 0.6
    NEUTRAL = "neutral"              # -0.2 ~ 0.2
    BEARISH = "bearish"              # -0.6 ~ -0.2
    VERY_BEARISH = "very_bearish"    # -1.0 ~ -0.6


@dataclass
class SentimentResult:
    """감성 분석 결과"""
    score: float                     # -1.0 ~ 1.0
    label: SentimentLabel            # 감성 라벨
    confidence: float                # 0.0 ~ 1.0

    # 상세 분석
    positive_prob: float             # 긍정 확률
    negative_prob: float             # 부정 확률
    neutral_prob: float              # 중립 확률

    # 해석 가능성
    key_phrases: List[str]           # 판단 근거 키워드
    explanation: Optional[str]       # 자연어 설명


class SentimentAnalyzer:
    """
    FinBERT 기반 금융 감성 분석기

    Features:
    - 금융 도메인 특화 (FinBERT)
    - 배치 처리 지원
    - GPU 가속 (가용 시)
    - 캐싱 지원
    """

    MODEL_NAME = "ProsusAI/finbert"
    MAX_LENGTH = 512

    def __init__(self, device: str = "auto", cache_enabled: bool = True):
        self.device = self._detect_device(device)
        self.tokenizer = None
        self.model = None
        self.cache_enabled = cache_enabled
        self._cache = {}  # LRU 캐시

    async def initialize(self) -> None:
        """모델 로딩 (비동기 초기화)"""
        ...

    async def analyze(self, text: str) -> SentimentResult:
        """단일 텍스트 감성 분석"""
        ...

    async def analyze_batch(
        self,
        texts: List[str],
        batch_size: int = 32
    ) -> List[SentimentResult]:
        """배치 감성 분석 (GPU 효율화)"""
        ...

    def _score_to_label(self, score: float) -> SentimentLabel:
        """점수를 라벨로 변환"""
        if score >= 0.6:
            return SentimentLabel.VERY_BULLISH
        elif score >= 0.2:
            return SentimentLabel.BULLISH
        elif score >= -0.2:
            return SentimentLabel.NEUTRAL
        elif score >= -0.6:
            return SentimentLabel.BEARISH
        else:
            return SentimentLabel.VERY_BEARISH
```

### 3.2 SentimentPipeline (Orchestrator)

**책임**: 전체 파이프라인 오케스트레이션

```python
# backend/app/services/sentiment/pipeline.py

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional, Dict
import asyncio

@dataclass
class NewsSentimentInsight:
    """뉴스별 감성 분석 결과"""
    news_id: int
    title: str
    source: str
    published: datetime

    # 감성 분석
    sentiment: SentimentResult

    # 심볼 매핑
    related_symbols: List[str]       # ['BTC', 'ETH']
    relevance_score: float           # 0.0 ~ 1.0


@dataclass
class AggregatedSentiment:
    """집계된 시장 감성"""
    symbol: str
    timeframe: str                   # "1h", "4h", "24h"

    # 집계 점수
    sentiment_score: float           # -1.0 ~ 1.0 (가중 평균)
    sentiment_label: SentimentLabel

    # 통계
    total_news_count: int
    bullish_count: int
    bearish_count: int
    neutral_count: int

    # 신뢰도
    confidence: float
    sample_size_adequate: bool       # 샘플 수 충분 여부

    # 트렌드
    sentiment_change: float          # 이전 대비 변화
    momentum: str                    # "improving", "worsening", "stable"

    # 상위 뉴스
    top_bullish_news: List[NewsSentimentInsight]
    top_bearish_news: List[NewsSentimentInsight]


class SentimentPipeline:
    """
    감성 분석 파이프라인

    뉴스 수집 → 전처리 → 분석 → 집계 → 저장
    """

    def __init__(
        self,
        analyzer: SentimentAnalyzer,
        preprocessor: TextPreprocessor,
        aggregator: SentimentAggregator,
    ):
        self.analyzer = analyzer
        self.preprocessor = preprocessor
        self.aggregator = aggregator

    async def process_news_batch(
        self,
        news_items: List[News],
        symbol: Optional[str] = None
    ) -> List[NewsSentimentInsight]:
        """뉴스 배치 처리"""

        # 1. 전처리
        preprocessed = [
            self.preprocessor.process(news)
            for news in news_items
        ]

        # 2. 배치 분석
        texts = [p.cleaned_text for p in preprocessed]
        results = await self.analyzer.analyze_batch(texts)

        # 3. 인사이트 생성
        insights = []
        for news, prep, result in zip(news_items, preprocessed, results):
            insight = NewsSentimentInsight(
                news_id=news.id,
                title=news.title,
                source=news.source,
                published=news.published,
                sentiment=result,
                related_symbols=prep.detected_symbols,
                relevance_score=prep.relevance_score,
            )
            insights.append(insight)

        return insights

    async def get_aggregated_sentiment(
        self,
        symbol: str,
        timeframe: str = "24h"
    ) -> AggregatedSentiment:
        """집계된 시장 감성 조회"""
        return await self.aggregator.aggregate(symbol, timeframe)
```

### 3.3 TextPreprocessor

**책임**: 텍스트 정규화 및 전처리

```python
# backend/app/services/sentiment/preprocessor.py

@dataclass
class PreprocessedText:
    """전처리된 텍스트"""
    original_text: str
    cleaned_text: str
    detected_symbols: List[str]
    relevance_score: float
    language: str


class TextPreprocessor:
    """
    금융 뉴스 전처리기

    - HTML/특수문자 제거
    - 심볼 감지 (BTC, ETH, ...)
    - 금융 용어 정규화
    - 노이즈 필터링
    """

    # 심볼 패턴
    SYMBOL_PATTERNS = {
        'BTC': r'\b(bitcoin|btc|₿)\b',
        'ETH': r'\b(ethereum|eth|ether)\b',
        'BNB': r'\b(binance coin|bnb)\b',
        'SOL': r'\b(solana|sol)\b',
        'XRP': r'\b(ripple|xrp)\b',
        # ... 확장 가능
    }

    # 금융 용어 정규화
    FINANCIAL_NORMALIZATIONS = {
        r'\$\d+[kKmMbB]': '[PRICE]',      # $50K → [PRICE]
        r'\d+%': '[PERCENT]',              # 15% → [PERCENT]
        r'Q[1-4]\s*\d{4}': '[QUARTER]',   # Q1 2024 → [QUARTER]
    }

    def process(self, news: News) -> PreprocessedText:
        """뉴스 전처리"""
        ...

    def _detect_symbols(self, text: str) -> List[str]:
        """심볼 감지"""
        ...

    def _calculate_relevance(
        self,
        text: str,
        symbols: List[str]
    ) -> float:
        """관련성 점수 계산"""
        ...
```

### 3.4 SentimentAggregator

**책임**: 시간대별/심볼별 감성 집계

```python
# backend/app/services/sentiment/aggregator.py

class SentimentAggregator:
    """
    감성 점수 집계기

    집계 전략:
    - 시간 가중치: 최신 뉴스에 높은 가중치
    - 소스 가중치: 신뢰도 높은 소스 우선
    - 관련성 가중치: 심볼 연관도 반영
    """

    # 소스별 신뢰도 가중치
    SOURCE_WEIGHTS = {
        'CoinDesk': 1.0,
        'The Block': 1.0,
        'CoinTelegraph': 0.9,
        'Decrypt': 0.9,
        'CryptoSlate': 0.8,
        'NewsBTC': 0.7,
        # ... 기타 소스
    }

    # 시간 감쇠 파라미터
    TIME_DECAY_HALF_LIFE_HOURS = 6  # 6시간 반감기

    async def aggregate(
        self,
        symbol: str,
        timeframe: str,
        min_confidence: float = 0.5
    ) -> AggregatedSentiment:
        """감성 집계"""

        # 1. 시간 범위 계산
        hours = self._parse_timeframe(timeframe)
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

        # 2. 뉴스 조회 (감성 분석 완료된 것만)
        insights = await self._fetch_insights(symbol, cutoff)

        # 3. 가중 평균 계산
        weighted_score = self._calculate_weighted_average(insights)

        # 4. 트렌드 분석
        momentum = await self._analyze_momentum(symbol, timeframe)

        # 5. 상위 뉴스 추출
        top_bullish = self._get_top_n(insights, positive=True, n=3)
        top_bearish = self._get_top_n(insights, positive=False, n=3)

        return AggregatedSentiment(...)

    def _calculate_weighted_average(
        self,
        insights: List[NewsSentimentInsight]
    ) -> float:
        """가중 평균 계산"""
        if not insights:
            return 0.0

        total_weight = 0.0
        weighted_sum = 0.0

        for insight in insights:
            # 시간 가중치
            time_weight = self._time_decay_weight(insight.published)

            # 소스 가중치
            source_weight = self.SOURCE_WEIGHTS.get(insight.source, 0.5)

            # 관련성 가중치
            relevance_weight = insight.relevance_score

            # 신뢰도 가중치
            confidence_weight = insight.sentiment.confidence

            # 종합 가중치
            weight = (
                time_weight * 0.3 +
                source_weight * 0.25 +
                relevance_weight * 0.25 +
                confidence_weight * 0.2
            )

            weighted_sum += insight.sentiment.score * weight
            total_weight += weight

        return weighted_sum / total_weight if total_weight > 0 else 0.0
```

### 3.5 SentimentCache (Redis)

**책임**: 감성 분석 결과 캐싱

```python
# backend/app/services/sentiment/cache.py

class SentimentCache:
    """
    감성 분석 캐시

    캐시 전략:
    - 개별 뉴스 감성: 24시간 TTL (불변)
    - 집계 감성: 5분 TTL (갱신 빈도 높음)
    - 모델 예측 결과: 텍스트 해시 기반
    """

    INDIVIDUAL_TTL = 86400   # 24시간
    AGGREGATED_TTL = 300     # 5분

    def __init__(self, redis_client):
        self.redis = redis_client

    async def get_news_sentiment(
        self,
        news_id: int
    ) -> Optional[SentimentResult]:
        """개별 뉴스 감성 캐시 조회"""
        key = f"sentiment:news:{news_id}"
        ...

    async def set_news_sentiment(
        self,
        news_id: int,
        result: SentimentResult
    ) -> None:
        """개별 뉴스 감성 캐시 저장"""
        ...

    async def get_aggregated(
        self,
        symbol: str,
        timeframe: str
    ) -> Optional[AggregatedSentiment]:
        """집계 감성 캐시 조회"""
        key = f"sentiment:agg:{symbol}:{timeframe}"
        ...
```

---

## 4. 데이터 모델

### 4.1 NewsSentiment (SQLAlchemy Model)

```python
# backend/app/models/news_sentiment.py

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class NewsSentiment(Base):
    """
    뉴스 감성 분석 결과 테이블

    News 테이블과 1:1 관계
    """
    __tablename__ = "news_sentiments"

    id = Column(Integer, primary_key=True, index=True)
    news_id = Column(
        Integer,
        ForeignKey('news.id', ondelete='CASCADE'),
        unique=True,
        nullable=False,
        index=True
    )

    # 감성 점수
    sentiment_score = Column(
        Float,
        nullable=False,
        comment="감성 점수 (-1.0 ~ 1.0)"
    )
    sentiment_label = Column(
        String(20),
        nullable=False,
        comment="감성 라벨 (very_bullish/bullish/neutral/bearish/very_bearish)"
    )

    # 확률 분포
    positive_prob = Column(Float, comment="긍정 확률")
    negative_prob = Column(Float, comment="부정 확률")
    neutral_prob = Column(Float, comment="중립 확률")

    # 신뢰도
    confidence = Column(Float, nullable=False, comment="신뢰도 (0.0 ~ 1.0)")

    # 관련 심볼
    related_symbols = Column(
        String(100),
        comment="관련 심볼 (콤마 구분)"
    )
    relevance_score = Column(Float, comment="관련성 점수")

    # 해석 가능성
    key_phrases = Column(Text, comment="판단 근거 키워드 (JSON)")

    # 메타데이터
    model_name = Column(String(50), comment="사용된 모델")
    analyzed_at = Column(DateTime, nullable=False, comment="분석 시간")
    processing_time_ms = Column(Integer, comment="처리 시간 (밀리초)")

    # 관계
    news = relationship("News", backref="sentiment_analysis")

    __table_args__ = (
        Index('idx_sentiment_analyzed_at', 'analyzed_at'),
        Index('idx_sentiment_symbol', 'related_symbols'),
    )
```

### 4.2 SentimentSnapshot (집계 테이블)

```python
# backend/app/models/sentiment_snapshot.py

class SentimentSnapshot(Base):
    """
    시간별 감성 스냅샷 테이블

    시계열 분석을 위한 정기 스냅샷 저장
    """
    __tablename__ = "sentiment_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    timeframe = Column(String(10), nullable=False)  # "1h", "4h", "24h"

    # 집계 점수
    sentiment_score = Column(Float, nullable=False)
    sentiment_label = Column(String(20), nullable=False)

    # 통계
    news_count = Column(Integer, nullable=False)
    bullish_count = Column(Integer)
    bearish_count = Column(Integer)
    neutral_count = Column(Integer)

    # 신뢰도
    confidence = Column(Float)

    # 변화율
    score_change = Column(Float, comment="이전 스냅샷 대비 변화")

    # 타임스탬프
    snapshot_at = Column(DateTime, nullable=False, index=True)

    __table_args__ = (
        Index('idx_snapshot_symbol_time', 'symbol', 'snapshot_at'),
        UniqueConstraint('symbol', 'timeframe', 'snapshot_at'),
    )
```

---

## 5. API 인터페이스

### 5.1 REST API 엔드포인트

```python
# backend/app/routers/sentiment.py

router = APIRouter(prefix="/api/sentiment", tags=["Sentiment"])


@router.get("/news/{news_id}", response_model=NewsSentimentResponse)
async def get_news_sentiment(news_id: int):
    """개별 뉴스 감성 조회"""
    ...


@router.get("/aggregated", response_model=AggregatedSentimentResponse)
async def get_aggregated_sentiment(
    symbol: str = Query("BTC", description="심볼"),
    timeframe: str = Query("24h", description="시간 범위")
):
    """집계된 시장 감성 조회"""
    ...


@router.get("/history", response_model=SentimentHistoryResponse)
async def get_sentiment_history(
    symbol: str = Query("BTC"),
    days: int = Query(7, ge=1, le=30),
    interval: str = Query("1h")  # "1h", "4h", "24h"
):
    """감성 이력 조회 (차트용)"""
    ...


@router.post("/analyze", response_model=AnalysisJobResponse)
async def trigger_sentiment_analysis(
    symbol: Optional[str] = None,
    hours: int = Query(24, description="분석할 시간 범위")
):
    """수동 감성 분석 트리거"""
    ...
```

### 5.2 응답 스키마

```python
# backend/app/schemas/sentiment.py

class NewsSentimentResponse(BaseModel):
    """개별 뉴스 감성 응답"""
    news_id: int
    title: str
    source: str
    published: Optional[datetime]

    sentiment_score: float
    sentiment_label: str
    confidence: float

    key_phrases: List[str]
    related_symbols: List[str]


class AggregatedSentimentResponse(BaseModel):
    """집계 감성 응답"""
    symbol: str
    timeframe: str

    sentiment_score: float
    sentiment_label: str
    confidence: float

    statistics: SentimentStatistics
    trend: SentimentTrend

    top_bullish_news: List[NewsSentimentBrief]
    top_bearish_news: List[NewsSentimentBrief]

    last_updated: datetime


class SentimentStatistics(BaseModel):
    """감성 통계"""
    total_news: int
    bullish_count: int
    bearish_count: int
    neutral_count: int
    bullish_ratio: float
    bearish_ratio: float


class SentimentTrend(BaseModel):
    """감성 트렌드"""
    score_change_1h: Optional[float]
    score_change_4h: Optional[float]
    score_change_24h: Optional[float]
    momentum: str  # "improving", "worsening", "stable"
```

---

## 6. 백그라운드 태스크

### 6.1 SentimentWorker

```python
# backend/app/services/sentiment/worker.py

class SentimentWorker:
    """
    감성 분석 백그라운드 워커

    두 가지 모드:
    1. 실시간 모드: 새 뉴스 즉시 분석
    2. 배치 모드: 미분석 뉴스 일괄 처리
    """

    def __init__(self, pipeline: SentimentPipeline):
        self.pipeline = pipeline
        self.batch_size = 32
        self.processing_interval = 60  # 1분

    async def run(self):
        """워커 메인 루프"""
        logger.info("SentimentWorker 시작")

        while True:
            try:
                # 미분석 뉴스 조회
                unanalyzed = await self._get_unanalyzed_news()

                if unanalyzed:
                    logger.info(f"미분석 뉴스 {len(unanalyzed)}개 처리 시작")

                    # 배치 처리
                    for batch in self._chunk(unanalyzed, self.batch_size):
                        insights = await self.pipeline.process_news_batch(batch)
                        await self._save_insights(insights)

                    logger.info(f"감성 분석 완료: {len(unanalyzed)}개")

                # 집계 스냅샷 갱신
                await self._update_snapshots()

                await asyncio.sleep(self.processing_interval)

            except asyncio.CancelledError:
                logger.info("SentimentWorker 종료")
                break
            except Exception as e:
                logger.error(f"SentimentWorker 오류: {e}")
                await asyncio.sleep(30)

    async def _get_unanalyzed_news(self) -> List[News]:
        """미분석 뉴스 조회"""
        ...

    async def _update_snapshots(self):
        """집계 스냅샷 갱신 (1시간마다)"""
        ...
```

---

## 7. 설정 및 환경변수

```python
# backend/app/core/config.py (추가 설정)

class Settings(BaseSettings):
    # ... 기존 설정

    # Sentiment Analysis 설정
    SENTIMENT_MODEL: str = "ProsusAI/finbert"
    SENTIMENT_BATCH_SIZE: int = 32
    SENTIMENT_MIN_CONFIDENCE: float = 0.5
    SENTIMENT_CACHE_TTL: int = 300  # 5분

    # GPU 설정
    SENTIMENT_USE_GPU: bool = True
    SENTIMENT_DEVICE: str = "auto"  # "auto", "cuda", "cpu"

    # 워커 설정
    SENTIMENT_WORKER_ENABLED: bool = True
    SENTIMENT_WORKER_INTERVAL: int = 60  # 초
```

---

## 8. 구현 우선순위

### Phase 1: MVP (완료)
1. ✅ SentimentAnalyzer (FinBERT 기본 구현)
2. ✅ NewsSentiment 모델 및 마이그레이션
3. ✅ 기본 API 엔드포인트 (`/api/sentiment/news/{id}`)
4. ✅ 백그라운드 워커 (배치 처리)

### Phase 2: 고도화 (완료)
1. ✅ TextPreprocessor 금융 도메인 최적화
2. ✅ SentimentAggregator 가중 평균 로직
3. ✅ LRU 캐싱 레이어 (in-memory)
4. ✅ 집계 API (`/api/sentiment/aggregated`)

### Phase 3: 확장 (진행 예정)
1. ⬜ 소셜 미디어 소스 통합 (Twitter, Reddit)
2. ✅ SentimentSnapshot 시계열 저장
3. ✅ 트렌드 분석 및 모멘텀 계산
4. ⬜ 프론트엔드 감성 대시보드

---

## 9. 의존성 추가

```txt
# backend/requirements.txt (추가)

# Sentiment Analysis
transformers>=4.35.0
torch>=2.0.0
accelerate>=0.25.0
```

---

## 10. 테스트 전략

### 10.1 단위 테스트
```python
# tests/test_sentiment_analyzer.py

async def test_analyze_bullish_text():
    analyzer = SentimentAnalyzer()
    await analyzer.initialize()

    result = await analyzer.analyze(
        "Bitcoin surges to new all-time high as institutional adoption accelerates"
    )

    assert result.score > 0.2
    assert result.label in [SentimentLabel.BULLISH, SentimentLabel.VERY_BULLISH]
    assert result.confidence > 0.7


async def test_analyze_bearish_text():
    analyzer = SentimentAnalyzer()
    await analyzer.initialize()

    result = await analyzer.analyze(
        "Bitcoin crashes 20% amid SEC crackdown and market panic"
    )

    assert result.score < -0.2
    assert result.label in [SentimentLabel.BEARISH, SentimentLabel.VERY_BEARISH]
```

### 10.2 통합 테스트
```python
# tests/test_sentiment_pipeline.py

async def test_pipeline_end_to_end():
    """파이프라인 E2E 테스트"""
    ...


async def test_aggregation_accuracy():
    """집계 정확도 테스트"""
    ...
```

---

## 11. 모니터링 및 관측성

### 11.1 메트릭
- `sentiment_analysis_latency_seconds`: 분석 지연 시간
- `sentiment_analysis_total`: 총 분석 건수
- `sentiment_analysis_errors_total`: 오류 건수
- `sentiment_cache_hit_ratio`: 캐시 히트율
- `sentiment_model_confidence_histogram`: 신뢰도 분포

### 11.2 로깅
```python
logger.info(
    "Sentiment analysis completed",
    extra={
        "news_id": news_id,
        "score": result.score,
        "confidence": result.confidence,
        "latency_ms": latency_ms,
    }
)
```

---

## 12. 다음 단계

설계 승인 후 `/sc:implement sentiment-analysis-pipeline --phase 1`로 구현을 시작합니다.

구현 순서:
1. `NewsSentiment` 모델 생성
2. `SentimentAnalyzer` 코어 구현
3. `SentimentWorker` 백그라운드 태스크
4. REST API 엔드포인트
5. `main.py` 통합
