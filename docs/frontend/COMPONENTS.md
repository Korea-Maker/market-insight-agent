# Frontend Components 문서

QuantBoard V1 프론트엔드 컴포넌트에 대한 상세 문서입니다.

## 목차

- [개요](#개요)
- [폴더 구조](#폴더-구조)
- [UI 컴포넌트](#ui-컴포넌트)
- [테마 컴포넌트](#테마-컴포넌트)
- [네비게이션 컴포넌트](#네비게이션-컴포넌트)
- [차트 컴포넌트](#차트-컴포넌트)
- [인증 컴포넌트](#인증-컴포넌트)
- [커뮤니티 컴포넌트](#커뮤니티-컴포넌트)
- [레이아웃 컴포넌트](#레이아웃-컴포넌트)
- [의존성 그래프](#의존성-그래프)

---

## 개요

### 기술 스택

| 기술 | 버전 | 용도 |
|------|------|------|
| React | 19 | UI 라이브러리 |
| Next.js | 16 | 프레임워크 (App Router) |
| TypeScript | - | 타입 안전성 |
| Tailwind CSS | 4 | 스타일링 |
| shadcn/ui | - | UI 컴포넌트 라이브러리 |
| lucide-react | - | 아이콘 |
| framer-motion | - | 애니메이션 |
| lightweight-charts | v5 | 트레이딩 차트 |

### 상태 관리

- **Zustand**: 전역 상태 관리 (Redux 사용 금지)
- **React Context**: 테마 관리

---

## 폴더 구조

```
frontend/components/
├── ui/                    # shadcn/ui 기본 컴포넌트
│   ├── button.tsx
│   ├── card.tsx
│   ├── checkbox.tsx
│   └── input.tsx
├── Theme/                 # 테마 관리
│   ├── ThemeProvider.tsx
│   └── ThemeToggle.tsx
├── Header/                # 헤더 섹션
│   └── MarketTicker.tsx
├── Navigation/            # 네비게이션
│   └── TopNav.tsx
├── Chart/                 # 트레이딩 차트 (핵심)
│   ├── CryptoChart.tsx
│   ├── TradingChart.tsx
│   ├── ChartControls.tsx
│   └── IndicatorSettingsPanel.tsx
├── Dashboard/             # 대시보드
│   └── Sidebar.tsx
├── Layout/                # 레이아웃
│   └── MainLayout.tsx
├── Auth/                  # 인증
│   ├── AuthGuard.tsx
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── SocialLoginButtons.tsx
├── Community/             # 커뮤니티
│   ├── PostCard.tsx
│   └── CommentSection.tsx
└── DevTools/              # 개발 도구
    └── VibeKanbanCompanion.tsx
```

---

## UI 컴포넌트

### Button

**파일:** `components/ui/button.tsx`

CVA(Class Variance Authority) 기반 버튼 컴포넌트

```typescript
interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}
```

**사용 예시:**
```tsx
<Button variant="default" size="lg">클릭</Button>
<Button variant="outline" size="icon"><Icon /></Button>
<Button asChild><Link href="/path">링크</Link></Button>
```

**Variants:**
| Variant | 설명 |
|---------|------|
| `default` | 기본 스타일 (primary) |
| `destructive` | 삭제/위험 액션 (빨간색) |
| `outline` | 테두리만 있는 스타일 |
| `secondary` | 보조 스타일 |
| `ghost` | 배경 없는 스타일 |
| `link` | 링크 스타일 |

---

### Card

**파일:** `components/ui/card.tsx`

카드 레이아웃 컴포넌트 (5개 하위 컴포넌트)

```typescript
// 기본 사용
<Card>
  <CardHeader>
    <CardTitle>제목</CardTitle>
    <CardDescription>설명</CardDescription>
  </CardHeader>
  <CardContent>
    본문 내용
  </CardContent>
  <CardFooter>
    푸터
  </CardFooter>
</Card>
```

---

### Input

**파일:** `components/ui/input.tsx`

기본 텍스트 입력 컴포넌트

```typescript
interface InputProps extends React.ComponentProps<"input"> {}
```

---

### Checkbox

**파일:** `components/ui/checkbox.tsx`

Radix UI 기반 체크박스

```typescript
<Checkbox checked={checked} onCheckedChange={setChecked} />
```

---

## 테마 컴포넌트

### ThemeProvider

**파일:** `components/Theme/ThemeProvider.tsx`

Context API 기반 테마 관리자

```typescript
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
}

// 제공하는 컨텍스트
interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}
```

**기능:**
- localStorage에 테마 저장
- 시스템 다크모드 자동 감지
- HTML root에 class 적용 (light/dark)

**사용:**
```tsx
// app/layout.tsx
<ThemeProvider defaultTheme="system">
  {children}
</ThemeProvider>

// 컴포넌트에서
const { theme, setTheme } = useTheme();
```

---

### ThemeToggle

**파일:** `components/Theme/ThemeToggle.tsx`

테마 전환 버튼

```typescript
// Props 없음 - useTheme 훅 사용
```

**아이콘:** Sun, Moon, Monitor (lucide-react)

---

## 네비게이션 컴포넌트

### TopNav

**파일:** `components/Navigation/TopNav.tsx`

전역 상단 네비게이션 바

```typescript
// Props 없음 - 내부 상태 사용
// 사용하는 훅:
// - usePathname() - 현재 경로
// - useRouter() - 라우팅
// - useAuthStore() - 인증 상태
```

**구성:**
1. **로고 + 브랜드명** (Zerocoke)
2. **Navigation Items:**
   - 대시보드 (`/dashboard`)
   - 속보 (`/news`)
   - 커뮤니티 (`/community`)
3. **ThemeToggle**
4. **Auth Section:**
   - 미인증: 로그인 버튼
   - 인증됨: 프로필 + 로그아웃

**애니메이션:**
- `framer-motion`으로 진입 애니메이션 (y: -100 → 0)
- Shared Layout Animation으로 active 표시

---

### MarketTicker

**파일:** `components/Header/MarketTicker.tsx`

실시간 BTC/USDT 가격 표시

```typescript
// Props 없음 - Zustand 스토어 직접 구독
// usePriceStore에서:
// - currentPrice
// - connectionStatus
// - priceHistory
```

**기능:**
- 가격 방향 감지 (상승/하락) → 색상 변경
- WebSocket 연결 상태 표시
- 가격 포맷팅 (`Intl.NumberFormat`)

---

## 차트 컴포넌트

### CryptoChart

**파일:** `components/Chart/CryptoChart.tsx`

간단한 캔들스틱 차트 (500개 캔들)

```typescript
// Props 없음
// Refs:
// - chartContainerRef: HTMLDivElement
// - chartRef: IChartApi
// - candlestickSeriesRef: ISeriesApi<'Candlestick'>
// - volumeSeriesRef: ISeriesApi<'Histogram'>
// - ma20SeriesRef, ma50SeriesRef: ISeriesApi<'Line'>
```

**기능:**
- 캔들스틱 + 거래량 히스토그램
- MA20/MA50 이동평균선
- REST API로 초기 캔들 데이터 로드
- Zustand 구독으로 실시간 업데이트

**API 호출:**
```
GET /api/candles?symbol=BTCUSDT&interval=1m&limit=500
```

---

### TradingChart

**파일:** `components/Chart/TradingChart.tsx`

고급 트레이딩 차트 (가장 복잡한 컴포넌트, 1500+ 줄)

```typescript
// Props 없음
// 상태: useChartStore (Zustand)
```

**지원 지표 (14개):**

| 오버레이 지표 | 오실레이터 |
|--------------|-----------|
| Moving Averages (SMA/EMA) | RSI |
| Ichimoku Cloud | MACD |
| Bollinger Bands | Stochastic |
| VWAP | ATR |
| Supertrend | ADX |
| EMA Ribbon | OBV |
| Parabolic SAR | - |
| Volume | - |

**차트 구조:**
```
Main Container
├─ Main Chart (캔들 + 오버레이 지표)
├─ RSI Chart (서브패널, optional)
├─ MACD Chart (서브패널, optional)
├─ Stochastic Chart (서브패널, optional)
├─ ATR Chart (서브패널, optional)
├─ ADX Chart (서브패널, optional)
└─ OBV Chart (서브패널, optional)
```

**주요 Refs:**
```typescript
// 메인 차트
mainContainerRef, chartRef
candleSeriesRef, volumeSeriesRef

// 이동평균
maSeriesRefs: MASeriesRef[]

// Ichimoku
ichimokuRefs: IchimokuSeriesRefs

// 서브 차트들
rsiContainerRef, macdContainerRef, ...

// 오버레이 지표
overlaySeriesRef: OverlaySeriesRefs
```

---

### ChartControls

**파일:** `components/Chart/ChartControls.tsx`

차트 제어 패널

```typescript
interface ChartControlsProps {
  symbol: string;
  interval: TimeInterval;
  onSymbolChange: (symbol: string) => void;
  onIntervalChange: (interval: TimeInterval) => void;
  onOpenSettings: () => void;
  activeDrawingTool: DrawingToolType | null;
}
```

**기능:**
- 5개 심볼 버튼 (BTC, ETH, SOL, BNB, XRP)
- 6개 시간 간격 버튼 (1m, 5m, 15m, 1h, 4h, 1d)
- 그리기 도구 (수평선, 추세선)
- 지표 설정 패널 열기 버튼

---

### IndicatorSettingsPanel

**파일:** `components/Chart/IndicatorSettingsPanel.tsx`

지표 설정 우측 슬라이드 패널

```typescript
interface IndicatorSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}
```

**3개 탭:**
1. **Overlays**: MA, Ichimoku, BB, VWAP, Supertrend, EMA Ribbon, PSAR
2. **Oscillators**: RSI, MACD, Stochastic, ATR, ADX, OBV
3. **Drawing**: 드로잉 도구, 색상 선택

**내부 컴포넌트:**
- `Section`: 접을 수 있는 섹션
- `MAConfigRow`: 이동평균 설정 행
- `RSIConfigRow`: RSI 설정 행
- `DrawingToolButton`: 드로잉 도구 버튼

---

## 인증 컴포넌트

### AuthGuard

**파일:** `components/Auth/AuthGuard.tsx`

인증 보호 래퍼

```typescript
interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
```

**동작:**
1. 초기 로드 시 `checkAuth()` 호출
2. 로딩 중: fallback 또는 스피너 표시
3. 미인증: `/auth/login`으로 리다이렉트
4. 인증됨: children 렌더

---

### LoginForm

**파일:** `components/Auth/LoginForm.tsx`

로그인 폼

```typescript
// Props 없음
// 내부 상태:
// - email, password, error, isLoading
```

**기능:**
- 이메일/비밀번호 입력
- `useAuthStore().login()` 호출
- 성공 시 `/community`로 리다이렉트

---

### RegisterForm

**파일:** `components/Auth/RegisterForm.tsx`

회원가입 폼

```typescript
// Props 없음
// 내부 상태:
// - email, username, displayName, password, confirmPassword
// - error, success, isLoading
```

**유효성 검사:**
- 사용자명: 영문, 숫자, 언더스코어만
- 비밀번호: 8자 이상, 대/소문자, 숫자 포함
- 비밀번호 확인 일치

---

### SocialLoginButtons

**파일:** `components/Auth/SocialLoginButtons.tsx`

OAuth 로그인 버튼

```typescript
// Props 없음
```

**버튼:**
- Google OAuth
- GitHub OAuth

---

## 커뮤니티 컴포넌트

### PostCard

**파일:** `components/Community/PostCard.tsx`

게시글 카드

```typescript
interface PostCardProps {
  post: PostListItem;
  onLike?: (postId: number) => void;
}
```

**표시 정보:**
- 작성자 아바타
- 카테고리
- 제목
- 내용 미리보기
- 태그 (`#` 표시)
- 통계 (좋아요, 댓글, 조회수)
- 작성 시간 (상대 시간)

**인터랙션:**
- 클릭: `/community/{postId}`로 이동
- 좋아요 버튼: `onLike` 콜백

---

### CommentSection

**파일:** `components/Community/CommentSection.tsx`

댓글 섹션 (트리 구조 지원)

```typescript
interface CommentSectionProps {
  postId: number;
}

// 내부 상태:
// - newComment, replyTo, replyContent, isSubmitting
```

**기능:**
1. 댓글 작성 (인증된 사용자만)
2. 댓글 목록 (재귀적 대댓글)
3. 대댓글 작성 (답글 버튼)
4. 댓글 삭제 (작성자만)
5. 댓글 좋아요 (인증된 사용자만)

**내부 컴포넌트: CommentItem**
```typescript
interface CommentItemProps {
  comment: Comment;
  currentUserId?: number;
  isAuthenticated: boolean;
  replyTo: number | null;
  replyContent: string;
  isSubmitting: boolean;
  onReplyToChange: (id: number | null) => void;
  onReplyContentChange: (content: string) => void;
  onReply: (parentId: number) => void;
  onDelete: (commentId: number) => void;
  onLike: (commentId: number) => void;
  isReply?: boolean;
}
```

---

## 레이아웃 컴포넌트

### MainLayout

**파일:** `components/Layout/MainLayout.tsx`

메인 레이아웃

```typescript
interface MainLayoutProps {
  children: React.ReactNode;
}
```

**구조:**
```tsx
<div className="bg-background transition-colors">
  <TopNav />
  <main className="flex-1">
    {/* 배경 효과 */}
    <div className="fixed pointer-events-none">
      {/* gradient blobs */}
      {/* grid 패턴 */}
    </div>
    {/* 콘텐츠 */}
    <motion.div className="z-10">
      {children}
    </motion.div>
  </main>
</div>
```

**특징:**
- `useWebSocket()` 훅 초기화 (전역 WebSocket)
- Framer Motion 애니메이션 (opacity + y 슬라이드)

---

### Sidebar

**파일:** `components/Dashboard/Sidebar.tsx`

대시보드 사이드바

```typescript
// Props 없음
```

**기능:**
- AI 모델 상태 표시 (오프라인)
- 시스템 상태 (Ingestor, Analysis Engine)

---

## 의존성 그래프

```
MainLayout
├─ TopNav
│  ├─ ThemeToggle
│  │  └─ ThemeProvider (Context)
│  └─ useAuthStore (Zustand)
├─ useWebSocket (Global WebSocket)
└─ {children}
    ├─ Dashboard
    │  ├─ TradingChart
    │  │  ├─ ChartControls
    │  │  ├─ IndicatorSettingsPanel
    │  │  ├─ useChartStore
    │  │  └─ usePriceStore
    │  └─ Sidebar
    ├─ News
    └─ Community
       ├─ PostCard[]
       │  └─ usePriceStore
       ├─ CommentSection
       │  ├─ useAuthStore
       │  └─ useCommunityStore
       └─ AuthGuard (if protected)

Auth Pages
├─ LoginForm
│  ├─ useAuthStore
│  └─ SocialLoginButtons
├─ RegisterForm
│  ├─ useAuthStore
│  └─ SocialLoginButtons
```

---

## 외부 라이브러리 사용

### lucide-react 아이콘 (40개+)

| 카테고리 | 아이콘 |
|----------|--------|
| UI | Settings2, Plus, Trash2, X, ChevronDown, ChevronRight, Minus, Edit2, Send |
| 차트 | TrendingUp, BarChart3, LineChart, Activity, Layers |
| 상태 | Heart, MessageSquare, Eye, Clock, Hash, Reply, Loader2, AlertCircle, CheckCircle |
| 네비게이션 | LayoutDashboard, Newspaper, Users, BrainCircuit, LogIn, LogOut, User |
| 방향 | ArrowUp, ArrowDown |
| 기타 | Monitor, Sun, Moon, PenLine |

### shadcn/ui 컴포넌트

- Button
- Card (+ Header, Title, Description, Content, Footer)
- Checkbox
- Input

### framer-motion

- TopNav: 진입 애니메이션, Shared Layout Animation
- MainLayout: content 슬라이드

### lightweight-charts (v5 API)

- createChart
- CandlestickSeries
- HistogramSeries
- LineSeries
- createSeriesMarkers

---

**Last Updated:** 2026-01-23
