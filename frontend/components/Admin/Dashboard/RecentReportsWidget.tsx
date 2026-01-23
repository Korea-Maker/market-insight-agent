'use client';

import Link from 'next/link';
import { Flag, AlertTriangle, User, FileText, MessageSquare, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Report, ReportPriority, ReportTargetType } from '@/types/moderation';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

const priorityConfig: Record<ReportPriority, { label: string; color: string }> = {
  critical: { label: '긴급', color: 'bg-red-500 text-white' },
  high: { label: '높음', color: 'bg-orange-500 text-white' },
  medium: { label: '보통', color: 'bg-yellow-500 text-black' },
  low: { label: '낮음', color: 'bg-gray-400 text-white' },
};

const targetTypeConfig: Record<ReportTargetType, { label: string; icon: React.ElementType }> = {
  post: { label: '게시글', icon: FileText },
  comment: { label: '댓글', icon: MessageSquare },
  user: { label: '사용자', icon: User },
};

const reasonLabels: Record<string, string> = {
  spam: '스팸',
  harassment: '괴롭힘',
  inappropriate: '부적절한 콘텐츠',
  misinformation: '허위 정보',
  copyright: '저작권 침해',
  other: '기타',
};

interface RecentReportsWidgetProps {
  reports: Report[];
  isLoading?: boolean;
}

export function RecentReportsWidget({ reports, isLoading }: RecentReportsWidgetProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flag className="h-5 w-5" />
            최근 신고
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-8 h-8 bg-muted-foreground/20 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flag className="h-5 w-5 text-orange-500" />
          최근 신고
        </CardTitle>
        <Link
          href="/admin/reports"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          전체 보기
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Flag className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>처리 대기 중인 신고가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.slice(0, 5).map((report) => {
              const priority = priorityConfig[report.priority];
              const targetType = targetTypeConfig[report.target_type];
              const TargetIcon = targetType.icon;

              return (
                <Link
                  key={report.id}
                  href={`/admin/reports?id=${report.id}`}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className={cn(
                    "p-2 rounded-full",
                    report.priority === 'critical' ? "bg-red-100" : "bg-orange-100"
                  )}>
                    <TargetIcon className={cn(
                      "h-4 w-4",
                      report.priority === 'critical' ? "text-red-600" : "text-orange-600"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn("text-xs", priority.color)}>
                        {priority.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {targetType.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate">
                      {reasonLabels[report.reason] || report.reason}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(report.created_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </p>
                  </div>
                  {report.priority === 'critical' && (
                    <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
