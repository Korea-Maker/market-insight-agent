'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useCommunityStore } from '@/store/useCommunityStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Heart, Reply, Trash2, Edit2, Loader2, Send } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { Comment } from '@/types/comment';

interface CommentSectionProps {
  postId: number;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const { isAuthenticated, user } = useAuthStore();
  const {
    comments,
    commentsTotal,
    addComment,
    deleteComment,
    toggleCommentLike,
  } = useCommunityStore();

  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addComment(postId, newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (parentId: number) => {
    if (!replyContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addComment(postId, replyContent.trim(), parentId);
      setReplyContent('');
      setReplyTo(null);
    } catch (error) {
      console.error('Failed to add reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;

    try {
      await deleteComment(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleLike = async (commentId: number) => {
    if (!isAuthenticated) return;

    try {
      await toggleCommentLike(commentId);
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          댓글 {commentsTotal}개
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 댓글 작성 */}
        {isAuthenticated ? (
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
              {user?.display_name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="댓글을 작성하세요..."
                className="w-full min-h-[100px] p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={!newComment.trim() || isSubmitting}
                  size="sm"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      댓글 작성
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            댓글을 작성하려면{' '}
            <a href="/auth/login" className="text-primary hover:underline">
              로그인
            </a>
            이 필요합니다.
          </div>
        )}

        {/* 댓글 목록 */}
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={user?.id}
              isAuthenticated={isAuthenticated}
              replyTo={replyTo}
              replyContent={replyContent}
              isSubmitting={isSubmitting}
              onReplyToChange={setReplyTo}
              onReplyContentChange={setReplyContent}
              onReply={handleReply}
              onDelete={handleDelete}
              onLike={handleLike}
            />
          ))}
        </div>

        {comments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            아직 댓글이 없습니다. 첫 댓글을 작성해보세요!
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CommentItemProps {
  comment: Comment;
  currentUserId?: number;
  isAuthenticated: boolean;
  replyTo: number | null;
  replyContent: string;
  isSubmitting: boolean;
  onReplyToChange: (id: number | null) => void;
  onReplyContentChange: (content: string) => void;
  onReply: (parentId: number) => void;
  onDelete: (commentId: number) => void;
  onLike: (commentId: number) => void;
  isReply?: boolean;
}

function CommentItem({
  comment,
  currentUserId,
  isAuthenticated,
  replyTo,
  replyContent,
  isSubmitting,
  onReplyToChange,
  onReplyContentChange,
  onReply,
  onDelete,
  onLike,
  isReply = false,
}: CommentItemProps) {
  const isOwner = currentUserId === comment.author.id;
  const showReplyForm = replyTo === comment.id;

  return (
    <div className={cn("space-y-3", isReply && "ml-12 pl-4 border-l-2 border-border")}>
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground flex-shrink-0 text-sm">
          {comment.author.display_name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">{comment.author.display_name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(comment.created_at)}
            </span>
          </div>
          <p className={cn("text-sm", comment.is_deleted && "text-muted-foreground italic")}>
            {comment.content}
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onLike(comment.id)}
              disabled={!isAuthenticated}
              className={cn(
                "flex items-center gap-1 text-xs transition-colors",
                comment.is_liked
                  ? "text-red-500"
                  : "text-muted-foreground hover:text-red-500",
                !isAuthenticated && "cursor-not-allowed opacity-50"
              )}
            >
              <Heart
                className={cn("h-4 w-4", comment.is_liked && "fill-red-500")}
              />
              <span>{comment.like_count}</span>
            </button>
            {isAuthenticated && !isReply && !comment.is_deleted && (
              <button
                onClick={() => onReplyToChange(showReplyForm ? null : comment.id)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Reply className="h-4 w-4" />
                <span>답글</span>
              </button>
            )}
            {isOwner && !comment.is_deleted && (
              <button
                onClick={() => onDelete(comment.id)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>삭제</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 답글 폼 */}
      {showReplyForm && (
        <div className="ml-12 flex gap-2">
          <input
            type="text"
            value={replyContent}
            onChange={(e) => onReplyContentChange(e.target.value)}
            placeholder="답글을 작성하세요..."
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button
            onClick={() => onReply(comment.id)}
            disabled={!replyContent.trim() || isSubmitting}
            size="sm"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {/* 대댓글 */}
      {comment.replies.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              isAuthenticated={isAuthenticated}
              replyTo={replyTo}
              replyContent={replyContent}
              isSubmitting={isSubmitting}
              onReplyToChange={onReplyToChange}
              onReplyContentChange={onReplyContentChange}
              onReply={onReply}
              onDelete={onDelete}
              onLike={onLike}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}
