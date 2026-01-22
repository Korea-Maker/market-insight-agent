"""
게시글 서비스
게시글 CRUD, 좋아요, 태그 관리
"""
import logging
import re
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from sqlalchemy.orm import selectinload

from app.models.post import Post, PostLike, Tag
from app.models.user import User
from app.schemas.post import PostCreate, PostUpdate

logger = logging.getLogger(__name__)


class PostService:
    """게시글 관련 비즈니스 로직"""

    @staticmethod
    def slugify(text: str) -> str:
        """태그 이름을 슬러그로 변환"""
        # 한글, 영문, 숫자만 유지
        slug = re.sub(r'[^\w가-힣]', '-', text.lower())
        slug = re.sub(r'-+', '-', slug).strip('-')
        return slug

    @staticmethod
    async def get_or_create_tags(
        db: AsyncSession,
        tag_names: List[str],
    ) -> List[Tag]:
        """태그 조회 또는 생성"""
        tags = []
        for name in tag_names[:5]:  # 최대 5개
            name = name.strip()
            if not name or len(name) < 2 or len(name) > 50:
                continue

            slug = PostService.slugify(name)

            # 기존 태그 조회
            result = await db.execute(
                select(Tag).where(Tag.slug == slug)
            )
            tag = result.scalar_one_or_none()

            if tag is None:
                # 새 태그 생성
                tag = Tag(name=name, slug=slug, post_count=0)
                db.add(tag)
                await db.flush()

            tags.append(tag)

        return tags

    @staticmethod
    async def create_post(
        db: AsyncSession,
        author_id: int,
        post_data: PostCreate,
    ) -> Post:
        """게시글 생성"""
        # 태그 처리
        tags = await PostService.get_or_create_tags(db, post_data.tags)

        # 게시글 생성
        post = Post(
            author_id=author_id,
            title=post_data.title,
            content=post_data.content,
            category=post_data.category,
            is_published=True,
        )
        post.tags = tags

        db.add(post)

        # 태그 카운트 업데이트
        for tag in tags:
            tag.post_count += 1

        await db.commit()
        await db.refresh(post)

        # author, tags 관계 명시적 로드
        await db.refresh(post, ["author", "tags"])

        logger.info(f"게시글 생성: {post.id} by user {author_id}")
        return post

    @staticmethod
    async def get_post_by_id(
        db: AsyncSession,
        post_id: int,
        increment_view: bool = False,
    ) -> Optional[Post]:
        """게시글 조회"""
        result = await db.execute(
            select(Post)
            .options(selectinload(Post.author), selectinload(Post.tags))
            .where(Post.id == post_id)
        )
        post = result.scalar_one_or_none()

        if post and increment_view:
            post.view_count += 1
            await db.commit()

        return post

    @staticmethod
    async def get_posts(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 20,
        category: Optional[str] = None,
        tag: Optional[str] = None,
        author_username: Optional[str] = None,
        sort: str = "latest",
        search: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> Tuple[List[Post], int]:
        """
        게시글 목록 조회

        Args:
            db: 데이터베이스 세션
            skip: 건너뛸 개수
            limit: 조회할 개수
            category: 카테고리 필터
            tag: 태그 필터
            author_username: 작성자 필터
            sort: 정렬 방식 (latest, trending, top)
            search: 검색어
            user_id: 현재 사용자 ID (좋아요 여부 확인용)

        Returns:
            (게시글 목록, 전체 개수)
        """
        # 기본 쿼리
        query = (
            select(Post)
            .options(selectinload(Post.author), selectinload(Post.tags))
            .where(Post.is_published == True)
        )

        count_query = select(func.count(Post.id)).where(Post.is_published == True)

        # 카테고리 필터
        if category:
            query = query.where(Post.category == category)
            count_query = count_query.where(Post.category == category)

        # 태그 필터
        if tag:
            tag_slug = PostService.slugify(tag)
            query = query.join(Post.tags).where(Tag.slug == tag_slug)
            count_query = count_query.join(Post.tags).where(Tag.slug == tag_slug)

        # 작성자 필터
        if author_username:
            query = query.join(Post.author).where(User.username == author_username.lower())
            count_query = count_query.join(Post.author).where(User.username == author_username.lower())

        # 검색
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    Post.title.ilike(search_pattern),
                    Post.content.ilike(search_pattern),
                )
            )
            count_query = count_query.where(
                or_(
                    Post.title.ilike(search_pattern),
                    Post.content.ilike(search_pattern),
                )
            )

        # 정렬
        if sort == "trending":
            # 인기순 (좋아요 + 최신)
            query = query.order_by(desc(Post.like_count), desc(Post.created_at))
        elif sort == "top":
            # 조회수순
            query = query.order_by(desc(Post.view_count), desc(Post.created_at))
        else:
            # 최신순
            query = query.order_by(desc(Post.is_pinned), desc(Post.created_at))

        # 페이지네이션
        query = query.offset(skip).limit(limit)

        # 실행
        result = await db.execute(query)
        posts = result.scalars().unique().all()

        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        return list(posts), total

    @staticmethod
    async def update_post(
        db: AsyncSession,
        post: Post,
        update_data: PostUpdate,
    ) -> Post:
        """게시글 수정"""
        update_dict = update_data.model_dump(exclude_unset=True)

        # 태그 업데이트
        if "tags" in update_dict:
            # 기존 태그 카운트 감소
            for tag in post.tags:
                tag.post_count = max(0, tag.post_count - 1)

            # 새 태그 설정
            new_tags = await PostService.get_or_create_tags(db, update_dict.pop("tags"))
            post.tags = new_tags

            # 새 태그 카운트 증가
            for tag in new_tags:
                tag.post_count += 1

        # 나머지 필드 업데이트
        for field, value in update_dict.items():
            setattr(post, field, value)

        await db.commit()
        await db.refresh(post)

        # author, tags 관계 명시적 로드
        await db.refresh(post, ["author", "tags"])

        logger.info(f"게시글 수정: {post.id}")
        return post

    @staticmethod
    async def delete_post(db: AsyncSession, post: Post) -> None:
        """게시글 삭제"""
        # 태그 카운트 감소
        for tag in post.tags:
            tag.post_count = max(0, tag.post_count - 1)

        await db.delete(post)
        await db.commit()

        logger.info(f"게시글 삭제: {post.id}")

    @staticmethod
    async def toggle_like(
        db: AsyncSession,
        post_id: int,
        user_id: int,
    ) -> Tuple[bool, int]:
        """
        좋아요 토글

        Returns:
            (is_liked, like_count)
        """
        # 기존 좋아요 확인
        result = await db.execute(
            select(PostLike).where(
                PostLike.post_id == post_id,
                PostLike.user_id == user_id,
            )
        )
        existing_like = result.scalar_one_or_none()

        # 게시글 조회
        post_result = await db.execute(
            select(Post).where(Post.id == post_id)
        )
        post = post_result.scalar_one_or_none()

        if post is None:
            raise ValueError("게시글을 찾을 수 없습니다")

        if existing_like:
            # 좋아요 취소
            await db.delete(existing_like)
            post.like_count = max(0, post.like_count - 1)
            is_liked = False
        else:
            # 좋아요 추가
            new_like = PostLike(user_id=user_id, post_id=post_id)
            db.add(new_like)
            post.like_count += 1
            is_liked = True

        await db.commit()

        return is_liked, post.like_count

    @staticmethod
    async def is_liked_by_user(
        db: AsyncSession,
        post_id: int,
        user_id: int,
    ) -> bool:
        """사용자가 좋아요 했는지 확인"""
        result = await db.execute(
            select(PostLike).where(
                PostLike.post_id == post_id,
                PostLike.user_id == user_id,
            )
        )
        return result.scalar_one_or_none() is not None

    @staticmethod
    async def get_popular_tags(
        db: AsyncSession,
        limit: int = 20,
    ) -> List[Tag]:
        """인기 태그 조회"""
        result = await db.execute(
            select(Tag)
            .where(Tag.post_count > 0)
            .order_by(desc(Tag.post_count))
            .limit(limit)
        )
        return list(result.scalars().all())
