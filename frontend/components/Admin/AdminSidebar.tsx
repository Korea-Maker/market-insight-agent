'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Flag,
  Users,
  FileText,
  MessageSquare,
  BarChart3,
  Shield,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModerationStore } from '@/store/useModerationStore';
import { useEffect } from 'react';

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { stats, fetchStats } = useModerationStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const sidebarItems: SidebarItem[] = [
    {
      icon: LayoutDashboard,
      label: '대시보드',
      href: '/admin',
    },
    {
      icon: Flag,
      label: '신고 관리',
      href: '/admin/reports',
      badge: stats?.pending_reports,
    },
    {
      icon: Users,
      label: '사용자 관리',
      href: '/admin/users',
    },
    {
      icon: FileText,
      label: '게시글 관리',
      href: '/admin/posts',
    },
    {
      icon: MessageSquare,
      label: '댓글 관리',
      href: '/admin/comments',
    },
    {
      icon: BarChart3,
      label: '활동 로그',
      href: '/admin/logs',
    },
  ];

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">Admin</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs font-semibold rounded-full',
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-destructive text-destructive-foreground'
                  )}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>사이트로 돌아가기</span>
        </Link>
      </div>
    </aside>
  );
}
