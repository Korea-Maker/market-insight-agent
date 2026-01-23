"""
금융 뉴스 텍스트 전처리기

뉴스 텍스트를 감성 분석에 최적화된 형태로 정규화
- HTML/특수문자 제거
- 심볼 감지 (BTC, ETH, ...)
- 금융 용어 정규화
- 노이즈 필터링
"""
import re
import html
import logging
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Set
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


@dataclass
class PreprocessedText:
    """전처리된 텍스트 결과"""

    original_text: str  # 원본 텍스트
    cleaned_text: str  # 정제된 텍스트
    detected_symbols: List[str] = field(default_factory=list)  # 감지된 심볼
    relevance_score: float = 0.5  # 관련성 점수 (0.0 ~ 1.0)
    language: str = "en"  # 언어 코드
    word_count: int = 0  # 단어 수


class TextPreprocessor:
    """
    금융 뉴스 전처리기

    Features:
    - HTML 태그 및 특수문자 제거
    - 암호화폐 심볼 감지 (BTC, ETH, SOL, ...)
    - 금융 관련 숫자/비율 정규화
    - 노이즈 문자열 필터링
    """

    # 암호화폐 심볼 패턴 (대소문자 무시)
    SYMBOL_PATTERNS: Dict[str, re.Pattern] = {
        "BTC": re.compile(r"\b(bitcoin|btc|xbt)\b", re.IGNORECASE),
        "ETH": re.compile(r"\b(ethereum|eth|ether)\b", re.IGNORECASE),
        "BNB": re.compile(r"\b(binance\s*coin|bnb)\b", re.IGNORECASE),
        "SOL": re.compile(r"\b(solana|sol)\b", re.IGNORECASE),
        "XRP": re.compile(r"\b(ripple|xrp)\b", re.IGNORECASE),
        "ADA": re.compile(r"\b(cardano|ada)\b", re.IGNORECASE),
        "DOGE": re.compile(r"\b(dogecoin|doge)\b", re.IGNORECASE),
        "DOT": re.compile(r"\b(polkadot|dot)\b", re.IGNORECASE),
        "AVAX": re.compile(r"\b(avalanche|avax)\b", re.IGNORECASE),
        "MATIC": re.compile(r"\b(polygon|matic)\b", re.IGNORECASE),
        "LINK": re.compile(r"\b(chainlink|link)\b", re.IGNORECASE),
        "UNI": re.compile(r"\b(uniswap|uni)\b", re.IGNORECASE),
        "ATOM": re.compile(r"\b(cosmos|atom)\b", re.IGNORECASE),
        "LTC": re.compile(r"\b(litecoin|ltc)\b", re.IGNORECASE),
        "USDT": re.compile(r"\b(tether|usdt)\b", re.IGNORECASE),
        "USDC": re.compile(r"\b(usd\s*coin|usdc)\b", re.IGNORECASE),
    }

    # 일반 암호화폐 용어
    CRYPTO_KEYWORDS = {
        "cryptocurrency",
        "crypto",
        "blockchain",
        "defi",
        "nft",
        "web3",
        "altcoin",
        "stablecoin",
        "token",
        "mining",
        "wallet",
        "exchange",
        "trading",
        "market",
        "bull",
        "bear",
        "rally",
        "crash",
        "pump",
        "dump",
        "hodl",
        "whale",
    }

    # 노이즈 패턴 (제거 대상)
    NOISE_PATTERNS = [
        re.compile(r"https?://\S+"),  # URL
        re.compile(r"\S+@\S+"),  # 이메일
        re.compile(r"#\w+"),  # 해시태그
        re.compile(r"@\w+"),  # 멘션
        re.compile(r"\[.*?\]"),  # 대괄호 내용
        re.compile(r"\(.*?source.*?\)", re.IGNORECASE),  # 출처 표기
        re.compile(r"(?:read|click|subscribe|sign up).*?(?:here|now|today)", re.IGNORECASE),
    ]

    # 금융 용어 정규화 (선택적 - 분석 품질 향상)
    FINANCIAL_NORMALIZATIONS = [
        (re.compile(r"\$[\d,]+(?:\.\d+)?[KkMmBbTt]?"), "[PRICE]"),
        (re.compile(r"[\d,]+(?:\.\d+)?%"), "[PERCENT]"),
        (re.compile(r"Q[1-4]\s*['']?\d{2,4}"), "[QUARTER]"),
        (re.compile(r"(?:FY|fiscal year)\s*\d{2,4}", re.IGNORECASE), "[FISCAL_YEAR]"),
    ]

    def __init__(
        self,
        normalize_financial: bool = False,
        min_word_count: int = 3,
    ):
        """
        Args:
            normalize_financial: 금융 용어 정규화 여부 (기본: False)
            min_word_count: 최소 단어 수 (미달 시 relevance_score 감소)
        """
        self.normalize_financial = normalize_financial
        self.min_word_count = min_word_count

    def process(
        self,
        text: str,
        title: Optional[str] = None,
        source: Optional[str] = None,
    ) -> PreprocessedText:
        """
        뉴스 텍스트 전처리

        Args:
            text: 본문 또는 설명 텍스트
            title: 뉴스 제목 (선택)
            source: 뉴스 출처 (선택)

        Returns:
            PreprocessedText 객체
        """
        # 제목과 본문 결합 (있는 경우)
        full_text = text
        if title:
            full_text = f"{title}. {text}"

        original_text = full_text

        # 1. HTML 디코딩 및 태그 제거
        cleaned = self._clean_html(full_text)

        # 2. 노이즈 제거
        cleaned = self._remove_noise(cleaned)

        # 3. 특수문자 정규화
        cleaned = self._normalize_characters(cleaned)

        # 4. 금융 용어 정규화 (선택적)
        if self.normalize_financial:
            cleaned = self._normalize_financial_terms(cleaned)

        # 5. 공백 정규화
        cleaned = self._normalize_whitespace(cleaned)

        # 6. 심볼 감지
        detected_symbols = self._detect_symbols(original_text)

        # 7. 관련성 점수 계산
        relevance_score = self._calculate_relevance(
            original_text, detected_symbols
        )

        # 8. 언어 감지 (간단한 휴리스틱)
        language = self._detect_language(cleaned)

        # 9. 단어 수
        word_count = len(cleaned.split())

        return PreprocessedText(
            original_text=original_text,
            cleaned_text=cleaned,
            detected_symbols=detected_symbols,
            relevance_score=relevance_score,
            language=language,
            word_count=word_count,
        )

    def _clean_html(self, text: str) -> str:
        """HTML 태그 및 엔티티 제거"""
        # HTML 엔티티 디코딩
        text = html.unescape(text)

        # BeautifulSoup으로 태그 제거
        soup = BeautifulSoup(text, "html.parser")
        text = soup.get_text(separator=" ")

        return text

    def _remove_noise(self, text: str) -> str:
        """노이즈 패턴 제거"""
        for pattern in self.NOISE_PATTERNS:
            text = pattern.sub(" ", text)
        return text

    def _normalize_characters(self, text: str) -> str:
        """특수문자 정규화"""
        # 유니코드 따옴표 → ASCII
        text = text.replace(""", '"').replace(""", '"')
        text = text.replace("'", "'").replace("'", "'")
        text = text.replace("–", "-").replace("—", "-")

        # 연속 특수문자 제거
        text = re.sub(r"[^\w\s.,!?;:\'\"-]", " ", text)

        return text

    def _normalize_financial_terms(self, text: str) -> str:
        """금융 용어 정규화"""
        for pattern, replacement in self.FINANCIAL_NORMALIZATIONS:
            text = pattern.sub(replacement, text)
        return text

    def _normalize_whitespace(self, text: str) -> str:
        """공백 정규화"""
        # 연속 공백 → 단일 공백
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def _detect_symbols(self, text: str) -> List[str]:
        """암호화폐 심볼 감지"""
        detected: Set[str] = set()

        for symbol, pattern in self.SYMBOL_PATTERNS.items():
            if pattern.search(text):
                detected.add(symbol)

        # 심볼 직접 매칭 (대문자)
        direct_matches = re.findall(r"\b([A-Z]{2,5})\b", text)
        for match in direct_matches:
            if match in self.SYMBOL_PATTERNS:
                detected.add(match)

        return sorted(list(detected))

    def _calculate_relevance(
        self,
        text: str,
        symbols: List[str],
    ) -> float:
        """
        암호화폐 관련성 점수 계산

        Factors:
        - 심볼 감지 여부 (40%)
        - 암호화폐 키워드 빈도 (40%)
        - 텍스트 길이 적절성 (20%)
        """
        text_lower = text.lower()
        score = 0.0

        # 1. 심볼 점수 (0.0 ~ 0.4)
        if symbols:
            symbol_score = min(len(symbols) * 0.15, 0.4)
            score += symbol_score

        # 2. 키워드 점수 (0.0 ~ 0.4)
        keyword_count = sum(
            1 for kw in self.CRYPTO_KEYWORDS if kw in text_lower
        )
        keyword_score = min(keyword_count * 0.08, 0.4)
        score += keyword_score

        # 3. 길이 점수 (0.0 ~ 0.2)
        word_count = len(text.split())
        if word_count >= 20:
            length_score = 0.2
        elif word_count >= 10:
            length_score = 0.15
        elif word_count >= self.min_word_count:
            length_score = 0.1
        else:
            length_score = 0.0
        score += length_score

        # 최소/최대 범위 보장
        return max(0.1, min(1.0, score))

    def _detect_language(self, text: str) -> str:
        """간단한 언어 감지 (영어/한국어)"""
        # 한글 문자 비율 확인
        korean_chars = len(re.findall(r"[\uac00-\ud7af]", text))
        total_chars = len(text.replace(" ", ""))

        if total_chars > 0 and korean_chars / total_chars > 0.3:
            return "ko"
        return "en"

    def process_news_item(self, news) -> PreprocessedText:
        """
        News 모델 객체 전처리 헬퍼

        Args:
            news: News SQLAlchemy 모델 인스턴스

        Returns:
            PreprocessedText 객체
        """
        text = news.description or ""
        title = news.title or ""
        source = news.source or ""

        return self.process(text=text, title=title, source=source)
