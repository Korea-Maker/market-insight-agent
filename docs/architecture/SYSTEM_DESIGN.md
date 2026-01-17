# System Architecture & Design

Comprehensive architectural documentation for QuantBoard V1.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Component Diagram](#component-diagram)
- [Data Flow](#data-flow)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Database Schema](#database-schema)
- [Redis Architecture](#redis-architecture)
- [WebSocket Communication](#websocket-communication)
- [Scalability Considerations](#scalability-considerations)
- [Security](#security)

---

## Overview

QuantBoard V1 is built with a modern, asynchronous architecture that separates concerns between data ingestion, storage, and presentation. The system is designed for high performance, real-time data delivery, and horizontal scalability.

### Design Principles

1. **Asynchronous First**: All I/O operations use async/await for maximum concurrency
2. **Separation of Concerns**: Clear boundaries between data collection, storage, and delivery
3. **Optional Real-Time**: System works with or without Redis for flexibility
4. **Type Safety**: Strong typing in both TypeScript and Python
5. **Developer Experience**: Fast development with hot reload and comprehensive tooling

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Layer (Browser)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │  Chart UI    │  │  Dashboard   │  │  News Feed   │                  │
│  │              │  │              │  │              │                  │
│  │ - Candles    │  │ - Real-time  │  │ - Articles   │                  │
│  │ - Indicators │  │ - Price      │  │ - Sources    │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                 │                  │                          │
└─────────┼─────────────────┼──────────────────┼──────────────────────────┘
          │                 │                  │
          │ REST API        │ WebSocket        │ REST API
          │                 │                  │
┌─────────┼─────────────────┼──────────────────┼──────────────────────────┐
│         │    API Gateway / Middleware Layer  │                          │
│         │                 │                  │                          │
│  ┌──────▼─────────────────▼──────────────────▼───────┐                 │
│  │           FastAPI Application Server               │                 │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │                 │
│  │  │ Candles  │  │WebSocket │  │   News   │        │                 │
│  │  │  Router  │  │ Manager  │  │  Router  │        │                 │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘        │                 │
│  │       │             │              │               │                 │
│  └───────┼─────────────┼──────────────┼───────────────┘                 │
│          │             │              │                                 │
│  ┌───────▼─────┐  ┌────▼────┐  ┌─────▼──────┐                          │
│  │   Binance   │  │  Redis  │  │ PostgreSQL │                          │
│  │  REST API   │  │ Pub/Sub │  │  (News DB) │                          │
│  │  (External) │  └────▲────┘  └────────────┘                          │
│  └─────────────┘       │                                                │
│                        │                                                │
└────────────────────────┼────────────────────────────────────────────────┘
                         │
                         │ Publish
┌────────────────────────┼────────────────────────────────────────────────┐
│       Background Services Layer                                         │
│  ┌────────────────────▼──────────────────┐  ┌────────────────────────┐ │
│  │      Binance WebSocket Ingestor       │  │   News Collector       │ │
│  │                                        │  │                        │ │
│  │  - Connects to Binance WebSocket      │  │  - RSS Feed Parser     │ │
│  │  - Subscribes to multiple symbols     │  │  - Content Extraction  │ │
│  │  - Publishes to Redis live_prices     │  │  - Korean Translation  │ │
│  │  - Auto-reconnect on disconnect       │  │  - Periodic Scheduling │ │
│  └────────────────────────────────────────┘  └────────┬───────────────┘ │
│                                                        │ Store           │
│                                                        ▼                 │
│                                               ┌────────────────┐        │
│                                               │  PostgreSQL    │        │
│                                               │  (News Table)  │        │
│                                               └────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Diagram

### Backend Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        FastAPI Backend                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Core Layer                               │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │ │
│  │  │ config.py│  │database.py│  │ redis.py │                 │ │
│  │  │          │  │           │  │          │                 │ │
│  │  │ Settings │  │AsyncEngine│  │ Singleton│                 │ │
│  │  │ Pydantic │  │ Sessions  │  │ Client   │                 │ │
│  │  └──────────┘  └──────────┘  └──────────┘                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Models Layer                             │ │
│  │  ┌──────────┐                                               │ │
│  │  │ news.py  │  SQLAlchemy ORM Models                       │ │
│  │  │          │                                               │ │
│  │  │ News     │  - id, title, title_kr, link                 │ │
│  │  │ Model    │  - published, source, description            │ │
│  │  └──────────┘  - created_at                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Routers Layer                            │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │ │
│  │  │  ws.py   │  │candles.py│  │ news.py  │                 │ │
│  │  │          │  │          │  │          │                 │ │
│  │  │WebSocket │  │ REST API │  │ REST API │                 │ │
│  │  │ /ws/     │  │/api/     │  │/api/news │                 │ │
│  │  │ prices   │  │candles   │  │          │                 │ │
│  │  └──────────┘  └──────────┘  └──────────┘                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Services Layer                             │ │
│  │  ┌──────────────┐  ┌──────────────┐                        │ │
│  │  │ ingestor.py  │  │news_collector│                        │ │
│  │  │              │  │    .py       │                        │ │
│  │  │  Binance WS  │  │  RSS Parser  │                        │ │
│  │  │  Stream      │  │  Translator  │                        │ │
│  │  │  Handler     │  │  Scheduler   │                        │ │
│  │  └──────────────┘  └──────────────┘                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Frontend Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Frontend                           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    App Router Layer                         │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │ │
│  │  │ page.tsx │  │dashboard/│  │  news/   │                 │ │
│  │  │          │  │page.tsx  │  │page.tsx  │                 │ │
│  │  │  Home    │  │          │  │          │                 │ │
│  │  │  Page    │  │Dashboard │  │News List │                 │ │
│  │  └──────────┘  └──────────┘  └──────────┘                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                 Components Layer                            │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │ │
│  │  │  Chart/  │  │Dashboard/│  │ Layout/  │                 │ │
│  │  │          │  │          │  │          │                 │ │
│  │  │Crypto    │  │PriceCard │  │MainLayout│                 │ │
│  │  │Chart.tsx │  │.tsx      │  │.tsx      │                 │ │
│  │  └──────────┘  └──────────┘  └──────────┘                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Hooks Layer                              │ │
│  │  ┌──────────────────┐                                       │ │
│  │  │ useWebSocket.ts  │  Custom hooks for WebSocket          │ │
│  │  │                  │  - Auto-reconnect                     │ │
│  │  │                  │  - Exponential backoff                │ │
│  │  └──────────────────┘  - Connection state                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Store Layer (Zustand)                    │ │
│  │  ┌──────────────────┐                                       │ │
│  │  │usePriceStore.ts  │  State management                     │ │
│  │  │                  │  - currentPrice                       │ │
│  │  │                  │  - priceHistory (max 1000)            │ │
│  │  └──────────────────┘  - updatePrice()                     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Real-Time Price Stream Flow

**When REDIS_ENABLED=true:**

```
Step 1: Data Ingestion
┌─────────────┐
│   Binance   │
│  WebSocket  │  wss://stream.binance.com:9443
│   Stream    │
└──────┬──────┘
       │ Raw trade data
       │ {symbol, price, qty, time}
       ▼
┌─────────────┐
│  Binance    │
│  Ingestor   │  Background service (async)
│  Service    │  - Parses messages
└──────┬──────┘  - Normalizes data
       │
       │ Publish to Redis
       ▼
┌─────────────┐
│    Redis    │
│   Pub/Sub   │  Channel: "live_prices"
│             │
└──────┬──────┘
       │
       │ Subscribe
       ▼
┌─────────────┐
│Connection   │
│  Manager    │  Maintains active WebSocket clients
│             │
└──────┬──────┘
       │
       │ Broadcast to all clients
       ▼
┌─────────────┐
│  WebSocket  │
│   Clients   │  Multiple browser connections
│             │
└──────┬──────┘
       │
       │ onMessage
       ▼
┌─────────────┐
│   Zustand   │
│   Store     │  usePriceStore
│             │  - Update currentPrice
└──────┬──────┘  - Append to priceHistory
       │
       │ Reactive update
       ▼
┌─────────────┐
│   React     │
│     UI      │  Chart re-renders with new data
└─────────────┘
```

**Detailed Message Flow:**

1. **Binance WebSocket** sends trade data:
   ```json
   {
     "e": "trade",
     "s": "BTCUSDT",
     "p": "42500.50",
     "q": "1.25",
     "T": 1704067200000
   }
   ```

2. **Ingestor** normalizes and publishes:
   ```json
   {
     "symbol": "BTCUSDT",
     "price": 42500.50,
     "volume": 1.25,
     "timestamp": 1704067200000
   }
   ```

3. **ConnectionManager** broadcasts to all connected clients

4. **Frontend** receives and updates store:
   ```typescript
   usePriceStore.getState().updatePrice('BTCUSDT', 42500.50, timestamp);
   ```

### 2. Historical Candle Data Flow

```
Step 1: Client Request
┌─────────────┐
│   Browser   │
│   Client    │  GET /api/candles?symbol=BTCUSDT&interval=1m&limit=500
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   FastAPI   │
│   Router    │  /api/candles
│ (candles.py)│
└──────┬──────┘
       │
       │ Validate params
       ▼
┌─────────────┐
│   httpx     │
│   Client    │  GET https://api.binance.com/api/v3/klines
└──────┬──────┘
       │
       │ Raw candle data
       ▼
┌─────────────┐
│   Binance   │
│   REST API  │  Returns array of OHLC data
└──────┬──────┘
       │
       │ Response
       ▼
┌─────────────┐
│   Parser    │
│  Function   │  parse_binance_candle()
└──────┬──────┘  - Convert timestamps
       │          - Parse floats
       │          - Normalize structure
       ▼
┌─────────────┐
│   Pydantic  │
│   Model     │  CandlesResponse validation
└──────┬──────┘
       │
       │ JSON response
       ▼
┌─────────────┐
│   Browser   │
│   Client    │  Receives candles array
└──────┬──────┘
       │
       ▼
┌─────────────┐
│lightweight  │
│   -charts   │  Renders candlestick chart
└─────────────┘
```

### 3. News Collection & Delivery Flow

**Background Collection (Continuous):**

```
Step 1: Scheduled Collection
┌─────────────┐
│ APScheduler │
│             │  Runs every 30 minutes
└──────┬──────┘
       │ Trigger
       ▼
┌─────────────┐
│    News     │
│  Collector  │  Background service
│   Service   │
└──────┬──────┘
       │
       │ Fetch RSS feeds
       ▼
┌─────────────┐
│   RSS       │
│   Feeds     │  - CoinDesk RSS
│             │  - CoinTelegraph RSS
└──────┬──────┘  - Bitcoin.com RSS
       │
       │ Parse XML
       ▼
┌─────────────┐
│ feedparser  │
│             │  Extract articles
└──────┬──────┘
       │
       │ For each article
       ▼
┌─────────────┐
│  Translator │
│   Service   │  deep-translator
│             │  English → Korean
└──────┬──────┘
       │
       │ Store
       ▼
┌─────────────┐
│ PostgreSQL  │
│ News Table  │  INSERT if not exists (by link)
└─────────────┘
```

**Client Request (On-Demand):**

```
┌─────────────┐
│   Browser   │
│   Client    │  GET /api/news?skip=0&limit=20
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   FastAPI   │
│   Router    │  /api/news
│  (news.py)  │
└──────┬──────┘
       │
       │ Build SQL query
       ▼
┌─────────────┐
│ SQLAlchemy  │
│   Query     │  SELECT * FROM news
│             │  ORDER BY published DESC
└──────┬──────┘  LIMIT 20 OFFSET 0
       │
       ▼
┌─────────────┐
│ PostgreSQL  │
│   Database  │  Execute query
└──────┬──────┘
       │
       │ Results
       ▼
┌─────────────┐
│  Pydantic   │
│   Model     │  NewsListResponse validation
└──────┬──────┘
       │
       │ JSON response
       ▼
┌─────────────┐
│   Browser   │
│   Client    │  Display news list
└─────────────┘
```

---

## Backend Architecture

### FastAPI Application Lifecycle

```python
# main.py - Lifecycle management

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup:
    1. Initialize database (create tables)
    2. Start Binance ingestor (if Redis enabled)
    3. Start news collector

    Shutdown:
    1. Cancel background tasks
    2. Close database connections
    3. Close Redis connections
    """
    # Startup
    await init_db()

    background_tasks = []

    if REDIS_ENABLED:
        ingestor_task = asyncio.create_task(run_ingestor())
        background_tasks.append(ingestor_task)

    news_task = asyncio.create_task(run_news_collector())
    background_tasks.append(news_task)

    yield  # Application runs

    # Shutdown
    for task in background_tasks:
        task.cancel()
        await task

    await close_db()
    await close_redis_connections()
```

### Async Database Pattern

```python
# database.py

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

# Global engine
engine: AsyncEngine = None

async def init_db():
    """Initialize database engine and create tables"""
    global engine
    engine = create_async_engine(DATABASE_URL)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db() -> AsyncSession:
    """Dependency for route handlers"""
    async with AsyncSession(engine) as session:
        yield session
```

### Redis Pub/Sub Pattern

```python
# redis.py

from redis.asyncio import Redis

_redis_client: Redis = None
_redis_pubsub = None

async def get_redis_client() -> Redis:
    """Singleton Redis client"""
    global _redis_client
    if _redis_client is None:
        _redis_client = Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            decode_responses=True
        )
    return _redis_client

async def get_redis_pubsub():
    """Get Redis Pub/Sub instance"""
    global _redis_pubsub
    if _redis_pubsub is None:
        client = await get_redis_client()
        _redis_pubsub = client.pubsub()
    return _redis_pubsub
```

### WebSocket Connection Management

```python
# ws.py - ConnectionManager pattern

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.subscribe_task: asyncio.Task | None = None
        self.running = False

    async def connect(self, websocket: WebSocket):
        """Accept and register new connection"""
        await websocket.accept()
        self.active_connections.add(websocket)

        if not self.running:
            await self.start_redis_subscription()

    async def broadcast(self, message: dict):
        """Send message to all connected clients"""
        disconnected = set()

        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)

        for connection in disconnected:
            await self.disconnect(connection)

    async def _redis_message_loop(self, pubsub):
        """Background task: listen to Redis and broadcast"""
        while self.running:
            message = await pubsub.get_message()
            if message and message["type"] == "message":
                data = json.loads(message["data"])
                await self.broadcast(data)
```

---

## Frontend Architecture

### Next.js App Router Structure

```
app/
├── page.tsx                 # Homepage (/)
├── layout.tsx               # Root layout
├── dashboard/
│   └── page.tsx             # Dashboard (/dashboard)
└── news/
    ├── page.tsx             # News list (/news)
    └── [id]/
        └── page.tsx         # News detail (/news/1)
```

### Zustand State Management

```typescript
// store/usePriceStore.ts

interface PriceState {
  currentPrice: number | null;
  priceHistory: Array<{ price: number; timestamp: number }>;
  updatePrice: (symbol: string, price: number, timestamp: number) => void;
}

export const usePriceStore = create<PriceState>((set) => ({
  currentPrice: null,
  priceHistory: [],

  updatePrice: (symbol, price, timestamp) =>
    set((state) => ({
      currentPrice: price,
      priceHistory: [
        ...state.priceHistory,
        { price, timestamp }
      ].slice(-1000), // Keep last 1000 entries
    })),
}));
```

### WebSocket Hook with Reconnection

```typescript
// hooks/useWebSocket.ts

export function useWebSocket(url: string, options: WebSocketOptions) {
  const reconnectInterval = useRef(1000);
  const maxReconnectInterval = 30000;

  useEffect(() => {
    let ws: WebSocket | null = null;

    function connect() {
      ws = new WebSocket(url);

      ws.onopen = () => {
        reconnectInterval.current = 1000; // Reset
        options.onOpen?.();
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        options.onMessage?.(data);
      };

      ws.onclose = () => {
        // Exponential backoff
        setTimeout(connect, reconnectInterval.current);
        reconnectInterval.current = Math.min(
          reconnectInterval.current * 2,
          maxReconnectInterval
        );
      };
    }

    connect();

    return () => ws?.close();
  }, [url]);
}
```

---

## Database Schema

### News Table

```sql
CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    title_kr VARCHAR(500),           -- Korean translation
    link VARCHAR(1000) NOT NULL UNIQUE,  -- Unique constraint for deduplication
    published TIMESTAMP,
    source VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_news_published ON news(published DESC);
CREATE INDEX idx_news_source ON news(source);
CREATE INDEX idx_news_created_at ON news(created_at DESC);
```

### Future Extensions

Potential additional tables:

```sql
-- User table (for authentication)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Watchlist table
CREATE TABLE watchlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    symbol VARCHAR(20) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Price alerts table
CREATE TABLE price_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    symbol VARCHAR(20) NOT NULL,
    target_price DECIMAL(20, 8) NOT NULL,
    condition VARCHAR(10) NOT NULL, -- 'above' or 'below'
    triggered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Redis Architecture

### Pub/Sub Pattern

**Channel: `live_prices`**

Publisher (Binance Ingestor):
```python
async def publish_price(redis_client, data):
    """Publish price update to Redis"""
    await redis_client.publish(
        'live_prices',
        json.dumps(data)
    )
```

Subscriber (ConnectionManager):
```python
async def subscribe_prices(pubsub):
    """Subscribe to price updates"""
    await pubsub.subscribe('live_prices')

    while True:
        message = await pubsub.get_message()
        if message and message['type'] == 'message':
            data = json.loads(message['data'])
            await broadcast_to_clients(data)
```

### Why Redis is Optional

The system is designed to work without Redis:

**With Redis (REDIS_ENABLED=true):**
- Real-time price streaming via WebSocket
- Low latency (< 100ms)
- Scales horizontally (multiple backend instances)

**Without Redis (REDIS_ENABLED=false):**
- Historical candles API still works (direct Binance API)
- News API still works (PostgreSQL only)
- No WebSocket streaming
- Simpler deployment

---

## WebSocket Communication

### Connection Lifecycle

```
Client                         Server
  |                              |
  |--- WebSocket Handshake ----->|
  |<--- HTTP 101 Switching ------| (Connection established)
  |                              |
  |                              |--- Subscribe to Redis
  |                              |
  |<--- Price Update 1 ----------|
  |<--- Price Update 2 ----------|
  |<--- Price Update 3 ----------|
  |                              |
  |--- Close Connection -------->|
  |                              |--- Unsubscribe from Redis (if last client)
```

### Message Protocol

**Server → Client (Price Update):**
```json
{
  "symbol": "BTCUSDT",
  "price": 42500.50,
  "timestamp": 1704067200000,
  "volume": 1.25
}
```

**Client → Server (Ping/Pong):**
```json
{
  "type": "ping"
}
```

**Server → Client (Pong):**
```json
{
  "type": "pong",
  "timestamp": 1704067200000
}
```

---

## Scalability Considerations

### Horizontal Scaling

**Current Architecture:**
- Single backend instance
- Single Redis instance
- Single PostgreSQL instance

**Scaled Architecture:**

```
                    ┌──────────────┐
                    │  Load        │
                    │  Balancer    │
                    │  (Nginx)     │
                    └──────┬───────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐       ┌────▼────┐      ┌────▼────┐
    │ Backend │       │ Backend │      │ Backend │
    │ Instance│       │ Instance│      │ Instance│
    │    1    │       │    2    │      │    3    │
    └────┬────┘       └────┬────┘      └────┬────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         ┌────▼────┐  ┌────▼────┐ ┌────▼────┐
         │  Redis  │  │Postgres │ │Postgres │
         │ Cluster │  │ Primary │ │ Replica │
         └─────────┘  └─────────┘ └─────────┘
```

### Performance Optimizations

1. **Database Connection Pooling**: AsyncSession pool
2. **Redis Connection Reuse**: Singleton pattern
3. **Candle Data Caching**: Cache Binance responses (future)
4. **WebSocket Message Batching**: Group updates (future)
5. **Database Indexes**: On published, source, created_at

### Bottleneck Analysis

**Current Bottlenecks:**
1. **Single Binance ingestor**: Can only handle ~100 symbols
2. **PostgreSQL writes**: News collector inserts
3. **WebSocket broadcast**: O(n) for n clients

**Solutions:**
1. Multiple ingestor instances (partition symbols)
2. Batch inserts for news (bulk upsert)
3. Redis-based WebSocket clustering

---

## Security

### Current Security Measures

1. **CORS Configuration**: Whitelist origins
2. **Input Validation**: Pydantic models
3. **SQL Injection Protection**: SQLAlchemy ORM
4. **Rate Limiting**: None (planned)

### Production Security Checklist

- [ ] Enable HTTPS/WSS (SSL certificates)
- [ ] Configure CORS for production domain
- [ ] Add rate limiting (API keys or IP-based)
- [ ] Implement authentication (JWT tokens)
- [ ] Use environment variables for secrets
- [ ] Enable PostgreSQL SSL connections
- [ ] Harden Redis (password, disable dangerous commands)
- [ ] Add request logging and monitoring
- [ ] Implement CSRF protection
- [ ] Use security headers (Helmet.js equivalent)

### Environment Variable Security

Never commit `.env` files. Use:
- `.env.example` for templates
- Secret management (AWS Secrets Manager, HashiCorp Vault)
- Environment-specific configs

---

## Diagrams

### Sequence Diagram: Real-Time Price Update

```
Binance     Ingestor    Redis    ConnectionMgr    Client    Zustand
  |            |          |            |             |         |
  |--Trade---->|          |            |             |         |
  |            |--Publish->|           |             |         |
  |            |          |--Notify--->|             |         |
  |            |          |            |--Broadcast->|         |
  |            |          |            |             |--Update->|
  |            |          |            |             |         |--Re-render
```

### Sequence Diagram: News Collection

```
Scheduler    Collector    RSS Feed    Translator    PostgreSQL
    |            |            |            |             |
    |--Trigger-->|            |            |             |
    |            |--Fetch---->|            |             |
    |            |<--Articles-|            |             |
    |            |--Translate------------>|             |
    |            |<--Korean-text----------|             |
    |            |--INSERT---------------------------->|
    |            |<--Success-----------------------------|
```

---

## Conclusion

QuantBoard V1 uses a modern, asynchronous architecture that balances performance, scalability, and developer experience. The optional Redis mode provides flexibility for different deployment scenarios, while the clear separation of concerns enables easy maintenance and future enhancements.

**Key Architectural Strengths:**
- Fully asynchronous I/O
- Reactive state management (Zustand)
- Type-safe across the stack
- Modular and testable
- Scalable design

**For more information:**
- [API Documentation](../api/README.md)
- [Development Guide](../guides/DEVELOPMENT.md)
- [Deployment Guide](../guides/DEPLOYMENT.md)

---

**Last Updated:** 2024-01-17
