'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import {
  useSelectedSymbol,
  useMultiPriceStore,
  useSymbolPrice,
} from '@/store/useMultiPriceStore';
import { SUPPORTED_SYMBOLS, getSymbolName } from '@/config/symbols';
import { cn } from '@/lib/utils';

interface SymbolSelectorProps {
  className?: string;
}

export function SymbolSelector({ className }: SymbolSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const selectedSymbol = useSelectedSymbol();
  const setSelectedSymbol = useMultiPriceStore((state) => state.setSelectedSymbol);
  const currentPrice = useSymbolPrice(selectedSymbol);

  const filteredSymbols = SUPPORTED_SYMBOLS.filter(
    (s) =>
      s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = useCallback(
    (symbol: string) => {
      setSelectedSymbol(symbol);
      setIsOpen(false);
      setSearchQuery('');
    },
    [setSelectedSymbol]
  );

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return price.toFixed(price < 1 ? 6 : 4);
  };

  return (
    <div className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors min-w-[200px]"
      >
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-white">
            {getSymbolName(selectedSymbol)}
          </div>
          <div className="text-xs text-zinc-400">
            {selectedSymbol} · ${currentPrice ? formatPrice(currentPrice.currentPrice) : '--'}
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-zinc-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute top-full left-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-zinc-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search symbols..."
                  className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Symbol List */}
            <div className="max-h-64 overflow-y-auto">
              {filteredSymbols.length === 0 ? (
                <div className="p-4 text-center text-zinc-500 text-sm">
                  No symbols found
                </div>
              ) : (
                filteredSymbols.map((symbol) => (
                  <SymbolOption
                    key={symbol.symbol}
                    symbol={symbol.symbol}
                    name={symbol.name}
                    isSelected={symbol.symbol === selectedSymbol}
                    onSelect={handleSelect}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface SymbolOptionProps {
  symbol: string;
  name: string;
  isSelected: boolean;
  onSelect: (symbol: string) => void;
}

function SymbolOption({ symbol, name, isSelected, onSelect }: SymbolOptionProps) {
  const priceData = useSymbolPrice(symbol);

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return price.toFixed(price < 1 ? 6 : 4);
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  return (
    <button
      onClick={() => onSelect(symbol)}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 transition-colors',
        isSelected && 'bg-zinc-800'
      )}
    >
      {/* Symbol Icon Placeholder */}
      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
        {symbol.slice(0, 2)}
      </div>

      {/* Symbol Info */}
      <div className="flex-1 text-left">
        <div className="text-sm font-medium text-white">{name}</div>
        <div className="text-xs text-zinc-400">{symbol}</div>
      </div>

      {/* Price Info */}
      <div className="text-right">
        <div className="text-sm font-medium text-white">
          ${priceData ? formatPrice(priceData.currentPrice) : '--'}
        </div>
        {priceData && priceData.changePercent24h !== 0 && (
          <div
            className={cn(
              'text-xs',
              priceData.changePercent24h >= 0 ? 'text-green-500' : 'text-red-500'
            )}
          >
            {formatChange(priceData.changePercent24h)}
          </div>
        )}
      </div>

      {/* Selected Indicator */}
      {isSelected && (
        <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
      )}
    </button>
  );
}
