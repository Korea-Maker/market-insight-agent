"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PostCard } from '@/components/Community';
import { useAuthStore } from '@/store/useAuthStore';
import { useCommunityStore } from '@/store/useCommunityStore';
import {
  Users,
  TrendingUp,
  Clock,
  Eye,
  Hash,
  Sparkles,
  Search,
  PenSquare,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SortType = 'latest' | 'trending' | 'top';

interface FilterButtonProps {
  sort: SortType;
  activeSort: SortType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: (sort: SortType) => void;
}

function FilterButton({ sort, activeSort, icon: Icon, label, onClick }: FilterButtonProps): React.ReactElement {
  const isActive = activeSort === sort;

  return (
    <button
      onClick={() => onClick(sort)}
      className={cn(
        "px-4 py-2 rounded-lg text-sm font-medium transition-all",
        "flex items-center gap-2",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default function CommunityPage() {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const {
    posts,
    isLoading,
    filters,
    pagination,
    popularTags,
    categories,
    fetchPosts,
    fetchPopularTags,
    fetchCategories,
    setFilters,
    toggleLike,
  } = useCommunityStore();

  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    checkAuth();
    fetchCategories();
    fetchPopularTags();
  }, [checkAuth, fetchCategories, fetchPopularTags]);

  useEffect(() => {
    fetchPosts(true);
  }, [filters, fetchPosts]);

  const handleSortChange = (sort: SortType) => {
    setFilters({ sort });
  };

  const handleCategoryChange = (category: string | null) => {
    setFilters({ category });
  };

  const handleTagClick = (tag: string) => {
    setFilters({ tag: filters.tag === tag ? null : tag });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ search: searchInput || null });
  };

  const handleLoadMore = () => {
    if (!isLoading && pagination.hasMore) {
      fetchPosts(false);
    }
  };

  const handleLike = async (postId: number) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    await toggleLike(postId);
  };

  const handleWritePost = () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    router.push('/community/write');
  };

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-y-auto">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              커뮤니티
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              트레이더들과 시장 인사이트를 공유하세요
            </p>
          </div>
          <Button onClick={handleWritePost} className="gap-2">
            <PenSquare className="h-4 w-4" />
            글쓰기
          </Button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="검색어를 입력하세요..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="outline">
            검색
          </Button>
        </form>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <FilterButton
            sort="latest"
            activeSort={filters.sort}
            icon={Clock}
            label="최신"
            onClick={handleSortChange}
          />
          <FilterButton
            sort="trending"
            activeSort={filters.sort}
            icon={TrendingUp}
            label="인기"
            onClick={handleSortChange}
          />
          <FilterButton
            sort="top"
            activeSort={filters.sort}
            icon={Eye}
            label="조회수"
            onClick={handleSortChange}
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleCategoryChange(null)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              filters.category === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
            )}
          >
            전체
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => handleCategoryChange(cat.name)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                filters.category === cat.name
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Active Filters */}
        {(filters.tag || filters.search) && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">필터:</span>
            {filters.tag && (
              <button
                onClick={() => setFilters({ tag: null })}
                className="px-2 py-1 rounded bg-primary/10 text-primary flex items-center gap-1"
              >
                <Hash className="h-3 w-3" />
                {filters.tag}
                <span className="ml-1">×</span>
              </button>
            )}
            {filters.search && (
              <button
                onClick={() => {
                  setFilters({ search: null });
                  setSearchInput('');
                }}
                className="px-2 py-1 rounded bg-primary/10 text-primary flex items-center gap-1"
              >
                검색: {filters.search}
                <span className="ml-1">×</span>
              </button>
            )}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content - Posts */}
        <div className="lg:col-span-3 space-y-4">
          {isLoading && posts.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              게시글이 없습니다.
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onLike={handleLike} />
              ))}

              {/* Load More */}
              {pagination.hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    더 보기
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Trending Tags */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">인기 태그</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {popularTags.length > 0 ? (
                  popularTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagClick(tag.name)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full font-medium transition-all",
                        filters.tag === tag.name
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                      )}
                    >
                      #{tag.name}
                    </button>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    아직 태그가 없습니다
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">커뮤니티 통계</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">전체 게시글</span>
                    <span className="font-bold text-primary">{pagination.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">인기 태그</span>
                    <span className="font-bold text-primary">{popularTags.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">카테고리</span>
                    <span className="font-bold text-primary">{categories.length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">빠른 액션</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleWritePost} className="w-full gap-2">
                <PenSquare className="h-4 w-4" />
                새 게시글 작성
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
