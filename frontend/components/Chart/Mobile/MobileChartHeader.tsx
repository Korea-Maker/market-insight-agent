/**
 * MobileChartHeader
 * Displays symbol, price, and change information with touch-friendly controls
 */

'use client';

import { memo } from 'react';
import { ChevronDown, Maximize2, Minimize2, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileChartHeaderProps, TOUCH_TARGET_SIZES } from './types';

function formatPrice(price: number): string {
  if (price >= 10000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 });
}

function formatPercent(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

function formatSymbol(symbol: string): string {
  // Convert BTCUSDT to BTC/USDT
  if (symbol.endsWith('USDT')) {
    return `${symbol.slice(0, -4)}/USDT`;
  }
  if (symbol.endsWith('USD')) {
    return `${symbol.slice(0, -3)}/USD`;
  }
  return symbol;
}

export const MobileChartHeader = memo(function MobileChartHeader({
  symbol,
  priceInfo,
  isConnected,
  onSymbolPress,
  onFullscreenToggle,
  isFullscreen,
}: MobileChartHeaderProps) {
  const isPositive = priceInfo ? priceInfo.priceChangePercent24h >= 0 : true;

  return (
    <header
      className="flex items-center justify-between px-3 bg-background/95 backdrop-blur-sm border-b border-border/50"
      style={{ height: TOUCH_TARGET_SIZES.comfortable }}
    >
      {/* Symbol Selector */}
      <button
        onClick={onSymbolPress}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5 rounded-lg",
          "active:bg-muted/50 transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        )}
        style={{ minHeight: TOUCH_TARGET_SIZES.minimum }}
        aria-label={`Select trading pair, current: ${formatSymbol(symbol)}`}
      >
        <span className="text-base font-semibold text-foreground">
          {formatSymbol(symbol)}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Price & Change */}
      <div
        className="flex items-center gap-3"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {priceInfo ? (
          <>
            <span className="text-lg font-mono font-bold text-foreground tabular-nums">
              ${formatPrice(priceInfo.currentPrice)}
            </span>
            <span
              className={cn(
                "text-sm font-medium tabular-nums",
                isPositive ? "text-emerald-500" : "text-red-500"
              )}
            >
              {formatPercent(priceInfo.priceChangePercent24h)}
            </span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Loading...</span>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1">
        {/* Connection Status */}
        <div
          className={cn(
            "flex items-center justify-center",
            "w-8 h-8 rounded-full"
          )}
          aria-label={isConnected ? "Connected" : "Disconnected"}
        >
          {isConnected ? (
            <Wifi className="h-4 w-4 text-emerald-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={onFullscreenToggle}
          className={cn(
            "flex items-center justify-center",
            "w-10 h-10 rounded-lg",
            "active:bg-muted/50 transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          )}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Maximize2 className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </div>
    </header>
  );
});

export default MobileChartHeader;
