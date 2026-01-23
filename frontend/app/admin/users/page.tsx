'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Ban,
  UserCheck,
  Clock,
  Loader2,
  RefreshCw,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useModerationStore } from '@/store/useModerationStore';
import type { ModerationUser, UserRole, UserStatus } from '@/types/moderation';
import { formatDistanceToNow, format } from 'date-fns';
import { ko } from 'date-fns/locale';

const roleConfig: Record<UserRole, { label: string; color: string; icon: React.ElementType }> = {
  user: { label: '사용자', color: 'bg-gray-500 text-white', icon: Users },
  moderator: { label: '모더레이터', color: 'bg-blue-500 text-white', icon: Shield },
  admin: { label: '관리자', color: 'bg-purple-500 text-white', icon: ShieldCheck },
};

const statusConfig: Record<UserStatus, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: '활성', color: 'bg-green-500 text-white', icon: UserCheck },
  warned: { label: '경고', color: 'bg-yellow-500 text-black', icon: AlertTriangle },
  suspended: { label: '정지', color: 'bg-orange-500 text-white', icon: Clock },
  banned: { label: '차단', color: 'bg-red-500 text-white', icon: Ban },
};

function UserCard({
  user,
  onWarn,
  onSuspend,
  onBan,
  onUnban,
  onChangeRole,
  isProcessing,
}: {
  user: ModerationUser;
  onWarn: (reason: string) => void;
  onSuspend: (hours: number, reason: string) => void;
  onBan: (reason: string) => void;
  onUnban: () => void;
  onChangeRole: (role: UserRole) => void;
  isProcessing: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const [actionType, setActionType] = useState<'warn' | 'suspend' | 'ban' | 'role' | null>(null);
  const [reason, setReason] = useState('');
  const [suspendHours, setSuspendHours] = useState(24);
  const [newRole, setNewRole] = useState<UserRole>(user.role);

  const role = roleConfig[user.role];
  const status = statusConfig[user.status];
  const RoleIcon = role.icon;
  const StatusIcon = status.icon;

  const handleAction = () => {
    if (actionType === 'warn') {
      onWarn(reason);
    } else if (actionType === 'suspend') {
      onSuspend(suspendHours, reason);
    } else if (actionType === 'ban') {
      onBan(reason);
    } else if (actionType === 'role') {
      onChangeRole(newRole);
    }
    setShowActions(false);
    setActionType(null);
    setReason('');
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden relative">
            {user.avatar_url ? (
              <Image src={user.avatar_url} alt={user.display_name} fill className="object-cover" />
            ) : (
              <Users className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold">{user.display_name}</h3>
              <span className="text-sm text-muted-foreground">@{user.username}</span>
              <Badge className={cn("text-xs", role.color)}>
                <RoleIcon className="h-3 w-3 mr-1" />
                {role.label}
              </Badge>
              <Badge className={cn("text-xs", status.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-2">{user.email}</p>

            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>게시글: {user.post_count}</span>
              <span>댓글: {user.comment_count}</span>
              <span>경고: {user.warning_count}</span>
              <span>신고: {user.report_count}</span>
              <span>
                가입: {format(new Date(user.created_at), 'yyyy-MM-dd', { locale: ko })}
              </span>
              {user.last_active_at && (
                <span>
                  최근 활동: {formatDistanceToNow(new Date(user.last_active_at), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </span>
              )}
            </div>

            {/* Ban/Suspend Info */}
            {user.status === 'banned' && user.ban_reason && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-sm">
                <span className="font-medium text-red-600">차단 사유:</span> {user.ban_reason}
              </div>
            )}
            {user.status === 'suspended' && user.suspended_until && (
              <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded text-sm">
                <span className="font-medium text-orange-600">정지 해제:</span>{' '}
                {format(new Date(user.suspended_until), 'yyyy-MM-dd HH:mm', { locale: ko })}
              </div>
            )}
          </div>

          {/* Actions Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowActions(!showActions)}
            disabled={isProcessing}
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>

        {/* Actions Panel */}
        {showActions && (
          <div className="mt-4 pt-4 border-t border-border">
            {actionType === null ? (
              <div className="flex flex-wrap gap-2">
                {user.status !== 'banned' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-yellow-600 border-yellow-600"
                      onClick={() => setActionType('warn')}
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      경고
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-orange-600 border-orange-600"
                      onClick={() => setActionType('suspend')}
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      정지
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setActionType('ban')}
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      차단
                    </Button>
                  </>
                )}
                {user.status === 'banned' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-600"
                    onClick={onUnban}
                    disabled={isProcessing}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    차단 해제
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActionType('role')}
                >
                  <Shield className="h-4 w-4 mr-1" />
                  역할 변경
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowActions(false)}
                >
                  취소
                </Button>
              </div>
            ) : (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                {actionType === 'warn' && (
                  <>
                    <p className="text-sm font-medium">사용자에게 경고를 부여합니다</p>
                    <Input
                      placeholder="경고 사유 (필수)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </>
                )}
                {actionType === 'suspend' && (
                  <>
                    <p className="text-sm font-medium">사용자를 일시 정지합니다</p>
                    <select
                      value={suspendHours}
                      onChange={(e) => setSuspendHours(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background"
                    >
                      <option value={1}>1시간</option>
                      <option value={6}>6시간</option>
                      <option value={12}>12시간</option>
                      <option value={24}>1일</option>
                      <option value={72}>3일</option>
                      <option value={168}>7일</option>
                      <option value={720}>30일</option>
                    </select>
                    <Input
                      placeholder="정지 사유 (필수)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </>
                )}
                {actionType === 'ban' && (
                  <>
                    <p className="text-sm font-medium text-red-600">
                      사용자를 영구 차단합니다
                    </p>
                    <Input
                      placeholder="차단 사유 (필수)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </>
                )}
                {actionType === 'role' && (
                  <>
                    <p className="text-sm font-medium">사용자 역할을 변경합니다</p>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background"
                    >
                      <option value="user">사용자</option>
                      <option value="moderator">모더레이터</option>
                      <option value="admin">관리자</option>
                    </select>
                  </>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAction}
                    disabled={isProcessing || (actionType !== 'role' && !reason)}
                    className={actionType === 'ban' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    확인
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setActionType(null);
                      setReason('');
                    }}
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function UsersPage() {
  const {
    users,
    usersLoading,
    usersTotal,
    userFilters,
    fetchUsers,
    setUserFilters,
    warnUser,
    suspendUser,
    banUser,
    unbanUser,
    changeUserRole,
  } = useModerationStore();

  const [processingId, setProcessingId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    fetchUsers(true);
  }, [fetchUsers, userFilters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setUserFilters({ search: searchInput || undefined });
  };

  const handleUserAction = async (
    userId: number,
    action: () => Promise<void>
  ) => {
    setProcessingId(userId);
    try {
      await action();
    } finally {
      setProcessingId(null);
    }
  };

  const statusOptions = [
    { value: 'all', label: '전체 상태' },
    { value: 'active', label: '활성' },
    { value: 'warned', label: '경고' },
    { value: 'suspended', label: '정지' },
    { value: 'banned', label: '차단' },
  ];

  const roleOptions = [
    { value: 'all', label: '전체 역할' },
    { value: 'user', label: '사용자' },
    { value: 'moderator', label: '모더레이터' },
    { value: 'admin', label: '관리자' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-blue-500" />
            사용자 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            총 {usersTotal}명의 사용자
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchUsers(true)}
          disabled={usersLoading}
          className="gap-2"
        >
          <RefreshCw className={usersLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          새로고침
        </Button>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="이메일, 사용자명, 이름으로 검색..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="outline">검색</Button>
            </form>

            <div className="flex gap-2">
              <select
                value={userFilters.status || 'all'}
                onChange={(e) => setUserFilters({ status: e.target.value as UserStatus | 'all' })}
                className="px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <select
                value={userFilters.role || 'all'}
                onChange={(e) => setUserFilters({ role: e.target.value as UserRole | 'all' })}
                className="px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      {usersLoading && users.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">사용자가 없습니다</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onWarn={(reason) => handleUserAction(user.id, () => warnUser(user.id, reason))}
              onSuspend={(hours, reason) => handleUserAction(user.id, () => suspendUser(user.id, hours, reason))}
              onBan={(reason) => handleUserAction(user.id, () => banUser(user.id, reason))}
              onUnban={() => handleUserAction(user.id, () => unbanUser(user.id))}
              onChangeRole={(role) => handleUserAction(user.id, () => changeUserRole(user.id, role))}
              isProcessing={processingId === user.id}
            />
          ))}

          {users.length < usersTotal && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => fetchUsers(false)}
                disabled={usersLoading}
              >
                {usersLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                더 보기
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
