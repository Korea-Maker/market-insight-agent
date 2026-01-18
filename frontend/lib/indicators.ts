/**
 * Technical Indicator Calculations for Trading Charts
 * All functions are pure and return data in lightweight-charts compatible format
 */
import { Time } from 'lightweight-charts';

export interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface LineData {
  time: Time;
  value: number;
}

export interface HistogramData {
  time: Time;
  value: number;
  color?: string;
}

// Ichimoku Cloud data structure
export interface IchimokuData {
  tenkanSen: LineData[];      // 전환선 (9)
  kijunSen: LineData[];       // 기준선 (26)
  senkouSpanA: LineData[];    // 선행스팬 A
  senkouSpanB: LineData[];    // 선행스팬 B
  chikouSpan: LineData[];     // 후행스팬
}

// Chart color constants
export const INDICATOR_COLORS = {
  // Moving Averages (rainbow palette)
  ma: [
    '#FF6384', // MA 1 - Pink
    '#36A2EB', // MA 2 - Blue
    '#FFCE56', // MA 3 - Yellow
    '#4BC0C0', // MA 4 - Teal
    '#9966FF', // MA 5 - Purple
    '#FF9F40', // MA 6 - Orange
    '#C9CBCF', // MA 7 - Gray
    '#7CFC00', // MA 8 - Lawn Green
    '#FF1493', // MA 9 - Deep Pink
    '#00CED1', // MA 10 - Dark Turquoise
  ],
  // EMA colors
  ema: [
    '#E91E63', // EMA 1
    '#2196F3', // EMA 2
    '#FFC107', // EMA 3
    '#00BCD4', // EMA 4
    '#9C27B0', // EMA 5
    '#FF5722', // EMA 6
    '#607D8B', // EMA 7
    '#8BC34A', // EMA 8
    '#F44336', // EMA 9
    '#3F51B5', // EMA 10
  ],
  // RSI colors
  rsi: [
    '#E91E63',
    '#2196F3',
    '#4CAF50',
    '#FF9800',
    '#9C27B0',
  ],
  // Ichimoku
  ichimoku: {
    tenkanSen: '#0496FF',     // 전환선 - Blue
    kijunSen: '#FF0000',      // 기준선 - Red
    senkouSpanA: 'rgba(76, 175, 80, 0.3)',  // 선행스팬 A - Green
    senkouSpanB: 'rgba(244, 67, 54, 0.3)',  // 선행스팬 B - Red
    chikouSpan: '#9C27B0',    // 후행스팬 - Purple
    cloudUp: 'rgba(76, 175, 80, 0.1)',      // 상승 구름
    cloudDown: 'rgba(244, 67, 54, 0.1)',    // 하락 구름
  },
  // Volume
  volumeUp: 'rgba(38, 166, 154, 0.5)',
  volumeDown: 'rgba(239, 83, 80, 0.5)',
  volumeMA: '#FFA726',
  // MACD
  macdLine: '#2962FF',
  macdSignal: '#FF6D00',
  macdHistogramUp: 'rgba(38, 166, 154, 0.7)',
  macdHistogramDown: 'rgba(239, 83, 80, 0.7)',
  // Drawing tools
  horizontalLine: '#FFD700',
  trendLine: '#00BFFF',
  // Bollinger Bands
  bollingerUpper: '#787B86',
  bollingerMiddle: '#FF6D00',
  bollingerLower: '#787B86',
  bollingerFill: 'rgba(33, 150, 243, 0.1)',
  // Stochastic
  stochasticK: '#2962FF',
  stochasticD: '#FF6D00',
  // ATR
  atr: '#9C27B0',
  // VWAP
  vwap: '#E91E63',
  vwapUpper: 'rgba(233, 30, 99, 0.3)',
  vwapLower: 'rgba(233, 30, 99, 0.3)',
  // Supertrend
  supertrendUp: '#26a69a',
  supertrendDown: '#ef5350',
  // EMA Ribbon
  emaRibbon: [
    '#FF6384', '#FF7B54', '#FFBD45', '#C5E384',
    '#7ED4AD', '#45B7D1', '#5C6BC0', '#7E57C2',
  ],
} as const;

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(data: CandleData[], period: number): LineData[] {
  if (data.length < period) return [];

  const result: LineData[] = [];

  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0);
    result.push({
      time: data[i].time,
      value: sum / period,
    });
  }

  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(data: CandleData[], period: number): LineData[] {
  if (data.length < period) return [];

  const result: LineData[] = [];
  const multiplier = 2 / (period + 1);

  // First EMA = SMA of first 'period' values
  const firstSMA = data.slice(0, period).reduce((sum, d) => sum + d.close, 0) / period;
  result.push({ time: data[period - 1].time, value: firstSMA });

  // Calculate rest using EMA formula
  for (let i = period; i < data.length; i++) {
    const prevEMA = result[result.length - 1].value;
    const value = (data[i].close - prevEMA) * multiplier + prevEMA;
    result.push({ time: data[i].time, value });
  }

  return result;
}

/**
 * Calculate Volume Moving Average
 */
export function calculateVolumeMA(data: CandleData[], period: number): LineData[] {
  if (data.length < period) return [];

  const result: LineData[] = [];

  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + (d.volume || 0), 0);
    result.push({
      time: data[i].time,
      value: sum / period,
    });
  }

  return result;
}

/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(data: CandleData[], period: number = 14): LineData[] {
  if (data.length < period + 1) return [];

  const result: LineData[] = [];
  let gains = 0;
  let losses = 0;

  // Calculate first average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // First RSI value
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({
    time: data[period].time,
    value: 100 - (100 / (1 + rs)),
  });

  // Calculate smoothed RSI
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const smoothedRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({
      time: data[i].time,
      value: 100 - (100 / (1 + smoothedRS)),
    });
  }

  return result;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  data: CandleData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  macd: LineData[];
  signal: LineData[];
  histogram: HistogramData[];
} {
  const ema12 = calculateEMA(data, fastPeriod);
  const ema26 = calculateEMA(data, slowPeriod);

  if (ema12.length === 0 || ema26.length === 0) {
    return { macd: [], signal: [], histogram: [] };
  }

  // MACD line = EMA12 - EMA26 (aligned by time)
  const macdLine: LineData[] = [];
  const startIdx = slowPeriod - fastPeriod; // EMA12 starts earlier

  for (let i = 0; i < ema26.length; i++) {
    macdLine.push({
      time: ema26[i].time,
      value: ema12[startIdx + i].value - ema26[i].value,
    });
  }

  // Signal line = EMA9 of MACD
  const signal = calculateEMAFromLine(macdLine, signalPeriod);

  // Histogram = MACD - Signal
  const histogram: HistogramData[] = [];
  const histStartIdx = macdLine.length - signal.length;

  for (let i = 0; i < signal.length; i++) {
    const value = macdLine[histStartIdx + i].value - signal[i].value;
    histogram.push({
      time: signal[i].time,
      value,
      color: value >= 0 ? INDICATOR_COLORS.macdHistogramUp : INDICATOR_COLORS.macdHistogramDown,
    });
  }

  return { macd: macdLine, signal, histogram };
}

/**
 * Calculate Ichimoku Cloud (일목균형표)
 * @param tenkanPeriod - 전환선 기간 (기본값: 9)
 * @param kijunPeriod - 기준선 기간 (기본값: 26)
 * @param senkouBPeriod - 선행스팬 B 기간 (기본값: 52)
 * @param displacement - 선행스팬 변위 (기본값: 26)
 */
export function calculateIchimoku(
  data: CandleData[],
  tenkanPeriod: number = 9,
  kijunPeriod: number = 26,
  senkouBPeriod: number = 52,
  displacement: number = 26
): IchimokuData {
  const result: IchimokuData = {
    tenkanSen: [],
    kijunSen: [],
    senkouSpanA: [],
    senkouSpanB: [],
    chikouSpan: [],
  };

  if (data.length < senkouBPeriod) return result;

  // Helper: Calculate (highest high + lowest low) / 2 for a period
  const calculateMidpoint = (startIdx: number, period: number): number => {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let i = startIdx; i < startIdx + period && i < data.length; i++) {
      highest = Math.max(highest, data[i].high);
      lowest = Math.min(lowest, data[i].low);
    }
    return (highest + lowest) / 2;
  };

  // Calculate Tenkan-sen (전환선) and Kijun-sen (기준선)
  for (let i = Math.max(tenkanPeriod, kijunPeriod) - 1; i < data.length; i++) {
    // Tenkan-sen
    if (i >= tenkanPeriod - 1) {
      result.tenkanSen.push({
        time: data[i].time,
        value: calculateMidpoint(i - tenkanPeriod + 1, tenkanPeriod),
      });
    }

    // Kijun-sen
    if (i >= kijunPeriod - 1) {
      result.kijunSen.push({
        time: data[i].time,
        value: calculateMidpoint(i - kijunPeriod + 1, kijunPeriod),
      });
    }
  }

  // Calculate Senkou Span A (선행스팬 A) = (Tenkan + Kijun) / 2, displaced forward
  // We need to project future time values
  for (let i = 0; i < result.tenkanSen.length && i < result.kijunSen.length; i++) {
    const tenkanIdx = i;
    const kijunIdx = i;

    // Future time calculation (add displacement * interval seconds)
    const currentTime = result.tenkanSen[tenkanIdx].time as number;
    const futureTime = currentTime + (displacement * getIntervalSeconds('1d')); // Approximate

    result.senkouSpanA.push({
      time: futureTime as Time,
      value: (result.tenkanSen[tenkanIdx].value + result.kijunSen[kijunIdx].value) / 2,
    });
  }

  // Calculate Senkou Span B (선행스팬 B) = 52-period midpoint, displaced forward
  for (let i = senkouBPeriod - 1; i < data.length; i++) {
    const currentTime = data[i].time as number;
    const futureTime = currentTime + (displacement * getIntervalSeconds('1d'));

    result.senkouSpanB.push({
      time: futureTime as Time,
      value: calculateMidpoint(i - senkouBPeriod + 1, senkouBPeriod),
    });
  }

  // Calculate Chikou Span (후행스팬) = Current close, displaced backward
  for (let i = displacement; i < data.length; i++) {
    result.chikouSpan.push({
      time: data[i - displacement].time,
      value: data[i].close,
    });
  }

  return result;
}

/**
 * Calculate Ichimoku with proper time alignment for the current interval
 */
export function calculateIchimokuForInterval(
  data: CandleData[],
  interval: string,
  tenkanPeriod: number = 9,
  kijunPeriod: number = 26,
  senkouBPeriod: number = 52,
  displacement: number = 26
): IchimokuData {
  const result: IchimokuData = {
    tenkanSen: [],
    kijunSen: [],
    senkouSpanA: [],
    senkouSpanB: [],
    chikouSpan: [],
  };

  if (data.length < senkouBPeriod) return result;

  const intervalSeconds = getIntervalSeconds(interval);

  // Helper: Calculate (highest high + lowest low) / 2 for a period
  const calculateMidpoint = (endIdx: number, period: number): number => {
    let highest = -Infinity;
    let lowest = Infinity;
    const startIdx = Math.max(0, endIdx - period + 1);
    for (let i = startIdx; i <= endIdx; i++) {
      highest = Math.max(highest, data[i].high);
      lowest = Math.min(lowest, data[i].low);
    }
    return (highest + lowest) / 2;
  };

  // Calculate all lines
  for (let i = 0; i < data.length; i++) {
    const currentTime = data[i].time as number;

    // Tenkan-sen (전환선)
    if (i >= tenkanPeriod - 1) {
      result.tenkanSen.push({
        time: data[i].time,
        value: calculateMidpoint(i, tenkanPeriod),
      });
    }

    // Kijun-sen (기준선)
    if (i >= kijunPeriod - 1) {
      result.kijunSen.push({
        time: data[i].time,
        value: calculateMidpoint(i, kijunPeriod),
      });
    }

    // Senkou Span A (선행스팬 A) - projected forward
    if (i >= Math.max(tenkanPeriod, kijunPeriod) - 1) {
      const tenkan = calculateMidpoint(i, tenkanPeriod);
      const kijun = calculateMidpoint(i, kijunPeriod);
      const futureTime = currentTime + (displacement * intervalSeconds);

      result.senkouSpanA.push({
        time: futureTime as Time,
        value: (tenkan + kijun) / 2,
      });
    }

    // Senkou Span B (선행스팬 B) - projected forward
    if (i >= senkouBPeriod - 1) {
      const futureTime = currentTime + (displacement * intervalSeconds);

      result.senkouSpanB.push({
        time: futureTime as Time,
        value: calculateMidpoint(i, senkouBPeriod),
      });
    }

    // Chikou Span (후행스팬) - projected backward
    if (i >= displacement) {
      result.chikouSpan.push({
        time: data[i - displacement].time,
        value: data[i].close,
      });
    }
  }

  return result;
}

/**
 * Helper function: Calculate EMA from LineData (for MACD signal)
 */
function calculateEMAFromLine(data: LineData[], period: number): LineData[] {
  if (data.length < period) return [];

  const result: LineData[] = [];
  const multiplier = 2 / (period + 1);

  // First EMA = SMA
  const firstSMA = data.slice(0, period).reduce((sum, d) => sum + d.value, 0) / period;
  result.push({ time: data[period - 1].time, value: firstSMA });

  // Calculate rest
  for (let i = period; i < data.length; i++) {
    const prevEMA = result[result.length - 1].value;
    const value = (data[i].value - prevEMA) * multiplier + prevEMA;
    result.push({ time: data[i].time, value });
  }

  return result;
}

/**
 * Get interval in seconds for candle time calculation
 */
export function getIntervalSeconds(interval: string): number {
  const map: Record<string, number> = {
    '1m': 60,
    '3m': 180,
    '5m': 300,
    '15m': 900,
    '30m': 1800,
    '1h': 3600,
    '2h': 7200,
    '4h': 14400,
    '6h': 21600,
    '8h': 28800,
    '12h': 43200,
    '1d': 86400,
    '3d': 259200,
    '1w': 604800,
    '1M': 2592000,
  };
  return map[interval] || 60;
}

/**
 * Generate a unique color for custom indicators
 */
export function generateIndicatorColor(index: number, type: 'ma' | 'ema' | 'rsi' = 'ma'): string {
  const colors = INDICATOR_COLORS[type];
  return colors[index % colors.length];
}

// ============================================
// Additional Technical Indicators
// ============================================

/**
 * Bollinger Bands Data Structure
 */
export interface BollingerBandsData {
  upper: LineData[];
  middle: LineData[];
  lower: LineData[];
}

/**
 * Calculate Bollinger Bands
 * @param data - OHLCV data
 * @param period - SMA period (default: 20)
 * @param stdDev - Standard deviation multiplier (default: 2)
 */
export function calculateBollingerBands(
  data: CandleData[],
  period: number = 20,
  stdDev: number = 2
): BollingerBandsData {
  const result: BollingerBandsData = { upper: [], middle: [], lower: [] };

  if (data.length < period) return result;

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const closes = slice.map(d => d.close);

    // Calculate SMA (middle band)
    const sma = closes.reduce((sum, val) => sum + val, 0) / period;

    // Calculate standard deviation
    const squaredDiffs = closes.map(val => Math.pow(val - sma, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;
    const std = Math.sqrt(variance);

    const time = data[i].time;

    result.middle.push({ time, value: sma });
    result.upper.push({ time, value: sma + (stdDev * std) });
    result.lower.push({ time, value: sma - (stdDev * std) });
  }

  return result;
}

/**
 * Stochastic Oscillator Data Structure
 */
export interface StochasticData {
  k: LineData[];  // %K line (fast)
  d: LineData[];  // %D line (slow - SMA of %K)
}

/**
 * Calculate Stochastic Oscillator
 * @param data - OHLCV data
 * @param kPeriod - %K period (default: 14)
 * @param dPeriod - %D period / smoothing (default: 3)
 * @param smooth - %K smoothing (default: 3)
 */
export function calculateStochastic(
  data: CandleData[],
  kPeriod: number = 14,
  dPeriod: number = 3,
  smooth: number = 3
): StochasticData {
  const result: StochasticData = { k: [], d: [] };

  if (data.length < kPeriod) return result;

  const rawK: LineData[] = [];

  // Calculate raw %K
  for (let i = kPeriod - 1; i < data.length; i++) {
    const slice = data.slice(i - kPeriod + 1, i + 1);
    const highestHigh = Math.max(...slice.map(d => d.high));
    const lowestLow = Math.min(...slice.map(d => d.low));
    const currentClose = data[i].close;

    const rawKValue = highestHigh !== lowestLow
      ? ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100
      : 50;

    rawK.push({ time: data[i].time, value: rawKValue });
  }

  // Smooth %K (Fast Stochastic -> Slow Stochastic)
  if (rawK.length >= smooth) {
    for (let i = smooth - 1; i < rawK.length; i++) {
      const slice = rawK.slice(i - smooth + 1, i + 1);
      const smoothedK = slice.reduce((sum, d) => sum + d.value, 0) / smooth;
      result.k.push({ time: rawK[i].time, value: smoothedK });
    }
  }

  // Calculate %D (SMA of smoothed %K)
  if (result.k.length >= dPeriod) {
    for (let i = dPeriod - 1; i < result.k.length; i++) {
      const slice = result.k.slice(i - dPeriod + 1, i + 1);
      const dValue = slice.reduce((sum, d) => sum + d.value, 0) / dPeriod;
      result.d.push({ time: result.k[i].time, value: dValue });
    }
  }

  return result;
}

/**
 * Calculate Average True Range (ATR)
 * @param data - OHLCV data
 * @param period - ATR period (default: 14)
 */
export function calculateATR(data: CandleData[], period: number = 14): LineData[] {
  if (data.length < period + 1) return [];

  const result: LineData[] = [];
  const trueRanges: number[] = [];

  // Calculate True Range for each candle
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  // First ATR = Simple average of first 'period' TRs
  if (trueRanges.length >= period) {
    let atr = trueRanges.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    result.push({ time: data[period].time, value: atr });

    // Subsequent ATRs use smoothing
    for (let i = period; i < trueRanges.length; i++) {
      atr = (atr * (period - 1) + trueRanges[i]) / period;
      result.push({ time: data[i + 1].time, value: atr });
    }
  }

  return result;
}

/**
 * VWAP Data Structure
 */
export interface VWAPData {
  vwap: LineData[];
  upperBand: LineData[];  // +1 std dev
  lowerBand: LineData[];  // -1 std dev
}

/**
 * Calculate VWAP (Volume Weighted Average Price)
 * Note: VWAP resets at the start of each trading day for intraday charts
 * @param data - OHLCV data
 * @param stdDevMultiplier - Standard deviation multiplier for bands (default: 2)
 */
export function calculateVWAP(data: CandleData[], stdDevMultiplier: number = 2): VWAPData {
  const result: VWAPData = { vwap: [], upperBand: [], lowerBand: [] };

  if (data.length === 0) return result;

  let cumulativeTPV = 0;  // Cumulative (Typical Price * Volume)
  let cumulativeVolume = 0;
  const typicalPrices: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const candle = data[i];
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    const volume = candle.volume || 0;

    cumulativeTPV += typicalPrice * volume;
    cumulativeVolume += volume;
    typicalPrices.push(typicalPrice);

    if (cumulativeVolume === 0) {
      result.vwap.push({ time: candle.time, value: typicalPrice });
      result.upperBand.push({ time: candle.time, value: typicalPrice });
      result.lowerBand.push({ time: candle.time, value: typicalPrice });
      continue;
    }

    const vwap = cumulativeTPV / cumulativeVolume;

    // Calculate standard deviation of typical prices from VWAP
    let sumSquaredDiff = 0;
    for (let j = 0; j <= i; j++) {
      sumSquaredDiff += Math.pow(typicalPrices[j] - vwap, 2);
    }
    const stdDev = Math.sqrt(sumSquaredDiff / (i + 1));

    result.vwap.push({ time: candle.time, value: vwap });
    result.upperBand.push({ time: candle.time, value: vwap + (stdDevMultiplier * stdDev) });
    result.lowerBand.push({ time: candle.time, value: vwap - (stdDevMultiplier * stdDev) });
  }

  return result;
}

/**
 * Supertrend Data Structure
 */
export interface SupertrendData {
  supertrend: LineData[];
  direction: { time: Time; value: 1 | -1 }[];  // 1 = bullish, -1 = bearish
  upperBand: LineData[];
  lowerBand: LineData[];
}

/**
 * Calculate Supertrend Indicator
 * @param data - OHLCV data
 * @param period - ATR period (default: 10)
 * @param multiplier - ATR multiplier (default: 3)
 */
export function calculateSupertrend(
  data: CandleData[],
  period: number = 10,
  multiplier: number = 3
): SupertrendData {
  const result: SupertrendData = {
    supertrend: [],
    direction: [],
    upperBand: [],
    lowerBand: [],
  };

  if (data.length < period + 1) return result;

  // Calculate ATR first
  const atrValues = calculateATR(data, period);
  if (atrValues.length === 0) return result;

  const startIdx = period;
  let prevUpperBand = 0;
  let prevLowerBand = 0;
  let prevSupertrend = 0;
  let prevDirection = 1;

  for (let i = 0; i < atrValues.length; i++) {
    const dataIdx = startIdx + i;
    const atr = atrValues[i].value;
    const candle = data[dataIdx];
    const hl2 = (candle.high + candle.low) / 2;

    // Basic bands
    let upperBand = hl2 + (multiplier * atr);
    let lowerBand = hl2 - (multiplier * atr);

    // Adjust bands based on previous values
    if (i > 0) {
      const prevClose = data[dataIdx - 1].close;

      // Upper band: take lower of current and previous if previous close was below previous upper
      if (prevClose <= prevUpperBand) {
        upperBand = Math.min(upperBand, prevUpperBand);
      }

      // Lower band: take higher of current and previous if previous close was above previous lower
      if (prevClose >= prevLowerBand) {
        lowerBand = Math.max(lowerBand, prevLowerBand);
      }
    }

    // Determine supertrend and direction
    let supertrend: number;
    let direction: 1 | -1;

    if (i === 0) {
      // First value
      supertrend = candle.close > hl2 ? lowerBand : upperBand;
      direction = candle.close > hl2 ? 1 : -1;
    } else {
      const prevClose = data[dataIdx - 1].close;

      if (prevSupertrend === prevUpperBand) {
        // Was bearish
        if (candle.close > upperBand) {
          supertrend = lowerBand;
          direction = 1;
        } else {
          supertrend = upperBand;
          direction = -1;
        }
      } else {
        // Was bullish
        if (candle.close < lowerBand) {
          supertrend = upperBand;
          direction = -1;
        } else {
          supertrend = lowerBand;
          direction = 1;
        }
      }
    }

    result.supertrend.push({ time: candle.time, value: supertrend });
    result.direction.push({ time: candle.time, value: direction });
    result.upperBand.push({ time: candle.time, value: upperBand });
    result.lowerBand.push({ time: candle.time, value: lowerBand });

    prevUpperBand = upperBand;
    prevLowerBand = lowerBand;
    prevSupertrend = supertrend;
    prevDirection = direction;
  }

  return result;
}

/**
 * EMA Ribbon - Multiple EMAs for trend visualization
 * @param data - OHLCV data
 * @param periods - Array of EMA periods (default: [8, 13, 21, 34, 55, 89, 144, 233])
 */
export function calculateEMARibbon(
  data: CandleData[],
  periods: number[] = [8, 13, 21, 34, 55, 89, 144, 233]
): LineData[][] {
  return periods.map(period => calculateEMA(data, period));
}

/**
 * Williams %R - Momentum indicator
 * @param data - OHLCV data
 * @param period - Lookback period (default: 14)
 */
export function calculateWilliamsR(data: CandleData[], period: number = 14): LineData[] {
  const result: LineData[] = [];

  if (data.length < period) return result;

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const highestHigh = Math.max(...slice.map(d => d.high));
    const lowestLow = Math.min(...slice.map(d => d.low));
    const currentClose = data[i].close;

    const williamsR = highestHigh !== lowestLow
      ? ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100
      : -50;

    result.push({ time: data[i].time, value: williamsR });
  }

  return result;
}

/**
 * CCI (Commodity Channel Index)
 * @param data - OHLCV data
 * @param period - CCI period (default: 20)
 */
export function calculateCCI(data: CandleData[], period: number = 20): LineData[] {
  const result: LineData[] = [];

  if (data.length < period) return result;

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);

    // Calculate typical prices
    const typicalPrices = slice.map(d => (d.high + d.low + d.close) / 3);

    // Calculate SMA of typical prices
    const sma = typicalPrices.reduce((sum, val) => sum + val, 0) / period;

    // Calculate mean deviation
    const meanDev = typicalPrices.reduce((sum, val) => sum + Math.abs(val - sma), 0) / period;

    // Calculate CCI
    const currentTP = typicalPrices[typicalPrices.length - 1];
    const cci = meanDev !== 0 ? (currentTP - sma) / (0.015 * meanDev) : 0;

    result.push({ time: data[i].time, value: cci });
  }

  return result;
}

/**
 * ADX (Average Directional Index) with +DI and -DI
 */
export interface ADXData {
  adx: LineData[];
  plusDI: LineData[];
  minusDI: LineData[];
}

/**
 * Calculate ADX (Average Directional Index)
 * @param data - OHLCV data
 * @param period - ADX period (default: 14)
 */
export function calculateADX(data: CandleData[], period: number = 14): ADXData {
  const result: ADXData = { adx: [], plusDI: [], minusDI: [] };

  if (data.length < period * 2) return result;

  const trList: number[] = [];
  const plusDMList: number[] = [];
  const minusDMList: number[] = [];

  // Calculate TR, +DM, -DM
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevHigh = data[i - 1].high;
    const prevLow = data[i - 1].low;
    const prevClose = data[i - 1].close;

    // True Range
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trList.push(tr);

    // Directional Movement
    const upMove = high - prevHigh;
    const downMove = prevLow - low;

    const plusDM = upMove > downMove && upMove > 0 ? upMove : 0;
    const minusDM = downMove > upMove && downMove > 0 ? downMove : 0;

    plusDMList.push(plusDM);
    minusDMList.push(minusDM);
  }

  // Smooth TR, +DM, -DM using Wilder's smoothing
  const smoothTR: number[] = [];
  const smoothPlusDM: number[] = [];
  const smoothMinusDM: number[] = [];

  // First smoothed value = sum of first period values
  let sumTR = trList.slice(0, period).reduce((a, b) => a + b, 0);
  let sumPlusDM = plusDMList.slice(0, period).reduce((a, b) => a + b, 0);
  let sumMinusDM = minusDMList.slice(0, period).reduce((a, b) => a + b, 0);

  smoothTR.push(sumTR);
  smoothPlusDM.push(sumPlusDM);
  smoothMinusDM.push(sumMinusDM);

  // Subsequent smoothed values
  for (let i = period; i < trList.length; i++) {
    sumTR = sumTR - (sumTR / period) + trList[i];
    sumPlusDM = sumPlusDM - (sumPlusDM / period) + plusDMList[i];
    sumMinusDM = sumMinusDM - (sumMinusDM / period) + minusDMList[i];

    smoothTR.push(sumTR);
    smoothPlusDM.push(sumPlusDM);
    smoothMinusDM.push(sumMinusDM);
  }

  // Calculate +DI, -DI, DX
  const dxList: number[] = [];

  for (let i = 0; i < smoothTR.length; i++) {
    const dataIdx = period + i;
    const plusDI = smoothTR[i] !== 0 ? (smoothPlusDM[i] / smoothTR[i]) * 100 : 0;
    const minusDI = smoothTR[i] !== 0 ? (smoothMinusDM[i] / smoothTR[i]) * 100 : 0;

    result.plusDI.push({ time: data[dataIdx].time, value: plusDI });
    result.minusDI.push({ time: data[dataIdx].time, value: minusDI });

    // DX
    const diSum = plusDI + minusDI;
    const dx = diSum !== 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0;
    dxList.push(dx);
  }

  // Calculate ADX (smoothed DX)
  if (dxList.length >= period) {
    let adx = dxList.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result.adx.push({ time: result.plusDI[period - 1].time, value: adx });

    for (let i = period; i < dxList.length; i++) {
      adx = (adx * (period - 1) + dxList[i]) / period;
      result.adx.push({ time: result.plusDI[i].time, value: adx });
    }
  }

  return result;
}

/**
 * OBV (On-Balance Volume)
 * @param data - OHLCV data
 */
export function calculateOBV(data: CandleData[]): LineData[] {
  const result: LineData[] = [];

  if (data.length === 0) return result;

  let obv = 0;
  result.push({ time: data[0].time, value: obv });

  for (let i = 1; i < data.length; i++) {
    const volume = data[i].volume || 0;

    if (data[i].close > data[i - 1].close) {
      obv += volume;
    } else if (data[i].close < data[i - 1].close) {
      obv -= volume;
    }
    // If close equals previous close, OBV stays the same

    result.push({ time: data[i].time, value: obv });
  }

  return result;
}

/**
 * Parabolic SAR
 */
export interface ParabolicSARData {
  sar: LineData[];
  isUpTrend: { time: Time; value: boolean }[];
}

/**
 * Calculate Parabolic SAR
 * @param data - OHLCV data
 * @param step - Acceleration factor step (default: 0.02)
 * @param max - Maximum acceleration factor (default: 0.2)
 */
export function calculateParabolicSAR(
  data: CandleData[],
  step: number = 0.02,
  max: number = 0.2
): ParabolicSARData {
  const result: ParabolicSARData = { sar: [], isUpTrend: [] };

  if (data.length < 2) return result;

  let isUpTrend = data[1].close > data[0].close;
  let af = step;
  let ep = isUpTrend ? data[0].high : data[0].low;
  let sar = isUpTrend ? data[0].low : data[0].high;

  result.sar.push({ time: data[0].time, value: sar });
  result.isUpTrend.push({ time: data[0].time, value: isUpTrend });

  for (let i = 1; i < data.length; i++) {
    const prevSar = sar;
    const high = data[i].high;
    const low = data[i].low;

    // Calculate new SAR
    sar = prevSar + af * (ep - prevSar);

    // Adjust SAR to be within bounds
    if (isUpTrend) {
      sar = Math.min(sar, data[i - 1].low);
      if (i >= 2) sar = Math.min(sar, data[i - 2].low);
    } else {
      sar = Math.max(sar, data[i - 1].high);
      if (i >= 2) sar = Math.max(sar, data[i - 2].high);
    }

    // Check for trend reversal
    let reversed = false;
    if (isUpTrend && low < sar) {
      isUpTrend = false;
      reversed = true;
      sar = ep;
      ep = low;
      af = step;
    } else if (!isUpTrend && high > sar) {
      isUpTrend = true;
      reversed = true;
      sar = ep;
      ep = high;
      af = step;
    }

    if (!reversed) {
      // Update EP and AF
      if (isUpTrend && high > ep) {
        ep = high;
        af = Math.min(af + step, max);
      } else if (!isUpTrend && low < ep) {
        ep = low;
        af = Math.min(af + step, max);
      }
    }

    result.sar.push({ time: data[i].time, value: sar });
    result.isUpTrend.push({ time: data[i].time, value: isUpTrend });
  }

  return result;
}
