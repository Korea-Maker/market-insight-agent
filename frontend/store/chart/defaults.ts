/**
 * Default values for chart indicators
 * Extracted from useChartStore for better maintainability
 */
import { INDICATOR_COLORS } from '@/lib/indicators';
import {
  MovingAverageConfig,
  RSIConfig,
  IchimokuConfig,
  VolumeConfig,
  MACDConfig,
  BollingerBandsConfig,
  StochasticConfig,
  ATRConfig,
  VWAPConfig,
  SupertrendConfig,
  ADXConfig,
  OBVConfig,
  ParabolicSARConfig,
  EMARibbonConfig,
} from './types';

// Generate unique ID
export const generateId = () => Math.random().toString(36).substring(2, 9);

// Default moving averages
export const DEFAULT_MOVING_AVERAGES: MovingAverageConfig[] = [
  { id: generateId(), period: 7, type: 'sma', color: INDICATOR_COLORS.ma[0], enabled: true, lineWidth: 1 },
  { id: generateId(), period: 25, type: 'sma', color: INDICATOR_COLORS.ma[1], enabled: true, lineWidth: 1 },
  { id: generateId(), period: 99, type: 'sma', color: INDICATOR_COLORS.ma[2], enabled: true, lineWidth: 1 },
];

// Default RSI configs
export const DEFAULT_RSI_CONFIGS: RSIConfig[] = [
  { id: generateId(), period: 14, color: INDICATOR_COLORS.rsi[0], enabled: true, overbought: 70, oversold: 30 },
];

// Default Ichimoku
export const DEFAULT_ICHIMOKU: IchimokuConfig = {
  enabled: false,
  tenkanPeriod: 9,
  kijunPeriod: 26,
  senkouBPeriod: 52,
  displacement: 26,
  showTenkan: true,
  showKijun: true,
  showSenkouA: true,
  showSenkouB: true,
  showChikou: true,
  showCloud: true,
};

// Default Volume
export const DEFAULT_VOLUME: VolumeConfig = {
  enabled: true,
  showMA: true,
  maPeriod: 20,
  maColor: INDICATOR_COLORS.volumeMA,
};

// Default MACD
export const DEFAULT_MACD: MACDConfig = {
  enabled: false,
  fastPeriod: 12,
  slowPeriod: 26,
  signalPeriod: 9,
};

// Default Bollinger Bands
export const DEFAULT_BOLLINGER_BANDS: BollingerBandsConfig = {
  enabled: false,
  period: 20,
  stdDev: 2,
  showFill: true,
};

// Default Stochastic
export const DEFAULT_STOCHASTIC: StochasticConfig = {
  enabled: false,
  kPeriod: 14,
  dPeriod: 3,
  smooth: 3,
  overbought: 80,
  oversold: 20,
};

// Default ATR
export const DEFAULT_ATR: ATRConfig = {
  enabled: false,
  period: 14,
};

// Default VWAP
export const DEFAULT_VWAP: VWAPConfig = {
  enabled: false,
  showBands: true,
  stdDevMultiplier: 2,
};

// Default Supertrend
export const DEFAULT_SUPERTREND: SupertrendConfig = {
  enabled: false,
  period: 10,
  multiplier: 3,
};

// Default ADX
export const DEFAULT_ADX: ADXConfig = {
  enabled: false,
  period: 14,
  showDI: true,
};

// Default OBV
export const DEFAULT_OBV: OBVConfig = {
  enabled: false,
};

// Default Parabolic SAR
export const DEFAULT_PARABOLIC_SAR: ParabolicSARConfig = {
  enabled: false,
  step: 0.02,
  max: 0.2,
};

// Default EMA Ribbon
export const DEFAULT_EMA_RIBBON: EMARibbonConfig = {
  enabled: false,
  periods: [8, 13, 21, 34, 55, 89],
};

// All defaults as a single object for easy reset
export const ALL_DEFAULTS = {
  movingAverages: DEFAULT_MOVING_AVERAGES,
  rsiConfigs: DEFAULT_RSI_CONFIGS,
  ichimoku: DEFAULT_ICHIMOKU,
  volume: DEFAULT_VOLUME,
  macd: DEFAULT_MACD,
  bollingerBands: DEFAULT_BOLLINGER_BANDS,
  stochastic: DEFAULT_STOCHASTIC,
  atr: DEFAULT_ATR,
  vwap: DEFAULT_VWAP,
  supertrend: DEFAULT_SUPERTREND,
  adx: DEFAULT_ADX,
  obv: DEFAULT_OBV,
  parabolicSAR: DEFAULT_PARABOLIC_SAR,
  emaRibbon: DEFAULT_EMA_RIBBON,
} as const;
