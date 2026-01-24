"use client";

import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChartStore, TimeInterval } from '@/store/useChartStore';
import { INDICATOR_COLORS } from '@/lib/indicators';
import { IndicatorEditModal, EditableIndicatorType } from './IndicatorEditModal';

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
  // Edit modal state
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    type: EditableIndicatorType;
    id?: string;
    config: Record<string, unknown>;
  }>({ isOpen: false, type: 'ma', config: {} });

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
  const lastIndicatorValues = useChartStore((s) => s.lastIndicatorValues);

  // Store actions
  const updateMovingAverage = useChartStore((s) => s.updateMovingAverage);
  const removeMovingAverage = useChartStore((s) => s.removeMovingAverage);
  const updateRSI = useChartStore((s) => s.updateRSI);
  const removeRSI = useChartStore((s) => s.removeRSI);
  const updateMACD = useChartStore((s) => s.updateMACD);
  const updateBollingerBands = useChartStore((s) => s.updateBollingerBands);
  const updateStochastic = useChartStore((s) => s.updateStochastic);
  const updateATR = useChartStore((s) => s.updateATR);
  const updateADX = useChartStore((s) => s.updateADX);
  const updateVWAP = useChartStore((s) => s.updateVWAP);
  const updateSupertrend = useChartStore((s) => s.updateSupertrend);
  const updateParabolicSAR = useChartStore((s) => s.updateParabolicSAR);

  // Get display value: prefer crosshair data, fallback to last value
  const getDisplayValue = useCallback((
    crosshairValue: number | undefined,
    lastValue: number | undefined
  ): number | undefined => {
    return crosshairValue ?? lastValue;
  }, []);

  // Handle indicator edit
  const handleEdit = useCallback((type: EditableIndicatorType, id?: string, config?: object) => {
    setEditModal({
      isOpen: true,
      type,
      id,
      config: (config || {}) as Record<string, unknown>,
    });
  }, []);

  // Handle save from modal
  const handleSave = useCallback((config: Record<string, unknown>) => {
    const { type, id } = editModal;

    switch (type) {
      case 'ma':
        if (id) updateMovingAverage(id, config);
        break;
      case 'rsi':
        if (id) updateRSI(id, config);
        break;
      case 'macd':
        updateMACD(config);
        break;
      case 'bollingerBands':
        updateBollingerBands(config);
        break;
      case 'stochastic':
        updateStochastic(config);
        break;
      case 'atr':
        updateATR(config);
        break;
      case 'adx':
        updateADX(config);
        break;
      case 'vwap':
        updateVWAP(config);
        break;
      case 'supertrend':
        updateSupertrend(config);
        break;
      case 'parabolicSAR':
        updateParabolicSAR(config);
        break;
    }
  }, [editModal, updateMovingAverage, updateRSI, updateMACD, updateBollingerBands, updateStochastic, updateATR, updateADX, updateVWAP, updateSupertrend, updateParabolicSAR]);

  // Handle delete from modal
  const handleDelete = useCallback(() => {
    const { type, id } = editModal;
    if (type === 'ma' && id) {
      removeMovingAverage(id);
    } else if (type === 'rsi' && id) {
      removeRSI(id);
    }
  }, [editModal, removeMovingAverage, removeRSI]);

  // Enabled overlay indicators
  const enabledOverlays = useMemo(() => {
    const overlays: {
      type: EditableIndicatorType;
      id?: string;
      label: string;
      color: string;
      value?: string;
      config: object;
    }[] = [];

    // Moving Averages
    movingAverages
      .filter((ma) => ma.enabled)
      .forEach((ma) => {
        const crosshairValue = crosshairData?.values.ma[ma.id];
        const lastValue = lastIndicatorValues.ma[ma.id];
        const displayValue = getDisplayValue(crosshairValue, lastValue);
        overlays.push({
          type: 'ma',
          id: ma.id,
          label: `${ma.type.toUpperCase()} ${ma.period}`,
          color: ma.color,
          value: displayValue !== undefined ? formatNumber(displayValue) : '--',
          config: ma,
        });
      });

    // Bollinger Bands
    if (bollingerBands.enabled) {
      const bb = crosshairData?.values.bollingerBands ?? lastIndicatorValues.bollingerBands;
      overlays.push({
        type: 'bollingerBands',
        label: `BB(${bollingerBands.period}, ${bollingerBands.stdDev})`,
        color: INDICATOR_COLORS.bollingerMiddle,
        value: bb ? `${formatNumber(bb.upper)} / ${formatNumber(bb.lower)}` : '--',
        config: bollingerBands,
      });
    }

    // VWAP
    if (vwap.enabled) {
      const vwapValue = getDisplayValue(crosshairData?.values.vwap, lastIndicatorValues.vwap);
      overlays.push({
        type: 'vwap',
        label: 'VWAP',
        color: INDICATOR_COLORS.vwap,
        value: vwapValue !== undefined ? formatNumber(vwapValue) : '--',
        config: vwap,
      });
    }

    // Supertrend
    if (supertrend.enabled) {
      const stValue = getDisplayValue(crosshairData?.values.supertrend, lastIndicatorValues.supertrend);
      overlays.push({
        type: 'supertrend',
        label: `ST(${supertrend.period}, ${supertrend.multiplier})`,
        color: INDICATOR_COLORS.supertrendUp,
        value: stValue !== undefined ? formatNumber(stValue) : '--',
        config: supertrend,
      });
    }

    // Ichimoku
    if (ichimoku.enabled) {
      overlays.push({
        type: 'ichimoku',
        label: 'Ichimoku',
        color: INDICATOR_COLORS.ichimoku.tenkanSen,
        config: ichimoku,
      });
    }

    // Parabolic SAR
    if (parabolicSAR.enabled) {
      overlays.push({
        type: 'parabolicSAR',
        label: `SAR(${parabolicSAR.step}, ${parabolicSAR.max})`,
        color: INDICATOR_COLORS.supertrendUp,
        config: parabolicSAR,
      });
    }

    // EMA Ribbon
    if (emaRibbon.enabled) {
      overlays.push({
        type: 'emaRibbon',
        label: `EMA Ribbon`,
        color: INDICATOR_COLORS.emaRibbon[0],
        config: emaRibbon,
      });
    }

    return overlays;
  }, [movingAverages, bollingerBands, vwap, supertrend, ichimoku, parabolicSAR, emaRibbon, crosshairData, lastIndicatorValues, getDisplayValue]);

  // Enabled oscillators (sub-panel indicators)
  const enabledOscillators = useMemo(() => {
    const oscillators: {
      type: EditableIndicatorType;
      id?: string;
      label: string;
      color: string;
      value?: string;
      config: object;
    }[] = [];

    // RSI
    if (showRSIPanel) {
      rsiConfigs
        .filter((rsi) => rsi.enabled)
        .forEach((rsi) => {
          const crosshairValue = crosshairData?.values.rsi[rsi.id];
          const lastValue = lastIndicatorValues.rsi[rsi.id];
          const displayValue = getDisplayValue(crosshairValue, lastValue);
          oscillators.push({
            type: 'rsi',
            id: rsi.id,
            label: `RSI(${rsi.period})`,
            color: rsi.color,
            value: displayValue !== undefined ? displayValue.toFixed(2) : '--',
            config: rsi,
          });
        });
    }

    // MACD
    if (macd.enabled) {
      const macdValue = crosshairData?.values.macd ?? lastIndicatorValues.macd;
      oscillators.push({
        type: 'macd',
        label: `MACD(${macd.fastPeriod}, ${macd.slowPeriod}, ${macd.signalPeriod})`,
        color: INDICATOR_COLORS.macdLine,
        value: macdValue ? `${macdValue.macd.toFixed(2)} / ${macdValue.signal.toFixed(2)}` : '--',
        config: macd,
      });
    }

    // Stochastic
    if (stochastic.enabled) {
      const stochValue = crosshairData?.values.stochastic ?? lastIndicatorValues.stochastic;
      oscillators.push({
        type: 'stochastic',
        label: `Stoch(${stochastic.kPeriod}, ${stochastic.dPeriod})`,
        color: INDICATOR_COLORS.stochasticK,
        value: stochValue ? `K: ${stochValue.k.toFixed(2)} D: ${stochValue.d.toFixed(2)}` : '--',
        config: stochastic,
      });
    }

    // ATR
    if (atr.enabled) {
      const atrValue = getDisplayValue(crosshairData?.values.atr, lastIndicatorValues.atr);
      oscillators.push({
        type: 'atr',
        label: `ATR(${atr.period})`,
        color: INDICATOR_COLORS.atr,
        value: atrValue !== undefined ? atrValue.toFixed(2) : '--',
        config: atr,
      });
    }

    // ADX
    if (adx.enabled) {
      const adxValue = crosshairData?.values.adx ?? lastIndicatorValues.adx;
      oscillators.push({
        type: 'adx',
        label: `ADX(${adx.period})`,
        color: '#FFEB3B',
        value: adxValue ? adxValue.adx.toFixed(2) : '--',
        config: adx,
      });
    }

    // OBV
    if (obv.enabled) {
      const obvValue = getDisplayValue(crosshairData?.values.obv, lastIndicatorValues.obv);
      oscillators.push({
        type: 'obv',
        label: 'OBV',
        color: '#4CAF50',
        value: obvValue !== undefined ? formatVolume(obvValue) : '--',
        config: {},
      });
    }

    return oscillators;
  }, [showRSIPanel, rsiConfigs, macd, stochastic, atr, adx, obv, crosshairData, lastIndicatorValues, getDisplayValue]);

  const hasIndicators = enabledOverlays.length > 0 || enabledOscillators.length > 0;

  return (
    <>
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 pointer-events-none max-h-[calc(100%-120px)] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
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
                key={`overlay-${indicator.type}-${indicator.id || idx}`}
                label={indicator.label}
                color={indicator.color}
                value={indicator.value}
                onDoubleClick={() => handleEdit(indicator.type, indicator.id, indicator.config)}
              />
            ))}

            {/* Oscillators */}
            {enabledOscillators.map((indicator, idx) => (
              <IndicatorRow
                key={`osc-${indicator.type}-${indicator.id || idx}`}
                label={indicator.label}
                color={indicator.color}
                value={indicator.value}
                onDoubleClick={() => handleEdit(indicator.type, indicator.id, indicator.config)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <IndicatorEditModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal((prev) => ({ ...prev, isOpen: false }))}
        indicatorType={editModal.type}
        indicatorId={editModal.id}
        currentConfig={editModal.config}
        onSave={handleSave}
        onDelete={editModal.type === 'ma' || editModal.type === 'rsi' ? handleDelete : undefined}
      />
    </>
  );
}

// Individual indicator row with hover and double-click support
interface IndicatorRowProps {
  label: string;
  color: string;
  value?: string;
  onDoubleClick?: () => void;
}

function IndicatorRow({ label, color, value, onDoubleClick }: IndicatorRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded px-2 py-0.5",
        "cursor-pointer transition-all duration-150",
        "hover:bg-muted/60 hover:scale-[1.02]",
        "active:scale-[0.98]"
      )}
      onDoubleClick={onDoubleClick}
    >
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
