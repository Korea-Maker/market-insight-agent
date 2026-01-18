"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  BarChart3,
  LineChart,
  Activity,
  Layers,
  Minus,
  PenLine,
} from 'lucide-react';
import { useChartStore, MovingAverageConfig, RSIConfig, DrawingToolType } from '@/store/useChartStore';
import { INDICATOR_COLORS } from '@/lib/indicators';

interface IndicatorSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'overlays' | 'oscillators' | 'drawing';

export function IndicatorSettingsPanel({ isOpen, onClose }: IndicatorSettingsPanelProps): React.ReactElement | null {
  const [activeTab, setActiveTab] = useState<SettingsTab>('overlays');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    ma: true,
    ichimoku: false,
    volume: true,
    bollingerBands: false,
    vwap: false,
    supertrend: false,
    emaRibbon: false,
    parabolicSAR: false,
    rsi: true,
    macd: false,
    stochastic: false,
    atr: false,
    adx: false,
    obv: false,
  });

  // Store
  const movingAverages = useChartStore((s) => s.movingAverages);
  const addMovingAverage = useChartStore((s) => s.addMovingAverage);
  const removeMovingAverage = useChartStore((s) => s.removeMovingAverage);
  const updateMovingAverage = useChartStore((s) => s.updateMovingAverage);
  const toggleMovingAverage = useChartStore((s) => s.toggleMovingAverage);

  const rsiConfigs = useChartStore((s) => s.rsiConfigs);
  const addRSI = useChartStore((s) => s.addRSI);
  const removeRSI = useChartStore((s) => s.removeRSI);
  const updateRSI = useChartStore((s) => s.updateRSI);
  const toggleRSI = useChartStore((s) => s.toggleRSI);

  const ichimoku = useChartStore((s) => s.ichimoku);
  const updateIchimoku = useChartStore((s) => s.updateIchimoku);
  const toggleIchimoku = useChartStore((s) => s.toggleIchimoku);

  const volume = useChartStore((s) => s.volume);
  const updateVolume = useChartStore((s) => s.updateVolume);
  const toggleVolume = useChartStore((s) => s.toggleVolume);

  const macd = useChartStore((s) => s.macd);
  const updateMACD = useChartStore((s) => s.updateMACD);
  const toggleMACD = useChartStore((s) => s.toggleMACD);

  // New indicators
  const bollingerBands = useChartStore((s) => s.bollingerBands);
  const updateBollingerBands = useChartStore((s) => s.updateBollingerBands);
  const toggleBollingerBands = useChartStore((s) => s.toggleBollingerBands);

  const vwap = useChartStore((s) => s.vwap);
  const updateVWAP = useChartStore((s) => s.updateVWAP);
  const toggleVWAP = useChartStore((s) => s.toggleVWAP);

  const supertrend = useChartStore((s) => s.supertrend);
  const updateSupertrend = useChartStore((s) => s.updateSupertrend);
  const toggleSupertrend = useChartStore((s) => s.toggleSupertrend);

  const emaRibbon = useChartStore((s) => s.emaRibbon);
  const toggleEMARibbon = useChartStore((s) => s.toggleEMARibbon);

  const parabolicSAR = useChartStore((s) => s.parabolicSAR);
  const updateParabolicSAR = useChartStore((s) => s.updateParabolicSAR);
  const toggleParabolicSAR = useChartStore((s) => s.toggleParabolicSAR);

  const stochastic = useChartStore((s) => s.stochastic);
  const updateStochastic = useChartStore((s) => s.updateStochastic);
  const toggleStochastic = useChartStore((s) => s.toggleStochastic);

  const atr = useChartStore((s) => s.atr);
  const updateATR = useChartStore((s) => s.updateATR);
  const toggleATR = useChartStore((s) => s.toggleATR);

  const adx = useChartStore((s) => s.adx);
  const updateADX = useChartStore((s) => s.updateADX);
  const toggleADX = useChartStore((s) => s.toggleADX);

  const obv = useChartStore((s) => s.obv);
  const toggleOBV = useChartStore((s) => s.toggleOBV);

  const activeDrawingTool = useChartStore((s) => s.activeDrawingTool);
  const setActiveDrawingTool = useChartStore((s) => s.setActiveDrawingTool);
  const drawings = useChartStore((s) => s.drawings);
  const clearAllDrawings = useChartStore((s) => s.clearAllDrawings);
  const drawingColor = useChartStore((s) => s.drawingColor);
  const setDrawingColor = useChartStore((s) => s.setDrawingColor);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-background/98 backdrop-blur-md border-l border-border shadow-xl z-30 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-sm font-semibold">Indicator Settings</h2>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('overlays')}
          className={cn(
            "flex-1 py-2.5 text-xs font-medium transition-colors",
            activeTab === 'overlays'
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Layers className="h-3.5 w-3.5 inline-block mr-1.5" />
          Overlays
        </button>
        <button
          onClick={() => setActiveTab('oscillators')}
          className={cn(
            "flex-1 py-2.5 text-xs font-medium transition-colors",
            activeTab === 'oscillators'
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Activity className="h-3.5 w-3.5 inline-block mr-1.5" />
          Oscillators
        </button>
        <button
          onClick={() => setActiveTab('drawing')}
          className={cn(
            "flex-1 py-2.5 text-xs font-medium transition-colors",
            activeTab === 'drawing'
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <PenLine className="h-3.5 w-3.5 inline-block mr-1.5" />
          Drawing
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'overlays' && (
          <>
            {/* Moving Averages Section */}
            <Section
              title="Moving Averages"
              icon={<TrendingUp className="h-4 w-4" />}
              expanded={expandedSections.ma}
              onToggle={() => toggleSection('ma')}
              badge={`${movingAverages.filter(m => m.enabled).length}/${movingAverages.length}`}
            >
              <div className="space-y-2">
                {movingAverages.map((ma, index) => (
                  <MAConfigRow
                    key={ma.id}
                    config={ma}
                    index={index}
                    onUpdate={(updates) => updateMovingAverage(ma.id, updates)}
                    onToggle={() => toggleMovingAverage(ma.id)}
                    onRemove={() => removeMovingAverage(ma.id)}
                  />
                ))}
                {movingAverages.length < 10 && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-7"
                      onClick={() => addMovingAverage('sma', 20)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> SMA
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-7"
                      onClick={() => addMovingAverage('ema', 20)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> EMA
                    </Button>
                  </div>
                )}
              </div>
            </Section>

            {/* Ichimoku Section */}
            <Section
              title="Ichimoku Cloud"
              icon={<Layers className="h-4 w-4" />}
              expanded={expandedSections.ichimoku}
              onToggle={() => toggleSection('ichimoku')}
              enabled={ichimoku.enabled}
              onEnableToggle={toggleIchimoku}
            >
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">Tenkan</label>
                    <Input
                      type="number"
                      value={ichimoku.tenkanPeriod}
                      onChange={(e) => updateIchimoku({ tenkanPeriod: parseInt(e.target.value) || 9 })}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">Kijun</label>
                    <Input
                      type="number"
                      value={ichimoku.kijunPeriod}
                      onChange={(e) => updateIchimoku({ kijunPeriod: parseInt(e.target.value) || 26 })}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">Senkou B</label>
                    <Input
                      type="number"
                      value={ichimoku.senkouBPeriod}
                      onChange={(e) => updateIchimoku({ senkouBPeriod: parseInt(e.target.value) || 52 })}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">Displacement</label>
                    <Input
                      type="number"
                      value={ichimoku.displacement}
                      onChange={(e) => updateIchimoku({ displacement: parseInt(e.target.value) || 26 })}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={ichimoku.showTenkan}
                      onCheckedChange={(checked) => updateIchimoku({ showTenkan: !!checked })}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-muted-foreground">Tenkan-sen</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={ichimoku.showKijun}
                      onCheckedChange={(checked) => updateIchimoku({ showKijun: !!checked })}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-muted-foreground">Kijun-sen</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={ichimoku.showSenkouA}
                      onCheckedChange={(checked) => updateIchimoku({ showSenkouA: !!checked })}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-muted-foreground">Senkou A</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={ichimoku.showSenkouB}
                      onCheckedChange={(checked) => updateIchimoku({ showSenkouB: !!checked })}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-muted-foreground">Senkou B</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={ichimoku.showChikou}
                      onCheckedChange={(checked) => updateIchimoku({ showChikou: !!checked })}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-muted-foreground">Chikou</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={ichimoku.showCloud}
                      onCheckedChange={(checked) => updateIchimoku({ showCloud: !!checked })}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-muted-foreground">Cloud</span>
                  </label>
                </div>
              </div>
            </Section>

            {/* Volume Section */}
            <Section
              title="Volume"
              icon={<BarChart3 className="h-4 w-4" />}
              expanded={expandedSections.volume}
              onToggle={() => toggleSection('volume')}
              enabled={volume.enabled}
              onEnableToggle={toggleVolume}
            >
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={volume.showMA}
                    onCheckedChange={(checked) => updateVolume({ showMA: !!checked })}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs text-muted-foreground">Show Volume MA</span>
                </label>
                {volume.showMA && (
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">MA Period</label>
                    <Input
                      type="number"
                      value={volume.maPeriod}
                      onChange={(e) => updateVolume({ maPeriod: parseInt(e.target.value) || 20 })}
                      className="h-7 text-xs"
                    />
                  </div>
                )}
              </div>
            </Section>

            {/* Bollinger Bands Section */}
            <Section
              title="Bollinger Bands"
              icon={<TrendingUp className="h-4 w-4" />}
              expanded={expandedSections.bollingerBands}
              onToggle={() => toggleSection('bollingerBands')}
              enabled={bollingerBands.enabled}
              onEnableToggle={toggleBollingerBands}
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase">Period</label>
                  <Input
                    type="number"
                    value={bollingerBands.period}
                    onChange={(e) => updateBollingerBands({ period: parseInt(e.target.value) || 20 })}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase">Std Dev</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={bollingerBands.stdDev}
                    onChange={(e) => updateBollingerBands({ stdDev: parseFloat(e.target.value) || 2 })}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </Section>

            {/* VWAP Section */}
            <Section
              title="VWAP"
              icon={<LineChart className="h-4 w-4" />}
              expanded={expandedSections.vwap}
              onToggle={() => toggleSection('vwap')}
              enabled={vwap.enabled}
              onEnableToggle={toggleVWAP}
            >
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={vwap.showBands}
                    onCheckedChange={(checked) => updateVWAP({ showBands: !!checked })}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs text-muted-foreground">Show Bands</span>
                </label>
                {vwap.showBands && (
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">Std Dev Multiplier</label>
                    <Input
                      type="number"
                      step="0.5"
                      value={vwap.stdDevMultiplier}
                      onChange={(e) => updateVWAP({ stdDevMultiplier: parseFloat(e.target.value) || 2 })}
                      className="h-7 text-xs"
                    />
                  </div>
                )}
              </div>
            </Section>

            {/* Supertrend Section */}
            <Section
              title="Supertrend"
              icon={<TrendingUp className="h-4 w-4" />}
              expanded={expandedSections.supertrend}
              onToggle={() => toggleSection('supertrend')}
              enabled={supertrend.enabled}
              onEnableToggle={toggleSupertrend}
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase">ATR Period</label>
                  <Input
                    type="number"
                    value={supertrend.period}
                    onChange={(e) => updateSupertrend({ period: parseInt(e.target.value) || 10 })}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase">Multiplier</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={supertrend.multiplier}
                    onChange={(e) => updateSupertrend({ multiplier: parseFloat(e.target.value) || 3 })}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </Section>

            {/* Parabolic SAR Section */}
            <Section
              title="Parabolic SAR"
              icon={<Activity className="h-4 w-4" />}
              expanded={expandedSections.parabolicSAR}
              onToggle={() => toggleSection('parabolicSAR')}
              enabled={parabolicSAR.enabled}
              onEnableToggle={toggleParabolicSAR}
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase">Step</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={parabolicSAR.step}
                    onChange={(e) => updateParabolicSAR({ step: parseFloat(e.target.value) || 0.02 })}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase">Max</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={parabolicSAR.max}
                    onChange={(e) => updateParabolicSAR({ max: parseFloat(e.target.value) || 0.2 })}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </Section>

            {/* EMA Ribbon Section */}
            <Section
              title="EMA Ribbon"
              icon={<Layers className="h-4 w-4" />}
              expanded={expandedSections.emaRibbon}
              onToggle={() => toggleSection('emaRibbon')}
              enabled={emaRibbon.enabled}
              onEnableToggle={toggleEMARibbon}
            >
              <div className="text-xs text-muted-foreground">
                Periods: {emaRibbon.periods.join(', ')}
              </div>
            </Section>
          </>
        )}

        {activeTab === 'oscillators' && (
          <>
            {/* RSI Section */}
            <Section
              title="RSI"
              icon={<LineChart className="h-4 w-4" />}
              expanded={expandedSections.rsi}
              onToggle={() => toggleSection('rsi')}
              badge={`${rsiConfigs.filter(r => r.enabled).length}/${rsiConfigs.length}`}
            >
              <div className="space-y-2">
                {rsiConfigs.map((rsi, index) => (
                  <RSIConfigRow
                    key={rsi.id}
                    config={rsi}
                    index={index}
                    onUpdate={(updates) => updateRSI(rsi.id, updates)}
                    onToggle={() => toggleRSI(rsi.id)}
                    onRemove={() => removeRSI(rsi.id)}
                  />
                ))}
                {rsiConfigs.length < 5 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-7"
                    onClick={() => addRSI(14)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add RSI
                  </Button>
                )}
              </div>
            </Section>

            {/* MACD Section */}
            <Section
              title="MACD"
              icon={<Activity className="h-4 w-4" />}
              expanded={expandedSections.macd}
              onToggle={() => toggleSection('macd')}
              enabled={macd.enabled}
              onEnableToggle={toggleMACD}
            >
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase">Fast</label>
                  <Input
                    type="number"
                    value={macd.fastPeriod}
                    onChange={(e) => updateMACD({ fastPeriod: parseInt(e.target.value) || 12 })}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase">Slow</label>
                  <Input
                    type="number"
                    value={macd.slowPeriod}
                    onChange={(e) => updateMACD({ slowPeriod: parseInt(e.target.value) || 26 })}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase">Signal</label>
                  <Input
                    type="number"
                    value={macd.signalPeriod}
                    onChange={(e) => updateMACD({ signalPeriod: parseInt(e.target.value) || 9 })}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </Section>

            {/* Stochastic Section */}
            <Section
              title="Stochastic"
              icon={<Activity className="h-4 w-4" />}
              expanded={expandedSections.stochastic}
              onToggle={() => toggleSection('stochastic')}
              enabled={stochastic.enabled}
              onEnableToggle={toggleStochastic}
            >
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">%K</label>
                    <Input
                      type="number"
                      value={stochastic.kPeriod}
                      onChange={(e) => updateStochastic({ kPeriod: parseInt(e.target.value) || 14 })}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">%D</label>
                    <Input
                      type="number"
                      value={stochastic.dPeriod}
                      onChange={(e) => updateStochastic({ dPeriod: parseInt(e.target.value) || 3 })}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">Smooth</label>
                    <Input
                      type="number"
                      value={stochastic.smooth}
                      onChange={(e) => updateStochastic({ smooth: parseInt(e.target.value) || 3 })}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">Overbought</label>
                    <Input
                      type="number"
                      value={stochastic.overbought}
                      onChange={(e) => updateStochastic({ overbought: parseInt(e.target.value) || 80 })}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase">Oversold</label>
                    <Input
                      type="number"
                      value={stochastic.oversold}
                      onChange={(e) => updateStochastic({ oversold: parseInt(e.target.value) || 20 })}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* ATR Section */}
            <Section
              title="ATR"
              icon={<BarChart3 className="h-4 w-4" />}
              expanded={expandedSections.atr}
              onToggle={() => toggleSection('atr')}
              enabled={atr.enabled}
              onEnableToggle={toggleATR}
            >
              <div>
                <label className="text-[10px] text-muted-foreground uppercase">Period</label>
                <Input
                  type="number"
                  value={atr.period}
                  onChange={(e) => updateATR({ period: parseInt(e.target.value) || 14 })}
                  className="h-7 text-xs"
                />
              </div>
            </Section>

            {/* ADX Section */}
            <Section
              title="ADX"
              icon={<TrendingUp className="h-4 w-4" />}
              expanded={expandedSections.adx}
              onToggle={() => toggleSection('adx')}
              enabled={adx.enabled}
              onEnableToggle={toggleADX}
            >
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase">Period</label>
                  <Input
                    type="number"
                    value={adx.period}
                    onChange={(e) => updateADX({ period: parseInt(e.target.value) || 14 })}
                    className="h-7 text-xs"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={adx.showDI}
                    onCheckedChange={(checked) => updateADX({ showDI: !!checked })}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs text-muted-foreground">Show +DI / -DI</span>
                </label>
              </div>
            </Section>

            {/* OBV Section */}
            <Section
              title="OBV"
              icon={<BarChart3 className="h-4 w-4" />}
              expanded={expandedSections.obv}
              onToggle={() => toggleSection('obv')}
              enabled={obv.enabled}
              onEnableToggle={toggleOBV}
            >
              <div className="text-xs text-muted-foreground">
                On-Balance Volume accumulates volume based on price direction.
              </div>
            </Section>
          </>
        )}

        {activeTab === 'drawing' && (
          <>
            {/* Drawing Tools */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tools</div>
              <div className="grid grid-cols-2 gap-2">
                <DrawingToolButton
                  icon={<Minus className="h-4 w-4" />}
                  label="Horizontal Line"
                  active={activeDrawingTool === 'horizontalLine'}
                  onClick={() => setActiveDrawingTool(activeDrawingTool === 'horizontalLine' ? null : 'horizontalLine')}
                />
                <DrawingToolButton
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="Trend Line"
                  active={activeDrawingTool === 'trendLine'}
                  onClick={() => setActiveDrawingTool(activeDrawingTool === 'trendLine' ? null : 'trendLine')}
                />
              </div>

              {/* Color Picker */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Line Color</div>
                <div className="flex gap-1.5 flex-wrap">
                  {['#FFD700', '#00BFFF', '#FF6384', '#4CAF50', '#9C27B0', '#FF5722', '#607D8B', '#E91E63'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setDrawingColor(color)}
                      className={cn(
                        "h-6 w-6 rounded-full border-2 transition-transform",
                        drawingColor === color ? "border-white scale-110" : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Drawings List */}
              {drawings.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Drawings ({drawings.length})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-destructive hover:text-destructive"
                      onClick={clearAllDrawings}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Section component
interface SectionProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  enabled?: boolean;
  onEnableToggle?: () => void;
  badge?: string;
}

function Section({ title, icon, expanded, onToggle, children, enabled, onEnableToggle, badge }: SectionProps) {
  return (
    <div className="bg-muted/30 rounded-lg border border-border/50">
      <div
        className="flex items-center gap-2 p-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs font-medium flex-1">{title}</span>
        {badge && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
        {onEnableToggle && (
          <Checkbox
            checked={enabled}
            onCheckedChange={() => onEnableToggle()}
            onClick={(e) => e.stopPropagation()}
            className="h-3.5 w-3.5"
          />
        )}
      </div>
      {expanded && <div className="p-2.5 pt-0 border-t border-border/30">{children}</div>}
    </div>
  );
}

// MA Config Row
interface MAConfigRowProps {
  config: MovingAverageConfig;
  index: number;
  onUpdate: (updates: Partial<MovingAverageConfig>) => void;
  onToggle: () => void;
  onRemove: () => void;
}

function MAConfigRow({ config, onUpdate, onToggle, onRemove }: MAConfigRowProps) {
  return (
    <div className="flex items-center gap-2 p-1.5 bg-background/50 rounded-md">
      <Checkbox checked={config.enabled} onCheckedChange={onToggle} className="h-3.5 w-3.5" />
      <input
        type="color"
        value={config.color}
        onChange={(e) => onUpdate({ color: e.target.value })}
        className="h-5 w-5 rounded cursor-pointer border-0"
      />
      <span className="text-[10px] font-mono text-muted-foreground uppercase w-7">{config.type}</span>
      <Input
        type="number"
        value={config.period}
        onChange={(e) => onUpdate({ period: parseInt(e.target.value) || 1 })}
        className="h-6 w-14 text-xs text-center"
        min={1}
        max={500}
      />
      <Button variant="ghost" size="icon-sm" className="h-6 w-6 ml-auto" onClick={onRemove}>
        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
      </Button>
    </div>
  );
}

// RSI Config Row
interface RSIConfigRowProps {
  config: RSIConfig;
  index: number;
  onUpdate: (updates: Partial<RSIConfig>) => void;
  onToggle: () => void;
  onRemove: () => void;
}

function RSIConfigRow({ config, onUpdate, onToggle, onRemove }: RSIConfigRowProps) {
  return (
    <div className="p-2 bg-background/50 rounded-md space-y-2">
      <div className="flex items-center gap-2">
        <Checkbox checked={config.enabled} onCheckedChange={onToggle} className="h-3.5 w-3.5" />
        <input
          type="color"
          value={config.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="h-5 w-5 rounded cursor-pointer border-0"
        />
        <span className="text-xs text-muted-foreground">Period</span>
        <Input
          type="number"
          value={config.period}
          onChange={(e) => onUpdate({ period: parseInt(e.target.value) || 14 })}
          className="h-6 w-14 text-xs text-center"
          min={1}
          max={100}
        />
        <Button variant="ghost" size="icon-sm" className="h-6 w-6 ml-auto" onClick={onRemove}>
          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <span className="text-muted-foreground">OB</span>
        <Input
          type="number"
          value={config.overbought}
          onChange={(e) => onUpdate({ overbought: parseInt(e.target.value) || 70 })}
          className="h-5 w-10 text-[10px] text-center"
          min={50}
          max={100}
        />
        <span className="text-muted-foreground">OS</span>
        <Input
          type="number"
          value={config.oversold}
          onChange={(e) => onUpdate({ oversold: parseInt(e.target.value) || 30 })}
          className="h-5 w-10 text-[10px] text-center"
          min={0}
          max={50}
        />
      </div>
    </div>
  );
}

// Drawing Tool Button
interface DrawingToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function DrawingToolButton({ icon, label, active, onClick }: DrawingToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all",
        active
          ? "bg-primary/10 border-primary text-primary"
          : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      {icon}
      <span className="text-[10px]">{label}</span>
    </button>
  );
}
