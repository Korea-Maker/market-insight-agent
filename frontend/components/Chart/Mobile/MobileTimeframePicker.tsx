/**
 * MobileTimeframePicker
 * Touch-friendly interval selector with horizontal scroll
 */

'use client';

import { memo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MobileTimeframePickerProps, MOBILE_INTERVALS, TOUCH_TARGET_SIZES } from './types';

export const MobileTimeframePicker = memo(function MobileTimeframePicker({
  current,
  onChange,
  compact = false,
}: MobileTimeframePickerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeButtonRef = useRef<HTMLButtonElement>(null);

  // Scroll active button into view on mount and when current changes
  useEffect(() => {
    if (activeButtonRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const button = activeButtonRef.current;

      const containerRect = container.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();

      // Check if button is not fully visible
      if (buttonRect.left < containerRect.left || buttonRect.right > containerRect.right) {
        button.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [current]);

  return (
    <div
      className={cn(
        "bg-background/95 backdrop-blur-sm border-t border-border/50",
        compact ? "py-1.5" : "py-2"
      )}
      style={{ minHeight: TOUCH_TARGET_SIZES.minimum }}
    >
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-1 px-2 overflow-x-auto scrollbar-none"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
        role="tablist"
        aria-label="Chart timeframe"
      >
        {MOBILE_INTERVALS.map(({ label, value }) => {
          const isActive = current === value;

          return (
            <button
              key={value}
              ref={isActive ? activeButtonRef : null}
              onClick={() => onChange(value)}
              className={cn(
                "flex items-center justify-center",
                "px-3 rounded-full font-medium text-sm whitespace-nowrap",
                "transition-all duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                "active:scale-95",
                compact ? "h-7 min-w-[36px]" : "h-8 min-w-[40px]",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              style={{ scrollSnapAlign: 'center' }}
              role="tab"
              aria-selected={isActive}
              aria-controls="chart-panel"
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default MobileTimeframePicker;
