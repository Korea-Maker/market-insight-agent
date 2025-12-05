/**
 * Test component to verify WebSocket connection and Zustand store updates
 * This component can be removed once UI is implemented
 */
'use client';

import { useWebSocket } from '@/hooks/useWebSocket';
import { usePriceStore } from '@/store/usePriceStore';

/**
 * WebSocket test component
 * Displays connection status and latest price data
 * All updates are logged to console for verification
 */
export function WebSocketTest() {
  // Initialize WebSocket connection
  useWebSocket();

  // Get store state
  const currentPrice = usePriceStore((state) => state.currentPrice);
  const connectionStatus = usePriceStore((state) => state.connectionStatus);
  const priceHistory = usePriceStore((state) => state.priceHistory);

  return (
    <div className="p-4 space-y-2 text-sm">
      <div>
        <strong>Connection Status:</strong> {connectionStatus}
      </div>
      <div>
        <strong>Current Price:</strong> ${currentPrice.toFixed(2)}
      </div>
      <div>
        <strong>Price History Count:</strong> {priceHistory.length}
      </div>
      <div className="text-xs text-gray-500">
        Check browser console for detailed logs
      </div>
    </div>
  );
}
