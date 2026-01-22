# Frontend Hooks 문서

QuantBoard V1 프론트엔드 커스텀 훅에 대한 상세 문서입니다.

## 목차

- [개요](#개요)
- [useWebSocket](#usewebsocket)
- [지수 백오프 재연결](#지수-백오프-재연결)
- [에러 처리](#에러-처리)
- [사용 예시](#사용-예시)

---

## 개요

`frontend/hooks/` 폴더에는 **1개의 커스텀 훅**이 있습니다:

- `useWebSocket.ts` - WebSocket 실시간 가격 데이터 수집

추가로 **4개의 Zustand 스토어**가 훅 패턴으로 사용됩니다:
- `usePriceStore` - 실시간 가격 상태
- `useChartStore` - 차트 설정
- `useAuthStore` - 인증 상태
- `useCommunityStore` - 커뮤니티 콘텐츠

---

## useWebSocket

**파일:** `frontend/hooks/useWebSocket.ts`

WebSocket 연결을 관리하고 실시간 가격 데이터를 수신하는 훅

### 인터페이스

```typescript
interface UseWebSocketOptions {
  url?: string;                      // WebSocket 서버 URL
  reconnect?: boolean;               // 자동 재연결 활성화
  maxReconnectAttempts?: number;     // 최대 재연결 시도 횟수
  reconnectInterval?: number;        // 초기 재연결 간격 (ms)
}

interface UseWebSocketReturn {
  connect: () => void;               // 수동 연결 함수
  disconnect: () => void;            // 수동 연결 해제 함수
  isConnected: boolean;              // 연결 상태
}
```

### 기본값

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `url` | `ws://localhost:8000/ws/prices` | WebSocket 서버 URL |
| `reconnect` | `true` | 자동 재연결 활성화 |
| `maxReconnectAttempts` | `Infinity` | 최대 재연결 시도 횟수 |
| `reconnectInterval` | `1000` | 초기 재연결 간격 (1초) |

### 기본 사용법

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

function PriceDisplay() {
  const { connect, disconnect, isConnected } = useWebSocket();

  return (
    <div>
      <p>연결 상태: {isConnected ? '연결됨' : '연결 끊김'}</p>
      <button onClick={connect}>연결</button>
      <button onClick={disconnect}>연결 해제</button>
    </div>
  );
}
```

### 옵션 사용

```typescript
const { isConnected } = useWebSocket({
  url: 'ws://custom-server:8000/ws/prices',
  reconnect: true,
  maxReconnectAttempts: 10,
  reconnectInterval: 2000,
});
```

---

## 내부 구현

### Refs 사용

```typescript
const wsRef = useRef<WebSocket | null>(null);
const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
const reconnectAttemptsRef = useRef(0);
const shouldReconnectRef = useRef(reconnect);
const isManualCloseRef = useRef(false);
```

**설명:**
- `wsRef`: WebSocket 인스턴스 저장
- `reconnectTimeoutRef`: 재연결 타이머
- `reconnectAttemptsRef`: 재연결 시도 횟수
- `shouldReconnectRef`: 재연결 여부 플래그
- `isManualCloseRef`: 수동 종료 플래그 (자동 재연결 방지)

### 상태 업데이트 흐름

```
WebSocket 메시지 수신
    ↓
JSON 파싱 → 데이터 검증 (price + symbol 확인)
    ↓
usePriceStore.updatePrice() 호출
    ↓
Zustand 스토어 업데이트:
  - currentPrice 업데이트
  - priceHistory에 추가 (최대 1000개 유지)
```

---

## 지수 백오프 재연결

비정상 연결 종료 시 자동으로 재연결을 시도합니다.

### 재연결 간격 계산

```typescript
const delay = Math.min(
  reconnectInterval * Math.pow(2, reconnectAttemptsRef.current),
  30000  // 최대 30초
);
```

### 재연결 시간 예시

| 시도 | 대기 시간 |
|------|----------|
| 1차 | 1,000ms (1초) |
| 2차 | 2,000ms (2초) |
| 3차 | 4,000ms (4초) |
| 4차 | 8,000ms (8초) |
| 5차 | 16,000ms (16초) |
| 6차+ | 30,000ms (30초, 상한선) |

### 재연결 로직

```typescript
const attemptReconnect = useCallback(() => {
  // 최대 시도 횟수 확인
  if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
    console.error('[WebSocket] Max reconnect attempts reached');
    usePriceStore.getState().setStatus('error');
    return;
  }

  // 지수 백오프 계산
  const delay = Math.min(
    reconnectInterval * Math.pow(2, reconnectAttemptsRef.current),
    30000
  );

  reconnectAttemptsRef.current += 1;

  console.log(
    `[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`
  );

  reconnectTimeoutRef.current = setTimeout(() => {
    connect();
  }, delay);
}, [connect, reconnectInterval, maxReconnectAttempts]);
```

---

## 에러 처리

### WebSocket 이벤트 핸들러

#### onopen - 연결 성공

```typescript
ws.onopen = () => {
  console.log('[WebSocket] Connected successfully');
  usePriceStore.getState().setStatus('connected');
  reconnectAttemptsRef.current = 0;  // 재연결 시도 횟수 초기화
};
```

#### onmessage - 메시지 수신

```typescript
ws.onmessage = (event) => {
  try {
    const data: TradeData = JSON.parse(event.data);

    // 데이터 검증
    if (data && typeof data.price === 'number' && data.symbol) {
      usePriceStore.getState().updatePrice(data);
    } else {
      console.warn('[WebSocket] Invalid data format:', data);
    }
  } catch (error) {
    console.error('[WebSocket] Failed to parse message:', error);
  }
};
```

#### onclose - 연결 종료

```typescript
ws.onclose = (event) => {
  const closeCodeMessages: Record<number, string> = {
    1000: 'Normal Closure',
    1001: 'Going Away',
    1002: 'Protocol Error',
    1003: 'Unsupported Data',
    1006: 'Abnormal Closure (no close frame)',
    1007: 'Invalid Data',
    1008: 'Policy Violation',
    1009: 'Message Too Big',
    1010: 'Mandatory Extension',
    1011: 'Internal Server Error',
    1015: 'TLS Handshake Failure',
  };

  usePriceStore.getState().setStatus('disconnected');

  // 비정상 종료 + 수동 종료 아님 → 자동 재연결
  if (shouldReconnectRef.current && !isManualCloseRef.current) {
    attemptReconnect();
  }
};
```

#### onerror - 에러 발생

```typescript
ws.onerror = (error) => {
  const state = ws.readyState;
  const stateText =
    state === WebSocket.CONNECTING ? 'CONNECTING' :
    state === WebSocket.OPEN ? 'OPEN' :
    state === WebSocket.CLOSING ? 'CLOSING' :
    state === WebSocket.CLOSED ? 'CLOSED' : 'UNKNOWN';

  console.error('[WebSocket] Error occurred:', {
    url,
    readyState: stateText,
    message: 'WebSocket connection error. Check if backend server is running.',
  });

  usePriceStore.getState().setStatus('error');
};
```

### 중복 연결 방지

```typescript
const connect = useCallback(() => {
  // 이미 CONNECTING 또는 OPEN 상태면 새 연결 생성 방지
  if (wsRef.current?.readyState === WebSocket.CONNECTING ||
      wsRef.current?.readyState === WebSocket.OPEN) {
    return;
  }

  // ... 새 연결 생성
}, [url]);
```

### 안전한 연결 해제

```typescript
const disconnect = useCallback(() => {
  isManualCloseRef.current = true;       // 자동 재연결 비활성화
  shouldReconnectRef.current = false;    // 재연결 플래그 해제

  // 대기 중인 재연결 타이머 취소
  if (reconnectTimeoutRef.current) {
    clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = null;
  }

  // WebSocket 연결 종료
  if (wsRef.current) {
    wsRef.current.close();
    wsRef.current = null;
  }

  usePriceStore.getState().setStatus('disconnected');
}, []);
```

---

## 라이프사이클 관리

```typescript
useEffect(() => {
  connect();  // 마운트 시 연결

  return () => {
    disconnect();  // 언마운트 시 정리
  };
}, [connect, disconnect]);
```

---

## 사용 예시

### MainLayout에서 전역 초기화

```typescript
// components/Layout/MainLayout.tsx
import { useWebSocket } from '@/hooks/useWebSocket';

export function MainLayout({ children }) {
  useWebSocket(); // 전역 WebSocket 연결

  return (
    <div>
      <TopNav />
      <main>{children}</main>
    </div>
  );
}
```

### 차트에서 가격 데이터 구독

```typescript
// components/Chart/CryptoChart.tsx
import { usePriceStore } from '@/store/usePriceStore';

export function CryptoChart() {
  // Zustand 선택적 구독
  const currentPrice = usePriceStore((state) => state.currentPrice);
  const connectionStatus = usePriceStore((state) => state.connectionStatus);

  // subscribe 패턴으로 실시간 업데이트 감지
  useEffect(() => {
    const unsubscribe = usePriceStore.subscribe((state) => {
      const lastTrade = state.priceHistory[state.priceHistory.length - 1];
      if (lastTrade) {
        updateChartWithTrade(lastTrade);
      }
    });

    return () => unsubscribe();
  }, []);

  return <div>현재 가격: ${currentPrice}</div>;
}
```

### 연결 상태 표시

```typescript
import { usePriceStore } from '@/store/usePriceStore';

function ConnectionIndicator() {
  const status = usePriceStore((state) => state.connectionStatus);

  const statusColors = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500',
    disconnected: 'bg-gray-500',
    error: 'bg-red-500',
  };

  return (
    <span className={`${statusColors[status]} rounded-full w-3 h-3`} />
  );
}
```

---

## 데이터 타입

### TradeData

```typescript
interface TradeData {
  symbol: string;      // 거래 쌍 (예: 'BTCUSDT')
  price: number;       // 현재 가격
  quantity: number;    // 거래량
  timestamp: number;   // Unix timestamp (ms)
  trade_id: number;    // 거래 ID
  is_buyer_maker: boolean;
}
```

### ConnectionStatus

```typescript
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
```

---

## 데이터 흐름

```
┌─────────────────────────┐
│  Binance WebSocket      │ (백엔드 → 시세 스트림)
└────────────┬────────────┘
             │
             ↓
┌─────────────────────────┐
│  Backend (FastAPI)      │
│  Redis Pub/Sub          │
└────────────┬────────────┘
             │
             ↓
┌─────────────────────────┐
│  Frontend WebSocket     │
│  /ws/prices             │
└────────────┬────────────┘
             │
             ↓
┌─────────────────────────┐
│  useWebSocket 훅        │
│  - 연결 관리            │
│  - 메시지 파싱          │
│  - 자동 재연결          │
└────────────┬────────────┘
             │
             ↓
┌─────────────────────────┐
│  usePriceStore          │
│  - currentPrice 업데이트│
│  - priceHistory 유지    │
└────────────┬────────────┘
             │
             ↓
┌─────────────────────────┐
│  UI 컴포넌트들          │
│  - MarketTicker         │
│  - CryptoChart          │
│  - TradingChart         │
└─────────────────────────┘
```

---

## 성능 최적화

### getState() 패턴

```typescript
// ✅ 올바른 방법: 무한 루프 방지
usePriceStore.getState().setStatus('connecting');
usePriceStore.getState().updatePrice(data);

// ❌ 잘못된 방법: 무한 루프 위험
useEffect(() => {
  // setStatus가 상태를 변경하면 리렌더링 → 다시 setStatus 호출
  usePriceStore((s) => s.setStatus)('connecting');
}, []);
```

### 선택적 구독

```typescript
// ✅ 필요한 상태만 구독 (최적)
const currentPrice = usePriceStore((state) => state.currentPrice);

// ❌ 전체 상태 구독 (불필요한 리렌더링)
const store = usePriceStore();
```

### 히스토리 크기 제한

```typescript
// usePriceStore 내부
updatePrice: (data) => set((state) => ({
  currentPrice: data.price,
  priceHistory: [...state.priceHistory, data].slice(-1000), // 최대 1000개
}))
```

---

## 트러블슈팅

### 연결이 안 됨

1. 백엔드 서버가 실행 중인지 확인
2. `REDIS_ENABLED=true`로 설정되었는지 확인
3. Redis 서버가 실행 중인지 확인
4. 브라우저 콘솔에서 WebSocket 에러 확인

### 연결이 자주 끊김

1. 네트워크 상태 확인
2. 백엔드 로그 확인
3. `maxReconnectAttempts` 값 조정

### 데이터가 업데이트되지 않음

1. `usePriceStore` 구독 방식 확인
2. 선택적 구독 사용 여부 확인
3. 컴포넌트가 마운트되었는지 확인

---

**Last Updated:** 2026-01-23
