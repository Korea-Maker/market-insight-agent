"use client";

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Settings2, Minus, TrendingUp } from 'lucide-react';
import { TimeInterval, DrawingToolType, useChartStore } from '@/store/useChartStore';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];

const INTERVALS: { label: string; value: TimeInterval }[] = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1d', value: '1d' },
];

interface ChartControlsProps {
  symbol: string;
  interval: TimeInterval;
  onSymbolChange: (symbol: string) => void;
  onIntervalChange: (interval: TimeInterval) => void;
  onOpenSettings: () => void;
  activeDrawingTool: DrawingToolType | null;
}

export function ChartControls({
  symbol,
  interval,
  onSymbolChange,
  onIntervalChange,
  onOpenSettings,
  activeDrawingTool,
}: ChartControlsProps): React.ReactElement {
  const setActiveDrawingTool = useChartStore((s) => s.setActiveDrawingTool);
  const movingAverages = useChartStore((s) => s.movingAverages);
  const ichimoku = useChartStore((s) => s.ichimoku);
  const rsiConfigs = useChartStore((s) => s.rsiConfigs);
  const macd = useChartStore((s) => s.macd);

  // Count active indicators
  const activeIndicatorCount =
    movingAverages.filter(m => m.enabled).length +
    (ichimoku.enabled ? 1 : 0) +
    rsiConfigs.filter(r => r.enabled).length +
    (macd.enabled ? 1 : 0);

  return (
    <div className="absolute top-3 left-3 right-3 z-10 flex items-start justify-between gap-4 pointer-events-none">
      {/* Left: Symbol + Timeframe */}
      <div className="flex flex-col gap-2 pointer-events-auto">
        {/* Symbol Selector */}
        <div className="flex gap-0.5 bg-background/95 backdrop-blur-sm rounded-lg p-1 border shadow-sm">
          {SYMBOLS.map((sym) => (
            <Button
              key={sym}
              variant={symbol === sym ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onSymbolChange(sym)}
              className={cn(
                "h-7 px-2 text-xs font-mono",
                symbol === sym && "shadow-sm"
              )}
            >
              {sym.replace('USDT', '')}
            </Button>
          ))}
        </div>

        {/* Interval Selector */}
        <div className="flex gap-0.5 bg-background/95 backdrop-blur-sm rounded-lg p-1 border shadow-sm">
          {INTERVALS.map((int) => (
            <Button
              key={int.value}
              variant={interval === int.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onIntervalChange(int.value)}
              className={cn(
                "h-7 px-2.5 text-xs font-mono",
                interval === int.value && "shadow-sm"
              )}
            >
              {int.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Right: Drawing Tools + Settings */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Quick Drawing Tools */}
        <div className="flex gap-0.5 bg-background/95 backdrop-blur-sm rounded-lg p-1 border shadow-sm">
          <Button
            variant={activeDrawingTool === 'horizontalLine' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveDrawingTool(activeDrawingTool === 'horizontalLine' ? null : 'horizontalLine')}
            className="h-7 w-7 p-0"
            title="Horizontal Line"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={activeDrawingTool === 'trendLine' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveDrawingTool(activeDrawingTool === 'trendLine' ? null : 'trendLine')}
            className="h-7 w-7 p-0"
            title="Trend Line"
          >
            <TrendingUp className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Settings Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenSettings}
          className="h-8 gap-2 bg-background/95 backdrop-blur-sm"
        >
          <Settings2 className="h-4 w-4" />
          <span className="text-xs">Indicators</span>
          {activeIndicatorCount > 0 && (
            <span className="ml-1 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
              {activeIndicatorCount}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
