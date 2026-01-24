"use client";

import { useState, useEffect, useCallback } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type EditableIndicatorType =
  | 'ma'
  | 'rsi'
  | 'macd'
  | 'bollingerBands'
  | 'stochastic'
  | 'atr'
  | 'adx'
  | 'vwap'
  | 'supertrend'
  | 'ichimoku'
  | 'parabolicSAR'
  | 'emaRibbon'
  | 'obv';

interface IndicatorEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicatorType: EditableIndicatorType;
  indicatorId?: string;
  currentConfig: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  onDelete?: () => void;
}

const INDICATOR_LABELS: Record<EditableIndicatorType, string> = {
  ma: 'Moving Average',
  rsi: 'RSI',
  macd: 'MACD',
  bollingerBands: 'Bollinger Bands',
  stochastic: 'Stochastic',
  atr: 'ATR',
  adx: 'ADX',
  vwap: 'VWAP',
  supertrend: 'Supertrend',
  ichimoku: 'Ichimoku Cloud',
  parabolicSAR: 'Parabolic SAR',
  emaRibbon: 'EMA Ribbon',
  obv: 'On-Balance Volume',
};

const COLOR_PRESETS = [
  '#2962FF', '#00C853', '#FF6D00', '#D500F9', '#00B8D4',
  '#FFD600', '#FF1744', '#00E676', '#651FFF', '#F50057',
];

export function IndicatorEditModal({
  isOpen,
  onClose,
  indicatorType,
  indicatorId,
  currentConfig,
  onSave,
  onDelete,
}: IndicatorEditModalProps): React.ReactElement | null {
  const [config, setConfig] = useState<Record<string, unknown>>(currentConfig);

  useEffect(() => {
    setConfig(currentConfig);
  }, [currentConfig]);

  const handleSave = useCallback(() => {
    onSave(config);
    onClose();
  }, [config, onSave, onClose]);

  const updateField = useCallback((key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  if (!isOpen) return null;

  const renderFields = () => {
    switch (indicatorType) {
      case 'ma':
        return (
          <>
            <FieldRow label="Type">
              <select
                value={config.type as string || 'sma'}
                onChange={(e) => updateField('type', e.target.value)}
                className="w-full px-3 py-2 bg-background border rounded-md text-sm"
              >
                <option value="sma">SMA</option>
                <option value="ema">EMA</option>
              </select>
            </FieldRow>
            <FieldRow label="Period">
              <Input
                type="number"
                value={config.period as number || 20}
                onChange={(e) => updateField('period', parseInt(e.target.value) || 20)}
                min={1}
                max={500}
              />
            </FieldRow>
            <FieldRow label="Line Width">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((w) => (
                  <Button
                    key={w}
                    variant={(config.lineWidth as number) === w ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateField('lineWidth', w)}
                    className="w-10"
                  >
                    {w}
                  </Button>
                ))}
              </div>
            </FieldRow>
            <FieldRow label="Color">
              <ColorPicker
                value={config.color as string}
                onChange={(c) => updateField('color', c)}
              />
            </FieldRow>
          </>
        );

      case 'rsi':
        return (
          <>
            <FieldRow label="Period">
              <Input
                type="number"
                value={config.period as number || 14}
                onChange={(e) => updateField('period', parseInt(e.target.value) || 14)}
                min={2}
                max={100}
              />
            </FieldRow>
            <FieldRow label="Overbought">
              <Input
                type="number"
                value={config.overbought as number || 70}
                onChange={(e) => updateField('overbought', parseInt(e.target.value) || 70)}
                min={50}
                max={100}
              />
            </FieldRow>
            <FieldRow label="Oversold">
              <Input
                type="number"
                value={config.oversold as number || 30}
                onChange={(e) => updateField('oversold', parseInt(e.target.value) || 30)}
                min={0}
                max={50}
              />
            </FieldRow>
            <FieldRow label="Color">
              <ColorPicker
                value={config.color as string}
                onChange={(c) => updateField('color', c)}
              />
            </FieldRow>
          </>
        );

      case 'macd':
        return (
          <>
            <FieldRow label="Fast Period">
              <Input
                type="number"
                value={config.fastPeriod as number || 12}
                onChange={(e) => updateField('fastPeriod', parseInt(e.target.value) || 12)}
                min={1}
                max={100}
              />
            </FieldRow>
            <FieldRow label="Slow Period">
              <Input
                type="number"
                value={config.slowPeriod as number || 26}
                onChange={(e) => updateField('slowPeriod', parseInt(e.target.value) || 26)}
                min={1}
                max={200}
              />
            </FieldRow>
            <FieldRow label="Signal Period">
              <Input
                type="number"
                value={config.signalPeriod as number || 9}
                onChange={(e) => updateField('signalPeriod', parseInt(e.target.value) || 9)}
                min={1}
                max={100}
              />
            </FieldRow>
          </>
        );

      case 'bollingerBands':
        return (
          <>
            <FieldRow label="Period">
              <Input
                type="number"
                value={config.period as number || 20}
                onChange={(e) => updateField('period', parseInt(e.target.value) || 20)}
                min={2}
                max={200}
              />
            </FieldRow>
            <FieldRow label="Std Dev">
              <Input
                type="number"
                value={config.stdDev as number || 2}
                onChange={(e) => updateField('stdDev', parseFloat(e.target.value) || 2)}
                min={0.5}
                max={5}
                step={0.5}
              />
            </FieldRow>
          </>
        );

      case 'stochastic':
        return (
          <>
            <FieldRow label="%K Period">
              <Input
                type="number"
                value={config.kPeriod as number || 14}
                onChange={(e) => updateField('kPeriod', parseInt(e.target.value) || 14)}
                min={1}
                max={100}
              />
            </FieldRow>
            <FieldRow label="%D Period">
              <Input
                type="number"
                value={config.dPeriod as number || 3}
                onChange={(e) => updateField('dPeriod', parseInt(e.target.value) || 3)}
                min={1}
                max={50}
              />
            </FieldRow>
            <FieldRow label="Smooth">
              <Input
                type="number"
                value={config.smooth as number || 3}
                onChange={(e) => updateField('smooth', parseInt(e.target.value) || 3)}
                min={1}
                max={20}
              />
            </FieldRow>
          </>
        );

      case 'atr':
        return (
          <FieldRow label="Period">
            <Input
              type="number"
              value={config.period as number || 14}
              onChange={(e) => updateField('period', parseInt(e.target.value) || 14)}
              min={1}
              max={100}
            />
          </FieldRow>
        );

      case 'adx':
        return (
          <>
            <FieldRow label="Period">
              <Input
                type="number"
                value={config.period as number || 14}
                onChange={(e) => updateField('period', parseInt(e.target.value) || 14)}
                min={1}
                max={100}
              />
            </FieldRow>
            <FieldRow label="Show DI">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showDI as boolean || false}
                  onChange={(e) => updateField('showDI', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Display +DI / -DI lines</span>
              </label>
            </FieldRow>
          </>
        );

      case 'vwap':
        return (
          <>
            <FieldRow label="Std Dev Multiplier">
              <Input
                type="number"
                value={config.stdDevMultiplier as number || 2}
                onChange={(e) => updateField('stdDevMultiplier', parseFloat(e.target.value) || 2)}
                min={0.5}
                max={5}
                step={0.5}
              />
            </FieldRow>
            <FieldRow label="Show Bands">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showBands as boolean || false}
                  onChange={(e) => updateField('showBands', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Display upper/lower bands</span>
              </label>
            </FieldRow>
          </>
        );

      case 'supertrend':
        return (
          <>
            <FieldRow label="Period">
              <Input
                type="number"
                value={config.period as number || 10}
                onChange={(e) => updateField('period', parseInt(e.target.value) || 10)}
                min={1}
                max={100}
              />
            </FieldRow>
            <FieldRow label="Multiplier">
              <Input
                type="number"
                value={config.multiplier as number || 3}
                onChange={(e) => updateField('multiplier', parseFloat(e.target.value) || 3)}
                min={0.5}
                max={10}
                step={0.5}
              />
            </FieldRow>
          </>
        );

      case 'parabolicSAR':
        return (
          <>
            <FieldRow label="Step">
              <Input
                type="number"
                value={config.step as number || 0.02}
                onChange={(e) => updateField('step', parseFloat(e.target.value) || 0.02)}
                min={0.001}
                max={0.5}
                step={0.001}
              />
            </FieldRow>
            <FieldRow label="Max">
              <Input
                type="number"
                value={config.max as number || 0.2}
                onChange={(e) => updateField('max', parseFloat(e.target.value) || 0.2)}
                min={0.01}
                max={1}
                step={0.01}
              />
            </FieldRow>
          </>
        );

      default:
        return <p className="text-sm text-muted-foreground">No configurable options</p>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-lg">
            Edit {INDICATOR_LABELS[indicatorType]}
            {indicatorId && <span className="text-muted-foreground ml-2 text-sm">#{indicatorId.slice(0, 6)}</span>}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {renderFields()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
          {onDelete ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FieldRowProps {
  label: string;
  children: React.ReactNode;
}

function FieldRow({ label, children }: FieldRowProps) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-sm text-muted-foreground w-32 flex-shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {COLOR_PRESETS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn(
            "w-6 h-6 rounded-full border-2 transition-transform",
            value === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
          )}
          style={{ backgroundColor: color }}
        />
      ))}
      <input
        type="color"
        value={value || '#2962FF'}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded-full cursor-pointer border-0"
        title="Custom color"
      />
    </div>
  );
}
