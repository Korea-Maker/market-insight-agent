/**
 * Mobile Chart Components
 * Touch-optimized trading chart UI for mobile devices
 */

// Main container
export { MobileChartContainer } from './MobileChartContainer';
export { default } from './MobileChartContainer';

// Sub-components
export { MobileChart } from './MobileChart';
export { MobileChartHeader } from './MobileChartHeader';
export { MobileTimeframePicker } from './MobileTimeframePicker';
export { MobileControlBar } from './MobileControlBar';
export { MobileIndicatorSheet } from './MobileIndicatorSheet';

// Hooks
export { useDeviceInfo, useIsTouchDevice, useViewportHeight } from './hooks/useDeviceInfo';
export { useOrientation, useLandscapeFullscreen } from './hooks/useOrientation';

// Types
export type {
  // Device types
  DeviceInfo,
  SafeAreaInsets,
  ScreenOrientation,
  // Gesture types
  GestureType,
  Point,
  GestureState,
  GestureEvent,
  PanGestureEvent,
  PinchGestureEvent,
  TapGestureEvent,
  SwipeGestureEvent,
  GestureConfig,
  // Chart data types
  CandleData,
  PriceInfo,
  CrosshairData,
  // Indicator types
  MobileIndicatorType,
  MobileIndicatorConfig,
  IndicatorPreset,
  // Component props
  MobileChartContainerProps,
  MobileChartHeaderProps,
  MobileChartProps,
  MobileTimeframePickerProps,
  MobileControlBarProps,
  MobileIndicatorSheetProps,
  MobileSymbolPickerProps,
  // UI state
  SheetState,
  MobileChartUIState,
  // Performance
  PerformanceConfig,
  UpdateStrategy,
} from './types';

// Constants
export {
  MOBILE_BREAKPOINTS,
  TOUCH_TARGET_SIZES,
  MOBILE_INTERVALS,
  DEFAULT_GESTURE_CONFIG,
  MOBILE_PERFORMANCE_CONFIG,
  MOBILE_UPDATE_STRATEGY,
  POPULAR_SYMBOLS,
} from './types';
