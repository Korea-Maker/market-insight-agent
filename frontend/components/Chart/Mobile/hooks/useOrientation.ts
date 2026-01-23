/**
 * useOrientation Hook
 * Screen orientation detection and lock management
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScreenOrientation } from '../types';

interface OrientationState {
  orientation: ScreenOrientation;
  angle: number;
  isLocked: boolean;
}

const getOrientation = (): ScreenOrientation => {
  if (typeof window === 'undefined') return 'portrait';

  // Check screen.orientation API first
  if (window.screen?.orientation) {
    const type = window.screen.orientation.type;
    if (type.includes('landscape')) return 'landscape';
    return 'portrait';
  }

  // Fallback to window dimensions
  return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
};

const getOrientationAngle = (): number => {
  if (typeof window === 'undefined') return 0;

  if (window.screen?.orientation) {
    return window.screen.orientation.angle;
  }

  // Legacy fallback
  return window.orientation as number || 0;
};

export function useOrientation() {
  const [state, setState] = useState<OrientationState>({
    orientation: 'portrait',
    angle: 0,
    isLocked: false,
  });

  const updateOrientation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      orientation: getOrientation(),
      angle: getOrientationAngle(),
    }));
  }, []);

  // Lock orientation (where supported)
  const lockOrientation = useCallback(async (lockTo: ScreenOrientation | 'any') => {
    if (typeof window === 'undefined' || !window.screen?.orientation) {
      return false;
    }

    try {
      // Map our orientation type to ScreenOrientation API types
      const lockType: OrientationLockType =
        lockTo === 'any' ? 'any' :
        lockTo === 'portrait' ? 'portrait' : 'landscape';

      await window.screen.orientation.lock(lockType);
      setState((prev) => ({ ...prev, isLocked: true }));
      return true;
    } catch {
      // Orientation lock not supported or denied
      return false;
    }
  }, []);

  // Unlock orientation
  const unlockOrientation = useCallback(() => {
    if (typeof window === 'undefined' || !window.screen?.orientation) {
      return;
    }

    try {
      window.screen.orientation.unlock();
      setState((prev) => ({ ...prev, isLocked: false }));
    } catch {
      // Ignore errors
    }
  }, []);

  useEffect(() => {
    // Initial update
    updateOrientation();

    // Listen for orientation changes
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', updateOrientation);
    }

    // Legacy event for older browsers
    window.addEventListener('orientationchange', updateOrientation);
    window.addEventListener('resize', updateOrientation);

    return () => {
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', updateOrientation);
      }
      window.removeEventListener('orientationchange', updateOrientation);
      window.removeEventListener('resize', updateOrientation);
    };
  }, [updateOrientation]);

  return {
    ...state,
    isPortrait: state.orientation === 'portrait',
    isLandscape: state.orientation === 'landscape',
    lockOrientation,
    unlockOrientation,
  };
}

// Hook for forcing landscape mode in fullscreen
export function useLandscapeFullscreen() {
  const { lockOrientation, unlockOrientation, isLandscape } = useOrientation();
  const [isFullscreenLandscape, setIsFullscreenLandscape] = useState(false);

  const enterLandscapeFullscreen = useCallback(async (element?: HTMLElement) => {
    const target = element || document.documentElement;

    try {
      // Request fullscreen
      if (target.requestFullscreen) {
        await target.requestFullscreen();
      }

      // Try to lock to landscape
      await lockOrientation('landscape');
      setIsFullscreenLandscape(true);
    } catch {
      // Fullscreen or orientation lock not supported
    }
  }, [lockOrientation]);

  const exitLandscapeFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen();
      }

      unlockOrientation();
      setIsFullscreenLandscape(false);
    } catch {
      // Ignore errors
    }
  }, [unlockOrientation]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreenLandscape) {
        unlockOrientation();
        setIsFullscreenLandscape(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreenLandscape, unlockOrientation]);

  return {
    isLandscape,
    isFullscreenLandscape,
    enterLandscapeFullscreen,
    exitLandscapeFullscreen,
  };
}

export default useOrientation;
