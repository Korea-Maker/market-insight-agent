# QuantBoard V1

> 고성능 실시간 암호화폐 트레이딩 대시보드
>
> High-Performance Real-Time Cryptocurrency Trading Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-blue)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

**[한국어 문서](./README.ko.md)** | **[Documentation](./docs/)**

---

## Overview

QuantBoard V1 is a professional-grade real-time trading dashboard that aggregates live cryptocurrency market data from Binance and cryptocurrency news from multiple sources. Built with modern asynchronous architecture, it delivers real-time price streams via WebSocket and historical data through REST APIs.

### Key Features

- **Real-Time Price Streaming**: WebSocket-based live price updates with Redis Pub/Sub
- **Advanced Trading Charts**: 14+ technical indicators (MA, RSI, MACD, Ichimoku, Bollinger Bands, etc.)
- **Historical Market Data**: Binance candle data (OHLC) with flexible intervals
- **Cryptocurrency News**: Automated collection and translation from major crypto news sources
- **Community Platform**: Post creation, comments (nested replies), likes, and user profiles
- **User Authentication**: JWT-based auth with OAuth support (Google, GitHub)
- **High Performance**: Async Python backend + React 19 frontend with optimistic updates
- **Flexible Deployment**: Optional Redis mode - works with or without real-time streaming
- **Dark Theme Support**: Built-in dark mode for comfortable trading

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Environment Configuration](#environment-configuration)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router), React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4, shadcn/ui
- **Charting**: lightweight-charts
- **State Management**: Zustand (Redux-free)
- **Icons**: lucide-react
- **Animation**: framer-motion

### Backend
- **Framework**: FastAPI (Async)
- **Language**: Python 3.11+
- **WebSocket**: websockets, FastAPI WebSocket support
- **Database**: PostgreSQL with SQLAlchemy (AsyncSession)
- **Caching**: Redis (optional)
- **HTTP Client**: httpx, aiohttp
- **News Processing**: feedparser, beautifulsoup4, deep-translator

### Infrastructure
- **Containerization**: Docker Compose
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+ (optional)
- **Web Server**: Uvicorn (ASGI)

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │   Chart    │  │ Dashboard  │  │    News    │                │
│  └────────────┘  └────────────┘  └────────────┘                │
└───────────────┬─────────────────────────────┬───────────────────┘
                │ WebSocket (/ws/prices)      │ REST API
                │                             │ (/api/*)
┌───────────────▼─────────────────────────────▼───────────────────┐
│                      FastAPI Backend                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ WebSocket    │  │ Candles API  │  │   News API   │         │
│  │  Handler     │  │   (REST)     │  │   (REST)     │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                  │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐         │
│  │ConnectionMgr │  │Binance REST  │  │ PostgreSQL   │         │
│  │(broadcast)   │  │   Client     │  │   (News DB)  │         │
│  └──────┬───────┘  └──────────────┘  └──────────────┘         │
│         │                                                        │
│  ┌──────▼───────┐                                               │
│  │ Redis Pub/Sub│◄──────────────────────┐                      │
│  └──────────────┘                       │                      │
└─────────────────────────────────────────┼──────────────────────┘
                                          │
┌─────────────────────────────────────────▼──────────────────────┐
│                    Background Services                          │
│  ┌────────────────────────┐  ┌────────────────────────┐        │
│  │  Binance Ingestor      │  │   News Collector       │        │
│  │  (WebSocket Stream)    │  │   (RSS Feeds)          │        │
│  │  BTCUSDT, ETHUSDT, ... │  │   CoinDesk, Cointele.. │        │
│  └────────┬───────────────┘  └────────┬───────────────┘        │
│           │ Publish              │ Store                       │
│           └──────────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

#### 1. Real-Time Price Stream (Redis Required)
```
Binance WebSocket → BinanceIngestor → Redis Pub/Sub (live_prices)
  → ConnectionManager → WebSocket Clients → Zustand Store → UI Update
```

#### 2. Historical Candles (REST)
```
Client Request → FastAPI (/api/candles) → Binance REST API
  → Data Normalization → JSON Response → Chart Rendering
```

#### 3. News Collection & Delivery
```
RSS Feeds → NewsCollector → PostgreSQL (News Table)
Client Request → FastAPI (/api/news) → PostgreSQL Query → JSON Response
```

**For detailed architecture, see [docs/architecture/SYSTEM_DESIGN.md](./docs/architecture/SYSTEM_DESIGN.md)**

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **Docker** and Docker Compose
- **Git**

### 1. Clone the Repository

```bash
git clone <repository-url>
cd market-insight-agent
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file and configure
cp env.example .env
# Edit .env file with your settings

# Start infrastructure (Redis & PostgreSQL)
docker-compose up -d

# Run database migrations (automatic on startup)
# Tables will be created automatically

# Start the backend server
python main.py
```

Backend will be available at `http://localhost:8000`

**Health Check:**
```bash
curl http://localhost:8000/health
```

**API Documentation (Swagger UI):**
```
http://localhost:8000/docs
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

### 4. Enable Real-Time Features (Optional)

By default, Redis is disabled. To enable real-time price streaming:

```bash
# In backend/.env
REDIS_ENABLED=true

# Restart backend
cd backend
python main.py
```

---

## API Documentation

### REST Endpoints

#### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "QuantBoard API"
}
```

#### Get Candle Data
```http
GET /api/candles?symbol=BTCUSDT&interval=1m&limit=500
```

**Parameters:**
- `symbol` (string): Trading pair (e.g., BTCUSDT, ETHUSDT)
- `interval` (string): Time interval (1m, 5m, 15m, 1h, 4h, 1d, etc.)
- `limit` (integer): Number of candles (1-1000, default: 500)
- `end_time` (integer, optional): End time in Unix milliseconds

**Response:**
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

#### Get News List
```http
GET /api/news?skip=0&limit=20&source=CoinDesk
```

**Parameters:**
- `skip` (integer): Number of items to skip (pagination)
- `limit` (integer): Number of items to return (1-100)
- `source` (string, optional): Filter by news source

**Response:**
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

#### Get News Sources
```http
GET /api/news/sources
```

**Response:**
```json
["CoinDesk", "CoinTelegraph", "Bitcoin.com"]
```

#### Get News by ID
```http
GET /api/news/{news_id}
```

### Authentication API

#### Register
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "display_name": "User Name"
}
```

#### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": { ... }
}
```

### Community API

#### Get Posts
```http
GET /api/posts?skip=0&limit=20&category=tech&sort=latest
```

**Parameters:**
- `skip` (integer): Number of items to skip
- `limit` (integer): Number of items to return (1-100)
- `category` (string, optional): Filter by category
- `tag` (string, optional): Filter by tag
- `sort` (string): Sort by (latest, trending, top)
- `search` (string, optional): Search in title/content

#### Create Post (Auth Required)
```http
POST /api/posts
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "title": "Post Title",
  "content": "# Markdown content",
  "category": "tech",
  "tags": ["bitcoin", "analysis"]
}
```

#### Get Comments
```http
GET /api/posts/{post_id}/comments
```

#### Create Comment (Auth Required)
```http
POST /api/posts/{post_id}/comments
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "content": "Comment content",
  "parent_id": null
}
```

### WebSocket Endpoints

#### Real-Time Prices
```
WS /ws/prices
```

**Connection:**
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

**Note:** Requires `REDIS_ENABLED=true` in backend configuration.

**For complete API reference, see:**
- [docs/api/README.md](./docs/api/README.md) - Basic API documentation
- [docs/api/BACKEND_API.md](./docs/api/BACKEND_API.md) - Full API reference (Auth, Community, Sources)

---

## Project Structure

```
market-insight-agent/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── core/              # Core configurations
│   │   │   ├── config.py      # Pydantic Settings
│   │   │   ├── database.py    # SQLAlchemy AsyncEngine
│   │   │   └── redis.py       # Redis client singleton
│   │   ├── models/            # Database models
│   │   │   └── news.py        # News SQLAlchemy model
│   │   ├── routers/           # API routes
│   │   │   ├── ws.py          # WebSocket (/ws/prices)
│   │   │   ├── candles.py     # Candles REST API
│   │   │   └── news.py        # News REST API
│   │   └── services/          # Background services
│   │       ├── ingestor.py    # Binance WebSocket ingestor
│   │       └── news_collector.py  # News RSS collector
│   ├── main.py                # FastAPI application entry
│   ├── requirements.txt       # Python dependencies
│   ├── docker-compose.yml     # Infrastructure services
│   └── env.example            # Environment template
│
├── frontend/                  # Next.js Frontend
│   ├── app/                   # Next.js App Router
│   │   ├── page.tsx           # Homepage
│   │   ├── dashboard/         # Dashboard pages
│   │   └── news/              # News pages
│   ├── components/            # React components
│   │   ├── Chart/             # Trading chart (14+ indicators)
│   │   ├── Dashboard/         # Dashboard components
│   │   ├── Layout/            # Layout components
│   │   ├── Navigation/        # Navigation components
│   │   ├── Auth/              # Authentication (login, register)
│   │   ├── Community/         # Posts, comments
│   │   ├── Theme/             # Dark/light theme
│   │   └── ui/                # shadcn/ui components
│   ├── hooks/                 # Custom React hooks
│   │   └── useWebSocket.ts    # WebSocket hook with reconnection
│   ├── store/                 # Zustand stores
│   │   ├── usePriceStore.ts   # Real-time price state
│   │   ├── useChartStore.ts   # Chart settings (14+ indicators)
│   │   ├── useAuthStore.ts    # Authentication state
│   │   └── useCommunityStore.ts # Posts & comments state
│   ├── lib/                   # Utilities
│   └── package.json           # Node dependencies
│
├── docs/                      # Documentation
│   ├── api/                   # API documentation
│   │   ├── README.md          # Basic API docs
│   │   └── BACKEND_API.md     # Full API reference
│   ├── frontend/              # Frontend documentation
│   │   ├── COMPONENTS.md      # React components
│   │   ├── HOOKS.md           # Custom hooks
│   │   └── STORES.md          # Zustand stores
│   ├── architecture/          # Architecture docs
│   └── guides/                # Developer guides
│
├── README.md                  # This file
├── README.ko.md               # Korean documentation
└── CLAUDE.md                  # AI assistant context
```

---

## Environment Configuration

### Backend Environment Variables

Create `backend/.env` from `backend/env.example`:

```bash
# Database Configuration
POSTGRES_USER=quantboard
POSTGRES_PASSWORD=quantboard_dev
POSTGRES_DB=quantboard
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_ENABLED=false              # Set to 'true' to enable real-time streaming

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Environment
ENVIRONMENT=development          # development | production

# JWT Configuration
JWT_SECRET_KEY=your-secret-key   # Auto-generated if not set
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# OAuth Configuration (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### Frontend Environment Variables

Create `frontend/.env.local` (optional):

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

## Development

### Backend Development

#### Run with Redis (Real-time mode)
```bash
cd backend
REDIS_ENABLED=true python main.py
```

#### Run without Redis (News + Candles only)
```bash
cd backend
python main.py
```

#### Access API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

#### Database Management
```bash
# View PostgreSQL logs
docker-compose logs -f postgres

# Connect to PostgreSQL
docker exec -it <container_name> psql -U quantboard -d quantboard

# View tables
\dt

# View news data
SELECT * FROM news ORDER BY published DESC LIMIT 10;
```

#### Redis Management
```bash
# View Redis logs
docker-compose logs -f redis

# Connect to Redis CLI
docker exec -it <container_name> redis-cli

# Monitor published messages
SUBSCRIBE live_prices
```

### Frontend Development

#### Development Server
```bash
cd frontend
npm run dev
```

#### Build for Production
```bash
npm run build
npm run start
```

#### Lint Code
```bash
npm run lint
```

#### Key Development Patterns

**State Management (Zustand):**
```typescript
// Selective subscription
const currentPrice = usePriceStore((state) => state.currentPrice);

// Multiple values
const { currentPrice, priceHistory } = usePriceStore();
```

**WebSocket Hook:**
```typescript
// Auto-reconnect with exponential backoff
useWebSocket('ws://localhost:8000/ws/prices', {
  onMessage: (data) => console.log(data),
  reconnectInterval: 1000,
  maxReconnectInterval: 30000,
});
```

---

## Deployment

### Production Checklist

- [ ] Set `ENVIRONMENT=production` in backend/.env
- [ ] Configure CORS origins in backend/app/core/config.py
- [ ] Enable SSL for WebSocket connections (wss://)
- [ ] Set strong database passwords
- [ ] Configure Redis persistence (if using real-time mode)
- [ ] Set up reverse proxy (Nginx/Caddy)
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure proper logging and monitoring
- [ ] Set up database backups
- [ ] Review rate limiting settings

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**For detailed deployment guide, see [docs/guides/DEPLOYMENT.md](./docs/guides/DEPLOYMENT.md)**

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards

- **TypeScript**: Strict mode enabled, no `any` types
- **Python**: Type hints required, follow PEP 8
- **State Management**: Use Zustand (Redux prohibited)
- **Server Components**: Prefer Next.js server components, minimize 'use client'
- **No Mock Data**: Always use real Binance API integration

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Troubleshooting

### Backend Issues

**Redis Connection Error:**
```bash
# Check if Redis is running
docker-compose ps

# Restart Redis
docker-compose restart redis

# Or run without Redis
REDIS_ENABLED=false python main.py
```

**Database Connection Error:**
```bash
# Check PostgreSQL status
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d
```

### Frontend Issues

**WebSocket Connection Failed:**
- Ensure backend is running on http://localhost:8000
- Check that REDIS_ENABLED=true if using real-time features
- Verify no firewall blocking WebSocket connections

**Chart Not Rendering:**
- Check browser console for errors
- Verify candles API returns data: http://localhost:8000/api/candles?symbol=BTCUSDT&interval=1m&limit=100

---

## Support & Contact

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

---

**Built with ❤️ for the crypto trading community**
