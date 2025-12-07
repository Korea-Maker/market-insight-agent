# QuantBoard Backend

QuantBoard V1 트레이딩 대시보드를 위한 FastAPI 백엔드입니다.

## 설정

### 방법 1: Docker 사용 (권장)

1. 가상 환경 생성:
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. 의존성 설치:
```bash
pip install -r requirements.txt
```

3. 환경 변수 설정:
```bash
cp env.example .env
# .env 파일을 편집하여 설정을 변경하세요
```

4. 인프라 서비스 시작:
```bash
docker-compose up -d
```

5. 서버 실행:
```bash
python main.py
```

### 방법 2: Docker 없이 로컬 테스트

Docker를 사용하지 않고 로컬 환경에서 테스트하려면 [TESTING_WITHOUT_DOCKER.md](./TESTING_WITHOUT_DOCKER.md)를 참조하세요.

**빠른 시작:**
1. 로컬에 Redis 설치 및 실행
2. `.env` 파일 생성 (env.example 참조)
3. `python test_components.py`로 컴포넌트 테스트
4. `python main.py`로 서버 실행

## 테스트

### 컴포넌트 테스트
```bash
python test_components.py
```

### WebSocket 리스너 테스트
```bash
# 터미널 1: 서버 시작
python main.py

# 터미널 2: 리스너 테스트
python test_listener.py
```

## API 엔드포인트

- `GET /health` - 헬스 체크 엔드포인트
- `WS /ws/prices` - 실시간 가격 WebSocket 스트림

## 환경 변수

사용 가능한 설정 옵션은 `env.example` 파일을 참조하세요.

