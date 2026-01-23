'use client';

import { useState, useCallback } from 'react';
import { Plus, X, TrendingUp, TrendingDown } from 'lucide-react';
import {
  useMultiPriceStore,
  useSubscribedSymbols,
  useSymbolPrice,
  useSelectedSymbol,
} from '@/store/useMultiPriceStore';
import { SUPPORTED_SYMBOLS, getSymbolName } from '@/config/symbols';
import { cn } from '@/lib/utils';

interface SymbolWatchlistProps {
  onSubscribe?: (symbols: string[]) => void;
  onUnsubscribe?: (symbols: string[]) => void;
  className?: string;
}

export function SymbolWatchlist({
  onSubscribe,
  onUnsubscribe,
  className,
}: SymbolWatchlistProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const subscribedSymbols = useSubscribedSymbols();
  const selectedSymbol = useSelectedSymbol();
  const setSelectedSymbol = useMultiPriceStore((state) => state.setSelectedSymbol);

  const handleRemove = useCallback(
    (symbol: string) => {
      onUnsubscribe?.([symbol]);
    },
    [onUnsubscribe]
  );

  const handleSelect = useCallback(
    (symbol: string) => {
      setSelectedSymbol(symbol);
    },
    [setSelectedSymbol]
  );

  return (
    <div className={cn('bg-zinc-900 rounded-lg border border-zinc-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-medium text-white">Watchlist</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="p-1 hover:bg-zinc-800 rounded transition-colors"
          title="Add symbol"
        >
          <Plus className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Symbol List */}
      <div className="divide-y divide-zinc-800">
        {subscribedSymbols.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-sm">
            No symbols in watchlist
          </div>
        ) : (
          subscribedSymbols.map((symbol) => (
            <WatchlistItem
              key={symbol}
              symbol={symbol}
              isSelected={symbol === selectedSymbol}
              onSelect={handleSelect}
              onRemove={handleRemove}
            />
          ))
        )}
      </div>

      {/* Add Symbol Modal */}
      {showAddModal && (
        <AddSymbolModal
          subscribedSymbols={subscribedSymbols}
          onAdd={(symbols) => {
            onSubscribe?.(symbols);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

interface WatchlistItemProps {
  symbol: string;
  isSelected: boolean;
  onSelect: (symbol: string) => void;
  onRemove: (symbol: string) => void;
}

function WatchlistItem({
  symbol,
  isSelected,
  onSelect,
  onRemove,
}: WatchlistItemProps) {
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

  const isPositive = priceData && priceData.changePercent24h >= 0;

  return (
    <div
      className={cn(
        'group flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-800 transition-colors',
        isSelected && 'bg-zinc-800/50 border-l-2 border-blue-500'
      )}
      onClick={() => onSelect(symbol)}
    >
      {/* Symbol Icon */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
          isPositive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
        )}
      >
        {symbol.slice(0, 2)}
      </div>

      {/* Symbol Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">
            {getSymbolName(symbol)}
          </span>
          {isPositive ? (
            <TrendingUp className="w-3 h-3 text-green-500" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-500" />
          )}
        </div>
        <div className="text-xs text-zinc-400">{symbol}</div>
      </div>

      {/* Price */}
      <div className="text-right">
        <div className="text-sm font-medium text-white">
          ${priceData ? formatPrice(priceData.currentPrice) : '--'}
        </div>
        {priceData && (
          <div
            className={cn(
              'text-xs',
              isPositive ? 'text-green-500' : 'text-red-500'
            )}
          >
            {formatChange(priceData.changePercent24h)}
          </div>
        )}
      </div>

      {/* Remove Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(symbol);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700 rounded transition-all"
        title="Remove from watchlist"
      >
        <X className="w-4 h-4 text-zinc-400" />
      </button>
    </div>
  );
}

interface AddSymbolModalProps {
  subscribedSymbols: string[];
  onAdd: (symbols: string[]) => void;
  onClose: () => void;
}

function AddSymbolModal({
  subscribedSymbols,
  onAdd,
  onClose,
}: AddSymbolModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const availableSymbols = SUPPORTED_SYMBOLS.filter(
    (s) =>
      !subscribedSymbols.includes(s.symbol) &&
      (s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleSymbol = (symbol: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  const handleAdd = () => {
    if (selected.size > 0) {
      onAdd(Array.from(selected));
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <h3 className="text-lg font-medium text-white">Add Symbols</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-zinc-700">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symbols..."
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {/* Symbol List */}
        <div className="max-h-64 overflow-y-auto">
          {availableSymbols.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 text-sm">
              {searchQuery ? 'No symbols found' : 'All symbols already added'}
            </div>
          ) : (
            availableSymbols.map((symbol) => (
              <button
                key={symbol.symbol}
                onClick={() => toggleSymbol(symbol.symbol)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors',
                  selected.has(symbol.symbol) && 'bg-blue-500/10'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded border flex items-center justify-center',
                    selected.has(symbol.symbol)
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-zinc-600'
                  )}
                >
                  {selected.has(symbol.symbol) && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                  {symbol.symbol.slice(0, 2)}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-white">
                    {symbol.name}
                  </div>
                  <div className="text-xs text-zinc-400">{symbol.symbol}</div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-zinc-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selected.size === 0}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              selected.size > 0
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
            )}
          >
            Add {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </div>
    </>
  );
}
