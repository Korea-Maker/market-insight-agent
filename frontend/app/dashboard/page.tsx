import { CryptoChart } from '@/components/Chart/CryptoChart';
import { MarketTicker } from '@/components/Header/MarketTicker';

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-y-auto">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
          <span className="text-xs text-muted-foreground font-mono">실시간 차트</span>
        </div>
        <MarketTicker />
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Main Chart Area - Takes up 2 columns */}
        <div className="lg:col-span-2 w-full">
          <CryptoChart />
        </div>
        
        {/* AI Insights Sidebar - Takes up 1 column */}
        <div className="lg:col-span-1 w-full">
          <div className="w-full h-full min-h-[500px] p-4 bg-card rounded-xl border shadow-sm flex flex-col">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">AI Insights</h3>
              <div className="p-4 rounded-lg bg-muted/50 border border-dashed flex flex-col items-center justify-center text-center space-y-2 min-h-[200px]">
                <span className="text-sm text-muted-foreground">AI Models Offline</span>
                <p className="text-xs text-muted-foreground/60">
                  Sentiment Analysis & Predictive models will appear here.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">System Status</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Ingestor</span>
                    <span className="text-green-500">Active</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Analysis Engine</span>
                    <span className="text-yellow-500">Standby</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Placeholder for future charts (Row 2) */}
        <div className="lg:col-span-2 min-h-[300px] rounded-xl border border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/5">
          <span className="text-muted-foreground">Multi-Chart Grid (Future)</span>
        </div>
        <div className="lg:col-span-1 min-h-[300px] rounded-xl border border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/5">
          <span className="text-muted-foreground">Order Book (Future)</span>
        </div>
      </div>
    </div>
  );
}
