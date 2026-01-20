"""
게시글 관련 Pydantic 스키마
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

from app.schemas.user import AuthorResponse


class TagBase(BaseModel):
    """태그 기본 스키마"""
    name: str = Field(..., min_length=2, max_length=50)


class TagResponse(BaseModel):
    """태그 응답 스키마"""
    id: int
    name: str
    slug: str
    post_count: int = 0

    class Config:
        from_attributes = True


class PostCreate(BaseModel):
    """게시글 작성 요청 스키마"""
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1, max_length=50)
    tags: List[str] = Field(default=[], max_length=5)


class PostUpdate(BaseModel):
    """게시글 수정 요청 스키마"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    tags: Optional[List[str]] = Field(None, max_length=5)
    is_published: Optional[bool] = None


class PostResponse(BaseModel):
    """게시글 응답 스키마"""
    id: int
    title: str
    content: str
    category: str
    author: AuthorResponse
    tags: List[str] = []
    view_count: int = 0
    like_count: int = 0
    comment_count: int = 0
    is_published: bool = True
    is_pinned: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PostListItem(BaseModel):
    """게시글 목록 아이템 스키마"""
    id: int
    title: str
    content_preview: str  # 본문 미리보기 (100자)
    category: str
    author: AuthorResponse
    tags: List[str] = []
    view_count: int = 0
    like_count: int = 0
    comment_count: int = 0
    is_liked: bool = False  # 현재 사용자의 좋아요 여부
    created_at: datetime

    class Config:
        from_attributes = True


class PostListResponse(BaseModel):
    """게시글 목록 응답 스키마"""
    items: List[PostListItem]
    total: int
    skip: int
    limit: int


class PostDetailResponse(PostResponse):
    """게시글 상세 응답 스키마 (좋아요 여부 포함)"""
    is_liked: bool = False


class CategoryResponse(BaseModel):
    """카테고리 응답 스키마"""
    name: str
    slug: str
    post_count: int = 0


# 기본 카테고리 목록
CATEGORIES = [
    {"name": "분석", "slug": "analysis", "description": "기술적/기본적 분석 게시글"},
    {"name": "뉴스", "slug": "news", "description": "시장 뉴스 및 이슈"},
    {"name": "전략", "slug": "strategy", "description": "트레이딩 전략 공유"},
    {"name": "질문", "slug": "question", "description": "Q&A"},
    {"name": "DeFi", "slug": "defi", "description": "DeFi 관련 토론"},
    {"name": "NFT", "slug": "nft", "description": "NFT 관련 토론"},
    {"name": "자유", "slug": "free", "description": "자유 주제"},
]
