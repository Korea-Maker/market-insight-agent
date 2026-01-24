'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Search,
  Eye,
  EyeOff,
  Trash2,
  Flag,
  Loader2,
  RefreshCw,
  ExternalLink,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useModerationStore } from '@/store/useModerationStore';
import type { ModerationComment, ContentStatus } from '@/types/moderation';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

const statusConfig: Record<ContentStatus, { label: string; color: string; icon: React.ElementType }> = {
  published: { label: '공개', color: 'bg-green-500 text-white', icon: Eye },
  hidden: { label: '숨김', color: 'bg-orange-500 text-white', icon: EyeOff },
  deleted: { label: '삭제됨', color: 'bg-red-500 text-white', icon: Trash2 },
};

function CommentCard({
  comment,
  onHide,
  onDelete,
  isProcessing,
}: {
  comment: ModerationComment;
  onHide: (reason: string) => void;
  onDelete: (reason: string) => void;
  isProcessing: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const [actionType, setActionType] = useState<'hide' | 'delete' | null>(null);
  const [reason, setReason] = useState('');

  const status = statusConfig[comment.status];
  const StatusIcon = status.icon;

  const handleAction = () => {
    if (actionType === 'hide') {
      onHide(reason);
    } else if (actionType === 'delete') {
      onDelete(reason);
    }
    setShowActions(false);
    setActionType(null);
    setReason('');
  };

  return (
    <Card className={cn(
      comment.report_count > 0 && "border-orange-500/50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={cn("text-xs", status.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
              {comment.report_count > 0 && (
                <Badge className="text-xs bg-orange-500 text-white">
                  <Flag className="h-3 w-3 mr-1" />
                  신고 {comment.report_count}
                </Badge>
              )}
            </div>

            <p className="text-sm mb-2">{comment.content}</p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>작성자: {comment.author.display_name}</span>
              <Link
                href={`/community/${comment.post_id}`}
                target="_blank"
                className="hover:text-primary flex items-center gap-1"
              >
                원글: {comment.post_title}
                <ExternalLink className="h-3 w-3" />
              </Link>
              <span>좋아요 {comment.like_count}</span>
              <span>
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                  locale: ko,
                })}
              </span>
            </div>
          </div>

          {/* Actions Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowActions(!showActions)}
            disabled={isProcessing}
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>

        {/* Actions Panel */}
        {showActions && (
          <div className="mt-4 pt-4 border-t border-border">
            {actionType === null ? (
              <div className="flex flex-wrap gap-2">
                {comment.status === 'published' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-orange-600 border-orange-600"
                    onClick={() => setActionType('hide')}
                  >
                    <EyeOff className="h-4 w-4 mr-1" />
                    숨기기
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setActionType('delete')}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  삭제
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowActions(false)}
                >
                  취소
                </Button>
              </div>
            ) : (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">
                  {actionType === 'hide' ? '댓글을 숨깁니다' : '댓글을 삭제합니다'}
                </p>
                <Input
                  placeholder="사유 입력 (필수)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAction}
                    disabled={isProcessing || !reason}
                    className={actionType === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    확인
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setActionType(null);
                      setReason('');
                    }}
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CommentsPage() {
  const {
    comments,
    commentsLoading,
    commentsTotal,
    commentFilters,
    fetchComments,
    setCommentFilters,
    hideComment,
    deleteComment,
  } = useModerationStore();

  const [processingId, setProcessingId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    fetchComments(true);
  }, [fetchComments, commentFilters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCommentFilters({ search: searchInput || undefined });
  };

  const handleCommentAction = async (
    commentId: number,
    action: () => Promise<void>
  ) => {
    setProcessingId(commentId);
    try {
      await action();
    } finally {
      setProcessingId(null);
    }
  };

  const statusOptions = [
    { value: 'all', label: '전체 상태' },
    { value: 'published', label: '공개' },
    { value: 'hidden', label: '숨김' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-cyan-500" />
            댓글 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            총 {commentsTotal}개의 댓글
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchComments(true)}
          disabled={commentsLoading}
          className="gap-2"
        >
          <RefreshCw className={commentsLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          새로고침
        </Button>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="내용으로 검색..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="outline">검색</Button>
            </form>

            <select
              value={commentFilters.status || 'all'}
              onChange={(e) => setCommentFilters({ status: e.target.value as ContentStatus | 'all' })}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      {commentsLoading && comments.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : comments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">댓글이 없습니다</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onHide={(reason) => handleCommentAction(comment.id, () => hideComment(comment.id, reason))}
              onDelete={(reason) => handleCommentAction(comment.id, () => deleteComment(comment.id, reason))}
              isProcessing={processingId === comment.id}
            />
          ))}

          {comments.length < commentsTotal && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => fetchComments(false)}
                disabled={commentsLoading}
              >
                {commentsLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                더 보기
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
