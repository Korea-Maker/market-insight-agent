/**
 * MobileChartContainer
 * Main container for mobile trading chart with full touch support
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useChartStore } from '@/store/useChartStore';
import { usePriceStore } from '@/store/usePriceStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  MobileChartContainerProps,
  PriceInfo,
  CrosshairData,
} from './types';
import { useDeviceInfo } from './hooks/useDeviceInfo';
import { useOrientation } from './hooks/useOrientation';
import { MobileChartHeader } from './MobileChartHeader';
import { MobileChart } from './MobileChart';
import { MobileTimeframePicker } from './MobileTimeframePicker';
import { MobileControlBar } from './MobileControlBar';
import { MobileIndicatorSheet } from './MobileIndicatorSheet';

export function MobileChartContainer({
  symbol: propSymbol,
  interval: propInterval,
  onSymbolChange,
  onIntervalChange,
  fullscreen: propFullscreen,
  className,
}: MobileChartContainerProps) {
  // WebSocket connection
  const { isConnected } = useWebSocket();

  // Device info
  const { safeArea, triggerHaptic } = useDeviceInfo();
  const { isLandscape } = useOrientation();

  // Store state
  const storeSymbol = useChartStore((s) => s.symbol);
  const storeInterval = useChartStore((s) => s.interval);
  const setStoreSymbol = useChartStore((s) => s.setSymbol);
  const setStoreInterval = useChartStore((s) => s.setInterval);

  // Use prop values if provided, otherwise use store
  const symbol = propSymbol ?? storeSymbol;
  const interval = propInterval ?? storeInterval;

  // Local UI state
  const [isFullscreen, setIsFullscreen] = useState(propFullscreen ?? false);
  const [showIndicatorSheet, setShowIndicatorSheet] = useState(false);
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [crosshairData, setCrosshairData] = useState<CrosshairData | null>(null);

  // Price info from store
  const currentPrice = usePriceStore((s) => s.currentPrice);
  const priceHistory = usePriceStore((s) => s.priceHistory);

  // Calculate price info
  const priceInfo: PriceInfo | null = currentPrice
    ? {
        symbol,
        currentPrice,
        priceChange24h: 0, // Would need 24h data
        priceChangePercent24h: priceHistory.length >= 2
          ? ((currentPrice - priceHistory[0].price) / priceHistory[0].price) * 100
          : 0,
      }
    : null;

  // Handlers
  const handleSymbolChange = useCallback((newSymbol: string) => {
    triggerHaptic('selection');
    setStoreSymbol(newSymbol);
    onSymbolChange?.(newSymbol);
  }, [setStoreSymbol, onSymbolChange, triggerHaptic]);

  const handleIntervalChange = useCallback((newInterval: typeof interval) => {
    triggerHaptic('light');
    setStoreInterval(newInterval);
    onIntervalChange?.(newInterval);
  }, [setStoreInterval, onIntervalChange, triggerHaptic]);

  const handleSymbolPress = useCallback(() => {
    triggerHaptic('light');
    setShowSymbolPicker(true);
  }, [triggerHaptic]);

  const handleFullscreenToggle = useCallback(() => {
    triggerHaptic('medium');
    setIsFullscreen((prev) => !prev);

    // Request fullscreen API if supported
    if (!isFullscreen && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Ignore errors
      });
    } else if (isFullscreen && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {
        // Ignore errors
      });
    }
  }, [isFullscreen, triggerHaptic]);

  const handleIndicatorsPress = useCallback(() => {
    triggerHaptic('light');
    setShowIndicatorSheet(true);
  }, [triggerHaptic]);

  const handleRefresh = useCallback(async () => {
    triggerHaptic('light');
    setIsRefreshing(true);

    // Force a re-fetch by toggling the interval
    const currentInterval = interval;
    setStoreInterval('1m');
    await new Promise((resolve) => setTimeout(resolve, 100));
    setStoreInterval(currentInterval);

    setIsRefreshing(false);
  }, [interval, setStoreInterval, triggerHaptic]);

  const handleCrosshairMove = useCallback((data: CrosshairData | null) => {
    setCrosshairData(data);
  }, []);

  const handleDoubleTap = useCallback(() => {
    // Reset zoom - handled in MobileChart
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Sync with prop fullscreen
  useEffect(() => {
    if (propFullscreen !== undefined) {
      setIsFullscreen(propFullscreen);
    }
  }, [propFullscreen]);

  return (
    <div
      className={cn(
        "flex flex-col bg-background",
        isFullscreen ? "fixed inset-0 z-50" : "h-full min-h-[500px]",
        isLandscape && "flex-row",
        className
      )}
      style={{
        paddingTop: isFullscreen ? safeArea.top : 0,
        paddingBottom: isFullscreen ? safeArea.bottom : 0,
        paddingLeft: safeArea.left,
        paddingRight: safeArea.right,
      }}
    >
      {/* Landscape mode: Header on left side */}
      {isLandscape ? (
        <>
          {/* Side header for landscape */}
          <div className="flex flex-col w-12 border-r border-border/50 bg-background/95">
            <MobileChartHeader
              symbol={symbol}
              priceInfo={priceInfo}
              isConnected={isConnected}
              onSymbolPress={handleSymbolPress}
              onFullscreenToggle={handleFullscreenToggle}
              isFullscreen={isFullscreen}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col">
            <MobileChart
              symbol={symbol}
              interval={interval}
              onCrosshairMove={handleCrosshairMove}
              onDoubleTap={handleDoubleTap}
            />
            <MobileTimeframePicker
              current={interval}
              onChange={handleIntervalChange}
              compact
            />
          </div>
        </>
      ) : (
        <>
          {/* Portrait mode: Standard layout */}
          <MobileChartHeader
            symbol={symbol}
            priceInfo={priceInfo}
            isConnected={isConnected}
            onSymbolPress={handleSymbolPress}
            onFullscreenToggle={handleFullscreenToggle}
            isFullscreen={isFullscreen}
          />

          <MobileChart
            symbol={symbol}
            interval={interval}
            onCrosshairMove={handleCrosshairMove}
            onDoubleTap={handleDoubleTap}
          />

          <MobileTimeframePicker
            current={interval}
            onChange={handleIntervalChange}
          />

          <MobileControlBar
            onIndicatorsPress={handleIndicatorsPress}
            onRefresh={handleRefresh}
            onFullscreen={handleFullscreenToggle}
            isFullscreen={isFullscreen}
            isRefreshing={isRefreshing}
          />
        </>
      )}

      {/* Indicator Sheet */}
      <MobileIndicatorSheet
        isOpen={showIndicatorSheet}
        onClose={() => setShowIndicatorSheet(false)}
      />

      {/* Crosshair overlay (when active) */}
      {crosshairData && crosshairData.ohlc && (
        <div
          className={cn(
            "absolute top-14 left-3 right-3",
            "px-3 py-2 rounded-lg",
            "bg-background/95 backdrop-blur-sm border border-border/50",
            "flex items-center justify-between gap-4",
            "text-xs font-mono"
          )}
        >
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">O</span>
            <span className="text-foreground">{crosshairData.ohlc.open.toFixed(2)}</span>
            <span className="text-muted-foreground">H</span>
            <span className="text-emerald-500">{crosshairData.ohlc.high.toFixed(2)}</span>
            <span className="text-muted-foreground">L</span>
            <span className="text-red-500">{crosshairData.ohlc.low.toFixed(2)}</span>
            <span className="text-muted-foreground">C</span>
            <span className="text-foreground">{crosshairData.ohlc.close.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MobileChartContainer;
