"""
게시글 API 라우터
게시글 CRUD, 좋아요, 태그
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.models.user import User
from app.schemas.post import (
    PostCreate,
    PostUpdate,
    PostResponse,
    PostListItem,
    PostListResponse,
    PostDetailResponse,
    TagResponse,
    CategoryResponse,
    CATEGORIES,
)
from app.schemas.user import AuthorResponse
from app.services.post_service import PostService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/posts", tags=["posts"])


def _post_to_list_item(post, is_liked: bool = False) -> PostListItem:
    """Post 모델을 PostListItem으로 변환"""
    # 본문 미리보기 (100자)
    content_preview = post.content[:100] + "..." if len(post.content) > 100 else post.content
    # Markdown 제거 (간단히)
    content_preview = content_preview.replace("#", "").replace("*", "").replace("`", "")

    return PostListItem(
        id=post.id,
        title=post.title,
        content_preview=content_preview,
        category=post.category,
        author=AuthorResponse.model_validate(post.author),
        tags=[tag.name for tag in post.tags],
        view_count=post.view_count,
        like_count=post.like_count,
        comment_count=post.comment_count,
        is_liked=is_liked,
        created_at=post.created_at,
    )


@router.get("", response_model=PostListResponse)
async def get_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    category: Optional[str] = None,
    tag: Optional[str] = None,
    author: Optional[str] = None,
    sort: str = Query("latest", pattern="^(latest|trending|top)$"),
    search: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    게시글 목록 조회

    - skip: 건너뛸 개수 (기본: 0)
    - limit: 조회할 개수 (기본: 20, 최대: 50)
    - category: 카테고리 필터
    - tag: 태그 필터
    - author: 작성자 username 필터
    - sort: 정렬 (latest, trending, top)
    - search: 제목/내용 검색
    """
    posts, total = await PostService.get_posts(
        db,
        skip=skip,
        limit=limit,
        category=category,
        tag=tag,
        author_username=author,
        sort=sort,
        search=search,
        user_id=current_user.id if current_user else None,
    )

    # 좋아요 여부 확인
    items = []
    for post in posts:
        is_liked = False
        if current_user:
            is_liked = await PostService.is_liked_by_user(db, post.id, current_user.id)
        items.append(_post_to_list_item(post, is_liked))

    return PostListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_data: PostCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    게시글 작성

    - 로그인 필요
    - 태그는 최대 5개
    """
    # 카테고리 검증
    valid_categories = [c["name"] for c in CATEGORIES]
    if post_data.category not in valid_categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"유효하지 않은 카테고리입니다. 사용 가능: {', '.join(valid_categories)}",
        )

    post = await PostService.create_post(db, current_user.id, post_data)

    return PostResponse(
        id=post.id,
        title=post.title,
        content=post.content,
        category=post.category,
        author=AuthorResponse.model_validate(post.author),
        tags=[tag.name for tag in post.tags],
        view_count=post.view_count,
        like_count=post.like_count,
        comment_count=post.comment_count,
        is_published=post.is_published,
        is_pinned=post.is_pinned,
        created_at=post.created_at,
        updated_at=post.updated_at,
    )


@router.get("/categories", response_model=list[CategoryResponse])
async def get_categories():
    """카테고리 목록 조회"""
    return [
        CategoryResponse(name=c["name"], slug=c["slug"], post_count=0)
        for c in CATEGORIES
    ]


@router.get("/tags", response_model=list[TagResponse])
async def get_popular_tags(
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """인기 태그 목록 조회"""
    tags = await PostService.get_popular_tags(db, limit)
    return [TagResponse.model_validate(tag) for tag in tags]


@router.get("/{post_id}", response_model=PostDetailResponse)
async def get_post(
    post_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    게시글 상세 조회

    - 조회수 자동 증가
    """
    post = await PostService.get_post_by_id(db, post_id, increment_view=True)

    if post is None or not post.is_published:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="게시글을 찾을 수 없습니다",
        )

    # 좋아요 여부
    is_liked = False
    if current_user:
        is_liked = await PostService.is_liked_by_user(db, post_id, current_user.id)

    return PostDetailResponse(
        id=post.id,
        title=post.title,
        content=post.content,
        category=post.category,
        author=AuthorResponse.model_validate(post.author),
        tags=[tag.name for tag in post.tags],
        view_count=post.view_count,
        like_count=post.like_count,
        comment_count=post.comment_count,
        is_published=post.is_published,
        is_pinned=post.is_pinned,
        is_liked=is_liked,
        created_at=post.created_at,
        updated_at=post.updated_at,
    )


@router.patch("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int,
    update_data: PostUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    게시글 수정

    - 작성자만 수정 가능
    """
    post = await PostService.get_post_by_id(db, post_id)

    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="게시글을 찾을 수 없습니다",
        )

    if post.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="수정 권한이 없습니다",
        )

    # 카테고리 검증
    if update_data.category:
        valid_categories = [c["name"] for c in CATEGORIES]
        if update_data.category not in valid_categories:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"유효하지 않은 카테고리입니다",
            )

    updated_post = await PostService.update_post(db, post, update_data)

    return PostResponse(
        id=updated_post.id,
        title=updated_post.title,
        content=updated_post.content,
        category=updated_post.category,
        author=AuthorResponse.model_validate(updated_post.author),
        tags=[tag.name for tag in updated_post.tags],
        view_count=updated_post.view_count,
        like_count=updated_post.like_count,
        comment_count=updated_post.comment_count,
        is_published=updated_post.is_published,
        is_pinned=updated_post.is_pinned,
        created_at=updated_post.created_at,
        updated_at=updated_post.updated_at,
    )


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    게시글 삭제

    - 작성자만 삭제 가능
    """
    post = await PostService.get_post_by_id(db, post_id)

    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="게시글을 찾을 수 없습니다",
        )

    if post.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="삭제 권한이 없습니다",
        )

    await PostService.delete_post(db, post)


@router.post("/{post_id}/like")
async def toggle_post_like(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    게시글 좋아요 토글

    - 로그인 필요
    - 이미 좋아요한 경우 취소
    """
    try:
        is_liked, like_count = await PostService.toggle_like(db, post_id, current_user.id)
        return {
            "is_liked": is_liked,
            "like_count": like_count,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
