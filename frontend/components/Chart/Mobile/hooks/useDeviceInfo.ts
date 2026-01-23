/**
 * useDeviceInfo Hook
 * Detects device capabilities and viewport information
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { DeviceInfo, SafeAreaInsets, MOBILE_BREAKPOINTS } from '../types';

const getInitialDeviceInfo = (): DeviceInfo => ({
  isMobile: false,
  isTablet: false,
  isLandscape: false,
  hasNotch: false,
  supportsHaptic: false,
  viewportWidth: 0,
  viewportHeight: 0,
});

const getSafeAreaInsets = (): SafeAreaInsets => {
  if (typeof window === 'undefined' || typeof getComputedStyle === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const style = getComputedStyle(document.documentElement);

  return {
    top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0', 10),
    bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0', 10),
    left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0', 10),
    right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0', 10),
  };
};

export function useDeviceInfo() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getInitialDeviceInfo);
  const [safeArea, setSafeArea] = useState<SafeAreaInsets>({ top: 0, bottom: 0, left: 0, right: 0 });

  const updateDeviceInfo = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Check for notch/safe area support
    const hasNotch = CSS.supports('padding-top: env(safe-area-inset-top)');

    // Check haptic support
    const supportsHaptic = 'vibrate' in navigator;

    setDeviceInfo({
      isMobile: width < MOBILE_BREAKPOINTS.tablet,
      isTablet: width >= MOBILE_BREAKPOINTS.tablet && width < 1024,
      isLandscape: width > height,
      hasNotch,
      supportsHaptic,
      viewportWidth: width,
      viewportHeight: height,
    });

    setSafeArea(getSafeAreaInsets());
  }, []);

  useEffect(() => {
    // Initial update
    updateDeviceInfo();

    // Listen for resize and orientation changes
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    // Handle visual viewport changes (keyboard, etc.)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateDeviceInfo);
    }

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateDeviceInfo);
      }
    };
  }, [updateDeviceInfo]);

  // Haptic feedback helper
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'selection' = 'light') => {
    if (!deviceInfo.supportsHaptic) return;

    const patterns: Record<string, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 30,
      selection: [10, 10, 10],
    };

    try {
      navigator.vibrate(patterns[type]);
    } catch {
      // Silently fail if vibration not supported
    }
  }, [deviceInfo.supportsHaptic]);

  return {
    ...deviceInfo,
    safeArea,
    triggerHaptic,
    refresh: updateDeviceInfo,
  };
}

// Helper hook for checking if touch device
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error - msMaxTouchPoints is IE-specific
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouch();
  }, []);

  return isTouch;
}

// Helper hook for viewport height (accounting for mobile browser chrome)
export function useViewportHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      // Use visual viewport if available (better for mobile)
      if (window.visualViewport) {
        setHeight(window.visualViewport.height);
      } else {
        setHeight(window.innerHeight);
      }
    };

    updateHeight();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeight);
      return () => window.visualViewport?.removeEventListener('resize', updateHeight);
    } else {
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }
  }, []);

  return height;
}

export default useDeviceInfo;
