"use client";

import { Button } from '@/components/ui/button';
import { Settings2, Minus, TrendingUp } from 'lucide-react';
import { DrawingToolType, useChartStore } from '@/store/useChartStore';

interface ChartControlsProps {
  onOpenSettings: () => void;
  activeDrawingTool: DrawingToolType | null;
}

export function ChartControls({
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
    <div className="absolute top-3 right-3 z-10 flex items-center gap-2 pointer-events-auto">
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
  );
}
