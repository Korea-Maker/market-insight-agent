"use client";

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import { usePriceStore } from '@/store/usePriceStore';
import { OHLCData } from '@/types/price';

interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface VolumeData {
  time: Time;
  value: number;
  color: string;
}

interface MAData {
  time: Time;
  value: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 차트 색상 상수
const CHART_COLORS = {
  up: '#26a69a',
  down: '#ef5350',
  ma20: '#2962FF',
  ma50: '#FF6D00',
  grid: 'rgba(42, 46, 57, 0.1)',
  border: 'rgba(42, 46, 57, 0.5)',
  text: '#D9D9D9',
  volumeUp: 'rgba(0, 150, 136, 0.5)',
  volumeDown: 'rgba(255, 82, 82, 0.5)',
} as const;

export function CryptoChart(): React.ReactElement {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ma50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 현재 캔들 추적 (실시간 업데이트용)
  const currentCandleRef = useRef<CandleData | null>(null);
  const currentCandleTimeRef = useRef<number>(0);

  // 이동평균 계산 함수
  const calculateMA = (data: CandleData[], period: number): MAData[] => {
    if (data.length < period) return [];
    
    const ma: MAData[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
      ma.push({
        time: data[i].time,
        value: sum / period,
      });
    }
    return ma;
  };

  // 차트 초기화 및 데이터 로드
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 차트 생성
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: CHART_COLORS.text,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: CHART_COLORS.border,
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.border,
      },
    });

    chartRef.current = chart;

    // 캔들스틱 시리즈 추가 (v5 API)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.up,
      downColor: CHART_COLORS.down,
      borderVisible: false,
      wickUpColor: CHART_COLORS.up,
      wickDownColor: CHART_COLORS.down,
    });
    candlestickSeriesRef.current = candlestickSeries;

    // 거래량 히스토그램 추가 (별도 패널)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: CHART_COLORS.up,
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });
    volumeSeriesRef.current = volumeSeries;

    // 이동평균선 추가
    const ma20Series = chart.addSeries(LineSeries, {
      color: CHART_COLORS.ma20,
      lineWidth: 2,
      title: 'MA20',
      priceLineVisible: false,
      lastValueVisible: true,
    });
    ma20SeriesRef.current = ma20Series;

    const ma50Series = chart.addSeries(LineSeries, {
      color: CHART_COLORS.ma50,
      lineWidth: 2,
      title: 'MA50',
      priceLineVisible: false,
      lastValueVisible: true,
    });
    ma50SeriesRef.current = ma50Series;

    // 거래량 스케일 설정
    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // ResizeObserver 설정
    const container = chartContainerRef.current;
    if (!container) {
      return () => {
        chart.remove();
      };
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartRef.current.applyOptions({ width, height });
    });
    
    resizeObserver.observe(container);

    // 차트 초기화 후 과거 데이터 로드
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${API_BASE_URL}/api/candles?symbol=BTCUSDT&interval=1m&limit=500`
        );

        if (!response.ok) {
          throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.candles || !Array.isArray(data.candles)) {
          throw new Error('잘못된 데이터 형식: candles 배열이 없습니다');
        }

        const candles: CandleData[] = data.candles.map((candle: OHLCData) => ({
          time: candle.time as Time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }));

        if (candles.length === 0) {
          throw new Error('캔들 데이터가 없습니다');
        }

        // 현재 캔들 설정
        const lastCandle = candles[candles.length - 1];
        currentCandleRef.current = { ...lastCandle };
        currentCandleTimeRef.current = lastCandle.time as number;

        // 데이터 설정
        candlestickSeries.setData(candles);

        const volumeData: VolumeData[] = data.candles.map((candle: OHLCData) => ({
          time: candle.time as Time,
          value: candle.volume,
          color: candle.close >= candle.open ? CHART_COLORS.volumeUp : CHART_COLORS.volumeDown,
        }));
        volumeSeries.setData(volumeData);

        const ma20 = calculateMA(candles, 20);
        const ma50 = calculateMA(candles, 50);
        if (ma20.length > 0) ma20Series.setData(ma20);
        if (ma50.length > 0) ma50Series.setData(ma50);

        chart.timeScale().fitContent();
        setLoading(false);
      } catch (err) {
        console.error('[CryptoChart] 캔들 데이터 로드 실패:', err);
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
        setError(errorMessage);
        setLoading(false);
      }
    };

    // 약간의 지연을 두고 데이터 로드 (차트가 완전히 렌더링된 후)
    const timer = setTimeout(() => {
      loadInitialData();
    }, 100);

    // Cleanup
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // 실시간 가격 업데이트로 현재 캔들 갱신
  useEffect(() => {
    const unsubscribe = usePriceStore.subscribe((state) => {
      const lastTrade = state.priceHistory[state.priceHistory.length - 1];
      if (!lastTrade || !candlestickSeriesRef.current) return;

      const tradeTime = Math.floor(lastTrade.timestamp / 1000);
      const currentCandleTime = currentCandleTimeRef.current;
      
      // 새로운 캔들 시작 여부 확인 (1분 간격 기준)
      const isNewCandle = tradeTime >= currentCandleTime + 60;

      if (isNewCandle) {
        // 새로운 캔들 생성
        if (currentCandleRef.current) {
          // 이전 캔들 확정 (이미 추가되어 있으므로 업데이트만)
          const newCandle: CandleData = {
            time: tradeTime as Time,
            open: lastTrade.price,
            high: lastTrade.price,
            low: lastTrade.price,
            close: lastTrade.price,
          };
          
          candlestickSeriesRef.current.update(newCandle);
          currentCandleRef.current = newCandle;
          currentCandleTimeRef.current = tradeTime;
        }
      } else {
        // 현재 캔들 업데이트 (High/Low/Close)
        if (currentCandleRef.current) {
          const updatedCandle: CandleData = {
            ...currentCandleRef.current,
            high: Math.max(currentCandleRef.current.high, lastTrade.price),
            low: Math.min(currentCandleRef.current.low, lastTrade.price),
            close: lastTrade.price,
          };
          
          candlestickSeriesRef.current.update(updatedCandle);
          currentCandleRef.current = updatedCandle;
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full h-full min-h-[500px] p-4 bg-card rounded-xl border shadow-sm flex flex-col relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <div className="text-sm text-muted-foreground">캔들 데이터 로딩 중...</div>
            <div className="text-xs text-muted-foreground/60">{API_BASE_URL}/api/candles</div>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 rounded-xl">
          <div className="flex flex-col items-center gap-2 max-w-md text-center">
            <div className="text-sm font-semibold text-destructive">오류 발생</div>
            <div className="text-xs text-destructive/80">{error}</div>
            <div className="text-xs text-muted-foreground mt-2">
              API URL: {API_BASE_URL}/api/candles
            </div>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                // 페이지 새로고침으로 재시도
                window.location.reload();
              }}
              className="mt-2 px-4 py-2 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 w-full min-h-[500px]" ref={chartContainerRef} />
    </div>
  );
};
