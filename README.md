# QuantBoard V1

Next.js 14와 FastAPI로 구축된 고성능 실시간 트레이딩 대시보드입니다.

## 기술 스택

- **프론트엔드:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, lucide-react, zustand, lightweight-charts
- **백엔드:** Python FastAPI (비동기), websockets, Redis, PostgreSQL
- **인프라:** Docker Compose

## 프로젝트 구조

```
market-insight-agent/
├── backend/          # FastAPI 백엔드
│   ├── app/         # 애플리케이션 코드
│   ├── docker-compose.yml
│   └── requirements.txt
└── frontend/        # Next.js 프론트엔드
    ├── app/         # App Router 페이지
    ├── components/  # React 컴포넌트
    └── lib/         # 유틸리티
```

## 시작하기

### 사전 요구사항

- Node.js 18+ 및 npm
- Python 3.11+
- Docker 및 Docker Compose

### 백엔드 설정

1. 백엔드 디렉토리로 이동:
```bash
cd backend
```

2. 가상 환경 생성:
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

3. 의존성 설치:
```bash
pip install -r requirements.txt
```

4. `.env.example`을 `.env`로 복사하고 설정:
```bash
cp env.example .env
```

5. 인프라 서비스 시작 (Redis & PostgreSQL):
```bash
docker-compose up -d
```

6. FastAPI 서버 실행:
```bash
python main.py
```

API는 `http://localhost:8000`에서 사용 가능합니다.

### 프론트엔드 설정

1. 프론트엔드 디렉토리로 이동:
```bash
cd frontend
```

2. 의존성 설치 (이미 완료됨):
```bash
npm install
```

3. 개발 서버 실행:
```bash
npm run dev
```

프론트엔드는 `http://localhost:3000`에서 사용 가능합니다.

## 개발

### 백엔드 헬스 체크

```bash
curl http://localhost:8000/health
```

### Docker 서비스

- **Redis:** `localhost:6379`
- **PostgreSQL:** `localhost:5432`

## 라이선스

MIT

