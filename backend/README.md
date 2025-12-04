# QuantBoard Backend

QuantBoard V1 트레이딩 대시보드를 위한 FastAPI 백엔드입니다.

## 설정

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

## API 엔드포인트

- `GET /health` - 헬스 체크 엔드포인트

## 환경 변수

사용 가능한 설정 옵션은 `env.example` 파일을 참조하세요.

