"use client";

import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time, AreaSeries } from 'lightweight-charts';
import { usePriceStore } from '@/store/usePriceStore';

export const CryptoChart = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#D9D9D9',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.1)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.1)' },
      },
      // Initial dimensions (will be updated by ResizeObserver)
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
      },
    });

    chartRef.current = chart;

    // 2. Add Series (v5 API)
    const newSeries = chart.addSeries(AreaSeries, {
      lineColor: '#2962FF',
      topColor: '#2962FF',
      bottomColor: 'rgba(41, 98, 255, 0.28)',
    });
    seriesRef.current = newSeries;

    // 3. Set Initial Data
    const { priceHistory } = usePriceStore.getState();
    const sortedHistory = [...priceHistory].sort((a, b) => a.timestamp - b.timestamp);
    
    // Process data to ensure unique seconds
    const dataMap = new Map<number, number>();
    sortedHistory.forEach(trade => {
        const time = Math.floor(trade.timestamp / 1000);
        dataMap.set(time, trade.price);
    });
    
    const initialData = Array.from(dataMap.entries()).map(([time, value]) => ({
        time: time as Time,
        value,
    })).sort((a, b) => (a.time as number) - (b.time as number));

    if (initialData.length > 0) {
        newSeries.setData(initialData);
        lastTimeRef.current = initialData[initialData.length - 1].time as number;
        chart.timeScale().fitContent();
    }

    // 4. Handle Resize with ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
        if (!entries || entries.length === 0 || !chartRef.current) return;
        const { width, height } = entries[0].contentRect;
        chartRef.current.applyOptions({ width, height });
    });
    resizeObserver.observe(chartContainerRef.current);

    // 5. Cleanup
    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // 6. Subscribe to Store Updates
  useEffect(() => {
    const unsubscribe = usePriceStore.subscribe((state) => {
      const series = seriesRef.current;
      if (!series) return;

      const lastTrade = state.priceHistory[state.priceHistory.length - 1];
      if (!lastTrade) return;

      const time = Math.floor(lastTrade.timestamp / 1000);
      
      // Safety check: ensure time is not backward
      if (time < lastTimeRef.current) return;

      series.update({
        time: time as Time,
        value: lastTrade.price,
      });
      
      lastTimeRef.current = time;
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full h-full min-h-[500px] p-4 bg-card rounded-xl border shadow-sm flex flex-col">
      <div className="flex-1 w-full min-h-[450px]" ref={chartContainerRef} />
    </div>
  );
};
