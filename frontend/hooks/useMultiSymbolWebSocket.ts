/**
 * Custom React hook for multi-symbol WebSocket connection
 * Supports dynamic symbol subscription/unsubscription
 */
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useMultiPriceStore } from '@/store/useMultiPriceStore';
import { TradeData } from '@/types/price';
import { SYMBOL_CONFIG } from '@/config/symbols';

interface UseMultiSymbolWebSocketOptions {
  url?: string;
  initialSymbols?: string[];
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

interface UseMultiSymbolWebSocketReturn {
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  isConnected: boolean;
  subscribedSymbols: string[];
}

// Client → Server message types
interface SubscribeMessage {
  type: 'subscribe';
  symbols: string[];
}

interface UnsubscribeMessage {
  type: 'unsubscribe';
  symbols: string[];
}

// Server → Client message types
interface PriceMessage {
  type: 'price';
  symbol: string;
  price: number;
  quantity: number;
  timestamp: number;
  trade_id: number;
  is_buyer_maker: boolean;
}

interface SubscriptionConfirmMessage {
  type: 'subscribed' | 'unsubscribed';
  symbols: string[];
}

interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
}

type ServerMessage = PriceMessage | SubscriptionConfirmMessage | ErrorMessage;

function getDefaultWebSocketUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const wsProtocol = apiUrl.startsWith('https://') ? 'wss://' : 'ws://';
  const host = apiUrl.replace(/^https?:\/\//, '');
  return `${wsProtocol}${host}/ws/prices`;
}

export function useMultiSymbolWebSocket(
  options: UseMultiSymbolWebSocketOptions = {}
): UseMultiSymbolWebSocketReturn {
  const {
    url = getDefaultWebSocketUrl(),
    initialSymbols = SYMBOL_CONFIG.default,
    reconnect = true,
    maxReconnectAttempts = Infinity,
    reconnectInterval = 1000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(reconnect);
  const isManualCloseRef = useRef(false);
  const pendingSubscriptionsRef = useRef<string[]>([]);
  const pendingUnsubscriptionsRef = useRef<string[]>([]);

  const [subscribedSymbols, setSubscribedSymbols] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Build WebSocket URL with initial symbols
  const buildUrl = useCallback(() => {
    if (initialSymbols.length > 0) {
      return `${url}?symbols=${initialSymbols.join(',')}`;
    }
    return url;
  }, [url, initialSymbols]);

  // Send message to WebSocket server
  const sendMessage = useCallback((message: SubscribeMessage | UnsubscribeMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Subscribe to symbols
  const subscribe = useCallback((symbols: string[]) => {
    if (!symbols || symbols.length === 0) return;

    const upperSymbols = symbols.map(s => s.toUpperCase());

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendMessage({ type: 'subscribe', symbols: upperSymbols });
    } else {
      // Queue for when connected
      pendingSubscriptionsRef.current.push(...upperSymbols);
    }
  }, [sendMessage]);

  // Unsubscribe from symbols
  const unsubscribe = useCallback((symbols: string[]) => {
    if (!symbols || symbols.length === 0) return;

    const upperSymbols = symbols.map(s => s.toUpperCase());

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendMessage({ type: 'unsubscribe', symbols: upperSymbols });
    } else {
      // Queue for when connected
      pendingUnsubscriptionsRef.current.push(...upperSymbols);
    }
  }, [sendMessage]);

  // Process pending subscriptions
  const processPendingSubscriptions = useCallback(() => {
    if (pendingSubscriptionsRef.current.length > 0) {
      const symbols = [...new Set(pendingSubscriptionsRef.current)];
      pendingSubscriptionsRef.current = [];
      sendMessage({ type: 'subscribe', symbols });
    }

    if (pendingUnsubscriptionsRef.current.length > 0) {
      const symbols = [...new Set(pendingUnsubscriptionsRef.current)];
      pendingUnsubscriptionsRef.current = [];
      sendMessage({ type: 'unsubscribe', symbols });
    }
  }, [sendMessage]);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.CONNECTING ||
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    try {
      useMultiPriceStore.getState().setStatus('connecting');
      const wsUrl = buildUrl();
      console.log('[MultiSymbolWebSocket] Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[MultiSymbolWebSocket] Connected successfully');
        useMultiPriceStore.getState().setStatus('connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Process any pending subscriptions
        processPendingSubscriptions();
      };

      ws.onmessage = (event) => {
        try {
          const data: ServerMessage = JSON.parse(event.data);

          switch (data.type) {
            case 'price':
              // Update price in store
              const tradeData: TradeData = {
                symbol: data.symbol,
                price: data.price,
                quantity: data.quantity,
                timestamp: data.timestamp,
                trade_id: data.trade_id,
                is_buyer_maker: data.is_buyer_maker,
              };
              useMultiPriceStore.getState().updatePrice(data.symbol, tradeData);
              break;

            case 'subscribed':
              console.log('[MultiSymbolWebSocket] Subscribed to:', data.symbols);
              setSubscribedSymbols((prev) => {
                const newSymbols = [...new Set([...prev, ...data.symbols])];
                useMultiPriceStore.getState().setSubscribedSymbols(newSymbols);
                return newSymbols;
              });
              break;

            case 'unsubscribed':
              console.log('[MultiSymbolWebSocket] Unsubscribed from:', data.symbols);
              setSubscribedSymbols((prev) => {
                const newSymbols = prev.filter((s) => !data.symbols.includes(s));
                useMultiPriceStore.getState().setSubscribedSymbols(newSymbols);
                return newSymbols;
              });
              break;

            case 'error':
              console.warn('[MultiSymbolWebSocket] Server error:', data.message);
              if (data.code === 'REDIS_DISABLED') {
                shouldReconnectRef.current = false;
                useMultiPriceStore.getState().setStatus('disconnected');
              }
              break;

            default:
              console.warn('[MultiSymbolWebSocket] Unknown message type:', data);
          }
        } catch (error) {
          console.error('[MultiSymbolWebSocket] Failed to parse message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('[MultiSymbolWebSocket] Connection closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });

        setIsConnected(false);
        useMultiPriceStore.getState().setStatus('disconnected');

        if (shouldReconnectRef.current && !isManualCloseRef.current) {
          attemptReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error('[MultiSymbolWebSocket] Error occurred:', error);
        useMultiPriceStore.getState().setStatus('error');
      };
    } catch (error) {
      console.error('[MultiSymbolWebSocket] Connection error:', error);
      useMultiPriceStore.getState().setStatus('error');

      if (shouldReconnectRef.current && !isManualCloseRef.current) {
        attemptReconnect();
      }
    }
  }, [buildUrl, processPendingSubscriptions]);

  // Attempt reconnection with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('[MultiSymbolWebSocket] Max reconnect attempts reached');
      useMultiPriceStore.getState().setStatus('error');
      return;
    }

    const delay = Math.min(
      reconnectInterval * Math.pow(2, reconnectAttemptsRef.current),
      30000
    );

    reconnectAttemptsRef.current += 1;

    console.log(
      `[MultiSymbolWebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, reconnectInterval, maxReconnectAttempts]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    isManualCloseRef.current = true;
    shouldReconnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setSubscribedSymbols([]);
    useMultiPriceStore.getState().setStatus('disconnected');
    console.log('[MultiSymbolWebSocket] Manually disconnected');
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    subscribe,
    unsubscribe,
    isConnected,
    subscribedSymbols,
  };
}
