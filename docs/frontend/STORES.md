# Frontend Zustand Stores 문서

QuantBoard V1 프론트엔드 Zustand 스토어에 대한 상세 문서입니다.

## 목차

- [개요](#개요)
- [usePriceStore](#usepricestore)
- [useChartStore](#usechartstore)
- [useAuthStore](#useauthstore)
- [useCommunityStore](#usecommunitystore)
- [패턴 가이드](#패턴-가이드)
- [성능 최적화](#성능-최적화)

---

## 개요

### 스토어 목록

| 스토어 | 파일 | persist | 용도 |
|--------|------|---------|------|
| `usePriceStore` | `store/usePriceStore.ts` | No | 실시간 가격 데이터 |
| `useChartStore` | `store/useChartStore.ts` | Yes | 차트 지표 설정 |
| `useAuthStore` | `store/useAuthStore.ts` | Yes (토큰만) | 사용자 인증 |
| `useCommunityStore` | `store/useCommunityStore.ts` | No | 게시글/댓글 |

### Zustand 선택 이유

- **간단한 API**: Redux 대비 보일러플레이트 최소화
- **선택적 구독**: 필요한 상태만 구독하여 리렌더링 최소화
- **미들웨어 지원**: persist, devtools 등
- **TypeScript 지원**: 완벽한 타입 추론

---

## usePriceStore

**파일:** `frontend/store/usePriceStore.ts`

실시간 가격 데이터를 관리하는 스토어

### 상태 구조

```typescript
interface PriceStore {
  currentPrice: number;              // 최신 가격
  priceHistory: TradeData[];         // 거래 히스토리 (최대 1000개)
  connectionStatus: ConnectionStatus; // WebSocket 연결 상태
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface TradeData {
  symbol: string;
  price: number;
  quantity: number;
  timestamp: number;
  trade_id: number;
  is_buyer_maker: boolean;
}
```

### 액션

| 액션 | 시그니처 | 설명 |
|------|----------|------|
| `updatePrice` | `(data: TradeData) => void` | 가격 업데이트 및 히스토리 추가 |
| `setStatus` | `(status: ConnectionStatus) => void` | 연결 상태 변경 |
| `clearHistory` | `() => void` | 히스토리 및 가격 초기화 |

### 사용 예시

```typescript
import { usePriceStore } from '@/store/usePriceStore';

// 선택적 구독 (권장)
function PriceDisplay() {
  const currentPrice = usePriceStore((state) => state.currentPrice);
  const status = usePriceStore((state) => state.connectionStatus);

  return (
    <div>
      <p>${currentPrice.toLocaleString()}</p>
      <p>상태: {status}</p>
    </div>
  );
}

// 액션 호출 (getState 패턴)
usePriceStore.getState().updatePrice({
  symbol: 'BTCUSDT',
  price: 43500,
  quantity: 1.5,
  timestamp: Date.now(),
  trade_id: 12345,
  is_buyer_maker: false,
});

// subscribe 패턴 (차트 업데이트용)
useEffect(() => {
  const unsubscribe = usePriceStore.subscribe((state) => {
    const lastTrade = state.priceHistory[state.priceHistory.length - 1];
    if (lastTrade) {
      updateChartWithTrade(lastTrade);
    }
  });
  return () => unsubscribe();
}, []);
```

### 특징

- **히스토리 크기 제한**: 최대 1000개 유지
- **영속성 없음**: 실시간 데이터이므로 localStorage 저장 안 함

---

## useChartStore

**파일:** `frontend/store/useChartStore.ts`

차트 설정 및 지표를 관리하는 스토어 (가장 복잡)

### 상태 구조

```typescript
interface ChartStore {
  // 기본 설정
  symbol: string;              // 거래 심볼 (기본: 'BTCUSDT')
  interval: TimeInterval;      // 시간 간격
  loading: boolean;
  error: string | null;

  // 오버레이 지표
  movingAverages: MovingAverageConfig[];  // 최대 10개
  ichimoku: IchimokuConfig;
  volume: VolumeConfig;
  bollingerBands: BollingerBandsConfig;
  vwap: VWAPConfig;
  supertrend: SupertrendConfig;
  emaRibbon: EMARibbonConfig;
  parabolicSAR: ParabolicSARConfig;

  // 오실레이터 지표
  rsiConfigs: RSIConfig[];     // 최대 5개
  showRSIPanel: boolean;
  macd: MACDConfig;
  stochastic: StochasticConfig;
  atr: ATRConfig;
  adx: ADXConfig;
  obv: OBVConfig;

  // 드로잉 도구
  activeDrawingTool: DrawingToolType | null;
  drawings: DrawingObject[];
  drawingColor: string;
  drawingLineWidth: number;
}

type TimeInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
```

### 지표 설정 인터페이스

```typescript
interface MovingAverageConfig {
  id: string;
  type: 'SMA' | 'EMA';
  period: number;
  color: string;
  enabled: boolean;
}

interface RSIConfig {
  id: string;
  period: number;
  color: string;
  overbought: number;
  oversold: number;
  enabled: boolean;
}

interface IchimokuConfig {
  enabled: boolean;
  conversionPeriod: number;
  basePeriod: number;
  spanBPeriod: number;
  displacement: number;
  colors: {
    conversion: string;
    base: string;
    spanA: string;
    spanB: string;
    lagging: string;
  };
}

// ... 기타 지표 설정
```

### 주요 액션

**기본 액션:**
```typescript
setSymbol(symbol: string)      // 심볼 변경
setInterval(interval)          // 시간 간격 변경
setLoading(loading)
setError(error)
reset()                        // 모든 설정 기본값으로
```

**이동평균 관리:**
```typescript
addMovingAverage(type, period)    // 최대 10개 제한
removeMovingAverage(id)
updateMovingAverage(id, updates)
toggleMovingAverage(id)           // on/off 토글
```

**RSI 관리:**
```typescript
addRSI(period)                 // 최대 5개 제한
removeRSI(id)
updateRSI(id, updates)
toggleRSI(id)
setShowRSIPanel(show)
```

**기타 지표:**
```typescript
updateIchimoku(updates) / toggleIchimoku()
updateMACD(updates) / toggleMACD()
updateBollingerBands(updates) / toggleBollingerBands()
updateVWAP(updates) / toggleVWAP()
updateSupertrend(updates) / toggleSupertrend()
updateStochastic(updates) / toggleStochastic()
updateATR(updates) / toggleATR()
updateADX(updates) / toggleADX()
updateOBV(updates) / toggleOBV()
updateParabolicSAR(updates) / toggleParabolicSAR()
updateEMARibbon(updates) / toggleEMARibbon()
```

**드로잉 도구:**
```typescript
setActiveDrawingTool(tool)
addDrawing(drawing)         // 자동 ID 생성
removeDrawing(id)
updateDrawing(id, updates)
clearAllDrawings()
setDrawingColor(color)
setDrawingLineWidth(width)
```

### 셀렉터

```typescript
// 활성화된 이동평균만
const enabledMAs = useChartStore(selectEnabledMAs);

// 활성화된 RSI만
const enabledRSIs = useChartStore(selectEnabledRSIs);

// 서브 패널 표시 여부
const hasSubPanels = useChartStore(selectHasSubPanels);
```

### persist 설정

```typescript
persist(
  (set, get) => ({ /* actions */ }),
  {
    name: 'chart-settings',
    partialize: (state) => ({
      // 저장할 상태만 선택
      movingAverages: state.movingAverages,
      rsiConfigs: state.rsiConfigs,
      showRSIPanel: state.showRSIPanel,
      ichimoku: state.ichimoku,
      // ... 기타 지표 설정
      drawings: state.drawings,
      drawingColor: state.drawingColor,
      // symbol, interval, loading, error는 저장 안 함
    }),
  }
)
```

### 사용 예시

```typescript
import { useChartStore } from '@/store/useChartStore';

function ChartControls() {
  const symbol = useChartStore((s) => s.symbol);
  const interval = useChartStore((s) => s.interval);
  const setSymbol = useChartStore((s) => s.setSymbol);
  const setInterval = useChartStore((s) => s.setInterval);

  return (
    <div>
      <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
        <option value="BTCUSDT">BTC/USDT</option>
        <option value="ETHUSDT">ETH/USDT</option>
      </select>
      <select value={interval} onChange={(e) => setInterval(e.target.value)}>
        <option value="1m">1분</option>
        <option value="1h">1시간</option>
      </select>
    </div>
  );
}
```

---

## useAuthStore

**파일:** `frontend/store/useAuthStore.ts`

사용자 인증 상태를 관리하는 스토어

### 상태 구조

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface User {
  id: number;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  is_verified: boolean;
  created_at: string;
}
```

### 액션

| 액션 | 시그니처 | 설명 |
|------|----------|------|
| `login` | `(email, password) => Promise<void>` | 로그인 |
| `register` | `(email, username, password, displayName) => Promise<void>` | 회원가입 |
| `logout` | `() => Promise<void>` | 로그아웃 |
| `refreshToken` | `() => Promise<void>` | 토큰 갱신 |
| `checkAuth` | `() => Promise<void>` | 인증 상태 확인 |
| `updateProfile` | `(data) => Promise<void>` | 프로필 수정 |
| `setTokens` | `(accessToken) => void` | 토큰 설정 |

### 인증 흐름

```typescript
// 로그인
login: async (email, password) => {
  set({ isLoading: true });
  try {
    const response = await authApi.login(email, password);
    api.setAccessToken(response.access_token);
    set({
      user: response.user,
      accessToken: response.access_token,
      isAuthenticated: true,
      isLoading: false,
    });
  } catch (error) {
    set({ isLoading: false });
    throw error;
  }
}

// 인증 확인 (앱 초기화 시)
checkAuth: async () => {
  const { accessToken } = get();
  if (!accessToken) {
    set({ isLoading: false, isAuthenticated: false });
    return;
  }

  set({ isLoading: true });
  api.setAccessToken(accessToken);

  try {
    const user = await authApi.me();
    set({ user, isAuthenticated: true, isLoading: false });
  } catch {
    // 토큰 갱신 시도
    try {
      await get().refreshToken();
      const user = await authApi.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      // 최종 실패 → 로그아웃
      api.setAccessToken(null);
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }
}
```

### persist 설정

```typescript
persist(
  (set, get) => ({ /* actions */ }),
  {
    name: 'auth-storage',
    partialize: (state) => ({
      accessToken: state.accessToken,
      // user, isLoading, isAuthenticated는 저장 안 함
    }),
  }
)
```

### 사용 예시

```typescript
import { useAuthStore } from '@/store/useAuthStore';

// 인증 상태 확인
function AuthGuard({ children }) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  return children;
}

// 로그인 폼
function LoginForm() {
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const handleSubmit = async (email, password) => {
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (error) {
      setError('로그인 실패');
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## useCommunityStore

**파일:** `frontend/store/useCommunityStore.ts`

커뮤니티 게시글과 댓글을 관리하는 스토어

### 상태 구조

```typescript
interface CommunityState {
  // 게시글
  posts: PostListItem[];
  currentPost: Post | null;
  isLoading: boolean;
  filters: PostFilters;
  pagination: {
    skip: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };

  // 댓글
  comments: Comment[];
  commentsTotal: number;

  // 메타데이터
  categories: Category[];
  popularTags: Tag[];
}

interface PostFilters {
  category?: string;
  tag?: string;
  author?: string;
  sort?: 'latest' | 'trending' | 'top';
  search?: string;
}
```

### 게시글 액션

```typescript
// 게시글 목록 조회 (무한 스크롤)
fetchPosts: async (reset?: boolean) => {
  const { filters, pagination } = get();
  const skip = reset ? 0 : pagination.skip;

  set({ isLoading: true });

  const response = await postsApi.list({
    ...filters,
    skip,
    limit: pagination.limit,
  });

  set({
    posts: reset ? response.items : [...get().posts, ...response.items],
    pagination: {
      ...pagination,
      skip: skip + response.items.length,
      total: response.total,
      hasMore: skip + response.items.length < response.total,
    },
    isLoading: false,
  });
}

// 게시글 상세 조회
fetchPost: async (id: number) => {
  set({ isLoading: true });
  const post = await postsApi.get(id);
  set({ currentPost: post, isLoading: false });
}

// 게시글 좋아요 토글
toggleLike: async (postId: number) => {
  const { posts, currentPost } = get();
  const response = await postsApi.toggleLike(postId);

  // posts와 currentPost 모두 업데이트 (일관성 유지)
  set({
    posts: posts.map((p) =>
      p.id === postId
        ? { ...p, is_liked: response.is_liked, like_count: response.like_count }
        : p
    ),
  });

  if (currentPost?.id === postId) {
    set({
      currentPost: {
        ...currentPost,
        is_liked: response.is_liked,
        like_count: response.like_count,
      },
    });
  }
}
```

### 댓글 액션

```typescript
// 댓글 목록 조회
fetchComments: async (postId: number) => {
  const response = await commentsApi.list(postId);
  set({ comments: response.items, commentsTotal: response.total });
}

// 댓글 작성 (대댓글 지원)
addComment: async (postId: number, content: string, parentId?: number) => {
  await commentsApi.create(postId, { content, parent_id: parentId });
  await get().fetchComments(postId);

  // 댓글 수 증가
  const { currentPost } = get();
  if (currentPost?.id === postId) {
    set({
      currentPost: {
        ...currentPost,
        comment_count: currentPost.comment_count + 1,
      },
    });
  }
}

// 댓글 좋아요 토글 (트리 구조 업데이트)
toggleCommentLike: async (commentId: number) => {
  const response = await commentsApi.toggleLike(commentId);

  set({
    comments: updateCommentInTree(get().comments, commentId, {
      is_liked: response.is_liked,
      like_count: response.like_count,
    }),
  });
}
```

### 트리 업데이트 헬퍼

```typescript
function updateCommentInTree(
  comments: Comment[],
  commentId: number,
  updates: Partial<Comment>
): Comment[] {
  return comments.map((comment) => {
    if (comment.id === commentId) {
      return { ...comment, ...updates };
    }
    // 자식 댓글 재귀 처리
    if (comment.replies.length > 0) {
      return {
        ...comment,
        replies: updateCommentInTree(comment.replies, commentId, updates),
      };
    }
    return comment;
  });
}
```

### 사용 예시

```typescript
import { useCommunityStore } from '@/store/useCommunityStore';

// 게시글 목록
function PostList() {
  const posts = useCommunityStore((s) => s.posts);
  const hasMore = useCommunityStore((s) => s.pagination.hasMore);
  const fetchPosts = useCommunityStore((s) => s.fetchPosts);
  const toggleLike = useCommunityStore((s) => s.toggleLike);

  useEffect(() => {
    fetchPosts(true); // 초기 로드
  }, []);

  const loadMore = () => {
    if (hasMore) fetchPosts(false);
  };

  return (
    <div>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLike={() => toggleLike(post.id)}
        />
      ))}
      {hasMore && <button onClick={loadMore}>더 보기</button>}
    </div>
  );
}

// 댓글 섹션
function CommentSection({ postId }) {
  const comments = useCommunityStore((s) => s.comments);
  const fetchComments = useCommunityStore((s) => s.fetchComments);
  const addComment = useCommunityStore((s) => s.addComment);

  useEffect(() => {
    fetchComments(postId);
  }, [postId]);

  const handleSubmit = async (content: string) => {
    await addComment(postId, content);
  };

  return (
    <div>
      <CommentForm onSubmit={handleSubmit} />
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
}
```

---

## 패턴 가이드

### 1. 선택적 구독 (Selective Subscription)

```typescript
// ✅ 권장: 필요한 상태만 구독
const currentPrice = usePriceStore((state) => state.currentPrice);

// ❌ 비권장: 전체 상태 구독 (불필요한 리렌더링)
const store = usePriceStore();
```

### 2. getState() 패턴

```typescript
// ✅ 컴포넌트 외부에서 상태 접근
usePriceStore.getState().updatePrice(data);

// ✅ useCallback/useEffect 내부에서 의존성 최소화
const handleClick = useCallback(() => {
  const { currentPrice } = usePriceStore.getState();
  console.log(currentPrice);
}, []); // 의존성 없음
```

### 3. subscribe() 패턴

```typescript
// 상태 변경 수동 감지 (차트 업데이트 등)
useEffect(() => {
  const unsubscribe = usePriceStore.subscribe((state) => {
    updateChart(state.priceHistory);
  });
  return () => unsubscribe();
}, []);
```

### 4. partialize 미들웨어

```typescript
persist(
  (set, get) => ({ /* state & actions */ }),
  {
    name: 'store-key',
    partialize: (state) => ({
      // 저장할 상태만 선택
      settings: state.settings,
      // 휘발성 상태는 제외
      // loading, error 등
    }),
  }
)
```

---

## 성능 최적화

### 1. 리렌더링 최소화

```typescript
// 각 상태를 개별 선택자로 분리
const price = usePriceStore((s) => s.currentPrice);
const status = usePriceStore((s) => s.connectionStatus);

// vs 하나의 객체로 반환 (항상 새 객체 → 매번 리렌더)
const { price, status } = usePriceStore((s) => ({
  price: s.currentPrice,
  status: s.connectionStatus,
}));
```

### 2. shallow 비교

```typescript
import { shallow } from 'zustand/shallow';

// 배열/객체 반환 시 shallow 비교 사용
const [price, status] = usePriceStore(
  (s) => [s.currentPrice, s.connectionStatus],
  shallow
);
```

### 3. 메모이제이션 셀렉터

```typescript
// 스토어 정의 시 셀렉터 추가
const selectEnabledMAs = (state) =>
  state.movingAverages.filter((ma) => ma.enabled);

// 사용
const enabledMAs = useChartStore(selectEnabledMAs);
```

### 4. 배치 업데이트

```typescript
// ✅ 단일 set 호출로 여러 상태 업데이트
set({
  loading: false,
  data: response.data,
  error: null,
});

// ❌ 여러 번의 set 호출 (불필요한 리렌더)
set({ loading: false });
set({ data: response.data });
set({ error: null });
```

---

## 스토어 비교표

| 특성 | usePriceStore | useChartStore | useAuthStore | useCommunityStore |
|------|---------------|---------------|--------------|-------------------|
| **데이터 타입** | 실시간 | 설정 | 인증 | 콘텐츠 |
| **persist** | No | Yes | Yes (토큰만) | No |
| **상태 크기** | 작음 | 큼 | 작음 | 중간 |
| **업데이트 빈도** | 매우 높음 | 낮음 | 낮음 | 중간 |
| **주요 사용처** | 차트, 티커 | TradingChart | 인증 가드 | 커뮤니티 |

---

**Last Updated:** 2026-01-23
