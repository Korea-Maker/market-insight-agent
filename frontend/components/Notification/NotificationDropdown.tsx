'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, Check, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationStore } from '@/store/useNotificationStore';
import { notificationsApi } from '@/lib/api/notifications';
import { NotificationItem } from './NotificationItem';
import type { Notification } from '@/types/notification';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    setNotifications,
    setUnreadCount,
    setLoading,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotificationStore();

  const [error, setError] = useState<string | null>(null);

  /**
   * 알림 목록 조회
   */
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await notificationsApi.getList({ limit: 20 });
      setNotifications(response.items);
      setUnreadCount(response.unread_count);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('알림을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, [setNotifications, setUnreadCount, setLoading]);

  /**
   * 알림 읽음 처리
   */
  const handleRead = async (id: number) => {
    try {
      await notificationsApi.markAsRead(id);
      markAsRead(id);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  /**
   * 전체 읽음 처리
   */
  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  /**
   * 알림 삭제
   */
  const handleDelete = async (id: number) => {
    try {
      await notificationsApi.delete(id);
      removeNotification(id);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  /**
   * 알림 클릭 처리
   */
  const handleClick = (notification: Notification) => {
    // 가격 알림의 경우 대시보드로 이동
    if (notification.type === 'price_alert' && notification.data) {
      const symbol = notification.data.symbol as string;
      if (symbol) {
        window.location.href = `/dashboard?symbol=${symbol}`;
        onClose();
      }
    }
    // 뉴스 알림의 경우 뉴스 페이지로 이동
    else if (notification.type === 'news' && notification.data) {
      const newsId = notification.data.news_id as number;
      if (newsId) {
        window.location.href = `/news/${newsId}`;
        onClose();
      }
    }
  };

  // 드롭다운이 열릴 때 알림 목록 조회
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-background border border-border rounded-xl shadow-xl overflow-hidden z-50">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">알림</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* 새로고침 */}
          <button
            onClick={fetchNotifications}
            disabled={isLoading}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="새로고침"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>

          {/* 전체 읽음 */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="전체 읽음 처리"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 알림 목록 */}
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={fetchNotifications}
              className="mt-2 text-sm text-primary hover:underline"
            >
              다시 시도
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Bell className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">알림이 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={handleRead}
                onDelete={handleDelete}
                onClick={handleClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* 푸터 */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-muted/30">
          <button
            onClick={() => {
              window.location.href = '/notifications';
              onClose();
            }}
            className="w-full text-center text-sm text-primary hover:underline"
          >
            모든 알림 보기
          </button>
        </div>
      )}
    </div>
  );
}
