'use client';

import { useEffect, useState } from 'react';
import { X, TrendingUp, Newspaper, AlertCircle, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType, NotificationPriority } from '@/types/notification';

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  duration?: number;
}

const typeIcons: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  price_alert: TrendingUp,
  news: Newspaper,
  system: AlertCircle,
};

const priorityStyles: Record<NotificationPriority, string> = {
  low: 'border-border',
  medium: 'border-blue-500/50',
  high: 'border-orange-500/50',
  urgent: 'border-red-500/50 animate-pulse',
};

const priorityBg: Record<NotificationPriority, string> = {
  low: 'bg-muted/10',
  medium: 'bg-blue-500/10',
  high: 'bg-orange-500/10',
  urgent: 'bg-red-500/10',
};

export function NotificationToast({
  notification,
  onClose,
  duration = 5000,
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const Icon = typeIcons[notification.type] || Bell;

  useEffect(() => {
    // 애니메이션을 위해 마운트 후 visible 설정
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // 자동 닫기 타이머
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  };

  const handleClick = () => {
    // 가격 알림의 경우 대시보드로 이동
    if (notification.type === 'price_alert' && notification.data) {
      const symbol = notification.data.symbol as string;
      if (symbol) {
        window.location.href = `/dashboard?symbol=${symbol}`;
      }
    }
    // 뉴스 알림의 경우 뉴스 페이지로 이동
    else if (notification.type === 'news' && notification.data) {
      const newsId = notification.data.news_id as number;
      if (newsId) {
        window.location.href = `/news/${newsId}`;
      }
    }
    handleClose();
  };

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-[100] w-80 sm:w-96',
        'transform transition-all duration-300 ease-out',
        isVisible && !isLeaving
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0'
      )}
    >
      <div
        className={cn(
          'relative flex items-start gap-3 p-4 rounded-xl border-l-4 cursor-pointer',
          'bg-background/95 backdrop-blur-xl shadow-2xl',
          'hover:bg-background transition-colors',
          priorityStyles[notification.priority],
          priorityBg[notification.priority]
        )}
        onClick={handleClick}
      >
        {/* 아이콘 */}
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
            'bg-background shadow-inner'
          )}
        >
          <Icon
            className={cn(
              'w-5 h-5',
              notification.priority === 'urgent'
                ? 'text-red-500'
                : notification.priority === 'high'
                  ? 'text-orange-500'
                  : notification.priority === 'medium'
                    ? 'text-blue-500'
                    : 'text-muted-foreground'
            )}
          />
        </div>

        {/* 내용 */}
        <div className="flex-1 min-w-0 pr-6">
          <p className="text-sm font-semibold text-foreground truncate">
            {notification.title}
          </p>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {notification.message}
          </p>
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 프로그레스 바 */}
        <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-xl">
          <div
            className="h-full bg-primary/30 origin-left"
            style={{
              animation: `shrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes shrink {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
      `}</style>
    </div>
  );
}
