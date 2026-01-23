"""
GPT 응답 파서 모듈
시장 분석 응답 파싱 및 검증
"""
import json
import logging
import re
from typing import Dict

logger = logging.getLogger(__name__)


# 유효한 값 목록
VALID_RECOMMENDATIONS = ["strong_buy", "buy", "hold", "sell", "strong_sell"]
VALID_RISK_LEVELS = ["low", "medium", "high", "very_high"]

# 필수 필드 기본값
DEFAULT_VALUES = {
    "summary": "분석 데이터를 처리할 수 없습니다.",
    "price_reason": "가격 변동 원인을 분석할 수 없습니다.",
    "recommendation": "hold",
    "recommendation_reason": "충분한 데이터가 없어 관망을 권장합니다.",
    "risk_level": "medium",
    "sentiment_score": 50,
    "sentiment_label": "중립"
}

# 필수 필드 목록
REQUIRED_FIELDS = [
    "summary", "price_reason", "recommendation",
    "recommendation_reason", "risk_level",
    "sentiment_score", "sentiment_label"
]


def validate_recommendation(value: str) -> str:
    """매매 추천 값 검증"""
    value_lower = value.lower().replace(" ", "_")
    if value_lower in VALID_RECOMMENDATIONS:
        return value_lower
    return "hold"


def validate_risk_level(value: str) -> str:
    """위험도 값 검증"""
    value_lower = value.lower().replace(" ", "_")
    if value_lower in VALID_RISK_LEVELS:
        return value_lower
    return "medium"


def validate_sentiment_score(score) -> int:
    """감성 점수 검증 (0-100 범위)"""
    if isinstance(score, (int, float)):
        return max(0, min(100, int(score)))
    return 50


def extract_json_from_text(text: str) -> str:
    """텍스트에서 JSON 추출"""
    # ```json ... ``` 형식에서 추출
    json_match = re.search(r'```json\s*([\s\S]*?)\s*```', text)
    if json_match:
        return json_match.group(1)

    # 순수 JSON 형식에서 추출
    json_match = re.search(r'\{[\s\S]*\}', text)
    if json_match:
        return json_match.group(0)

    raise ValueError("JSON 형식을 찾을 수 없습니다")


def get_default_response() -> Dict:
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


def parse_gpt_response(response_text: str) -> Dict:
    """GPT 응답 파싱 및 검증"""
    try:
        # JSON 추출
        json_str = extract_json_from_text(response_text)
        parsed = json.loads(json_str)

        # 필수 필드 검증 및 기본값 적용
        for field in REQUIRED_FIELDS:
            if field not in parsed:
                logger.warning(f"필수 필드 누락: {field}")
                parsed[field] = DEFAULT_VALUES.get(field)

        # 값 검증
        parsed["recommendation"] = validate_recommendation(
            parsed.get("recommendation", "hold")
        )
        parsed["risk_level"] = validate_risk_level(
            parsed.get("risk_level", "medium")
        )
        parsed["sentiment_score"] = validate_sentiment_score(
            parsed.get("sentiment_score", 50)
        )

        return parsed

    except json.JSONDecodeError as e:
        logger.error(f"JSON 파싱 오류: {e}")
        return get_default_response()
    except ValueError as e:
        logger.error(f"JSON 추출 오류: {e}")
        return get_default_response()
    except Exception as e:
        logger.error(f"응답 파싱 오류: {e}")
        return get_default_response()
