# QuantBoard 커뮤니티 시스템 설계서

## 1. 개요

### 1.1 목표
QuantBoard V1에 트레이더 커뮤니티 기능을 추가하여 사용자들이 시장 인사이트를 공유하고 토론할 수 있는 플랫폼 구축

### 1.2 핵심 기능
- **인증 시스템**: OAuth 소셜 로그인 (Google/GitHub) + 이메일/비밀번호 자체 회원가입
- **게시판**: 게시글 작성, 수정, 삭제, 조회
- **댓글 시스템**: 게시글 댓글, 대댓글 지원
- **상호작용**: 좋아요, 태그, 카테고리 분류
- **사용자 프로필**: 기본 프로필 정보, 활동 내역

---

## 2. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                           │
├─────────────────────────────────────────────────────────────────────┤
│  Pages:                                                              │
│   - /auth/login, /auth/register, /auth/callback                     │
│   - /community (게시글 목록)                                         │
│   - /community/[id] (게시글 상세)                                    │
│   - /community/write (글 작성)                                       │
│   - /profile/[username] (사용자 프로필)                              │
│                                                                      │
│  Store: useAuthStore (Zustand)                                       │
│  Components: AuthModal, PostCard, CommentSection, ProfileCard        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ REST API + JWT
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Backend (FastAPI)                            │
├─────────────────────────────────────────────────────────────────────┤
│  Routers:                                                            │
│   - /api/auth/* (인증)                                               │
│   - /api/users/* (사용자 관리)                                       │
│   - /api/posts/* (게시글)                                            │
│   - /api/comments/* (댓글)                                           │
│                                                                      │
│  Services:                                                           │
│   - AuthService (JWT 발급, OAuth 처리)                               │
│   - UserService (사용자 CRUD)                                        │
│   - PostService (게시글 CRUD)                                        │
│   - CommentService (댓글 CRUD)                                       │
│                                                                      │
│  Middleware:                                                         │
│   - JWTAuthMiddleware (토큰 검증)                                    │
│   - RateLimitMiddleware (API 제한)                                   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                             │
├─────────────────────────────────────────────────────────────────────┤
│  Tables:                                                             │
│   - users (사용자)                                                   │
│   - oauth_accounts (소셜 연동)                                       │
│   - posts (게시글)                                                   │
│   - comments (댓글)                                                  │
│   - post_likes (좋아요)                                              │
│   - tags (태그)                                                      │
│   - post_tags (게시글-태그 연결)                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. 데이터베이스 스키마

### 3.1 ERD (Entity Relationship Diagram)

```
┌──────────────────┐       ┌──────────────────┐
│      users       │       │  oauth_accounts  │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │◄──────┤ user_id (FK)     │
│ email            │       │ provider         │
│ username         │       │ provider_id      │
│ password_hash    │       │ access_token     │
│ display_name     │       │ created_at       │
│ avatar_url       │       └──────────────────┘
│ bio              │
│ is_active        │       ┌──────────────────┐
│ is_verified      │       │      posts       │
│ created_at       │       ├──────────────────┤
│ updated_at       │◄──────┤ author_id (FK)   │
└──────────────────┘       │ id (PK)          │
                           │ title            │
                           │ content          │
                           │ category         │
┌──────────────────┐       │ view_count       │
│     comments     │       │ is_published     │
├──────────────────┤       │ created_at       │
│ id (PK)          │       │ updated_at       │
│ post_id (FK)     │──────►└──────────────────┘
│ author_id (FK)   │               │
│ parent_id (FK)   │──┐            │
│ content          │  │            │
│ created_at       │  │            ▼
│ updated_at       │◄─┘    ┌──────────────────┐
└──────────────────┘       │   post_likes     │
                           ├──────────────────┤
┌──────────────────┐       │ user_id (FK)     │
│       tags       │       │ post_id (FK)     │
├──────────────────┤       │ created_at       │
│ id (PK)          │       └──────────────────┘
│ name             │
│ slug             │       ┌──────────────────┐
│ post_count       │       │    post_tags     │
└──────────────────┘       ├──────────────────┤
         ▲                 │ post_id (FK)     │
         └─────────────────┤ tag_id (FK)      │
                           └──────────────────┘
```

### 3.2 테이블 상세 정의

#### users (사용자)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | INTEGER | PK, AUTO | 사용자 고유 ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 이메일 주소 |
| username | VARCHAR(50) | UNIQUE, NOT NULL | 사용자명 (URL용) |
| password_hash | VARCHAR(255) | NULL | 비밀번호 해시 (OAuth는 NULL) |
| display_name | VARCHAR(100) | NOT NULL | 표시 이름 |
| avatar_url | VARCHAR(500) | NULL | 프로필 이미지 URL |
| bio | TEXT | NULL | 자기소개 |
| is_active | BOOLEAN | DEFAULT TRUE | 활성 상태 |
| is_verified | BOOLEAN | DEFAULT FALSE | 이메일 인증 여부 |
| created_at | TIMESTAMP | DEFAULT NOW() | 가입일 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 수정일 |

**인덱스:**
- `idx_users_email` (email)
- `idx_users_username` (username)

#### oauth_accounts (OAuth 계정 연동)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | INTEGER | PK, AUTO | 고유 ID |
| user_id | INTEGER | FK(users.id), NOT NULL | 연결된 사용자 |
| provider | VARCHAR(50) | NOT NULL | OAuth 제공자 (google, github) |
| provider_id | VARCHAR(255) | NOT NULL | 제공자 측 사용자 ID |
| access_token | VARCHAR(500) | NULL | 액세스 토큰 (암호화) |
| refresh_token | VARCHAR(500) | NULL | 리프레시 토큰 (암호화) |
| created_at | TIMESTAMP | DEFAULT NOW() | 연동일 |

**인덱스:**
- `idx_oauth_provider_id` (provider, provider_id) - UNIQUE

#### posts (게시글)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | INTEGER | PK, AUTO | 게시글 ID |
| author_id | INTEGER | FK(users.id), NOT NULL | 작성자 |
| title | VARCHAR(200) | NOT NULL | 제목 |
| content | TEXT | NOT NULL | 본문 (Markdown) |
| category | VARCHAR(50) | NOT NULL | 카테고리 |
| view_count | INTEGER | DEFAULT 0 | 조회수 |
| like_count | INTEGER | DEFAULT 0 | 좋아요 수 (캐시) |
| comment_count | INTEGER | DEFAULT 0 | 댓글 수 (캐시) |
| is_published | BOOLEAN | DEFAULT TRUE | 공개 여부 |
| is_pinned | BOOLEAN | DEFAULT FALSE | 상단 고정 |
| created_at | TIMESTAMP | DEFAULT NOW() | 작성일 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 수정일 |

**인덱스:**
- `idx_posts_author` (author_id)
- `idx_posts_category` (category)
- `idx_posts_created_at` (created_at DESC)
- `idx_posts_trending` (like_count DESC, created_at DESC)

#### comments (댓글)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | INTEGER | PK, AUTO | 댓글 ID |
| post_id | INTEGER | FK(posts.id), NOT NULL | 게시글 |
| author_id | INTEGER | FK(users.id), NOT NULL | 작성자 |
| parent_id | INTEGER | FK(comments.id), NULL | 부모 댓글 (대댓글용) |
| content | TEXT | NOT NULL | 댓글 내용 |
| like_count | INTEGER | DEFAULT 0 | 좋아요 수 |
| is_deleted | BOOLEAN | DEFAULT FALSE | 삭제 여부 (soft delete) |
| created_at | TIMESTAMP | DEFAULT NOW() | 작성일 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 수정일 |

**인덱스:**
- `idx_comments_post` (post_id, created_at)
- `idx_comments_author` (author_id)
- `idx_comments_parent` (parent_id)

#### post_likes (게시글 좋아요)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | INTEGER | PK, AUTO | 고유 ID |
| user_id | INTEGER | FK(users.id), NOT NULL | 사용자 |
| post_id | INTEGER | FK(posts.id), NOT NULL | 게시글 |
| created_at | TIMESTAMP | DEFAULT NOW() | 좋아요 시간 |

**인덱스:**
- `idx_post_likes_unique` (user_id, post_id) - UNIQUE

#### tags (태그)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | INTEGER | PK, AUTO | 태그 ID |
| name | VARCHAR(50) | NOT NULL | 태그 이름 |
| slug | VARCHAR(50) | UNIQUE, NOT NULL | URL용 슬러그 |
| post_count | INTEGER | DEFAULT 0 | 게시글 수 (캐시) |
| created_at | TIMESTAMP | DEFAULT NOW() | 생성일 |

**인덱스:**
- `idx_tags_slug` (slug)
- `idx_tags_popular` (post_count DESC)

#### post_tags (게시글-태그 연결)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| post_id | INTEGER | FK(posts.id), NOT NULL | 게시글 |
| tag_id | INTEGER | FK(tags.id), NOT NULL | 태그 |

**인덱스:**
- `idx_post_tags_pk` (post_id, tag_id) - PRIMARY KEY

---

## 4. API 엔드포인트 설계

### 4.1 인증 API (`/api/auth`)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| POST | `/api/auth/register` | 이메일 회원가입 | - |
| POST | `/api/auth/login` | 이메일 로그인 | - |
| POST | `/api/auth/logout` | 로그아웃 | Required |
| POST | `/api/auth/refresh` | 토큰 갱신 | Refresh Token |
| GET | `/api/auth/oauth/{provider}` | OAuth 시작 (Google/GitHub) | - |
| GET | `/api/auth/oauth/{provider}/callback` | OAuth 콜백 | - |
| POST | `/api/auth/verify-email` | 이메일 인증 | - |
| POST | `/api/auth/forgot-password` | 비밀번호 재설정 요청 | - |
| POST | `/api/auth/reset-password` | 비밀번호 재설정 | - |

#### Request/Response 스키마

**POST /api/auth/register**
```json
// Request
{
  "email": "user@example.com",
  "username": "trader123",
  "password": "SecurePass123!",
  "display_name": "트레이더123"
}

// Response (201 Created)
{
  "id": 1,
  "email": "user@example.com",
  "username": "trader123",
  "display_name": "트레이더123",
  "message": "인증 이메일을 발송했습니다"
}
```

**POST /api/auth/login**
```json
// Request
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

// Response (200 OK)
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "trader123",
    "display_name": "트레이더123",
    "avatar_url": null
  }
}
```

### 4.2 사용자 API (`/api/users`)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/api/users/me` | 현재 사용자 정보 | Required |
| PATCH | `/api/users/me` | 프로필 수정 | Required |
| GET | `/api/users/{username}` | 사용자 프로필 조회 | - |
| GET | `/api/users/{username}/posts` | 사용자 게시글 목록 | - |

**GET /api/users/me**
```json
// Response (200 OK)
{
  "id": 1,
  "email": "user@example.com",
  "username": "trader123",
  "display_name": "트레이더123",
  "avatar_url": "https://...",
  "bio": "비트코인 트레이더입니다",
  "is_verified": true,
  "created_at": "2024-01-15T10:30:00Z",
  "stats": {
    "post_count": 15,
    "comment_count": 42,
    "total_likes": 128
  }
}
```

### 4.3 게시글 API (`/api/posts`)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/api/posts` | 게시글 목록 | - |
| POST | `/api/posts` | 게시글 작성 | Required |
| GET | `/api/posts/{id}` | 게시글 상세 | - |
| PATCH | `/api/posts/{id}` | 게시글 수정 | Required (작성자) |
| DELETE | `/api/posts/{id}` | 게시글 삭제 | Required (작성자) |
| POST | `/api/posts/{id}/like` | 좋아요 토글 | Required |
| GET | `/api/posts/categories` | 카테고리 목록 | - |
| GET | `/api/posts/tags` | 인기 태그 목록 | - |

**GET /api/posts**
```
Query Parameters:
- skip: int (default: 0)
- limit: int (default: 20, max: 50)
- category: string (optional)
- tag: string (optional)
- author: string (optional, username)
- sort: "latest" | "trending" | "top" (default: "latest")
- search: string (optional, 제목/내용 검색)
```

```json
// Response (200 OK)
{
  "items": [
    {
      "id": 1,
      "title": "BTC/USDT 강세 전환 신호 분석",
      "content_preview": "최근 기술적 지표를 분석한 결과...",
      "category": "분석",
      "author": {
        "id": 1,
        "username": "cryptoanalyst",
        "display_name": "CryptoAnalyst",
        "avatar_url": "https://..."
      },
      "tags": ["BTC", "기술분석", "강세"],
      "view_count": 234,
      "like_count": 42,
      "comment_count": 18,
      "is_liked": false,
      "created_at": "2024-01-20T14:30:00Z"
    }
  ],
  "total": 156,
  "skip": 0,
  "limit": 20
}
```

**POST /api/posts**
```json
// Request
{
  "title": "BTC/USDT 강세 전환 신호 분석",
  "content": "## 기술적 분석\n\n최근 기술적 지표를...",
  "category": "분석",
  "tags": ["BTC", "기술분석", "강세"]
}

// Response (201 Created)
{
  "id": 1,
  "title": "BTC/USDT 강세 전환 신호 분석",
  "content": "## 기술적 분석\n\n최근 기술적 지표를...",
  "category": "분석",
  "author": { ... },
  "tags": ["BTC", "기술분석", "강세"],
  "created_at": "2024-01-20T14:30:00Z"
}
```

### 4.4 댓글 API (`/api/comments`)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/api/posts/{post_id}/comments` | 댓글 목록 | - |
| POST | `/api/posts/{post_id}/comments` | 댓글 작성 | Required |
| PATCH | `/api/comments/{id}` | 댓글 수정 | Required (작성자) |
| DELETE | `/api/comments/{id}` | 댓글 삭제 | Required (작성자) |
| POST | `/api/comments/{id}/like` | 댓글 좋아요 | Required |

**GET /api/posts/{post_id}/comments**
```json
// Response (200 OK)
{
  "items": [
    {
      "id": 1,
      "content": "좋은 분석이네요!",
      "author": {
        "id": 2,
        "username": "trader456",
        "display_name": "Trader456",
        "avatar_url": null
      },
      "like_count": 5,
      "is_liked": false,
      "created_at": "2024-01-20T15:00:00Z",
      "replies": [
        {
          "id": 2,
          "content": "감사합니다!",
          "author": { ... },
          "parent_id": 1,
          "like_count": 2,
          "created_at": "2024-01-20T15:05:00Z"
        }
      ]
    }
  ],
  "total": 18
}
```

---

## 5. Frontend 컴포넌트 설계

### 5.1 페이지 구조

```
frontend/app/
├── auth/
│   ├── login/page.tsx          # 로그인 페이지
│   ├── register/page.tsx       # 회원가입 페이지
│   └── callback/page.tsx       # OAuth 콜백 처리
├── community/
│   ├── page.tsx                # 게시글 목록 (기존 파일 수정)
│   ├── [id]/page.tsx           # 게시글 상세
│   └── write/page.tsx          # 글 작성/수정
└── profile/
    └── [username]/page.tsx     # 사용자 프로필
```

### 5.2 컴포넌트 구조

```
frontend/components/
├── Auth/
│   ├── LoginForm.tsx           # 로그인 폼
│   ├── RegisterForm.tsx        # 회원가입 폼
│   ├── SocialLoginButtons.tsx  # OAuth 버튼들
│   └── AuthGuard.tsx           # 인증 필요 페이지 래퍼
├── Community/
│   ├── PostCard.tsx            # 게시글 카드 (목록용)
│   ├── PostDetail.tsx          # 게시글 상세
│   ├── PostEditor.tsx          # 게시글 에디터 (Markdown)
│   ├── CommentSection.tsx      # 댓글 섹션
│   ├── CommentItem.tsx         # 개별 댓글
│   ├── CommentEditor.tsx       # 댓글 입력
│   ├── TagInput.tsx            # 태그 입력
│   ├── CategoryFilter.tsx      # 카테고리 필터
│   └── LikeButton.tsx          # 좋아요 버튼
└── Profile/
    ├── ProfileHeader.tsx       # 프로필 헤더
    ├── ProfileStats.tsx        # 활동 통계
    ├── ProfileEditModal.tsx    # 프로필 수정 모달
    └── UserPostList.tsx        # 사용자 게시글 목록
```

### 5.3 상태 관리 (Zustand Store)

**useAuthStore.ts**
```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: 'google' | 'github') => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  checkAuth: () => Promise<void>;
}
```

**useCommunityStore.ts**
```typescript
interface CommunityState {
  posts: Post[];
  currentPost: Post | null;
  comments: Comment[];
  isLoading: boolean;
  filters: {
    category: string | null;
    tag: string | null;
    sort: 'latest' | 'trending' | 'top';
  };
  pagination: {
    skip: number;
    limit: number;
    total: number;
  };

  // Actions
  fetchPosts: (reset?: boolean) => Promise<void>;
  fetchPost: (id: number) => Promise<void>;
  createPost: (data: CreatePostData) => Promise<Post>;
  updatePost: (id: number, data: UpdatePostData) => Promise<void>;
  deletePost: (id: number) => Promise<void>;
  toggleLike: (postId: number) => Promise<void>;
  setFilters: (filters: Partial<Filters>) => void;

  // Comments
  fetchComments: (postId: number) => Promise<void>;
  addComment: (postId: number, content: string, parentId?: number) => Promise<void>;
  deleteComment: (commentId: number) => Promise<void>;
}
```

### 5.4 Custom Hooks

```typescript
// hooks/useAuth.ts
export function useAuth() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuthStore();
  return { user, isAuthenticated, isLoading, login, logout };
}

// hooks/useRequireAuth.ts
export function useRequireAuth(redirectTo = '/auth/login') {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  return { isAuthenticated, isLoading };
}

// hooks/usePosts.ts
export function usePosts() {
  const { posts, isLoading, filters, pagination, fetchPosts, setFilters } = useCommunityStore();

  useEffect(() => {
    fetchPosts(true);
  }, [filters]);

  return { posts, isLoading, filters, pagination, setFilters, loadMore: () => fetchPosts() };
}
```

---

## 6. 보안 설계

### 6.1 인증 흐름

**JWT 토큰 구조**
```
Access Token (15분):
{
  "sub": "user_id",
  "email": "user@example.com",
  "username": "trader123",
  "exp": 1705756800,
  "iat": 1705755900,
  "type": "access"
}

Refresh Token (7일):
{
  "sub": "user_id",
  "exp": 1706360700,
  "iat": 1705755900,
  "type": "refresh"
}
```

**토큰 저장**
- Access Token: 메모리 (Zustand store)
- Refresh Token: HttpOnly Cookie

### 6.2 비밀번호 정책
- 최소 8자 이상
- 대문자, 소문자, 숫자 포함 필수
- bcrypt 해싱 (cost factor: 12)

### 6.3 Rate Limiting
| 엔드포인트 | 제한 |
|-----------|------|
| POST /api/auth/login | 5회/분 |
| POST /api/auth/register | 3회/시간 |
| POST /api/posts | 10회/시간 |
| POST /api/comments | 30회/시간 |
| POST /*/like | 60회/분 |

### 6.4 입력 검증
- XSS 방지: Markdown 렌더링 시 sanitize
- SQL Injection: SQLAlchemy ORM 사용
- CSRF: SameSite Cookie + CORS 설정

---

## 7. 카테고리 및 태그

### 7.1 기본 카테고리
| 카테고리 | 설명 |
|---------|------|
| 분석 | 기술적/기본적 분석 게시글 |
| 뉴스 | 시장 뉴스 및 이슈 |
| 전략 | 트레이딩 전략 공유 |
| 질문 | Q&A |
| DeFi | DeFi 관련 토론 |
| NFT | NFT 관련 토론 |
| 자유 | 자유 주제 |

### 7.2 태그 규칙
- 게시글당 최대 5개 태그
- 태그 이름: 2-20자, 영문/한글/숫자만
- 인기 태그 표시 (post_count 기준)

---

## 8. 구현 우선순위

### Phase 1: 핵심 인증 (1주)
1. 사용자 모델 및 DB 마이그레이션
2. 이메일/비밀번호 회원가입/로그인
3. JWT 발급 및 검증 미들웨어
4. Frontend 로그인/회원가입 페이지

### Phase 2: OAuth 연동 (3일)
1. Google OAuth 연동
2. GitHub OAuth 연동
3. OAuth 계정 연결 테이블

### Phase 3: 게시판 기본 (1주)
1. 게시글 CRUD API
2. 게시글 목록/상세 페이지
3. 게시글 작성/수정 에디터
4. 카테고리 및 태그 시스템

### Phase 4: 상호작용 (4일)
1. 댓글 CRUD API
2. 댓글/대댓글 UI
3. 좋아요 기능
4. 조회수 카운팅

### Phase 5: 프로필 및 마무리 (3일)
1. 사용자 프로필 페이지
2. 프로필 수정 기능
3. 활동 통계 표시
4. 최적화 및 테스트

---

## 9. 기술 스택 요약

### Backend
- **Framework**: FastAPI (async)
- **ORM**: SQLAlchemy 2.0 (async)
- **Auth**: python-jose (JWT), passlib (bcrypt)
- **OAuth**: authlib
- **Validation**: Pydantic v2

### Frontend
- **Framework**: Next.js 16 (App Router)
- **State**: Zustand
- **UI**: shadcn/ui, Tailwind CSS 4
- **Editor**: react-md-editor 또는 @uiw/react-md-editor
- **Forms**: react-hook-form + zod

### Database
- **Primary**: PostgreSQL
- **Development**: SQLite (기존 패턴 유지)

---

## 10. 파일 구조 예시

### Backend 추가 파일
```
backend/app/
├── models/
│   ├── user.py              # User, OAuthAccount 모델
│   ├── post.py              # Post, PostLike 모델
│   ├── comment.py           # Comment 모델
│   └── tag.py               # Tag, PostTag 모델
├── routers/
│   ├── auth.py              # 인증 라우터
│   ├── users.py             # 사용자 라우터
│   ├── posts.py             # 게시글 라우터
│   └── comments.py          # 댓글 라우터
├── services/
│   ├── auth_service.py      # 인증 비즈니스 로직
│   ├── user_service.py      # 사용자 비즈니스 로직
│   ├── post_service.py      # 게시글 비즈니스 로직
│   └── comment_service.py   # 댓글 비즈니스 로직
├── schemas/
│   ├── auth.py              # 인증 스키마
│   ├── user.py              # 사용자 스키마
│   ├── post.py              # 게시글 스키마
│   └── comment.py           # 댓글 스키마
└── middleware/
    ├── auth.py              # JWT 인증 미들웨어
    └── rate_limit.py        # Rate limiting
```

### Frontend 추가 파일
```
frontend/
├── app/
│   ├── auth/
│   ├── community/
│   └── profile/
├── components/
│   ├── Auth/
│   ├── Community/
│   └── Profile/
├── hooks/
│   ├── useAuth.ts
│   ├── useRequireAuth.ts
│   └── usePosts.ts
├── store/
│   ├── useAuthStore.ts
│   └── useCommunityStore.ts
├── lib/
│   ├── api.ts               # API 클라이언트 (fetch wrapper)
│   └── auth.ts              # 인증 유틸리티
└── types/
    ├── auth.ts
    ├── user.ts
    ├── post.ts
    └── comment.ts
```

---

이 설계서를 기반으로 `/sc:implement` 명령어로 구현을 진행할 수 있습니다.
