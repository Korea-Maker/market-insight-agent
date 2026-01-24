'use client';

import Link from 'next/link';
import { Clock, ArrowRight, FileText, MessageSquare, User } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DashboardStats } from '@/types/moderation';

interface QueueItem {
  title: string;
  count: number;
  icon: React.ElementType;
  href: string;
  color: string;
}

interface ModerationQueueWidgetProps {
  stats: DashboardStats | null;
  isLoading?: boolean;
}

export function ModerationQueueWidget({ stats, isLoading }: ModerationQueueWidgetProps) {
  if (isLoading || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            관리 대기열
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const queueItems: QueueItem[] = [
    {
      title: '미처리 신고',
      count: stats.pending_reports,
      icon: Clock,
      href: '/admin/reports?status=pending',
      color: stats.pending_reports > 0 ? 'text-red-500' : 'text-gray-400',
    },
    {
      title: '숨겨진 게시글',
      count: stats.hidden_posts,
      icon: FileText,
      href: '/admin/posts?status=hidden',
      color: 'text-orange-500',
    },
    {
      title: '숨겨진 댓글',
      count: stats.hidden_comments,
      icon: MessageSquare,
      href: '/admin/comments?status=hidden',
      color: 'text-yellow-500',
    },
    {
      title: '차단된 사용자',
      count: stats.banned_users,
      icon: User,
      href: '/admin/users?status=banned',
      color: 'text-red-500',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-blue-500" />
          관리 대기열
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {queueItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg bg-background", item.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      item.count > 0 ? item.color : "text-muted-foreground"
                    )}>
                      {item.count}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
