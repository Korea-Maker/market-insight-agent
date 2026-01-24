"use client";

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChartStore, TimeInterval } from '@/store/useChartStore';
import { INDICATOR_COLORS } from '@/lib/indicators';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];

const INTERVALS: { label: string; value: TimeInterval }[] = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1d', value: '1d' },
];

export interface CrosshairData {
  time: number;
  values: {
    // MA values by id
    ma: Record<string, number>;
    // Overlay indicators
    bollingerBands?: { upper: number; middle: number; lower: number };
    vwap?: number;
    supertrend?: number;
    // Oscillators
    rsi: Record<string, number>;
    macd?: { macd: number; signal: number; histogram: number };
    stochastic?: { k: number; d: number };
    atr?: number;
    adx?: { adx: number; plusDI: number; minusDI: number };
    obv?: number;
  };
}

interface ActiveIndicatorLegendProps {
  symbol: string;
  interval: TimeInterval;
  onSymbolChange: (symbol: string) => void;
  onIntervalChange: (interval: TimeInterval) => void;
  crosshairData?: CrosshairData | null;
}

export function ActiveIndicatorLegend({
  symbol,
  interval,
  onSymbolChange,
  onIntervalChange,
  crosshairData,
}: ActiveIndicatorLegendProps): React.ReactElement {
  // Store state
  const movingAverages = useChartStore((s) => s.movingAverages);
  const ichimoku = useChartStore((s) => s.ichimoku);
  const bollingerBands = useChartStore((s) => s.bollingerBands);
  const vwap = useChartStore((s) => s.vwap);
  const supertrend = useChartStore((s) => s.supertrend);
  const parabolicSAR = useChartStore((s) => s.parabolicSAR);
  const emaRibbon = useChartStore((s) => s.emaRibbon);
  const rsiConfigs = useChartStore((s) => s.rsiConfigs);
  const showRSIPanel = useChartStore((s) => s.showRSIPanel);
  const macd = useChartStore((s) => s.macd);
  const stochastic = useChartStore((s) => s.stochastic);
  const atr = useChartStore((s) => s.atr);
  const adx = useChartStore((s) => s.adx);
  const obv = useChartStore((s) => s.obv);

  // Enabled overlay indicators
  const enabledOverlays = useMemo(() => {
    const overlays: { type: string; label: string; color: string; value?: string }[] = [];

    // Moving Averages
    movingAverages
      .filter((ma) => ma.enabled)
      .forEach((ma) => {
        const value = crosshairData?.values.ma[ma.id];
        overlays.push({
          type: 'ma',
          label: `${ma.type.toUpperCase()} ${ma.period}`,
          color: ma.color,
          value: value !== undefined ? formatNumber(value) : undefined,
        });
      });

    // Bollinger Bands
    if (bollingerBands.enabled) {
      const bb = crosshairData?.values.bollingerBands;
      overlays.push({
        type: 'bb',
        label: `BB(${bollingerBands.period}, ${bollingerBands.stdDev})`,
        color: INDICATOR_COLORS.bollingerMiddle,
        value: bb ? `${formatNumber(bb.upper)} / ${formatNumber(bb.lower)}` : undefined,
      });
    }

    // VWAP
    if (vwap.enabled) {
      overlays.push({
        type: 'vwap',
        label: 'VWAP',
        color: INDICATOR_COLORS.vwap,
        value: crosshairData?.values.vwap !== undefined ? formatNumber(crosshairData.values.vwap) : undefined,
      });
    }

    // Supertrend
    if (supertrend.enabled) {
      overlays.push({
        type: 'supertrend',
        label: `ST(${supertrend.period}, ${supertrend.multiplier})`,
        color: INDICATOR_COLORS.supertrendUp,
        value: crosshairData?.values.supertrend !== undefined ? formatNumber(crosshairData.values.supertrend) : undefined,
      });
    }

    // Ichimoku
    if (ichimoku.enabled) {
      overlays.push({
        type: 'ichimoku',
        label: 'Ichimoku',
        color: INDICATOR_COLORS.ichimoku.tenkanSen,
      });
    }

    // Parabolic SAR
    if (parabolicSAR.enabled) {
      overlays.push({
        type: 'sar',
        label: `SAR(${parabolicSAR.step}, ${parabolicSAR.max})`,
        color: INDICATOR_COLORS.supertrendUp,
      });
    }

    // EMA Ribbon
    if (emaRibbon.enabled) {
      overlays.push({
        type: 'emaRibbon',
        label: `EMA Ribbon`,
        color: INDICATOR_COLORS.emaRibbon[0],
      });
    }

    return overlays;
  }, [movingAverages, bollingerBands, vwap, supertrend, ichimoku, parabolicSAR, emaRibbon, crosshairData]);

  // Enabled oscillators (sub-panel indicators)
  const enabledOscillators = useMemo(() => {
    const oscillators: { type: string; label: string; color: string; value?: string }[] = [];

    // RSI
    if (showRSIPanel) {
      rsiConfigs
        .filter((rsi) => rsi.enabled)
        .forEach((rsi) => {
          const value = crosshairData?.values.rsi[rsi.id];
          oscillators.push({
            type: 'rsi',
            label: `RSI(${rsi.period})`,
            color: rsi.color,
            value: value !== undefined ? value.toFixed(2) : undefined,
          });
        });
    }

    // MACD
    if (macd.enabled) {
      const macdValue = crosshairData?.values.macd;
      oscillators.push({
        type: 'macd',
        label: `MACD(${macd.fastPeriod}, ${macd.slowPeriod}, ${macd.signalPeriod})`,
        color: INDICATOR_COLORS.macdLine,
        value: macdValue ? `${macdValue.macd.toFixed(2)} / ${macdValue.signal.toFixed(2)}` : undefined,
      });
    }

    // Stochastic
    if (stochastic.enabled) {
      const stochValue = crosshairData?.values.stochastic;
      oscillators.push({
        type: 'stochastic',
        label: `Stoch(${stochastic.kPeriod}, ${stochastic.dPeriod})`,
        color: INDICATOR_COLORS.stochasticK,
        value: stochValue ? `K: ${stochValue.k.toFixed(2)} D: ${stochValue.d.toFixed(2)}` : undefined,
      });
    }

    // ATR
    if (atr.enabled) {
      oscillators.push({
        type: 'atr',
        label: `ATR(${atr.period})`,
        color: INDICATOR_COLORS.atr,
        value: crosshairData?.values.atr !== undefined ? crosshairData.values.atr.toFixed(2) : undefined,
      });
    }

    // ADX
    if (adx.enabled) {
      const adxValue = crosshairData?.values.adx;
      oscillators.push({
        type: 'adx',
        label: `ADX(${adx.period})`,
        color: '#FFEB3B',
        value: adxValue ? adxValue.adx.toFixed(2) : undefined,
      });
    }

    // OBV
    if (obv.enabled) {
      oscillators.push({
        type: 'obv',
        label: 'OBV',
        color: '#4CAF50',
        value: crosshairData?.values.obv !== undefined ? formatVolume(crosshairData.values.obv) : undefined,
      });
    }

    return oscillators;
  }, [showRSIPanel, rsiConfigs, macd, stochastic, atr, adx, obv, crosshairData]);

  const hasIndicators = enabledOverlays.length > 0 || enabledOscillators.length > 0;

  return (
    <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 pointer-events-none">
      {/* Symbol + Interval Selector */}
      <div className="flex flex-col gap-1.5 pointer-events-auto">
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

      {/* Active Indicators Legend */}
      {hasIndicators && (
        <div className="flex flex-col gap-0.5 text-xs font-mono pointer-events-auto">
          {/* Overlay Indicators */}
          {enabledOverlays.map((indicator, idx) => (
            <IndicatorRow
              key={`overlay-${indicator.type}-${idx}`}
              label={indicator.label}
              color={indicator.color}
              value={indicator.value}
            />
          ))}

          {/* Oscillators */}
          {enabledOscillators.map((indicator, idx) => (
            <IndicatorRow
              key={`osc-${indicator.type}-${idx}`}
              label={indicator.label}
              color={indicator.color}
              value={indicator.value}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Individual indicator row
interface IndicatorRowProps {
  label: string;
  color: string;
  value?: string;
}

function IndicatorRow({ label, color, value }: IndicatorRowProps) {
  return (
    <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded px-2 py-0.5">
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-muted-foreground">{label}</span>
      {value && (
        <span className="text-foreground ml-auto" style={{ color }}>
          {value}
        </span>
      )}
    </div>
  );
}

// Utility functions
function formatNumber(num: number): string {
  if (num >= 1000) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  return num.toFixed(2);
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
