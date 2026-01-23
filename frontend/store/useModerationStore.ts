/**
 * 관리자 대시보드 상태 관리 스토어
 */
import { create } from 'zustand';
import { adminApi } from '@/lib/api/moderation';
import type {
  DashboardStats,
  Report,
  ReportFilters,
  ReportAction,
  ModerationUser,
  UserFilters,
  UserRole,
  ModerationPost,
  PostModerationFilters,
  ModerationComment,
  CommentModerationFilters,
  ModerationLog,
} from '@/types/moderation';

interface ModerationState {
  // 대시보드 통계
  stats: DashboardStats | null;
  statsLoading: boolean;

  // 신고 관리
  reports: Report[];
  reportsLoading: boolean;
  reportsTotal: number;
  reportFilters: ReportFilters;
  selectedReport: Report | null;

  // 사용자 관리
  users: ModerationUser[];
  usersLoading: boolean;
  usersTotal: number;
  userFilters: UserFilters;
  selectedUser: ModerationUser | null;

  // 게시글 관리
  posts: ModerationPost[];
  postsLoading: boolean;
  postsTotal: number;
  postFilters: PostModerationFilters;

  // 댓글 관리
  comments: ModerationComment[];
  commentsLoading: boolean;
  commentsTotal: number;
  commentFilters: CommentModerationFilters;

  // 관리 로그
  logs: ModerationLog[];
  logsLoading: boolean;
  logsTotal: number;

  // Actions
  fetchStats: () => Promise<void>;

  // Report Actions
  fetchReports: (reset?: boolean) => Promise<void>;
  setReportFilters: (filters: Partial<ReportFilters>) => void;
  handleReport: (reportId: number, action: ReportAction, reason?: string) => Promise<void>;
  selectReport: (report: Report | null) => void;

  // User Actions
  fetchUsers: (reset?: boolean) => Promise<void>;
  setUserFilters: (filters: Partial<UserFilters>) => void;
  warnUser: (userId: number, reason: string) => Promise<void>;
  suspendUser: (userId: number, durationHours: number, reason: string) => Promise<void>;
  banUser: (userId: number, reason: string) => Promise<void>;
  unbanUser: (userId: number) => Promise<void>;
  changeUserRole: (userId: number, role: UserRole) => Promise<void>;
  selectUser: (user: ModerationUser | null) => void;

  // Post Actions
  fetchPosts: (reset?: boolean) => Promise<void>;
  setPostFilters: (filters: Partial<PostModerationFilters>) => void;
  hidePost: (postId: number, reason: string) => Promise<void>;
  unhidePost: (postId: number) => Promise<void>;
  deletePost: (postId: number, reason: string) => Promise<void>;

  // Comment Actions
  fetchComments: (reset?: boolean) => Promise<void>;
  setCommentFilters: (filters: Partial<CommentModerationFilters>) => void;
  hideComment: (commentId: number, reason: string) => Promise<void>;
  deleteComment: (commentId: number, reason: string) => Promise<void>;

  // Log Actions
  fetchLogs: (reset?: boolean) => Promise<void>;
}

const ITEMS_PER_PAGE = 20;

export const useModerationStore = create<ModerationState>((set, get) => ({
  // 초기 상태
  stats: null,
  statsLoading: false,

  reports: [],
  reportsLoading: false,
  reportsTotal: 0,
  reportFilters: {},
  selectedReport: null,

  users: [],
  usersLoading: false,
  usersTotal: 0,
  userFilters: {},
  selectedUser: null,

  posts: [],
  postsLoading: false,
  postsTotal: 0,
  postFilters: {},

  comments: [],
  commentsLoading: false,
  commentsTotal: 0,
  commentFilters: {},

  logs: [],
  logsLoading: false,
  logsTotal: 0,

  // ============================================
  // 대시보드
  // ============================================
  fetchStats: async () => {
    set({ statsLoading: true });
    try {
      const stats = await adminApi.getStats();
      set({ stats, statsLoading: false });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      set({ statsLoading: false });
    }
  },

  // ============================================
  // 신고 관리
  // ============================================
  fetchReports: async (reset = false) => {
    const { reports, reportFilters } = get();
    const skip = reset ? 0 : reports.length;

    set({ reportsLoading: true });
    try {
      const response = await adminApi.getReports({
        status: reportFilters.status === 'all' ? undefined : reportFilters.status,
        target_type: reportFilters.target_type === 'all' ? undefined : reportFilters.target_type,
        priority: reportFilters.priority === 'all' ? undefined : reportFilters.priority,
        skip,
        limit: ITEMS_PER_PAGE,
      });

      set({
        reports: reset ? response.reports : [...reports, ...response.reports],
        reportsTotal: response.total,
        reportsLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      set({ reportsLoading: false });
    }
  },

  setReportFilters: (filters) => {
    set((state) => ({
      reportFilters: { ...state.reportFilters, ...filters },
    }));
  },

  handleReport: async (reportId, action, reason) => {
    try {
      await adminApi.handleReport(reportId, { action, reason });
      // 목록 새로고침
      get().fetchReports(true);
      get().fetchStats();
    } catch (error) {
      console.error('Failed to handle report:', error);
      throw error;
    }
  },

  selectReport: (report) => set({ selectedReport: report }),

  // ============================================
  // 사용자 관리
  // ============================================
  fetchUsers: async (reset = false) => {
    const { users, userFilters } = get();
    const skip = reset ? 0 : users.length;

    set({ usersLoading: true });
    try {
      const response = await adminApi.getUsers({
        status: userFilters.status === 'all' ? undefined : userFilters.status,
        role: userFilters.role === 'all' ? undefined : userFilters.role,
        search: userFilters.search,
        sort_by: userFilters.sort_by,
        sort_order: userFilters.sort_order,
        skip,
        limit: ITEMS_PER_PAGE,
      });

      set({
        users: reset ? response.users : [...users, ...response.users],
        usersTotal: response.total,
        usersLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch users:', error);
      set({ usersLoading: false });
    }
  },

  setUserFilters: (filters) => {
    set((state) => ({
      userFilters: { ...state.userFilters, ...filters },
    }));
  },

  warnUser: async (userId, reason) => {
    try {
      await adminApi.warnUser(userId, { reason });
      get().fetchUsers(true);
      get().fetchStats();
    } catch (error) {
      console.error('Failed to warn user:', error);
      throw error;
    }
  },

  suspendUser: async (userId, durationHours, reason) => {
    try {
      await adminApi.suspendUser(userId, { duration_hours: durationHours, reason });
      get().fetchUsers(true);
      get().fetchStats();
    } catch (error) {
      console.error('Failed to suspend user:', error);
      throw error;
    }
  },

  banUser: async (userId, reason) => {
    try {
      await adminApi.banUser(userId, { reason });
      get().fetchUsers(true);
      get().fetchStats();
    } catch (error) {
      console.error('Failed to ban user:', error);
      throw error;
    }
  },

  unbanUser: async (userId) => {
    try {
      await adminApi.unbanUser(userId);
      get().fetchUsers(true);
      get().fetchStats();
    } catch (error) {
      console.error('Failed to unban user:', error);
      throw error;
    }
  },

  changeUserRole: async (userId, role) => {
    try {
      await adminApi.updateUserRole(userId, { role });
      get().fetchUsers(true);
    } catch (error) {
      console.error('Failed to change user role:', error);
      throw error;
    }
  },

  selectUser: (user) => set({ selectedUser: user }),

  // ============================================
  // 게시글 관리
  // ============================================
  fetchPosts: async (reset = false) => {
    const { posts, postFilters } = get();
    const skip = reset ? 0 : posts.length;

    set({ postsLoading: true });
    try {
      const response = await adminApi.getPosts({
        status: postFilters.status === 'all' ? undefined : postFilters.status,
        category: postFilters.category,
        has_reports: postFilters.has_reports,
        search: postFilters.search,
        sort_by: postFilters.sort_by,
        sort_order: postFilters.sort_order,
        skip,
        limit: ITEMS_PER_PAGE,
      });

      set({
        posts: reset ? response.posts : [...posts, ...response.posts],
        postsTotal: response.total,
        postsLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      set({ postsLoading: false });
    }
  },

  setPostFilters: (filters) => {
    set((state) => ({
      postFilters: { ...state.postFilters, ...filters },
    }));
  },

  hidePost: async (postId, reason) => {
    try {
      await adminApi.hidePost(postId, { reason });
      get().fetchPosts(true);
      get().fetchStats();
    } catch (error) {
      console.error('Failed to hide post:', error);
      throw error;
    }
  },

  unhidePost: async (postId) => {
    try {
      await adminApi.unhidePost(postId);
      get().fetchPosts(true);
      get().fetchStats();
    } catch (error) {
      console.error('Failed to unhide post:', error);
      throw error;
    }
  },

  deletePost: async (postId, reason) => {
    try {
      await adminApi.deletePost(postId, reason);
      get().fetchPosts(true);
      get().fetchStats();
    } catch (error) {
      console.error('Failed to delete post:', error);
      throw error;
    }
  },

  // ============================================
  // 댓글 관리
  // ============================================
  fetchComments: async (reset = false) => {
    const { comments, commentFilters } = get();
    const skip = reset ? 0 : comments.length;

    set({ commentsLoading: true });
    try {
      const response = await adminApi.getComments({
        status: commentFilters.status === 'all' ? undefined : commentFilters.status,
        has_reports: commentFilters.has_reports,
        search: commentFilters.search,
        sort_by: commentFilters.sort_by,
        sort_order: commentFilters.sort_order,
        skip,
        limit: ITEMS_PER_PAGE,
      });

      set({
        comments: reset ? response.comments : [...comments, ...response.comments],
        commentsTotal: response.total,
        commentsLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      set({ commentsLoading: false });
    }
  },

  setCommentFilters: (filters) => {
    set((state) => ({
      commentFilters: { ...state.commentFilters, ...filters },
    }));
  },

  hideComment: async (commentId, reason) => {
    try {
      await adminApi.hideComment(commentId, { reason });
      get().fetchComments(true);
      get().fetchStats();
    } catch (error) {
      console.error('Failed to hide comment:', error);
      throw error;
    }
  },

  deleteComment: async (commentId, reason) => {
    try {
      await adminApi.deleteComment(commentId, reason);
      get().fetchComments(true);
      get().fetchStats();
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  },

  // ============================================
  // 관리 로그
  // ============================================
  fetchLogs: async (reset = false) => {
    const { logs } = get();
    const skip = reset ? 0 : logs.length;

    set({ logsLoading: true });
    try {
      const response = await adminApi.getLogs({
        skip,
        limit: 50,
      });

      set({
        logs: reset ? response.logs : [...logs, ...response.logs],
        logsTotal: response.total,
        logsLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      set({ logsLoading: false });
    }
  },
}));
