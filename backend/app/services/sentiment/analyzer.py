"""
FinBERT 기반 감성 분석기

금융 도메인에 특화된 BERT 모델을 사용하여 텍스트의 감성을 분석
- 배치 처리 지원
- GPU 가속 (가용 시)
- 결과 캐싱
"""
import asyncio
import hashlib
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from functools import lru_cache
from typing import List, Optional, Dict, Any
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

# 전역 스레드 풀 (모델 추론용)
_executor = ThreadPoolExecutor(max_workers=2)


class SentimentLabel(str, Enum):
    """감성 라벨"""

    VERY_BULLISH = "very_bullish"  # 0.6 ~ 1.0
    BULLISH = "bullish"  # 0.2 ~ 0.6
    NEUTRAL = "neutral"  # -0.2 ~ 0.2
    BEARISH = "bearish"  # -0.6 ~ -0.2
    VERY_BEARISH = "very_bearish"  # -1.0 ~ -0.6


@dataclass
class SentimentResult:
    """감성 분석 결과"""

    score: float  # -1.0 ~ 1.0
    label: SentimentLabel  # 감성 라벨
    confidence: float  # 0.0 ~ 1.0

    # 확률 분포
    positive_prob: float = 0.0
    negative_prob: float = 0.0
    neutral_prob: float = 0.0

    # 해석 가능성
    key_phrases: List[str] = field(default_factory=list)
    explanation: Optional[str] = None

    # 메타데이터
    processing_time_ms: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리로 변환"""
        return {
            "score": self.score,
            "label": self.label.value,
            "confidence": self.confidence,
            "positive_prob": self.positive_prob,
            "negative_prob": self.negative_prob,
            "neutral_prob": self.neutral_prob,
            "key_phrases": self.key_phrases,
            "explanation": self.explanation,
            "processing_time_ms": self.processing_time_ms,
        }


class SentimentAnalyzer:
    """
    FinBERT 기반 금융 감성 분석기

    Features:
    - 금융 도메인 특화 (ProsusAI/finbert)
    - 배치 처리 지원 (GPU 효율화)
    - CPU/GPU 자동 감지
    - LRU 캐싱 지원
    """

    MODEL_NAME = "ProsusAI/finbert"
    MAX_LENGTH = 512
    LABEL_MAP = {0: "positive", 1: "negative", 2: "neutral"}

    def __init__(
        self,
        device: str = "auto",
        cache_enabled: bool = True,
        cache_size: int = 1000,
    ):
        """
        Args:
            device: 디바이스 설정 ("auto", "cuda", "cpu")
            cache_enabled: 캐싱 활성화 여부
            cache_size: LRU 캐시 크기
        """
        self.device_preference = device
        self.device = None
        self.tokenizer = None
        self.model = None
        self.cache_enabled = cache_enabled
        self._cache: Dict[str, SentimentResult] = {}
        self._cache_size = cache_size
        self._initialized = False

    async def initialize(self) -> bool:
        """
        모델 로딩 (비동기 초기화)

        Returns:
            초기화 성공 여부
        """
        if self._initialized:
            return True

        try:
            # 동기 로딩을 스레드 풀에서 실행
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(_executor, self._load_model)
            self._initialized = True
            logger.info(
                f"SentimentAnalyzer 초기화 완료 (device={self.device}, model={self.MODEL_NAME})"
            )
            return True
        except Exception as e:
            logger.error(f"SentimentAnalyzer 초기화 실패: {e}")
            return False

    def _load_model(self) -> None:
        """동기 모델 로딩 (스레드에서 실행)"""
        try:
            import torch
            from transformers import AutoTokenizer, AutoModelForSequenceClassification

            # 디바이스 감지
            self.device = self._detect_device(self.device_preference)

            # 토크나이저 로딩
            logger.info(f"토크나이저 로딩 중: {self.MODEL_NAME}")
            self.tokenizer = AutoTokenizer.from_pretrained(self.MODEL_NAME)

            # 모델 로딩
            logger.info(f"모델 로딩 중: {self.MODEL_NAME}")
            self.model = AutoModelForSequenceClassification.from_pretrained(
                self.MODEL_NAME
            )
            self.model.to(self.device)
            self.model.eval()

            logger.info(f"모델 로딩 완료: {self.MODEL_NAME} on {self.device}")

        except ImportError as e:
            logger.error(
                f"필수 패키지가 설치되지 않음: {e}. "
                "pip install transformers torch 실행 필요"
            )
            raise
        except Exception as e:
            logger.error(f"모델 로딩 실패: {e}")
            raise

    def _detect_device(self, preference: str) -> str:
        """
        디바이스 자동 감지

        Args:
            preference: 선호 디바이스 ("auto", "cuda", "cpu")

        Returns:
            사용할 디바이스 문자열
        """
        try:
            import torch

            if preference == "cpu":
                return "cpu"
            elif preference == "cuda":
                if torch.cuda.is_available():
                    return "cuda"
                logger.warning("CUDA 요청되었으나 사용 불가, CPU로 폴백")
                return "cpu"
            else:  # auto
                if torch.cuda.is_available():
                    logger.info("CUDA 디바이스 감지됨")
                    return "cuda"
                elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                    logger.info("MPS 디바이스 감지됨 (Apple Silicon)")
                    return "mps"
                else:
                    return "cpu"
        except ImportError:
            return "cpu"

    async def analyze(self, text: str) -> SentimentResult:
        """
        단일 텍스트 감성 분석

        Args:
            text: 분석할 텍스트

        Returns:
            SentimentResult 객체
        """
        if not self._initialized:
            await self.initialize()

        # 캐시 확인
        if self.cache_enabled:
            cache_key = self._get_cache_key(text)
            if cache_key in self._cache:
                return self._cache[cache_key]

        start_time = time.time()

        # 동기 추론을 스레드 풀에서 실행
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(_executor, self._inference_single, text)

        # 처리 시간 기록
        result.processing_time_ms = int((time.time() - start_time) * 1000)

        # 캐시 저장
        if self.cache_enabled:
            self._add_to_cache(cache_key, result)

        return result

    async def analyze_batch(
        self,
        texts: List[str],
        batch_size: int = 16,
    ) -> List[SentimentResult]:
        """
        배치 감성 분석 (GPU 효율화)

        Args:
            texts: 분석할 텍스트 목록
            batch_size: 배치 크기

        Returns:
            SentimentResult 목록
        """
        if not self._initialized:
            await self.initialize()

        if not texts:
            return []

        results = []
        uncached_indices = []
        uncached_texts = []

        # 캐시된 결과 확인
        for i, text in enumerate(texts):
            if self.cache_enabled:
                cache_key = self._get_cache_key(text)
                if cache_key in self._cache:
                    results.append((i, self._cache[cache_key]))
                    continue
            uncached_indices.append(i)
            uncached_texts.append(text)

        # 미캐시 텍스트 배치 처리
        if uncached_texts:
            start_time = time.time()
            loop = asyncio.get_event_loop()
            batch_results = await loop.run_in_executor(
                _executor,
                self._inference_batch,
                uncached_texts,
                batch_size,
            )
            processing_time = int((time.time() - start_time) * 1000 / len(uncached_texts))

            for idx, text, result in zip(uncached_indices, uncached_texts, batch_results):
                result.processing_time_ms = processing_time
                results.append((idx, result))

                # 캐시 저장
                if self.cache_enabled:
                    cache_key = self._get_cache_key(text)
                    self._add_to_cache(cache_key, result)

        # 원래 순서로 정렬
        results.sort(key=lambda x: x[0])
        return [r for _, r in results]

    def _inference_single(self, text: str) -> SentimentResult:
        """단일 텍스트 추론 (동기)"""
        import torch

        # 토큰화
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=self.MAX_LENGTH,
            padding=True,
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        # 추론
        with torch.no_grad():
            outputs = self.model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)

        # 결과 파싱
        probs_np = probs.cpu().numpy()[0]
        positive_prob = float(probs_np[0])
        negative_prob = float(probs_np[1])
        neutral_prob = float(probs_np[2])

        # 점수 계산 (-1 ~ 1)
        score = positive_prob - negative_prob
        confidence = max(probs_np)
        label = self._score_to_label(score)

        return SentimentResult(
            score=score,
            label=label,
            confidence=confidence,
            positive_prob=positive_prob,
            negative_prob=negative_prob,
            neutral_prob=neutral_prob,
        )

    def _inference_batch(
        self,
        texts: List[str],
        batch_size: int,
    ) -> List[SentimentResult]:
        """배치 추론 (동기)"""
        import torch

        results = []

        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i : i + batch_size]

            # 토큰화
            inputs = self.tokenizer(
                batch_texts,
                return_tensors="pt",
                truncation=True,
                max_length=self.MAX_LENGTH,
                padding=True,
            )
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            # 추론
            with torch.no_grad():
                outputs = self.model(**inputs)
                probs = torch.softmax(outputs.logits, dim=-1)

            # 결과 파싱
            probs_np = probs.cpu().numpy()

            for j in range(len(batch_texts)):
                positive_prob = float(probs_np[j][0])
                negative_prob = float(probs_np[j][1])
                neutral_prob = float(probs_np[j][2])

                score = positive_prob - negative_prob
                confidence = max(probs_np[j])
                label = self._score_to_label(score)

                results.append(
                    SentimentResult(
                        score=score,
                        label=label,
                        confidence=confidence,
                        positive_prob=positive_prob,
                        negative_prob=negative_prob,
                        neutral_prob=neutral_prob,
                    )
                )

        return results

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

    def _get_cache_key(self, text: str) -> str:
        """텍스트의 캐시 키 생성"""
        return hashlib.md5(text.encode()).hexdigest()

    def _add_to_cache(self, key: str, result: SentimentResult) -> None:
        """LRU 캐시에 추가"""
        if len(self._cache) >= self._cache_size:
            # 가장 오래된 항목 제거 (간단한 FIFO)
            oldest_key = next(iter(self._cache))
            del self._cache[oldest_key]
        self._cache[key] = result

    @property
    def is_initialized(self) -> bool:
        """초기화 여부 확인"""
        return self._initialized

    def clear_cache(self) -> None:
        """캐시 초기화"""
        self._cache.clear()
        logger.info("SentimentAnalyzer 캐시 초기화됨")
