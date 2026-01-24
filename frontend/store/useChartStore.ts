/**
 * Zustand store for advanced chart configuration
 * Supports multiple custom indicators, drawing tools, and advanced settings
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { INDICATOR_COLORS, generateIndicatorColor } from '@/lib/indicators';

// Import types and defaults from chart module
import {
  TimeInterval,
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
  DrawingToolType,
  DrawingObject,
} from './chart/types';

import {
  generateId,
  DEFAULT_MOVING_AVERAGES,
  DEFAULT_RSI_CONFIGS,
  DEFAULT_ICHIMOKU,
  DEFAULT_VOLUME,
  DEFAULT_MACD,
  DEFAULT_BOLLINGER_BANDS,
  DEFAULT_STOCHASTIC,
  DEFAULT_ATR,
  DEFAULT_VWAP,
  DEFAULT_SUPERTREND,
  DEFAULT_ADX,
  DEFAULT_OBV,
  DEFAULT_PARABOLIC_SAR,
  DEFAULT_EMA_RIBBON,
} from './chart/defaults';

// Re-export types for backward compatibility
export type {
  TimeInterval,
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
  DrawingToolType,
  DrawingObject,
};

// Indicator state keys that have enabled/update/toggle pattern
type IndicatorKey =
  | 'ichimoku'
  | 'volume'
  | 'macd'
  | 'bollingerBands'
  | 'stochastic'
  | 'atr'
  | 'vwap'
  | 'supertrend'
  | 'adx'
  | 'obv'
  | 'parabolicSAR'
  | 'emaRibbon';

// Last indicator values for display when not hovering
export interface LastIndicatorValues {
  // Overlay indicators
  ma: Record<string, number>;
  bollingerBands?: { upper: number; middle: number; lower: number };
  vwap?: number;
  supertrend?: number;
  // Oscillators
  rsi: Record<string, number>;
  macd?: { macd: number; signal: number; histogram: number };
  stochastic?: { k: number; d: number };
  atr?: number;
  adx?: { adx: number; plusDI: number; minusDI: number };
  obv?: number;
}

interface ChartState {
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

  // Indicator configs
  ichimoku: IchimokuConfig;
  volume: VolumeConfig;
  macd: MACDConfig;
  bollingerBands: BollingerBandsConfig;
  stochastic: StochasticConfig;
  atr: ATRConfig;
  vwap: VWAPConfig;
  supertrend: SupertrendConfig;
  adx: ADXConfig;
  obv: OBVConfig;
  parabolicSAR: ParabolicSARConfig;
  emaRibbon: EMARibbonConfig;

  // Last indicator values (for display when not hovering)
  lastIndicatorValues: LastIndicatorValues;

  // Drawing tools
  activeDrawingTool: DrawingToolType | null;
  drawings: DrawingObject[];
  drawingColor: string;
  drawingLineWidth: number;
}

interface ChartActions {
  // Basic actions
  setSymbol: (symbol: string) => void;
  setInterval: (interval: TimeInterval) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Moving Averages
  addMovingAverage: (type: 'sma' | 'ema', period: number) => void;
  removeMovingAverage: (id: string) => void;
  updateMovingAverage: (id: string, updates: Partial<MovingAverageConfig>) => void;
  toggleMovingAverage: (id: string) => void;

  // RSI
  addRSI: (period: number) => void;
  removeRSI: (id: string) => void;
  updateRSI: (id: string, updates: Partial<RSIConfig>) => void;
  toggleRSI: (id: string) => void;
  setShowRSIPanel: (show: boolean) => void;

  // Generic indicator actions
  updateIndicator: <K extends IndicatorKey>(
    key: K,
    updates: Partial<ChartState[K]>
  ) => void;
  toggleIndicator: (key: IndicatorKey) => void;

  // Legacy indicator actions (for backward compatibility)
  updateIchimoku: (updates: Partial<IchimokuConfig>) => void;
  toggleIchimoku: () => void;
  updateVolume: (updates: Partial<VolumeConfig>) => void;
  toggleVolume: () => void;
  updateMACD: (updates: Partial<MACDConfig>) => void;
  toggleMACD: () => void;
  updateBollingerBands: (updates: Partial<BollingerBandsConfig>) => void;
  toggleBollingerBands: () => void;
  updateStochastic: (updates: Partial<StochasticConfig>) => void;
  toggleStochastic: () => void;
  updateATR: (updates: Partial<ATRConfig>) => void;
  toggleATR: () => void;
  updateVWAP: (updates: Partial<VWAPConfig>) => void;
  toggleVWAP: () => void;
  updateSupertrend: (updates: Partial<SupertrendConfig>) => void;
  toggleSupertrend: () => void;
  updateADX: (updates: Partial<ADXConfig>) => void;
  toggleADX: () => void;
  toggleOBV: () => void;
  updateParabolicSAR: (updates: Partial<ParabolicSARConfig>) => void;
  toggleParabolicSAR: () => void;
  updateEMARibbon: (updates: Partial<EMARibbonConfig>) => void;
  toggleEMARibbon: () => void;

  // Last indicator values
  updateLastIndicatorValues: (values: Partial<LastIndicatorValues>) => void;

  // Drawing tools
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

type ChartStore = ChartState & ChartActions;

// Initial state
const initialState: ChartState = {
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

  lastIndicatorValues: {
    ma: {},
    rsi: {},
  },

  activeDrawingTool: null,
  drawings: [],
  drawingColor: INDICATOR_COLORS.horizontalLine,
  drawingLineWidth: 1,
};

export const useChartStore = create<ChartStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Basic actions
      setSymbol: (symbol) => set({ symbol, loading: true, error: null }),
      setInterval: (interval) => set({ interval, loading: true, error: null }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error, loading: false }),

      // Moving Average actions
      addMovingAverage: (type, period) => {
        const { movingAverages } = get();
        if (movingAverages.length >= 10) return;

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
        if (rsiConfigs.length >= 5) return;

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

      // Generic indicator update/toggle
      updateIndicator: (key, updates) => {
        set({ [key]: { ...get()[key], ...updates } });
      },

      toggleIndicator: (key) => {
        const current = get()[key] as { enabled: boolean };
        set({ [key]: { ...get()[key], enabled: !current.enabled } });
      },

      // Legacy actions using generic methods
      updateIchimoku: (updates) => get().updateIndicator('ichimoku', updates),
      toggleIchimoku: () => get().toggleIndicator('ichimoku'),
      updateVolume: (updates) => get().updateIndicator('volume', updates),
      toggleVolume: () => get().toggleIndicator('volume'),
      updateMACD: (updates) => get().updateIndicator('macd', updates),
      toggleMACD: () => get().toggleIndicator('macd'),
      updateBollingerBands: (updates) => get().updateIndicator('bollingerBands', updates),
      toggleBollingerBands: () => get().toggleIndicator('bollingerBands'),
      updateStochastic: (updates) => get().updateIndicator('stochastic', updates),
      toggleStochastic: () => get().toggleIndicator('stochastic'),
      updateATR: (updates) => get().updateIndicator('atr', updates),
      toggleATR: () => get().toggleIndicator('atr'),
      updateVWAP: (updates) => get().updateIndicator('vwap', updates),
      toggleVWAP: () => get().toggleIndicator('vwap'),
      updateSupertrend: (updates) => get().updateIndicator('supertrend', updates),
      toggleSupertrend: () => get().toggleIndicator('supertrend'),
      updateADX: (updates) => get().updateIndicator('adx', updates),
      toggleADX: () => get().toggleIndicator('adx'),
      toggleOBV: () => get().toggleIndicator('obv'),
      updateParabolicSAR: (updates) => get().updateIndicator('parabolicSAR', updates),
      toggleParabolicSAR: () => get().toggleIndicator('parabolicSAR'),
      updateEMARibbon: (updates) => get().updateIndicator('emaRibbon', updates),
      toggleEMARibbon: () => get().toggleIndicator('emaRibbon'),

      // Last indicator values
      updateLastIndicatorValues: (values) => {
        set({
          lastIndicatorValues: {
            ...get().lastIndicatorValues,
            ...values,
            ma: {
              ...get().lastIndicatorValues.ma,
              ...(values.ma || {}),
            },
            rsi: {
              ...get().lastIndicatorValues.rsi,
              ...(values.rsi || {}),
            },
          },
        });
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
      reset: () => set(initialState),
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
