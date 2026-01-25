'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useNotificationStore,
  selectUnreadCount,
  selectWsStatus,
} from '@/store/useNotificationStore';
import { useNotifications } from '@/hooks/useNotifications';
import { notificationsApi } from '@/lib/api/notifications';
import { NotificationDropdown } from './NotificationDropdown';
import { NotificationToast } from './NotificationToast';
import type { Notification } from '@/types/notification';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<Notification | null>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use individual selectors to avoid infinite loop from object reference changes
  const unreadCount = useNotificationStore(selectUnreadCount);
  const wsStatus = useNotificationStore(selectWsStatus);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  // 새 알림 수신 시 토스트 표시
  const handleNotification = useCallback((notification: Notification) => {
    setToastNotification(notification);
  }, []);

  // WebSocket 연결
  useNotifications({
    onNotification: handleNotification,
  });

  // 읽지 않은 알림 수 초기 조회
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await notificationsApi.getUnreadCount();
        setUnreadCount(response.count);
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
      }
    };

    fetchUnreadCount();
  }, [setUnreadCount]);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        bellRef.current &&
        dropdownRef.current &&
        !bellRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleToastClose = () => {
    setToastNotification(null);
  };

  // 연결 상태에 따른 아이콘 스타일
  const getStatusIndicator = () => {
    switch (wsStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500 animate-pulse';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* 벨 버튼 */}
      <button
        ref={bellRef}
        onClick={handleToggle}
        className={cn(
          'relative flex items-center justify-center w-9 h-9 rounded-full',
          'text-muted-foreground hover:text-foreground',
          'hover:bg-muted/50 transition-all',
          isOpen && 'bg-muted/50 text-foreground'
        )}
        title="알림"
      >
        <Bell className="w-4.5 h-4.5" />

        {/* 읽지 않은 알림 뱃지 */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full animate-in zoom-in-50 duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* WebSocket 연결 상태 표시 */}
        <span
          className={cn(
            'absolute bottom-0 right-0 w-2 h-2 rounded-full border border-background',
            getStatusIndicator()
          )}
          title={`연결 상태: ${wsStatus}`}
        />
      </button>

      {/* 드롭다운 */}
      <div ref={dropdownRef}>
        <NotificationDropdown isOpen={isOpen} onClose={handleClose} />
      </div>

      {/* 토스트 알림 */}
      {toastNotification && (
        <NotificationToast
          notification={toastNotification}
          onClose={handleToastClose}
        />
      )}
    </div>
  );
}
