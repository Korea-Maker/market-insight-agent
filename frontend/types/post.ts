/**
 * 게시글 관련 타입 정의
 */

import { Author } from './auth';

export interface Tag {
  id: number;
  name: string;
  slug: string;
  post_count: number;
}

export interface Category {
  name: string;
  slug: string;
  post_count: number;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  category: string;
  author: Author;
  tags: string[];
  view_count: number;
  like_count: number;
  comment_count: number;
  is_published: boolean;
  is_pinned: boolean;
  is_liked?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostListItem {
  id: number;
  title: string;
  content_preview: string;
  category: string;
  author: Author;
  tags: string[];
  view_count: number;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  created_at: string;
}

export interface PostListResponse {
  items: PostListItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface PostCreateRequest {
  title: string;
  content: string;
  category: string;
  tags: string[];
}

export interface PostUpdateRequest {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  is_published?: boolean;
}

export interface PostFilters {
  category: string | null;
  tag: string | null;
  sort: 'latest' | 'trending' | 'top';
  search: string | null;
}
