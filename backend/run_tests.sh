#!/bin/bash
# QuantBoard 백엔드 테스트 실행 스크립트 (Linux/Mac)
# Docker 없이 로컬 환경에서 테스트를 실행합니다

set -e

echo "========================================"
echo "QuantBoard V1 - 테스트 실행"
echo "========================================"
echo ""

# 가상 환경 확인
if [ ! -d "venv" ]; then
    echo "[경고] 가상 환경이 없습니다. 생성 중..."
    python3 -m venv venv
fi

# 가상 환경 활성화
source venv/bin/activate

# 의존성 확인
echo "의존성 확인 중..."
if ! pip show fastapi > /dev/null 2>&1; then
    echo "의존성 설치 중..."
    pip install -r requirements.txt
fi

# .env 파일 확인
if [ ! -f ".env" ]; then
    echo "[경고] .env 파일이 없습니다. env.example에서 복사 중..."
    cp env.example .env 2>/dev/null || {
        echo "[경고] .env 파일 생성 실패. 수동으로 생성해주세요."
    }
fi

echo ""
echo "========================================"
echo "컴포넌트 테스트 실행"
echo "========================================"
echo ""

python test_components.py

echo ""
echo "========================================"
echo "테스트 완료"
echo "========================================"
echo ""
echo "다음 단계:"
echo "1. 모든 테스트가 통과했는지 확인하세요"
echo "2. python main.py 로 서버를 시작하세요"
echo "3. 다른 터미널에서 python test_listener.py 로 WebSocket 테스트를 실행하세요"
echo ""

