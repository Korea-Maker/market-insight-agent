'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { useCommunityStore } from '@/store/useCommunityStore';
import { CommentSection } from '@/components/Community';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Eye,
  Clock,
  Hash,
  Edit,
  Trash2,
  Loader2,
  Share2,
} from 'lucide-react';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = Number(params.id);

  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const {
    currentPost,
    isLoading,
    fetchPost,
    fetchComments,
    toggleLike,
    deletePost,
    clearCurrentPost,
  } = useCommunityStore();

  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (postId) {
      fetchPost(postId);
      fetchComments(postId);
    }

    return () => {
      clearCurrentPost();
    };
  }, [postId, fetchPost, fetchComments, clearCurrentPost]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    await toggleLike(postId);
  };

  const handleDelete = async () => {
    if (!confirm('게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deletePost(postId);
      router.push('/community');
    } catch (error) {
      console.error('Failed to delete post:', error);
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('링크가 복사되었습니다!');
    } catch {
      // Fallback
    }
  };

  if (isLoading || !currentPost) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isOwner = user?.id === currentPost.author.id;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        뒤로가기
      </Button>

      {/* Post Content */}
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-4">
            {/* Category & Title */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                {currentPost.category}
              </span>
              <h1 className="text-3xl font-bold">{currentPost.title}</h1>
            </div>

            {/* Author & Meta */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {currentPost.author.display_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <Link
                    href={`/profile/${currentPost.author.username}`}
                    className="font-medium hover:text-primary transition-colors"
                  >
                    {currentPost.author.display_name}
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatDateTime(currentPost.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {isOwner && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/community/write?edit=${postId}`)}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    수정
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="gap-2 text-red-500 hover:text-red-600"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    삭제
                  </Button>
                </div>
              )}
            </div>

            {/* Tags */}
            {currentPost.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {currentPost.tags.map((tag, idx) => (
                  <Link
                    key={idx}
                    href={`/community?tag=${encodeURIComponent(tag)}`}
                    className="text-sm px-3 py-1 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <Hash className="h-3 w-3" />
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <hr className="border-border" />

          {/* Content */}
          <article className="prose prose-neutral dark:prose-invert max-w-none">
            {/* Simple markdown rendering - 실제로는 react-markdown 등 사용 권장 */}
            <div className="whitespace-pre-wrap">{currentPost.content}</div>
          </article>

          {/* Divider */}
          <hr className="border-border" />

          {/* Footer Stats & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-2 transition-colors",
                  currentPost.is_liked
                    ? "text-red-500"
                    : "text-muted-foreground hover:text-red-500"
                )}
              >
                <Heart
                  className={cn(
                    "h-5 w-5",
                    currentPost.is_liked && "fill-red-500"
                  )}
                />
                <span className="font-medium">{currentPost.like_count}</span>
              </button>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-5 w-5" />
                <span className="font-medium">{currentPost.comment_count}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Eye className="h-5 w-5" />
                <span className="font-medium">{currentPost.view_count}</span>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
              <Share2 className="h-4 w-4" />
              공유
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <CommentSection postId={postId} />
    </div>
  );
}
