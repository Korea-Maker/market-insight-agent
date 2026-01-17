# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**QuantBoard V1** - 고성능 실시간 트레이딩 대시보드. Binance 실시간 거래 데이터와 암호화폐 뉴스를 수집하여 WebSocket/REST API를 통해 클라이언트에 전달하는 시스템.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, lucide-react
- **Charting:** lightweight-charts
- **State Management:** Zustand (Redux 사용 금지)
- **Backend:** Python FastAPI (Async), websockets, SQLAlchemy (async)
- **Database:** PostgreSQL (AsyncSession)
- **Infrastructure:** Docker Compose (Redis, Postgres)
- **Communication:** WebSocket (실시간 가격) + REST API (캔들/뉴스)

## Commands

### Backend

```bash
# 인프라 실행 (Redis, Postgres)
cd backend && docker-compose up -d

# 백엔드 서버 실행
cd backend && python main.py

# 의존성 설치
cd backend && pip install -r requirements.txt

# Redis 포함 실행 (실시간 가격 스트리밍)
REDIS_ENABLED=true python main.py
```

### Frontend

```bash
cd frontend && npm run dev      # 개발 서버 (http://localhost:3000)
cd frontend && npm run build    # 프로덕션 빌드
cd frontend && npm run lint     # ESLint 실행
```

## Architecture

### Backend 구조
```
backend/
├── main.py                     # FastAPI 진입점, lifespan으로 백그라운드 태스크 관리
├── app/
│   ├── core/
│   │   ├── config.py           # Pydantic Settings (환경변수)
│   │   ├── database.py         # SQLAlchemy AsyncEngine, init_db/close_db
│   │   └── redis.py            # Redis 클라이언트 싱글톤
│   ├── models/
│   │   └── news.py             # SQLAlchemy News 모델
│   ├── routers/
│   │   ├── ws.py               # WebSocket 실시간 가격 (/ws/prices)
│   │   ├── candles.py          # REST 캔들 데이터 (/api/candles)
│   │   └── news.py             # REST 뉴스 API (/api/news)
│   └── services/
│       ├── ingestor.py         # Binance WebSocket 실시간 수집기
│       └── news_collector.py   # 뉴스 RSS 수집기 (백그라운드)
```

### Frontend 구조
```
frontend/
├── app/                        # Next.js App Router
│   ├── page.tsx                # 메인 페이지
│   ├── dashboard/page.tsx      # 대시보드
│   ├── news/page.tsx           # 뉴스 목록
│   └── news/[id]/page.tsx      # 뉴스 상세
├── components/
│   ├── Chart/CryptoChart.tsx   # lightweight-charts 차트
│   ├── Dashboard/              # 대시보드 컴포넌트
│   ├── Layout/MainLayout.tsx   # 메인 레이아웃
│   └── Navigation/             # 네비게이션
├── hooks/
│   └── useWebSocket.ts         # WebSocket 훅 (지수 백오프 재연결)
└── store/
    └── usePriceStore.ts        # Zustand 가격 상태
```

## API Endpoints

- `GET /health` - 헬스 체크
- `GET /api/candles?symbol=BTCUSDT&interval=1m&limit=500` - Binance 캔들 데이터
- `GET /api/news?skip=0&limit=20&source=CoinDesk` - 뉴스 목록
- `GET /api/news/{id}` - 뉴스 상세
- `GET /api/news/sources` - 뉴스 소스 목록
- `WS /ws/prices` - 실시간 가격 스트림 (Redis 필요)

## Data Flow

**실시간 가격 (Redis 필요):**
1. Binance WebSocket → `BinanceIngestor` → Redis Pub/Sub (`live_prices`)
2. `ConnectionManager` ← Redis 구독 → WebSocket 브로드캐스트
3. `useWebSocket` 훅 → `usePriceStore` 업데이트

**뉴스 수집 (DB만 필요):**
1. RSS Feeds → `news_collector` → PostgreSQL (News 테이블)
2. REST API → 프론트엔드 조회

## Key Patterns

### Backend
- `REDIS_ENABLED=false`(기본값)로 Redis 없이 실행 가능 (뉴스/캔들 API만 동작)
- FastAPI lifespan으로 백그라운드 태스크 시작/종료 관리
- SQLAlchemy AsyncSession + Depends(get_db) 패턴

### Frontend
- Zustand 선택적 구독: `usePriceStore((state) => state.currentPrice)`
- useWebSocket 지수 백오프 재연결 (1s→2s→4s... max 30s)
- 가격 히스토리 1000개 제한

## Environment Variables

Backend (`backend/.env`):
```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_ENABLED=false           # true로 설정 시 실시간 가격 활성화
POSTGRES_USER=quantboard
POSTGRES_PASSWORD=quantboard_dev
POSTGRES_DB=quantboard
```

## Development Rules

- 단계별 개발 진행 (현재 Phase에만 집중)
- Mock 데이터 사용 금지 - 실제 Binance API 연결
- TypeScript strict 모드, Pydantic 모델 필수
- URL 상태 관리 시 `nuqs` 사용
- `use client` 최소화 (Next.js 서버 컴포넌트 우선)
