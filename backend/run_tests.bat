@echo off
REM QuantBoard 백엔드 테스트 실행 스크립트 (Windows)
REM Docker 없이 로컬 환경에서 테스트를 실행합니다

echo ========================================
echo QuantBoard V1 - 테스트 실행
echo ========================================
echo.

REM 가상 환경 확인
if not exist "venv\Scripts\activate.bat" (
    echo [경고] 가상 환경이 없습니다. 생성 중...
    python -m venv venv
    if errorlevel 1 (
        echo [오류] 가상 환경 생성 실패
        pause
        exit /b 1
    )
)

REM 가상 환경 활성화
call venv\Scripts\activate.bat

REM 의존성 확인
echo 의존성 확인 중...
pip show fastapi >nul 2>&1
if errorlevel 1 (
    echo 의존성 설치 중...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [오류] 의존성 설치 실패
        pause
        exit /b 1
    )
)

REM .env 파일 확인
if not exist ".env" (
    echo [경고] .env 파일이 없습니다. env.example에서 복사 중...
    copy env.example .env >nul 2>&1
    if errorlevel 1 (
        echo [경고] .env 파일 생성 실패. 수동으로 생성해주세요.
    ) else (
        echo .env 파일이 생성되었습니다.
    )
)

echo.
echo ========================================
echo 컴포넌트 테스트 실행
echo ========================================
echo.

python test_components.py

echo.
echo ========================================
echo 테스트 완료
echo ========================================
echo.
echo 다음 단계:
echo 1. 모든 테스트가 통과했는지 확인하세요
echo 2. python main.py 로 서버를 시작하세요
echo 3. 다른 터미널에서 python test_listener.py 로 WebSocket 테스트를 실행하세요
echo.

pause

