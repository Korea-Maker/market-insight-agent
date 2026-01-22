# Backend API 전체 레퍼런스

QuantBoard V1 백엔드의 모든 API 엔드포인트에 대한 상세 문서입니다.

## 목차

- [개요](#개요)
- [인증 시스템](#인증-시스템)
- [사용자 API](#사용자-api)
- [게시글 API](#게시글-api)
- [댓글 API](#댓글-api)
- [정보 소스 API](#정보-소스-api)
- [데이터 모델](#데이터-모델)
- [서비스 계층](#서비스-계층)

---

## 개요

### 기본 URL

| 환경 | REST API | WebSocket |
|------|----------|-----------|
| 개발 | `http://localhost:8000` | `ws://localhost:8000` |
| 프로덕션 | `https://your-domain.com` | `wss://your-domain.com` |

### 인증 방식

Bearer Token (JWT) 기반 인증:
```
Authorization: Bearer <access_token>
```

### 공통 응답 형식

**성공:**
```json
{
  "data": { ... }
}
```

**에러:**
```json
{
  "detail": "에러 메시지"
}
```

---

## 인증 시스템

### POST /api/auth/register

이메일 회원가입

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "display_name": "User Name"
}
```

**Response (201):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "username",
  "display_name": "User Name",
  "is_verified": false,
  "created_at": "2024-01-23T12:00:00Z"
}
```

**유효성 검사:**
- `email`: 이메일 형식
- `username`: 영문, 숫자, 언더스코어만 허용
- `password`: 8자 이상, 대/소문자, 숫자 포함

---

### POST /api/auth/login

이메일 로그인

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "username",
    "display_name": "User Name"
  }
}
```

**토큰 만료 시간:**
- Access Token: 15분
- Refresh Token: 7일

---

### POST /api/auth/logout

로그아웃 (인증 필요)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Successfully logged out"
}
```

---

### POST /api/auth/refresh

토큰 갱신

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900
}
```

---

### GET /api/auth/me

현재 사용자 정보 (인증 필요)

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "username",
  "display_name": "User Name",
  "avatar_url": "https://...",
  "bio": "자기소개",
  "is_verified": true,
  "created_at": "2024-01-23T12:00:00Z"
}
```

---

### OAuth 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/auth/oauth/google` | Google OAuth 시작 |
| GET | `/api/auth/oauth/google/callback` | Google OAuth 콜백 |
| GET | `/api/auth/oauth/github` | GitHub OAuth 시작 |
| GET | `/api/auth/oauth/github/callback` | GitHub OAuth 콜백 |

---

## 사용자 API

### GET /api/users/me

현재 사용자 프로필 (통계 포함, 인증 필요)

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "username",
  "display_name": "User Name",
  "avatar_url": "https://...",
  "bio": "자기소개",
  "is_verified": true,
  "created_at": "2024-01-23T12:00:00Z",
  "stats": {
    "post_count": 5,
    "comment_count": 10,
    "total_likes": 20
  }
}
```

---

### PATCH /api/users/me

프로필 수정 (인증 필요)

**Request Body:**
```json
{
  "display_name": "New Name",
  "bio": "새로운 자기소개",
  "avatar_url": "https://..."
}
```

**Response (200):**
```json
{
  "id": 1,
  "display_name": "New Name",
  "bio": "새로운 자기소개",
  "avatar_url": "https://..."
}
```

---

### GET /api/users/{username}

공개 프로필 조회

**Response (200):**
```json
{
  "id": 1,
  "username": "username",
  "display_name": "User Name",
  "avatar_url": "https://...",
  "bio": "자기소개",
  "created_at": "2024-01-23T12:00:00Z"
}
```

---

### GET /api/users/{username}/stats

사용자 활동 통계

**Response (200):**
```json
{
  "post_count": 5,
  "comment_count": 10,
  "total_likes": 20
}
```

---

## 게시글 API

### GET /api/posts

게시글 목록 조회

**Query Parameters:**

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `skip` | int | 0 | 건너뛸 항목 수 |
| `limit` | int | 20 | 가져올 항목 수 (최대 100) |
| `category` | string | - | 카테고리 필터 |
| `tag` | string | - | 태그 필터 |
| `author` | string | - | 작성자 username 필터 |
| `sort` | string | latest | 정렬 (latest, trending, top) |
| `search` | string | - | 제목/내용 검색 |

**Response (200):**
```json
{
  "total": 100,
  "items": [
    {
      "id": 1,
      "title": "게시글 제목",
      "content": "# Markdown 본문...",
      "category": "기술",
      "author": {
        "id": 1,
        "username": "username",
        "display_name": "User Name",
        "avatar_url": "https://..."
      },
      "tags": [
        { "id": 1, "name": "bitcoin", "slug": "bitcoin" }
      ],
      "view_count": 100,
      "like_count": 10,
      "comment_count": 5,
      "is_liked": false,
      "created_at": "2024-01-23T12:00:00Z"
    }
  ]
}
```

---

### POST /api/posts

게시글 작성 (인증 필요)

**Request Body:**
```json
{
  "title": "게시글 제목",
  "content": "# Markdown 본문",
  "category": "기술",
  "tags": ["bitcoin", "analysis"]
}
```

**유효성 검사:**
- `category`: 허용된 카테고리 목록 중 하나
- `tags`: 최대 5개

**Response (201):**
```json
{
  "id": 1,
  "title": "게시글 제목",
  "content": "# Markdown 본문",
  "category": "기술",
  "author": { ... },
  "tags": [ ... ],
  "view_count": 0,
  "like_count": 0,
  "comment_count": 0,
  "created_at": "2024-01-23T12:00:00Z"
}
```

---

### GET /api/posts/{post_id}

게시글 상세 조회 (조회수 자동 증가)

**Response (200):**
```json
{
  "id": 1,
  "title": "게시글 제목",
  "content": "# Markdown 본문",
  "category": "기술",
  "author": {
    "id": 1,
    "username": "username",
    "display_name": "User Name",
    "avatar_url": "https://..."
  },
  "tags": [
    { "id": 1, "name": "bitcoin", "slug": "bitcoin" }
  ],
  "view_count": 101,
  "like_count": 10,
  "comment_count": 5,
  "is_liked": false,
  "is_pinned": false,
  "created_at": "2024-01-23T12:00:00Z",
  "updated_at": "2024-01-23T14:00:00Z"
}
```

---

### PATCH /api/posts/{post_id}

게시글 수정 (작성자만, 인증 필요)

**Request Body:**
```json
{
  "title": "수정된 제목",
  "content": "수정된 내용",
  "category": "자유",
  "tags": ["updated", "tags"]
}
```

---

### DELETE /api/posts/{post_id}

게시글 삭제 (작성자만, 인증 필요)

**Response (204):** No Content

---

### POST /api/posts/{post_id}/like

게시글 좋아요 토글 (인증 필요)

**Response (200):**
```json
{
  "is_liked": true,
  "like_count": 11
}
```

---

### GET /api/posts/categories

카테고리 목록

**Response (200):**
```json
[
  { "name": "기술", "slug": "tech" },
  { "name": "분석", "slug": "analysis" },
  { "name": "자유", "slug": "free" }
]
```

---

### GET /api/posts/tags

인기 태그 목록

**Query Parameters:**

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `limit` | int | 10 | 가져올 태그 수 |

**Response (200):**
```json
[
  { "id": 1, "name": "bitcoin", "slug": "bitcoin", "post_count": 50 },
  { "id": 2, "name": "ethereum", "slug": "ethereum", "post_count": 30 }
]
```

---

## 댓글 API

### GET /api/posts/{post_id}/comments

댓글 목록 조회 (계층 구조)

**Response (200):**
```json
{
  "total": 10,
  "items": [
    {
      "id": 1,
      "content": "댓글 내용",
      "author": {
        "id": 1,
        "username": "username",
        "display_name": "User Name",
        "avatar_url": "https://..."
      },
      "parent_id": null,
      "like_count": 5,
      "is_liked": false,
      "is_deleted": false,
      "created_at": "2024-01-23T12:00:00Z",
      "replies": [
        {
          "id": 2,
          "content": "대댓글 내용",
          "author": { ... },
          "parent_id": 1,
          "like_count": 2,
          "is_liked": false,
          "replies": []
        }
      ]
    }
  ]
}
```

**대댓글 구조:**
- 계층 1단계만 허용
- 대댓글에 답글 불가

---

### POST /api/posts/{post_id}/comments

댓글 작성 (인증 필요)

**Request Body:**
```json
{
  "content": "댓글 내용",
  "parent_id": null
}
```

**대댓글 작성:**
```json
{
  "content": "대댓글 내용",
  "parent_id": 1
}
```

**Response (201):**
```json
{
  "id": 3,
  "content": "댓글 내용",
  "author": { ... },
  "parent_id": null,
  "like_count": 0,
  "created_at": "2024-01-23T12:00:00Z"
}
```

---

### PATCH /api/comments/{comment_id}

댓글 수정 (작성자만, 인증 필요)

**Request Body:**
```json
{
  "content": "수정된 댓글 내용"
}
```

---

### DELETE /api/comments/{comment_id}

댓글 삭제 (작성자만, 인증 필요, Soft Delete)

**Response (204):** No Content

**참고:** 삭제된 댓글은 `is_deleted: true`로 표시되며, 대댓글이 있으면 "삭제된 댓글입니다"로 표시됨

---

### POST /api/comments/{comment_id}/like

댓글 좋아요 토글 (인증 필요)

**Response (200):**
```json
{
  "is_liked": true,
  "like_count": 6
}
```

---

## 정보 소스 API

### GET /api/sources

소스 목록 조회

**Query Parameters:**

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `skip` | int | 0 | 건너뛸 항목 수 |
| `limit` | int | 20 | 가져올 항목 수 |
| `source_type` | string | - | 소스 타입 필터 (rss, api) |
| `is_enabled` | bool | - | 활성화 여부 필터 |

**Response (200):**
```json
{
  "total": 5,
  "items": [
    {
      "id": 1,
      "name": "CoinDesk",
      "source_type": "rss",
      "url": "https://www.coindesk.com/arc/outboundfeeds/rss/",
      "is_enabled": true,
      "fetch_interval_seconds": 600,
      "last_fetch_at": "2024-01-23T12:00:00Z",
      "last_success_at": "2024-01-23T12:00:00Z",
      "success_count": 100,
      "failure_count": 2,
      "last_error": null,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST /api/sources

새 소스 생성

**Request Body:**
```json
{
  "name": "New Source",
  "source_type": "rss",
  "url": "https://example.com/rss",
  "is_enabled": true,
  "fetch_interval_seconds": 600
}
```

---

### GET /api/sources/{source_id}

소스 상세 조회

---

### PATCH /api/sources/{source_id}

소스 수정

---

### DELETE /api/sources/{source_id}

소스 삭제

---

## 데이터 모델

### User

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | int | 사용자 ID (PK) |
| `email` | string | 이메일 (UNIQUE) |
| `username` | string | 사용자명 (UNIQUE, URL용) |
| `password_hash` | string | 비밀번호 해시 (OAuth는 NULL) |
| `display_name` | string | 표시 이름 |
| `avatar_url` | string | 프로필 이미지 URL |
| `bio` | string | 자기소개 |
| `is_active` | bool | 활성화 여부 |
| `is_verified` | bool | 이메일 인증 여부 |
| `created_at` | datetime | 생성일 |
| `updated_at` | datetime | 수정일 |

### Post

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | int | 게시글 ID (PK) |
| `author_id` | int | 작성자 ID (FK → User) |
| `title` | string | 제목 |
| `content` | text | 본문 (Markdown) |
| `category` | string | 카테고리 |
| `view_count` | int | 조회수 (캐시) |
| `like_count` | int | 좋아요 수 (캐시) |
| `comment_count` | int | 댓글 수 (캐시) |
| `is_published` | bool | 공개 여부 |
| `is_pinned` | bool | 고정 여부 |
| `created_at` | datetime | 생성일 |
| `updated_at` | datetime | 수정일 |

### Comment

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | int | 댓글 ID (PK) |
| `post_id` | int | 게시글 ID (FK → Post) |
| `author_id` | int | 작성자 ID (FK → User) |
| `parent_id` | int | 부모 댓글 ID (FK → Comment, NULL) |
| `content` | text | 댓글 내용 |
| `like_count` | int | 좋아요 수 |
| `is_deleted` | bool | 삭제 여부 (soft delete) |
| `created_at` | datetime | 생성일 |
| `updated_at` | datetime | 수정일 |

### News

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | int | 뉴스 ID (PK) |
| `title` | string | 원문 제목 |
| `title_kr` | string | 한국어 번역 제목 |
| `link` | string | 기사 링크 (UNIQUE) |
| `published` | datetime | 발행 시간 |
| `source` | string | 뉴스 출처 |
| `description` | text | 기사 요약 |
| `created_at` | datetime | DB 저장 시간 |

### IntelligenceSource

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | int | 소스 ID (PK) |
| `name` | string | 소스 이름 (UNIQUE) |
| `source_type` | string | 소스 유형 (rss, api) |
| `url` | string | 소스 URL |
| `is_enabled` | bool | 활성화 여부 |
| `fetch_interval_seconds` | int | 수집 주기 (초) |
| `last_fetch_at` | datetime | 마지막 수집 시간 |
| `last_success_at` | datetime | 마지막 성공 시간 |
| `success_count` | int | 성공 횟수 |
| `failure_count` | int | 실패 횟수 |
| `last_error` | string | 마지막 오류 메시지 |

---

## 서비스 계층

### AuthService

| 메서드 | 설명 |
|--------|------|
| `get_user_by_email(db, email)` | 이메일로 사용자 조회 |
| `get_user_by_username(db, username)` | 사용자명으로 사용자 조회 |
| `get_user_by_id(db, user_id)` | ID로 사용자 조회 |
| `create_user(db, user_data)` | 새 사용자 생성 |
| `authenticate_user(db, email, password)` | 이메일/비밀번호 인증 |
| `create_tokens(user_id)` | Access/Refresh 토큰 생성 |
| `get_or_create_oauth_user(...)` | OAuth 사용자 조회/생성 |

### PostService

| 메서드 | 설명 |
|--------|------|
| `create_post(db, author_id, post_data)` | 게시글 생성 |
| `get_post_by_id(db, post_id, increment_view)` | 게시글 조회 |
| `get_posts(db, ...)` | 게시글 목록 조회 |
| `update_post(db, post, update_data)` | 게시글 수정 |
| `delete_post(db, post)` | 게시글 삭제 |
| `toggle_like(db, post_id, user_id)` | 좋아요 토글 |
| `get_or_create_tags(db, tag_names)` | 태그 조회/생성 |
| `get_popular_tags(db, limit)` | 인기 태그 조회 |

### CommentService

| 메서드 | 설명 |
|--------|------|
| `create_comment(db, post_id, author_id, comment_data)` | 댓글 생성 |
| `get_comments_by_post(db, post_id, user_id)` | 댓글 목록 조회 |
| `get_comment_by_id(db, comment_id)` | 댓글 조회 |
| `update_comment(db, comment, update_data)` | 댓글 수정 |
| `delete_comment(db, comment)` | 댓글 삭제 (soft) |
| `toggle_like(db, comment_id, user_id)` | 좋아요 토글 |

---

## 환경 변수

```bash
# API 설정
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development

# 데이터베이스
DB_TYPE=sqlite  # 또는 postgresql
POSTGRES_USER=quantboard
POSTGRES_PASSWORD=quantboard_dev
POSTGRES_DB=quantboard
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_ENABLED=false  # true 시 실시간 가격 활성화

# JWT
JWT_SECRET_KEY=<자동 생성>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# OAuth (선택)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

---

**Last Updated:** 2026-01-23
