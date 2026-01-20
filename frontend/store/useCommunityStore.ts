/**
 * 커뮤니티 상태 관리 스토어
 */

import { create } from 'zustand';
import { postsApi, commentsApi } from '@/lib/api';
import type { PostListItem, Post, PostFilters, Category, Tag } from '@/types/post';
import type { Comment } from '@/types/comment';

interface CommunityState {
  // Posts
  posts: PostListItem[];
  currentPost: Post | null;
  isLoading: boolean;
  filters: PostFilters;
  pagination: {
    skip: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };

  // Comments
  comments: Comment[];
  commentsTotal: number;

  // Categories & Tags
  categories: Category[];
  popularTags: Tag[];

  // Post Actions
  fetchPosts: (reset?: boolean) => Promise<void>;
  fetchPost: (id: number) => Promise<void>;
  createPost: (data: { title: string; content: string; category: string; tags: string[] }) => Promise<Post>;
  updatePost: (id: number, data: { title?: string; content?: string; category?: string; tags?: string[] }) => Promise<void>;
  deletePost: (id: number) => Promise<void>;
  toggleLike: (postId: number) => Promise<void>;
  setFilters: (filters: Partial<PostFilters>) => void;
  resetFilters: () => void;

  // Comment Actions
  fetchComments: (postId: number) => Promise<void>;
  addComment: (postId: number, content: string, parentId?: number) => Promise<void>;
  updateComment: (commentId: number, content: string) => Promise<void>;
  deleteComment: (commentId: number) => Promise<void>;
  toggleCommentLike: (commentId: number) => Promise<void>;

  // Metadata Actions
  fetchCategories: () => Promise<void>;
  fetchPopularTags: () => Promise<void>;

  // Clear
  clearCurrentPost: () => void;
}

const DEFAULT_FILTERS: PostFilters = {
  category: null,
  tag: null,
  sort: 'latest',
  search: null,
};

export const useCommunityStore = create<CommunityState>((set, get) => ({
  posts: [],
  currentPost: null,
  isLoading: false,
  filters: { ...DEFAULT_FILTERS },
  pagination: {
    skip: 0,
    limit: 20,
    total: 0,
    hasMore: true,
  },
  comments: [],
  commentsTotal: 0,
  categories: [],
  popularTags: [],

  fetchPosts: async (reset = false) => {
    const { filters, pagination, posts } = get();

    set({ isLoading: true });

    try {
      const skip = reset ? 0 : pagination.skip;
      const response = await postsApi.getList({
        skip,
        limit: pagination.limit,
        category: filters.category || undefined,
        tag: filters.tag || undefined,
        sort: filters.sort,
        search: filters.search || undefined,
      });

      set({
        posts: reset ? response.items : [...posts, ...response.items],
        pagination: {
          ...pagination,
          skip: skip + response.items.length,
          total: response.total,
          hasMore: skip + response.items.length < response.total,
        },
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchPost: async (id: number) => {
    set({ isLoading: true });

    try {
      const post = await postsApi.getById(id);
      set({ currentPost: post, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createPost: async (data) => {
    const response = await postsApi.create(data);
    // 목록 새로고침
    await get().fetchPosts(true);
    return response as Post;
  },

  updatePost: async (id, data) => {
    await postsApi.update(id, data);
    // 현재 게시글 새로고침
    await get().fetchPost(id);
  },

  deletePost: async (id) => {
    await postsApi.delete(id);
    set({ currentPost: null });
    // 목록 새로고침
    await get().fetchPosts(true);
  },

  toggleLike: async (postId: number) => {
    const { posts, currentPost } = get();
    const response = await postsApi.toggleLike(postId);

    // 목록에서 업데이트
    set({
      posts: posts.map((p) =>
        p.id === postId
          ? { ...p, is_liked: response.is_liked, like_count: response.like_count }
          : p
      ),
    });

    // 현재 게시글에서도 업데이트
    if (currentPost?.id === postId) {
      set({
        currentPost: {
          ...currentPost,
          is_liked: response.is_liked,
          like_count: response.like_count,
        },
      });
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, skip: 0 },
    }));
  },

  resetFilters: () => {
    set({
      filters: { ...DEFAULT_FILTERS },
      pagination: { skip: 0, limit: 20, total: 0, hasMore: true },
    });
  },

  fetchComments: async (postId: number) => {
    try {
      const response = await commentsApi.getByPost(postId);
      set({
        comments: response.items,
        commentsTotal: response.total,
      });
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  },

  addComment: async (postId: number, content: string, parentId?: number) => {
    await commentsApi.create(postId, { content, parent_id: parentId });
    // 댓글 목록 새로고침
    await get().fetchComments(postId);

    // 현재 게시글 댓글 수 업데이트
    const { currentPost } = get();
    if (currentPost?.id === postId) {
      set({
        currentPost: {
          ...currentPost,
          comment_count: currentPost.comment_count + 1,
        },
      });
    }
  },

  updateComment: async (commentId: number, content: string) => {
    await commentsApi.update(commentId, { content });
    // 댓글 목록에서 직접 업데이트
    const { comments } = get();
    set({
      comments: updateCommentInTree(comments, commentId, { content }),
    });
  },

  deleteComment: async (commentId: number) => {
    const { currentPost } = get();
    await commentsApi.delete(commentId);

    // 댓글 목록 새로고침
    if (currentPost) {
      await get().fetchComments(currentPost.id);
      set({
        currentPost: {
          ...currentPost,
          comment_count: Math.max(0, currentPost.comment_count - 1),
        },
      });
    }
  },

  toggleCommentLike: async (commentId: number) => {
    const response = await commentsApi.toggleLike(commentId);
    const { comments } = get();

    set({
      comments: updateCommentInTree(comments, commentId, {
        is_liked: response.is_liked,
        like_count: response.like_count,
      }),
    });
  },

  fetchCategories: async () => {
    try {
      const categories = await postsApi.getCategories();
      set({ categories });
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  },

  fetchPopularTags: async () => {
    try {
      const tags = await postsApi.getTags(20);
      set({ popularTags: tags });
    } catch (error) {
      console.error('Failed to fetch popular tags:', error);
    }
  },

  clearCurrentPost: () => {
    set({ currentPost: null, comments: [], commentsTotal: 0 });
  },
}));

// 댓글 트리에서 특정 댓글 업데이트 헬퍼
function updateCommentInTree(
  comments: Comment[],
  commentId: number,
  updates: Partial<Comment>
): Comment[] {
  return comments.map((comment) => {
    if (comment.id === commentId) {
      return { ...comment, ...updates };
    }
    if (comment.replies.length > 0) {
      return {
        ...comment,
        replies: updateCommentInTree(comment.replies, commentId, updates),
      };
    }
    return comment;
  });
}
