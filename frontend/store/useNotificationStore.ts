/**
 * Zustand store for managing notifications
 */
import { create } from 'zustand';
import type {
  Notification,
  PriceAlert,
  NotificationPreference,
  NotificationStore,
} from '@/types/notification';

/**
 * Zustand store for notification management
 *
 * Features:
 * - notifications: 알림 목록
 * - unreadCount: 읽지 않은 알림 수
 * - priceAlerts: 가격 알림 목록
 * - preferences: 알림 설정
 * - wsStatus: WebSocket 연결 상태
 */
export const useNotificationStore = create<NotificationStore>((set, get) => ({
  // Initial state
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  wsStatus: 'disconnected',
  priceAlerts: [],
  preferences: null,

  // Notification actions
  addNotification: (notification: Notification) => {
    set((state) => {
      // 중복 확인
      const exists = state.notifications.some((n) => n.id === notification.id);
      if (exists) return state;

      return {
        notifications: [notification, ...state.notifications].slice(0, 100), // 최대 100개
        unreadCount: notification.is_read ? state.unreadCount : state.unreadCount + 1,
      };
    });
  },

  setNotifications: (notifications: Notification[]) => {
    set({ notifications });
  },

  markAsRead: (id: number) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        is_read: true,
        read_at: n.read_at || new Date().toISOString(),
      })),
      unreadCount: 0,
    }));
  },

  removeNotification: (id: number) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      const wasUnread = notification && !notification.is_read;

      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    });
  },

  setUnreadCount: (count: number) => {
    set({ unreadCount: count });
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  setWsStatus: (wsStatus) => {
    set({ wsStatus });
  },

  // Price Alert actions
  setPriceAlerts: (priceAlerts: PriceAlert[]) => {
    set({ priceAlerts });
  },

  addPriceAlert: (alert: PriceAlert) => {
    set((state) => ({
      priceAlerts: [alert, ...state.priceAlerts],
    }));
  },

  updatePriceAlert: (id: number, updates: Partial<PriceAlert>) => {
    set((state) => ({
      priceAlerts: state.priceAlerts.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    }));
  },

  removePriceAlert: (id: number) => {
    set((state) => ({
      priceAlerts: state.priceAlerts.filter((a) => a.id !== id),
    }));
  },

  // Preferences actions
  setPreferences: (preferences: NotificationPreference) => {
    set({ preferences });
  },

  // Reset
  reset: () => {
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      wsStatus: 'disconnected',
      priceAlerts: [],
      preferences: null,
    });
  },
}));

// 선택적 구독을 위한 선택자들
export const selectUnreadCount = (state: NotificationStore) => state.unreadCount;
export const selectNotifications = (state: NotificationStore) => state.notifications;
export const selectWsStatus = (state: NotificationStore) => state.wsStatus;
export const selectPriceAlerts = (state: NotificationStore) => state.priceAlerts;
