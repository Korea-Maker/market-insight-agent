'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  getLatestAnalysis,
  type MarketInsight,
} from '@/lib/api/analysis';

interface MarketInsightPanelProps {
  symbol?: string;
}

const recommendationConfig = {
  strong_buy: { label: '적극 매수', color: 'bg-green-600', icon: TrendingUp },
  buy: { label: '매수', color: 'bg-green-500', icon: TrendingUp },
  hold: { label: '홀드', color: 'bg-yellow-500', icon: null },
  sell: { label: '매도', color: 'bg-red-500', icon: TrendingDown },
  strong_sell: { label: '적극 매도', color: 'bg-red-600', icon: TrendingDown },
};

const riskConfig = {
  low: { label: '낮음', color: 'bg-green-100 text-green-800' },
  medium: { label: '중간', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: '높음', color: 'bg-orange-100 text-orange-800' },
  very_high: { label: '매우 높음', color: 'bg-red-100 text-red-800' },
};

function MarketInsightSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 현재 시장 상황 */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-28" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-16 w-full" />
        </div>

        {/* 가격 변동 원인 */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-12 w-full" />
        </div>

        {/* 주요 영향 뉴스 */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-28" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>

        {/* 매매 제안 */}
        <div className="space-y-3 border-t pt-4">
          <Skeleton className="h-5 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>

        {/* 메타데이터 */}
        <Skeleton className="h-4 w-48" />
      </CardContent>
    </Card>
  );
}

export default function MarketInsightPanel({
  symbol = 'BTCUSDT',
}: MarketInsightPanelProps) {
  const [insight, setInsight] = useState<MarketInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLatestAnalysis(symbol);
      setInsight(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 데이터를 가져오는 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchAnalysis();

    // 5분마다 자동 갱신
    const interval = setInterval(fetchAnalysis, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchAnalysis]);

  if (loading && !insight) {
    return <MarketInsightSkeleton />;
  }

  if (error && !insight) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">AI 시장 분석</CardTitle>
          </div>
          <button
            onClick={fetchAnalysis}
            disabled={loading}
            className="p-2 rounded-md hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insight) {
    return null;
  }

  const recConfig = recommendationConfig[insight.recommendation];
  const riskConf = riskConfig[insight.risk_level];
  const RecIcon = recConfig.icon;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatPercentage = (value?: number) => {
    if (value === undefined || value === null) return '-';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">AI 시장 분석</CardTitle>
        </div>
        <button
          onClick={fetchAnalysis}
          disabled={loading}
          className="p-2 rounded-md hover:bg-accent transition-colors disabled:opacity-50"
          title="새로고침"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 현재 시장 상황 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-1">
            <span>📊</span> 현재 시장 상황
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">가격</p>
              <p className="text-lg font-semibold text-foreground">
                {formatPrice(insight.current_price)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">24h 변동률</p>
              <p
                className={`text-lg font-semibold ${
                  insight.price_change_24h !== undefined
                    ? insight.price_change_24h >= 0
                      ? 'text-green-500'
                      : 'text-red-500'
                    : 'text-muted-foreground'
                }`}
              >
                {formatPercentage(insight.price_change_24h)}
              </p>
            </div>
          </div>
          {insight.market_sentiment_label && (
            <Badge variant="secondary" className="mt-2">
              시장 심리: {insight.market_sentiment_label}
              {insight.market_sentiment_score !== undefined &&
                ` (${insight.market_sentiment_score.toFixed(0)})`}
            </Badge>
          )}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {insight.analysis_summary}
          </p>
        </div>

        {/* 가격 변동 원인 */}
        {insight.price_change_reason && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-1">
              <span>🔍</span> 가격 변동 원인
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {insight.price_change_reason}
            </p>
          </div>
        )}

        {/* 주요 영향 뉴스 */}
        {insight.related_news && insight.related_news.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-1">
              <span>📰</span> 주요 영향 뉴스
            </h4>
            <div className="space-y-2">
              {insight.related_news.slice(0, 3).map((news) => (
                <div
                  key={news.id}
                  className="flex items-start gap-2 text-sm p-2 rounded-md bg-accent/50"
                >
                  <span className="text-muted-foreground shrink-0">•</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate">
                      {news.title_kr || news.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {news.source}
                      {news.published && ` · ${new Date(news.published).toLocaleDateString('ko-KR')}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 매매 제안 */}
        <div className="space-y-3 border-t pt-4">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-1">
            <span>💰</span> 매매 제안
          </h4>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${recConfig.color} text-white`}>
              {RecIcon && <RecIcon className="h-3 w-3 mr-1" />}
              {recConfig.label}
            </Badge>
            <Badge className={riskConf.color}>
              위험도: {riskConf.label}
            </Badge>
          </div>
          {insight.recommendation_reason && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {insight.recommendation_reason}
            </p>
          )}
        </div>

        {/* 메타데이터 */}
        <div className="text-xs text-muted-foreground pt-2">
          <p>
            업데이트: {formatDateTime(insight.created_at)}
            {insight.processing_time_ms !== undefined && (
              <span> · 처리 시간: {insight.processing_time_ms}ms</span>
            )}
            {insight.ai_model && <span> · 모델: {insight.ai_model}</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
