'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useCommunityStore } from '@/store/useCommunityStore';
import { AuthGuard } from '@/components/Auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Send,
  Loader2,
  Hash,
  X,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { name: '분석', slug: 'analysis' },
  { name: '뉴스', slug: 'news' },
  { name: '전략', slug: 'strategy' },
  { name: '질문', slug: 'question' },
  { name: 'DeFi', slug: 'defi' },
  { name: 'NFT', slug: 'nft' },
  { name: '자유', slug: 'free' },
];

function WritePostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const { checkAuth } = useAuthStore();
  const { currentPost, fetchPost, createPost, updatePost, clearCurrentPost } = useCommunityStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('분석');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!editId;

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (editId) {
      fetchPost(Number(editId));
    }

    return () => {
      clearCurrentPost();
    };
  }, [editId, fetchPost, clearCurrentPost]);

  useEffect(() => {
    if (isEditMode && currentPost) {
      setTitle(currentPost.title);
      setContent(currentPost.content);
      setCategory(currentPost.category);
      setTags(currentPost.tags);
    }
  }, [isEditMode, currentPost]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim().replace(/,/g, '');

      if (tag && tags.length < 5 && !tags.includes(tag)) {
        setTags([...tags, tag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('제목을 입력해주세요');
      return;
    }

    if (!content.trim()) {
      setError('내용을 입력해주세요');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && editId) {
        await updatePost(Number(editId), {
          title: title.trim(),
          content: content.trim(),
          category,
          tags,
        });
        router.push(`/community/${editId}`);
      } else {
        const post = await createPost({
          title: title.trim(),
          content: content.trim(),
          category,
          tags,
        });
        router.push(`/community/${post.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로가기
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditMode ? '게시글 수정' : '새 게시글 작성'}
        </h1>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium">카테고리</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      category === cat.name
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                제목
              </label>
              <Input
                id="title"
                type="text"
                placeholder="제목을 입력하세요"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground text-right">
                {title.length}/200
              </p>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">
                내용
              </label>
              <textarea
                id="content"
                placeholder="내용을 입력하세요... (Markdown 지원)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full min-h-[400px] p-4 rounded-lg border border-border bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={isSubmitting}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                태그 (최대 5개)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                  >
                    <Hash className="h-3 w-3" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              {tags.length < 5 && (
                <Input
                  type="text"
                  placeholder="태그 입력 후 Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  disabled={isSubmitting}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Enter 또는 쉼표(,)로 태그 추가
              </p>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {isEditMode ? '수정 완료' : '게시하기'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WritePostPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<LoadingFallback />}>
        <WritePostContent />
      </Suspense>
    </AuthGuard>
  );
}
