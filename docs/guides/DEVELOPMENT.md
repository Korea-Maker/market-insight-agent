# Development Guide

Complete guide for developing and contributing to QuantBoard V1.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Code Standards](#code-standards)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Debugging](#debugging)
- [Common Tasks](#common-tasks)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** 18+ and npm
- **Python** 3.11+
- **Docker** and Docker Compose
- **Git**
- **VS Code** (recommended) or your preferred IDE

### Initial Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd market-insight-agent
```

2. Install backend dependencies:
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
```

4. Set up environment variables:
```bash
# Backend
cd backend
cp env.example .env
# Edit .env with your settings

# Frontend (optional)
cd frontend
cp .env.example .env.local
# Edit .env.local if needed
```

5. Start infrastructure:
```bash
cd backend
docker-compose up -d
```

6. Verify setup:
```bash
# Check Docker containers
docker-compose ps

# Should show postgres and redis running
```

---

## Development Environment Setup

### VS Code Extensions (Recommended)

**Python:**
- Python (Microsoft)
- Pylance
- Black Formatter
- isort

**JavaScript/TypeScript:**
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- ES7+ React/Redux/React-Native snippets

**General:**
- GitLens
- Docker
- REST Client
- Thunder Client (API testing)

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/backend/venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": false,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Environment Variables

**Backend (`backend/.env`):**

```bash
# Database
POSTGRES_USER=quantboard
POSTGRES_PASSWORD=quantboard_dev
POSTGRES_DB=quantboard
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_ENABLED=false  # Set to true for real-time features

# API
API_HOST=0.0.0.0
API_PORT=8000

# Environment
ENVIRONMENT=development

# CORS (add frontend URL)
CORS_ORIGINS=["http://localhost:3000"]
```

**Frontend (`frontend/.env.local`):**

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

## Project Structure

### Backend Structure

```
backend/
├── app/
│   ├── core/                   # Core configuration
│   │   ├── config.py           # Pydantic Settings
│   │   ├── database.py         # Database configuration
│   │   └── redis.py            # Redis client
│   ├── models/                 # Database models
│   │   └── news.py             # News model
│   ├── routers/                # API routes
│   │   ├── ws.py               # WebSocket routes
│   │   ├── candles.py          # Candles API
│   │   └── news.py             # News API
│   └── services/               # Background services
│       ├── ingestor.py         # Binance data ingestor
│       └── news_collector.py   # News collector
├── main.py                     # Application entry point
├── requirements.txt            # Python dependencies
├── docker-compose.yml          # Infrastructure setup
└── .env                        # Environment variables (gitignored)
```

### Frontend Structure

```
frontend/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Homepage
│   ├── layout.tsx              # Root layout
│   ├── dashboard/              # Dashboard routes
│   └── news/                   # News routes
├── components/                 # React components
│   ├── Chart/                  # Chart components
│   ├── Dashboard/              # Dashboard components
│   ├── Layout/                 # Layout components
│   └── Navigation/             # Navigation components
├── hooks/                      # Custom hooks
│   └── useWebSocket.ts         # WebSocket hook
├── store/                      # Zustand stores
│   └── usePriceStore.ts        # Price state
├── lib/                        # Utilities
│   └── utils.ts                # Helper functions
├── styles/                     # Global styles
└── public/                     # Static assets
```

---

## Code Standards

### Python (Backend)

**Style Guide:**
- Follow PEP 8
- Use Black formatter (line length: 88)
- Type hints required for all functions
- Docstrings for all public functions (Google style)

**Example:**

```python
from typing import Optional
from pydantic import BaseModel


class CandleData(BaseModel):
    """
    Represents a single OHLC candle.

    Attributes:
        time: Unix timestamp in seconds
        open: Opening price
        high: Highest price in interval
        low: Lowest price in interval
        close: Closing price
        volume: Trading volume
    """
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: float


async def fetch_candles(
    symbol: str,
    interval: str = "1m",
    limit: int = 500
) -> list[CandleData]:
    """
    Fetch candle data from Binance API.

    Args:
        symbol: Trading pair (e.g., BTCUSDT)
        interval: Time interval (1m, 5m, 1h, etc.)
        limit: Number of candles to fetch

    Returns:
        List of candle data objects

    Raises:
        HTTPException: If Binance API request fails
    """
    # Implementation here
    pass
```

**Imports Organization:**

```python
# Standard library
import asyncio
import json
from typing import Optional

# Third-party
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Local
from app.core.config import settings
from app.models.news import News
```

### TypeScript/React (Frontend)

**Style Guide:**
- Use TypeScript strict mode
- No `any` types (use `unknown` if needed)
- Prefer functional components
- Use React Server Components when possible
- Minimize 'use client' directives

**Example:**

```typescript
// components/PriceCard.tsx
import { FC } from 'react';

interface PriceCardProps {
  symbol: string;
  price: number;
  change24h: number;
}

export const PriceCard: FC<PriceCardProps> = ({
  symbol,
  price,
  change24h,
}) => {
  const isPositive = change24h >= 0;

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-medium text-muted-foreground">
        {symbol}
      </h3>
      <p className="text-2xl font-bold">${price.toLocaleString()}</p>
      <p className={isPositive ? 'text-green-500' : 'text-red-500'}>
        {isPositive ? '+' : ''}{change24h.toFixed(2)}%
      </p>
    </div>
  );
};
```

**State Management (Zustand):**

```typescript
// store/usePriceStore.ts
import { create } from 'zustand';

interface PriceState {
  currentPrice: number | null;
  priceHistory: Array<{ price: number; timestamp: number }>;
  updatePrice: (symbol: string, price: number, timestamp: number) => void;
  clearHistory: () => void;
}

export const usePriceStore = create<PriceState>((set) => ({
  currentPrice: null,
  priceHistory: [],

  updatePrice: (symbol, price, timestamp) =>
    set((state) => ({
      currentPrice: price,
      priceHistory: [
        ...state.priceHistory,
        { price, timestamp },
      ].slice(-1000), // Keep last 1000
    })),

  clearHistory: () =>
    set({
      currentPrice: null,
      priceHistory: [],
    }),
}));
```

### Database Migrations

When modifying database models:

```python
# app/models/news.py
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class News(Base):
    __tablename__ = "news"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    title_kr = Column(String(500), nullable=True)
    link = Column(String(1000), unique=True, nullable=False)
    published = Column(DateTime, nullable=True)
    source = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default="now()")
```

**Note:** Tables are created automatically on app startup via `init_db()`.

---

## Development Workflow

### 1. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend

# Activate virtual environment
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Start infrastructure
docker-compose up -d

# Run backend (without Redis)
python main.py

# OR with Redis for real-time features
REDIS_ENABLED=true python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Logs (optional):**
```bash
cd backend
docker-compose logs -f
```

### 2. Create a New Feature

**Branch Strategy:**
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes
# ...

# Commit
git add .
git commit -m "feat: add your feature description"

# Push
git push origin feature/your-feature-name
```

**Commit Message Convention:**

```
<type>(<scope>): <subject>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes (formatting)
- refactor: Code refactoring
- test: Adding tests
- chore: Build process or auxiliary tool changes

Examples:
feat(api): add pagination to news endpoint
fix(websocket): handle reconnection on network error
docs(readme): update installation instructions
```

### 3. Adding a New API Endpoint

**Backend (FastAPI):**

```python
# backend/app/routers/your_router.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db

router = APIRouter(prefix="/api/your-endpoint", tags=["YourTag"])

@router.get("/")
async def get_items(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """Get items with pagination."""
    # Implementation
    return {"items": []}
```

**Register router in `main.py`:**

```python
from app.routers import your_router

app.include_router(your_router.router)
```

**Frontend (API call):**

```typescript
// lib/api.ts
export async function fetchItems(skip = 0, limit = 20) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/your-endpoint?skip=${skip}&limit=${limit}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch items');
  }

  return response.json();
}
```

### 4. Adding a New Component

```typescript
// components/YourComponent/YourComponent.tsx
'use client'; // Only if needed (state, effects, etc.)

import { FC } from 'react';

interface YourComponentProps {
  // Props interface
}

export const YourComponent: FC<YourComponentProps> = (props) => {
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};
```

---

## Testing

### Backend Testing

**Setup:**
```bash
cd backend
pip install pytest pytest-asyncio httpx
```

**Create test file:**

```python
# tests/test_candles.py
import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_get_candles():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/candles?symbol=BTCUSDT&interval=1m&limit=10")

    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "BTCUSDT"
    assert len(data["candles"]) > 0
```

**Run tests:**
```bash
pytest
```

### Frontend Testing

**Setup:**
```bash
cd frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom jest
```

**Create test file:**

```typescript
// components/PriceCard/PriceCard.test.tsx
import { render, screen } from '@testing-library/react';
import { PriceCard } from './PriceCard';

describe('PriceCard', () => {
  it('renders price correctly', () => {
    render(
      <PriceCard symbol="BTCUSDT" price={42500} change24h={2.5} />
    );

    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
    expect(screen.getByText('$42,500')).toBeInTheDocument();
    expect(screen.getByText('+2.50%')).toBeInTheDocument();
  });
});
```

**Run tests:**
```bash
npm test
```

---

## Debugging

### Backend Debugging

**VS Code launch configuration (`.vscode/launch.json`):**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "main:app",
        "--reload",
        "--host", "0.0.0.0",
        "--port", "8000"
      ],
      "jinja": true,
      "cwd": "${workspaceFolder}/backend",
      "env": {
        "REDIS_ENABLED": "true"
      }
    }
  ]
}
```

**Logging:**

```python
import logging

logger = logging.getLogger(__name__)

@router.get("/debug")
async def debug_endpoint():
    logger.info("Debug endpoint called")
    logger.debug("Detailed debug information")
    logger.error("Error occurred", exc_info=True)
    return {"status": "ok"}
```

### Frontend Debugging

**React DevTools:**
- Install React DevTools browser extension
- Inspect component tree and state

**Network debugging:**
```typescript
// Add logging to API calls
export async function fetchCandles(symbol: string) {
  console.log('Fetching candles for', symbol);

  const response = await fetch(`/api/candles?symbol=${symbol}`);

  console.log('Response status:', response.status);

  const data = await response.json();
  console.log('Received data:', data);

  return data;
}
```

**WebSocket debugging:**
```typescript
const ws = new WebSocket(url);

ws.onopen = () => console.log('WS Connected');
ws.onmessage = (e) => console.log('WS Message:', JSON.parse(e.data));
ws.onerror = (e) => console.error('WS Error:', e);
ws.onclose = () => console.log('WS Disconnected');
```

---

## Common Tasks

### Add a New Database Model

1. Create model file:
```python
# app/models/watchlist.py
from sqlalchemy import Column, Integer, String, DateTime
from app.core.database import Base

class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False)
    added_at = Column(DateTime, server_default="now()")
```

2. Import in `app/models/__init__.py`:
```python
from .news import News
from .watchlist import Watchlist
```

3. Restart server (tables created automatically)

### Add a New Zustand Store

```typescript
// store/useNewsStore.ts
import { create } from 'zustand';

interface NewsState {
  articles: NewsItem[];
  loading: boolean;
  fetchNews: () => Promise<void>;
}

export const useNewsStore = create<NewsState>((set) => ({
  articles: [],
  loading: false,

  fetchNews: async () => {
    set({ loading: true });
    const response = await fetch('/api/news');
    const data = await response.json();
    set({ articles: data.items, loading: false });
  },
}));
```

### Add Environment Variable

1. Add to `.env.example`:
```bash
NEW_VARIABLE=default_value
```

2. Add to Pydantic Settings:
```python
# app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    NEW_VARIABLE: str = "default_value"

    class Config:
        env_file = ".env"
```

3. Use in code:
```python
from app.core.config import settings

print(settings.NEW_VARIABLE)
```

---

## Best Practices

### Backend Best Practices

1. **Always use async/await** for I/O operations
2. **Use dependency injection** (`Depends(get_db)`)
3. **Validate all inputs** with Pydantic models
4. **Handle errors gracefully** with try/except
5. **Log important events** (not everything)
6. **Use type hints** everywhere
7. **Keep routes thin** - move logic to services

### Frontend Best Practices

1. **Prefer Server Components** - only use 'use client' when necessary
2. **Use Zustand selectively** - subscribe to specific state slices
3. **Memoize expensive computations** with `useMemo`
4. **Debounce user input** for API calls
5. **Handle loading and error states** in UI
6. **Use TypeScript interfaces** for props and data
7. **Keep components small** - single responsibility

### General Best Practices

1. **Never commit secrets** to git
2. **Write meaningful commit messages**
3. **Test before committing**
4. **Update documentation** when changing APIs
5. **Review your own code** before PR
6. **Use feature flags** for experimental features

---

## Troubleshooting

### Common Issues

**Issue: Module not found**
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

**Issue: Port already in use**
```bash
# Find and kill process on port 8000
lsof -i :8000
kill -9 <PID>

# Or use different port
uvicorn main:app --port 8001
```

**Issue: Database connection error**
```bash
# Check Docker containers
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres

# View logs
docker-compose logs postgres
```

**Issue: Redis connection error**
```bash
# Check Redis status
docker-compose ps

# Test Redis connection
docker exec -it <redis-container> redis-cli ping
# Should return PONG

# Or disable Redis
REDIS_ENABLED=false python main.py
```

**Issue: WebSocket connection refused**
- Ensure backend is running
- Check `REDIS_ENABLED=true` in `.env`
- Verify Redis is running: `docker-compose ps`
- Check firewall/antivirus blocking connections

**Issue: Hot reload not working**
```bash
# Frontend - clear .next directory
cd frontend
rm -rf .next
npm run dev

# Backend - ensure using --reload flag
uvicorn main:app --reload
```

---

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [SQLAlchemy Async Documentation](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [Pydantic Documentation](https://docs.pydantic.dev/)

---

**Last Updated:** 2024-01-17
