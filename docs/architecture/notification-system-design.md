# QuantBoard V1 - Notification System Architecture Design

## 1. Executive Summary

QuantBoard V1 트레이딩 대시보드를 위한 실시간 알림 시스템 아키텍처 설계 문서입니다.
사용자 정의 가격 알림, 뉴스 알림, 시스템 알림을 지원합니다.

---

## 2. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           NOTIFICATION SYSTEM ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────────┐
                              │   TRIGGER SOURCES   │
                              └─────────────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         │                              │                              │
         ▼                              ▼                              ▼
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│  Price Events   │          │   News Events   │          │  System Events  │
│  ─────────────  │          │  ─────────────  │          │  ─────────────  │
│ • Price alerts  │          │ • Breaking news │          │ • Login alerts  │
│ • % change      │          │ • Source updates│          │ • Session expiry│
│ • Volume spikes │          │ • Keyword match │          │ • API errors    │
└────────┬────────┘          └────────┬────────┘          └────────┬────────┘
         │                            │                            │
         └──────────────────────────────┼──────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              NOTIFICATION ENGINE                                 │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                         EVENT PROCESSOR                                     │ │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │ │
│  │  │   Event     │───▶│   Rule      │───▶│  Condition  │───▶│  Priority   │  │ │
│  │  │   Queue     │    │   Engine    │    │   Evaluator │    │   Resolver  │  │ │
│  │  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                        │                                         │
│                                        ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                       NOTIFICATION DISPATCHER                               │ │
│  │                                                                             │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │ │
│  │  │   In-App        │  │   WebSocket     │  │   Push          │            │ │
│  │  │   Notifications │  │   Broadcast     │  │   Notifications │            │ │
│  │  │   (DB Store)    │  │   (Real-time)   │  │   (Future)      │            │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘            │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         │                              │                              │
         ▼                              ▼                              ▼
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│   PostgreSQL    │          │     Redis       │          │   WebSocket     │
│   ───────────   │          │   ─────────     │          │   ───────────   │
│ • Notification  │          │ • Pub/Sub       │          │ • /ws/notifs    │
│   history       │          │ • Rate limiting │          │ • Per-user      │
│ • Alert rules   │          │ • Deduplication │          │   channels      │
│ • User prefs    │          │ • Cache         │          │ • Broadcast     │
└─────────────────┘          └─────────────────┘          └─────────────────┘
```

---

## 3. Component Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            DATA FLOW SEQUENCE                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

 PRICE ALERT FLOW:
 ═════════════════

 ┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
 │  Binance  │────▶│ Ingestor  │────▶│  Redis    │────▶│  Alert    │
 │  WebSocket│     │  Service  │     │ Pub/Sub   │     │  Checker  │
 └───────────┘     └───────────┘     └───────────┘     └─────┬─────┘
                                                              │
                                                              ▼
                                                    ┌─────────────────┐
                                                    │  Match Found?   │
                                                    │  ┌───────────┐  │
                                                    │  │ User Alert │  │
                                                    │  │   Rules    │  │
                                                    │  └───────────┘  │
                                                    └────────┬────────┘
                                              ┌──────────────┴──────────────┐
                                              │                             │
                                              ▼                             ▼
                                          [NO MATCH]                   [MATCH]
                                              │                             │
                                              ▼                             ▼
                                          (discard)              ┌─────────────────┐
                                                                 │  Create Notif   │
                                                                 │  ─────────────  │
                                                                 │ 1. Save to DB   │
                                                                 │ 2. Pub to Redis │
                                                                 │ 3. Send via WS  │
                                                                 └─────────────────┘


 NEWS ALERT FLOW:
 ════════════════

 ┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
 │  RSS      │────▶│  News     │────▶│ PostgreSQL│────▶│  News     │
 │  Feeds    │     │ Collector │     │ (new news)│     │ Analyzer  │
 └───────────┘     └───────────┘     └───────────┘     └─────┬─────┘
                                                              │
                                                              ▼
                                                    ┌─────────────────┐
                                                    │  Keyword Match? │
                                                    │  ┌───────────┐  │
                                                    │  │ User Subs │  │
                                                    │  │  Keywords │  │
                                                    │  └───────────┘  │
                                                    └────────┬────────┘
                                                              │
                                                              ▼
                                                    ┌─────────────────┐
                                                    │ Broadcast News  │
                                                    │ Notification    │
                                                    └─────────────────┘
```

---

## 4. Database Schema Design

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA (ERD)                               │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│           notifications              │
├──────────────────────────────────────┤
│ id            SERIAL PRIMARY KEY     │
│ user_id       INT FK → users.id      │
│ type          VARCHAR(50) NOT NULL   │◄──── 'price_alert' | 'news' | 'system'
│ title         VARCHAR(255) NOT NULL  │
│ message       TEXT NOT NULL          │
│ data          JSONB                  │◄──── 추가 메타데이터
│ priority      VARCHAR(20) DEFAULT    │◄──── 'low' | 'medium' | 'high' | 'urgent'
│               'medium'               │
│ is_read       BOOLEAN DEFAULT false  │
│ read_at       TIMESTAMP              │
│ created_at    TIMESTAMP DEFAULT NOW()│
│ expires_at    TIMESTAMP              │◄──── 알림 만료 시간 (optional)
├──────────────────────────────────────┤
│ INDEX idx_notif_user_unread          │
│   (user_id, is_read, created_at)     │
│ INDEX idx_notif_type                 │
│   (type, created_at)                 │
└──────────────────────────────────────┘
           │
           │ 1:N
           ▼
┌──────────────────────────────────────┐
│          price_alerts                │
├──────────────────────────────────────┤
│ id            SERIAL PRIMARY KEY     │
│ user_id       INT FK → users.id      │
│ symbol        VARCHAR(20) NOT NULL   │◄──── 'BTCUSDT', 'ETHUSDT'
│ condition     VARCHAR(20) NOT NULL   │◄──── 'above' | 'below' | 'cross'
│ target_price  DECIMAL(20,8) NOT NULL │
│ is_active     BOOLEAN DEFAULT true   │
│ is_triggered  BOOLEAN DEFAULT false  │
│ triggered_at  TIMESTAMP              │
│ is_recurring  BOOLEAN DEFAULT false  │◄──── 반복 알림 여부
│ cooldown_mins INT DEFAULT 60         │◄──── 재알림 대기 시간
│ last_notified TIMESTAMP              │
│ created_at    TIMESTAMP DEFAULT NOW()│
│ updated_at    TIMESTAMP              │
├──────────────────────────────────────┤
│ INDEX idx_alert_active_symbol        │
│   (is_active, symbol)                │
│ INDEX idx_alert_user                 │
│   (user_id, is_active)               │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│      notification_preferences        │
├──────────────────────────────────────┤
│ id            SERIAL PRIMARY KEY     │
│ user_id       INT FK → users.id      │
│               UNIQUE                 │
│ price_alerts  BOOLEAN DEFAULT true   │
│ news_alerts   BOOLEAN DEFAULT true   │
│ system_alerts BOOLEAN DEFAULT true   │
│ email_enabled BOOLEAN DEFAULT false  │◄──── 이메일 알림 (Future)
│ push_enabled  BOOLEAN DEFAULT false  │◄──── 푸시 알림 (Future)
│ quiet_start   TIME                   │◄──── 방해금지 시작
│ quiet_end     TIME                   │◄──── 방해금지 종료
│ created_at    TIMESTAMP DEFAULT NOW()│
│ updated_at    TIMESTAMP              │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│        news_subscriptions            │
├──────────────────────────────────────┤
│ id            SERIAL PRIMARY KEY     │
│ user_id       INT FK → users.id      │
│ source_id     INT FK → sources.id    │◄──── 구독 뉴스 소스
│ keywords      TEXT[]                 │◄──── 키워드 필터 (optional)
│ is_active     BOOLEAN DEFAULT true   │
│ created_at    TIMESTAMP DEFAULT NOW()│
├──────────────────────────────────────┤
│ UNIQUE (user_id, source_id)          │
└──────────────────────────────────────┘

     ┌─────────────────────────────────────────────────────────────┐
     │                    RELATIONSHIPS                            │
     ├─────────────────────────────────────────────────────────────┤
     │  users (1) ─────────────────────────────▶ (N) notifications │
     │  users (1) ─────────────────────────────▶ (N) price_alerts  │
     │  users (1) ─────────────────────────────▶ (1) notif_prefs   │
     │  users (1) ─────────────────────────────▶ (N) news_subs     │
     │  sources (1) ───────────────────────────▶ (N) news_subs     │
     └─────────────────────────────────────────────────────────────┘
```

---

## 5. WebSocket Notification Channel Design

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         WEBSOCKET CHANNELS ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────────────────────┘

                                 ┌─────────────────┐
                                 │ WebSocket Hub   │
                                 │ /ws/            │
                                 └────────┬────────┘
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              │                           │                           │
              ▼                           ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
    │  /ws/prices     │         │ /ws/notifications│        │  /ws/news       │
    │  ───────────    │         │  ───────────────│         │  ──────────     │
    │  (기존)          │         │  (NEW)          │         │  (NEW)          │
    │  실시간 가격     │         │  개인 알림      │         │  뉴스 브로드캐스트│
    │  브로드캐스트    │         │  (인증 필요)     │         │  (선택 구독)     │
    └─────────────────┘         └────────┬────────┘         └─────────────────┘
                                         │
                                         ▼
                               ┌─────────────────────┐
                               │  User Auth Check    │
                               │  JWT Token Verify   │
                               └──────────┬──────────┘
                                          │
                            ┌─────────────┴─────────────┐
                            │                           │
                            ▼                           ▼
                      [VALID TOKEN]              [INVALID TOKEN]
                            │                           │
                            ▼                           ▼
                   ┌─────────────────┐         ┌─────────────────┐
                   │ Register User   │         │ Send Error &    │
                   │ Connection      │         │ Close Connection│
                   └────────┬────────┘         └─────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Redis Channel   │
                   │ Subscribe:      │
                   │ notif:{user_id} │
                   └─────────────────┘


MESSAGE FORMAT (JSON):
══════════════════════

Price Alert Notification:
┌─────────────────────────────────────────────┐
│ {                                           │
│   "type": "price_alert",                    │
│   "id": "notif_123",                        │
│   "timestamp": "2024-01-20T10:30:00Z",      │
│   "priority": "high",                       │
│   "data": {                                 │
│     "symbol": "BTCUSDT",                    │
│     "condition": "above",                   │
│     "target_price": 45000.00,               │
│     "current_price": 45123.45,              │
│     "alert_id": 456                         │
│   },                                        │
│   "title": "BTC 가격 알림",                  │
│   "message": "BTC가 $45,000을 돌파했습니다"  │
│ }                                           │
└─────────────────────────────────────────────┘

News Notification:
┌─────────────────────────────────────────────┐
│ {                                           │
│   "type": "news",                           │
│   "id": "notif_124",                        │
│   "timestamp": "2024-01-20T10:35:00Z",      │
│   "priority": "medium",                     │
│   "data": {                                 │
│     "news_id": 789,                         │
│     "source": "CoinDesk",                   │
│     "url": "https://...",                   │
│     "matched_keywords": ["Bitcoin", "ETF"]  │
│   },                                        │
│   "title": "새로운 뉴스",                    │
│   "message": "Bitcoin ETF 승인 임박..."     │
│ }                                           │
└─────────────────────────────────────────────┘

System Notification:
┌─────────────────────────────────────────────┐
│ {                                           │
│   "type": "system",                         │
│   "id": "notif_125",                        │
│   "timestamp": "2024-01-20T10:40:00Z",      │
│   "priority": "urgent",                     │
│   "data": {                                 │
│     "code": "SESSION_EXPIRING",             │
│     "action_url": "/auth/login"             │
│   },                                        │
│   "title": "세션 만료 예정",                 │
│   "message": "5분 후 세션이 만료됩니다"      │
│ }                                           │
└─────────────────────────────────────────────┘
```

---

## 6. Backend Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND SERVICE STRUCTURE                               │
└─────────────────────────────────────────────────────────────────────────────────┘

backend/
├── app/
│   ├── models/
│   │   ├── notification.py          # Notification, PriceAlert 모델
│   │   └── notification_pref.py     # NotificationPreference, NewsSub 모델
│   │
│   ├── schemas/
│   │   └── notification.py          # Pydantic 스키마
│   │       ├── NotificationCreate
│   │       ├── NotificationResponse
│   │       ├── PriceAlertCreate
│   │       ├── PriceAlertUpdate
│   │       └── NotificationPreferenceUpdate
│   │
│   ├── routers/
│   │   ├── notifications.py         # REST API 엔드포인트
│   │   │   ├── GET  /api/notifications
│   │   │   ├── GET  /api/notifications/{id}
│   │   │   ├── POST /api/notifications/mark-read
│   │   │   ├── POST /api/notifications/mark-all-read
│   │   │   └── DELETE /api/notifications/{id}
│   │   │
│   │   ├── alerts.py                # 가격 알림 관리
│   │   │   ├── GET  /api/alerts
│   │   │   ├── POST /api/alerts
│   │   │   ├── PUT  /api/alerts/{id}
│   │   │   └── DELETE /api/alerts/{id}
│   │   │
│   │   └── ws_notifications.py      # WebSocket 알림 채널
│   │       └── WS /ws/notifications
│   │
│   └── services/
│       ├── notification_service.py  # 알림 생성/조회 로직
│       │   ├── create_notification()
│       │   ├── get_user_notifications()
│       │   ├── mark_as_read()
│       │   └── delete_notification()
│       │
│       ├── alert_checker.py         # 가격 알림 체커 (백그라운드)
│       │   ├── check_price_alerts()
│       │   ├── evaluate_condition()
│       │   └── trigger_alert()
│       │
│       └── notification_dispatcher.py # 알림 발송 관리
│           ├── dispatch()
│           ├── send_websocket()
│           ├── save_to_db()
│           └── publish_to_redis()


SERVICE INTERACTION:
═══════════════════

┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  AlertChecker   │─────▶│ NotificationSvc │─────▶│  Dispatcher     │
│  (Background)   │      │   (Create)      │      │  (Send)         │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                         │                        │
        ▼                         ▼                        ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Subscribe to    │      │ Save to DB      │      │ Publish to      │
│ Redis price     │      │ notifications   │      │ Redis channel   │
│ channel         │      │ table           │      │ notif:{user_id} │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

---

## 7. Frontend Integration Design

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND ARCHITECTURE                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

frontend/
├── components/
│   └── Notification/
│       ├── NotificationBell.tsx     # 알림 아이콘 + 뱃지
│       ├── NotificationDropdown.tsx # 알림 드롭다운 목록
│       ├── NotificationItem.tsx     # 개별 알림 항목
│       ├── NotificationToast.tsx    # 실시간 토스트 알림
│       └── AlertSettings.tsx        # 알림 설정 패널
│
├── hooks/
│   └── useNotifications.ts          # WebSocket 알림 훅
│       ├── connect()
│       ├── disconnect()
│       └── onNotification callback
│
├── store/
│   └── useNotificationStore.ts      # Zustand 알림 스토어
│       ├── notifications[]
│       ├── unreadCount
│       ├── addNotification()
│       ├── markAsRead()
│       └── removeNotification()
│
└── lib/api/
    └── notifications.ts             # REST API 클라이언트
        ├── getNotifications()
        ├── markAsRead()
        ├── markAllAsRead()
        ├── createPriceAlert()
        ├── updatePriceAlert()
        └── deletePriceAlert()


COMPONENT HIERARCHY:
═══════════════════

┌───────────────────────────────────────────────────────────────┐
│                        MainLayout                              │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                         TopNav                            │ │
│  │  ┌────────────────────────────────────────────────────┐  │ │
│  │  │ Logo │ NavLinks │ ... │ NotificationBell │ UserMenu│  │ │
│  │  └────────────────────────────────────────────────────┘  │ │
│  │                              │                            │ │
│  │                              ▼                            │ │
│  │                   ┌─────────────────────┐                 │ │
│  │                   │NotificationDropdown │                 │ │
│  │                   │ ┌─────────────────┐ │                 │ │
│  │                   │ │NotificationItem │ │                 │ │
│  │                   │ │NotificationItem │ │                 │ │
│  │                   │ │NotificationItem │ │                 │ │
│  │                   │ └─────────────────┘ │                 │ │
│  │                   └─────────────────────┘                 │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                    Page Content                           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              NotificationToast (Fixed Position)          │ │
│  │  ┌────────────────────────────────────────────────────┐  │ │
│  │  │  🔔 BTC 가격 알림: $45,000 돌파!              [X]  │  │ │
│  │  └────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘


ZUSTAND STORE DESIGN:
════════════════════

┌─────────────────────────────────────────────────────────────┐
│                 useNotificationStore                         │
├─────────────────────────────────────────────────────────────┤
│ STATE:                                                      │
│ ──────                                                      │
│ • notifications: Notification[]    // 알림 목록             │
│ • unreadCount: number              // 읽지 않은 알림 수     │
│ • isLoading: boolean               // 로딩 상태             │
│ • wsStatus: ConnectionStatus       // WebSocket 상태        │
│ • priceAlerts: PriceAlert[]        // 설정된 가격 알림      │
│                                                             │
│ ACTIONS:                                                    │
│ ────────                                                    │
│ • addNotification(notif)           // 새 알림 추가          │
│ • markAsRead(id)                   // 읽음 처리             │
│ • markAllAsRead()                  // 전체 읽음 처리        │
│ • removeNotification(id)           // 알림 삭제             │
│ • setNotifications(notifs)         // 알림 목록 설정        │
│ • setWsStatus(status)              // WS 상태 업데이트      │
│ • setPriceAlerts(alerts)           // 가격 알림 설정        │
│ • addPriceAlert(alert)             // 가격 알림 추가        │
│ • removePriceAlert(id)             // 가격 알림 삭제        │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. API Endpoints Specification

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              REST API ENDPOINTS                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

NOTIFICATIONS:
═════════════

┌──────────┬────────────────────────────┬─────────────────────────────────────────┐
│  Method  │  Endpoint                  │  Description                            │
├──────────┼────────────────────────────┼─────────────────────────────────────────┤
│  GET     │ /api/notifications         │ 사용자 알림 목록 조회                   │
│          │  ?skip=0&limit=20          │ - 페이지네이션 지원                     │
│          │  &type=price_alert         │ - 타입 필터                             │
│          │  &is_read=false            │ - 읽음 여부 필터                        │
├──────────┼────────────────────────────┼─────────────────────────────────────────┤
│  GET     │ /api/notifications/unread  │ 읽지 않은 알림 수 조회                  │
│          │                            │ Response: { count: 5 }                  │
├──────────┼────────────────────────────┼─────────────────────────────────────────┤
│  GET     │ /api/notifications/{id}    │ 특정 알림 상세 조회                     │
├──────────┼────────────────────────────┼─────────────────────────────────────────┤
│  PATCH   │ /api/notifications/{id}    │ 알림 읽음 처리                          │
│          │  /read                     │                                         │
├──────────┼────────────────────────────┼─────────────────────────────────────────┤
│  POST    │ /api/notifications         │ 전체 읽음 처리                          │
│          │  /mark-all-read            │                                         │
├──────────┼────────────────────────────┼─────────────────────────────────────────┤
│  DELETE  │ /api/notifications/{id}    │ 알림 삭제                               │
└──────────┴────────────────────────────┴─────────────────────────────────────────┘

PRICE ALERTS:
═════════════

┌──────────┬────────────────────────────┬─────────────────────────────────────────┐
│  Method  │  Endpoint                  │  Description                            │
├──────────┼────────────────────────────┼─────────────────────────────────────────┤
│  GET     │ /api/alerts                │ 사용자 가격 알림 목록                   │
│          │  ?symbol=BTCUSDT           │ - 심볼 필터                             │
│          │  &is_active=true           │ - 활성 상태 필터                        │
├──────────┼────────────────────────────┼─────────────────────────────────────────┤
│  POST    │ /api/alerts                │ 새 가격 알림 생성                       │
│          │                            │ Body: {                                 │
│          │                            │   symbol: "BTCUSDT",                    │
│          │                            │   condition: "above",                   │
│          │                            │   target_price: 45000,                  │
│          │                            │   is_recurring: false                   │
│          │                            │ }                                       │
├──────────┼────────────────────────────┼─────────────────────────────────────────┤
│  PUT     │ /api/alerts/{id}           │ 가격 알림 수정                          │
├──────────┼────────────────────────────┼─────────────────────────────────────────┤
│  DELETE  │ /api/alerts/{id}           │ 가격 알림 삭제                          │
├──────────┼────────────────────────────┼─────────────────────────────────────────┤
│  POST    │ /api/alerts/{id}/toggle    │ 알림 활성/비활성 토글                   │
└──────────┴────────────────────────────┴─────────────────────────────────────────┘

NOTIFICATION PREFERENCES:
═════════════════════════

┌──────────┬────────────────────────────┬─────────────────────────────────────────┐
│  Method  │  Endpoint                  │  Description                            │
├──────────┼────────────────────────────┼─────────────────────────────────────────┤
│  GET     │ /api/notifications         │ 알림 설정 조회                          │
│          │  /preferences              │                                         │
├──────────┼────────────────────────────┼─────────────────────────────────────────┤
│  PUT     │ /api/notifications         │ 알림 설정 업데이트                      │
│          │  /preferences              │ Body: {                                 │
│          │                            │   price_alerts: true,                   │
│          │                            │   news_alerts: true,                    │
│          │                            │   quiet_start: "22:00",                 │
│          │                            │   quiet_end: "07:00"                    │
│          │                            │ }                                       │
└──────────┴────────────────────────────┴─────────────────────────────────────────┘

NEWS SUBSCRIPTIONS:
═══════════════════

┌──────────┬────────────────────────────┬─────────────────────────────────────────┐
│  Method  │  Endpoint                  │  Description                            │
├──────────┼────────────────────────────┼─────────────────────────────────────────┤
│  GET     │ /api/news/subscriptions    │ 구독 중인 뉴스 소스 목록                │
├──────────┼────────────────────────────┼─────────────────────────────────────────┤
│  POST    │ /api/news/subscriptions    │ 뉴스 소스 구독                          │
│          │                            │ Body: {                                 │
│          │                            │   source_id: 1,                         │
│          │                            │   keywords: ["Bitcoin", "ETF"]          │
│          │                            │ }                                       │
├──────────┼────────────────────────────┼─────────────────────────────────────────┤
│  DELETE  │ /api/news/subscriptions    │ 구독 해제                               │
│          │  /{source_id}              │                                         │
└──────────┴────────────────────────────┴─────────────────────────────────────────┘
```

---

## 9. Redis Pub/Sub Channel Design

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          REDIS CHANNEL STRUCTURE                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

CHANNELS:
═════════

┌─────────────────────────────────────────────────────────────┐
│ Channel Name              │ Purpose                         │
├───────────────────────────┼─────────────────────────────────┤
│ live_prices               │ 실시간 가격 브로드캐스트 (기존) │
│ notifications:{user_id}   │ 개인별 알림 채널                │
│ notifications:broadcast   │ 전체 사용자 시스템 알림         │
│ news:updates              │ 새 뉴스 알림 브로드캐스트       │
└───────────────────────────┴─────────────────────────────────┘


RATE LIMITING (Sorted Set):
═══════════════════════════

┌─────────────────────────────────────────────────────────────┐
│ Key: rate_limit:alert:{user_id}:{alert_id}                  │
│ Value: Unix timestamp                                       │
│ TTL: cooldown_mins (from alert settings)                    │
│                                                             │
│ Purpose: 동일 알림의 반복 발송 방지                         │
└─────────────────────────────────────────────────────────────┘


DEDUPLICATION (Set with TTL):
═════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│ Key: dedup:notif:{hash}                                     │
│ Value: 1                                                    │
│ TTL: 300 (5분)                                              │
│                                                             │
│ Purpose: 중복 알림 발송 방지 (hash = type+user+content)     │
└─────────────────────────────────────────────────────────────┘


UNREAD COUNT CACHE:
══════════════════

┌─────────────────────────────────────────────────────────────┐
│ Key: notif:unread:{user_id}                                 │
│ Value: integer count                                        │
│ TTL: None (update on notification create/read)              │
│                                                             │
│ Purpose: 빠른 unread count 조회를 위한 캐시                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Implementation Priority & Phases

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          IMPLEMENTATION ROADMAP                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

PHASE 1: Core Infrastructure (MVP)
═══════════════════════════════════
Priority: HIGH

┌─────────────────────────────────────────────────────────────┐
│ Backend:                                                    │
│ □ Notification, PriceAlert 모델 생성                        │
│ □ NotificationService 구현                                  │
│ □ REST API 엔드포인트 구현                                  │
│ □ WebSocket /ws/notifications 채널 추가                     │
│                                                             │
│ Frontend:                                                   │
│ □ useNotificationStore 생성                                 │
│ □ useNotifications 훅 구현                                  │
│ □ NotificationBell 컴포넌트                                 │
│ □ NotificationDropdown 컴포넌트                             │
└─────────────────────────────────────────────────────────────┘

PHASE 2: Price Alerts
═════════════════════
Priority: HIGH

┌─────────────────────────────────────────────────────────────┐
│ Backend:                                                    │
│ □ AlertChecker 백그라운드 서비스                            │
│ □ 가격 조건 평가 로직                                       │
│ □ Price Alert CRUD API                                      │
│                                                             │
│ Frontend:                                                   │
│ □ AlertSettings 컴포넌트                                    │
│ □ 가격 알림 생성 모달                                       │
│ □ 차트에서 우클릭 → 알림 설정 기능                          │
└─────────────────────────────────────────────────────────────┘

PHASE 3: News Alerts & Preferences
═══════════════════════════════════
Priority: MEDIUM

┌─────────────────────────────────────────────────────────────┐
│ Backend:                                                    │
│ □ NewsSubscription 모델                                     │
│ □ NotificationPreference 모델                               │
│ □ 뉴스 키워드 매칭 로직                                     │
│ □ 방해금지 모드 구현                                        │
│                                                             │
│ Frontend:                                                   │
│ □ 알림 설정 페이지                                          │
│ □ 뉴스 소스 구독 UI                                         │
│ □ 키워드 필터 설정                                          │
└─────────────────────────────────────────────────────────────┘

PHASE 4: Advanced Features
══════════════════════════
Priority: LOW (Future)

┌─────────────────────────────────────────────────────────────┐
│ □ Email 알림 (Resend/SendGrid 연동)                         │
│ □ Push 알림 (Web Push API)                                  │
│ □ 알림 히스토리 대시보드                                    │
│ □ 알림 분석 (가장 많이 트리거된 알림 등)                    │
│ □ 알림 템플릿 커스터마이징                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Security Considerations

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          SECURITY CHECKLIST                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

AUTHENTICATION & AUTHORIZATION:
═══════════════════════════════
✓ WebSocket 연결 시 JWT 토큰 검증 필수
✓ 알림 조회/수정 시 소유권 검증 (user_id 일치 확인)
✓ Rate limiting: 사용자당 알림 생성 횟수 제한

DATA PROTECTION:
════════════════
✓ 민감한 알림 데이터 암호화 저장 고려
✓ SQL Injection 방지 (SQLAlchemy ORM 사용)
✓ XSS 방지 (프론트엔드 출력 시 이스케이프)

RATE LIMITING:
═════════════
✓ 가격 알림: 사용자당 최대 50개 제한
✓ 알림 발송: 동일 알림 60초 쿨다운
✓ API 요청: 분당 100회 제한 (Redis 기반)

INPUT VALIDATION:
════════════════
✓ target_price: 양수 숫자만 허용
✓ symbol: 허용된 심볼 리스트 검증
✓ keywords: 길이 제한 (각 키워드 50자, 최대 10개)
```

---

## 12. File Structure Summary

```
backend/
├── app/
│   ├── models/
│   │   ├── notification.py          # NEW
│   │   └── notification_pref.py     # NEW
│   ├── schemas/
│   │   └── notification.py          # NEW
│   ├── routers/
│   │   ├── notifications.py         # NEW
│   │   ├── alerts.py                # NEW
│   │   └── ws_notifications.py      # NEW
│   └── services/
│       ├── notification_service.py  # NEW
│       ├── alert_checker.py         # NEW
│       └── notification_dispatcher.py # NEW

frontend/
├── components/
│   └── Notification/
│       ├── NotificationBell.tsx     # NEW
│       ├── NotificationDropdown.tsx # NEW
│       ├── NotificationItem.tsx     # NEW
│       ├── NotificationToast.tsx    # NEW
│       └── AlertSettings.tsx        # NEW
├── hooks/
│   └── useNotifications.ts          # NEW
├── store/
│   └── useNotificationStore.ts      # NEW
└── lib/api/
    └── notifications.ts             # NEW
```

---

## 13. Next Steps

1. `/sc:implement notification-models` - 데이터베이스 모델 구현
2. `/sc:implement notification-service` - 백엔드 서비스 구현
3. `/sc:implement notification-api` - REST API 구현
4. `/sc:implement notification-websocket` - WebSocket 채널 구현
5. `/sc:implement notification-frontend` - 프론트엔드 컴포넌트 구현

---

*Document generated by /sc:design*
*Last updated: 2024-01-20*
