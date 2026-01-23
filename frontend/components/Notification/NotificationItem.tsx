'use client';

import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Bell, TrendingUp, Newspaper, AlertCircle, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType, NotificationPriority } from '@/types/notification';

interface NotificationItemProps {
  notification: Notification;
  onRead?: (id: number) => void;
  onDelete?: (id: number) => void;
  onClick?: (notification: Notification) => void;
}

const typeIcons: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  price_alert: TrendingUp,
  news: Newspaper,
  system: AlertCircle,
};

const priorityColors: Record<NotificationPriority, string> = {
  low: 'text-muted-foreground',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
};

const priorityBgColors: Record<NotificationPriority, string> = {
  low: 'bg-muted/50',
  medium: 'bg-blue-500/10',
  high: 'bg-orange-500/10',
  urgent: 'bg-red-500/10',
};

export function NotificationItem({
  notification,
  onRead,
  onDelete,
  onClick,
}: NotificationItemProps) {
  const Icon = typeIcons[notification.type] || Bell;
  const priorityColor = priorityColors[notification.priority];
  const priorityBg = priorityBgColors[notification.priority];

  const handleClick = () => {
    if (!notification.is_read && onRead) {
      onRead(notification.id);
    }
    if (onClick) {
      onClick(notification);
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRead) {
      onRead(notification.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(notification.id);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ko,
  });

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 p-3 cursor-pointer transition-colors',
        'hover:bg-muted/50',
        !notification.is_read && 'bg-primary/5'
      )}
      onClick={handleClick}
    >
      {/* 읽지 않음 표시 */}
      {!notification.is_read && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      )}

      {/* 아이콘 */}
      <div
        className={cn(
          'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
          priorityBg
        )}
      >
        <Icon className={cn('w-4 h-4', priorityColor)} />
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0 pr-6">
        <p
          className={cn(
            'text-sm font-medium truncate',
            notification.is_read ? 'text-muted-foreground' : 'text-foreground'
          )}
        >
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo}</p>
      </div>

      {/* 액션 버튼들 */}
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.is_read && (
          <button
            onClick={handleMarkAsRead}
            className="p-1.5 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="읽음 처리"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="삭제"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
