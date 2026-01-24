/**
 * MobileIndicatorSheet
 * Bottom sheet for indicator settings on mobile devices
 */

'use client';

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useChartStore } from '@/store/useChartStore';
import { MobileIndicatorSheetProps, SheetState, TOUCH_TARGET_SIZES } from './types';

// Snap points as percentages of viewport height
const SNAP_POINTS = {
  closed: 0,
  partial: 0.5,
  full: 0.9,
};

const DRAG_THRESHOLD = 50;

interface QuickToggleProps {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  color?: string;
}

function QuickToggle({ label, enabled, onToggle, color }: QuickToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        "transition-all duration-200",
        "border",
        enabled
          ? "bg-primary/10 border-primary/30 text-foreground"
          : "bg-muted/30 border-border/50 text-muted-foreground"
      )}
      style={{ minHeight: TOUCH_TARGET_SIZES.minimum }}
    >
      {color && (
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

interface IndicatorGroupProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function IndicatorGroup({ title, children, defaultExpanded = false }: IndicatorGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center justify-between w-full px-4 py-3",
          "bg-muted/30 hover:bg-muted/50 transition-colors"
        )}
      >
        <span className="text-sm font-semibold">{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-2 flex flex-wrap gap-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const MobileIndicatorSheet = memo(function MobileIndicatorSheet({
  isOpen,
  onClose,
}: MobileIndicatorSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>('partial');
  const sheetRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  // Store state
  const movingAverages = useChartStore((s) => s.movingAverages);
  const toggleMovingAverage = useChartStore((s) => s.toggleMovingAverage);
  const volume = useChartStore((s) => s.volume);
  const toggleVolume = useChartStore((s) => s.toggleVolume);
  const bollingerBands = useChartStore((s) => s.bollingerBands);
  const toggleBollingerBands = useChartStore((s) => s.toggleBollingerBands);
  const macd = useChartStore((s) => s.macd);
  const toggleMACD = useChartStore((s) => s.toggleMACD);
  const rsiConfigs = useChartStore((s) => s.rsiConfigs);
  const toggleRSI = useChartStore((s) => s.toggleRSI);
  const vwap = useChartStore((s) => s.vwap);
  const toggleVWAP = useChartStore((s) => s.toggleVWAP);
  const supertrend = useChartStore((s) => s.supertrend);
  const toggleSupertrend = useChartStore((s) => s.toggleSupertrend);

  // Calculate sheet height based on state
  const getSheetHeight = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    return window.innerHeight * SNAP_POINTS[sheetState];
  }, [sheetState]);

  // Handle drag end
  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    // Fast swipe down - close
    if (velocity > 500 || (offset > 100 && velocity > 0)) {
      onClose();
      return;
    }

    // Fast swipe up - expand to full
    if (velocity < -500) {
      setSheetState('full');
      return;
    }

    // Determine snap point based on position
    const currentY = offset;
    const threshold = window.innerHeight * 0.2;

    if (currentY > threshold) {
      // Dragged down past threshold
      if (sheetState === 'full') {
        setSheetState('partial');
      } else {
        onClose();
      }
    } else if (currentY < -threshold) {
      // Dragged up past threshold
      setSheetState('full');
    }
  }, [onClose, sheetState]);

  // Animate on state change
  useEffect(() => {
    if (isOpen) {
      controls.start({
        y: 0,
        transition: { type: 'spring', damping: 30, stiffness: 300 },
      });
    }
  }, [isOpen, sheetState, controls]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSheetState('partial');
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              "bg-background rounded-t-3xl shadow-2xl",
              "flex flex-col",
              "pb-[env(safe-area-inset-bottom)]"
            )}
            style={{
              height: `${SNAP_POINTS[sheetState] * 100}vh`,
              maxHeight: '90vh',
            }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
              <h2 className="text-lg font-semibold">Indicators</h2>
              <button
                onClick={onClose}
                className={cn(
                  "flex items-center justify-center",
                  "w-10 h-10 rounded-full",
                  "hover:bg-muted/50 transition-colors"
                )}
                aria-label="Close"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
              {/* Moving Averages */}
              <IndicatorGroup title="Moving Averages" defaultExpanded>
                {movingAverages.map((ma) => (
                  <QuickToggle
                    key={ma.id}
                    label={`${ma.type.toUpperCase()} ${ma.period}`}
                    enabled={ma.enabled}
                    onToggle={() => toggleMovingAverage(ma.id)}
                    color={ma.color}
                  />
                ))}
              </IndicatorGroup>

              {/* Overlay Indicators */}
              <IndicatorGroup title="Overlays">
                <QuickToggle
                  label="Bollinger Bands"
                  enabled={bollingerBands.enabled}
                  onToggle={toggleBollingerBands}
                />
                <QuickToggle
                  label="VWAP"
                  enabled={vwap.enabled}
                  onToggle={toggleVWAP}
                />
                <QuickToggle
                  label="Supertrend"
                  enabled={supertrend.enabled}
                  onToggle={toggleSupertrend}
                />
                <QuickToggle
                  label="Volume"
                  enabled={volume.enabled}
                  onToggle={toggleVolume}
                />
              </IndicatorGroup>

              {/* Oscillators */}
              <IndicatorGroup title="Oscillators">
                {rsiConfigs.map((rsi) => (
                  <QuickToggle
                    key={rsi.id}
                    label={`RSI ${rsi.period}`}
                    enabled={rsi.enabled}
                    onToggle={() => toggleRSI(rsi.id)}
                    color={rsi.color}
                  />
                ))}
                <QuickToggle
                  label="MACD"
                  enabled={macd.enabled}
                  onToggle={toggleMACD}
                />
              </IndicatorGroup>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default MobileIndicatorSheet;
