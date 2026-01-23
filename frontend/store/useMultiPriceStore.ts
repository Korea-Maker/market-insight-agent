/**
 * Zustand store for managing multi-symbol real-time price data
 */
import { create } from 'zustand';
import { TradeData, ConnectionStatus } from '@/types/price';
import { SYMBOL_CONFIG } from '@/config/symbols';

export interface SymbolPriceData {
  currentPrice: number;
  priceHistory: TradeData[];
  change24h: number;
  changePercent24h: number;
  lastUpdate: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

interface MultiPriceStore {
  // State
  prices: Map<string, SymbolPriceData>;
  selectedSymbol: string;
  subscribedSymbols: string[];
  connectionStatus: ConnectionStatus;

  // Actions
  updatePrice: (symbol: string, data: TradeData) => void;
  setSelectedSymbol: (symbol: string) => void;
  addSubscription: (symbols: string[]) => void;
  removeSubscription: (symbols: string[]) => void;
  setSubscribedSymbols: (symbols: string[]) => void;
  setStatus: (status: ConnectionStatus) => void;
  clearSymbolHistory: (symbol: string) => void;
  clearAllHistory: () => void;

  // Getters
  getPrice: (symbol: string) => SymbolPriceData | undefined;
  getSelectedPrice: () => SymbolPriceData | undefined;
}

const createEmptySymbolData = (): SymbolPriceData => ({
  currentPrice: 0,
  priceHistory: [],
  change24h: 0,
  changePercent24h: 0,
  lastUpdate: 0,
  high24h: 0,
  low24h: 0,
  volume24h: 0,
});

export const useMultiPriceStore = create<MultiPriceStore>((set, get) => ({
  // Initial state
  prices: new Map(),
  selectedSymbol: SYMBOL_CONFIG.default[0],
  subscribedSymbols: [...SYMBOL_CONFIG.default],
  connectionStatus: 'disconnected',

  // Update price for a specific symbol
  updatePrice: (symbol: string, data: TradeData) => {
    set((state) => {
      const newPrices = new Map(state.prices);
      const existing = newPrices.get(symbol) || createEmptySymbolData();

      // Calculate 24h change (simplified - in real app, would use historical data)
      const priceHistory = [...existing.priceHistory, data].slice(-SYMBOL_CONFIG.historyLimit);

      // Track high/low from history
      const prices = priceHistory.map(p => p.price);
      const high24h = prices.length > 0 ? Math.max(...prices) : data.price;
      const low24h = prices.length > 0 ? Math.min(...prices) : data.price;

      // Calculate change from first price in history
      const firstPrice = priceHistory[0]?.price || data.price;
      const change24h = data.price - firstPrice;
      const changePercent24h = firstPrice > 0 ? (change24h / firstPrice) * 100 : 0;

      newPrices.set(symbol, {
        currentPrice: data.price,
        priceHistory,
        change24h,
        changePercent24h,
        lastUpdate: Date.now(),
        high24h,
        low24h,
        volume24h: existing.volume24h + data.quantity,
      });

      return { prices: newPrices };
    });
  },

  // Set selected symbol
  setSelectedSymbol: (symbol: string) => {
    set({ selectedSymbol: symbol });
  },

  // Add symbols to subscription
  addSubscription: (symbols: string[]) => {
    set((state) => {
      const newSymbols = symbols.filter(s => !state.subscribedSymbols.includes(s));
      if (newSymbols.length === 0) return state;

      const total = state.subscribedSymbols.length + newSymbols.length;
      if (total > SYMBOL_CONFIG.maxSubscriptions) {
        const available = SYMBOL_CONFIG.maxSubscriptions - state.subscribedSymbols.length;
        newSymbols.splice(available);
      }

      return {
        subscribedSymbols: [...state.subscribedSymbols, ...newSymbols],
      };
    });
  },

  // Remove symbols from subscription
  removeSubscription: (symbols: string[]) => {
    set((state) => ({
      subscribedSymbols: state.subscribedSymbols.filter(s => !symbols.includes(s)),
    }));
  },

  // Set subscribed symbols directly
  setSubscribedSymbols: (symbols: string[]) => {
    set({ subscribedSymbols: symbols.slice(0, SYMBOL_CONFIG.maxSubscriptions) });
  },

  // Set connection status
  setStatus: (status: ConnectionStatus) => {
    set({ connectionStatus: status });
  },

  // Clear history for a specific symbol
  clearSymbolHistory: (symbol: string) => {
    set((state) => {
      const newPrices = new Map(state.prices);
      const existing = newPrices.get(symbol);
      if (existing) {
        newPrices.set(symbol, {
          ...existing,
          priceHistory: [],
          volume24h: 0,
        });
      }
      return { prices: newPrices };
    });
  },

  // Clear all history
  clearAllHistory: () => {
    set({ prices: new Map() });
  },

  // Get price data for a specific symbol
  getPrice: (symbol: string) => {
    return get().prices.get(symbol);
  },

  // Get price data for selected symbol
  getSelectedPrice: () => {
    const state = get();
    return state.prices.get(state.selectedSymbol);
  },
}));

// Selector hooks for optimized re-renders
export const useSymbolPrice = (symbol: string) =>
  useMultiPriceStore((state) => state.prices.get(symbol));

export const useSelectedSymbol = () =>
  useMultiPriceStore((state) => state.selectedSymbol);

export const useSelectedSymbolPrice = () =>
  useMultiPriceStore((state) => state.prices.get(state.selectedSymbol));

export const useSubscribedSymbols = () =>
  useMultiPriceStore((state) => state.subscribedSymbols);

export const useMultiConnectionStatus = () =>
  useMultiPriceStore((state) => state.connectionStatus);
