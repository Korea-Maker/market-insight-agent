/**
 * API 클라이언트
 * 백엔드와 통신하는 fetch wrapper
 */

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
      credentials: 'include', // 쿠키 포함
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

  // GET 요청
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

  // POST 요청
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PATCH 요청
  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE 요청
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
    api.post<{
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
      user: {
        id: number;
        email: string;
        username: string;
        display_name: string;
        avatar_url: string | null;
        bio: string | null;
        is_verified: boolean;
        created_at: string;
      };
    }>('/api/auth/login', data),

  logout: () => api.post('/api/auth/logout'),

  refresh: () =>
    api.post<{
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
    }>('/api/auth/refresh'),

  me: () =>
    api.get<{
      id: number;
      email: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      bio: string | null;
      is_verified: boolean;
      created_at: string;
    }>('/api/auth/me'),
};

// Users API
export const usersApi = {
  getMe: () =>
    api.get<{
      id: number;
      email: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      bio: string | null;
      is_verified: boolean;
      created_at: string;
      stats: {
        post_count: number;
        comment_count: number;
        total_likes: number;
      };
    }>('/api/users/me'),

  updateMe: (data: { display_name?: string; bio?: string; avatar_url?: string }) =>
    api.patch('/api/users/me', data),

  getProfile: (username: string) =>
    api.get<{
      id: number;
      username: string;
      display_name: string;
      avatar_url: string | null;
      bio: string | null;
      created_at: string;
    }>(`/api/users/${username}`),

  getStats: (username: string) =>
    api.get<{
      post_count: number;
      comment_count: number;
      total_likes: number;
    }>(`/api/users/${username}/stats`),
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
  }) =>
    api.get<{
      items: Array<{
        id: number;
        title: string;
        content_preview: string;
        category: string;
        author: {
          id: number;
          username: string;
          display_name: string;
          avatar_url: string | null;
        };
        tags: string[];
        view_count: number;
        like_count: number;
        comment_count: number;
        is_liked: boolean;
        created_at: string;
      }>;
      total: number;
      skip: number;
      limit: number;
    }>('/api/posts', params),

  getById: (id: number) =>
    api.get<{
      id: number;
      title: string;
      content: string;
      category: string;
      author: {
        id: number;
        username: string;
        display_name: string;
        avatar_url: string | null;
      };
      tags: string[];
      view_count: number;
      like_count: number;
      comment_count: number;
      is_published: boolean;
      is_pinned: boolean;
      is_liked: boolean;
      created_at: string;
      updated_at: string;
    }>(`/api/posts/${id}`),

  create: (data: { title: string; content: string; category: string; tags: string[] }) =>
    api.post('/api/posts', data),

  update: (id: number, data: { title?: string; content?: string; category?: string; tags?: string[] }) =>
    api.patch(`/api/posts/${id}`, data),

  delete: (id: number) => api.delete(`/api/posts/${id}`),

  toggleLike: (id: number) =>
    api.post<{ is_liked: boolean; like_count: number }>(`/api/posts/${id}/like`),

  getCategories: () =>
    api.get<Array<{ name: string; slug: string; post_count: number }>>('/api/posts/categories'),

  getTags: (limit?: number) =>
    api.get<Array<{ id: number; name: string; slug: string; post_count: number }>>(
      '/api/posts/tags',
      { limit }
    ),
};

// Comments API
export const commentsApi = {
  getByPost: (postId: number) =>
    api.get<{
      items: Array<{
        id: number;
        content: string;
        author: {
          id: number;
          username: string;
          display_name: string;
          avatar_url: string | null;
        };
        parent_id: number | null;
        like_count: number;
        is_liked: boolean;
        is_deleted: boolean;
        created_at: string;
        updated_at: string;
        replies: Array<{
          id: number;
          content: string;
          author: {
            id: number;
            username: string;
            display_name: string;
            avatar_url: string | null;
          };
          parent_id: number;
          like_count: number;
          is_liked: boolean;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
          replies: [];
        }>;
      }>;
      total: number;
    }>(`/api/posts/${postId}/comments`),

  create: (postId: number, data: { content: string; parent_id?: number }) =>
    api.post(`/api/posts/${postId}/comments`, data),

  update: (commentId: number, data: { content: string }) =>
    api.patch(`/api/comments/${commentId}`, data),

  delete: (commentId: number) => api.delete(`/api/comments/${commentId}`),

  toggleLike: (commentId: number) =>
    api.post<{ is_liked: boolean; like_count: number }>(`/api/comments/${commentId}/like`),
};
