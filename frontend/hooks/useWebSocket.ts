/**
 * Custom React hook for WebSocket connection to FastAPI backend
 * Implements auto-reconnect with exponential backoff
 */
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePriceStore } from '@/store/usePriceStore';
import { TradeData } from '@/types/price';

interface UseWebSocketOptions {
  url?: string;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

/**
 * WebSocket hook for connecting to FastAPI backend
 * 
 * @param options - Configuration options
 * @param options.url - WebSocket URL (default: ws://localhost:8000/ws/prices)
 * @param options.reconnect - Enable auto-reconnect (default: true)
 * @param options.maxReconnectAttempts - Maximum reconnect attempts (default: Infinity)
 * @param options.reconnectInterval - Initial reconnect interval in ms (default: 1000)
 * 
 * @example
 * ```tsx
 * useWebSocket({ url: 'ws://localhost:8000/ws/prices' });
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = 'ws://localhost:8000/ws/prices',
    reconnect = true,
    maxReconnectAttempts = Infinity,
    reconnectInterval = 1000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(reconnect);
  const isManualCloseRef = useRef(false);

  const updatePrice = usePriceStore((state) => state.updatePrice);
  const setStatus = usePriceStore((state) => state.setStatus);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    // Prevent multiple connections
    if (wsRef.current?.readyState === WebSocket.CONNECTING || 
        wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setStatus('connecting');
      console.log('[WebSocket] Connecting to:', url);

      const ws = new WebSocket(url);
      wsRef.current = ws;

      // Connection opened
      ws.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        setStatus('connected');
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
      };

      // Message received
      ws.onmessage = (event) => {
        try {
          const data: TradeData = JSON.parse(event.data);
          
          // Validate data structure
          if (data && typeof data.price === 'number' && data.symbol) {
            updatePrice(data);
          } else {
            console.warn('[WebSocket] Invalid data format:', data);
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error, event.data);
        }
      };

      // Connection closed
      ws.onclose = (event) => {
        const closeInfo = {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean,
        };
        
        // WebSocket close codes reference
        const closeCodeMessages: Record<number, string> = {
          1000: 'Normal Closure',
          1001: 'Going Away',
          1002: 'Protocol Error',
          1003: 'Unsupported Data',
          1006: 'Abnormal Closure (no close frame)',
          1007: 'Invalid Data',
          1008: 'Policy Violation',
          1009: 'Message Too Big',
          1010: 'Mandatory Extension',
          1011: 'Internal Server Error',
          1015: 'TLS Handshake Failure',
        };
        
        const codeMessage = closeCodeMessages[event.code] || `Unknown code: ${event.code}`;
        
        console.log('[WebSocket] Connection closed:', {
          ...closeInfo,
          codeMessage,
          url,
        });

        // If connection was not clean and not manually closed, it's likely an error
        if (!event.wasClean && !isManualCloseRef.current) {
          console.error('[WebSocket] Connection closed unexpectedly:', {
            code: event.code,
            codeMessage,
            reason: event.reason,
            hint: event.code === 1006 
              ? 'Server may not be running or URL is incorrect'
              : 'Check backend server logs for details',
          });
        }

        setStatus('disconnected');

        // Attempt reconnect if not manually closed
        if (shouldReconnectRef.current && !isManualCloseRef.current) {
          attemptReconnect();
        }
      };

      // Error occurred
      ws.onerror = (error) => {
        // WebSocket error event doesn't provide detailed error info
        // Check readyState for more context
        const state = ws.readyState;
        const stateText = 
          state === WebSocket.CONNECTING ? 'CONNECTING' :
          state === WebSocket.OPEN ? 'OPEN' :
          state === WebSocket.CLOSING ? 'CLOSING' :
          state === WebSocket.CLOSED ? 'CLOSED' : 'UNKNOWN';
        
        console.error('[WebSocket] Error occurred:', {
          url,
          readyState: stateText,
          message: 'WebSocket connection error. Check if backend server is running.',
          hint: 'Ensure FastAPI server is running on http://localhost:8000',
        });
        setStatus('error');
      };

    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      setStatus('error');
      
      if (shouldReconnectRef.current && !isManualCloseRef.current) {
        attemptReconnect();
      }
    }
  }, [url, updatePrice, setStatus]);

  /**
   * Attempt to reconnect with exponential backoff
   */
  const attemptReconnect = useCallback(() => {
    // Check max attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached');
      setStatus('error');
      return;
    }

    // Calculate exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    const delay = Math.min(
      reconnectInterval * Math.pow(2, reconnectAttemptsRef.current),
      30000
    );

    reconnectAttemptsRef.current += 1;

    console.log(
      `[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, reconnectInterval, maxReconnectAttempts, setStatus]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    isManualCloseRef.current = true;
    shouldReconnectRef.current = false;

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('disconnected');
    console.log('[WebSocket] Manually disconnected');
  }, [setStatus]);

  // Connect on mount
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connect,
    disconnect,
    isConnected: usePriceStore((state) => state.connectionStatus === 'connected'),
  };
}
