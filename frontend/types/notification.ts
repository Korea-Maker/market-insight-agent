/**
 * 알림 시스템 타입 정의
 */

// 알림 유형
export type NotificationType = 'price_alert' | 'news' | 'system';

// 알림 우선순위
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

// 가격 알림 조건
export type AlertCondition = 'above' | 'below' | 'cross';

// 알림 인터페이스
export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority: NotificationPriority;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  expires_at?: string;
}

// 알림 목록 응답
export interface NotificationListResponse {
  items: Notification[];
  total: number;
  unread_count: number;
}

// 읽지 않은 알림 수 응답
export interface UnreadCountResponse {
  count: number;
}

// 가격 알림 인터페이스
export interface PriceAlert {
  id: number;
  symbol: string;
  condition: AlertCondition;
  target_price: number;
  is_active: boolean;
  is_triggered: boolean;
  triggered_at?: string;
  is_recurring: boolean;
  cooldown_mins: number;
  last_notified?: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

// 가격 알림 생성 요청
export interface PriceAlertCreate {
  symbol: string;
  condition: AlertCondition;
  target_price: number;
  is_recurring?: boolean;
  cooldown_mins?: number;
  note?: string;
}

// 가격 알림 수정 요청
export interface PriceAlertUpdate {
  symbol?: string;
  condition?: AlertCondition;
  target_price?: number;
  is_active?: boolean;
  is_recurring?: boolean;
  cooldown_mins?: number;
  note?: string;
}

// 가격 알림 목록 응답
export interface PriceAlertListResponse {
  items: PriceAlert[];
  total: number;
}

// 알림 설정 인터페이스
export interface NotificationPreference {
  id: number;
  user_id: number;
  price_alerts: boolean;
  news_alerts: boolean;
  system_alerts: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  quiet_start?: string;
  quiet_end?: string;
  created_at: string;
  updated_at: string;
}

// 알림 설정 수정 요청
export interface NotificationPreferenceUpdate {
  price_alerts?: boolean;
  news_alerts?: boolean;
  system_alerts?: boolean;
  email_enabled?: boolean;
  push_enabled?: boolean;
  quiet_start?: string;
  quiet_end?: string;
}

// 뉴스 구독 인터페이스
export interface NewsSubscription {
  id: number;
  source: string;
  keywords?: string[];
  is_active: boolean;
  created_at: string;
}

// 뉴스 구독 생성 요청
export interface NewsSubscriptionCreate {
  source: string;
  keywords?: string[];
}

// 뉴스 구독 목록 응답
export interface NewsSubscriptionListResponse {
  items: NewsSubscription[];
  total: number;
}

// WebSocket 알림 메시지
export interface WebSocketNotification {
  type: NotificationType | 'connected' | 'heartbeat' | 'error' | 'warning';
  id?: string;
  timestamp?: string;
  priority?: NotificationPriority;
  data?: Record<string, unknown>;
  title?: string;
  message?: string;
  code?: string;
  user_id?: number;
}

// 알림 스토어 상태
export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  wsStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  priceAlerts: PriceAlert[];
  preferences: NotificationPreference | null;
}

// 알림 스토어 액션
export interface NotificationActions {
  // Notifications
  addNotification: (notification: Notification) => void;
  setNotifications: (notifications: Notification[]) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  removeNotification: (id: number) => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  setWsStatus: (status: NotificationState['wsStatus']) => void;

  // Price Alerts
  setPriceAlerts: (alerts: PriceAlert[]) => void;
  addPriceAlert: (alert: PriceAlert) => void;
  updatePriceAlert: (id: number, updates: Partial<PriceAlert>) => void;
  removePriceAlert: (id: number) => void;

  // Preferences
  setPreferences: (preferences: NotificationPreference) => void;

  // Reset
  reset: () => void;
}

export type NotificationStore = NotificationState & NotificationActions;
