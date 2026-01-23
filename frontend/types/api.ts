/**
 * API 관련 공통 타입 정의
 */

/**
 * 페이지네이션 응답 공통 타입
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip?: number;
  limit?: number;
}

/**
 * 좋아요 토글 응답
 */
export interface LikeToggleResponse {
  is_liked: boolean;
  like_count: number;
}

/**
 * 사용자 프로필 정보 (공개)
 */
export interface PublicProfile {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}
