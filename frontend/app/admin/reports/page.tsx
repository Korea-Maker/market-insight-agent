'use client';

import { useEffect, useState } from 'react';
import {
  Flag,
  Filter,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  User,
  FileText,
  MessageSquare,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useModerationStore } from '@/store/useModerationStore';
import type { Report, ReportPriority, ReportStatus, ReportTargetType, ReportAction } from '@/types/moderation';
import { formatDistanceToNow, format } from 'date-fns';
import { ko } from 'date-fns/locale';

const statusConfig: Record<ReportStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: '대기 중', color: 'bg-yellow-500 text-black', icon: AlertTriangle },
  reviewed: { label: '검토 중', color: 'bg-blue-500 text-white', icon: Eye },
  resolved: { label: '해결됨', color: 'bg-green-500 text-white', icon: CheckCircle },
  dismissed: { label: '기각', color: 'bg-gray-500 text-white', icon: XCircle },
};

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

function ReportCard({
  report,
  onAction,
  isProcessing,
}: {
  report: Report;
  onAction: (action: ReportAction, reason?: string) => void;
  isProcessing: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const [actionReason, setActionReason] = useState('');

  const status = statusConfig[report.status];
  const priority = priorityConfig[report.priority];
  const targetType = targetTypeConfig[report.target_type];
  const TargetIcon = targetType.icon;
  const StatusIcon = status.icon;

  const handleAction = (action: ReportAction) => {
    onAction(action, actionReason || undefined);
    setShowActions(false);
    setActionReason('');
  };

  return (
    <Card className={cn(
      "transition-all",
      report.priority === 'critical' && "border-red-500/50 shadow-red-500/10 shadow-lg"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn(
            "p-3 rounded-lg",
            report.priority === 'critical' ? "bg-red-100" : "bg-muted"
          )}>
            <TargetIcon className={cn(
              "h-5 w-5",
              report.priority === 'critical' ? "text-red-600" : "text-muted-foreground"
            )} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={cn("text-xs", priority.color)}>
                {priority.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {targetType.label}
              </Badge>
              <Badge className={cn("text-xs", status.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>

            <h3 className="font-semibold mb-1">
              {reasonLabels[report.reason] || report.reason}
            </h3>

            {report.description && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {report.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                신고자: {report.reporter?.display_name || '알 수 없음'}
              </span>
              <span>
                {formatDistanceToNow(new Date(report.created_at), {
                  addSuffix: true,
                  locale: ko,
                })}
              </span>
            </div>

            {/* Actions */}
            {report.status === 'pending' && (
              <div className="mt-4">
                {!showActions ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowActions(true)}
                    disabled={isProcessing}
                  >
                    처리하기
                  </Button>
                ) : (
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                    <Input
                      placeholder="처리 사유 (선택)"
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      className="text-sm"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction('dismiss')}
                        disabled={isProcessing}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        기각
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-yellow-600 border-yellow-600"
                        onClick={() => handleAction('warn_user')}
                        disabled={isProcessing}
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        경고
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-orange-600 border-orange-600"
                        onClick={() => handleAction('remove_content')}
                        disabled={isProcessing}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        콘텐츠 숨김
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction('ban_user')}
                        disabled={isProcessing}
                      >
                        <User className="h-4 w-4 mr-1" />
                        사용자 차단
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowActions(false)}
                      className="w-full"
                    >
                      취소
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Resolution Info */}
            {report.status !== 'pending' && report.reviewed_by && (
              <div className="mt-3 pt-3 border-t border-border text-sm">
                <p className="text-muted-foreground">
                  처리: {report.reviewed_by.display_name}
                  {report.reviewed_at && (
                    <span className="ml-2">
                      ({format(new Date(report.reviewed_at), 'yyyy-MM-dd HH:mm', { locale: ko })})
                    </span>
                  )}
                </p>
                {report.resolution_note && (
                  <p className="mt-1">{report.resolution_note}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const {
    reports,
    reportsLoading,
    reportsTotal,
    reportFilters,
    fetchReports,
    setReportFilters,
    handleReport,
  } = useModerationStore();

  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetchReports(true);
  }, [fetchReports, reportFilters]);

  const handleReportAction = async (reportId: number, action: ReportAction, reason?: string) => {
    setProcessingId(reportId);
    try {
      await handleReport(reportId, action, reason);
    } finally {
      setProcessingId(null);
    }
  };

  const statusOptions = [
    { value: 'all', label: '전체' },
    { value: 'pending', label: '대기 중' },
    { value: 'reviewed', label: '검토 중' },
    { value: 'resolved', label: '해결됨' },
    { value: 'dismissed', label: '기각' },
  ];

  const priorityOptions = [
    { value: 'all', label: '전체' },
    { value: 'critical', label: '긴급' },
    { value: 'high', label: '높음' },
    { value: 'medium', label: '보통' },
    { value: 'low', label: '낮음' },
  ];

  const typeOptions = [
    { value: 'all', label: '전체' },
    { value: 'post', label: '게시글' },
    { value: 'comment', label: '댓글' },
    { value: 'user', label: '사용자' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flag className="h-7 w-7 text-orange-500" />
            신고 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            총 {reportsTotal}건의 신고
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchReports(true)}
          disabled={reportsLoading}
          className="gap-2"
        >
          <RefreshCw className={reportsLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          새로고침
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">필터</span>
            </div>

            <select
              value={reportFilters.status || 'all'}
              onChange={(e) => setReportFilters({ status: e.target.value as ReportStatus | 'all' })}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={reportFilters.priority || 'all'}
              onChange={(e) => setReportFilters({ priority: e.target.value as ReportPriority | 'all' })}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              {priorityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={reportFilters.target_type || 'all'}
              onChange={(e) => setReportFilters({ target_type: e.target.value as ReportTargetType | 'all' })}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      {reportsLoading && reports.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Flag className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">신고가 없습니다</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onAction={(action, reason) => handleReportAction(report.id, action, reason)}
              isProcessing={processingId === report.id}
            />
          ))}

          {reports.length < reportsTotal && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => fetchReports(false)}
                disabled={reportsLoading}
              >
                {reportsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                더 보기
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
