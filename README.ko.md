# QuantBoard V1

> 고성능 실시간 암호화폐 트레이딩 대시보드

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-blue)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

**[English Documentation](./README.md)** | **[개발 문서](./docs/)**

---

## 개요

QuantBoard V1은 Binance의 실시간 암호화폐 시장 데이터와 여러 소스의 암호화폐 뉴스를 통합하는 전문가급 실시간 트레이딩 대시보드입니다. 최신 비동기 아키텍처로 구축되어 WebSocket을 통한 실시간 가격 스트리밍과 REST API를 통한 과거 데이터를 제공합니다.

### 주요 기능

- **실시간 가격 스트리밍**: Redis Pub/Sub 기반 WebSocket 실시간 가격 업데이트
- **고급 트레이딩 차트**: 14개 이상의 기술적 지표 (MA, RSI, MACD, Ichimoku, Bollinger Bands 등)
- **과거 시장 데이터**: 유연한 시간 간격의 Binance 캔들 데이터 (OHLC)
- **암호화폐 뉴스**: 주요 암호화폐 뉴스 소스에서 자동 수집 및 번역
- **커뮤니티 플랫폼**: 게시글 작성, 댓글 (대댓글 지원), 좋아요, 사용자 프로필
- **사용자 인증**: JWT 기반 인증 및 OAuth 지원 (Google, GitHub)
- **고성능**: 비동기 Python 백엔드 + React 19 프론트엔드
- **유연한 배포**: Redis 선택적 사용 - 실시간 스트리밍 유무와 관계없이 작동
- **다크 테마 지원**: 편안한 트레이딩을 위한 내장 다크 모드

---

## 목차

- [기술 스택](#기술-스택)
- [아키텍처](#아키텍처)
- [빠른 시작](#빠른-시작)
- [API 문서](#api-문서)
- [프로젝트 구조](#프로젝트-구조)
- [환경 설정](#환경-설정)
- [개발](#개발)
- [배포](#배포)
- [기여하기](#기여하기)
- [라이선스](#라이선스)

---

## 기술 스택

### 프론트엔드
- **프레임워크**: Next.js 16 (App Router), React 19
- **언어**: TypeScript 5
- **스타일링**: Tailwind CSS 4, shadcn/ui
- **차트**: lightweight-charts
- **상태 관리**: Zustand (Redux 사용 금지)
- **아이콘**: lucide-react
- **애니메이션**: framer-motion

### 백엔드
- **프레임워크**: FastAPI (비동기)
- **언어**: Python 3.11+
- **WebSocket**: websockets, FastAPI WebSocket 지원
- **데이터베이스**: PostgreSQL + SQLAlchemy (AsyncSession)
- **캐싱**: Redis (선택 사항)
- **HTTP 클라이언트**: httpx, aiohttp
- **뉴스 처리**: feedparser, beautifulsoup4, deep-translator

### 인프라
- **컨테이너화**: Docker Compose
- **데이터베이스**: PostgreSQL 15+
- **캐시**: Redis 7+ (선택 사항)
- **웹 서버**: Uvicorn (ASGI)

---

## 아키텍처

### 시스템 개요

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         클라이언트 브라우저                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                        │
│  │   차트     │  │ 대시보드   │  │  뉴스피드  │                        │
│  └────────────┘  └────────────┘  └────────────┘                        │
└───────────────┬─────────────────────────────┬───────────────────────────┘
                │ WebSocket (/ws/prices)      │ REST API
                │                             │ (/api/*)
┌───────────────▼─────────────────────────────▼───────────────────────────┐
│                      FastAPI 백엔드                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │ WebSocket    │  │ Candles API  │  │   News API   │                 │
│  │  Handler     │  │   (REST)     │  │   (REST)     │                 │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                 │
│         │                 │                  │                          │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐                 │
│  │ConnectionMgr │  │Binance REST  │  │ PostgreSQL   │                 │
│  │(broadcast)   │  │   Client     │  │   (News DB)  │                 │
│  └──────┬───────┘  └──────────────┘  └──────────────┘                 │
│         │                                                                │
│  ┌──────▼───────┐                                                       │
│  │ Redis Pub/Sub│◄──────────────────────┐                              │
│  └──────────────┘                       │                              │
└─────────────────────────────────────────┼──────────────────────────────┘
                                          │
┌─────────────────────────────────────────▼──────────────────────────────┐
│                    백그라운드 서비스                                     │
│  ┌────────────────────────┐  ┌────────────────────────┐               │
│  │  Binance Ingestor      │  │   News Collector       │               │
│  │  (WebSocket Stream)    │  │   (RSS Feeds)          │               │
│  │  BTCUSDT, ETHUSDT, ... │  │   CoinDesk, Cointele.. │               │
│  └────────┬───────────────┘  └────────┬───────────────┘               │
│           │ Publish              │ Store                               │
│           └──────────────────────┘                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 데이터 흐름

#### 1. 실시간 가격 스트림 (Redis 필요)
```
Binance WebSocket → BinanceIngestor → Redis Pub/Sub (live_prices)
  → ConnectionManager → WebSocket 클라이언트 → Zustand Store → UI 업데이트
```

#### 2. 과거 캔들 데이터 (REST)
```
클라이언트 요청 → FastAPI (/api/candles) → Binance REST API
  → 데이터 정규화 → JSON 응답 → 차트 렌더링
```

#### 3. 뉴스 수집 및 전달
```
RSS Feeds → NewsCollector → PostgreSQL (News 테이블)
클라이언트 요청 → FastAPI (/api/news) → PostgreSQL 조회 → JSON 응답
```

**상세 아키텍처는 [docs/architecture/SYSTEM_DESIGN.md](./docs/architecture/SYSTEM_DESIGN.md)를 참조하세요.**

---

## 빠른 시작

### 사전 요구사항

- **Node.js** 18+ 및 npm
- **Python** 3.11+
- **Docker** 및 Docker Compose
- **Git**

### 1. 저장소 클론

```bash
git clone <repository-url>
cd market-insight-agent
```

### 2. 백엔드 설정

```bash
cd backend

# 가상 환경 생성
python -m venv venv

# 가상 환경 활성화
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 환경 파일 복사 및 설정
cp env.example .env
# .env 파일을 편집하여 설정 조정

# 인프라 시작 (Redis & PostgreSQL)
docker-compose up -d

# 데이터베이스 마이그레이션 (시작 시 자동)
# 테이블은 자동으로 생성됩니다

# 백엔드 서버 실행
python main.py
```

백엔드는 `http://localhost:8000`에서 접근 가능합니다.

**헬스 체크:**
```bash
curl http://localhost:8000/health
```

**API 문서 (Swagger UI):**
```
http://localhost:8000/docs
```

### 3. 프론트엔드 설정

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

프론트엔드는 `http://localhost:3000`에서 접근 가능합니다.

### 4. 실시간 기능 활성화 (선택 사항)

기본적으로 Redis는 비활성화되어 있습니다. 실시간 가격 스트리밍을 활성화하려면:

```bash
# backend/.env 파일에서
REDIS_ENABLED=true

# 백엔드 재시작
cd backend
python main.py
```

---

## API 문서

### REST 엔드포인트

#### 헬스 체크
```http
GET /health
```

**응답:**
```json
{
  "status": "healthy",
  "service": "QuantBoard API"
}
```

#### 캔들 데이터 조회
```http
GET /api/candles?symbol=BTCUSDT&interval=1m&limit=500
```

**매개변수:**
- `symbol` (문자열): 거래 쌍 (예: BTCUSDT, ETHUSDT)
- `interval` (문자열): 시간 간격 (1m, 5m, 15m, 1h, 4h, 1d 등)
- `limit` (정수): 캔들 수 (1-1000, 기본값: 500)
- `end_time` (정수, 선택): 종료 시간 (Unix 밀리초)

**응답:**
```json
{
  "symbol": "BTCUSDT",
  "interval": "1m",
  "candles": [
    {
      "time": 1704067200,
      "open": 42500.50,
      "high": 42550.00,
      "low": 42480.00,
      "close": 42520.30,
      "volume": 125.45
    }
  ]
}
```

#### 뉴스 목록 조회
```http
GET /api/news?skip=0&limit=20&source=CoinDesk
```

**매개변수:**
- `skip` (정수): 건너뛸 항목 수 (페이지네이션)
- `limit` (정수): 반환할 항목 수 (1-100)
- `source` (문자열, 선택): 뉴스 소스별 필터링

**응답:**
```json
{
  "total": 150,
  "items": [
    {
      "id": 1,
      "title": "Bitcoin Reaches New All-Time High",
      "title_kr": "비트코인, 사상 최고치 경신",
      "link": "https://...",
      "published": "2024-01-15T10:30:00Z",
      "source": "CoinDesk",
      "description": "...",
      "created_at": "2024-01-15T10:35:00Z"
    }
  ]
}
```

#### 뉴스 소스 목록
```http
GET /api/news/sources
```

**응답:**
```json
["CoinDesk", "CoinTelegraph", "Bitcoin.com"]
```

#### 뉴스 상세 조회
```http
GET /api/news/{news_id}
```

### 인증 API

#### 회원가입
```http
POST /api/auth/register
```

**요청 본문:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "display_name": "사용자 이름"
}
```

#### 로그인
```http
POST /api/auth/login
```

**요청 본문:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**응답:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": { ... }
}
```

### 커뮤니티 API

#### 게시글 목록 조회
```http
GET /api/posts?skip=0&limit=20&category=tech&sort=latest
```

**매개변수:**
- `skip` (정수): 건너뛸 항목 수
- `limit` (정수): 반환할 항목 수 (1-100)
- `category` (문자열, 선택): 카테고리 필터
- `tag` (문자열, 선택): 태그 필터
- `sort` (문자열): 정렬 방식 (latest, trending, top)
- `search` (문자열, 선택): 제목/내용 검색

#### 게시글 작성 (인증 필요)
```http
POST /api/posts
Authorization: Bearer <access_token>
```

**요청 본문:**
```json
{
  "title": "게시글 제목",
  "content": "# Markdown 내용",
  "category": "기술",
  "tags": ["비트코인", "분석"]
}
```

#### 댓글 목록 조회
```http
GET /api/posts/{post_id}/comments
```

#### 댓글 작성 (인증 필요)
```http
POST /api/posts/{post_id}/comments
Authorization: Bearer <access_token>
```

**요청 본문:**
```json
{
  "content": "댓글 내용",
  "parent_id": null
}
```

### WebSocket 엔드포인트

#### 실시간 가격
```
WS /ws/prices
```

**연결:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/prices');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
  // {
  //   "symbol": "BTCUSDT",
  //   "price": 42520.30,
  //   "timestamp": 1704067200000,
  //   "volume": 1.25
  // }
};
```

**참고:** 백엔드 설정에서 `REDIS_ENABLED=true` 필요

**전체 API 레퍼런스:**
- [docs/api/README.md](./docs/api/README.md) - 기본 API 문서
- [docs/api/BACKEND_API.md](./docs/api/BACKEND_API.md) - 전체 API 레퍼런스 (인증, 커뮤니티, 소스)

---

## 프로젝트 구조

```
market-insight-agent/
├── backend/                    # FastAPI 백엔드
│   ├── app/
│   │   ├── core/              # 핵심 설정
│   │   │   ├── config.py      # Pydantic Settings
│   │   │   ├── database.py    # SQLAlchemy AsyncEngine
│   │   │   └── redis.py       # Redis 클라이언트 싱글톤
│   │   ├── models/            # 데이터베이스 모델
│   │   │   └── news.py        # News SQLAlchemy 모델
│   │   ├── routers/           # API 라우트
│   │   │   ├── ws.py          # WebSocket (/ws/prices)
│   │   │   ├── candles.py     # Candles REST API
│   │   │   └── news.py        # News REST API
│   │   └── services/          # 백그라운드 서비스
│   │       ├── ingestor.py    # Binance WebSocket 수집기
│   │       └── news_collector.py  # 뉴스 RSS 수집기
│   ├── main.py                # FastAPI 애플리케이션 진입점
│   ├── requirements.txt       # Python 의존성
│   ├── docker-compose.yml     # 인프라 서비스
│   └── env.example            # 환경 변수 템플릿
│
├── frontend/                  # Next.js 프론트엔드
│   ├── app/                   # Next.js App Router
│   │   ├── page.tsx           # 홈페이지
│   │   ├── dashboard/         # 대시보드 페이지
│   │   └── news/              # 뉴스 페이지
│   ├── components/            # React 컴포넌트
│   │   ├── Chart/             # 트레이딩 차트 (14개+ 지표)
│   │   ├── Dashboard/         # 대시보드 컴포넌트
│   │   ├── Layout/            # 레이아웃 컴포넌트
│   │   ├── Navigation/        # 내비게이션 컴포넌트
│   │   ├── Auth/              # 인증 (로그인, 회원가입)
│   │   ├── Community/         # 게시글, 댓글
│   │   ├── Theme/             # 다크/라이트 테마
│   │   └── ui/                # shadcn/ui 컴포넌트
│   ├── hooks/                 # 커스텀 React 훅
│   │   └── useWebSocket.ts    # WebSocket 훅 (재연결 기능)
│   ├── store/                 # Zustand 스토어
│   │   ├── usePriceStore.ts   # 실시간 가격 상태
│   │   ├── useChartStore.ts   # 차트 설정 (14개+ 지표)
│   │   ├── useAuthStore.ts    # 인증 상태
│   │   └── useCommunityStore.ts # 게시글/댓글 상태
│   ├── lib/                   # 유틸리티
│   └── package.json           # Node 의존성
│
├── docs/                      # 문서
│   ├── api/                   # API 문서
│   │   ├── README.md          # 기본 API 문서
│   │   └── BACKEND_API.md     # 전체 API 레퍼런스
│   ├── frontend/              # 프론트엔드 문서
│   │   ├── COMPONENTS.md      # React 컴포넌트
│   │   ├── HOOKS.md           # 커스텀 훅
│   │   └── STORES.md          # Zustand 스토어
│   ├── architecture/          # 아키텍처 문서
│   └── guides/                # 개발 가이드
│
├── README.md                  # 영문 문서
├── README.ko.md               # 한국어 문서 (이 파일)
└── CLAUDE.md                  # AI 어시스턴트 컨텍스트
```

---

## 환경 설정

### 백엔드 환경 변수

`backend/.env` 파일을 `backend/env.example`에서 생성:

```bash
# 데이터베이스 설정
POSTGRES_USER=quantboard
POSTGRES_PASSWORD=quantboard_dev
POSTGRES_DB=quantboard
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis 설정
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_ENABLED=false              # 실시간 스트리밍 활성화하려면 'true'로 설정

# API 설정
API_HOST=0.0.0.0
API_PORT=8000

# 환경
ENVIRONMENT=development          # development | production

# JWT 설정
JWT_SECRET_KEY=your-secret-key   # 미설정 시 자동 생성
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# OAuth 설정 (선택 사항)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### 프론트엔드 환경 변수

`frontend/.env.local` 생성 (선택 사항):

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

## 개발

### 백엔드 개발

#### Redis 사용 모드로 실행 (실시간)
```bash
cd backend
REDIS_ENABLED=true python main.py
```

#### Redis 미사용 모드로 실행 (뉴스 + 캔들만)
```bash
cd backend
python main.py
```

#### API 문서 접근
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

#### 데이터베이스 관리
```bash
# PostgreSQL 로그 확인
docker-compose logs -f postgres

# PostgreSQL 접속
docker exec -it <container_name> psql -U quantboard -d quantboard

# 테이블 확인
\dt

# 뉴스 데이터 확인
SELECT * FROM news ORDER BY published DESC LIMIT 10;
```

#### Redis 관리
```bash
# Redis 로그 확인
docker-compose logs -f redis

# Redis CLI 접속
docker exec -it <container_name> redis-cli

# 발행된 메시지 모니터링
SUBSCRIBE live_prices
```

### 프론트엔드 개발

#### 개발 서버
```bash
cd frontend
npm run dev
```

#### 프로덕션 빌드
```bash
npm run build
npm run start
```

#### 코드 린팅
```bash
npm run lint
```

#### 주요 개발 패턴

**상태 관리 (Zustand):**
```typescript
// 선택적 구독
const currentPrice = usePriceStore((state) => state.currentPrice);

// 여러 값
const { currentPrice, priceHistory } = usePriceStore();
```

**WebSocket 훅:**
```typescript
// 지수 백오프 자동 재연결
useWebSocket('ws://localhost:8000/ws/prices', {
  onMessage: (data) => console.log(data),
  reconnectInterval: 1000,
  maxReconnectInterval: 30000,
});
```

---

## 배포

### 프로덕션 체크리스트

- [ ] backend/.env에서 `ENVIRONMENT=production` 설정
- [ ] backend/app/core/config.py에서 CORS origins 설정
- [ ] WebSocket 연결을 위한 SSL 활성화 (wss://)
- [ ] 강력한 데이터베이스 비밀번호 설정
- [ ] Redis 지속성 설정 (실시간 모드 사용 시)
- [ ] 리버스 프록시 설정 (Nginx/Caddy)
- [ ] SSL 인증서로 HTTPS 활성화
- [ ] 적절한 로깅 및 모니터링 설정
- [ ] 데이터베이스 백업 설정
- [ ] 속도 제한 설정 검토

### Docker 배포

```bash
# Docker Compose로 빌드 및 실행
docker-compose up -d --build

# 로그 확인
docker-compose logs -f

# 서비스 중지
docker-compose down
```

**상세 배포 가이드는 [docs/guides/DEPLOYMENT.md](./docs/guides/DEPLOYMENT.md)를 참조하세요.**

---

## 기여하기

기여를 환영합니다! 자세한 내용은 [CONTRIBUTING.md](./CONTRIBUTING.md)를 참조하세요.

### 개발 워크플로우

1. 저장소 포크
2. 기능 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경 사항 작성
4. 테스트 및 린팅 실행
5. 변경 사항 커밋 (`git commit -m 'feat: 놀라운 기능 추가'`)
6. 브랜치에 푸시 (`git push origin feature/amazing-feature`)
7. Pull Request 열기

### 코드 표준

- **TypeScript**: Strict 모드 활성화, `any` 타입 금지
- **Python**: 타입 힌트 필수, PEP 8 준수
- **상태 관리**: Zustand 사용 (Redux 사용 금지)
- **서버 컴포넌트**: Next.js 서버 컴포넌트 우선, 'use client' 최소화
- **Mock 데이터 금지**: 항상 실제 Binance API 연동 사용

---

## 라이선스

이 프로젝트는 MIT 라이선스 하에 라이선스가 부여됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

## 문제 해결

### 백엔드 문제

**Redis 연결 오류:**
```bash
# Redis 실행 여부 확인
docker-compose ps

# Redis 재시작
docker-compose restart redis

# 또는 Redis 없이 실행
REDIS_ENABLED=false python main.py
```

**데이터베이스 연결 오류:**
```bash
# PostgreSQL 상태 확인
docker-compose ps

# PostgreSQL 로그 확인
docker-compose logs postgres

# 데이터베이스 재설정
docker-compose down -v
docker-compose up -d
```

### 프론트엔드 문제

**WebSocket 연결 실패:**
- 백엔드가 http://localhost:8000에서 실행 중인지 확인
- 실시간 기능 사용 시 REDIS_ENABLED=true 확인
- 방화벽이 WebSocket 연결을 차단하지 않는지 확인

**차트가 렌더링되지 않음:**
- 브라우저 콘솔에서 오류 확인
- candles API가 데이터를 반환하는지 확인: http://localhost:8000/api/candles?symbol=BTCUSDT&interval=1m&limit=100

---

## 지원 및 문의

- **문서**: [docs/](./docs/)
- **이슈**: [GitHub Issues](https://github.com/your-repo/issues)
- **토론**: [GitHub Discussions](https://github.com/your-repo/discussions)

---

**암호화폐 트레이딩 커뮤니티를 위해 ❤️로 제작되었습니다**
