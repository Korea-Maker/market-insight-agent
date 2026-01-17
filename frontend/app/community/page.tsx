"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Clock, 
  Heart, 
  Eye,
  ArrowUp,
  ArrowDown,
  Hash,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterType = 'trending' | 'latest' | 'top';

interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  avatar: string;
  time: string;
  likes: number;
  comments: number;
  views: number;
  trend: 'up' | 'down' | 'neutral';
  tags: string[];
  category: string;
}

const mockPosts: Post[] = [
  {
    id: 1,
    title: "BTC/USDT 강세 전환 신호 분석",
    content: "최근 기술적 지표를 분석한 결과, BTC/USDT가 중요한 저항선을 돌파하며 강세 전환 신호를 보이고 있습니다. RSI와 MACD 지표가 모두 상승 추세를 나타내고 있어 주목할 만합니다.",
    author: "CryptoAnalyst",
    avatar: "CA",
    time: "5분 전",
    likes: 42,
    comments: 18,
    views: 234,
    trend: 'up',
    tags: ["BTC", "기술분석", "강세"],
    category: "분석"
  },
  {
    id: 2,
    title: "이더리움 2.0 업그레이드 영향 분석",
    content: "이더리움의 최신 업그레이드가 시장에 미치는 영향을 깊이 있게 분석했습니다. 스테이킹 수익률과 네트워크 성능 개선이 가격에 미치는 영향을 살펴봅니다.",
    author: "ETHExpert",
    avatar: "EE",
    time: "12분 전",
    likes: 89,
    comments: 34,
    views: 567,
    trend: 'up',
    tags: ["ETH", "업그레이드", "스테이킹"],
    category: "뉴스"
  },
  {
    id: 3,
    title: "시장 변동성 관리 전략",
    content: "고변동성 시장에서 리스크를 최소화하면서 수익을 극대화하는 전략을 공유합니다. 포지션 사이징과 스톱로스 설정에 대한 실전 팁을 포함합니다.",
    author: "RiskManager",
    avatar: "RM",
    time: "1시간 전",
    likes: 156,
    comments: 67,
    views: 892,
    trend: 'up',
    tags: ["전략", "리스크관리", "실전"],
    category: "전략"
  },
  {
    id: 4,
    title: "DeFi 프로토콜 수익률 비교",
    content: "주요 DeFi 프로토콜들의 현재 수익률을 비교 분석했습니다. 안전성과 수익률의 균형을 고려한 최적의 스테이킹 전략을 제안합니다.",
    author: "DeFiMaster",
    avatar: "DM",
    time: "2시간 전",
    likes: 73,
    comments: 29,
    views: 445,
    trend: 'neutral',
    tags: ["DeFi", "수익률", "비교"],
    category: "DeFi"
  },
  {
    id: 5,
    title: "알트코인 시즌 전망",
    content: "비트코인 강세 이후 예상되는 알트코인 시즌에 대한 전망을 공유합니다. 어떤 코인들이 주목받을지, 타이밍은 언제인지 분석합니다.",
    author: "AltCoinPro",
    avatar: "AP",
    time: "3시간 전",
    likes: 124,
    comments: 45,
    views: 678,
    trend: 'up',
    tags: ["알트코인", "전망", "시즌"],
    category: "전망"
  },
];

const trendingTags = ["BTC", "ETH", "DeFi", "기술분석", "전략", "뉴스"];

export default function CommunityPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('trending');

  const getFilteredPosts = () => {
    const sorted = [...mockPosts];
    switch (activeFilter) {
      case 'trending':
        return sorted.sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments));
      case 'latest':
        return sorted;
      case 'top':
        return sorted.sort((a, b) => b.views - a.views);
      default:
        return sorted;
    }
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
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            onClick={() => setActiveFilter('trending')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              "flex items-center gap-2",
              activeFilter === 'trending'
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <TrendingUp className="h-4 w-4" />
            인기
          </button>
          <button
            onClick={() => setActiveFilter('latest')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              "flex items-center gap-2",
              activeFilter === 'latest'
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Clock className="h-4 w-4" />
            최신
          </button>
          <button
            onClick={() => setActiveFilter('top')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              "flex items-center gap-2",
              activeFilter === 'top'
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Eye className="h-4 w-4" />
            조회수
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content - Posts */}
        <div className="lg:col-span-3 space-y-4">
          {getFilteredPosts().map((post) => (
            <Card 
              key={post.id} 
              className="hover:shadow-lg transition-all duration-300 border border-border/60 hover:border-primary/40 bg-card/90 backdrop-blur-sm cursor-pointer group"
            >
              <CardContent className="p-6">
                <div className="flex gap-4">
                  {/* Avatar & Trend Indicator */}
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-bold text-primary border-2 border-primary/20">
                      {post.avatar}
                    </div>
                    {post.trend === 'up' && (
                      <div className="flex items-center gap-1 text-green-500 text-xs">
                        <ArrowUp className="h-3 w-3" />
                        <span>상승</span>
                      </div>
                    )}
                    {post.trend === 'down' && (
                      <div className="flex items-center gap-1 text-red-500 text-xs">
                        <ArrowDown className="h-3 w-3" />
                        <span>하락</span>
                      </div>
                    )}
                  </div>

                  {/* Post Content */}
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                            {post.category}
                          </span>
                          <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                            {post.title}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.content}
                        </p>
                      </div>
                    </div>

                    {/* Tags */}
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

                    {/* Footer - Stats & Meta */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{post.time}</span>
                        </div>
                        <span className="font-medium">{post.author}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer group/stat">
                          <Heart className="h-4 w-4 group-hover/stat:fill-red-500" />
                          <span className="text-xs font-medium">{post.likes}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                          <MessageSquare className="h-4 w-4" />
                          <span className="text-xs font-medium">{post.comments}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="h-4 w-4" />
                          <span className="text-xs font-medium">{post.views}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
                {trendingTags.map((tag, idx) => (
                  <button
                    key={idx}
                    className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all font-medium"
                  >
                    #{tag}
                  </button>
                ))}
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
                    <span className="text-sm text-muted-foreground">활성 사용자</span>
                    <span className="font-bold text-primary">1,234</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">오늘 게시글</span>
                    <span className="font-bold text-primary">89</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">오늘 댓글</span>
                    <span className="font-bold text-primary">456</span>
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
              <button className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                새 게시글 작성
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
