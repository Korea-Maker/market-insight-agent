# 뉴스 수집기 (News Collector)

## 개요
FastAPI 백엔드에 통합된 자동화된 뉴스 수집 시스템입니다. 무료 RSS 피드를 사용하여 암호화폐 및 블록체인 뉴스를 자동으로 수집, 번역하여 PostgreSQL에 저장합니다.

## 주요 기능

### 1. 자동 뉴스 수집
- **수집 주기**: 10초마다 자동 실행
- **뉴스 소스**:
  - **CoinDesk**: 가장 신뢰받는 암호화폐 뉴스 미디어
  - **CoinTelegraph**: 블록체인 및 암호화폐 전문 뉴스
  - **Bitcoin Magazine**: 비트코인 전문 뉴스

### 2. 자동 한국어 번역
- `deep-translator` 라이브러리를 사용하여 뉴스 제목을 자동으로 한국어로 번역
- Google Translate API 기반, Python 3.13+ 완벽 호환
- 원문과 번역본을 모두 저장

### 3. 중복 방지
- 링크(URL) 기반 유니크 제약조건으로 중복 저장 방지
- 이미 저장된 뉴스는 건너뛰기

### 4. RESTful API
- 뉴스 목록 조회 (페이지네이션 지원)
- 소스별 필터링
- 뉴스 상세 조회

## 설치 및 실행

### 1. 의존성 설치
```bash
cd backend
pip install -r requirements.txt
```

새로 추가된 패키지:
- `sqlalchemy>=2.0.0` - ORM
- `feedparser>=6.0.11` - RSS 파싱
- `beautifulsoup4>=4.12.0` - HTML 파싱
- `deep-translator>=1.11.4` - 번역 (Python 3.13+ 호환)
- `APScheduler>=3.10.4` - 스케줄링 (현재는 asyncio 사용)

### 2. Docker 컨테이너 실행
```bash
# PostgreSQL 및 Redis 시작
docker-compose up -d
```

### 3. FastAPI 서버 실행
```bash
# 개발 모드
python main.py

# 또는 uvicorn 직접 실행
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 데이터베이스 스키마

### News 테이블
```sql
CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,           -- 원문 제목
    title_kr VARCHAR(500),                 -- 한국어 번역 제목
    link VARCHAR(1000) UNIQUE NOT NULL,    -- 기사 링크 (유니크)
    published TIMESTAMP,                   -- 발행 시간
    source VARCHAR(100) NOT NULL,          -- 뉴스 출처
    description TEXT,                      -- 기사 요약
    created_at TIMESTAMP DEFAULT NOW()     -- DB 저장 시간
);

-- 인덱스
CREATE INDEX idx_news_source_published ON news(source, published);
CREATE INDEX idx_news_created_at ON news(created_at);
CREATE INDEX idx_news_link ON news(link);
```

## API 엔드포인트

### 1. 뉴스 목록 조회
```http
GET /api/news?skip=0&limit=20&source=CoinDesk
```

**쿼리 파라미터**:
- `skip` (선택): 건너뛸 항목 수 (기본값: 0)
- `limit` (선택): 가져올 항목 수 (기본값: 20, 최대: 100)
- `source` (선택): 특정 소스로 필터링 (예: CoinDesk, CoinTelegraph)

**응답 예시**:
```json
{
  "total": 150,
  "items": [
    {
      "id": 1,
      "title": "Bitcoin Reaches New All-Time High",
      "title_kr": "비트코인이 사상 최고치를 경신했습니다",
      "link": "https://www.coindesk.com/...",
      "published": "2025-12-07T10:30:00Z",
      "source": "CoinDesk",
      "description": "Bitcoin has reached...",
      "created_at": "2025-12-07T10:31:00Z"
    }
  ]
}
```

### 2. 뉴스 소스 목록 조회
```http
GET /api/news/sources
```

**응답 예시**:
```json
["CoinDesk", "CoinTelegraph", "Bitcoin Magazine"]
```

### 3. 뉴스 상세 조회
```http
GET /api/news/{news_id}
```

**응답 예시**:
```json
{
  "id": 1,
  "title": "Bitcoin Reaches New All-Time High",
  "title_kr": "비트코인이 사상 최고치를 경신했습니다",
  "link": "https://www.coindesk.com/...",
  "published": "2025-12-07T10:30:00Z",
  "source": "CoinDesk",
  "description": "Bitcoin has reached a new all-time high...",
  "created_at": "2025-12-07T10:31:00Z"
}
```

## 아키텍처

### 디렉토리 구조
```
backend/
├── app/
│   ├── core/
│   │   ├── config.py           # 환경 설정
│   │   ├── database.py         # DB 연결 관리
│   │   └── redis.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── news.py             # News SQLAlchemy 모델
│   ├── routers/
│   │   ├── news.py             # 뉴스 API 엔드포인트
│   │   ├── candles.py
│   │   └── ws.py
│   └── services/
│       ├── ingestor.py
│       └── news_collector.py   # RSS 수집 로직
├── main.py                     # FastAPI 앱 진입점
└── requirements.txt
```

### 실행 흐름
1. **애플리케이션 시작**: `main.py`의 `lifespan` 이벤트 핸들러 실행
2. **DB 초기화**: `init_db()`로 테이블 자동 생성
3. **백그라운드 태스크 시작**: `run_news_collector()` 태스크 생성
4. **주기적 수집**: 10초마다 `collect_news()` 실행
   - 모든 RSS 피드 순회
   - 뉴스 항목 파싱
   - 한국어 번역
   - 중복 체크 후 DB 저장

## 환경 변수

`.env` 파일 또는 환경 변수로 설정:

```env
# PostgreSQL 설정
POSTGRES_USER=quantboard
POSTGRES_PASSWORD=quantboard_dev
POSTGRES_DB=quantboard
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# API 설정
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development
```

## 로깅

모든 주요 작업은 로그로 기록됩니다:
- 뉴스 수집 시작/완료
- 각 소스에서 가져온 뉴스 개수
- 새로 저장된 뉴스 개수
- 오류 및 경고

**로그 예시**:
```
2025-12-07 10:30:00 - app.services.news_collector - INFO - 뉴스 수집 시작...
2025-12-07 10:30:01 - app.services.news_collector - INFO - CoinDesk에서 10개의 뉴스 항목 가져옴
2025-12-07 10:30:05 - app.services.news_collector - INFO - 새 뉴스 저장: Bitcoin Reaches New All-Time High... (출처: CoinDesk)
2025-12-07 10:30:15 - app.services.news_collector - INFO - 뉴스 수집 완료: 30개 수집, 5개 새로 저장
```

## 모니터링 및 관리

### 데이터베이스 접속
```bash
# Docker 컨테이너를 통해 PostgreSQL 접속
docker exec -it quantboard-postgres psql -U quantboard -d quantboard

# 뉴스 테이블 확인
\dt
SELECT COUNT(*) FROM news;
SELECT * FROM news ORDER BY created_at DESC LIMIT 10;
```

### 수집기 상태 확인
서버 로그를 확인하여 뉴스 수집기가 정상적으로 작동하는지 확인할 수 있습니다.

## 추가 RSS 피드 추가 방법

`app/services/news_collector.py` 파일의 `RSS_FEEDS` 딕셔너리에 추가:

```python
RSS_FEEDS = {
    "CoinDesk": "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "CoinTelegraph": "https://cointelegraph.com/rss",
    "Bitcoin Magazine": "https://bitcoinmagazine.com/.rss/full/",
    # 새 피드 추가
    "YourSource": "https://example.com/rss/feed.xml",
}
```

## 제한사항 및 고려사항

1. **번역 API Rate Limit**: 
   - `deep-translator`는 무료 Google Translate API를 사용하므로 rate limit이 있을 수 있음
   - 각 뉴스 항목 저장 후 0.5초 대기 시간 추가됨

2. **RSS 피드 가용성**:
   - 외부 RSS 피드가 다운되거나 구조가 변경될 수 있음
   - 오류 발생 시 해당 소스는 건너뛰고 다른 소스 계속 수집

3. **스토리지**:
   - 지속적인 수집으로 DB 크기가 증가할 수 있음
   - 필요시 오래된 뉴스 정리 로직 추가 권장

## 문제 해결

### 1. 번역이 안 되는 경우
- `deep-translator` 설치 확인: `pip install deep-translator`
- 네트워크 연결 확인 (Google Translate API 접근 필요)
- 로그에서 번역 오류 메시지 확인
- Python 3.13+ 사용 시 `googletrans` 대신 `deep-translator` 필수

### 2. 중복 뉴스가 저장되는 경우
- DB에 유니크 제약조건이 제대로 설정되었는지 확인
- `link` 컬럼의 인덱스 확인

### 3. RSS 피드 파싱 오류
- 피드 URL이 유효한지 확인
- RSS 피드 형식이 표준을 따르는지 확인
- `feedparser` 라이브러리 버전 업데이트

## 향후 개선 사항

- [ ] 뉴스 본문 전체 크롤링 추가
- [ ] 감정 분석 (Sentiment Analysis) 추가
- [ ] 뉴스 카테고리 자동 분류
- [ ] WebSocket을 통한 실시간 뉴스 푸시
- [ ] 관리자 대시보드 (수집 상태 모니터링)
- [ ] 오래된 뉴스 자동 삭제 (보관 기간 설정)
- [ ] 더 많은 뉴스 소스 추가
