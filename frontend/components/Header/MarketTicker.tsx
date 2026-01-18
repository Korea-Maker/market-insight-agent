"use client";

import { usePriceStore } from '@/store/usePriceStore';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Activity } from 'lucide-react';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';
type PriceDirection = 'up' | 'down' | 'neutral';

function getStatusColor(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-green-500';
    case 'connecting':
      return 'bg-yellow-500';
    default:
      return 'bg-red-500';
  }
}

function getDirectionColor(direction: PriceDirection): string {
  switch (direction) {
    case 'up':
      return 'text-green-500';
    case 'down':
      return 'text-red-500';
    default:
      return 'text-foreground';
  }
}

export function MarketTicker(): React.ReactElement {
  const currentPrice = usePriceStore(state => state.currentPrice);
  const connectionStatus = usePriceStore(state => state.connectionStatus);
  const prevPriceRef = useRef(currentPrice);
  const [direction, setDirection] = useState<PriceDirection>('neutral');

  useEffect(() => {
    if (currentPrice > prevPriceRef.current) {
      setDirection('up');
    } else if (currentPrice < prevPriceRef.current) {
      setDirection('down');
    }
    prevPriceRef.current = currentPrice;
  }, [currentPrice]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-card rounded-xl border shadow-sm w-full">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">BTC/USDT</h2>
          <div className="flex items-center gap-2">
            <span className={cn("text-3xl font-bold transition-colors duration-300", getDirectionColor(direction))}>
              {formatPrice(currentPrice)}
            </span>
            {direction === 'up' && <ArrowUp className="h-6 w-6 text-green-500 animate-pulse" />}
            {direction === 'down' && <ArrowDown className="h-6 w-6 text-red-500 animate-pulse" />}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className={cn(
          "h-2.5 w-2.5 rounded-full",
          getStatusColor(connectionStatus as ConnectionStatus)
        )} />
        <span className="text-sm font-medium text-muted-foreground capitalize">
          {connectionStatus}
        </span>
      </div>
    </div>
  );
};
