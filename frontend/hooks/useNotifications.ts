/**
 * Custom React hook for WebSocket notification connection
 * Implements auto-reconnect with exponential backoff and JWT authentication
 */
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useAuthStore } from '@/store/useAuthStore';
import type { WebSocketNotification, Notification } from '@/types/notification';

interface UseNotificationsOptions {
  enabled?: boolean;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  onNotification?: (notification: Notification) => void;
}

/**
 * Get the WebSocket URL for notifications
 */
function getNotificationWebSocketUrl(token: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Convert HTTP URL to WebSocket URL
  const wsProtocol = apiUrl.startsWith('https://') ? 'wss://' : 'ws://';
  const host = apiUrl.replace(/^https?:\/\//, '');

  return `${wsProtocol}${host}/ws/notifications?token=${encodeURIComponent(token)}`;
}

/**
 * WebSocket hook for real-time notifications
 *
 * @param options - Configuration options
 * @param options.enabled - Enable WebSocket connection (default: true)
 * @param options.reconnect - Enable auto-reconnect (default: true)
 * @param options.maxReconnectAttempts - Maximum reconnect attempts (default: 10)
 * @param options.reconnectInterval - Initial reconnect interval in ms (default: 1000)
 * @param options.onNotification - Callback when notification is received
 *
 * @example
 * ```tsx
 * useNotifications({
 *   onNotification: (notif) => {
 *     toast.info(notif.title);
 *   }
 * });
 * ```
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const {
    enabled = true,
    reconnect = true,
    maxReconnectAttempts = 10,
    reconnectInterval = 1000,
    onNotification,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(reconnect);
  const isManualCloseRef = useRef(false);

  // Auth store에서 토큰 가져오기
  const token = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    // 인증되지 않은 경우 연결하지 않음
    if (!token || !isAuthenticated) {
      console.log('[NotificationWS] Not authenticated, skipping connection');
      return;
    }

    // Prevent multiple connections
    if (
      wsRef.current?.readyState === WebSocket.CONNECTING ||
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    try {
      const url = getNotificationWebSocketUrl(token);
      useNotificationStore.getState().setWsStatus('connecting');
      console.log('[NotificationWS] Connecting...');

      const ws = new WebSocket(url);
      wsRef.current = ws;

      // Connection opened
      ws.onopen = () => {
        console.log('[NotificationWS] Connected successfully');
        useNotificationStore.getState().setWsStatus('connected');
        reconnectAttemptsRef.current = 0;

        // Start heartbeat
        startHeartbeat();
      };

      // Message received
      ws.onmessage = (event) => {
        try {
          const data: WebSocketNotification = JSON.parse(event.data);

          switch (data.type) {
            case 'connected':
              console.log('[NotificationWS] Connection confirmed:', data.message);
              break;

            case 'heartbeat':
              // Heartbeat 응답 - 무시
              break;

            case 'error':
              console.error('[NotificationWS] Server error:', data.message);
              if (data.code === 'AUTH_REQUIRED' || data.code === 'AUTH_FAILED') {
                shouldReconnectRef.current = false;
                useNotificationStore.getState().setWsStatus('error');
              }
              break;

            case 'warning':
              console.warn('[NotificationWS] Warning:', data.message);
              break;

            case 'price_alert':
            case 'news':
            case 'system':
              // 실제 알림 처리
              const notification: Notification = {
                id: parseInt(data.id?.replace('notif_', '') || '0'),
                type: data.type,
                title: data.title || '',
                message: data.message || '',
                data: data.data,
                priority: data.priority || 'medium',
                is_read: false,
                created_at: data.timestamp || new Date().toISOString(),
              };

              useNotificationStore.getState().addNotification(notification);

              // 콜백 호출
              if (onNotification) {
                onNotification(notification);
              }
              break;

            default:
              console.log('[NotificationWS] Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('[NotificationWS] Failed to parse message:', error);
        }
      };

      // Connection closed
      ws.onclose = (event) => {
        console.log('[NotificationWS] Connection closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });

        stopHeartbeat();
        useNotificationStore.getState().setWsStatus('disconnected');

        // Attempt reconnect if not manually closed
        if (shouldReconnectRef.current && !isManualCloseRef.current && isAuthenticated) {
          attemptReconnect();
        }
      };

      // Error occurred
      ws.onerror = () => {
        console.error('[NotificationWS] Connection error');
        useNotificationStore.getState().setWsStatus('error');
      };
    } catch (error) {
      console.error('[NotificationWS] Connection error:', error);
      useNotificationStore.getState().setWsStatus('error');

      if (shouldReconnectRef.current && !isManualCloseRef.current) {
        attemptReconnect();
      }
    }
  }, [token, isAuthenticated, onNotification]);

  /**
   * Attempt to reconnect with exponential backoff
   */
  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('[NotificationWS] Max reconnect attempts reached');
      useNotificationStore.getState().setWsStatus('error');
      return;
    }

    const delay = Math.min(
      reconnectInterval * Math.pow(2, reconnectAttemptsRef.current),
      30000
    );

    reconnectAttemptsRef.current += 1;

    console.log(
      `[NotificationWS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, reconnectInterval, maxReconnectAttempts]);

  /**
   * Start heartbeat interval
   */
  const startHeartbeat = useCallback(() => {
    stopHeartbeat();

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000); // 25초마다 ping
  }, []);

  /**
   * Stop heartbeat interval
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    isManualCloseRef.current = true;
    shouldReconnectRef.current = false;

    // Clear timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    useNotificationStore.getState().setWsStatus('disconnected');
    console.log('[NotificationWS] Manually disconnected');
  }, [stopHeartbeat]);

  // Connect on mount when authenticated
  useEffect(() => {
    if (enabled && isAuthenticated && token) {
      isManualCloseRef.current = false;
      shouldReconnectRef.current = reconnect;
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, isAuthenticated, token, connect, disconnect, reconnect]);

  // 로그아웃 시 연결 해제
  useEffect(() => {
    if (!isAuthenticated) {
      disconnect();
      useNotificationStore.getState().reset();
    }
  }, [isAuthenticated, disconnect]);

  return {
    connect,
    disconnect,
    isConnected: useNotificationStore((state) => state.wsStatus === 'connected'),
    wsStatus: useNotificationStore((state) => state.wsStatus),
  };
}
