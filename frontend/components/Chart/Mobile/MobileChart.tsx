/**
 * MobileChart
 * Core chart component optimized for mobile touch interactions
 * Uses lightweight-charts with mobile-specific configurations
 */

'use client';

import { memo, useRef, useEffect, useCallback, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  Time,
} from 'lightweight-charts';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChartStore } from '@/store/useChartStore';
import { usePriceStore } from '@/store/usePriceStore';
import {
  calculateSMA,
  calculateEMA,
  calculateVolumeMA,
  calculateBollingerBands,
  calculateVWAP,
  CandleData,
  getIntervalSeconds,
  INDICATOR_COLORS,
} from '@/lib/indicators';
import {
  MobileChartProps,
  CrosshairData,
  MOBILE_PERFORMANCE_CONFIG,
} from './types';
import { useDeviceInfo } from './hooks/useDeviceInfo';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Mobile-optimized chart colors
const CHART_COLORS = {
  up: '#22c55e',
  down: '#ef4444',
  grid: 'rgba(255, 255, 255, 0.03)',
  border: 'rgba(255, 255, 255, 0.1)',
  text: '#9ca3af',
  volumeUp: 'rgba(34, 197, 94, 0.3)',
  volumeDown: 'rgba(239, 68, 68, 0.3)',
} as const;

// Mobile chart options
const getMobileChartOptions = (width: number, height: number) => ({
  layout: {
    background: { type: ColorType.Solid as const, color: 'transparent' },
    textColor: CHART_COLORS.text,
    fontSize: 11,
  },
  grid: {
    vertLines: { color: CHART_COLORS.grid, visible: false },
    horzLines: { color: CHART_COLORS.grid },
  },
  width,
  height,
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
    borderColor: CHART_COLORS.border,
    fixLeftEdge: true,
    fixRightEdge: true,
  },
  rightPriceScale: {
    borderColor: CHART_COLORS.border,
    scaleMargins: { top: 0.1, bottom: 0.2 },
  },
  crosshair: {
    mode: CrosshairMode.Magnet,
    vertLine: {
      width: 1,
      style: 2,
      labelVisible: true,
    },
    horzLine: {
      width: 1,
      style: 2,
      labelVisible: true,
    },
  },
  handleScale: {
    axisPressedMouseMove: { time: true, price: true },
    mouseWheel: false,
    pinch: true,
  },
  handleScroll: {
    horzTouchDrag: true,
    vertTouchDrag: false,
    pressedMouseMove: true,
    mouseWheel: false,
  },
});

export const MobileChart = memo(function MobileChart({
  symbol,
  interval,
  onCrosshairMove,
  onDoubleTap,
}: Omit<MobileChartProps, 'data' | 'loading' | 'error'>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const maSeriesRefs = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const candleDataRef = useRef<CandleData[]>([]);
  const currentCandleRef = useRef<CandleData | null>(null);
  const currentCandleTimeRef = useRef<number>(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isMobile, viewportWidth, viewportHeight, triggerHaptic } = useDeviceInfo();

  // Store state
  const movingAverages = useChartStore((s) => s.movingAverages);
  const volume = useChartStore((s) => s.volume);
  const bollingerBands = useChartStore((s) => s.bollingerBands);
  const vwap = useChartStore((s) => s.vwap);

  // Double tap detection
  const lastTapRef = useRef<number>(0);

  const handleTouch = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double tap detected
      triggerHaptic('medium');
      onDoubleTap?.();
      chartRef.current?.timeScale().fitContent();
    }

    lastTapRef.current = now;
  }, [onDoubleTap, triggerHaptic]);

  // Fetch candle data
  const fetchCandles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/api/candles?symbol=${symbol}&interval=${interval}&limit=${MOBILE_PERFORMANCE_CONFIG.candleDataLimit}`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.candles || !Array.isArray(data.candles)) {
        throw new Error('Invalid data format');
      }

      const candles: CandleData[] = data.candles.map((c: CandleData) => ({
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

      return candles;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [symbol, interval]);

  // Update chart series
  const updateChartData = useCallback((candles: CandleData[]) => {
    if (!candleSeriesRef.current || candles.length === 0) return;

    // Update candle series
    candleSeriesRef.current.setData(candles);

    // Update volume
    if (volumeSeriesRef.current && volume.enabled) {
      const volumeData = candles.map((c) => ({
        time: c.time,
        value: c.volume || 0,
        color: c.close >= c.open ? CHART_COLORS.volumeUp : CHART_COLORS.volumeDown,
      }));
      volumeSeriesRef.current.setData(volumeData);
    }

    // Update moving averages
    movingAverages.forEach((ma) => {
      const series = maSeriesRefs.current.get(ma.id);
      if (series && ma.enabled) {
        const data = ma.type === 'sma'
          ? calculateSMA(candles, ma.period)
          : calculateEMA(candles, ma.period);
        series.setData(data);
      }
    });

    // Fit content
    chartRef.current?.timeScale().fitContent();
  }, [movingAverages, volume.enabled]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create chart
    const chart = createChart(container, getMobileChartOptions(width, height));
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

    // Crosshair move handler
    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time) {
        onCrosshairMove?.(null);
        return;
      }

      const price = candleSeries.coordinateToPrice(param.point.y);
      if (price !== null) {
        const data = candleDataRef.current.find((c) => c.time === param.time);
        onCrosshairMove?.({
          time: param.time,
          price,
          ohlc: data,
        });
      }
    });

    // ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0] || !chartRef.current) return;
      const { width: w, height: h } = entries[0].contentRect;
      chartRef.current.applyOptions({ width: w, height: h });
    });
    resizeObserver.observe(container);

    // Load data
    fetchCandles().then((candles) => {
      if (candles.length > 0) {
        updateChartData(candles);
      }
    });

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      maSeriesRefs.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle symbol/interval change
  useEffect(() => {
    if (!chartRef.current) return;

    fetchCandles().then((candles) => {
      if (candles.length > 0) {
        updateChartData(candles);
      }
    });
  }, [symbol, interval, fetchCandles, updateChartData]);

  // Update MA series when config changes
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    const existingIds = new Set(maSeriesRefs.current.keys());

    // Remove series that no longer exist
    existingIds.forEach((id) => {
      if (!movingAverages.find((ma) => ma.id === id)) {
        const series = maSeriesRefs.current.get(id);
        if (series) {
          chart.removeSeries(series);
          maSeriesRefs.current.delete(id);
        }
      }
    });

    // Add or update series
    movingAverages.forEach((ma) => {
      let series = maSeriesRefs.current.get(ma.id);

      if (!series) {
        series = chart.addSeries(LineSeries, {
          color: ma.color,
          lineWidth: ma.lineWidth as 1 | 2 | 3 | 4,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        maSeriesRefs.current.set(ma.id, series);
      } else {
        series.applyOptions({
          color: ma.color,
          lineWidth: ma.lineWidth as 1 | 2 | 3 | 4,
          visible: ma.enabled,
        });
      }

      if (ma.enabled && candleDataRef.current.length > 0) {
        const data = ma.type === 'sma'
          ? calculateSMA(candleDataRef.current, ma.period)
          : calculateEMA(candleDataRef.current, ma.period);
        series.setData(data);
      }
    });
  }, [movingAverages]);

  // Volume visibility
  useEffect(() => {
    volumeSeriesRef.current?.applyOptions({ visible: volume.enabled });
  }, [volume.enabled]);

  // Real-time price updates
  useEffect(() => {
    const unsubscribe = usePriceStore.subscribe((state) => {
      const lastTrade = state.priceHistory[state.priceHistory.length - 1];
      if (!lastTrade || !candleSeriesRef.current) return;
      if (lastTrade.symbol !== symbol) return;

      const intervalSeconds = getIntervalSeconds(interval);
      const tradeTime = Math.floor(lastTrade.timestamp / 1000);
      const candleTime = Math.floor(tradeTime / intervalSeconds) * intervalSeconds;

      if (candleTime > currentCandleTimeRef.current) {
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
        candleDataRef.current = [...candleDataRef.current, newCandle].slice(-MOBILE_PERFORMANCE_CONFIG.candleDataLimit);
      } else if (currentCandleRef.current) {
        const updated: CandleData = {
          ...currentCandleRef.current,
          high: Math.max(currentCandleRef.current.high, lastTrade.price),
          low: Math.min(currentCandleRef.current.low, lastTrade.price),
          close: lastTrade.price,
        };

        candleSeriesRef.current.update(updated);
        currentCandleRef.current = updated;

        if (candleDataRef.current.length > 0) {
          candleDataRef.current[candleDataRef.current.length - 1] = updated;
        }
      }
    });

    return () => unsubscribe();
  }, [symbol, interval]);

  // Loading overlay
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card/50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading chart...</span>
        </div>
      </div>
    );
  }

  // Error overlay
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card/50">
        <div className="flex flex-col items-center gap-3 px-4 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <span className="text-sm text-muted-foreground">{error}</span>
          <button
            onClick={() => fetchCandles().then(updateChartData)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg",
              "bg-primary text-primary-foreground text-sm font-medium",
              "active:scale-95 transition-transform"
            )}
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 touch-pan-x"
      onClick={handleTouch}
      role="img"
      aria-label={`${symbol} price chart, ${interval} interval`}
    />
  );
});

export default MobileChart;
