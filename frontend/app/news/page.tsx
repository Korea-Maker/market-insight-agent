"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import {
  Newspaper,
  Clock,
  TrendingUp,
  Sparkles,
  Filter,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCategoryLabel, getCategoryStyle } from '@/lib/news-utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type FilterType = 'all' | 'market' | 'tech' | 'regulation';

interface NewsItem {
  id: number;
  title: string;
  title_kr: string | null;
  link: string;
  published: string | null;
  source: string;
  description: string | null;
  description_kr: string | null;
  created_at: string;
}

interface NewsResponse {
  total: number;
  items: NewsItem[];
}

const categories = [
  { id: 'all', label: '전체', icon: Newspaper },
  { id: 'market', label: '시장', icon: TrendingUp },
  { id: 'tech', label: '기술', icon: Sparkles },
  { id: 'regulation', label: '규제', icon: Filter },
];

// 소스별 색상 매핑
const sourceColors: Record<string, string> = {
  'CoinDesk': 'from-blue-500 to-cyan-500',
  'CoinTelegraph': 'from-orange-500 to-yellow-500',
  'Bitcoin Magazine': 'from-amber-500 to-orange-500',
  'default': 'from-purple-500 to-pink-500',
};

export default function NewsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 뉴스 데이터 가져오기
  const fetchNews = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/news/?limit=50`);

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const data: NewsResponse = await response.json();
      setNews(data.items);
    } catch (err) {
      console.error('뉴스 로드 실패:', err);
      setError(err instanceof Error ? err.message : '뉴스를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();

    // 30초마다 자동 새로고침
    const interval = setInterval(() => fetchNews(true), 30000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  // 날짜 포맷팅
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '날짜 없음';

    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // 제목에서 카테고리 추론 (간단한 키워드 기반)
  const inferCategory = (item: NewsItem): string => {
    const text = `${item.title_kr || item.title} ${item.description_kr || item.description || ''}`.toLowerCase();

    if (text.includes('sec') || text.includes('regulation') || text.includes('law') ||
      text.includes('규제') || text.includes('법') || text.includes('정책')) {
      return 'regulation';
    }
    if (text.includes('upgrade') || text.includes('update') || text.includes('protocol') ||
      text.includes('기술') || text.includes('업그레이드') || text.includes('개발')) {
      return 'tech';
    }
    return 'market';
  };

  // 필터링된 뉴스
  const filteredNews = news.filter(item => {
    if (activeFilter === 'all') return true;
    return inferCategory(item) === activeFilter;
  });

  // 소스별 그라디언트 색상 가져오기
  const getSourceGradient = (source: string) => {
    return sourceColors[source] || sourceColors.default;
  };

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-y-auto bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                <Newspaper className="h-7 w-7 text-primary" />
              </div>
              뉴스
            </h1>
            <p className="text-muted-foreground">
              실시간 암호화폐 시장 뉴스와 분석
            </p>
          </div>

          {/* 새로고침 버튼 */}
          <button
            onClick={() => fetchNews(true)}
            disabled={refreshing}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl",
              "bg-primary/10 hover:bg-primary/20 text-primary",
              "transition-all duration-200 border border-primary/20",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            <span className="text-sm font-medium">새로고침</span>
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setActiveFilter(category.id as FilterType)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  "flex items-center gap-2 border",
                  activeFilter === category.id
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                    : "bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card border-border hover:border-primary/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {category.label}
              </button>
            );
          })}

          {/* 뉴스 개수 표시 */}
          <div className="ml-auto text-sm text-muted-foreground">
            {filteredNews.length}개의 뉴스
          </div>
        </div>
      </header>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">뉴스를 불러오는 중...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="p-4 rounded-full bg-destructive/10 mb-4">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">오류가 발생했습니다</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md text-center">{error}</p>
          <button
            onClick={() => fetchNews()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* News Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredNews.map((item, index) => {
            const category = inferCategory(item);
            const isRecent = item.published &&
              (new Date().getTime() - new Date(item.published).getTime()) < 3600000; // 1시간 이내

            return (
              <a
                key={item.id}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Card className={cn(
                  "h-full overflow-hidden transition-all duration-300",
                  "hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1",
                  "border border-border/60 hover:border-primary/40",
                  "bg-card/90 backdrop-blur-sm"
                )}>
                  {/* 상단 그라디언트 바 */}
                  <div className={cn(
                    "h-1 bg-gradient-to-r",
                    getSourceGradient(item.source)
                  )} />

                  <CardContent className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* 최신 뱃지 */}
                        {isRecent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                            NEW
                          </span>
                        )}

                        {/* 카테고리 */}
                        <span className={cn(
                          "text-xs font-medium px-2.5 py-1 rounded-lg",
                          getCategoryStyle(category)
                        )}>
                          {getCategoryLabel(category)}
                        </span>
                      </div>

                      {/* 소스 */}
                      <span className="text-xs text-muted-foreground shrink-0">
                        {item.source}
                      </span>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {item.title_kr || item.title}
                      </h3>
                      {item.title_kr && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {item.title}
                        </p>
                      )}
                    </div>

                    {/* Description */}
                    {(item.description_kr || item.description) && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.description_kr || item.description}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatDate(item.published)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-all">
                        <span className="text-xs font-medium">읽기</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </a>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredNews.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="p-4 rounded-full bg-muted/50 mb-4">
            <Newspaper className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold mb-2">뉴스가 없습니다</h3>
          <p className="text-sm text-muted-foreground max-w-md text-center">
            {activeFilter === 'all'
              ? '아직 수집된 뉴스가 없습니다. 잠시 후 다시 확인해주세요.'
              : '선택한 카테고리에 해당하는 뉴스가 없습니다.'}
          </p>
        </div>
      )}
    </div>
  );
}
