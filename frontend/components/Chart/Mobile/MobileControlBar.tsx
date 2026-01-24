/**
 * MobileControlBar
 * Bottom action bar with quick access to chart functions
 */

'use client';

import { memo } from 'react';
import {
  Activity,
  RefreshCw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileControlBarProps, TOUCH_TARGET_SIZES } from './types';

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

function ControlButton({
  icon,
  label,
  onClick,
  active = false,
  loading = false,
  disabled = false,
}: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5",
        "px-3 py-1.5 rounded-xl",
        "transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "active:scale-95",
        disabled && "opacity-50 cursor-not-allowed",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
      style={{ minWidth: TOUCH_TARGET_SIZES.large, minHeight: TOUCH_TARGET_SIZES.large }}
      aria-label={label}
      aria-pressed={active}
    >
      <span className={cn("transition-transform", loading && "animate-spin")}>
        {icon}
      </span>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export const MobileControlBar = memo(function MobileControlBar({
  onIndicatorsPress,
  onRefresh,
  onFullscreen,
  isFullscreen,
  isRefreshing = false,
}: MobileControlBarProps) {
  return (
    <nav
      className={cn(
        "flex items-center justify-around",
        "px-2 py-1.5",
        "bg-background/95 backdrop-blur-sm",
        "border-t border-border/50",
        "pb-[env(safe-area-inset-bottom)]"
      )}
      style={{ minHeight: TOUCH_TARGET_SIZES.large }}
      role="toolbar"
      aria-label="Chart controls"
    >
      {/* Indicators */}
      <ControlButton
        icon={<Activity className="h-5 w-5" />}
        label="Indicators"
        onClick={onIndicatorsPress}
      />

      {/* Refresh */}
      <ControlButton
        icon={<RefreshCw className="h-5 w-5" />}
        label="Refresh"
        onClick={onRefresh}
        loading={isRefreshing}
      />

      {/* Fullscreen */}
      <ControlButton
        icon={
          isFullscreen ? (
            <Minimize2 className="h-5 w-5" />
          ) : (
            <Maximize2 className="h-5 w-5" />
          )
        }
        label={isFullscreen ? "Exit" : "Fullscreen"}
        onClick={onFullscreen}
        active={isFullscreen}
      />
    </nav>
  );
});

export default MobileControlBar;
