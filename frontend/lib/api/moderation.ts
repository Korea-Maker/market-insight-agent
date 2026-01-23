/**
 * 관리자 API 클라이언트
 */
import { api } from '../api';
import type {
  DashboardStats,
  Report,
  ReportListResponse,
  ReportFilters,
  ReportActionRequest,
  ModerationUser,
  UserListResponse,
  UserFilters,
  UserWarnRequest,
  UserSuspendRequest,
  UserBanRequest,
  UserRoleUpdateRequest,
  ModerationPost,
  PostListModerationResponse,
  PostModerationFilters,
  ModerationComment,
  CommentListModerationResponse,
  CommentModerationFilters,
  ContentHideRequest,
  ModerationLog,
  ModerationLogListResponse,
  UserWarning,
} from '@/types/moderation';

export const adminApi = {
  // ============================================
  // 대시보드
  // ============================================
  getStats: () => api.get<DashboardStats>('/api/admin/stats'),

  // ============================================
  // 신고 관리
  // ============================================
  getReports: (params?: {
    status?: string;
    target_type?: string;
    priority?: string;
    skip?: number;
    limit?: number;
  }) => api.get<ReportListResponse>('/api/admin/reports', params),

  getReport: (reportId: number) =>
    api.get<Report>(`/api/admin/reports/${reportId}`),

  handleReport: (reportId: number, data: ReportActionRequest) =>
    api.post(`/api/admin/reports/${reportId}/action`, data),

  // ============================================
  // 사용자 관리
  // ============================================
  getUsers: (params?: {
    status?: string;
    role?: string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
    skip?: number;
    limit?: number;
  }) => api.get<UserListResponse>('/api/admin/users', params),

  getUser: (userId: number) =>
    api.get<ModerationUser>(`/api/admin/users/${userId}`),

  warnUser: (userId: number, data: UserWarnRequest) =>
    api.post(`/api/admin/users/${userId}/warn`, data),

  suspendUser: (userId: number, data: UserSuspendRequest) =>
    api.post(`/api/admin/users/${userId}/suspend`, data),

  banUser: (userId: number, data: UserBanRequest) =>
    api.post(`/api/admin/users/${userId}/ban`, data),

  unbanUser: (userId: number) =>
    api.post(`/api/admin/users/${userId}/unban`),

  updateUserRole: (userId: number, data: UserRoleUpdateRequest) =>
    api.patch(`/api/admin/users/${userId}/role`, data),

  getUserWarnings: (userId: number) =>
    api.get<{ warnings: UserWarning[]; total: number }>(`/api/admin/users/${userId}/warnings`),

  // ============================================
  // 게시글 관리
  // ============================================
  getPosts: (params?: {
    status?: string;
    has_reports?: boolean;
    category?: string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
    skip?: number;
    limit?: number;
  }) => api.get<PostListModerationResponse>('/api/admin/posts', params),

  hidePost: (postId: number, data: ContentHideRequest) =>
    api.post(`/api/admin/posts/${postId}/hide`, data),

  unhidePost: (postId: number) =>
    api.post(`/api/admin/posts/${postId}/unhide`),

  deletePost: (postId: number, reason: string) =>
    api.delete(`/api/admin/posts/${postId}?reason=${encodeURIComponent(reason)}`),

  // ============================================
  // 댓글 관리
  // ============================================
  getComments: (params?: {
    status?: string;
    has_reports?: boolean;
    search?: string;
    sort_by?: string;
    sort_order?: string;
    skip?: number;
    limit?: number;
  }) => api.get<CommentListModerationResponse>('/api/admin/comments', params),

  hideComment: (commentId: number, data: ContentHideRequest) =>
    api.post(`/api/admin/comments/${commentId}/hide`, data),

  deleteComment: (commentId: number, reason: string) =>
    api.delete(`/api/admin/comments/${commentId}?reason=${encodeURIComponent(reason)}`),

  // ============================================
  // 관리 로그
  // ============================================
  getLogs: (params?: {
    action_type?: string;
    target_type?: string;
    moderator_id?: number;
    skip?: number;
    limit?: number;
  }) => api.get<ModerationLogListResponse>('/api/admin/logs', params),
};
