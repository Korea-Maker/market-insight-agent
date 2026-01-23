# Mobile-Optimized Chart UI Component Design

## 1. Overview

### Purpose
모바일 환경에서 최적화된 트레이딩 차트 경험을 제공하는 컴포넌트 설계. 작은 화면에서도 효율적인 데이터 시각화와 직관적인 인터랙션을 목표로 합니다.

### Design Goals
- **Touch-First Interaction**: 터치 제스처 기반 조작
- **Space Efficiency**: 제한된 화면 공간의 효율적 활용
- **Performance**: 모바일 디바이스에서의 부드러운 렌더링
- **Accessibility**: 한 손 조작 가능한 UI 배치

---

## 2. Component Architecture

```
MobileChartContainer/
├── MobileChartHeader/          # 심볼 정보 + 가격 표시
├── MobileChart/                # 메인 차트 영역
│   ├── ChartCanvas/            # lightweight-charts 렌더링
│   ├── TouchOverlay/           # 터치 제스처 핸들링
│   └── ChartTooltip/           # 터치 시 가격 정보
├── MobileTimeframePicker/      # 인터벌 선택 (하단 고정)
├── MobileIndicatorSheet/       # 인디케이터 설정 (Bottom Sheet)
└── MobileControlBar/           # 빠른 액션 버튼
```

---

## 3. Component Specifications

### 3.1 MobileChartContainer

```typescript
interface MobileChartContainerProps {
  symbol: string;
  interval: TimeInterval;
  onSymbolChange: (symbol: string) => void;
  onIntervalChange: (interval: TimeInterval) => void;
  fullscreen?: boolean;
}

// 상태 관리
interface MobileChartState {
  isLandscape: boolean;           // 가로 모드 감지
  isFullscreen: boolean;          // 전체 화면 모드
  showIndicatorSheet: boolean;    // 인디케이터 설정 시트
  showSymbolPicker: boolean;      // 심볼 선택 모달
  activeGesture: GestureType | null;
}
```

### 3.2 MobileChartHeader

**Layout (Portrait)**
```
┌─────────────────────────────────────────┐
│ BTC/USDT ▼    $98,234.56   +2.34%  ⛶   │
│              ══════════════════════     │
└─────────────────────────────────────────┘
```

```typescript
interface MobileChartHeaderProps {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  onSymbolPress: () => void;
  onFullscreenToggle: () => void;
}
```

**Design Specs**
- Height: `48px` (고정)
- Symbol: `text-base font-semibold`, 탭하면 심볼 선택 모달
- Price: `text-lg font-mono font-bold`
- Change: `text-sm`, 양수 녹색/음수 빨강
- 전체화면 버튼: 우측 끝

### 3.3 MobileChart (Core)

```typescript
interface MobileChartProps {
  data: CandleData[];
  indicators: IndicatorConfig[];
  onPriceSelect: (price: number, time: Time) => void;
}

// 터치 제스처 처리
interface TouchGestureHandlers {
  onPinchZoom: (scale: number, center: Point) => void;
  onPan: (deltaX: number, deltaY: number) => void;
  onDoubleTap: (point: Point) => void;
  onLongPress: (point: Point) => void;
}
```

**Chart Configuration (Mobile)**
```typescript
const mobileChartOptions = {
  // 더 큰 터치 타겟을 위한 설정
  handleScale: {
    axisPressedMouseMove: { time: true, price: true },
    mouseWheel: false,  // 모바일에서 비활성화
    pinch: true,        // 핀치 줌 활성화
  },
  handleScroll: {
    horzTouchDrag: true,
    vertTouchDrag: false,  // 수직은 페이지 스크롤로
    pressedMouseMove: true,
  },
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
    tickMarkFormatter: mobileDateFormatter,  // 간소화된 날짜 포맷
  },
  crosshair: {
    mode: CrosshairMode.Magnet,  // 모바일에서 마그넷 모드
  },
  // 모바일 최적화 폰트 크기
  layout: {
    fontSize: 11,
  },
};
```

**Responsive Breakpoints**
```typescript
const MOBILE_BREAKPOINTS = {
  small: 320,   // iPhone SE
  medium: 375,  // iPhone 13
  large: 414,   // iPhone 13 Pro Max
  tablet: 768,  // iPad Mini
};

// 차트 높이 계산
const getChartHeight = (viewportHeight: number, isLandscape: boolean) => {
  if (isLandscape) return viewportHeight - 60;  // 거의 전체 화면
  return Math.max(viewportHeight * 0.5, 300);   // 최소 300px
};
```

### 3.4 MobileTimeframePicker

**Layout**
```
┌─────────────────────────────────────────┐
│  1m   5m   15m   1h   4h   1D   1W      │
└─────────────────────────────────────────┘
```

```typescript
interface MobileTimeframePickerProps {
  current: TimeInterval;
  onChange: (interval: TimeInterval) => void;
  compact?: boolean;  // 더 좁은 공간용
}

const MOBILE_INTERVALS = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
] as const;
```

**Design Specs**
- Height: `44px` (터치 친화적)
- 버튼: `min-width: 40px`, `height: 32px`
- 활성 상태: `bg-primary text-primary-foreground rounded-full`
- 스크롤: 가로 스크롤 (많은 옵션 시)

### 3.5 MobileIndicatorSheet

**Bottom Sheet Layout**
```
┌─────────────────────────────────────────┐
│ ══════════════  (drag handle)           │
│                                         │
│  Indicators                    [Done]   │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │ ☑ MA 20      ☑ MA 50    ☑ EMA 12 │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ ☐ RSI 14     ☐ MACD              │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ ☐ Bollinger  ☐ Volume            │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

```typescript
interface MobileIndicatorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  indicators: IndicatorConfig[];
  onIndicatorToggle: (id: string) => void;
  onIndicatorUpdate: (id: string, config: Partial<IndicatorConfig>) => void;
}

// 간소화된 인디케이터 설정 (모바일용)
interface MobileIndicatorConfig {
  id: string;
  type: 'ma' | 'ema' | 'rsi' | 'macd' | 'bb' | 'volume';
  enabled: boolean;
  period?: number;
  color: string;
}
```

**Interaction**
- Drag to resize (snap points: 30%, 60%, 90%)
- Swipe down to close
- Quick toggle chips for common indicators
- Tap indicator for detailed settings

### 3.6 MobileControlBar

**Layout**
```
┌───────────────────────────────────────────┐
│  [📊]  [📈]  [🔧]           [🔄]  [⛶]    │
│  Ind   Draw  Set           Refr  Full    │
└───────────────────────────────────────────┘
```

```typescript
interface MobileControlBarProps {
  onIndicatorsPress: () => void;
  onDrawingPress: () => void;
  onSettingsPress: () => void;
  onRefresh: () => void;
  onFullscreen: () => void;
  isFullscreen: boolean;
}
```

---

## 4. Touch Gesture System

### 4.1 Gesture Definitions

```typescript
type GestureType =
  | 'pan'           // 한 손가락 드래그
  | 'pinch'         // 두 손가락 줌
  | 'doubleTap'     // 더블 탭
  | 'longPress'     // 길게 누르기
  | 'swipe';        // 스와이프

interface GestureConfig {
  pan: {
    threshold: 10,        // 최소 이동 거리 (px)
    direction: 'horizontal' | 'vertical' | 'both',
  };
  pinch: {
    minScale: 0.5,
    maxScale: 3.0,
  };
  doubleTap: {
    maxDelay: 300,        // ms
    action: 'resetZoom',
  };
  longPress: {
    duration: 500,        // ms
    action: 'showCrosshair',
  };
}
```

### 4.2 Gesture Behaviors

| Gesture | Action | Description |
|---------|--------|-------------|
| Pan (horizontal) | 시간 스크롤 | 차트 시간축 이동 |
| Pan (vertical) | 가격 스크롤 | 가격축 이동 (선택적) |
| Pinch | 줌 | 시간/가격 축 확대/축소 |
| Double Tap | 줌 리셋 | 기본 뷰로 복귀 |
| Long Press | 크로스헤어 | 정확한 가격/시간 표시 |
| Swipe Down | 새로고침 | Pull-to-refresh |

### 4.3 Touch Feedback

```typescript
const touchFeedback = {
  // 햅틱 피드백
  haptic: {
    selection: 'selection',      // 선택 시
    impact: 'light',            // 터치 시
    notification: 'success',    // 액션 완료
  },
  // 시각적 피드백
  visual: {
    ripple: true,               // 터치 리플
    highlight: true,            // 요소 하이라이트
  },
};
```

---

## 5. Responsive Layout System

### 5.1 Portrait Mode

```
┌─────────────────────────┐
│  [Header: 48px]         │
├─────────────────────────┤
│                         │
│                         │
│  [Chart: 50-60%]        │
│                         │
│                         │
├─────────────────────────┤
│  [Timeframe: 44px]      │
├─────────────────────────┤
│  [Sub-indicators]       │
│  [RSI/MACD: 80px each]  │
├─────────────────────────┤
│  [Control Bar: 56px]    │
└─────────────────────────┘
```

### 5.2 Landscape Mode

```
┌─────────────────────────────────────────────┐
│ [Header]                    [Controls]      │
├─────────────────────────────────────────────┤
│                                             │
│                                             │
│           [Full Chart Area]                 │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│     [1m] [5m] [15m] [1h] [4h] [1D] [1W]     │
└─────────────────────────────────────────────┘
```

### 5.3 CSS Layout

```css
/* Mobile Chart Container */
.mobile-chart-container {
  display: flex;
  flex-direction: column;
  height: 100dvh;  /* Dynamic viewport height */
  overflow: hidden;
  touch-action: none;  /* 커스텀 제스처 처리 */
}

/* Landscape adjustments */
@media (orientation: landscape) {
  .mobile-chart-container {
    flex-direction: row;
  }

  .mobile-chart-header {
    writing-mode: vertical-rl;
    width: 48px;
  }

  .mobile-chart-main {
    flex: 1;
    height: 100%;
  }
}

/* Safe area padding (notch/home indicator) */
.mobile-chart-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

---

## 6. Performance Optimizations

### 6.1 Rendering Optimizations

```typescript
// 모바일 최적화 설정
const mobilePerformanceConfig = {
  // 데이터 포인트 제한
  maxVisibleCandles: 100,     // 화면에 표시할 최대 캔들 수
  candleDataLimit: 500,       // 로드할 최대 데이터

  // 렌더링 최적화
  renderThrottle: 16,         // ~60fps
  updateBatching: true,       // 업데이트 배칭

  // 인디케이터 제한
  maxOverlayIndicators: 3,    // 메인 차트 오버레이
  maxSubPanels: 1,            // 서브 패널 (RSI OR MACD)

  // 메모리 관리
  cleanupInterval: 60000,     // 1분마다 정리
  maxHistoryLength: 1000,
};
```

### 6.2 Data Loading Strategy

```typescript
// Progressive loading
const loadingStrategy = {
  initial: 200,               // 초기 로드
  viewport: 100,              // 현재 뷰포트
  buffer: 50,                 // 좌우 버퍼
  lazy: true,                 // 지연 로딩
};

// Visibility-based updates
const updateStrategy = {
  foreground: 1000,           // 앱 활성 시 1초
  background: 30000,          // 백그라운드 시 30초
  hidden: 'pause',            // 숨김 시 일시정지
};
```

### 6.3 Memory Management

```typescript
// 모바일 메모리 관리
const memoryConfig = {
  // 이미지/캔버스 캐시
  maxCacheSize: 50 * 1024 * 1024,  // 50MB

  // 데이터 캐시
  candleCache: new LRUCache({
    max: 5000,
    ttl: 1000 * 60 * 5,  // 5분
  }),

  // cleanup on memory pressure
  onMemoryWarning: () => {
    candleCache.clear();
    // 필수 데이터만 유지
  },
};
```

---

## 7. Accessibility (A11y)

### 7.1 Touch Targets

```typescript
const touchTargetSizes = {
  minimum: 44,      // Apple HIG 권장
  comfortable: 48,  // 편안한 크기
  large: 56,        // 주요 액션
};
```

### 7.2 Screen Reader Support

```typescript
// ARIA labels
const a11yLabels = {
  chart: 'Bitcoin price chart, current price $98,234',
  timeframe: 'Select time interval',
  indicator: 'Toggle RSI indicator',
  fullscreen: 'Enter fullscreen mode',
};

// Live regions for price updates
<div role="status" aria-live="polite" aria-atomic="true">
  Price: {currentPrice}
</div>
```

### 7.3 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .mobile-chart * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. State Management

### 8.1 Mobile-Specific Store

```typescript
interface MobileChartStore {
  // UI State
  isLandscape: boolean;
  isFullscreen: boolean;
  sheetState: 'closed' | 'partial' | 'full';

  // Gesture State
  currentGesture: GestureType | null;
  gestureData: GestureData | null;

  // Performance State
  isThrottled: boolean;
  lastUpdateTime: number;

  // Actions
  setLandscape: (isLandscape: boolean) => void;
  setFullscreen: (isFullscreen: boolean) => void;
  setSheetState: (state: SheetState) => void;
  handleGesture: (gesture: GestureEvent) => void;
}
```

### 8.2 Device Detection

```typescript
const useDeviceInfo = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isLandscape: false,
    hasNotch: false,
    supportsHaptic: false,
  });

  useEffect(() => {
    const updateInfo = () => {
      setDeviceInfo({
        isMobile: window.innerWidth < 768,
        isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
        isLandscape: window.innerWidth > window.innerHeight,
        hasNotch: CSS.supports('padding-top: env(safe-area-inset-top)'),
        supportsHaptic: 'vibrate' in navigator,
      });
    };

    updateInfo();
    window.addEventListener('resize', updateInfo);
    return () => window.removeEventListener('resize', updateInfo);
  }, []);

  return deviceInfo;
};
```

---

## 9. File Structure

```
frontend/components/Chart/Mobile/
├── MobileChartContainer.tsx       # 메인 컨테이너
├── MobileChartHeader.tsx          # 헤더 컴포넌트
├── MobileChart.tsx                # 차트 코어
├── MobileTimeframePicker.tsx      # 시간대 선택
├── MobileIndicatorSheet.tsx       # 인디케이터 설정 시트
├── MobileControlBar.tsx           # 컨트롤 바
├── MobileSymbolPicker.tsx         # 심볼 선택 모달
├── hooks/
│   ├── useGestures.ts             # 터치 제스처 훅
│   ├── useDeviceInfo.ts           # 디바이스 정보
│   ├── useOrientation.ts          # 화면 방향
│   └── useMobileChart.ts          # 차트 로직
├── utils/
│   ├── gestures.ts                # 제스처 유틸
│   ├── performance.ts             # 성능 유틸
│   └── responsive.ts              # 반응형 유틸
└── types.ts                       # 타입 정의
```

---

## 10. Implementation Priority

### Phase 1: Core Components
1. `MobileChartContainer` - 기본 레이아웃
2. `MobileChart` - lightweight-charts 통합
3. `MobileTimeframePicker` - 인터벌 선택

### Phase 2: Interactions
4. `useGestures` 훅 - 터치 제스처
5. `MobileChartHeader` - 가격 정보
6. `MobileControlBar` - 빠른 액션

### Phase 3: Advanced Features
7. `MobileIndicatorSheet` - 인디케이터 설정
8. `MobileSymbolPicker` - 심볼 선택
9. Landscape 모드 최적화

### Phase 4: Polish
10. 성능 최적화
11. 접근성 개선
12. 애니메이션/전환 효과

---

## 11. Dependencies

```json
{
  "lightweight-charts": "^5.0.0",
  "@use-gesture/react": "^10.x",   // 터치 제스처
  "framer-motion": "^11.x",        // 애니메이션
  "zustand": "^5.x",               // 상태 관리
  "react-spring-bottom-sheet": "^3.x"  // Bottom Sheet
}
```

---

## 12. Testing Strategy

```typescript
// E2E Tests (Playwright)
describe('Mobile Chart', () => {
  test('should handle pinch zoom', async () => {
    await page.touchscreen.pinch(200, 300, 2);
    // zoom level increased
  });

  test('should pan horizontally', async () => {
    await page.touchscreen.drag(300, 200, 100, 200);
    // chart scrolled
  });

  test('should show crosshair on long press', async () => {
    await page.touchscreen.longPress(200, 200);
    // crosshair visible
  });
});
```

---

## Next Steps

After design approval, use `/sc:implement mobile-chart-ui` to begin implementation.
