/**
 * 인증 관련 타입 정의
 */

export interface User {
  id: number;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface UserStats {
  post_count: number;
  comment_count: number;
  total_likes: number;
}

export interface UserWithStats extends User {
  stats: UserStats;
}

export interface Author {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  display_name: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginResponse extends TokenResponse {
  user: User;
}

export interface RegisterResponse {
  id: number;
  email: string;
  username: string;
  display_name: string;
  message: string;
}
