'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Eye,
  EyeOff,
  Trash2,
  Pin,
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
import type { ModerationPost, ContentStatus } from '@/types/moderation';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

const statusConfig: Record<ContentStatus, { label: string; color: string; icon: React.ElementType }> = {
  published: { label: '공개', color: 'bg-green-500 text-white', icon: Eye },
  hidden: { label: '숨김', color: 'bg-orange-500 text-white', icon: EyeOff },
  deleted: { label: '삭제됨', color: 'bg-red-500 text-white', icon: Trash2 },
};

function PostCard({
  post,
  onHide,
  onUnhide,
  onDelete,
  isProcessing,
}: {
  post: ModerationPost;
  onHide: (reason: string) => void;
  onUnhide: () => void;
  onDelete: (reason: string) => void;
  isProcessing: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const [actionType, setActionType] = useState<'hide' | 'delete' | null>(null);
  const [reason, setReason] = useState('');

  const status = statusConfig[post.status];
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
      post.report_count > 0 && "border-orange-500/50"
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
              <Badge variant="outline" className="text-xs">
                {post.category}
              </Badge>
              {post.is_pinned && (
                <Badge variant="secondary" className="text-xs">
                  <Pin className="h-3 w-3 mr-1" />
                  고정됨
                </Badge>
              )}
              {post.report_count > 0 && (
                <Badge className="text-xs bg-orange-500 text-white">
                  <Flag className="h-3 w-3 mr-1" />
                  신고 {post.report_count}
                </Badge>
              )}
            </div>

            <Link href={`/community/${post.id}`} target="_blank">
              <h3 className="font-semibold hover:text-primary transition-colors flex items-center gap-1">
                {post.title}
                <ExternalLink className="h-4 w-4 opacity-50" />
              </h3>
            </Link>

            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {post.content.substring(0, 200)}...
            </p>

            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>작성자: {post.author.display_name}</span>
              <span>조회 {post.view_count}</span>
              <span>좋아요 {post.like_count}</span>
              <span>댓글 {post.comment_count}</span>
              <span>
                {formatDistanceToNow(new Date(post.created_at), {
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
                {post.status === 'published' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-orange-600 border-orange-600"
                    onClick={() => setActionType('hide')}
                  >
                    <EyeOff className="h-4 w-4 mr-1" />
                    숨기기
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-600"
                    onClick={onUnhide}
                    disabled={isProcessing}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    공개하기
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
                  {actionType === 'hide' ? '게시글을 숨깁니다' : '게시글을 삭제합니다'}
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

export default function PostsPage() {
  const {
    posts,
    postsLoading,
    postsTotal,
    postFilters,
    fetchPosts,
    setPostFilters,
    hidePost,
    unhidePost,
    deletePost,
  } = useModerationStore();

  const [processingId, setProcessingId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    fetchPosts(true);
  }, [fetchPosts, postFilters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPostFilters({ search: searchInput || undefined });
  };

  const handlePostAction = async (
    postId: number,
    action: () => Promise<void>
  ) => {
    setProcessingId(postId);
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
            <FileText className="h-7 w-7 text-purple-500" />
            게시글 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            총 {postsTotal}개의 게시글
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchPosts(true)}
          disabled={postsLoading}
          className="gap-2"
        >
          <RefreshCw className={postsLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
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
                  placeholder="제목, 내용으로 검색..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="outline">검색</Button>
            </form>

            <select
              value={postFilters.status || 'all'}
              onChange={(e) => setPostFilters({ status: e.target.value as ContentStatus | 'all' })}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Posts List */}
      {postsLoading && posts.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">게시글이 없습니다</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onHide={(reason) => handlePostAction(post.id, () => hidePost(post.id, reason))}
              onUnhide={() => handlePostAction(post.id, () => unhidePost(post.id))}
              onDelete={(reason) => handlePostAction(post.id, () => deletePost(post.id, reason))}
              isProcessing={processingId === post.id}
            />
          ))}

          {posts.length < postsTotal && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => fetchPosts(false)}
                disabled={postsLoading}
              >
                {postsLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                더 보기
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
