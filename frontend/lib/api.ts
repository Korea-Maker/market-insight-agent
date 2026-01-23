/**
 * API 클라이언트
 * 백엔드와 통신하는 fetch wrapper
 */
import type {
  User,
  UserWithStats,
  UserStats,
  LoginResponse,
  TokenResponse,
  PublicProfile,
  Post,
  PostListItem,
  PostListResponse,
  Category,
  Tag,
  Comment,
  CommentListResponse,
  LikeToggleResponse,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiError {
  detail: string;
}

class ApiClient {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      let errorMessage = '요청 처리 중 오류가 발생했습니다';

      try {
        const errorData: ApiError = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch {
        // JSON 파싱 실패 시 기본 메시지 사용
      }

      throw new Error(errorMessage);
    }

    // 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  async get<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<T> {
    let url = endpoint;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();

// Auth API
export const authApi = {
  register: (data: { email: string; username: string; password: string; display_name: string }) =>
    api.post('/api/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<LoginResponse>('/api/auth/login', data),

  logout: () => api.post('/api/auth/logout'),

  refresh: () => api.post<TokenResponse>('/api/auth/refresh'),

  me: () => api.get<User>('/api/auth/me'),
};

// Users API
export const usersApi = {
  getMe: () => api.get<UserWithStats>('/api/users/me'),

  updateMe: (data: { display_name?: string; bio?: string; avatar_url?: string }) =>
    api.patch('/api/users/me', data),

  getProfile: (username: string) =>
    api.get<PublicProfile>(`/api/users/${username}`),

  getStats: (username: string) =>
    api.get<UserStats>(`/api/users/${username}/stats`),
};

// Posts API
export const postsApi = {
  getList: (params?: {
    skip?: number;
    limit?: number;
    category?: string;
    tag?: string;
    author?: string;
    sort?: string;
    search?: string;
  }) => api.get<PostListResponse>('/api/posts', params),

  getById: (id: number) => api.get<Post>(`/api/posts/${id}`),

  create: (data: { title: string; content: string; category: string; tags: string[] }) =>
    api.post('/api/posts', data),

  update: (id: number, data: { title?: string; content?: string; category?: string; tags?: string[] }) =>
    api.patch(`/api/posts/${id}`, data),

  delete: (id: number) => api.delete(`/api/posts/${id}`),

  toggleLike: (id: number) =>
    api.post<LikeToggleResponse>(`/api/posts/${id}/like`),

  getCategories: () => api.get<Category[]>('/api/posts/categories'),

  getTags: (limit?: number) => api.get<Tag[]>('/api/posts/tags', { limit }),
};

// Comments API
export const commentsApi = {
  getByPost: (postId: number) =>
    api.get<CommentListResponse>(`/api/posts/${postId}/comments`),

  create: (postId: number, data: { content: string; parent_id?: number }) =>
    api.post(`/api/posts/${postId}/comments`, data),

  update: (commentId: number, data: { content: string }) =>
    api.patch(`/api/comments/${commentId}`, data),

  delete: (commentId: number) => api.delete(`/api/comments/${commentId}`),

  toggleLike: (commentId: number) =>
    api.post<LikeToggleResponse>(`/api/comments/${commentId}/like`),
};
