/**
 * 관리자 대시보드 관련 타입 정의
 */

import type { Author, User } from './auth';

// ============================================
// 사용자 역할 및 상태
// ============================================

export type UserRole = 'user' | 'moderator' | 'admin';
export type UserStatus = 'active' | 'warned' | 'suspended' | 'banned';

// ============================================
// 신고 관련 타입
// ============================================

export type ReportTargetType = 'post' | 'comment' | 'user';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate'
  | 'misinformation'
  | 'copyright'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';
export type ReportPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Report {
  id: number;
  reporter: Author;
  target_type: ReportTargetType;
  target_id: number;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  reviewed_by: Author | null;
  reviewed_at: string | null;
  resolution_note: string | null;
  created_at: string;
}

export interface ReportWithTarget extends Report {
  target?: {
    type: ReportTargetType;
    title?: string;
    content?: string;
    author?: Author;
  };
}

export interface ReportFilters {
  status?: ReportStatus | 'all';
  target_type?: ReportTargetType | 'all';
  priority?: ReportPriority | 'all';
  search?: string;
}

export type ReportAction = 'dismiss' | 'warn_user' | 'remove_content' | 'ban_user';

// ============================================
// 관리자용 사용자 타입
// ============================================

export interface ModerationUser extends User {
  role: UserRole;
  status: UserStatus;
  warning_count: number;
  report_count: number;
  post_count: number;
  comment_count: number;
  last_active_at: string | null;
  suspended_until: string | null;
  banned_at: string | null;
  ban_reason: string | null;
}

export interface UserFilters {
  status?: UserStatus | 'all';
  role?: UserRole | 'all';
  search?: string;
  sort_by?: 'created_at' | 'last_active_at' | 'report_count' | 'warning_count';
  sort_order?: 'asc' | 'desc';
}

export type UserAction =
  | { type: 'warn'; reason: string }
  | { type: 'suspend'; duration_hours: number; reason: string }
  | { type: 'ban'; reason: string }
  | { type: 'unban' }
  | { type: 'change_role'; role: UserRole };

// ============================================
// 관리자용 게시글/댓글 타입
// ============================================

export type ContentStatus = 'published' | 'hidden' | 'deleted';

export interface ModerationPost {
  id: number;
  title: string;
  content: string;
  category: string;
  author: Author;
  status: ContentStatus;
  report_count: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  last_reported_at: string | null;
}

export interface ModerationComment {
  id: number;
  content: string;
  post_id: number;
  post_title: string;
  author: Author;
  status: ContentStatus;
  report_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
  last_reported_at: string | null;
}

export interface PostModerationFilters {
  status?: ContentStatus | 'all';
  category?: string;
  has_reports?: boolean;
  search?: string;
  sort_by?: 'created_at' | 'report_count' | 'view_count';
  sort_order?: 'asc' | 'desc';
}

export interface CommentModerationFilters {
  status?: ContentStatus | 'all';
  has_reports?: boolean;
  search?: string;
  sort_by?: 'created_at' | 'report_count';
  sort_order?: 'asc' | 'desc';
}

export type PostAction =
  | { type: 'hide'; reason: string }
  | { type: 'unhide' }
  | { type: 'delete'; reason: string }
  | { type: 'restore' }
  | { type: 'pin' }
  | { type: 'unpin' };

export type CommentAction =
  | { type: 'hide'; reason: string }
  | { type: 'unhide' }
  | { type: 'delete'; reason: string }
  | { type: 'restore' };

// ============================================
// 관리 로그 타입
// ============================================

export type ModerationActionType =
  | 'warn_user'
  | 'suspend_user'
  | 'ban_user'
  | 'unban_user'
  | 'change_role'
  | 'hide_post'
  | 'unhide_post'
  | 'delete_post'
  | 'restore_post'
  | 'hide_comment'
  | 'unhide_comment'
  | 'delete_comment'
  | 'restore_comment'
  | 'handle_report';

export interface ModerationLog {
  id: number;
  moderator: Author;
  action_type: ModerationActionType;
  target_type: 'user' | 'post' | 'comment' | 'report';
  target_id: number;
  reason: string | null;
  extra_data: Record<string, unknown> | null;
  created_at: string;
}

// ============================================
// 대시보드 통계 타입
// ============================================

export interface DashboardStats {
  total_users: number;
  new_users_today: number;
  new_users_change: number;
  total_posts: number;
  new_posts_today: number;
  new_posts_change: number;
  total_comments: number;
  new_comments_today: number;
  pending_reports: number;
  resolved_reports_today: number;
  active_users_24h: number;
  banned_users: number;
  hidden_posts: number;
  hidden_comments: number;
}

// ============================================
// 경고 타입
// ============================================

export interface UserWarning {
  id: number;
  user_id: number;
  moderator: Author;
  reason: string;
  acknowledged: boolean;
  created_at: string;
}

// ============================================
// API 응답 타입
// ============================================

export interface ReportListResponse {
  reports: Report[];
  total: number;
  skip: number;
  limit: number;
}

export interface UserListResponse {
  users: ModerationUser[];
  total: number;
  skip: number;
  limit: number;
}

export interface PostListModerationResponse {
  posts: ModerationPost[];
  total: number;
  skip: number;
  limit: number;
}

export interface CommentListModerationResponse {
  comments: ModerationComment[];
  total: number;
  skip: number;
  limit: number;
}

export interface ModerationLogListResponse {
  logs: ModerationLog[];
  total: number;
  skip: number;
  limit: number;
}

// ============================================
// API 요청 타입
// ============================================

export interface ReportActionRequest {
  action: ReportAction;
  reason?: string;
}

export interface UserWarnRequest {
  reason: string;
}

export interface UserSuspendRequest {
  duration_hours: number;
  reason: string;
}

export interface UserBanRequest {
  reason: string;
}

export interface UserRoleUpdateRequest {
  role: UserRole;
}

export interface ContentHideRequest {
  reason: string;
}

export interface CreateReportRequest {
  target_type: ReportTargetType;
  target_id: number;
  reason: ReportReason;
  description?: string;
}
