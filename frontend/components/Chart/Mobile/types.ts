/**
 * Mobile Chart UI Type Definitions
 * Touch-first trading chart component types for mobile devices
 */

import { Time } from 'lightweight-charts';
import { TimeInterval } from '@/store/useChartStore';

// ============================================
// Device & Viewport Types
// ============================================

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  hasNotch: boolean;
  supportsHaptic: boolean;
  viewportWidth: number;
  viewportHeight: number;
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type ScreenOrientation = 'portrait' | 'landscape';

// ============================================
// Gesture Types
// ============================================

export type GestureType = 'pan' | 'pinch' | 'doubleTap' | 'longPress' | 'swipe';

export interface Point {
  x: number;
  y: number;
}

export interface GestureState {
  active: boolean;
  type: GestureType | null;
  startPoint: Point | null;
  currentPoint: Point | null;
  scale: number;
  velocity: Point;
}

export interface PanGestureEvent {
  type: 'pan';
  deltaX: number;
  deltaY: number;
  velocityX: number;
  velocityY: number;
  direction: 'horizontal' | 'vertical';
}

export interface PinchGestureEvent {
  type: 'pinch';
  scale: number;
  center: Point;
  velocity: number;
}

export interface TapGestureEvent {
  type: 'doubleTap' | 'longPress';
  point: Point;
  timestamp: number;
}

export interface SwipeGestureEvent {
  type: 'swipe';
  direction: 'up' | 'down' | 'left' | 'right';
  velocity: number;
}

export type GestureEvent = PanGestureEvent | PinchGestureEvent | TapGestureEvent | SwipeGestureEvent;

export interface GestureConfig {
  pan: {
    threshold: number;
    direction: 'horizontal' | 'vertical' | 'both';
  };
  pinch: {
    minScale: number;
    maxScale: number;
  };
  doubleTap: {
    maxDelay: number;
  };
  longPress: {
    duration: number;
  };
}

// ============================================
// Chart Data Types
// ============================================

export interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface PriceInfo {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
}

export interface CrosshairData {
  time: Time;
  price: number;
  ohlc?: CandleData;
}

// ============================================
// Indicator Types (Mobile-simplified)
// ============================================

export type MobileIndicatorType =
  | 'ma'
  | 'ema'
  | 'rsi'
  | 'macd'
  | 'bollinger'
  | 'volume'
  | 'vwap'
  | 'supertrend';

export interface MobileIndicatorConfig {
  id: string;
  type: MobileIndicatorType;
  enabled: boolean;
  period?: number;
  color: string;
  // Additional params for specific indicators
  params?: Record<string, number | boolean>;
}

export interface IndicatorPreset {
  id: string;
  name: string;
  indicators: MobileIndicatorConfig[];
}

// ============================================
// Component Props Types
// ============================================

export interface MobileChartContainerProps {
  symbol?: string;
  interval?: TimeInterval;
  onSymbolChange?: (symbol: string) => void;
  onIntervalChange?: (interval: TimeInterval) => void;
  fullscreen?: boolean;
  className?: string;
}

export interface MobileChartHeaderProps {
  symbol: string;
  priceInfo: PriceInfo | null;
  isConnected: boolean;
  onSymbolPress: () => void;
  onFullscreenToggle: () => void;
  isFullscreen: boolean;
}

export interface MobileChartProps {
  symbol: string;
  interval: TimeInterval;
  data: CandleData[];
  loading: boolean;
  error: string | null;
  onCrosshairMove?: (data: CrosshairData | null) => void;
  onDoubleTap?: () => void;
}

export interface MobileTimeframePickerProps {
  current: TimeInterval;
  onChange: (interval: TimeInterval) => void;
  compact?: boolean;
}

export interface MobileControlBarProps {
  onIndicatorsPress: () => void;
  onRefresh: () => void;
  onFullscreen: () => void;
  isFullscreen: boolean;
  isRefreshing?: boolean;
}

export interface MobileIndicatorSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface MobileSymbolPickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  onSelect: (symbol: string) => void;
}

// ============================================
// UI State Types
// ============================================

export type SheetState = 'closed' | 'partial' | 'full';

export interface MobileChartUIState {
  isLandscape: boolean;
  isFullscreen: boolean;
  showIndicatorSheet: boolean;
  showSymbolPicker: boolean;
  sheetState: SheetState;
  crosshairData: CrosshairData | null;
}

// ============================================
// Performance Types
// ============================================

export interface PerformanceConfig {
  maxVisibleCandles: number;
  candleDataLimit: number;
  renderThrottle: number;
  updateBatching: boolean;
  maxOverlayIndicators: number;
  maxSubPanels: number;
}

export interface UpdateStrategy {
  foreground: number;
  background: number;
  hidden: 'pause' | number;
}

// ============================================
// Constants
// ============================================

export const MOBILE_BREAKPOINTS = {
  small: 320,   // iPhone SE
  medium: 375,  // iPhone 13
  large: 414,   // iPhone 13 Pro Max
  tablet: 768,  // iPad Mini
} as const;

export const TOUCH_TARGET_SIZES = {
  minimum: 44,
  comfortable: 48,
  large: 56,
} as const;

export const MOBILE_INTERVALS: Array<{ label: string; value: TimeInterval }> = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1D', value: '1d' },
];

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  pan: {
    threshold: 10,
    direction: 'horizontal',
  },
  pinch: {
    minScale: 0.5,
    maxScale: 3.0,
  },
  doubleTap: {
    maxDelay: 300,
  },
  longPress: {
    duration: 500,
  },
};

export const MOBILE_PERFORMANCE_CONFIG: PerformanceConfig = {
  maxVisibleCandles: 100,
  candleDataLimit: 500,
  renderThrottle: 16,
  updateBatching: true,
  maxOverlayIndicators: 3,
  maxSubPanels: 1,
};

export const MOBILE_UPDATE_STRATEGY: UpdateStrategy = {
  foreground: 1000,
  background: 30000,
  hidden: 'pause',
};

// Popular trading symbols
export const POPULAR_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'AVAXUSDT',
] as const;
