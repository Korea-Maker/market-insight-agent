"use client";

import { usePriceStore } from '@/store/usePriceStore';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Activity } from 'lucide-react';

export const MarketTicker = () => {
  const currentPrice = usePriceStore(state => state.currentPrice);
  const connectionStatus = usePriceStore(state => state.connectionStatus);
  const prevPriceRef = useRef(currentPrice);
  const [direction, setDirection] = useState<'up' | 'down' | 'neutral'>('neutral');

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

  const getColor = () => {
    if (direction === 'up') return 'text-green-500';
    if (direction === 'down') return 'text-red-500';
    return 'text-foreground';
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
            <span className={cn("text-3xl font-bold transition-colors duration-300", getColor())}>
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
          connectionStatus === 'connected' ? "bg-green-500" : 
          connectionStatus === 'connecting' ? "bg-yellow-500" : "bg-red-500"
        )} />
        <span className="text-sm font-medium text-muted-foreground capitalize">
          {connectionStatus}
        </span>
      </div>
    </div>
  );
};
