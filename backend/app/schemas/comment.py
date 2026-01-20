"""
댓글 관련 Pydantic 스키마
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

from app.schemas.user import AuthorResponse


class CommentCreate(BaseModel):
    """댓글 작성 요청 스키마"""
    content: str = Field(..., min_length=1, max_length=2000)
    parent_id: Optional[int] = None  # 대댓글인 경우


class CommentUpdate(BaseModel):
    """댓글 수정 요청 스키마"""
    content: str = Field(..., min_length=1, max_length=2000)


class CommentResponse(BaseModel):
    """댓글 응답 스키마"""
    id: int
    content: str
    author: AuthorResponse
    parent_id: Optional[int] = None
    like_count: int = 0
    is_liked: bool = False
    is_deleted: bool = False
    created_at: datetime
    updated_at: datetime
    replies: List["CommentResponse"] = []

    class Config:
        from_attributes = True


class CommentListResponse(BaseModel):
    """댓글 목록 응답 스키마"""
    items: List[CommentResponse]
    total: int


# 순환 참조 해결
CommentResponse.model_rebuild()
