"use client";

import { useEffect, useRef, memo } from 'react';
import { TimeInterval } from '@/store/useChartStore';

interface TradingViewWidgetProps {
  symbol: string;
  interval: TimeInterval;
  theme?: 'light' | 'dark';
}

// Convert our symbol format to TradingView format
// BTCUSDT -> BINANCE:BTCUSDT
function formatSymbol(symbol: string): string {
  return `BINANCE:${symbol}`;
}

// Convert our interval format to TradingView format
// 1m -> 1, 5m -> 5, 15m -> 15, 1h -> 60, 4h -> 240, 1d -> D
function formatInterval(interval: TimeInterval): string {
  const intervalMap: Record<TimeInterval, string> = {
    '1m': '1',
    '5m': '5',
    '15m': '15',
    '1h': '60',
    '4h': '240',
    '1d': 'D',
  };
  return intervalMap[interval] || '60';
}

function TradingViewWidgetComponent({ symbol, interval, theme = 'dark' }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = '';
    if (scriptRef.current) {
      scriptRef.current.remove();
      scriptRef.current = null;
    }

    // Create widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = 'calc(100% - 32px)';
    widgetDiv.style.width = '100%';

    widgetContainer.appendChild(widgetDiv);
    containerRef.current.appendChild(widgetContainer);

    // Create and inject script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: formatSymbol(symbol),
      interval: formatInterval(interval),
      timezone: 'Asia/Seoul',
      theme: theme,
      style: '1', // Candlestick
      locale: 'kr',
      enable_publishing: false,
      allow_symbol_change: true,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
      // Drawing tools (left panel)
      hide_side_toolbar: false,
      // Studies/indicators
      studies: [],
      // Show drawing toolbar by default
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650',
      // Container ID
      container_id: 'tradingview_widget',
    });
    scriptRef.current = script;

    widgetContainer.appendChild(script);

    return () => {
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
    };
  }, [symbol, interval, theme]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[500px]"
      id="tradingview_widget"
    />
  );
}

export const TradingViewWidget = memo(TradingViewWidgetComponent);
