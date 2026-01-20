"""
댓글 API 라우터
댓글 CRUD, 좋아요
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.models.user import User
from app.schemas.comment import (
    CommentCreate,
    CommentUpdate,
    CommentResponse,
    CommentListResponse,
)
from app.schemas.user import AuthorResponse
from app.services.comment_service import CommentService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["comments"])


def _comment_to_response(
    comment,
    is_liked: bool = False,
    replies: list = None,
) -> CommentResponse:
    """Comment 모델을 CommentResponse로 변환"""
    return CommentResponse(
        id=comment.id,
        content=comment.content if not comment.is_deleted else "[삭제된 댓글입니다]",
        author=AuthorResponse.model_validate(comment.author),
        parent_id=comment.parent_id,
        like_count=comment.like_count,
        is_liked=is_liked,
        is_deleted=comment.is_deleted,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        replies=replies or [],
    )


@router.get("/api/posts/{post_id}/comments", response_model=CommentListResponse)
async def get_comments(
    post_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    게시글의 댓글 목록 조회

    - 계층 구조로 반환 (댓글 + 대댓글)
    """
    comments, total = await CommentService.get_comments_by_post(
        db, post_id, current_user.id if current_user else None
    )

    items = []
    for comment in comments:
        # 좋아요 여부
        is_liked = False
        if current_user:
            is_liked = await CommentService.is_liked_by_user(
                db, comment.id, current_user.id
            )

        # 대댓글 처리
        replies = []
        for reply in comment.replies:
            if not reply.is_deleted or reply.replies:  # 삭제되지 않았거나 대댓글이 있으면
                reply_is_liked = False
                if current_user:
                    reply_is_liked = await CommentService.is_liked_by_user(
                        db, reply.id, current_user.id
                    )
                replies.append(_comment_to_response(reply, reply_is_liked))

        items.append(_comment_to_response(comment, is_liked, replies))

    return CommentListResponse(items=items, total=total)


@router.post(
    "/api/posts/{post_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    post_id: int,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    댓글 작성

    - 로그인 필요
    - parent_id 지정 시 대댓글
    """
    try:
        comment = await CommentService.create_comment(
            db, post_id, current_user.id, comment_data
        )
        return _comment_to_response(comment, is_liked=False)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.patch("/api/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: int,
    update_data: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    댓글 수정

    - 작성자만 수정 가능
    """
    comment = await CommentService.get_comment_by_id(db, comment_id)

    if comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="댓글을 찾을 수 없습니다",
        )

    if comment.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="수정 권한이 없습니다",
        )

    if comment.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="삭제된 댓글은 수정할 수 없습니다",
        )

    updated_comment = await CommentService.update_comment(db, comment, update_data)
    is_liked = await CommentService.is_liked_by_user(db, comment_id, current_user.id)

    return _comment_to_response(updated_comment, is_liked)


@router.delete("/api/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    댓글 삭제

    - 작성자만 삭제 가능
    - 대댓글이 있으면 soft delete
    """
    comment = await CommentService.get_comment_by_id(db, comment_id)

    if comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="댓글을 찾을 수 없습니다",
        )

    if comment.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="삭제 권한이 없습니다",
        )

    await CommentService.delete_comment(db, comment)


@router.post("/api/comments/{comment_id}/like")
async def toggle_comment_like(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    댓글 좋아요 토글

    - 로그인 필요
    """
    try:
        is_liked, like_count = await CommentService.toggle_like(
            db, comment_id, current_user.id
        )
        return {
            "is_liked": is_liked,
            "like_count": like_count,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
