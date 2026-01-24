'use client';

import { useEffect } from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatsOverview } from '@/components/Admin/Dashboard/StatsOverview';
import { RecentReportsWidget } from '@/components/Admin/Dashboard/RecentReportsWidget';
import { ModerationQueueWidget } from '@/components/Admin/Dashboard/ModerationQueueWidget';
import { useModerationStore } from '@/store/useModerationStore';

export default function AdminDashboardPage() {
  const {
    stats,
    statsLoading,
    reports,
    reportsLoading,
    fetchStats,
    fetchReports,
    setReportFilters,
  } = useModerationStore();

  useEffect(() => {
    fetchStats();
    setReportFilters({ status: 'pending' });
    fetchReports(true);
  }, [fetchStats, fetchReports, setReportFilters]);

  const handleRefresh = () => {
    fetchStats();
    fetchReports(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            관리자 대시보드
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            커뮤니티 현황을 한눈에 확인하세요
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={statsLoading}
          className="gap-2"
        >
          <RefreshCw className={statsLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          새로고침
        </Button>
      </div>

      {/* Stats Overview */}
      <StatsOverview stats={stats} isLoading={statsLoading} />

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentReportsWidget
          reports={reports.filter(r => r.status === 'pending')}
          isLoading={reportsLoading}
        />
        <ModerationQueueWidget stats={stats} isLoading={statsLoading} />
      </div>
    </div>
  );
}
