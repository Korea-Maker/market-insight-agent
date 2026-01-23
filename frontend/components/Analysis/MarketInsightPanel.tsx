'use client';

import { useEffect, useState, useCallback } from 'react';
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
  className?: string;
}

const recommendationConfig = {
  strong_buy: { label: '적극 매수', color: 'bg-green-600', icon: TrendingUp },
  buy: { label: '매수', color: 'bg-green-500', icon: TrendingUp },
  hold: { label: '홀드', color: 'bg-yellow-500', icon: null },
  sell: { label: '매도', color: 'bg-red-500', icon: TrendingDown },
  strong_sell: { label: '적극 매도', color: 'bg-red-600', icon: TrendingDown },
};

const riskConfig = {
  low: { label: '낮음', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  medium: { label: '중간', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  high: { label: '높음', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  very_high: { label: '매우 높음', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

function MarketInsightSkeleton() {
  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded bg-white/10" />
          <Skeleton className="h-6 w-32 bg-white/10" />
        </div>
        <Skeleton className="h-8 w-8 rounded bg-white/10" />
      </div>
      <div className="flex-1 overflow-hidden space-y-4">
        <div className="space-y-3">
          <Skeleton className="h-5 w-28 bg-white/10" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full bg-white/10" />
            <Skeleton className="h-12 w-full bg-white/10" />
          </div>
          <Skeleton className="h-16 w-full bg-white/10" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-28 bg-white/10" />
          <Skeleton className="h-12 w-full bg-white/10" />
        </div>
        <div className="space-y-3 border-t border-white/5 pt-4">
          <Skeleton className="h-5 w-24 bg-white/10" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 bg-white/10" />
            <Skeleton className="h-8 w-16 bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketInsightPanel({
  symbol = 'BTCUSDT',
  className = '',
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
      <div className={`h-full flex flex-col p-6 ${className}`}>
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-bold font-heading">AI 시장 분석</h3>
          </div>
          <button
            onClick={fetchAnalysis}
            disabled={loading}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
            <button
              onClick={fetchAnalysis}
              disabled={loading}
              className="mt-2 px-4 py-2 text-xs font-medium rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
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
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 blur-lg animate-pulse" />
            <div className="relative h-8 w-8 rounded-xl bg-gradient-to-br from-primary via-primary/80 to-primary/50 flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
          </div>
          <h3 className="text-lg font-bold font-heading">AI 분석</h3>
        </div>
        <button
          onClick={fetchAnalysis}
          disabled={loading}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
          title="새로고침"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {/* 매매 제안 - 가장 상단에 배치 */}
        <div className="p-4 rounded-2xl bg-muted/20 border border-white/5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${recConfig.color} text-white border-0`}>
              {RecIcon && <RecIcon className="h-3 w-3 mr-1" />}
              {recConfig.label}
            </Badge>
            <Badge className={`${riskConf.color} border`}>
              위험도: {riskConf.label}
            </Badge>
          </div>
          {insight.recommendation_reason && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {insight.recommendation_reason}
            </p>
          )}
        </div>

        {/* 현재 시장 상황 */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            시장 현황
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/20 border border-white/5 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">가격</p>
              <p className="text-base font-bold font-mono tracking-tight text-foreground">
                {formatPrice(insight.current_price)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/20 border border-white/5 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">24h 변동</p>
              <p
                className={`text-base font-bold font-mono tracking-tight ${
                  insight.price_change_24h !== undefined
                    ? insight.price_change_24h >= 0
                      ? 'text-emerald-400'
                      : 'text-red-400'
                    : 'text-muted-foreground'
                }`}
              >
                {formatPercentage(insight.price_change_24h)}
              </p>
            </div>
          </div>
          {insight.market_sentiment_label && (
            <Badge variant="secondary" className="bg-white/5 border border-white/10 text-xs">
              심리: {insight.market_sentiment_label}
              {insight.market_sentiment_score !== undefined &&
                ` (${insight.market_sentiment_score.toFixed(0)})`}
            </Badge>
          )}
        </div>

        {/* AI 분석 요약 */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            분석 요약
          </h4>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {insight.analysis_summary}
          </p>
        </div>

        {/* 가격 변동 원인 */}
        {insight.price_change_reason && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              변동 원인
            </h4>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {insight.price_change_reason}
            </p>
          </div>
        )}

        {/* 주요 영향 뉴스 */}
        {insight.related_news && insight.related_news.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              관련 뉴스
            </h4>
            <div className="space-y-2">
              {insight.related_news.slice(0, 3).map((news) => (
                <div
                  key={news.id}
                  className="p-2 rounded-xl bg-muted/10 border border-white/5 hover:bg-muted/20 transition-colors"
                >
                  <p className="text-xs text-foreground/90 line-clamp-2">
                    {news.title_kr || news.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {news.source}
                    {news.published && ` · ${new Date(news.published).toLocaleDateString('ko-KR')}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 메타데이터 */}
        <div className="pt-2 border-t border-white/5">
          <p className="text-[10px] text-muted-foreground font-mono">
            업데이트: {formatDateTime(insight.created_at)}
            {insight.processing_time_ms !== undefined && (
              <span> · {insight.processing_time_ms}ms</span>
            )}
            {insight.ai_model && <span> · {insight.ai_model}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
