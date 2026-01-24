"use client";

import { cn } from '@/lib/utils';
import { INDICATOR_COLORS } from '@/lib/indicators';

export interface SubPanelCrosshairData {
  rsi?: Record<string, number>;
  macd?: { macd: number; signal: number; histogram: number };
  stochastic?: { k: number; d: number };
  atr?: number;
  adx?: { adx: number; plusDI: number; minusDI: number };
  obv?: number;
}

interface SubPanelLegendProps {
  indicatorType: 'rsi' | 'macd' | 'stochastic' | 'atr' | 'adx' | 'obv';
  label: string;
  crosshairData?: SubPanelCrosshairData | null;
  lastValue?: SubPanelCrosshairData | null;
  config?: {
    rsiConfigs?: Array<{ id: string; period: number; color: string; enabled: boolean }>;
    macd?: { fastPeriod: number; slowPeriod: number; signalPeriod: number };
    stochastic?: { kPeriod: number; dPeriod: number; smooth: number };
    atr?: { period: number };
    adx?: { period: number; showDI: boolean };
  };
  onDoubleClick?: () => void;
}

export function SubPanelLegend({
  indicatorType,
  label,
  crosshairData,
  lastValue,
  config,
  onDoubleClick,
}: SubPanelLegendProps): React.ReactElement {
  const displayData = crosshairData || lastValue;

  const renderValue = () => {
    switch (indicatorType) {
      case 'rsi':
        if (!displayData?.rsi || !config?.rsiConfigs) return null;
        return config.rsiConfigs
          .filter((rsi) => rsi.enabled)
          .map((rsi) => {
            const value = displayData.rsi?.[rsi.id];
            return (
              <IndicatorValue
                key={rsi.id}
                label={`RSI(${rsi.period})`}
                value={value !== undefined ? value.toFixed(2) : '--'}
                color={rsi.color}
              />
            );
          });

      case 'macd':
        if (!displayData?.macd) return null;
        const macdVal = displayData.macd;
        return (
          <div className="flex items-center gap-3">
            <IndicatorValue
              label="MACD"
              value={macdVal.macd.toFixed(2)}
              color={INDICATOR_COLORS.macdLine}
            />
            <IndicatorValue
              label="Signal"
              value={macdVal.signal.toFixed(2)}
              color={INDICATOR_COLORS.macdSignal}
            />
            <IndicatorValue
              label="Hist"
              value={macdVal.histogram.toFixed(2)}
              color={macdVal.histogram >= 0 ? '#26a69a' : '#ef5350'}
            />
          </div>
        );

      case 'stochastic':
        if (!displayData?.stochastic) return null;
        const stochVal = displayData.stochastic;
        return (
          <div className="flex items-center gap-3">
            <IndicatorValue
              label="%K"
              value={stochVal.k.toFixed(2)}
              color={INDICATOR_COLORS.stochasticK}
            />
            <IndicatorValue
              label="%D"
              value={stochVal.d.toFixed(2)}
              color={INDICATOR_COLORS.stochasticD}
            />
          </div>
        );

      case 'atr':
        if (displayData?.atr === undefined) return null;
        return (
          <IndicatorValue
            label={`ATR(${config?.atr?.period || 14})`}
            value={displayData.atr.toFixed(2)}
            color={INDICATOR_COLORS.atr}
          />
        );

      case 'adx':
        if (!displayData?.adx) return null;
        const adxVal = displayData.adx;
        return (
          <div className="flex items-center gap-3">
            <IndicatorValue
              label="ADX"
              value={adxVal.adx.toFixed(2)}
              color="#FFEB3B"
            />
            {config?.adx?.showDI && (
              <>
                <IndicatorValue
                  label="+DI"
                  value={adxVal.plusDI.toFixed(2)}
                  color={INDICATOR_COLORS.supertrendUp}
                />
                <IndicatorValue
                  label="-DI"
                  value={adxVal.minusDI.toFixed(2)}
                  color={INDICATOR_COLORS.supertrendDown}
                />
              </>
            )}
          </div>
        );

      case 'obv':
        if (displayData?.obv === undefined) return null;
        return (
          <IndicatorValue
            label="OBV"
            value={formatVolume(displayData.obv)}
            color="#4CAF50"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "absolute top-1 left-2 z-10",
        "flex items-center gap-2 text-xs font-mono",
        "bg-background/80 backdrop-blur-sm rounded px-2 py-1",
        "cursor-pointer transition-all duration-150",
        "hover:bg-muted/60 hover:scale-[1.02]",
        "active:scale-[0.98]"
      )}
      onDoubleClick={onDoubleClick}
    >
      <span className="text-muted-foreground font-medium">{label}</span>
      {renderValue()}
    </div>
  );
}

interface IndicatorValueProps {
  label: string;
  value: string;
  color: string;
}

function IndicatorValue({ label, value, color }: IndicatorValueProps) {
  return (
    <div className="flex items-center gap-1">
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-muted-foreground">{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}

function formatVolume(num: number): string {
  const absNum = Math.abs(num);
  if (absNum >= 1e9) {
    return (num / 1e9).toFixed(2) + 'B';
  }
  if (absNum >= 1e6) {
    return (num / 1e6).toFixed(2) + 'M';
  }
  if (absNum >= 1e3) {
    return (num / 1e3).toFixed(2) + 'K';
  }
  return num.toFixed(0);
}
