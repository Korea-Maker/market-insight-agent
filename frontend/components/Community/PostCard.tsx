'use client';

import Link from 'next/link';
import { formatDistanceToNow } from '@/lib/date';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, MessageSquare, Eye, Clock, Hash, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PostListItem } from '@/types/post';

interface PostCardProps {
  post: PostListItem;
  onLike?: (postId: number) => void;
}

export function PostCard({ post, onLike }: PostCardProps) {
  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onLike?.(post.id);
  };

  return (
    <Link href={`/community/${post.id}`}>
      <Card className="hover:shadow-lg transition-all duration-300 border border-border/60 hover:border-primary/40 bg-card/90 backdrop-blur-sm cursor-pointer group">
        <CardContent className="p-6">
          <div className="flex gap-4">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-bold text-primary border-2 border-primary/20">
                {post.author.display_name.slice(0, 2).toUpperCase()}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-3 min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                      {post.category}
                    </span>
                    <h3 className="text-lg font-semibold group-hover:text-primary transition-colors truncate">
                      {post.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {post.content_preview}
                  </p>
                </div>
              </div>

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {post.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <Hash className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(post.created_at)}</span>
                  </div>
                  <span className="font-medium">{post.author.display_name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleLike}
                    className={cn(
                      "flex items-center gap-1 transition-colors cursor-pointer group/stat",
                      post.is_liked
                        ? "text-red-500"
                        : "text-muted-foreground hover:text-red-500"
                    )}
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4",
                        post.is_liked && "fill-red-500"
                      )}
                    />
                    <span className="text-xs font-medium">{post.like_count}</span>
                  </button>
                  <div className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-xs font-medium">{post.comment_count}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span className="text-xs font-medium">{post.view_count}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
