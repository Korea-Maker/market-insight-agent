"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import {
  createChart,
  createSeriesMarkers,
  ColorType,
  IChartApi,
  ISeriesApi,
  ISeriesMarkersPluginApi,
  Time,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  CrosshairMode,
  MouseEventParams,
  LineStyle,
} from 'lightweight-charts';
import { usePriceStore } from '@/store/usePriceStore';
import { useChartStore, TimeInterval, MovingAverageConfig } from '@/store/useChartStore';
import { ChartControls } from './ChartControls';
import { IndicatorSettingsPanel } from './IndicatorSettingsPanel';
import { ActiveIndicatorLegend, CrosshairData } from './ActiveIndicatorLegend';
import { SubPanelLegend } from './SubPanelLegend';
import { DrawingToolsPanel } from './DrawingToolsPanel';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateIchimokuForInterval,
  calculateVolumeMA,
  calculateBollingerBands,
  calculateStochastic,
  calculateATR,
  calculateVWAP,
  calculateSupertrend,
  calculateADX,
  calculateOBV,
  calculateParabolicSAR,
  calculateEMARibbon,
  INDICATOR_COLORS,
  CandleData,
  getIntervalSeconds,
} from '@/lib/indicators';
import { OHLCData } from '@/types/price';
import { Loader2 } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Chart color constants
const CHART_COLORS = {
  up: '#26a69a',
  down: '#ef5350',
  grid: 'rgba(42, 46, 57, 0.1)',
  border: 'rgba(42, 46, 57, 0.5)',
  text: '#D9D9D9',
  volumeUp: 'rgba(0, 150, 136, 0.5)',
  volumeDown: 'rgba(255, 82, 82, 0.5)',
} as const;

interface MASeriesRef {
  id: string;
  series: ISeriesApi<'Line'>;
}

interface RSISeriesRef {
  id: string;
  series: ISeriesApi<'Line'>;
}

interface IchimokuSeriesRefs {
  tenkanSen: ISeriesApi<'Line'> | null;
  kijunSen: ISeriesApi<'Line'> | null;
  senkouSpanA: ISeriesApi<'Line'> | null;
  senkouSpanB: ISeriesApi<'Line'> | null;
  chikouSpan: ISeriesApi<'Line'> | null;
}

interface SubChartRefs {
  rsiChart: IChartApi | null;
  rsiSeries: RSISeriesRef[];
  macdChart: IChartApi | null;
  macdHistogram: ISeriesApi<'Histogram'> | null;
  macdSignal: ISeriesApi<'Line'> | null;
  macdLine: ISeriesApi<'Line'> | null;
  // Stochastic
  stochasticChart: IChartApi | null;
  stochasticK: ISeriesApi<'Line'> | null;
  stochasticD: ISeriesApi<'Line'> | null;
  // ATR
  atrChart: IChartApi | null;
  atrSeries: ISeriesApi<'Line'> | null;
  // ADX
  adxChart: IChartApi | null;
  adxSeries: ISeriesApi<'Line'> | null;
  plusDISeries: ISeriesApi<'Line'> | null;
  minusDISeries: ISeriesApi<'Line'> | null;
  // OBV
  obvChart: IChartApi | null;
  obvSeries: ISeriesApi<'Line'> | null;
}

// Overlay indicator refs
interface OverlaySeriesRefs {
  // Bollinger Bands
  bbUpper: ISeriesApi<'Line'> | null;
  bbMiddle: ISeriesApi<'Line'> | null;
  bbLower: ISeriesApi<'Line'> | null;
  // VWAP
  vwapLine: ISeriesApi<'Line'> | null;
  vwapUpper: ISeriesApi<'Line'> | null;
  vwapLower: ISeriesApi<'Line'> | null;
  // Supertrend
  supertrendLine: ISeriesApi<'Line'> | null;
  // Parabolic SAR - rendered as markers on candlestick
  sarMarkers: ISeriesMarkersPluginApi<Time> | null;
  // EMA Ribbon
  emaRibbonSeries: ISeriesApi<'Line'>[];
}

export function TradingChart(): React.ReactElement {
  // UI State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawingToolsOpen, setDrawingToolsOpen] = useState(false);
  const [crosshairData, setCrosshairData] = useState<CrosshairData | null>(null);

  // Pending drawing ref for multi-click tools (trendLine, rectangle, etc.)
  // Using ref instead of state to avoid stale closure issues in click handlers
  const pendingDrawingRef = useRef<{
    type: string;
    startTime?: number;
    startPrice?: number;
  } | null>(null);

  // Main chart refs
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const volumeMASeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // MA series refs (dynamic)
  const maSeriesRefs = useRef<MASeriesRef[]>([]);

  // Ichimoku refs
  const ichimokuRefs = useRef<IchimokuSeriesRefs>({
    tenkanSen: null,
    kijunSen: null,
    senkouSpanA: null,
    senkouSpanB: null,
    chikouSpan: null,
  });

  // Sub chart refs (RSI, MACD, Stochastic, ATR, ADX, OBV)
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  const stochasticContainerRef = useRef<HTMLDivElement>(null);
  const atrContainerRef = useRef<HTMLDivElement>(null);
  const adxContainerRef = useRef<HTMLDivElement>(null);
  const obvContainerRef = useRef<HTMLDivElement>(null);
  const subChartsRef = useRef<SubChartRefs>({
    rsiChart: null,
    rsiSeries: [],
    macdChart: null,
    macdHistogram: null,
    macdSignal: null,
    macdLine: null,
    stochasticChart: null,
    stochasticK: null,
    stochasticD: null,
    atrChart: null,
    atrSeries: null,
    adxChart: null,
    adxSeries: null,
    plusDISeries: null,
    minusDISeries: null,
    obvChart: null,
    obvSeries: null,
  });

  // Overlay series refs (Bollinger, VWAP, Supertrend, EMA Ribbon)
  const overlaySeriesRef = useRef<OverlaySeriesRefs>({
    bbUpper: null,
    bbMiddle: null,
    bbLower: null,
    vwapLine: null,
    vwapUpper: null,
    vwapLower: null,
    supertrendLine: null,
    sarMarkers: null,
    emaRibbonSeries: [],
  });

  // Horizontal line refs for drawings
  const horizontalLinesRef = useRef<Map<string, ReturnType<ISeriesApi<'Candlestick'>['createPriceLine']>>>(new Map());

  // TrendLine series refs for drawings
  const trendLineSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());

  // Current candle tracking (for real-time updates)
  const currentCandleRef = useRef<CandleData | null>(null);
  const currentCandleTimeRef = useRef<number>(0);
  const candleDataRef = useRef<CandleData[]>([]);

  // Store state
  const symbol = useChartStore((s) => s.symbol);
  const interval = useChartStore((s) => s.interval);
  const loading = useChartStore((s) => s.loading);
  const error = useChartStore((s) => s.error);
  const setSymbol = useChartStore((s) => s.setSymbol);
  const setInterval = useChartStore((s) => s.setInterval);
  const setLoading = useChartStore((s) => s.setLoading);
  const setError = useChartStore((s) => s.setError);

  const movingAverages = useChartStore((s) => s.movingAverages);
  const rsiConfigs = useChartStore((s) => s.rsiConfigs);
  const showRSIPanel = useChartStore((s) => s.showRSIPanel);
  const ichimoku = useChartStore((s) => s.ichimoku);
  const volume = useChartStore((s) => s.volume);
  const macd = useChartStore((s) => s.macd);
  const bollingerBands = useChartStore((s) => s.bollingerBands);
  const stochastic = useChartStore((s) => s.stochastic);
  const atr = useChartStore((s) => s.atr);
  const vwap = useChartStore((s) => s.vwap);
  const supertrend = useChartStore((s) => s.supertrend);
  const adx = useChartStore((s) => s.adx);
  const obv = useChartStore((s) => s.obv);
  const parabolicSAR = useChartStore((s) => s.parabolicSAR);
  const emaRibbon = useChartStore((s) => s.emaRibbon);

  const activeDrawingTool = useChartStore((s) => s.activeDrawingTool);
  const drawings = useChartStore((s) => s.drawings);
  const addDrawing = useChartStore((s) => s.addDrawing);
  const drawingColor = useChartStore((s) => s.drawingColor);
  const setActiveDrawingTool = useChartStore((s) => s.setActiveDrawingTool);
  const updateLastIndicatorValues = useChartStore((s) => s.updateLastIndicatorValues);
  const lastIndicatorValues = useChartStore((s) => s.lastIndicatorValues);

  // Memoize RSI enabled state to prevent unnecessary recalculations
  const hasActiveRSI = useMemo(() => showRSIPanel && rsiConfigs.some((r) => r.enabled), [showRSIPanel, rsiConfigs]);

  // Reset pending drawing when tool changes
  useEffect(() => {
    if (!activeDrawingTool) {
      pendingDrawingRef.current = null;
    }
  }, [activeDrawingTool]);

  // Calculate sub-panel count for responsive sizing
  const subPanelCount = useMemo(() => {
    return [hasActiveRSI, macd.enabled, stochastic.enabled, atr.enabled, adx.enabled, obv.enabled].filter(Boolean).length;
  }, [hasActiveRSI, macd.enabled, stochastic.enabled, atr.enabled, adx.enabled, obv.enabled]);

  // Dynamic sub-panel height based on count (more panels = smaller height each)
  const subPanelHeight = useMemo(() => {
    if (subPanelCount === 0) return 100;
    if (subPanelCount <= 2) return 100;
    if (subPanelCount <= 4) return 85;
    return 70; // 5-6 panels
  }, [subPanelCount]);

  // Create sub-chart (RSI or MACD)
  const createSubChart = useCallback((container: HTMLDivElement, showTimeScale = false): IChartApi => {
    return createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: CHART_COLORS.text,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      width: container.clientWidth,
      height: container.clientHeight,
      timeScale: {
        visible: showTimeScale,
        borderColor: CHART_COLORS.border,
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.border,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    });
  }, []);

  // Update MA series
  const updateMASeries = useCallback((candles: CandleData[], configs: MovingAverageConfig[]) => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    const existingIds = new Set(maSeriesRefs.current.map((s) => s.id));
    const configIds = new Set(configs.map((c) => c.id));

    // Remove series that no longer exist
    maSeriesRefs.current = maSeriesRefs.current.filter((ref) => {
      if (!configIds.has(ref.id)) {
        chart.removeSeries(ref.series);
        return false;
      }
      return true;
    });

    // Add or update series
    configs.forEach((config) => {
      const existingRef = maSeriesRefs.current.find((r) => r.id === config.id);

      if (existingRef) {
        // Update existing series
        existingRef.series.applyOptions({
          color: config.color,
          lineWidth: config.lineWidth as 1 | 2 | 3 | 4,
          visible: config.enabled,
        });

        if (config.enabled) {
          const data = config.type === 'sma'
            ? calculateSMA(candles, config.period)
            : calculateEMA(candles, config.period);
          existingRef.series.setData(data);
        }
      } else {
        // Create new series
        const series = chart.addSeries(LineSeries, {
          color: config.color,
          lineWidth: config.lineWidth as 1 | 2 | 3 | 4,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
          visible: config.enabled,
        });

        if (config.enabled) {
          const data = config.type === 'sma'
            ? calculateSMA(candles, config.period)
            : calculateEMA(candles, config.period);
          series.setData(data);
        }

        maSeriesRefs.current.push({ id: config.id, series });
      }
    });
  }, []);

  // Update Ichimoku series
  const updateIchimokuSeries = useCallback((candles: CandleData[]) => {
    if (!chartRef.current || !ichimoku.enabled) {
      // Remove all Ichimoku series if disabled
      Object.values(ichimokuRefs.current).forEach((series) => {
        if (series) {
          try {
            chartRef.current?.removeSeries(series);
          } catch {}
        }
      });
      ichimokuRefs.current = {
        tenkanSen: null,
        kijunSen: null,
        senkouSpanA: null,
        senkouSpanB: null,
        chikouSpan: null,
      };
      return;
    }

    const chart = chartRef.current;
    const ichimokuData = calculateIchimokuForInterval(
      candles,
      interval,
      ichimoku.tenkanPeriod,
      ichimoku.kijunPeriod,
      ichimoku.senkouBPeriod,
      ichimoku.displacement
    );

    // Tenkan-sen
    if (ichimoku.showTenkan) {
      if (!ichimokuRefs.current.tenkanSen) {
        ichimokuRefs.current.tenkanSen = chart.addSeries(LineSeries, {
          color: INDICATOR_COLORS.ichimoku.tenkanSen,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
      }
      ichimokuRefs.current.tenkanSen.setData(ichimokuData.tenkanSen);
    } else if (ichimokuRefs.current.tenkanSen) {
      chart.removeSeries(ichimokuRefs.current.tenkanSen);
      ichimokuRefs.current.tenkanSen = null;
    }

    // Kijun-sen
    if (ichimoku.showKijun) {
      if (!ichimokuRefs.current.kijunSen) {
        ichimokuRefs.current.kijunSen = chart.addSeries(LineSeries, {
          color: INDICATOR_COLORS.ichimoku.kijunSen,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
      }
      ichimokuRefs.current.kijunSen.setData(ichimokuData.kijunSen);
    } else if (ichimokuRefs.current.kijunSen) {
      chart.removeSeries(ichimokuRefs.current.kijunSen);
      ichimokuRefs.current.kijunSen = null;
    }

    // Senkou Span A (cloud line)
    if (ichimoku.showSenkouA || ichimoku.showCloud) {
      if (!ichimokuRefs.current.senkouSpanA) {
        ichimokuRefs.current.senkouSpanA = chart.addSeries(LineSeries, {
          color: INDICATOR_COLORS.ichimoku.senkouSpanA,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
      }
      ichimokuRefs.current.senkouSpanA.setData(ichimokuData.senkouSpanA);
    } else if (ichimokuRefs.current.senkouSpanA) {
      chart.removeSeries(ichimokuRefs.current.senkouSpanA);
      ichimokuRefs.current.senkouSpanA = null;
    }

    // Senkou Span B (cloud line)
    if (ichimoku.showSenkouB || ichimoku.showCloud) {
      if (!ichimokuRefs.current.senkouSpanB) {
        ichimokuRefs.current.senkouSpanB = chart.addSeries(LineSeries, {
          color: INDICATOR_COLORS.ichimoku.senkouSpanB,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
      }
      ichimokuRefs.current.senkouSpanB.setData(ichimokuData.senkouSpanB);
    } else if (ichimokuRefs.current.senkouSpanB) {
      chart.removeSeries(ichimokuRefs.current.senkouSpanB);
      ichimokuRefs.current.senkouSpanB = null;
    }

    // Chikou Span
    if (ichimoku.showChikou) {
      if (!ichimokuRefs.current.chikouSpan) {
        ichimokuRefs.current.chikouSpan = chart.addSeries(LineSeries, {
          color: INDICATOR_COLORS.ichimoku.chikouSpan,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
      }
      ichimokuRefs.current.chikouSpan.setData(ichimokuData.chikouSpan);
    } else if (ichimokuRefs.current.chikouSpan) {
      chart.removeSeries(ichimokuRefs.current.chikouSpan);
      ichimokuRefs.current.chikouSpan = null;
    }
  }, [ichimoku, interval]);

  // Update overlay indicators (Bollinger Bands, VWAP, Supertrend, EMA Ribbon)
  const updateOverlayIndicators = useCallback((candles: CandleData[]) => {
    if (!chartRef.current) return;
    const chart = chartRef.current;

    // Bollinger Bands
    if (bollingerBands.enabled) {
      const bbData = calculateBollingerBands(candles, bollingerBands.period, bollingerBands.stdDev);

      if (!overlaySeriesRef.current.bbUpper) {
        overlaySeriesRef.current.bbUpper = chart.addSeries(LineSeries, {
          color: INDICATOR_COLORS.bollingerUpper,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
      }
      overlaySeriesRef.current.bbUpper.setData(bbData.upper);

      if (!overlaySeriesRef.current.bbMiddle) {
        overlaySeriesRef.current.bbMiddle = chart.addSeries(LineSeries, {
          color: INDICATOR_COLORS.bollingerMiddle,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
      }
      overlaySeriesRef.current.bbMiddle.setData(bbData.middle);

      if (!overlaySeriesRef.current.bbLower) {
        overlaySeriesRef.current.bbLower = chart.addSeries(LineSeries, {
          color: INDICATOR_COLORS.bollingerLower,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
      }
      overlaySeriesRef.current.bbLower.setData(bbData.lower);
    } else {
      if (overlaySeriesRef.current.bbUpper) {
        chart.removeSeries(overlaySeriesRef.current.bbUpper);
        overlaySeriesRef.current.bbUpper = null;
      }
      if (overlaySeriesRef.current.bbMiddle) {
        chart.removeSeries(overlaySeriesRef.current.bbMiddle);
        overlaySeriesRef.current.bbMiddle = null;
      }
      if (overlaySeriesRef.current.bbLower) {
        chart.removeSeries(overlaySeriesRef.current.bbLower);
        overlaySeriesRef.current.bbLower = null;
      }
    }

    // VWAP
    if (vwap.enabled) {
      const vwapData = calculateVWAP(candles, vwap.stdDevMultiplier);

      if (!overlaySeriesRef.current.vwapLine) {
        overlaySeriesRef.current.vwapLine = chart.addSeries(LineSeries, {
          color: INDICATOR_COLORS.vwap,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
      }
      overlaySeriesRef.current.vwapLine.setData(vwapData.vwap);

      if (vwap.showBands) {
        if (!overlaySeriesRef.current.vwapUpper) {
          overlaySeriesRef.current.vwapUpper = chart.addSeries(LineSeries, {
            color: INDICATOR_COLORS.vwapUpper,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
        }
        overlaySeriesRef.current.vwapUpper.setData(vwapData.upperBand);

        if (!overlaySeriesRef.current.vwapLower) {
          overlaySeriesRef.current.vwapLower = chart.addSeries(LineSeries, {
            color: INDICATOR_COLORS.vwapLower,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
        }
        overlaySeriesRef.current.vwapLower.setData(vwapData.lowerBand);
      } else {
        if (overlaySeriesRef.current.vwapUpper) {
          chart.removeSeries(overlaySeriesRef.current.vwapUpper);
          overlaySeriesRef.current.vwapUpper = null;
        }
        if (overlaySeriesRef.current.vwapLower) {
          chart.removeSeries(overlaySeriesRef.current.vwapLower);
          overlaySeriesRef.current.vwapLower = null;
        }
      }
    } else {
      if (overlaySeriesRef.current.vwapLine) {
        chart.removeSeries(overlaySeriesRef.current.vwapLine);
        overlaySeriesRef.current.vwapLine = null;
      }
      if (overlaySeriesRef.current.vwapUpper) {
        chart.removeSeries(overlaySeriesRef.current.vwapUpper);
        overlaySeriesRef.current.vwapUpper = null;
      }
      if (overlaySeriesRef.current.vwapLower) {
        chart.removeSeries(overlaySeriesRef.current.vwapLower);
        overlaySeriesRef.current.vwapLower = null;
      }
    }

    // Supertrend
    if (supertrend.enabled) {
      const stData = calculateSupertrend(candles, supertrend.period, supertrend.multiplier);

      if (!overlaySeriesRef.current.supertrendLine) {
        overlaySeriesRef.current.supertrendLine = chart.addSeries(LineSeries, {
          color: INDICATOR_COLORS.supertrendUp,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
      }

      // Set data with color based on direction
      const supertrendWithColors = stData.supertrend.map((point, idx) => ({
        ...point,
        color: stData.direction[idx]?.value === 1 ? INDICATOR_COLORS.supertrendUp : INDICATOR_COLORS.supertrendDown,
      }));
      overlaySeriesRef.current.supertrendLine.setData(supertrendWithColors);
    } else {
      if (overlaySeriesRef.current.supertrendLine) {
        chart.removeSeries(overlaySeriesRef.current.supertrendLine);
        overlaySeriesRef.current.supertrendLine = null;
      }
    }

    // EMA Ribbon
    if (emaRibbon.enabled) {
      const ribbonData = calculateEMARibbon(candles, emaRibbon.periods);

      // Remove existing series if period count changed
      if (overlaySeriesRef.current.emaRibbonSeries.length !== emaRibbon.periods.length) {
        overlaySeriesRef.current.emaRibbonSeries.forEach((series) => {
          try { chart.removeSeries(series); } catch {}
        });
        overlaySeriesRef.current.emaRibbonSeries = [];
      }

      // Create or update series
      ribbonData.forEach((data, idx) => {
        if (!overlaySeriesRef.current.emaRibbonSeries[idx]) {
          const color = INDICATOR_COLORS.emaRibbon[idx % INDICATOR_COLORS.emaRibbon.length];
          const series = chart.addSeries(LineSeries, {
            color,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          overlaySeriesRef.current.emaRibbonSeries[idx] = series;
        }
        overlaySeriesRef.current.emaRibbonSeries[idx].setData(data);
      });
    } else {
      overlaySeriesRef.current.emaRibbonSeries.forEach((series) => {
        try { chart.removeSeries(series); } catch {}
      });
      overlaySeriesRef.current.emaRibbonSeries = [];
    }

    // Parabolic SAR - rendered as markers on candlestick series using createSeriesMarkers (v5 API)
    if (parabolicSAR.enabled && candleSeriesRef.current) {
      const sarData = calculateParabolicSAR(candles, parabolicSAR.step, parabolicSAR.max);
      const markers = sarData.sar.map((point, idx) => ({
        time: point.time,
        position: sarData.isUpTrend[idx]?.value ? 'belowBar' as const : 'aboveBar' as const,
        color: sarData.isUpTrend[idx]?.value ? INDICATOR_COLORS.supertrendUp : INDICATOR_COLORS.supertrendDown,
        shape: 'circle' as const,
        size: 0.5,
      }));

      // Use v5 createSeriesMarkers API
      if (!overlaySeriesRef.current.sarMarkers) {
        overlaySeriesRef.current.sarMarkers = createSeriesMarkers(candleSeriesRef.current, markers);
      } else {
        overlaySeriesRef.current.sarMarkers.setMarkers(markers);
      }
    } else if (overlaySeriesRef.current.sarMarkers) {
      overlaySeriesRef.current.sarMarkers.setMarkers([]);
    }
  }, [bollingerBands, vwap, supertrend, emaRibbon, parabolicSAR]);

  // Update all indicators with current candle data
  const updateAllIndicators = useCallback((candles: CandleData[]) => {
    if (candles.length === 0) return;

    // Update MAs
    updateMASeries(candles, movingAverages);

    // Update Ichimoku
    updateIchimokuSeries(candles);

    // Update overlay indicators (BB, VWAP, Supertrend, EMA Ribbon, SAR)
    updateOverlayIndicators(candles);

    // Update RSI
    if (subChartsRef.current.rsiChart && rsiConfigs.some((r) => r.enabled)) {
      rsiConfigs.forEach((config) => {
        if (!config.enabled) return;

        const existingRef = subChartsRef.current.rsiSeries.find((r) => r.id === config.id);
        const rsiData = calculateRSI(candles, config.period);

        if (existingRef) {
          existingRef.series.setData(rsiData);
        }
      });
    }

    // Update MACD
    if (macd.enabled && subChartsRef.current.macdHistogram) {
      const macdData = calculateMACD(candles, macd.fastPeriod, macd.slowPeriod, macd.signalPeriod);
      subChartsRef.current.macdHistogram.setData(macdData.histogram);
      subChartsRef.current.macdSignal?.setData(macdData.signal);
      subChartsRef.current.macdLine?.setData(macdData.macd);
    }

    // Update Stochastic
    if (stochastic.enabled && subChartsRef.current.stochasticChart) {
      const stochData = calculateStochastic(candles, stochastic.kPeriod, stochastic.dPeriod, stochastic.smooth);
      subChartsRef.current.stochasticK?.setData(stochData.k);
      subChartsRef.current.stochasticD?.setData(stochData.d);
    }

    // Update ATR
    if (atr.enabled && subChartsRef.current.atrChart) {
      const atrData = calculateATR(candles, atr.period);
      subChartsRef.current.atrSeries?.setData(atrData);
    }

    // Update ADX
    if (adx.enabled && subChartsRef.current.adxChart) {
      const adxData = calculateADX(candles, adx.period);
      subChartsRef.current.adxSeries?.setData(adxData.adx);
      if (adx.showDI) {
        subChartsRef.current.plusDISeries?.setData(adxData.plusDI);
        subChartsRef.current.minusDISeries?.setData(adxData.minusDI);
      }
    }

    // Update OBV
    if (obv.enabled && subChartsRef.current.obvChart) {
      const obvData = calculateOBV(candles);
      subChartsRef.current.obvSeries?.setData(obvData);
    }

    // Update last indicator values for display when not hovering
    updateLastValues(candles);
  }, [movingAverages, rsiConfigs, macd, stochastic, atr, adx, obv, updateMASeries, updateIchimokuSeries, updateOverlayIndicators]);

  // Update last indicator values from candle data
  const updateLastValues = useCallback((candles: CandleData[]) => {
    if (candles.length === 0) return;

    const lastValues: Parameters<typeof updateLastIndicatorValues>[0] = {
      ma: {},
      rsi: {},
    };

    // Calculate last MA values
    movingAverages.filter(ma => ma.enabled).forEach(ma => {
      const data = ma.type === 'sma'
        ? calculateSMA(candles, ma.period)
        : calculateEMA(candles, ma.period);
      if (data.length > 0) {
        lastValues.ma![ma.id] = data[data.length - 1].value;
      }
    });

    // Calculate last Bollinger Bands values
    if (bollingerBands.enabled) {
      const bbData = calculateBollingerBands(candles, bollingerBands.period, bollingerBands.stdDev);
      if (bbData.upper.length > 0) {
        lastValues.bollingerBands = {
          upper: bbData.upper[bbData.upper.length - 1].value,
          middle: bbData.middle[bbData.middle.length - 1].value,
          lower: bbData.lower[bbData.lower.length - 1].value,
        };
      }
    }

    // Calculate last VWAP value
    if (vwap.enabled) {
      const vwapData = calculateVWAP(candles, vwap.stdDevMultiplier);
      if (vwapData.vwap.length > 0) {
        lastValues.vwap = vwapData.vwap[vwapData.vwap.length - 1].value;
      }
    }

    // Calculate last Supertrend value
    if (supertrend.enabled) {
      const stData = calculateSupertrend(candles, supertrend.period, supertrend.multiplier);
      if (stData.supertrend.length > 0) {
        lastValues.supertrend = stData.supertrend[stData.supertrend.length - 1].value;
      }
    }

    // Calculate last RSI values
    rsiConfigs.filter(rsi => rsi.enabled).forEach(rsi => {
      const data = calculateRSI(candles, rsi.period);
      if (data.length > 0) {
        lastValues.rsi![rsi.id] = data[data.length - 1].value;
      }
    });

    // Calculate last MACD values
    if (macd.enabled) {
      const macdData = calculateMACD(candles, macd.fastPeriod, macd.slowPeriod, macd.signalPeriod);
      if (macdData.macd.length > 0) {
        lastValues.macd = {
          macd: macdData.macd[macdData.macd.length - 1].value,
          signal: macdData.signal[macdData.signal.length - 1].value,
          histogram: macdData.histogram[macdData.histogram.length - 1].value,
        };
      }
    }

    // Calculate last Stochastic values
    if (stochastic.enabled) {
      const stochData = calculateStochastic(candles, stochastic.kPeriod, stochastic.dPeriod, stochastic.smooth);
      if (stochData.k.length > 0) {
        lastValues.stochastic = {
          k: stochData.k[stochData.k.length - 1].value,
          d: stochData.d[stochData.d.length - 1].value,
        };
      }
    }

    // Calculate last ATR value
    if (atr.enabled) {
      const atrData = calculateATR(candles, atr.period);
      if (atrData.length > 0) {
        lastValues.atr = atrData[atrData.length - 1].value;
      }
    }

    // Calculate last ADX values
    if (adx.enabled) {
      const adxData = calculateADX(candles, adx.period);
      if (adxData.adx.length > 0) {
        lastValues.adx = {
          adx: adxData.adx[adxData.adx.length - 1].value,
          plusDI: adxData.plusDI[adxData.plusDI.length - 1].value,
          minusDI: adxData.minusDI[adxData.minusDI.length - 1].value,
        };
      }
    }

    // Calculate last OBV value
    if (obv.enabled) {
      const obvData = calculateOBV(candles);
      if (obvData.length > 0) {
        lastValues.obv = obvData[obvData.length - 1].value;
      }
    }

    updateLastIndicatorValues(lastValues);
  }, [movingAverages, bollingerBands, vwap, supertrend, rsiConfigs, macd, stochastic, atr, adx, obv, updateLastIndicatorValues]);

  // Fetch candle data - only depends on symbol and interval
  const fetchCandles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/api/candles?symbol=${symbol}&interval=${interval}&limit=500`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.candles || !Array.isArray(data.candles)) {
        throw new Error('Invalid data format');
      }

      const candles: CandleData[] = data.candles.map((c: OHLCData) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }));

      candleDataRef.current = candles;

      if (candles.length > 0) {
        const lastCandle = candles[candles.length - 1];
        currentCandleRef.current = { ...lastCandle };
        currentCandleTimeRef.current = lastCandle.time as number;
      }

      // Update main series
      if (candleSeriesRef.current) {
        candleSeriesRef.current.setData(candles);
      }

      // Update volume
      if (volumeSeriesRef.current) {
        const volumeData = data.candles.map((c: OHLCData) => ({
          time: c.time as Time,
          value: c.volume,
          color: c.close >= c.open ? CHART_COLORS.volumeUp : CHART_COLORS.volumeDown,
        }));
        volumeSeriesRef.current.setData(volumeData);

        // Volume MA
        if (volumeMASeriesRef.current) {
          const volumeMAData = calculateVolumeMA(candles, 20);
          volumeMASeriesRef.current.setData(volumeMAData);
        }
      }

      // Fit content
      chartRef.current?.timeScale().fitContent();
      subChartsRef.current.rsiChart?.timeScale().fitContent();
      subChartsRef.current.macdChart?.timeScale().fitContent();
      subChartsRef.current.stochasticChart?.timeScale().fitContent();
      subChartsRef.current.atrChart?.timeScale().fitContent();
      subChartsRef.current.adxChart?.timeScale().fitContent();
      subChartsRef.current.obvChart?.timeScale().fitContent();

      setLoading(false);

      return candles;
    } catch (err) {
      console.error('[TradingChart] Data load error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
      return [];
    }
  }, [symbol, interval, setLoading, setError]);

  // Initialize main chart
  useEffect(() => {
    if (!mainContainerRef.current) return;

    const chart = createChart(mainContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: CHART_COLORS.text,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      width: mainContainerRef.current.clientWidth,
      height: mainContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: CHART_COLORS.border,
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.border,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      handleScale: {
        axisPressedMouseMove: { time: true, price: true },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });

    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.up,
      downColor: CHART_COLORS.down,
      borderVisible: false,
      wickUpColor: CHART_COLORS.up,
      wickDownColor: CHART_COLORS.down,
    });
    candleSeriesRef.current = candleSeries;

    // Volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: CHART_COLORS.up,
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    // Volume MA series
    const volumeMASeries = chart.addSeries(LineSeries, {
      color: INDICATOR_COLORS.volumeMA,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      priceScaleId: 'volume',
    });
    volumeMASeriesRef.current = volumeMASeries;

    // Click handler for drawing tools
    chart.subscribeClick((param: MouseEventParams) => {
      const currentTool = useChartStore.getState().activeDrawingTool;
      const color = useChartStore.getState().drawingColor;

      if (!currentTool || !param.point || !candleSeriesRef.current) return;

      const price = candleSeries.coordinateToPrice(param.point.y);
      const time = param.time as number;

      switch (currentTool) {
        case 'horizontalLine':
          if (price !== null) {
            useChartStore.getState().addDrawing({
              type: 'horizontalLine',
              price,
              color,
              lineWidth: 1,
            });
            useChartStore.getState().setActiveDrawingTool(null);
          }
          break;

        case 'verticalLine':
          if (time) {
            useChartStore.getState().addDrawing({
              type: 'verticalLine',
              startTime: time,
              color,
              lineWidth: 1,
            });
            useChartStore.getState().setActiveDrawingTool(null);
          }
          break;

        case 'trendLine':
          if (price !== null && time) {
            const pending = pendingDrawingRef.current;
            if (!pending || pending.type !== 'trendLine') {
              // First click - set start point
              pendingDrawingRef.current = { type: 'trendLine', startTime: time, startPrice: price };
            } else {
              // Second click - complete the line
              useChartStore.getState().addDrawing({
                type: 'trendLine',
                startTime: pending.startTime,
                startPrice: pending.startPrice,
                endTime: time,
                endPrice: price,
                color,
                lineWidth: 1,
              });
              pendingDrawingRef.current = null;
              useChartStore.getState().setActiveDrawingTool(null);
            }
          }
          break;
      }
    });

    // Crosshair move handler for indicator values
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setCrosshairData(null);
        return;
      }

      const values: CrosshairData['values'] = {
        ma: {},
        rsi: {},
      };

      // Extract MA values
      maSeriesRefs.current.forEach((ref) => {
        const data = param.seriesData.get(ref.series);
        if (data && 'value' in data && typeof data.value === 'number') {
          values.ma[ref.id] = data.value;
        }
      });

      // Extract overlay indicator values
      if (overlaySeriesRef.current.bbMiddle) {
        const upper = param.seriesData.get(overlaySeriesRef.current.bbUpper!);
        const middle = param.seriesData.get(overlaySeriesRef.current.bbMiddle);
        const lower = param.seriesData.get(overlaySeriesRef.current.bbLower!);
        if (upper && middle && lower && 'value' in upper && 'value' in middle && 'value' in lower) {
          values.bollingerBands = {
            upper: upper.value as number,
            middle: middle.value as number,
            lower: lower.value as number,
          };
        }
      }

      if (overlaySeriesRef.current.vwapLine) {
        const vwapData = param.seriesData.get(overlaySeriesRef.current.vwapLine);
        if (vwapData && 'value' in vwapData) {
          values.vwap = vwapData.value as number;
        }
      }

      if (overlaySeriesRef.current.supertrendLine) {
        const stData = param.seriesData.get(overlaySeriesRef.current.supertrendLine);
        if (stData && 'value' in stData) {
          values.supertrend = stData.value as number;
        }
      }

      setCrosshairData({
        time: param.time as number,
        values,
      });
    });

    // ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0] || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartRef.current.applyOptions({ width, height });
    });
    resizeObserver.observe(mainContainerRef.current);

    // Load initial data
    fetchCandles().then((candles) => {
      if (candles.length > 0) {
        updateAllIndicators(candles);
      }
    });

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      maSeriesRefs.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize RSI chart
  useEffect(() => {
    const hasActiveRSI = showRSIPanel && rsiConfigs.some((r) => r.enabled);

    if (!rsiContainerRef.current || !hasActiveRSI) {
      if (subChartsRef.current.rsiChart) {
        subChartsRef.current.rsiChart.remove();
        subChartsRef.current.rsiChart = null;
        subChartsRef.current.rsiSeries = [];
      }
      return;
    }

    const rsiChart = createSubChart(rsiContainerRef.current);
    subChartsRef.current.rsiChart = rsiChart;
    subChartsRef.current.rsiSeries = [];

    // Create series for each enabled RSI
    rsiConfigs.forEach((config) => {
      if (!config.enabled) return;

      const rsiSeries = rsiChart.addSeries(LineSeries, {
        color: config.color,
        lineWidth: 1,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });

      subChartsRef.current.rsiSeries.push({ id: config.id, series: rsiSeries });

      // Update data
      if (candleDataRef.current.length > 0) {
        const rsiData = calculateRSI(candleDataRef.current, config.period);
        rsiSeries.setData(rsiData);
      }
    });

    // RSI levels
    rsiChart.priceScale('right').applyOptions({
      scaleMargins: { top: 0.1, bottom: 0.1 },
    });

    // Sync with main chart
    const timeScale = chartRef.current?.timeScale();
    if (timeScale) {
      timeScale.subscribeVisibleLogicalRangeChange((range) => {
        if (range) {
          rsiChart.timeScale().setVisibleLogicalRange(range);
        }
      });
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0] || !subChartsRef.current.rsiChart) return;
      const { width, height } = entries[0].contentRect;
      subChartsRef.current.rsiChart.applyOptions({ width, height });
    });
    resizeObserver.observe(rsiContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      rsiChart.remove();
      subChartsRef.current.rsiChart = null;
      subChartsRef.current.rsiSeries = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRSIPanel, rsiConfigs.length, createSubChart]);

  // Initialize MACD chart
  useEffect(() => {
    if (!macdContainerRef.current || !macd.enabled) {
      if (subChartsRef.current.macdChart) {
        subChartsRef.current.macdChart.remove();
        subChartsRef.current.macdChart = null;
        subChartsRef.current.macdHistogram = null;
        subChartsRef.current.macdSignal = null;
        subChartsRef.current.macdLine = null;
      }
      return;
    }

    const macdChart = createSubChart(macdContainerRef.current);
    subChartsRef.current.macdChart = macdChart;

    // MACD histogram
    const macdHistogram = macdChart.addSeries(HistogramSeries, {
      priceLineVisible: false,
    });
    subChartsRef.current.macdHistogram = macdHistogram;

    // MACD line
    const macdLine = macdChart.addSeries(LineSeries, {
      color: INDICATOR_COLORS.macdLine,
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    subChartsRef.current.macdLine = macdLine;

    // Signal line
    const signalLine = macdChart.addSeries(LineSeries, {
      color: INDICATOR_COLORS.macdSignal,
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    subChartsRef.current.macdSignal = signalLine;

    // Update MACD data
    if (candleDataRef.current.length > 0) {
      const macdData = calculateMACD(candleDataRef.current, macd.fastPeriod, macd.slowPeriod, macd.signalPeriod);
      macdHistogram.setData(macdData.histogram);
      signalLine.setData(macdData.signal);
      macdLine.setData(macdData.macd);
    }

    // Sync with main chart
    const timeScale = chartRef.current?.timeScale();
    if (timeScale) {
      timeScale.subscribeVisibleLogicalRangeChange((range) => {
        if (range) {
          macdChart.timeScale().setVisibleLogicalRange(range);
        }
      });
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0] || !subChartsRef.current.macdChart) return;
      const { width, height } = entries[0].contentRect;
      subChartsRef.current.macdChart.applyOptions({ width, height });
    });
    resizeObserver.observe(macdContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      macdChart.remove();
      subChartsRef.current.macdChart = null;
      subChartsRef.current.macdHistogram = null;
      subChartsRef.current.macdSignal = null;
      subChartsRef.current.macdLine = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [macd.enabled, createSubChart]);

  // Initialize Stochastic chart
  useEffect(() => {
    if (!stochasticContainerRef.current || !stochastic.enabled) {
      if (subChartsRef.current.stochasticChart) {
        subChartsRef.current.stochasticChart.remove();
        subChartsRef.current.stochasticChart = null;
        subChartsRef.current.stochasticK = null;
        subChartsRef.current.stochasticD = null;
      }
      return;
    }

    const stochChart = createSubChart(stochasticContainerRef.current);
    subChartsRef.current.stochasticChart = stochChart;

    // %K line
    const kLine = stochChart.addSeries(LineSeries, {
      color: INDICATOR_COLORS.stochasticK,
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    subChartsRef.current.stochasticK = kLine;

    // %D line
    const dLine = stochChart.addSeries(LineSeries, {
      color: INDICATOR_COLORS.stochasticD,
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    subChartsRef.current.stochasticD = dLine;

    // Update data
    if (candleDataRef.current.length > 0) {
      const stochData = calculateStochastic(candleDataRef.current, stochastic.kPeriod, stochastic.dPeriod, stochastic.smooth);
      kLine.setData(stochData.k);
      dLine.setData(stochData.d);
    }

    // Sync with main chart
    const timeScale = chartRef.current?.timeScale();
    if (timeScale) {
      timeScale.subscribeVisibleLogicalRangeChange((range) => {
        if (range) stochChart.timeScale().setVisibleLogicalRange(range);
      });
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0] || !subChartsRef.current.stochasticChart) return;
      const { width, height } = entries[0].contentRect;
      subChartsRef.current.stochasticChart.applyOptions({ width, height });
    });
    resizeObserver.observe(stochasticContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      stochChart.remove();
      subChartsRef.current.stochasticChart = null;
      subChartsRef.current.stochasticK = null;
      subChartsRef.current.stochasticD = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stochastic.enabled, createSubChart]);

  // Initialize ATR chart
  useEffect(() => {
    if (!atrContainerRef.current || !atr.enabled) {
      if (subChartsRef.current.atrChart) {
        subChartsRef.current.atrChart.remove();
        subChartsRef.current.atrChart = null;
        subChartsRef.current.atrSeries = null;
      }
      return;
    }

    const atrChart = createSubChart(atrContainerRef.current);
    subChartsRef.current.atrChart = atrChart;

    const atrLine = atrChart.addSeries(LineSeries, {
      color: INDICATOR_COLORS.atr,
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    subChartsRef.current.atrSeries = atrLine;

    if (candleDataRef.current.length > 0) {
      const atrData = calculateATR(candleDataRef.current, atr.period);
      atrLine.setData(atrData);
    }

    const timeScale = chartRef.current?.timeScale();
    if (timeScale) {
      timeScale.subscribeVisibleLogicalRangeChange((range) => {
        if (range) atrChart.timeScale().setVisibleLogicalRange(range);
      });
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0] || !subChartsRef.current.atrChart) return;
      const { width, height } = entries[0].contentRect;
      subChartsRef.current.atrChart.applyOptions({ width, height });
    });
    resizeObserver.observe(atrContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      atrChart.remove();
      subChartsRef.current.atrChart = null;
      subChartsRef.current.atrSeries = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atr.enabled, createSubChart]);

  // Initialize ADX chart
  useEffect(() => {
    if (!adxContainerRef.current || !adx.enabled) {
      if (subChartsRef.current.adxChart) {
        subChartsRef.current.adxChart.remove();
        subChartsRef.current.adxChart = null;
        subChartsRef.current.adxSeries = null;
        subChartsRef.current.plusDISeries = null;
        subChartsRef.current.minusDISeries = null;
      }
      return;
    }

    const adxChart = createSubChart(adxContainerRef.current);
    subChartsRef.current.adxChart = adxChart;

    // ADX line
    const adxLine = adxChart.addSeries(LineSeries, {
      color: '#FFEB3B',
      lineWidth: 2,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    subChartsRef.current.adxSeries = adxLine;

    // +DI line
    const plusDI = adxChart.addSeries(LineSeries, {
      color: INDICATOR_COLORS.supertrendUp,
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
      visible: adx.showDI,
    });
    subChartsRef.current.plusDISeries = plusDI;

    // -DI line
    const minusDI = adxChart.addSeries(LineSeries, {
      color: INDICATOR_COLORS.supertrendDown,
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
      visible: adx.showDI,
    });
    subChartsRef.current.minusDISeries = minusDI;

    if (candleDataRef.current.length > 0) {
      const adxData = calculateADX(candleDataRef.current, adx.period);
      adxLine.setData(adxData.adx);
      plusDI.setData(adxData.plusDI);
      minusDI.setData(adxData.minusDI);
    }

    const timeScale = chartRef.current?.timeScale();
    if (timeScale) {
      timeScale.subscribeVisibleLogicalRangeChange((range) => {
        if (range) adxChart.timeScale().setVisibleLogicalRange(range);
      });
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0] || !subChartsRef.current.adxChart) return;
      const { width, height } = entries[0].contentRect;
      subChartsRef.current.adxChart.applyOptions({ width, height });
    });
    resizeObserver.observe(adxContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      adxChart.remove();
      subChartsRef.current.adxChart = null;
      subChartsRef.current.adxSeries = null;
      subChartsRef.current.plusDISeries = null;
      subChartsRef.current.minusDISeries = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adx.enabled, createSubChart]);

  // Initialize OBV chart
  useEffect(() => {
    if (!obvContainerRef.current || !obv.enabled) {
      if (subChartsRef.current.obvChart) {
        subChartsRef.current.obvChart.remove();
        subChartsRef.current.obvChart = null;
        subChartsRef.current.obvSeries = null;
      }
      return;
    }

    const obvChart = createSubChart(obvContainerRef.current);
    subChartsRef.current.obvChart = obvChart;

    const obvLine = obvChart.addSeries(LineSeries, {
      color: '#4CAF50',
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    subChartsRef.current.obvSeries = obvLine;

    if (candleDataRef.current.length > 0) {
      const obvData = calculateOBV(candleDataRef.current);
      obvLine.setData(obvData);
    }

    const timeScale = chartRef.current?.timeScale();
    if (timeScale) {
      timeScale.subscribeVisibleLogicalRangeChange((range) => {
        if (range) obvChart.timeScale().setVisibleLogicalRange(range);
      });
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0] || !subChartsRef.current.obvChart) return;
      const { width, height } = entries[0].contentRect;
      subChartsRef.current.obvChart.applyOptions({ width, height });
    });
    resizeObserver.observe(obvContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      obvChart.remove();
      subChartsRef.current.obvChart = null;
      subChartsRef.current.obvSeries = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obv.enabled, createSubChart]);

  // Refetch on symbol/interval change
  useEffect(() => {
    if (chartRef.current) {
      fetchCandles().then((candles) => {
        if (candles.length > 0) {
          updateAllIndicators(candles);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval]);

  // Update all indicators when configs change (using local data, no API call)
  useEffect(() => {
    if (candleDataRef.current.length > 0 && chartRef.current) {
      updateAllIndicators(candleDataRef.current);
    }
  }, [updateAllIndicators]);

  // Update volume visibility
  useEffect(() => {
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({ visible: volume.enabled });
    }
    if (volumeMASeriesRef.current) {
      volumeMASeriesRef.current.applyOptions({ visible: volume.enabled && volume.showMA });
    }
  }, [volume.enabled, volume.showMA]);

  // Update drawings (horizontal lines, trend lines)
  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current) return;

    const candleSeries = candleSeriesRef.current;
    const chart = chartRef.current;

    // Remove old horizontal lines
    horizontalLinesRef.current.forEach((line, id) => {
      if (!drawings.find((d) => d.id === id)) {
        candleSeries.removePriceLine(line);
        horizontalLinesRef.current.delete(id);
      }
    });

    // Remove old trend lines
    trendLineSeriesRef.current.forEach((series, id) => {
      if (!drawings.find((d) => d.id === id)) {
        chart.removeSeries(series);
        trendLineSeriesRef.current.delete(id);
      }
    });

    // Add/update horizontal lines
    drawings
      .filter((d) => d.type === 'horizontalLine' && d.price !== undefined)
      .forEach((drawing) => {
        if (!horizontalLinesRef.current.has(drawing.id)) {
          const line = candleSeries.createPriceLine({
            price: drawing.price!,
            color: drawing.color,
            lineWidth: drawing.lineWidth as 1 | 2 | 3 | 4,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
          });
          horizontalLinesRef.current.set(drawing.id, line);
        }
      });

    // Add/update trend lines
    drawings
      .filter((d) => d.type === 'trendLine' && d.startTime && d.endTime && d.startPrice !== undefined && d.endPrice !== undefined)
      .forEach((drawing) => {
        if (!trendLineSeriesRef.current.has(drawing.id)) {
          const trendSeries = chart.addSeries(LineSeries, {
            color: drawing.color,
            lineWidth: drawing.lineWidth as 1 | 2 | 3 | 4,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          });
          trendSeries.setData([
            { time: drawing.startTime as Time, value: drawing.startPrice! },
            { time: drawing.endTime as Time, value: drawing.endPrice! },
          ]);
          trendLineSeriesRef.current.set(drawing.id, trendSeries);
        }
      });
  }, [drawings]);

  // Real-time price updates
  useEffect(() => {
    const unsubscribe = usePriceStore.subscribe((state) => {
      const lastTrade = state.priceHistory[state.priceHistory.length - 1];
      if (!lastTrade || !candleSeriesRef.current) return;

      // Only update if same symbol
      if (lastTrade.symbol !== symbol) return;

      const intervalSeconds = getIntervalSeconds(interval);
      const tradeTime = Math.floor(lastTrade.timestamp / 1000);
      const candleTime = Math.floor(tradeTime / intervalSeconds) * intervalSeconds;

      if (candleTime > currentCandleTimeRef.current) {
        // New candle
        const newCandle: CandleData = {
          time: candleTime as Time,
          open: lastTrade.price,
          high: lastTrade.price,
          low: lastTrade.price,
          close: lastTrade.price,
        };

        candleSeriesRef.current.update(newCandle);
        currentCandleRef.current = newCandle;
        currentCandleTimeRef.current = candleTime;

        candleDataRef.current = [...candleDataRef.current, newCandle].slice(-1000);
      } else if (currentCandleRef.current) {
        // Update current candle
        const updatedCandle: CandleData = {
          ...currentCandleRef.current,
          high: Math.max(currentCandleRef.current.high, lastTrade.price),
          low: Math.min(currentCandleRef.current.low, lastTrade.price),
          close: lastTrade.price,
        };

        candleSeriesRef.current.update(updatedCandle);
        currentCandleRef.current = updatedCandle;

        if (candleDataRef.current.length > 0) {
          candleDataRef.current[candleDataRef.current.length - 1] = updatedCandle;
        }
      }
    });

    return () => unsubscribe();
  }, [symbol, interval]);

  return (
    <div className="w-full h-full min-h-[600px] flex flex-col bg-card rounded-xl border shadow-sm relative">
      {/* Left: Symbol/Interval + Active Indicators Legend */}
      <ActiveIndicatorLegend
        symbol={symbol}
        interval={interval}
        onSymbolChange={setSymbol}
        onIntervalChange={setInterval}
        crosshairData={crosshairData}
      />

      {/* Right: Controls (Drawing tools + Indicators button) */}
      <ChartControls
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenDrawingTools={() => setDrawingToolsOpen(true)}
        activeDrawingTool={activeDrawingTool}
      />

      {/* Settings Panel */}
      <IndicatorSettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Drawing Tools Panel */}
      <DrawingToolsPanel isOpen={drawingToolsOpen} onClose={() => setDrawingToolsOpen(false)} />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20 rounded-xl">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20 rounded-xl">
          <div className="text-center">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <button
              onClick={fetchCandles}
              className="px-4 py-2 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Chart panels */}
      <div className="flex-1 flex flex-col p-2 pt-14">
        {/* Main chart - flex-1 to use remaining space */}
        <div
          ref={mainContainerRef}
          className="w-full flex-1 min-h-0"
        />

        {/* RSI chart */}
        {hasActiveRSI && (
          <div className="border-t border-border/50 mt-1 pt-1 relative flex-shrink-0" style={{ height: `${subPanelHeight}px` }}>
            <SubPanelLegend
              indicatorType="rsi"
              label=""
              lastValue={lastIndicatorValues}
              config={{ rsiConfigs }}
            />
            <div
              ref={rsiContainerRef}
              className="w-full h-full"
            />
          </div>
        )}

        {/* MACD chart */}
        {macd.enabled && (
          <div className="border-t border-border/50 mt-1 pt-1 relative flex-shrink-0" style={{ height: `${subPanelHeight}px` }}>
            <SubPanelLegend
              indicatorType="macd"
              label=""
              lastValue={lastIndicatorValues}
              config={{ macd }}
            />
            <div
              ref={macdContainerRef}
              className="w-full h-full"
            />
          </div>
        )}

        {/* Stochastic chart */}
        {stochastic.enabled && (
          <div className="border-t border-border/50 mt-1 pt-1 relative flex-shrink-0" style={{ height: `${subPanelHeight}px` }}>
            <SubPanelLegend
              indicatorType="stochastic"
              label=""
              lastValue={lastIndicatorValues}
              config={{ stochastic }}
            />
            <div
              ref={stochasticContainerRef}
              className="w-full h-full"
            />
          </div>
        )}

        {/* ATR chart */}
        {atr.enabled && (
          <div className="border-t border-border/50 mt-1 pt-1 relative flex-shrink-0" style={{ height: `${subPanelHeight}px` }}>
            <SubPanelLegend
              indicatorType="atr"
              label=""
              lastValue={lastIndicatorValues}
              config={{ atr }}
            />
            <div
              ref={atrContainerRef}
              className="w-full h-full"
            />
          </div>
        )}

        {/* ADX chart */}
        {adx.enabled && (
          <div className="border-t border-border/50 mt-1 pt-1 relative flex-shrink-0" style={{ height: `${subPanelHeight}px` }}>
            <SubPanelLegend
              indicatorType="adx"
              label=""
              lastValue={lastIndicatorValues}
              config={{ adx }}
            />
            <div
              ref={adxContainerRef}
              className="w-full h-full"
            />
          </div>
        )}

        {/* OBV chart */}
        {obv.enabled && (
          <div className="border-t border-border/50 mt-1 pt-1 relative flex-shrink-0" style={{ height: `${subPanelHeight}px` }}>
            <SubPanelLegend
              indicatorType="obv"
              label=""
              lastValue={lastIndicatorValues}
            />
            <div
              ref={obvContainerRef}
              className="w-full h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
