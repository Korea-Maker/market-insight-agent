import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  Newspaper, 
  Clock, 
  ArrowLeft,
  Tag,
  Eye,
  Calendar,
  User,
  ExternalLink
} from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  publishedAt: string;
  category: string;
  tags: string[];
  image?: string;
  source: string;
  views: number;
  isBreaking?: boolean;
}

// 실제로는 API나 데이터베이스에서 가져와야 합니다
const getNewsById = async (id: string): Promise<NewsItem | null> => {
  const mockNews: NewsItem[] = [
    {
      id: '1',
      title: '비트코인, 주요 저항선 돌파하며 3개월 만에 최고가 기록',
      summary: '비트코인이 65,000달러 저항선을 돌파하며 3개월 만에 최고가를 기록했습니다. 기술적 지표와 기관 투자자들의 유입이 가격 상승을 이끌고 있습니다.',
      content: `비트코인이 주요 저항선인 65,000달러를 돌파하며 3개월 만에 최고가를 기록했습니다. 

이번 상승은 여러 요인이 복합적으로 작용한 결과입니다. 먼저, 기술적 지표를 살펴보면 RSI(상대강도지수)가 70을 넘어서면서 강세 신호를 보이고 있으며, MACD 지표도 골든크로스를 형성하며 상승 모멘텀이 강화되고 있습니다.

또한 기관 투자자들의 지속적인 유입이 가격 상승을 뒷받침하고 있습니다. 최근 공개된 데이터에 따르면, 주요 기관들이 비트코인 ETF를 통해 대규모 매수를 진행하고 있으며, 이는 시장의 신뢰도가 높아지고 있음을 시사합니다.

시장 전문가들은 이번 상승이 단순한 기술적 반등이 아닌, 근본적인 시장 구조 변화의 신호일 수 있다고 분석하고 있습니다. 특히, 인플레이션 우려와 전통 금융 시스템에 대한 불신이 증가하면서 비트코인을 대체 자산으로 보는 시각이 확산되고 있습니다.

앞으로의 전망에 대해서는 신중한 접근이 필요합니다. 현재 가격 수준이 과열되었을 가능성도 배제할 수 없으며, 단기 조정이 발생할 수 있습니다. 투자자들은 리스크 관리에 주의를 기울여야 할 것입니다.`,
      author: '시장 분석팀',
      publishedAt: '2025-12-07T10:30:00Z',
      category: 'market',
      tags: ['BTC', '시장동향', '가격분석'],
      source: 'CryptoNews',
      views: 1234,
      isBreaking: true,
    },
    {
      id: '2',
      title: '이더리움, Dencun 업그레이드로 가스비 90% 절감 효과 확인',
      summary: '이더리움의 최신 Dencun 업그레이드가 성공적으로 완료되었으며, L2 네트워크의 가스비가 평균 90% 감소한 것으로 확인되었습니다.',
      content: `이더리움의 Dencun 업그레이드가 성공적으로 완료되면서 L2 네트워크의 가스비가 대폭 감소했습니다.

이번 업그레이드의 핵심은 EIP-4844(Proto-Danksharding)의 도입으로, 블롭(blob) 트랜잭션을 통해 L2 네트워크의 데이터 저장 비용을 크게 낮췄습니다. 

주요 L2 네트워크들의 가스비 변화를 살펴보면:
- Arbitrum: 평균 가스비 95% 감소
- Optimism: 평균 가스비 88% 감소  
- Polygon zkEVM: 평균 가스비 92% 감소

이러한 변화는 이더리움 생태계의 확장성 문제를 해결하는 중요한 이정표가 되었습니다. 사용자들은 이제 훨씬 저렴한 비용으로 DeFi 거래와 NFT 거래를 수행할 수 있게 되었습니다.

개발자 커뮤니티는 이번 업그레이드를 매우 긍정적으로 평가하고 있으며, 앞으로 더 많은 애플리케이션이 이더리움 생태계로 유입될 것으로 예상됩니다.`,
      author: '기술 분석팀',
      publishedAt: '2025-12-07T09:15:00Z',
      category: 'tech',
      tags: ['ETH', '업그레이드', 'L2'],
      source: 'TechReview',
      views: 892,
    },
    {
      id: '3',
      title: '미국 SEC, 새로운 암호화폐 규제 가이드라인 발표 예정',
      summary: '미국 증권거래위원회(SEC)가 내년 1분기 중 새로운 암호화폐 규제 가이드라인을 발표할 예정이라고 발표했습니다.',
      content: `미국 증권거래위원회(SEC)가 내년 1분기 중 새로운 암호화폐 규제 가이드라인을 발표할 예정입니다.

이번 가이드라인은 주로 다음과 같은 영역을 다룰 것으로 예상됩니다:
- 스테이블코인 발행 및 운영 기준
- DeFi 프로토콜에 대한 규제 프레임워크
- 암호화폐 거래소의 자금 보관 및 분리 기준
- 투자자 보호를 위한 정보 공시 요건

업계 전문가들은 이번 규제가 시장의 명확성을 높이고 기관 투자자들의 참여를 촉진할 것으로 기대하고 있습니다. 반면, 일부에서는 과도한 규제가 혁신을 저해할 수 있다는 우려도 제기하고 있습니다.

암호화폐 관련 기업들은 이번 가이드라인 발표를 앞두고 자체 규정 준수 체계를 점검하고 있으며, 규제에 대응할 수 있는 준비를 하고 있습니다.`,
      author: '정책 분석팀',
      publishedAt: '2025-12-07T08:00:00Z',
      category: 'regulation',
      tags: ['규제', 'SEC', '정책'],
      source: 'PolicyWatch',
      views: 567,
    },
    {
      id: '4',
      title: '바이낸스, 새로운 AI 기반 거래 봇 출시',
      summary: '바이낸스가 머신러닝 기술을 활용한 새로운 AI 거래 봇을 출시했습니다. 이 봇은 시장 패턴을 분석하여 최적의 거래 타이밍을 제안합니다.',
      content: `바이낸스가 최신 AI 기술을 활용한 거래 봇을 출시했습니다.

이번에 출시된 AI 거래 봇은 다음과 같은 기능을 제공합니다:
- 실시간 시장 패턴 분석
- 감정 분석을 통한 시장 전망
- 개인화된 거래 전략 제안
- 리스크 관리 자동화

봇은 딥러닝 모델을 사용하여 과거 시장 데이터와 뉴스, 소셜 미디어 감정을 종합적으로 분석합니다. 이를 통해 더 정확한 시장 예측과 거래 신호를 제공할 수 있게 되었습니다.

초기 테스트 결과, 봇이 제안한 거래 전략의 수익률이 평균적으로 15% 향상된 것으로 나타났습니다. 다만, 모든 투자에는 리스크가 따르므로 신중한 판단이 필요합니다.`,
      author: '제품 리뷰팀',
      publishedAt: '2025-12-06T16:45:00Z',
      category: 'tech',
      tags: ['AI', '거래봇', '바이낸스'],
      source: 'ProductNews',
      views: 445,
    },
    {
      id: '5',
      title: '솔라나, 24시간 거래량 20억 달러 돌파',
      summary: '솔라나 네트워크의 24시간 거래량이 사상 최초로 20억 달러를 돌파했습니다. DeFi 생태계의 급속한 성장이 주된 원인입니다.',
      content: `솔라나 네트워크의 24시간 거래량이 사상 최초로 20억 달러를 돌파했습니다.

이번 기록은 솔라나 생태계의 급속한 성장을 보여주는 중요한 이정표입니다. 주요 성장 요인은 다음과 같습니다:

1. DeFi 프로토콜의 확장
   - Jupiter, Raydium 등 주요 DEX의 거래량 급증
   - 새로운 유동성 풀의 지속적인 추가

2. NFT 시장의 활성화
   - Magic Eden, Tensor 등 NFT 마켓플레이스의 거래량 증가
   - 새로운 NFT 컬렉션의 성공적인 런칭

3. 기관 투자자들의 관심 증가
   - 대형 기관들의 솔라나 기반 프로젝트 투자
   - 인프라 개선에 대한 지속적인 투자

솔라나 재단은 이번 성과에 대해 네트워크의 확장성과 낮은 거래 수수료가 핵심 요인이라고 분석했습니다. 앞으로도 생태계 확장을 위한 다양한 인센티브 프로그램을 운영할 예정입니다.`,
      author: '생태계 분석팀',
      publishedAt: '2025-12-06T14:20:00Z',
      category: 'market',
      tags: ['SOL', 'DeFi', '거래량'],
      source: 'EcosystemReport',
      views: 678,
    },
    {
      id: '6',
      title: '유럽연합, MiCA 규정 완전 시행 개시',
      summary: '유럽연합의 암호화폐 시장 규제법(MiCA)이 완전히 시행되기 시작했습니다. 유럽 내 암호화폐 기업들은 새로운 규정에 맞춰 운영 방식을 조정해야 합니다.',
      content: `유럽연합의 암호화폐 시장 규제법(MiCA)이 완전히 시행되기 시작했습니다.

MiCA 규정의 주요 내용:
- 암호화폐 자산 서비스 제공자(CASP)에 대한 라이선스 요건
- 스테이블코인 발행자에 대한 엄격한 준비금 요구사항
- 투자자 보호를 위한 정보 공시 의무
- 시장 조작 방지를 위한 감시 체계

유럽 내 암호화폐 기업들은 이제 새로운 규정에 맞춰 운영 방식을 조정해야 합니다. 많은 기업들이 이미 규정 준수를 위한 준비를 완료했으며, 일부는 추가 조정이 필요한 상황입니다.

전문가들은 이번 규정이 유럽 시장의 명확성을 높이고 장기적으로 시장 성장에 도움이 될 것으로 평가하고 있습니다. 다만, 규정 준수 비용이 중소기업들에게는 부담이 될 수 있다는 우려도 있습니다.`,
      author: '정책 분석팀',
      publishedAt: '2025-12-06T11:30:00Z',
      category: 'regulation',
      tags: ['MiCA', '유럽', '규제'],
      source: 'PolicyWatch',
      views: 523,
    },
  ];

  return mockNews.find(news => news.id === id) || null;
};

interface NewsDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { id } = await params;
  const news = await getNewsById(id);

  if (!news) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'market':
        return '시장';
      case 'tech':
        return '기술';
      case 'regulation':
        return '규제';
      default:
        return category;
    }
  };

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-y-auto max-w-4xl mx-auto">
      {/* Back Button */}
      <Link
        href="/news"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        뉴스 목록으로
      </Link>

      {/* Article */}
      <article className="space-y-6">
        {/* Header */}
        <header className="space-y-4">
          {/* Breaking Badge & Category */}
          <div className="flex items-center gap-3 flex-wrap">
            {news.isBreaking && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                속보
              </span>
            )}
            <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded">
              {getCategoryLabel(news.category)}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{news.source}</span>
              <span>•</span>
              <span>{formatDate(news.publishedAt)}</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            {news.title}
          </h1>

          {/* Summary */}
          <p className="text-lg text-muted-foreground leading-relaxed">
            {news.summary}
          </p>

          {/* Meta Info */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{news.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>{news.views.toLocaleString()}회 조회</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(news.publishedAt)}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {news.tags.map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors text-sm"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>

        {/* Content */}
        <Card>
          <CardContent className="p-8">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-line leading-relaxed text-foreground">
                {news.content.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            목록으로 돌아가기
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>출처:</span>
            <span className="font-medium">{news.source}</span>
            <ExternalLink className="h-3 w-3" />
          </div>
        </div>
      </article>
    </div>
  );
}
