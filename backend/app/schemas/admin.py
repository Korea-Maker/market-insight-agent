"""
관리자 기능 관련 Pydantic 스키마
"""
from datetime import datetime
from typing import Optional, List, Literal, Any
from pydantic import BaseModel, Field

from app.schemas.user import AuthorResponse


# ============================================
# 공통 타입
# ============================================

UserRole = Literal['user', 'moderator', 'admin']
UserStatus = Literal['active', 'warned', 'suspended', 'banned']
ReportTargetType = Literal['post', 'comment', 'user']
ReportReason = Literal['spam', 'harassment', 'inappropriate', 'misinformation', 'copyright', 'other']
ReportStatus = Literal['pending', 'reviewed', 'resolved', 'dismissed']
ReportPriority = Literal['low', 'medium', 'high', 'critical']
ContentStatus = Literal['published', 'hidden', 'deleted']
ReportAction = Literal['dismiss', 'warn_user', 'remove_content', 'ban_user']


# ============================================
# 신고 스키마
# ============================================

class ReportCreate(BaseModel):
    """신고 생성 요청"""
    target_type: ReportTargetType
    target_id: int
    reason: ReportReason
    description: Optional[str] = Field(None, max_length=1000)


class ReportResponse(BaseModel):
    """신고 응답"""
    id: int
    reporter: Optional[AuthorResponse] = None
    target_type: ReportTargetType
    target_id: int
    reason: ReportReason
    description: Optional[str] = None
    status: ReportStatus
    priority: ReportPriority
    reviewed_by: Optional[AuthorResponse] = None
    reviewed_at: Optional[datetime] = None
    resolution_note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReportTargetInfo(BaseModel):
    """신고 대상 정보"""
    type: ReportTargetType
    title: Optional[str] = None
    content: Optional[str] = None
    author: Optional[AuthorResponse] = None


class ReportWithTarget(ReportResponse):
    """대상 정보 포함 신고 응답"""
    target: Optional[ReportTargetInfo] = None


class ReportActionRequest(BaseModel):
    """신고 처리 요청"""
    action: ReportAction
    reason: Optional[str] = Field(None, max_length=500)


class ReportListResponse(BaseModel):
    """신고 목록 응답"""
    reports: List[ReportResponse]
    total: int
    skip: int
    limit: int


# ============================================
# 사용자 관리 스키마
# ============================================

class ModerationUserResponse(BaseModel):
    """관리자용 사용자 응답"""
    id: int
    email: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_verified: bool
    role: UserRole
    status: UserStatus
    warning_count: int
    post_count: int = 0
    comment_count: int = 0
    report_count: int = 0
    last_active_at: Optional[datetime] = None
    suspended_until: Optional[datetime] = None
    banned_at: Optional[datetime] = None
    ban_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserWarnRequest(BaseModel):
    """사용자 경고 요청"""
    reason: str = Field(..., min_length=1, max_length=500)


class UserSuspendRequest(BaseModel):
    """사용자 정지 요청"""
    duration_hours: int = Field(..., ge=1, le=8760)  # 최대 1년
    reason: str = Field(..., min_length=1, max_length=500)


class UserBanRequest(BaseModel):
    """사용자 차단 요청"""
    reason: str = Field(..., min_length=1, max_length=500)


class UserRoleUpdateRequest(BaseModel):
    """사용자 역할 변경 요청"""
    role: UserRole


class UserListResponse(BaseModel):
    """사용자 목록 응답"""
    users: List[ModerationUserResponse]
    total: int
    skip: int
    limit: int


# ============================================
# 콘텐츠 관리 스키마
# ============================================

class ModerationPostResponse(BaseModel):
    """관리자용 게시글 응답"""
    id: int
    title: str
    content: str
    category: str
    author: AuthorResponse
    status: ContentStatus
    report_count: int = 0
    view_count: int
    like_count: int
    comment_count: int
    is_pinned: bool
    created_at: datetime
    updated_at: datetime
    last_reported_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ModerationCommentResponse(BaseModel):
    """관리자용 댓글 응답"""
    id: int
    content: str
    post_id: int
    post_title: str
    author: AuthorResponse
    status: ContentStatus
    report_count: int = 0
    like_count: int
    created_at: datetime
    updated_at: datetime
    last_reported_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ContentHideRequest(BaseModel):
    """콘텐츠 숨김 요청"""
    reason: str = Field(..., min_length=1, max_length=500)


class PostListModerationResponse(BaseModel):
    """게시글 목록 응답 (관리자용)"""
    posts: List[ModerationPostResponse]
    total: int
    skip: int
    limit: int


class CommentListModerationResponse(BaseModel):
    """댓글 목록 응답 (관리자용)"""
    comments: List[ModerationCommentResponse]
    total: int
    skip: int
    limit: int


# ============================================
# 관리 로그 스키마
# ============================================

class ModerationLogResponse(BaseModel):
    """관리 로그 응답"""
    id: int
    moderator: Optional[AuthorResponse] = None
    action_type: str
    target_type: str
    target_id: int
    reason: Optional[str] = None
    extra_data: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ModerationLogListResponse(BaseModel):
    """관리 로그 목록 응답"""
    logs: List[ModerationLogResponse]
    total: int
    skip: int
    limit: int


# ============================================
# 경고 스키마
# ============================================

class UserWarningResponse(BaseModel):
    """사용자 경고 응답"""
    id: int
    user_id: int
    moderator: Optional[AuthorResponse] = None
    reason: str
    acknowledged: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserWarningListResponse(BaseModel):
    """사용자 경고 목록 응답"""
    warnings: List[UserWarningResponse]
    total: int


# ============================================
# 대시보드 통계 스키마
# ============================================

class DashboardStatsResponse(BaseModel):
    """대시보드 통계 응답"""
    total_users: int
    new_users_today: int
    new_users_change: float  # 전일 대비 변화율
    total_posts: int
    new_posts_today: int
    new_posts_change: float
    total_comments: int
    new_comments_today: int
    pending_reports: int
    resolved_reports_today: int
    active_users_24h: int
    banned_users: int
    hidden_posts: int
    hidden_comments: int


class RecentActivityItem(BaseModel):
    """최근 활동 항목"""
    type: str
    description: str
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    user: Optional[AuthorResponse] = None
    created_at: datetime


class RecentActivityResponse(BaseModel):
    """최근 활동 응답"""
    activities: List[RecentActivityItem]
