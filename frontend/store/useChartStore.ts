/**
 * Zustand store for advanced chart configuration
 * Supports multiple custom indicators, drawing tools, and advanced settings
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { INDICATOR_COLORS, generateIndicatorColor } from '@/lib/indicators';

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
export type DrawingToolType = 'horizontalLine' | 'trendLine' | 'rectangle' | 'fibonacciRetracement';

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

interface ChartStore {
  // Basic state
  symbol: string;
  interval: TimeInterval;
  loading: boolean;
  error: string | null;

  // Moving Averages (up to 10 custom MA/EMA)
  movingAverages: MovingAverageConfig[];

  // RSI (up to 5 custom RSI)
  rsiConfigs: RSIConfig[];
  showRSIPanel: boolean;

  // Ichimoku
  ichimoku: IchimokuConfig;

  // Volume
  volume: VolumeConfig;

  // MACD
  macd: MACDConfig;

  // Bollinger Bands
  bollingerBands: BollingerBandsConfig;

  // Stochastic
  stochastic: StochasticConfig;

  // ATR
  atr: ATRConfig;

  // VWAP
  vwap: VWAPConfig;

  // Supertrend
  supertrend: SupertrendConfig;

  // ADX
  adx: ADXConfig;

  // OBV
  obv: OBVConfig;

  // Parabolic SAR
  parabolicSAR: ParabolicSARConfig;

  // EMA Ribbon
  emaRibbon: EMARibbonConfig;

  // Drawing tools
  activeDrawingTool: DrawingToolType | null;
  drawings: DrawingObject[];
  drawingColor: string;
  drawingLineWidth: number;

  // Actions - Basic
  setSymbol: (symbol: string) => void;
  setInterval: (interval: TimeInterval) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Actions - Moving Averages
  addMovingAverage: (type: 'sma' | 'ema', period: number) => void;
  removeMovingAverage: (id: string) => void;
  updateMovingAverage: (id: string, updates: Partial<MovingAverageConfig>) => void;
  toggleMovingAverage: (id: string) => void;

  // Actions - RSI
  addRSI: (period: number) => void;
  removeRSI: (id: string) => void;
  updateRSI: (id: string, updates: Partial<RSIConfig>) => void;
  toggleRSI: (id: string) => void;
  setShowRSIPanel: (show: boolean) => void;

  // Actions - Ichimoku
  updateIchimoku: (updates: Partial<IchimokuConfig>) => void;
  toggleIchimoku: () => void;

  // Actions - Volume
  updateVolume: (updates: Partial<VolumeConfig>) => void;
  toggleVolume: () => void;

  // Actions - MACD
  updateMACD: (updates: Partial<MACDConfig>) => void;
  toggleMACD: () => void;

  // Actions - Bollinger Bands
  updateBollingerBands: (updates: Partial<BollingerBandsConfig>) => void;
  toggleBollingerBands: () => void;

  // Actions - Stochastic
  updateStochastic: (updates: Partial<StochasticConfig>) => void;
  toggleStochastic: () => void;

  // Actions - ATR
  updateATR: (updates: Partial<ATRConfig>) => void;
  toggleATR: () => void;

  // Actions - VWAP
  updateVWAP: (updates: Partial<VWAPConfig>) => void;
  toggleVWAP: () => void;

  // Actions - Supertrend
  updateSupertrend: (updates: Partial<SupertrendConfig>) => void;
  toggleSupertrend: () => void;

  // Actions - ADX
  updateADX: (updates: Partial<ADXConfig>) => void;
  toggleADX: () => void;

  // Actions - OBV
  toggleOBV: () => void;

  // Actions - Parabolic SAR
  updateParabolicSAR: (updates: Partial<ParabolicSARConfig>) => void;
  toggleParabolicSAR: () => void;

  // Actions - EMA Ribbon
  updateEMARibbon: (updates: Partial<EMARibbonConfig>) => void;
  toggleEMARibbon: () => void;

  // Actions - Drawing tools
  setActiveDrawingTool: (tool: DrawingToolType | null) => void;
  addDrawing: (drawing: Omit<DrawingObject, 'id'>) => void;
  removeDrawing: (id: string) => void;
  updateDrawing: (id: string, updates: Partial<DrawingObject>) => void;
  clearAllDrawings: () => void;
  setDrawingColor: (color: string) => void;
  setDrawingLineWidth: (width: number) => void;

  // Reset
  reset: () => void;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Default moving averages
const DEFAULT_MOVING_AVERAGES: MovingAverageConfig[] = [
  { id: generateId(), period: 7, type: 'sma', color: INDICATOR_COLORS.ma[0], enabled: true, lineWidth: 1 },
  { id: generateId(), period: 25, type: 'sma', color: INDICATOR_COLORS.ma[1], enabled: true, lineWidth: 1 },
  { id: generateId(), period: 99, type: 'sma', color: INDICATOR_COLORS.ma[2], enabled: true, lineWidth: 1 },
];

// Default RSI configs
const DEFAULT_RSI_CONFIGS: RSIConfig[] = [
  { id: generateId(), period: 14, color: INDICATOR_COLORS.rsi[0], enabled: true, overbought: 70, oversold: 30 },
];

// Default Ichimoku
const DEFAULT_ICHIMOKU: IchimokuConfig = {
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
const DEFAULT_VOLUME: VolumeConfig = {
  enabled: true,
  showMA: true,
  maPeriod: 20,
  maColor: INDICATOR_COLORS.volumeMA,
};

// Default MACD
const DEFAULT_MACD: MACDConfig = {
  enabled: false,
  fastPeriod: 12,
  slowPeriod: 26,
  signalPeriod: 9,
};

// Default Bollinger Bands
const DEFAULT_BOLLINGER_BANDS: BollingerBandsConfig = {
  enabled: false,
  period: 20,
  stdDev: 2,
  showFill: true,
};

// Default Stochastic
const DEFAULT_STOCHASTIC: StochasticConfig = {
  enabled: false,
  kPeriod: 14,
  dPeriod: 3,
  smooth: 3,
  overbought: 80,
  oversold: 20,
};

// Default ATR
const DEFAULT_ATR: ATRConfig = {
  enabled: false,
  period: 14,
};

// Default VWAP
const DEFAULT_VWAP: VWAPConfig = {
  enabled: false,
  showBands: true,
  stdDevMultiplier: 2,
};

// Default Supertrend
const DEFAULT_SUPERTREND: SupertrendConfig = {
  enabled: false,
  period: 10,
  multiplier: 3,
};

// Default ADX
const DEFAULT_ADX: ADXConfig = {
  enabled: false,
  period: 14,
  showDI: true,
};

// Default OBV
const DEFAULT_OBV: OBVConfig = {
  enabled: false,
};

// Default Parabolic SAR
const DEFAULT_PARABOLIC_SAR: ParabolicSARConfig = {
  enabled: false,
  step: 0.02,
  max: 0.2,
};

// Default EMA Ribbon
const DEFAULT_EMA_RIBBON: EMARibbonConfig = {
  enabled: false,
  periods: [8, 13, 21, 34, 55, 89],
};

export const useChartStore = create<ChartStore>()(
  persist(
    (set, get) => ({
      // Initial state
      symbol: 'BTCUSDT',
      interval: '1m',
      loading: false,
      error: null,

      movingAverages: DEFAULT_MOVING_AVERAGES,
      rsiConfigs: DEFAULT_RSI_CONFIGS,
      showRSIPanel: true,
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

      activeDrawingTool: null,
      drawings: [],
      drawingColor: INDICATOR_COLORS.horizontalLine,
      drawingLineWidth: 1,

      // Basic actions
      setSymbol: (symbol) => set({ symbol, loading: true, error: null }),
      setInterval: (interval) => set({ interval, loading: true, error: null }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error, loading: false }),

      // Moving Average actions
      addMovingAverage: (type, period) => {
        const { movingAverages } = get();
        if (movingAverages.length >= 10) return; // Max 10 MAs

        const colorIndex = movingAverages.length;
        const newMA: MovingAverageConfig = {
          id: generateId(),
          period,
          type,
          color: generateIndicatorColor(colorIndex, type === 'sma' ? 'ma' : 'ema'),
          enabled: true,
          lineWidth: 1,
        };

        set({ movingAverages: [...movingAverages, newMA] });
      },

      removeMovingAverage: (id) => {
        set({ movingAverages: get().movingAverages.filter((ma) => ma.id !== id) });
      },

      updateMovingAverage: (id, updates) => {
        set({
          movingAverages: get().movingAverages.map((ma) =>
            ma.id === id ? { ...ma, ...updates } : ma
          ),
        });
      },

      toggleMovingAverage: (id) => {
        set({
          movingAverages: get().movingAverages.map((ma) =>
            ma.id === id ? { ...ma, enabled: !ma.enabled } : ma
          ),
        });
      },

      // RSI actions
      addRSI: (period) => {
        const { rsiConfigs } = get();
        if (rsiConfigs.length >= 5) return; // Max 5 RSIs

        const colorIndex = rsiConfigs.length;
        const newRSI: RSIConfig = {
          id: generateId(),
          period,
          color: generateIndicatorColor(colorIndex, 'rsi'),
          enabled: true,
          overbought: 70,
          oversold: 30,
        };

        set({ rsiConfigs: [...rsiConfigs, newRSI] });
      },

      removeRSI: (id) => {
        set({ rsiConfigs: get().rsiConfigs.filter((rsi) => rsi.id !== id) });
      },

      updateRSI: (id, updates) => {
        set({
          rsiConfigs: get().rsiConfigs.map((rsi) =>
            rsi.id === id ? { ...rsi, ...updates } : rsi
          ),
        });
      },

      toggleRSI: (id) => {
        set({
          rsiConfigs: get().rsiConfigs.map((rsi) =>
            rsi.id === id ? { ...rsi, enabled: !rsi.enabled } : rsi
          ),
        });
      },

      setShowRSIPanel: (show) => set({ showRSIPanel: show }),

      // Ichimoku actions
      updateIchimoku: (updates) => {
        set({ ichimoku: { ...get().ichimoku, ...updates } });
      },

      toggleIchimoku: () => {
        set({ ichimoku: { ...get().ichimoku, enabled: !get().ichimoku.enabled } });
      },

      // Volume actions
      updateVolume: (updates) => {
        set({ volume: { ...get().volume, ...updates } });
      },

      toggleVolume: () => {
        set({ volume: { ...get().volume, enabled: !get().volume.enabled } });
      },

      // MACD actions
      updateMACD: (updates) => {
        set({ macd: { ...get().macd, ...updates } });
      },

      toggleMACD: () => {
        set({ macd: { ...get().macd, enabled: !get().macd.enabled } });
      },

      // Bollinger Bands actions
      updateBollingerBands: (updates) => {
        set({ bollingerBands: { ...get().bollingerBands, ...updates } });
      },

      toggleBollingerBands: () => {
        set({ bollingerBands: { ...get().bollingerBands, enabled: !get().bollingerBands.enabled } });
      },

      // Stochastic actions
      updateStochastic: (updates) => {
        set({ stochastic: { ...get().stochastic, ...updates } });
      },

      toggleStochastic: () => {
        set({ stochastic: { ...get().stochastic, enabled: !get().stochastic.enabled } });
      },

      // ATR actions
      updateATR: (updates) => {
        set({ atr: { ...get().atr, ...updates } });
      },

      toggleATR: () => {
        set({ atr: { ...get().atr, enabled: !get().atr.enabled } });
      },

      // VWAP actions
      updateVWAP: (updates) => {
        set({ vwap: { ...get().vwap, ...updates } });
      },

      toggleVWAP: () => {
        set({ vwap: { ...get().vwap, enabled: !get().vwap.enabled } });
      },

      // Supertrend actions
      updateSupertrend: (updates) => {
        set({ supertrend: { ...get().supertrend, ...updates } });
      },

      toggleSupertrend: () => {
        set({ supertrend: { ...get().supertrend, enabled: !get().supertrend.enabled } });
      },

      // ADX actions
      updateADX: (updates) => {
        set({ adx: { ...get().adx, ...updates } });
      },

      toggleADX: () => {
        set({ adx: { ...get().adx, enabled: !get().adx.enabled } });
      },

      // OBV actions
      toggleOBV: () => {
        set({ obv: { ...get().obv, enabled: !get().obv.enabled } });
      },

      // Parabolic SAR actions
      updateParabolicSAR: (updates) => {
        set({ parabolicSAR: { ...get().parabolicSAR, ...updates } });
      },

      toggleParabolicSAR: () => {
        set({ parabolicSAR: { ...get().parabolicSAR, enabled: !get().parabolicSAR.enabled } });
      },

      // EMA Ribbon actions
      updateEMARibbon: (updates) => {
        set({ emaRibbon: { ...get().emaRibbon, ...updates } });
      },

      toggleEMARibbon: () => {
        set({ emaRibbon: { ...get().emaRibbon, enabled: !get().emaRibbon.enabled } });
      },

      // Drawing actions
      setActiveDrawingTool: (tool) => set({ activeDrawingTool: tool }),

      addDrawing: (drawing) => {
        const newDrawing: DrawingObject = {
          ...drawing,
          id: generateId(),
        };
        set({ drawings: [...get().drawings, newDrawing] });
      },

      removeDrawing: (id) => {
        set({ drawings: get().drawings.filter((d) => d.id !== id) });
      },

      updateDrawing: (id, updates) => {
        set({
          drawings: get().drawings.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        });
      },

      clearAllDrawings: () => set({ drawings: [] }),

      setDrawingColor: (color) => set({ drawingColor: color }),

      setDrawingLineWidth: (width) => set({ drawingLineWidth: width }),

      // Reset
      reset: () =>
        set({
          symbol: 'BTCUSDT',
          interval: '1m',
          loading: false,
          error: null,
          movingAverages: DEFAULT_MOVING_AVERAGES,
          rsiConfigs: DEFAULT_RSI_CONFIGS,
          showRSIPanel: true,
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
          activeDrawingTool: null,
          drawings: [],
          drawingColor: INDICATOR_COLORS.horizontalLine,
          drawingLineWidth: 1,
        }),
    }),
    {
      name: 'chart-settings',
      partialize: (state) => ({
        movingAverages: state.movingAverages,
        rsiConfigs: state.rsiConfigs,
        showRSIPanel: state.showRSIPanel,
        ichimoku: state.ichimoku,
        volume: state.volume,
        macd: state.macd,
        bollingerBands: state.bollingerBands,
        stochastic: state.stochastic,
        atr: state.atr,
        vwap: state.vwap,
        supertrend: state.supertrend,
        adx: state.adx,
        obv: state.obv,
        parabolicSAR: state.parabolicSAR,
        emaRibbon: state.emaRibbon,
        drawings: state.drawings,
        drawingColor: state.drawingColor,
        drawingLineWidth: state.drawingLineWidth,
      }),
    }
  )
);

// Selectors
export const selectEnabledMAs = (state: ChartStore) =>
  state.movingAverages.filter((ma) => ma.enabled);

export const selectEnabledRSIs = (state: ChartStore) =>
  state.rsiConfigs.filter((rsi) => rsi.enabled);

export const selectHasSubPanels = (state: ChartStore) =>
  (state.showRSIPanel && state.rsiConfigs.some((r) => r.enabled)) ||
  state.macd.enabled ||
  state.stochastic.enabled ||
  state.atr.enabled ||
  state.adx.enabled ||
  state.obv.enabled;
