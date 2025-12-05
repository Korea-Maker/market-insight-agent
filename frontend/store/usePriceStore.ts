/**
 * Zustand store for managing real-time price data
 */
import { create } from 'zustand';
import { TradeData, ConnectionStatus } from '@/types/price';

interface PriceStore {
  // State
  currentPrice: number;
  priceHistory: TradeData[];
  connectionStatus: ConnectionStatus;
  
  // Actions
  updatePrice: (data: TradeData) => void;
  setStatus: (status: ConnectionStatus) => void;
  clearHistory: () => void;
}

/**
 * Zustand store for price data management
 * 
 * Features:
 * - currentPrice: Latest price value
 * - priceHistory: Array of recent trade data (for charts)
 * - connectionStatus: WebSocket connection state
 */
export const usePriceStore = create<PriceStore>((set) => ({
  // Initial state
  currentPrice: 0,
  priceHistory: [],
  connectionStatus: 'disconnected',
  
  // Update price and add to history
  updatePrice: (data: TradeData) => {
    set((state) => {
      // Keep last 1000 items for performance
      const newHistory = [...state.priceHistory, data].slice(-1000);
      
      return {
        currentPrice: data.price,
        priceHistory: newHistory,
      };
    });
    
    // Log to console for verification (can be removed in production)
    console.log('[PriceStore] Price updated:', {
      symbol: data.symbol,
      price: data.price,
      timestamp: new Date(data.timestamp).toISOString(),
    });
  },
  
  // Set connection status
  setStatus: (status: ConnectionStatus) => {
    set({ connectionStatus: status });
    console.log('[PriceStore] Connection status:', status);
  },
  
  // Clear price history
  clearHistory: () => {
    set({ priceHistory: [], currentPrice: 0 });
  },
}));
