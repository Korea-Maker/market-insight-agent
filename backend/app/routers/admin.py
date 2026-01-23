"""
관리자 API 라우터
대시보드, 신고 관리, 사용자 관리, 콘텐츠 관리
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, case, desc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_moderator, get_current_admin
from app.models.user import User
from app.models.post import Post
from app.models.comment import Comment
from app.models.moderation import Report, ModerationLog, UserWarning
from app.schemas.admin import (
    DashboardStatsResponse,
    ReportResponse,
    ReportListResponse,
    ReportActionRequest,
    ReportCreate,
    ModerationUserResponse,
    UserListResponse,
    UserWarnRequest,
    UserSuspendRequest,
    UserBanRequest,
    UserRoleUpdateRequest,
    ModerationPostResponse,
    PostListModerationResponse,
    ModerationCommentResponse,
    CommentListModerationResponse,
    ContentHideRequest,
    ModerationLogResponse,
    ModerationLogListResponse,
    UserWarningResponse,
    UserWarningListResponse,
)
from app.schemas.user import AuthorResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ============================================
# 헬퍼 함수
# ============================================

async def create_moderation_log(
    db: AsyncSession,
    moderator_id: int,
    action_type: str,
    target_type: str,
    target_id: int,
    reason: Optional[str] = None,
    extra_data: Optional[dict] = None,
):
    """관리 로그 생성"""
    log = ModerationLog(
        moderator_id=moderator_id,
        action_type=action_type,
        target_type=target_type,
        target_id=target_id,
        reason=reason,
        extra_data=extra_data,
    )
    db.add(log)
    await db.flush()
    return log


def user_to_moderation_response(user: User, report_count: int = 0) -> ModerationUserResponse:
    """User 모델을 ModerationUserResponse로 변환"""
    return ModerationUserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        is_verified=user.is_verified,
        role=user.role or 'user',
        status=user.status or 'active',
        warning_count=user.warning_count or 0,
        post_count=len(user.posts) if hasattr(user, 'posts') and user.posts else 0,
        comment_count=len(user.comments) if hasattr(user, 'comments') and user.comments else 0,
        report_count=report_count,
        last_active_at=user.last_active_at,
        suspended_until=user.suspended_until,
        banned_at=user.banned_at,
        ban_reason=user.ban_reason,
        created_at=user.created_at,
    )


# ============================================
# 대시보드 API
# ============================================

@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_moderator),
):
    """대시보드 통계 조회"""
    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)
    today_start = datetime.combine(today, datetime.min.time())
    yesterday_start = datetime.combine(yesterday, datetime.min.time())
    yesterday_end = datetime.combine(today, datetime.min.time())
    last_24h = datetime.utcnow() - timedelta(hours=24)

    # 사용자 통계
    total_users = await db.scalar(select(func.count(User.id)))
    new_users_today = await db.scalar(
        select(func.count(User.id)).where(User.created_at >= today_start)
    )
    new_users_yesterday = await db.scalar(
        select(func.count(User.id)).where(
            and_(User.created_at >= yesterday_start, User.created_at < yesterday_end)
        )
    )
    new_users_change = (
        ((new_users_today - new_users_yesterday) / new_users_yesterday * 100)
        if new_users_yesterday > 0
        else 0
    )

    # 게시글 통계
    total_posts = await db.scalar(select(func.count(Post.id)))
    new_posts_today = await db.scalar(
        select(func.count(Post.id)).where(Post.created_at >= today_start)
    )
    new_posts_yesterday = await db.scalar(
        select(func.count(Post.id)).where(
            and_(Post.created_at >= yesterday_start, Post.created_at < yesterday_end)
        )
    )
    new_posts_change = (
        ((new_posts_today - new_posts_yesterday) / new_posts_yesterday * 100)
        if new_posts_yesterday > 0
        else 0
    )

    # 댓글 통계
    total_comments = await db.scalar(select(func.count(Comment.id)))
    new_comments_today = await db.scalar(
        select(func.count(Comment.id)).where(Comment.created_at >= today_start)
    )

    # 신고 통계
    pending_reports = await db.scalar(
        select(func.count(Report.id)).where(Report.status == 'pending')
    )
    resolved_reports_today = await db.scalar(
        select(func.count(Report.id)).where(
            and_(Report.status.in_(['resolved', 'dismissed']), Report.reviewed_at >= today_start)
        )
    )

    # 활성 사용자 (24시간)
    active_users_24h = await db.scalar(
        select(func.count(User.id)).where(User.last_active_at >= last_24h)
    ) or 0

    # 차단된 사용자
    banned_users = await db.scalar(
        select(func.count(User.id)).where(User.status == 'banned')
    )

    # 숨김 콘텐츠
    hidden_posts = await db.scalar(
        select(func.count(Post.id)).where(Post.is_published == False)
    )
    hidden_comments = await db.scalar(
        select(func.count(Comment.id)).where(Comment.is_deleted == True)
    )

    return DashboardStatsResponse(
        total_users=total_users or 0,
        new_users_today=new_users_today or 0,
        new_users_change=round(new_users_change, 1),
        total_posts=total_posts or 0,
        new_posts_today=new_posts_today or 0,
        new_posts_change=round(new_posts_change, 1),
        total_comments=total_comments or 0,
        new_comments_today=new_comments_today or 0,
        pending_reports=pending_reports or 0,
        resolved_reports_today=resolved_reports_today or 0,
        active_users_24h=active_users_24h,
        banned_users=banned_users or 0,
        hidden_posts=hidden_posts or 0,
        hidden_comments=hidden_comments or 0,
    )


# ============================================
# 신고 관리 API
# ============================================

@router.get("/reports", response_model=ReportListResponse)
async def list_reports(
    status: Optional[Literal['pending', 'reviewed', 'resolved', 'dismissed', 'all']] = 'all',
    target_type: Optional[Literal['post', 'comment', 'user', 'all']] = 'all',
    priority: Optional[Literal['low', 'medium', 'high', 'critical', 'all']] = 'all',
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_moderator),
):
    """신고 목록 조회"""
    query = select(Report).options(
        selectinload(Report.reporter),
        selectinload(Report.reviewed_by),
    )

    # 필터
    conditions = []
    if status and status != 'all':
        conditions.append(Report.status == status)
    if target_type and target_type != 'all':
        conditions.append(Report.target_type == target_type)
    if priority and priority != 'all':
        conditions.append(Report.priority == priority)

    if conditions:
        query = query.where(and_(*conditions))

    # 정렬: 우선순위 높은 순, 최신순
    priority_order = case(
        (Report.priority == 'critical', 1),
        (Report.priority == 'high', 2),
        (Report.priority == 'medium', 3),
        (Report.priority == 'low', 4),
        else_=5
    )
    query = query.order_by(priority_order, desc(Report.created_at))

    # 총 개수
    count_query = select(func.count(Report.id))
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total = await db.scalar(count_query)

    # 페이지네이션
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    reports = result.scalars().all()

    return ReportListResponse(
        reports=[ReportResponse.model_validate(r) for r in reports],
        total=total or 0,
        skip=skip,
        limit=limit,
    )


@router.get("/reports/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_moderator),
):
    """신고 상세 조회"""
    result = await db.execute(
        select(Report)
        .options(selectinload(Report.reporter), selectinload(Report.reviewed_by))
        .where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail="신고를 찾을 수 없습니다")

    return ReportResponse.model_validate(report)


@router.post("/reports/{report_id}/action")
async def handle_report(
    report_id: int,
    action_data: ReportActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_moderator),
):
    """신고 처리"""
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail="신고를 찾을 수 없습니다")

    action = action_data.action
    reason = action_data.reason

    # 액션 처리
    if action == 'dismiss':
        report.status = 'dismissed'
        report.resolution_note = reason

    elif action == 'warn_user':
        # 대상 사용자에게 경고
        if report.target_type == 'user':
            target_user_id = report.target_id
        else:
            # 콘텐츠의 작성자 조회
            if report.target_type == 'post':
                post_result = await db.execute(select(Post).where(Post.id == report.target_id))
                post = post_result.scalar_one_or_none()
                target_user_id = post.author_id if post else None
            else:
                comment_result = await db.execute(select(Comment).where(Comment.id == report.target_id))
                comment = comment_result.scalar_one_or_none()
                target_user_id = comment.author_id if comment else None

        if target_user_id:
            user_result = await db.execute(select(User).where(User.id == target_user_id))
            target_user = user_result.scalar_one_or_none()
            if target_user:
                target_user.warning_count = (target_user.warning_count or 0) + 1
                target_user.status = 'warned'
                warning = UserWarning(
                    user_id=target_user_id,
                    moderator_id=current_user.id,
                    reason=reason or "커뮤니티 가이드라인 위반",
                )
                db.add(warning)
                await create_moderation_log(
                    db, current_user.id, 'warn_user', 'user', target_user_id, reason
                )

        report.status = 'resolved'
        report.resolution_note = reason

    elif action == 'remove_content':
        # 콘텐츠 숨김
        if report.target_type == 'post':
            post_result = await db.execute(select(Post).where(Post.id == report.target_id))
            post = post_result.scalar_one_or_none()
            if post:
                post.is_published = False
                await create_moderation_log(
                    db, current_user.id, 'hide_post', 'post', report.target_id, reason
                )
        elif report.target_type == 'comment':
            comment_result = await db.execute(select(Comment).where(Comment.id == report.target_id))
            comment = comment_result.scalar_one_or_none()
            if comment:
                comment.is_deleted = True
                await create_moderation_log(
                    db, current_user.id, 'hide_comment', 'comment', report.target_id, reason
                )

        report.status = 'resolved'
        report.resolution_note = reason

    elif action == 'ban_user':
        # 사용자 차단
        if report.target_type == 'user':
            target_user_id = report.target_id
        else:
            if report.target_type == 'post':
                post_result = await db.execute(select(Post).where(Post.id == report.target_id))
                post = post_result.scalar_one_or_none()
                target_user_id = post.author_id if post else None
            else:
                comment_result = await db.execute(select(Comment).where(Comment.id == report.target_id))
                comment = comment_result.scalar_one_or_none()
                target_user_id = comment.author_id if comment else None

        if target_user_id:
            user_result = await db.execute(select(User).where(User.id == target_user_id))
            target_user = user_result.scalar_one_or_none()
            if target_user:
                target_user.status = 'banned'
                target_user.banned_at = datetime.utcnow()
                target_user.ban_reason = reason
                await create_moderation_log(
                    db, current_user.id, 'ban_user', 'user', target_user_id, reason
                )

        report.status = 'resolved'
        report.resolution_note = reason

    report.reviewed_by_id = current_user.id
    report.reviewed_at = datetime.utcnow()

    await create_moderation_log(
        db, current_user.id, 'handle_report', 'report', report_id, reason,
        {'action': action}
    )

    await db.commit()

    return {"message": "신고가 처리되었습니다", "status": report.status}


# ============================================
# 사용자 관리 API
# ============================================

@router.get("/users", response_model=UserListResponse)
async def list_users(
    status: Optional[Literal['active', 'warned', 'suspended', 'banned', 'all']] = 'all',
    role: Optional[Literal['user', 'moderator', 'admin', 'all']] = 'all',
    search: Optional[str] = None,
    sort_by: Literal['created_at', 'last_active_at', 'warning_count'] = 'created_at',
    sort_order: Literal['asc', 'desc'] = 'desc',
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_moderator),
):
    """사용자 목록 조회"""
    query = select(User)

    # 필터
    conditions = []
    if status and status != 'all':
        conditions.append(User.status == status)
    if role and role != 'all':
        conditions.append(User.role == role)
    if search:
        search_pattern = f"%{search}%"
        conditions.append(
            or_(
                User.email.ilike(search_pattern),
                User.username.ilike(search_pattern),
                User.display_name.ilike(search_pattern),
            )
        )

    if conditions:
        query = query.where(and_(*conditions))

    # 정렬
    sort_column = getattr(User, sort_by)
    if sort_order == 'desc':
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)

    # 총 개수
    count_query = select(func.count(User.id))
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total = await db.scalar(count_query)

    # 페이지네이션
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()

    # 신고 수 조회
    user_ids = [u.id for u in users]
    report_counts = {}
    if user_ids:
        report_result = await db.execute(
            select(Report.target_id, func.count(Report.id))
            .where(and_(Report.target_type == 'user', Report.target_id.in_(user_ids)))
            .group_by(Report.target_id)
        )
        report_counts = dict(report_result.all())

    return UserListResponse(
        users=[user_to_moderation_response(u, report_counts.get(u.id, 0)) for u in users],
        total=total or 0,
        skip=skip,
        limit=limit,
    )


@router.get("/users/{user_id}", response_model=ModerationUserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_moderator),
):
    """사용자 상세 조회"""
    result = await db.execute(
        select(User)
        .options(selectinload(User.posts), selectinload(User.comments))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    # 신고 수
    report_count = await db.scalar(
        select(func.count(Report.id))
        .where(and_(Report.target_type == 'user', Report.target_id == user_id))
    )

    return user_to_moderation_response(user, report_count or 0)


@router.post("/users/{user_id}/warn")
async def warn_user(
    user_id: int,
    warn_data: UserWarnRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_moderator),
):
    """사용자 경고"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    if user.role == 'admin' and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="관리자에게 경고를 줄 수 없습니다")

    user.warning_count = (user.warning_count or 0) + 1
    user.status = 'warned'

    warning = UserWarning(
        user_id=user_id,
        moderator_id=current_user.id,
        reason=warn_data.reason,
    )
    db.add(warning)

    await create_moderation_log(
        db, current_user.id, 'warn_user', 'user', user_id, warn_data.reason
    )

    await db.commit()

    return {"message": "경고가 부여되었습니다", "warning_count": user.warning_count}


@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: int,
    suspend_data: UserSuspendRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_moderator),
):
    """사용자 정지"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    if user.role in ('admin', 'moderator') and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="관리자/모더레이터를 정지할 수 없습니다")

    user.status = 'suspended'
    user.suspended_until = datetime.utcnow() + timedelta(hours=suspend_data.duration_hours)

    await create_moderation_log(
        db, current_user.id, 'suspend_user', 'user', user_id, suspend_data.reason,
        {'duration_hours': suspend_data.duration_hours}
    )

    await db.commit()

    return {
        "message": "사용자가 정지되었습니다",
        "suspended_until": user.suspended_until.isoformat(),
    }


@router.post("/users/{user_id}/ban")
async def ban_user(
    user_id: int,
    ban_data: UserBanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_moderator),
):
    """사용자 차단"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    if user.role in ('admin', 'moderator') and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="관리자/모더레이터를 차단할 수 없습니다")

    user.status = 'banned'
    user.banned_at = datetime.utcnow()
    user.ban_reason = ban_data.reason

    await create_moderation_log(
        db, current_user.id, 'ban_user', 'user', user_id, ban_data.reason
    )

    await db.commit()

    return {"message": "사용자가 차단되었습니다"}


@router.post("/users/{user_id}/unban")
async def unban_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_moderator),
):
    """사용자 차단 해제"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    user.status = 'active'
    user.banned_at = None
    user.ban_reason = None
    user.suspended_until = None

    await create_moderation_log(
        db, current_user.id, 'unban_user', 'user', user_id
    )

    await db.commit()

    return {"message": "사용자 차단이 해제되었습니다"}


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    role_data: UserRoleUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),  # 관리자만 가능
):
    """사용자 역할 변경"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="자신의 역할은 변경할 수 없습니다")

    old_role = user.role
    user.role = role_data.role

    await create_moderation_log(
        db, current_user.id, 'change_role', 'user', user_id, None,
        {'old_role': old_role, 'new_role': role_data.role}
    )

    await db.commit()

    return {"message": f"사용자 역할이 {role_data.role}로 변경되었습니다"}


# ============================================
# 콘텐츠 관리 API
# ============================================

@router.get("/posts", response_model=PostListModerationResponse)
async def list_posts_moderation(
    status: Optional[Literal['published', 'hidden', 'all']] = 'all',
    has_reports: Optional[bool] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Literal['created_at', 'report_count', 'view_count'] = 'created_at',
    sort_order: Literal['asc', 'desc'] = 'desc',
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_moderator),
):
    """게시글 목록 조회 (관리자용)"""
    query = select(Post).options(selectinload(Post.author))

    # 필터
    conditions = []
    if status == 'published':
        conditions.append(Post.is_published == True)
    elif status == 'hidden':
        conditions.append(Post.is_published == False)
    if category:
        conditions.append(Post.category == category)
    if search:
        search_pattern = f"%{search}%"
        conditions.append(
            or_(Post.title.ilike(search_pattern), Post.content.ilike(search_pattern))
        )

    if conditions:
        query = query.where(and_(*conditions))

    # 정렬
    if sort_by == 'created_at':
        sort_column = Post.created_at
    elif sort_by == 'view_count':
        sort_column = Post.view_count
    else:
        sort_column = Post.created_at

    if sort_order == 'desc':
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)

    # 총 개수
    count_query = select(func.count(Post.id))
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total = await db.scalar(count_query)

    # 페이지네이션
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    posts = result.scalars().all()

    # 신고 수 조회
    post_ids = [p.id for p in posts]
    report_counts = {}
    if post_ids:
        report_result = await db.execute(
            select(Report.target_id, func.count(Report.id))
            .where(and_(Report.target_type == 'post', Report.target_id.in_(post_ids)))
            .group_by(Report.target_id)
        )
        report_counts = dict(report_result.all())

    posts_response = []
    for post in posts:
        posts_response.append(ModerationPostResponse(
            id=post.id,
            title=post.title,
            content=post.content,
            category=post.category,
            author=AuthorResponse.model_validate(post.author),
            status='published' if post.is_published else 'hidden',
            report_count=report_counts.get(post.id, 0),
            view_count=post.view_count,
            like_count=post.like_count,
            comment_count=post.comment_count,
            is_pinned=post.is_pinned,
            created_at=post.created_at,
            updated_at=post.updated_at,
            last_reported_at=None,
        ))

    return PostListModerationResponse(
        posts=posts_response,
        total=total or 0,
        skip=skip,
        limit=limit,
    )


@router.post("/posts/{post_id}/hide")
async def hide_post(
    post_id: int,
    hide_data: ContentHideRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_moderator),
):
    """게시글 숨김"""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")

    post.is_published = False

    await create_moderation_log(
        db, current_user.id, 'hide_post', 'post', post_id, hide_data.reason
    )

    await db.commit()

    return {"message": "게시글이 숨겨졌습니다"}


@router.post("/posts/{post_id}/unhide")
async def unhide_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_moderator),
):
    """게시글 숨김 해제"""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")

    post.is_published = True

    await create_moderation_log(
        db, current_user.id, 'unhide_post', 'post', post_id
    )

    await db.commit()

    return {"message": "게시글이 공개되었습니다"}


@router.delete("/posts/{post_id}")
async def delete_post_admin(
    post_id: int,
    reason: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_moderator),
):
    """게시글 삭제"""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")

    await create_moderation_log(
        db, current_user.id, 'delete_post', 'post', post_id, reason
    )

    await db.delete(post)
    await db.commit()

    return {"message": "게시글이 삭제되었습니다"}


@router.get("/comments", response_model=CommentListModerationResponse)
async def list_comments_moderation(
    status: Optional[Literal['published', 'hidden', 'all']] = 'all',
    has_reports: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: Literal['created_at', 'report_count'] = 'created_at',
    sort_order: Literal['asc', 'desc'] = 'desc',
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_moderator),
):
    """댓글 목록 조회 (관리자용)"""
    query = select(Comment).options(
        selectinload(Comment.author),
        selectinload(Comment.post),
    )

    # 필터
    conditions = []
    if status == 'published':
        conditions.append(Comment.is_deleted == False)
    elif status == 'hidden':
        conditions.append(Comment.is_deleted == True)
    if search:
        search_pattern = f"%{search}%"
        conditions.append(Comment.content.ilike(search_pattern))

    if conditions:
        query = query.where(and_(*conditions))

    # 정렬
    sort_column = Comment.created_at
    if sort_order == 'desc':
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)

    # 총 개수
    count_query = select(func.count(Comment.id))
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total = await db.scalar(count_query)

    # 페이지네이션
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    comments = result.scalars().all()

    # 신고 수 조회
    comment_ids = [c.id for c in comments]
    report_counts = {}
    if comment_ids:
        report_result = await db.execute(
            select(Report.target_id, func.count(Report.id))
            .where(and_(Report.target_type == 'comment', Report.target_id.in_(comment_ids)))
            .group_by(Report.target_id)
        )
        report_counts = dict(report_result.all())

    comments_response = []
    for comment in comments:
        comments_response.append(ModerationCommentResponse(
            id=comment.id,
            content=comment.content,
            post_id=comment.post_id,
            post_title=comment.post.title if comment.post else "",
            author=AuthorResponse.model_validate(comment.author),
            status='hidden' if comment.is_deleted else 'published',
            report_count=report_counts.get(comment.id, 0),
            like_count=comment.like_count,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
            last_reported_at=None,
        ))

    return CommentListModerationResponse(
        comments=comments_response,
        total=total or 0,
        skip=skip,
        limit=limit,
    )


@router.post("/comments/{comment_id}/hide")
async def hide_comment(
    comment_id: int,
    hide_data: ContentHideRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_moderator),
):
    """댓글 숨김"""
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()

    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다")

    comment.is_deleted = True

    await create_moderation_log(
        db, current_user.id, 'hide_comment', 'comment', comment_id, hide_data.reason
    )

    await db.commit()

    return {"message": "댓글이 숨겨졌습니다"}


@router.delete("/comments/{comment_id}")
async def delete_comment_admin(
    comment_id: int,
    reason: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_moderator),
):
    """댓글 삭제"""
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()

    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다")

    await create_moderation_log(
        db, current_user.id, 'delete_comment', 'comment', comment_id, reason
    )

    await db.delete(comment)
    await db.commit()

    return {"message": "댓글이 삭제되었습니다"}


# ============================================
# 관리 로그 API
# ============================================

@router.get("/logs", response_model=ModerationLogListResponse)
async def list_moderation_logs(
    action_type: Optional[str] = None,
    target_type: Optional[Literal['user', 'post', 'comment', 'report']] = None,
    moderator_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_moderator),
):
    """관리 로그 조회"""
    query = select(ModerationLog).options(selectinload(ModerationLog.moderator))

    conditions = []
    if action_type:
        conditions.append(ModerationLog.action_type == action_type)
    if target_type:
        conditions.append(ModerationLog.target_type == target_type)
    if moderator_id:
        conditions.append(ModerationLog.moderator_id == moderator_id)

    if conditions:
        query = query.where(and_(*conditions))

    query = query.order_by(desc(ModerationLog.created_at))

    # 총 개수
    count_query = select(func.count(ModerationLog.id))
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total = await db.scalar(count_query)

    # 페이지네이션
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    return ModerationLogListResponse(
        logs=[ModerationLogResponse.model_validate(l) for l in logs],
        total=total or 0,
        skip=skip,
        limit=limit,
    )


# ============================================
# 사용자 경고 API
# ============================================

@router.get("/users/{user_id}/warnings", response_model=UserWarningListResponse)
async def get_user_warnings(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_moderator),
):
    """사용자 경고 목록 조회"""
    result = await db.execute(
        select(UserWarning)
        .options(selectinload(UserWarning.moderator))
        .where(UserWarning.user_id == user_id)
        .order_by(desc(UserWarning.created_at))
    )
    warnings = result.scalars().all()

    return UserWarningListResponse(
        warnings=[UserWarningResponse.model_validate(w) for w in warnings],
        total=len(warnings),
    )
