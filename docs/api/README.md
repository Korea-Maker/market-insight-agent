# API Documentation

Complete API reference for QuantBoard V1 backend services.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [REST API](#rest-api)
  - [Health Check](#health-check)
  - [Candles API](#candles-api)
  - [News API](#news-api)
- [WebSocket API](#websocket-api)
  - [Real-Time Prices](#real-time-prices)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Data Models](#data-models)

---

## Overview

QuantBoard V1 provides a comprehensive API for accessing cryptocurrency market data and news. The API consists of:

- **REST API**: For fetching historical candle data and news articles
- **WebSocket API**: For real-time price streaming

All responses are in JSON format, and the API follows RESTful conventions.

---

## Authentication

Currently, the API does not require authentication for public endpoints. Future versions may include API key authentication for rate limiting and access control.

---

## Base URL

**Development:**
```
http://localhost:8000
```

**Production:**
```
https://your-domain.com
```

**WebSocket:**
```
ws://localhost:8000  (Development)
wss://your-domain.com (Production with SSL)
```

---

## REST API

### Health Check

Check if the API server is running and healthy.

**Endpoint:**
```http
GET /health
```

**Parameters:** None

**Response:**
```json
{
  "status": "healthy",
  "service": "QuantBoard API"
}
```

**Status Codes:**
- `200 OK`: Server is healthy

**Example:**
```bash
curl http://localhost:8000/health
```

---

### Candles API

Fetch historical OHLC (Open, High, Low, Close) candle data from Binance.

#### Get Candles

**Endpoint:**
```http
GET /api/candles
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `symbol` | string | No | `BTCUSDT` | Trading pair (e.g., BTCUSDT, ETHUSDT) |
| `interval` | string | No | `1m` | Time interval (1m, 5m, 15m, 30m, 1h, 4h, 1d, etc.) |
| `limit` | integer | No | `500` | Number of candles to return (1-1000) |
| `end_time` | integer | No | - | End time in Unix milliseconds |

**Valid Intervals:**
- Minutes: `1m`, `3m`, `5m`, `15m`, `30m`
- Hours: `1h`, `2h`, `4h`, `6h`, `8h`, `12h`
- Days: `1d`, `3d`
- Weeks: `1w`
- Months: `1M`

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
    },
    {
      "time": 1704067260,
      "open": 42520.30,
      "high": 42580.00,
      "low": 42510.00,
      "close": 42565.00,
      "volume": 98.32
    }
  ]
}
```

**Status Codes:**
- `200 OK`: Success
- `422 Unprocessable Entity`: Invalid parameters
- `503 Service Unavailable`: Binance API unavailable
- `500 Internal Server Error`: Server error

**Examples:**

Get 1-minute Bitcoin candles (last 500):
```bash
curl "http://localhost:8000/api/candles?symbol=BTCUSDT&interval=1m&limit=500"
```

Get 1-hour Ethereum candles (last 100):
```bash
curl "http://localhost:8000/api/candles?symbol=ETHUSDT&interval=1h&limit=100"
```

Get candles up to specific time:
```bash
curl "http://localhost:8000/api/candles?symbol=BTCUSDT&interval=1m&limit=100&end_time=1704067200000"
```

**TypeScript Example:**
```typescript
interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlesResponse {
  symbol: string;
  interval: string;
  candles: CandleData[];
}

async function fetchCandles(
  symbol: string = 'BTCUSDT',
  interval: string = '1m',
  limit: number = 500
): Promise<CandlesResponse> {
  const response = await fetch(
    `http://localhost:8000/api/candles?symbol=${symbol}&interval=${interval}&limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Usage
const data = await fetchCandles('BTCUSDT', '1h', 100);
console.log(data.candles);
```

---

### News API

Fetch cryptocurrency news articles collected from various sources.

#### Get News List

**Endpoint:**
```http
GET /api/news
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `skip` | integer | No | `0` | Number of items to skip (pagination) |
| `limit` | integer | No | `20` | Number of items to return (1-100) |
| `source` | string | No | - | Filter by news source (e.g., CoinDesk) |

**Response:**
```json
{
  "total": 150,
  "items": [
    {
      "id": 1,
      "title": "Bitcoin Reaches New All-Time High",
      "title_kr": "비트코인, 사상 최고치 경신",
      "link": "https://coindesk.com/...",
      "published": "2024-01-15T10:30:00Z",
      "source": "CoinDesk",
      "description": "Bitcoin has surged to a new all-time high...",
      "created_at": "2024-01-15T10:35:00Z"
    }
  ]
}
```

**Status Codes:**
- `200 OK`: Success
- `422 Unprocessable Entity`: Invalid parameters
- `500 Internal Server Error`: Server error

**Examples:**

Get latest 20 news articles:
```bash
curl "http://localhost:8000/api/news?skip=0&limit=20"
```

Get news from specific source:
```bash
curl "http://localhost:8000/api/news?source=CoinDesk&limit=10"
```

Pagination (get page 2):
```bash
curl "http://localhost:8000/api/news?skip=20&limit=20"
```

**TypeScript Example:**
```typescript
interface NewsItem {
  id: number;
  title: string;
  title_kr: string | null;
  link: string;
  published: string | null;
  source: string;
  description: string | null;
  created_at: string;
}

interface NewsListResponse {
  total: number;
  items: NewsItem[];
}

async function fetchNews(
  skip: number = 0,
  limit: number = 20,
  source?: string
): Promise<NewsListResponse> {
  let url = `http://localhost:8000/api/news?skip=${skip}&limit=${limit}`;
  if (source) {
    url += `&source=${encodeURIComponent(source)}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Usage
const news = await fetchNews(0, 20, 'CoinDesk');
console.log(news.items);
```

#### Get News Sources

Get a list of available news sources.

**Endpoint:**
```http
GET /api/news/sources
```

**Parameters:** None

**Response:**
```json
["CoinDesk", "CoinTelegraph", "Bitcoin.com"]
```

**Status Codes:**
- `200 OK`: Success
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl http://localhost:8000/api/news/sources
```

**TypeScript Example:**
```typescript
async function fetchNewsSources(): Promise<string[]> {
  const response = await fetch('http://localhost:8000/api/news/sources');

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Usage
const sources = await fetchNewsSources();
console.log(sources); // ["CoinDesk", "CoinTelegraph", ...]
```

#### Get News by ID

Get a specific news article by its ID.

**Endpoint:**
```http
GET /api/news/{news_id}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `news_id` | integer | Yes | News article ID |

**Response:**
```json
{
  "id": 1,
  "title": "Bitcoin Reaches New All-Time High",
  "title_kr": "비트코인, 사상 최고치 경신",
  "link": "https://coindesk.com/...",
  "published": "2024-01-15T10:30:00Z",
  "source": "CoinDesk",
  "description": "Bitcoin has surged to a new all-time high...",
  "created_at": "2024-01-15T10:35:00Z"
}
```

**Status Codes:**
- `200 OK`: Success
- `404 Not Found`: News article not found
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl http://localhost:8000/api/news/1
```

**TypeScript Example:**
```typescript
async function fetchNewsById(newsId: number): Promise<NewsItem> {
  const response = await fetch(`http://localhost:8000/api/news/${newsId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('News article not found');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Usage
try {
  const article = await fetchNewsById(1);
  console.log(article);
} catch (error) {
  console.error('Failed to fetch news:', error);
}
```

---

## WebSocket API

### Real-Time Prices

Stream real-time cryptocurrency price updates via WebSocket.

**Important:** This feature requires `REDIS_ENABLED=true` in backend configuration.

**Endpoint:**
```
WS /ws/prices
```

**Connection:**

The WebSocket connection provides real-time price updates for multiple cryptocurrencies. Once connected, you'll automatically receive price updates as they occur.

**Message Format (Server → Client):**
```json
{
  "symbol": "BTCUSDT",
  "price": 42520.30,
  "timestamp": 1704067200000,
  "volume": 1.25
}
```

**Field Descriptions:**
- `symbol`: Trading pair (e.g., BTCUSDT, ETHUSDT)
- `price`: Current price
- `timestamp`: Unix timestamp in milliseconds
- `volume`: Trading volume

**Vanilla JavaScript Example:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/prices');

ws.onopen = () => {
  console.log('WebSocket connected');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`${data.symbol}: $${data.price}`);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket disconnected');
};
```

**TypeScript Example:**
```typescript
interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  volume: number;
}

class PriceWebSocket {
  private ws: WebSocket | null = null;
  private reconnectInterval: number = 1000;
  private maxReconnectInterval: number = 30000;
  private reconnectAttempts: number = 0;

  constructor(
    private url: string,
    private onMessage: (data: PriceUpdate) => void
  ) {
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.reconnectInterval = 1000;
    };

    this.ws.onmessage = (event) => {
      try {
        const data: PriceUpdate = JSON.parse(event.data);
        this.onMessage(data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected. Reconnecting...');
      this.reconnect();
    };
  }

  private reconnect() {
    setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnectInterval = Math.min(
        this.reconnectInterval * 2,
        this.maxReconnectInterval
      );
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
      this.connect();
    }, this.reconnectInterval);
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Usage
const priceWs = new PriceWebSocket(
  'ws://localhost:8000/ws/prices',
  (data) => {
    console.log(`${data.symbol}: $${data.price}`);
  }
);

// Later, to disconnect:
// priceWs.disconnect();
```

**React Hook Example:**
```typescript
import { useEffect, useRef } from 'react';

function useWebSocket(url: string, onMessage: (data: PriceUpdate) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectInterval = useRef(1000);

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts.current = 0;
        reconnectInterval.current = 1000;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected. Reconnecting...');
        setTimeout(() => {
          reconnectAttempts.current++;
          reconnectInterval.current = Math.min(
            reconnectInterval.current * 2,
            30000
          );
          connect();
        }, reconnectInterval.current);
      };
    }

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url, onMessage]);

  return wsRef.current;
}

// Usage in component
function PriceDisplay() {
  useWebSocket('ws://localhost:8000/ws/prices', (data) => {
    console.log(`${data.symbol}: $${data.price}`);
  });

  return <div>Price updates in console</div>;
}
```

---

## Error Handling

### Error Response Format

All error responses follow a consistent format:

```json
{
  "detail": "Error message description"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | OK | Request successful |
| `404` | Not Found | Resource not found |
| `422` | Unprocessable Entity | Invalid request parameters |
| `500` | Internal Server Error | Server encountered an error |
| `503` | Service Unavailable | External service (Binance) unavailable |

### Common Error Scenarios

**Invalid Parameters:**
```json
{
  "detail": [
    {
      "loc": ["query", "limit"],
      "msg": "ensure this value is less than or equal to 1000",
      "type": "value_error.number.not_le"
    }
  ]
}
```

**Resource Not Found:**
```json
{
  "detail": "뉴스를 찾을 수 없습니다"
}
```

**External API Failure:**
```json
{
  "detail": "Binance API 요청 실패: Connection timeout"
}
```

---

## Rate Limiting

Currently, there is no rate limiting on the API. However, please be mindful of:

- **Binance API limits**: The candles endpoint proxies to Binance, which has its own rate limits
- **WebSocket connections**: Limit to reasonable number of concurrent connections
- **Database queries**: Avoid excessive pagination requests

Future versions may implement rate limiting based on IP address or API keys.

---

## Data Models

### CandleData

Represents a single OHLC candle.

```typescript
interface CandleData {
  time: number;        // Unix timestamp in seconds
  open: number;        // Opening price
  high: number;        // Highest price in interval
  low: number;         // Lowest price in interval
  close: number;       // Closing price
  volume: number;      // Trading volume
}
```

### NewsItem

Represents a news article.

```typescript
interface NewsItem {
  id: number;                    // Unique identifier
  title: string;                 // Article title (English)
  title_kr: string | null;       // Article title (Korean, if available)
  link: string;                  // URL to original article
  published: string | null;      // Publication date (ISO 8601)
  source: string;                // News source name
  description: string | null;    // Article summary/description
  created_at: string;            // When added to database (ISO 8601)
}
```

### PriceUpdate

Represents a real-time price update (WebSocket).

```typescript
interface PriceUpdate {
  symbol: string;      // Trading pair (e.g., BTCUSDT)
  price: number;       // Current price
  timestamp: number;   // Unix timestamp in milliseconds
  volume: number;      // Trading volume
}
```

---

## Interactive API Documentation

FastAPI provides interactive API documentation:

**Swagger UI:**
```
http://localhost:8000/docs
```

**ReDoc:**
```
http://localhost:8000/redoc
```

These interfaces allow you to:
- Browse all endpoints
- View request/response schemas
- Test API calls directly from the browser
- Download OpenAPI specification

---

## Client Libraries

Currently, there are no official client libraries. You can use standard HTTP clients:

**Python:**
- `httpx` (async)
- `requests` (sync)

**JavaScript/TypeScript:**
- `fetch` (native)
- `axios`
- `got`

**WebSocket:**
- Native `WebSocket` API (browser)
- `ws` library (Node.js)

---

## Support

For API issues or questions:
- Check the [troubleshooting guide](../../README.md#troubleshooting)
- Review the [architecture documentation](../architecture/SYSTEM_DESIGN.md)
- Open an issue on GitHub

---

**Last Updated:** 2024-01-17
