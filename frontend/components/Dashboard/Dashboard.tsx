"use client";

import { useWebSocket } from '@/hooks/useWebSocket';
import { CryptoChart } from '@/components/Chart/CryptoChart';
import { Sidebar } from '@/components/Dashboard/Sidebar';
import { MarketTicker } from '@/components/Header/MarketTicker';

export const Dashboard = () => {
  // Initialize WebSocket connection
  useWebSocket();

  return (
    <div className="flex flex-col min-h-screen bg-background p-6 gap-6">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">QuantBoard V1</h1>
            <span className="text-xs text-muted-foreground font-mono">Phase 4: Visualization</span>
        </div>
        <MarketTicker />
      </header>
      
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Main Chart Area - Takes up 2 columns */}
        <div className="lg:col-span-2 w-full">
          <CryptoChart />
        </div>
        
        {/* Sidebar - Takes up 1 column */}
        <div className="lg:col-span-1 w-full">
          <Sidebar />
        </div>
        
        {/* Placeholder for future charts (Row 2) */}
        <div className="lg:col-span-2 min-h-[300px] rounded-xl border border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/5">
            <span className="text-muted-foreground">Multi-Chart Grid (Future)</span>
        </div>
         <div className="lg:col-span-1 min-h-[300px] rounded-xl border border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/5">
            <span className="text-muted-foreground">Order Book (Future)</span>
        </div>
      </main>
    </div>
  );
};
