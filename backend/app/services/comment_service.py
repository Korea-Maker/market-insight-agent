"""
댓글 서비스
댓글 CRUD, 좋아요
"""
import logging
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.comment import Comment, CommentLike
from app.models.post import Post
from app.schemas.comment import CommentCreate, CommentUpdate

logger = logging.getLogger(__name__)


class CommentService:
    """댓글 관련 비즈니스 로직"""

    @staticmethod
    async def create_comment(
        db: AsyncSession,
        post_id: int,
        author_id: int,
        comment_data: CommentCreate,
    ) -> Comment:
        """댓글 생성"""
        # 게시글 존재 확인
        post_result = await db.execute(
            select(Post).where(Post.id == post_id, Post.is_published == True)
        )
        post = post_result.scalar_one_or_none()

        if post is None:
            raise ValueError("게시글을 찾을 수 없습니다")

        # 부모 댓글 확인 (대댓글인 경우)
        if comment_data.parent_id:
            parent_result = await db.execute(
                select(Comment).where(
                    Comment.id == comment_data.parent_id,
                    Comment.post_id == post_id,
                    Comment.is_deleted == False,
                )
            )
            parent = parent_result.scalar_one_or_none()

            if parent is None:
                raise ValueError("부모 댓글을 찾을 수 없습니다")

            # 대대댓글 방지 (1단계만 허용)
            if parent.parent_id is not None:
                raise ValueError("대댓글에는 답글을 달 수 없습니다")

        # 댓글 생성
        comment = Comment(
            post_id=post_id,
            author_id=author_id,
            parent_id=comment_data.parent_id,
            content=comment_data.content,
        )

        db.add(comment)

        # 게시글 댓글 수 증가
        post.comment_count += 1

        await db.commit()
        await db.refresh(comment)

        # author 로드
        await db.refresh(comment, ["author"])

        logger.info(f"댓글 생성: {comment.id} on post {post_id}")
        return comment

    @staticmethod
    async def get_comments_by_post(
        db: AsyncSession,
        post_id: int,
        user_id: Optional[int] = None,
    ) -> Tuple[List[Comment], int]:
        """
        게시글의 댓글 목록 조회 (계층 구조)

        Returns:
            (최상위 댓글 목록, 전체 댓글 수)
        """
        # 최상위 댓글만 조회 (parent_id가 NULL)
        result = await db.execute(
            select(Comment)
            .options(selectinload(Comment.author), selectinload(Comment.replies).selectinload(Comment.author))
            .where(
                Comment.post_id == post_id,
                Comment.parent_id == None,
            )
            .order_by(Comment.created_at)
        )
        comments = list(result.scalars().unique().all())

        # 전체 댓글 수
        count_result = await db.execute(
            select(func.count(Comment.id)).where(
                Comment.post_id == post_id,
                Comment.is_deleted == False,
            )
        )
        total = count_result.scalar() or 0

        return comments, total

    @staticmethod
    async def get_comment_by_id(
        db: AsyncSession,
        comment_id: int,
    ) -> Optional[Comment]:
        """댓글 조회"""
        result = await db.execute(
            select(Comment)
            .options(selectinload(Comment.author))
            .where(Comment.id == comment_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_comment(
        db: AsyncSession,
        comment: Comment,
        update_data: CommentUpdate,
    ) -> Comment:
        """댓글 수정"""
        comment.content = update_data.content
        await db.commit()
        await db.refresh(comment)

        logger.info(f"댓글 수정: {comment.id}")
        return comment

    @staticmethod
    async def delete_comment(
        db: AsyncSession,
        comment: Comment,
    ) -> None:
        """
        댓글 삭제 (soft delete)

        - 대댓글이 있으면 내용만 삭제 표시
        - 대댓글이 없으면 실제 삭제
        """
        # 게시글 댓글 수 감소
        post_result = await db.execute(
            select(Post).where(Post.id == comment.post_id)
        )
        post = post_result.scalar_one_or_none()

        if post:
            post.comment_count = max(0, post.comment_count - 1)

        # 대댓글 확인
        replies_result = await db.execute(
            select(func.count(Comment.id)).where(
                Comment.parent_id == comment.id,
                Comment.is_deleted == False,
            )
        )
        has_replies = (replies_result.scalar() or 0) > 0

        if has_replies:
            # Soft delete
            comment.is_deleted = True
            comment.content = "[삭제된 댓글입니다]"
        else:
            # 실제 삭제
            await db.delete(comment)

        await db.commit()

        logger.info(f"댓글 삭제: {comment.id}")

    @staticmethod
    async def toggle_like(
        db: AsyncSession,
        comment_id: int,
        user_id: int,
    ) -> Tuple[bool, int]:
        """
        댓글 좋아요 토글

        Returns:
            (is_liked, like_count)
        """
        # 기존 좋아요 확인
        result = await db.execute(
            select(CommentLike).where(
                CommentLike.comment_id == comment_id,
                CommentLike.user_id == user_id,
            )
        )
        existing_like = result.scalar_one_or_none()

        # 댓글 조회
        comment_result = await db.execute(
            select(Comment).where(Comment.id == comment_id)
        )
        comment = comment_result.scalar_one_or_none()

        if comment is None:
            raise ValueError("댓글을 찾을 수 없습니다")

        if existing_like:
            # 좋아요 취소
            await db.delete(existing_like)
            comment.like_count = max(0, comment.like_count - 1)
            is_liked = False
        else:
            # 좋아요 추가
            new_like = CommentLike(user_id=user_id, comment_id=comment_id)
            db.add(new_like)
            comment.like_count += 1
            is_liked = True

        await db.commit()

        return is_liked, comment.like_count

    @staticmethod
    async def is_liked_by_user(
        db: AsyncSession,
        comment_id: int,
        user_id: int,
    ) -> bool:
        """사용자가 좋아요 했는지 확인"""
        result = await db.execute(
            select(CommentLike).where(
                CommentLike.comment_id == comment_id,
                CommentLike.user_id == user_id,
            )
        )
        return result.scalar_one_or_none() is not None
