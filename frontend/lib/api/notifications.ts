/**
 * 알림 API 클라이언트
 */
import { api } from '@/lib/api';
import type {
  NotificationListResponse,
  UnreadCountResponse,
  Notification,
  PriceAlert,
  PriceAlertCreate,
  PriceAlertUpdate,
  PriceAlertListResponse,
  NotificationPreference,
  NotificationPreferenceUpdate,
  NewsSubscription,
  NewsSubscriptionCreate,
  NewsSubscriptionListResponse,
} from '@/types/notification';

// Notifications API
export const notificationsApi = {
  /**
   * 알림 목록 조회
   */
  getList: (params?: {
    skip?: number;
    limit?: number;
    type?: string;
    is_read?: boolean;
  }) => api.get<NotificationListResponse>('/api/notifications', params as Record<string, string | number | undefined>),

  /**
   * 읽지 않은 알림 수 조회
   */
  getUnreadCount: () => api.get<UnreadCountResponse>('/api/notifications/unread'),

  /**
   * 알림 상세 조회
   */
  getById: (id: number) => api.get<Notification>(`/api/notifications/${id}`),

  /**
   * 알림 읽음 처리
   */
  markAsRead: (id: number) => api.patch<Notification>(`/api/notifications/${id}/read`),

  /**
   * 여러 알림 읽음 처리
   */
  markMultipleAsRead: (ids: number[]) =>
    api.post<{ message: string; count: number }>('/api/notifications/mark-read', {
      notification_ids: ids,
    }),

  /**
   * 모든 알림 읽음 처리
   */
  markAllAsRead: () =>
    api.post<{ message: string; count: number }>('/api/notifications/mark-all-read'),

  /**
   * 알림 삭제
   */
  delete: (id: number) => api.delete<{ message: string }>(`/api/notifications/${id}`),
};

// Price Alerts API
export const alertsApi = {
  /**
   * 가격 알림 목록 조회
   */
  getList: (params?: { symbol?: string; is_active?: boolean }) =>
    api.get<PriceAlertListResponse>('/api/alerts', params as Record<string, string | number | undefined>),

  /**
   * 가격 알림 생성
   */
  create: (data: PriceAlertCreate) => api.post<PriceAlert>('/api/alerts', data),

  /**
   * 가격 알림 상세 조회
   */
  getById: (id: number) => api.get<PriceAlert>(`/api/alerts/${id}`),

  /**
   * 가격 알림 수정
   */
  update: (id: number, data: PriceAlertUpdate) =>
    api.patch<PriceAlert>(`/api/alerts/${id}`, data),

  /**
   * 가격 알림 삭제
   */
  delete: (id: number) => api.delete<{ message: string }>(`/api/alerts/${id}`),

  /**
   * 가격 알림 토글
   */
  toggle: (id: number) => api.post<PriceAlert>(`/api/alerts/${id}/toggle`),
};

// Notification Preferences API
export const preferencesApi = {
  /**
   * 알림 설정 조회
   */
  get: () => api.get<NotificationPreference>('/api/notifications/preferences'),

  /**
   * 알림 설정 수정
   */
  update: (data: NotificationPreferenceUpdate) =>
    api.patch<NotificationPreference>('/api/notifications/preferences', data),
};

// News Subscriptions API
export const subscriptionsApi = {
  /**
   * 뉴스 구독 목록 조회
   */
  getList: () => api.get<NewsSubscriptionListResponse>('/api/notifications/subscriptions'),

  /**
   * 뉴스 구독 생성
   */
  create: (data: NewsSubscriptionCreate) =>
    api.post<NewsSubscription>('/api/notifications/subscriptions', data),

  /**
   * 뉴스 구독 해제
   */
  delete: (source: string) =>
    api.delete<{ message: string }>(`/api/notifications/subscriptions/${encodeURIComponent(source)}`),
};
