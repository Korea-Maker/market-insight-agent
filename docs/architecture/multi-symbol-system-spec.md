# Multi-Symbol System Architecture Specification

## Document Information

| Item | Value |
|------|-------|
| Version | 1.0 |
| Date | 2026-01-23 |
| Status | Draft |
| Author | QuantBoard Development Team |

---

## 1. Executive Summary

### 1.1 Purpose
현재 QuantBoard V1은 단일 심볼(BTCUSDT)만 지원합니다. 이 아키텍처는 다중 암호화폐 심볼을 동시에 모니터링할 수 있도록 시스템을 확장하는 설계를 정의합니다.

### 1.2 Scope
- 백엔드: 다중 심볼 WebSocket 수집, Redis Pub/Sub 채널 분리, REST API 확장
- 프론트엔드: 다중 심볼 상태 관리, 동적 심볼 선택 UI, 차트 전환

### 1.3 Goals
- 동시 10개 이상 심볼 실시간 스트리밍
- 심볼별 독립적인 가격 히스토리 관리
- 사용자 심볼 구독/해제 기능
- 시스템 리소스 효율적 관리

---

## 2. Current System Analysis

### 2.1 Current Architecture (Single Symbol)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CURRENT SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Binance WS ──→ BinanceIngestor ──→ Redis (live_prices) ──→ WS Router  │
│  (BTCUSDT)        (single)              (single channel)      │        │
│                                                                ↓        │
│                                         ConnectionManager ──→ Clients  │
│                                           (broadcast all)              │
│                                                                         │
│  Frontend: usePriceStore (single currentPrice, single priceHistory)    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Current Limitations
| Component | Limitation | Impact |
|-----------|-----------|--------|
| `ingestor.py` | 하드코딩된 `btcusdt@trade` URL | 단일 심볼만 수집 |
| `ws.py` | 단일 `live_prices` 채널 | 모든 클라이언트가 동일 데이터 수신 |
| `usePriceStore.ts` | 단일 `currentPrice` 상태 | 다중 심볼 가격 저장 불가 |
| `CryptoChart.tsx` | 하드코딩된 BTCUSDT | 다른 심볼 차트 표시 불가 |

---

## 3. Target Architecture

### 3.1 High-Level Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MULTI-SYMBOL SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        BACKEND (FastAPI)                             │  │
│  │                                                                      │  │
│  │  Binance Combined Stream ─────→ MultiSymbolIngestor                 │  │
│  │  wss://stream.binance.com       ├── btcusdt@trade                   │  │
│  │  /stream?streams=...            ├── ethusdt@trade                   │  │
│  │                                 ├── bnbusdt@trade                   │  │
│  │                                 └── ...                              │  │
│  │                                       │                              │  │
│  │                                       ↓                              │  │
│  │                              ┌─────────────────┐                     │  │
│  │                              │  Redis Pub/Sub  │                     │  │
│  │                              │  ├── prices:BTCUSDT                   │  │
│  │                              │  ├── prices:ETHUSDT                   │  │
│  │                              │  └── prices:BNBUSDT                   │  │
│  │                              └────────┬────────┘                     │  │
│  │                                       │                              │  │
│  │                                       ↓                              │  │
│  │                         ┌─────────────────────────┐                  │  │
│  │                         │   ConnectionManager     │                  │  │
│  │                         │   ┌─────────────────┐   │                  │  │
│  │                         │   │ Client Sessions │   │                  │  │
│  │                         │   │ ├── client_1:   │   │                  │  │
│  │                         │   │ │   [BTC,ETH]   │   │                  │  │
│  │                         │   │ └── client_2:   │   │                  │  │
│  │                         │   │     [BTC,BNB]   │   │                  │  │
│  │                         │   └─────────────────┘   │                  │  │
│  │                         └────────────┬────────────┘                  │  │
│  │                                      │                               │  │
│  └──────────────────────────────────────┼───────────────────────────────┘  │
│                                         │                                  │
│  ┌──────────────────────────────────────┼───────────────────────────────┐  │
│  │                     FRONTEND (Next.js)                               │  │
│  │                                      ↓                               │  │
│  │         ┌──────────────────────────────────────────────┐            │  │
│  │         │           useMultiSymbolWebSocket            │            │  │
│  │         │  ├── subscribe(symbols: string[])            │            │  │
│  │         │  ├── unsubscribe(symbols: string[])          │            │  │
│  │         │  └── onMessage → useMultiPriceStore          │            │  │
│  │         └──────────────────────────────────────────────┘            │  │
│  │                              │                                       │  │
│  │                              ↓                                       │  │
│  │         ┌──────────────────────────────────────────────┐            │  │
│  │         │           useMultiPriceStore (Zustand)       │            │  │
│  │         │  prices: Map<symbol, { current, history }>   │            │  │
│  │         │  selectedSymbol: string                      │            │  │
│  │         │  subscribedSymbols: string[]                 │            │  │
│  │         └──────────────────────────────────────────────┘            │  │
│  │                              │                                       │  │
│  │         ┌────────────────────┴────────────────────┐                 │  │
│  │         ↓                                         ↓                 │  │
│  │  ┌─────────────┐                          ┌─────────────┐           │  │
│  │  │SymbolPanel  │                          │CryptoChart  │           │  │
│  │  │(multi-select)│                         │(dynamic)    │           │  │
│  │  └─────────────┘                          └─────────────┘           │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Specifications

---

## 4. Backend Architecture

### 4.1 MultiSymbolIngestor Service

**Location:** `backend/app/services/multi_ingestor.py`

#### 4.1.1 Design Principles
- Binance Combined Stream 사용 (단일 연결로 다중 심볼 수신)
- 동적 심볼 추가/제거 지원
- 심볼별 Redis 채널 분리

#### 4.1.2 Interface Definition

```python
from typing import Set, Dict, Any, Optional
from enum import Enum

class StreamType(Enum):
    TRADE = "trade"          # 개별 거래
    TICKER = "ticker"        # 24시간 티커
    MINI_TICKER = "miniTicker"  # 미니 티커

class MultiSymbolIngestor:
    """다중 심볼 Binance WebSocket 수집기"""

    def __init__(
        self,
        symbols: Optional[Set[str]] = None,
        stream_type: StreamType = StreamType.TRADE,
        redis_channel_prefix: str = "prices"
    ) -> None:
        """
        Args:
            symbols: 초기 구독 심볼 집합 (예: {"BTCUSDT", "ETHUSDT"})
            stream_type: 스트림 유형 (trade, ticker, miniTicker)
            redis_channel_prefix: Redis 채널 접두사
        """
        pass

    async def add_symbols(self, symbols: Set[str]) -> None:
        """심볼 동적 추가 (WebSocket 재연결 필요)"""
        pass

    async def remove_symbols(self, symbols: Set[str]) -> None:
        """심볼 동적 제거"""
        pass

    async def get_active_symbols(self) -> Set[str]:
        """현재 활성 심볼 목록 조회"""
        pass

    async def start(self) -> None:
        """수집기 시작"""
        pass

    async def stop(self) -> None:
        """수집기 중지"""
        pass
```

#### 4.1.3 Binance Combined Stream URL Format

```python
# 단일 스트림
"wss://stream.binance.com:9443/ws/btcusdt@trade"

# Combined Stream (권장)
"wss://stream.binance.com:9443/stream?streams=btcusdt@trade/ethusdt@trade/bnbusdt@trade"

# 동적 구독 (WebSocket 메시지)
{
    "method": "SUBSCRIBE",
    "params": ["btcusdt@trade", "ethusdt@trade"],
    "id": 1
}
```

#### 4.1.4 Message Processing Flow

```python
# Combined Stream 응답 형식
{
    "stream": "btcusdt@trade",
    "data": {
        "e": "trade",
        "s": "BTCUSDT",
        "p": "50000.00",
        ...
    }
}

# 정규화된 출력
{
    "symbol": "BTCUSDT",
    "price": 50000.00,
    "quantity": 0.5,
    "timestamp": 1706000000000,
    "trade_id": 12345,
    "is_buyer_maker": false
}
```

### 4.2 Redis Channel Strategy

#### 4.2.1 Channel Naming Convention

| Pattern | Example | Purpose |
|---------|---------|---------|
| `prices:{SYMBOL}` | `prices:BTCUSDT` | 개별 심볼 실시간 가격 |
| `prices:all` | `prices:all` | 모든 심볼 통합 (선택적) |
| `metadata:{SYMBOL}` | `metadata:BTCUSDT` | 심볼 메타데이터 |

#### 4.2.2 Channel Subscription Strategy

```python
# 클라이언트 구독 시나리오
Client A: subscribe ["BTCUSDT", "ETHUSDT"]
  → Redis channels: ["prices:BTCUSDT", "prices:ETHUSDT"]

Client B: subscribe ["BTCUSDT", "BNBUSDT"]
  → Redis channels: ["prices:BTCUSDT", "prices:BNBUSDT"]

# 서버 측 최적화: 심볼당 하나의 구독자만 유지
Active Redis subscriptions: ["prices:BTCUSDT", "prices:ETHUSDT", "prices:BNBUSDT"]
```

### 4.3 WebSocket Router Enhancement

**Location:** `backend/app/routers/ws.py`

#### 4.3.1 New Endpoint Design

```python
@router.websocket("/ws/prices")
async def websocket_prices(
    websocket: WebSocket,
    symbols: Optional[str] = Query(default=None)  # "BTCUSDT,ETHUSDT"
) -> None:
    """
    다중 심볼 실시간 가격 WebSocket

    Query params:
        symbols: 쉼표로 구분된 심볼 목록 (선택, 기본값: BTCUSDT)

    Client messages:
        {"type": "subscribe", "symbols": ["ETHUSDT", "BNBUSDT"]}
        {"type": "unsubscribe", "symbols": ["BNBUSDT"]}

    Server messages:
        {"type": "price", "symbol": "BTCUSDT", "price": 50000, ...}
        {"type": "subscribed", "symbols": ["BTCUSDT", "ETHUSDT"]}
        {"type": "error", "code": "INVALID_SYMBOL", "message": "..."}
    """
    pass
```

#### 4.3.2 ConnectionManager Enhancement

```python
class MultiSymbolConnectionManager:
    """다중 심볼 WebSocket 연결 관리자"""

    def __init__(self) -> None:
        # 클라이언트별 구독 심볼 추적
        self.client_subscriptions: Dict[WebSocket, Set[str]] = {}
        # 심볼별 구독 클라이언트 추적 (역인덱스)
        self.symbol_subscribers: Dict[str, Set[WebSocket]] = {}
        # Redis 구독 태스크
        self.redis_tasks: Dict[str, asyncio.Task] = {}

    async def subscribe(
        self,
        websocket: WebSocket,
        symbols: Set[str]
    ) -> Set[str]:
        """클라이언트를 심볼에 구독"""
        pass

    async def unsubscribe(
        self,
        websocket: WebSocket,
        symbols: Set[str]
    ) -> Set[str]:
        """클라이언트 구독 해제"""
        pass

    async def broadcast_to_symbol(
        self,
        symbol: str,
        message: Dict[str, Any]
    ) -> None:
        """특정 심볼 구독자에게만 브로드캐스트"""
        pass
```

### 4.4 REST API Extensions

#### 4.4.1 Supported Symbols Endpoint

```python
# GET /api/symbols
@router.get("/symbols")
async def get_supported_symbols() -> SupportedSymbolsResponse:
    """
    지원되는 심볼 목록 조회

    Returns:
        {
            "symbols": [
                {
                    "symbol": "BTCUSDT",
                    "base_asset": "BTC",
                    "quote_asset": "USDT",
                    "status": "active",
                    "icon": "btc"
                },
                ...
            ],
            "default_symbols": ["BTCUSDT", "ETHUSDT"]
        }
    """
    pass
```

#### 4.4.2 Multi-Symbol Candles Endpoint

```python
# GET /api/candles/batch?symbols=BTCUSDT,ETHUSDT&interval=1m&limit=100
@router.get("/candles/batch")
async def get_batch_candles(
    symbols: str = Query(..., description="쉼표로 구분된 심볼"),
    interval: str = Query(default="1m"),
    limit: int = Query(default=100, le=500)
) -> BatchCandlesResponse:
    """
    다중 심볼 캔들 데이터 일괄 조회

    Returns:
        {
            "data": {
                "BTCUSDT": { "candles": [...] },
                "ETHUSDT": { "candles": [...] }
            }
        }
    """
    pass
```

---

## 5. Frontend Architecture

### 5.1 State Management (Zustand)

**Location:** `frontend/store/useMultiPriceStore.ts`

#### 5.1.1 Store Interface

```typescript
interface SymbolPriceData {
  currentPrice: number;
  priceHistory: TradeData[];
  change24h: number;
  changePercent24h: number;
  lastUpdate: number;
}

interface MultiPriceStore {
  // State
  prices: Map<string, SymbolPriceData>;
  selectedSymbol: string;
  subscribedSymbols: string[];
  connectionStatus: ConnectionStatus;

  // Actions
  updatePrice: (symbol: string, data: TradeData) => void;
  setSelectedSymbol: (symbol: string) => void;
  addSubscription: (symbols: string[]) => void;
  removeSubscription: (symbols: string[]) => void;
  setStatus: (status: ConnectionStatus) => void;

  // Selectors (memoized)
  getPrice: (symbol: string) => SymbolPriceData | undefined;
  getSelectedPrice: () => SymbolPriceData | undefined;
}
```

#### 5.1.2 Implementation Pattern

```typescript
export const useMultiPriceStore = create<MultiPriceStore>((set, get) => ({
  prices: new Map(),
  selectedSymbol: 'BTCUSDT',
  subscribedSymbols: ['BTCUSDT'],
  connectionStatus: 'disconnected',

  updatePrice: (symbol, data) => {
    set((state) => {
      const newPrices = new Map(state.prices);
      const existing = newPrices.get(symbol) || {
        currentPrice: 0,
        priceHistory: [],
        change24h: 0,
        changePercent24h: 0,
        lastUpdate: 0,
      };

      newPrices.set(symbol, {
        ...existing,
        currentPrice: data.price,
        priceHistory: [...existing.priceHistory, data].slice(-1000),
        lastUpdate: Date.now(),
      });

      return { prices: newPrices };
    });
  },

  // ... other actions
}));

// Selector hooks for optimized re-renders
export const useSymbolPrice = (symbol: string) =>
  useMultiPriceStore((state) => state.prices.get(symbol));

export const useSelectedSymbolPrice = () =>
  useMultiPriceStore((state) =>
    state.prices.get(state.selectedSymbol)
  );
```

### 5.2 WebSocket Hook Enhancement

**Location:** `frontend/hooks/useMultiSymbolWebSocket.ts`

#### 5.2.1 Interface

```typescript
interface UseMultiSymbolWebSocketOptions {
  initialSymbols?: string[];
  reconnect?: boolean;
  maxReconnectAttempts?: number;
}

interface UseMultiSymbolWebSocketReturn {
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  isConnected: boolean;
  subscribedSymbols: string[];
}

export function useMultiSymbolWebSocket(
  options?: UseMultiSymbolWebSocketOptions
): UseMultiSymbolWebSocketReturn;
```

#### 5.2.2 Message Protocol

```typescript
// Client → Server
interface SubscribeMessage {
  type: 'subscribe';
  symbols: string[];
}

interface UnsubscribeMessage {
  type: 'unsubscribe';
  symbols: string[];
}

// Server → Client
interface PriceMessage {
  type: 'price';
  symbol: string;
  price: number;
  quantity: number;
  timestamp: number;
  trade_id: number;
  is_buyer_maker: boolean;
}

interface SubscriptionConfirmMessage {
  type: 'subscribed' | 'unsubscribed';
  symbols: string[];
}

interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
}
```

### 5.3 UI Components

#### 5.3.1 SymbolSelector Component

```typescript
// frontend/components/Symbol/SymbolSelector.tsx

interface SymbolSelectorProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  subscribedSymbols: string[];
}

/**
 * 드롭다운 또는 탭 형태의 심볼 선택기
 * - 현재 선택된 심볼 표시
 * - 구독 중인 심볼 목록
 * - 실시간 가격 미리보기
 */
export function SymbolSelector(props: SymbolSelectorProps): React.ReactElement;
```

#### 5.3.2 SymbolWatchlist Component

```typescript
// frontend/components/Symbol/SymbolWatchlist.tsx

interface WatchlistItem {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
}

interface SymbolWatchlistProps {
  symbols: string[];
  onAddSymbol: (symbol: string) => void;
  onRemoveSymbol: (symbol: string) => void;
  onSelectSymbol: (symbol: string) => void;
}

/**
 * 관심 심볼 목록 (사이드바)
 * - 실시간 가격 표시
 * - 24시간 변동률
 * - 심볼 추가/제거
 */
export function SymbolWatchlist(props: SymbolWatchlistProps): React.ReactElement;
```

#### 5.3.3 Enhanced CryptoChart

```typescript
// frontend/components/Chart/CryptoChart.tsx (Enhanced)

interface CryptoChartProps {
  symbol: string;  // 새로운 prop
  interval?: string;
}

/**
 * 동적 심볼 지원 차트
 * - symbol prop 변경 시 데이터 재로드
 * - 심볼별 캔들 데이터 캐싱
 */
export function CryptoChart({ symbol, interval }: CryptoChartProps): React.ReactElement;
```

---

## 6. Data Flow Diagrams

### 6.1 Symbol Subscription Flow

```
┌─────────┐     ┌────────────┐     ┌──────────┐     ┌───────┐
│ Client  │     │ WebSocket  │     │ Manager  │     │ Redis │
│ (React) │     │ (FastAPI)  │     │          │     │       │
└────┬────┘     └─────┬──────┘     └────┬─────┘     └───┬───┘
     │                │                  │               │
     │ connect()      │                  │               │
     │───────────────>│                  │               │
     │                │ register client  │               │
     │                │─────────────────>│               │
     │                │                  │               │
     │ subscribe      │                  │               │
     │ ["BTC","ETH"]  │                  │               │
     │───────────────>│                  │               │
     │                │ add subscriptions│               │
     │                │─────────────────>│               │
     │                │                  │ subscribe     │
     │                │                  │ prices:BTC    │
     │                │                  │──────────────>│
     │                │                  │ subscribe     │
     │                │                  │ prices:ETH    │
     │                │                  │──────────────>│
     │                │                  │               │
     │ {type:"subscribed",               │               │
     │  symbols:["BTC","ETH"]}           │               │
     │<───────────────│                  │               │
     │                │                  │               │
     │                │                  │   price:BTC   │
     │                │                  │<──────────────│
     │                │  broadcast BTC   │               │
     │                │<─────────────────│               │
     │ {type:"price", │                  │               │
     │  symbol:"BTC"} │                  │               │
     │<───────────────│                  │               │
```

### 6.2 Price Update Flow (Multi-Client)

```
┌─────────────┐     ┌──────────────┐     ┌───────┐     ┌───────────┐
│  Binance    │     │  Ingestor    │     │ Redis │     │  Manager  │
│  WebSocket  │     │              │     │       │     │           │
└──────┬──────┘     └──────┬───────┘     └───┬───┘     └─────┬─────┘
       │                   │                 │               │
       │ trade: BTCUSDT    │                 │               │
       │──────────────────>│                 │               │
       │                   │ publish         │               │
       │                   │ prices:BTCUSDT  │               │
       │                   │────────────────>│               │
       │                   │                 │ message       │
       │                   │                 │──────────────>│
       │                   │                 │               │
       │                   │                 │     ┌─────────┴─────────┐
       │                   │                 │     │ Check subscribers │
       │                   │                 │     │ for BTCUSDT       │
       │                   │                 │     └─────────┬─────────┘
       │                   │                 │               │
       │                   │                 │      ┌────────┴────────┐
       │                   │                 │      ↓                 ↓
       │                   │                 │  ┌────────┐      ┌────────┐
       │                   │                 │  │Client A│      │Client B│
       │                   │                 │  │[BTC,ETH]│     │[BTC,BNB]│
       │                   │                 │  └────────┘      └────────┘
       │                   │                 │    send           send
```

---

## 7. Configuration

### 7.1 Backend Configuration

```python
# backend/app/core/config.py

class Settings(BaseSettings):
    # Existing settings...

    # Multi-symbol settings
    DEFAULT_SYMBOLS: list[str] = ["BTCUSDT", "ETHUSDT", "BNBUSDT"]
    MAX_SYMBOLS_PER_CLIENT: int = 20
    MAX_TOTAL_SYMBOLS: int = 50
    SYMBOL_HISTORY_LIMIT: int = 1000

    # Redis channel settings
    REDIS_CHANNEL_PREFIX: str = "prices"

    # Binance settings
    BINANCE_WS_BASE: str = "wss://stream.binance.com:9443"
    BINANCE_STREAM_TYPE: str = "trade"  # trade, miniTicker, ticker
```

### 7.2 Frontend Configuration

```typescript
// frontend/config/symbols.ts

export const SYMBOL_CONFIG = {
  default: ['BTCUSDT', 'ETHUSDT'],
  maxSubscriptions: 10,
  historyLimit: 1000,
  updateThrottle: 100, // ms
} as const;

export const SUPPORTED_SYMBOLS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', icon: 'btc' },
  { symbol: 'ETHUSDT', name: 'Ethereum', icon: 'eth' },
  { symbol: 'BNBUSDT', name: 'BNB', icon: 'bnb' },
  { symbol: 'SOLUSDT', name: 'Solana', icon: 'sol' },
  { symbol: 'XRPUSDT', name: 'XRP', icon: 'xrp' },
  { symbol: 'ADAUSDT', name: 'Cardano', icon: 'ada' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', icon: 'doge' },
  { symbol: 'MATICUSDT', name: 'Polygon', icon: 'matic' },
  { symbol: 'DOTUSDT', name: 'Polkadot', icon: 'dot' },
  { symbol: 'AVAXUSDT', name: 'Avalanche', icon: 'avax' },
] as const;
```

---

## 8. Performance Considerations

### 8.1 Backend Optimizations

| Strategy | Description | Impact |
|----------|-------------|--------|
| Combined Stream | 단일 WS로 다중 심볼 수신 | 연결 수 감소 |
| Channel Filtering | 클라이언트별 필요 채널만 구독 | 네트워크 효율화 |
| Message Batching | 일정 간격으로 메시지 일괄 전송 | CPU 부하 감소 |
| Lazy Subscription | 클라이언트 요청 시에만 구독 | 리소스 절약 |

### 8.2 Frontend Optimizations

| Strategy | Description | Impact |
|----------|-------------|--------|
| Selective Subscription | Zustand 선택적 구독 | 불필요한 리렌더 방지 |
| History Limit | 심볼당 1000개 제한 | 메모리 사용량 제어 |
| Throttling | 가격 업데이트 100ms 스로틀 | UI 성능 향상 |
| Map Data Structure | Object 대신 Map 사용 | 조회 성능 O(1) |

### 8.3 Memory Estimation

```
Per Symbol:
- currentPrice: 8 bytes
- priceHistory (1000 items × ~100 bytes): ~100KB
- Metadata: ~1KB
- Total per symbol: ~101KB

For 10 symbols: ~1MB
For 50 symbols: ~5MB

Redis (server-side):
- Per message: ~200 bytes
- 1000 messages/sec × 10 symbols: ~2MB/sec throughput
```

---

## 9. Error Handling

### 9.1 Error Codes

| Code | Description | Client Action |
|------|-------------|---------------|
| `INVALID_SYMBOL` | 지원하지 않는 심볼 | 심볼 목록 재확인 |
| `MAX_SUBSCRIPTIONS` | 최대 구독 수 초과 | 일부 심볼 구독 해제 |
| `REDIS_ERROR` | Redis 연결 문제 | 재연결 대기 |
| `BINANCE_ERROR` | Binance API 오류 | 재시도 |

### 9.2 Graceful Degradation

```typescript
// Frontend fallback strategy
if (websocketError) {
  // 1. REST API polling fallback
  enablePollingMode();

  // 2. Show stale data indicator
  showStaleDataWarning();

  // 3. Attempt reconnection
  scheduleReconnect();
}
```

---

## 10. Migration Strategy

### 10.1 Phase 1: Backend Extension (Non-Breaking)

1. `MultiSymbolIngestor` 구현 (기존 `BinanceIngestor`와 병행)
2. 새 Redis 채널 구조 추가 (`prices:{SYMBOL}`)
3. `ConnectionManager` 확장 (하위 호환 유지)
4. 새 WebSocket 쿼리 파라미터 지원

### 10.2 Phase 2: Frontend Enhancement

1. `useMultiPriceStore` 구현
2. `useMultiSymbolWebSocket` 훅 개발
3. 기존 컴포넌트 점진적 마이그레이션
4. 새 UI 컴포넌트 추가

### 10.3 Phase 3: Integration & Testing

1. 통합 테스트
2. 성능 테스트 (50+ 심볼)
3. 문서화
4. 기존 단일 심볼 API 제거 (선택적)

---

## 11. API Summary

### 11.1 REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/symbols` | 지원 심볼 목록 |
| GET | `/api/candles?symbol=X` | 단일 심볼 캔들 (기존) |
| GET | `/api/candles/batch?symbols=X,Y` | 다중 심볼 캔들 |

### 11.2 WebSocket Messages

| Direction | Type | Payload |
|-----------|------|---------|
| C→S | `subscribe` | `{ symbols: string[] }` |
| C→S | `unsubscribe` | `{ symbols: string[] }` |
| S→C | `price` | `{ symbol, price, quantity, ... }` |
| S→C | `subscribed` | `{ symbols: string[] }` |
| S→C | `unsubscribed` | `{ symbols: string[] }` |
| S→C | `error` | `{ code, message }` |

---

## 12. Appendix

### 12.1 Supported Symbols (Initial)

```
Major: BTCUSDT, ETHUSDT, BNBUSDT
DeFi: UNIUSDT, AAVEUSDT, LINKUSDT
Layer1: SOLUSDT, AVAXUSDT, ADAUSDT, DOTUSDT
Meme: DOGEUSDT, SHIBUSDT
Stablecoin pairs: BTCBUSD, ETHBUSD
```

### 12.2 File Structure Changes

```
backend/
├── app/
│   ├── services/
│   │   ├── ingestor.py          # (기존) 단일 심볼
│   │   └── multi_ingestor.py    # (신규) 다중 심볼
│   ├── routers/
│   │   ├── ws.py                # (확장) 다중 심볼 지원
│   │   ├── candles.py           # (확장) batch endpoint
│   │   └── symbols.py           # (신규) 심볼 목록 API
│   └── schemas/
│       └── symbols.py           # (신규) 심볼 관련 Pydantic 모델

frontend/
├── store/
│   ├── usePriceStore.ts         # (기존) 하위 호환용
│   └── useMultiPriceStore.ts    # (신규) 다중 심볼
├── hooks/
│   ├── useWebSocket.ts          # (기존) 하위 호환용
│   └── useMultiSymbolWebSocket.ts # (신규) 다중 심볼
├── components/
│   ├── Symbol/
│   │   ├── SymbolSelector.tsx   # (신규)
│   │   └── SymbolWatchlist.tsx  # (신규)
│   └── Chart/
│       └── CryptoChart.tsx      # (확장) symbol prop
└── config/
    └── symbols.ts               # (신규) 심볼 설정
```

---

## 13. Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Architect | | | |
| Tech Lead | | | |
| Product Owner | | | |

---

**End of Specification Document**
