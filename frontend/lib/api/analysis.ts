/**
 * Analysis API 클라이언트
 * AI 시장 분석 데이터 조회
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface NewsPreview {
  id: number;
  title: string;
  title_kr?: string;
  source: string;
  published?: string;
}

export interface MarketInsight {
  id: number;
  symbol: string;
  created_at: string;

  // 시장 데이터
  current_price: number;
  price_change_24h?: number;
  volume_24h?: number;
  rsi_14?: number;
  volatility_24h?: number;

  // AI 분석
  analysis_summary: string;
  price_change_reason?: string;

  // 매매 제안
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  recommendation_reason?: string;

  // 위험도 및 심리
  risk_level: 'low' | 'medium' | 'high' | 'very_high';
  market_sentiment_score?: number;
  market_sentiment_label?: string;

  // 관련 뉴스
  related_news: NewsPreview[];

  // 메타데이터
  ai_model?: string;
  processing_time_ms?: number;
}

export interface MarketInsightListResponse {
  total: number;
  items: MarketInsight[];
}

/**
 * 최신 분석 조회
 * @param symbol 심볼 (기본값: BTCUSDT)
 */
export async function getLatestAnalysis(symbol?: string): Promise<MarketInsight> {
  const params = new URLSearchParams();
  if (symbol) {
    params.append('symbol', symbol);
  }

  const queryString = params.toString();
  const url = `${API_BASE_URL}/api/analysis/latest${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage = '분석 데이터를 가져오는 중 오류가 발생했습니다';
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // JSON 파싱 실패 시 기본 메시지 사용
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * 분석 이력 조회
 * @param symbol 심볼 (기본값: BTCUSDT)
 * @param limit 조회 개수 (기본값: 10)
 */
export async function getAnalysisHistory(
  symbol?: string,
  limit?: number
): Promise<MarketInsightListResponse> {
  const params = new URLSearchParams();
  if (symbol) {
    params.append('symbol', symbol);
  }
  if (limit !== undefined) {
    params.append('limit', String(limit));
  }

  const queryString = params.toString();
  const url = `${API_BASE_URL}/api/analysis/history${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage = '분석 이력을 가져오는 중 오류가 발생했습니다';
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // JSON 파싱 실패 시 기본 메시지 사용
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
