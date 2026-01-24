'use client';

import {
  Users,
  FileText,
  Flag,
  TrendingUp,
  TrendingDown,
  UserX,
  Activity,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DashboardStats } from '@/types/moderation';

interface StatCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon: React.ElementType;
  iconColor?: string;
  href?: string;
}

function StatCard({ title, value, change, icon: Icon, iconColor = 'text-primary' }: StatCardProps) {
  const hasChange = change !== undefined && change !== 0;
  const isPositive = hasChange && change > 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            {hasChange && (
              <div className={cn(
                "flex items-center gap-1 mt-2 text-sm",
                isPositive ? "text-green-600" : "text-red-600"
              )}>
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
                <span className="text-muted-foreground">vs 어제</span>
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-lg bg-muted/50", iconColor)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsOverviewProps {
  stats: DashboardStats | null;
  isLoading?: boolean;
}

export function StatsOverview({ stats, isLoading }: StatsOverviewProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-24 mb-2" />
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="전체 사용자"
        value={stats.total_users}
        change={stats.new_users_change}
        icon={Users}
        iconColor="text-blue-500"
      />
      <StatCard
        title="오늘 신규 가입"
        value={stats.new_users_today}
        icon={Users}
        iconColor="text-green-500"
      />
      <StatCard
        title="전체 게시글"
        value={stats.total_posts}
        change={stats.new_posts_change}
        icon={FileText}
        iconColor="text-purple-500"
      />
      <StatCard
        title="오늘 새 게시글"
        value={stats.new_posts_today}
        icon={FileText}
        iconColor="text-indigo-500"
      />
      <StatCard
        title="미처리 신고"
        value={stats.pending_reports}
        icon={Flag}
        iconColor={stats.pending_reports > 0 ? "text-red-500" : "text-gray-400"}
      />
      <StatCard
        title="오늘 처리 완료"
        value={stats.resolved_reports_today}
        icon={Flag}
        iconColor="text-green-500"
      />
      <StatCard
        title="24시간 활성 사용자"
        value={stats.active_users_24h}
        icon={Activity}
        iconColor="text-cyan-500"
      />
      <StatCard
        title="차단된 사용자"
        value={stats.banned_users}
        icon={UserX}
        iconColor="text-red-500"
      />
    </div>
  );
}
