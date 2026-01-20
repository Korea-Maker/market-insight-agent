"""
사용자 API 라우터
프로필 조회/수정
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.post import Post, PostLike
from app.models.comment import Comment
from app.schemas.user import (
    UserResponse,
    UserUpdate,
    UserPublicResponse,
    UserWithStats,
    UserStats,
)
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserWithStats)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    현재 로그인한 사용자 프로필 조회 (통계 포함)
    """
    # 통계 조회
    stats = await _get_user_stats(db, current_user.id)

    return UserWithStats(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at,
        stats=stats,
    )


@router.patch("/me", response_model=UserResponse)
async def update_current_user_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    현재 사용자 프로필 수정
    """
    # 업데이트할 필드만 적용
    update_dict = update_data.model_dump(exclude_unset=True)

    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="수정할 내용이 없습니다",
        )

    for field, value in update_dict.items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)

    logger.info(f"프로필 수정: {current_user.username}")
    return UserResponse.model_validate(current_user)


@router.get("/{username}", response_model=UserPublicResponse)
async def get_user_profile(
    username: str,
    db: AsyncSession = Depends(get_db),
):
    """
    사용자 공개 프로필 조회
    """
    user = await AuthService.get_user_by_username(db, username.lower())

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다",
        )

    return UserPublicResponse.model_validate(user)


@router.get("/{username}/stats", response_model=UserStats)
async def get_user_stats(
    username: str,
    db: AsyncSession = Depends(get_db),
):
    """
    사용자 활동 통계 조회
    """
    user = await AuthService.get_user_by_username(db, username.lower())

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다",
        )

    return await _get_user_stats(db, user.id)


async def _get_user_stats(db: AsyncSession, user_id: int) -> UserStats:
    """사용자 활동 통계 조회 헬퍼"""
    # 게시글 수
    post_count_result = await db.execute(
        select(func.count(Post.id)).where(
            Post.author_id == user_id,
            Post.is_published == True,
        )
    )
    post_count = post_count_result.scalar() or 0

    # 댓글 수
    comment_count_result = await db.execute(
        select(func.count(Comment.id)).where(
            Comment.author_id == user_id,
            Comment.is_deleted == False,
        )
    )
    comment_count = comment_count_result.scalar() or 0

    # 받은 좋아요 수 (게시글)
    total_likes_result = await db.execute(
        select(func.count(PostLike.id))
        .join(Post, PostLike.post_id == Post.id)
        .where(Post.author_id == user_id)
    )
    total_likes = total_likes_result.scalar() or 0

    return UserStats(
        post_count=post_count,
        comment_count=comment_count,
        total_likes=total_likes,
    )
