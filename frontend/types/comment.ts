/**
 * 댓글 관련 타입 정의
 */

import { Author } from './auth';

export interface Comment {
  id: number;
  content: string;
  author: Author;
  parent_id: number | null;
  like_count: number;
  is_liked: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  replies: Comment[];
}

export interface CommentListResponse {
  items: Comment[];
  total: number;
}

export interface CommentCreateRequest {
  content: string;
  parent_id?: number;
}

export interface CommentUpdateRequest {
  content: string;
}
