"""
댓글 모델 정의
Comment 모델 (대댓글 지원)
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class Comment(Base):
    """
    댓글 모델 (대댓글 지원)

    Attributes:
        id: 댓글 ID
        post_id: 게시글 ID
        author_id: 작성자 ID
        parent_id: 부모 댓글 ID (대댓글용)
        content: 댓글 내용
        like_count: 좋아요 수
        is_deleted: 삭제 여부 (soft delete)
        created_at: 작성일
        updated_at: 수정일
    """
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 관계 ID
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, comment="게시글")
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="작성자")
    parent_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True, comment="부모 댓글 (대댓글용)")

    # 댓글 내용
    content = Column(Text, nullable=False, comment="댓글 내용")

    # 통계
    like_count = Column(Integer, default=0, nullable=False, comment="좋아요 수")

    # 상태
    is_deleted = Column(Boolean, default=False, nullable=False, comment="삭제 여부")

    # 메타데이터
    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        comment="작성일"
    )
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="수정일"
    )

    # 관계
    post = relationship("Post", back_populates="comments")
    author = relationship("User", back_populates="comments")
    parent = relationship("Comment", remote_side=[id], backref="replies")

    # 인덱스
    __table_args__ = (
        Index('idx_comments_post', 'post_id', 'created_at'),
        Index('idx_comments_author', 'author_id'),
        Index('idx_comments_parent', 'parent_id'),
    )

    def __repr__(self):
        return f"<Comment(id={self.id}, post_id={self.post_id}, author_id={self.author_id})>"


class CommentLike(Base):
    """
    댓글 좋아요 모델

    Attributes:
        id: 고유 ID
        user_id: 사용자 ID
        comment_id: 댓글 ID
        created_at: 좋아요 시간
    """
    __tablename__ = "comment_likes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 관계 ID
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="사용자")
    comment_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=False, comment="댓글")

    # 메타데이터
    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        comment="좋아요 시간"
    )

    # 인덱스 (user + comment 유니크)
    __table_args__ = (
        Index('idx_comment_likes_unique', 'user_id', 'comment_id', unique=True),
    )

    def __repr__(self):
        return f"<CommentLike(user_id={self.user_id}, comment_id={self.comment_id})>"
