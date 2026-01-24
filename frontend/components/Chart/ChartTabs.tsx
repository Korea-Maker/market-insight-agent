"use client";

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TradingChart } from './TradingChart';
import { TradingViewWidget } from './TradingViewWidget';
import { useChartStore } from '@/store/useChartStore';
import { BarChart3, TrendingUp } from 'lucide-react';

type ChartTab = 'quantboard' | 'tradingview';

export function ChartTabs() {
  const [activeTab, setActiveTab] = useState<ChartTab>('quantboard');
  const [mounted, setMounted] = useState(false);

  // Get symbol and interval from chart store to sync with TradingView
  const symbol = useChartStore((s) => s.symbol);
  const interval = useChartStore((s) => s.interval);

  // Detect theme from document
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    setMounted(true);

    // Check initial theme
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark');
          setTheme(isDark ? 'dark' : 'light');
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as ChartTab)}
      className="w-full h-full flex flex-col"
    >
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20">
        <TabsList className="bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm">
          <TabsTrigger
            value="quantboard"
            className="flex items-center gap-1.5 text-xs data-[state=active]:bg-primary/10"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>QuantBoard</span>
          </TabsTrigger>
          <TabsTrigger
            value="tradingview"
            className="flex items-center gap-1.5 text-xs data-[state=active]:bg-primary/10"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>TradingView</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent
        value="quantboard"
        className="flex-1 m-0 data-[state=inactive]:hidden"
      >
        <TradingChart />
      </TabsContent>

      <TabsContent
        value="tradingview"
        className="flex-1 m-0 data-[state=inactive]:hidden"
      >
        <div className="w-full h-full min-h-[600px] flex flex-col bg-card rounded-xl border shadow-sm overflow-hidden">
          <TradingViewWidget
            symbol={symbol}
            interval={interval}
            theme={theme}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}
