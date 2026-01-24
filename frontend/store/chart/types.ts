/**
 * Chart indicator type definitions
 * Extracted from useChartStore for better modularity
 */

export type TimeInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

// Custom MA/EMA configuration
export interface MovingAverageConfig {
  id: string;
  period: number;
  type: 'sma' | 'ema';
  color: string;
  enabled: boolean;
  lineWidth: number;
}

// RSI configuration
export interface RSIConfig {
  id: string;
  period: number;
  color: string;
  enabled: boolean;
  overbought: number;
  oversold: number;
}

// Ichimoku configuration
export interface IchimokuConfig {
  enabled: boolean;
  tenkanPeriod: number;
  kijunPeriod: number;
  senkouBPeriod: number;
  displacement: number;
  showTenkan: boolean;
  showKijun: boolean;
  showSenkouA: boolean;
  showSenkouB: boolean;
  showChikou: boolean;
  showCloud: boolean;
}

// Volume configuration
export interface VolumeConfig {
  enabled: boolean;
  showMA: boolean;
  maPeriod: number;
  maColor: string;
}

// MACD configuration
export interface MACDConfig {
  enabled: boolean;
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
}

// Bollinger Bands configuration
export interface BollingerBandsConfig {
  enabled: boolean;
  period: number;
  stdDev: number;
  showFill: boolean;
}

// Stochastic configuration
export interface StochasticConfig {
  enabled: boolean;
  kPeriod: number;
  dPeriod: number;
  smooth: number;
  overbought: number;
  oversold: number;
}

// ATR configuration
export interface ATRConfig {
  enabled: boolean;
  period: number;
}

// VWAP configuration
export interface VWAPConfig {
  enabled: boolean;
  showBands: boolean;
  stdDevMultiplier: number;
}

// Supertrend configuration
export interface SupertrendConfig {
  enabled: boolean;
  period: number;
  multiplier: number;
}

// ADX configuration
export interface ADXConfig {
  enabled: boolean;
  period: number;
  showDI: boolean;
}

// OBV configuration
export interface OBVConfig {
  enabled: boolean;
}

// Parabolic SAR configuration
export interface ParabolicSARConfig {
  enabled: boolean;
  step: number;
  max: number;
}

// EMA Ribbon configuration
export interface EMARibbonConfig {
  enabled: boolean;
  periods: number[];
}

// Drawing tool types
export type DrawingToolType =
  // Lines
  | 'horizontalLine'
  | 'verticalLine'
  | 'trendLine'
  | 'ray'
  | 'horizontalRay'
  // Shapes
  | 'rectangle'
  | 'parallelChannel'
  // Fibonacci
  | 'fibonacciRetracement'
  | 'fibonacciExtension'
  // Annotations
  | 'text'
  | 'arrow'
  | 'priceLabel';

// Drawing object
export interface DrawingObject {
  id: string;
  type: DrawingToolType;
  color: string;
  lineWidth: number;
  // For horizontal line
  price?: number;
  // For trend line
  startTime?: number;
  startPrice?: number;
  endTime?: number;
  endPrice?: number;
  // For rectangle/fib
  points?: { time: number; price: number }[];
}

// Union type for all indicator configs that have an 'enabled' field
export type ToggleableIndicatorConfig =
  | IchimokuConfig
  | VolumeConfig
  | MACDConfig
  | BollingerBandsConfig
  | StochasticConfig
  | ATRConfig
  | VWAPConfig
  | SupertrendConfig
  | ADXConfig
  | OBVConfig
  | ParabolicSARConfig
  | EMARibbonConfig;
