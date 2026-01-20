"""
게시글 모델 정의
Post, PostLike, Tag, PostTag 모델
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Index, Table
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


# 게시글-태그 다대다 관계 테이블
post_tags = Table(
    'post_tags',
    Base.metadata,
    Column('post_id', Integer, ForeignKey('posts.id', ondelete='CASCADE'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True),
)


class Post(Base):
    """
    게시글 모델

    Attributes:
        id: 게시글 ID
        author_id: 작성자 ID
        title: 제목
        content: 본문 (Markdown)
        category: 카테고리
        view_count: 조회수
        like_count: 좋아요 수 (캐시)
        comment_count: 댓글 수 (캐시)
        is_published: 공개 여부
        is_pinned: 상단 고정
        created_at: 작성일
        updated_at: 수정일
    """
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 작성자
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="작성자")

    # 게시글 내용
    title = Column(String(200), nullable=False, comment="제목")
    content = Column(Text, nullable=False, comment="본문 (Markdown)")
    category = Column(String(50), nullable=False, index=True, comment="카테고리")

    # 통계 (캐시)
    view_count = Column(Integer, default=0, nullable=False, comment="조회수")
    like_count = Column(Integer, default=0, nullable=False, comment="좋아요 수")
    comment_count = Column(Integer, default=0, nullable=False, comment="댓글 수")

    # 상태
    is_published = Column(Boolean, default=True, nullable=False, comment="공개 여부")
    is_pinned = Column(Boolean, default=False, nullable=False, comment="상단 고정")

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
    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary=post_tags, back_populates="posts")

    # 인덱스
    __table_args__ = (
        Index('idx_posts_author', 'author_id'),
        Index('idx_posts_category', 'category'),
        Index('idx_posts_created_at', 'created_at'),
        Index('idx_posts_trending', 'like_count', 'created_at'),
    )

    def __repr__(self):
        return f"<Post(id={self.id}, title={self.title[:30]}...)>"


class PostLike(Base):
    """
    게시글 좋아요 모델

    Attributes:
        id: 고유 ID
        user_id: 사용자 ID
        post_id: 게시글 ID
        created_at: 좋아요 시간
    """
    __tablename__ = "post_likes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 관계 ID
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="사용자")
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, comment="게시글")

    # 메타데이터
    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        comment="좋아요 시간"
    )

    # 관계
    user = relationship("User", back_populates="post_likes")
    post = relationship("Post", back_populates="likes")

    # 인덱스 (user + post 유니크)
    __table_args__ = (
        Index('idx_post_likes_unique', 'user_id', 'post_id', unique=True),
    )

    def __repr__(self):
        return f"<PostLike(user_id={self.user_id}, post_id={self.post_id})>"


class Tag(Base):
    """
    태그 모델

    Attributes:
        id: 태그 ID
        name: 태그 이름
        slug: URL용 슬러그
        post_count: 게시글 수 (캐시)
        created_at: 생성일
    """
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 태그 정보
    name = Column(String(50), nullable=False, comment="태그 이름")
    slug = Column(String(50), unique=True, nullable=False, index=True, comment="URL용 슬러그")

    # 통계 (캐시)
    post_count = Column(Integer, default=0, nullable=False, comment="게시글 수")

    # 메타데이터
    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        comment="생성일"
    )

    # 관계
    posts = relationship("Post", secondary=post_tags, back_populates="tags")

    # 인덱스
    __table_args__ = (
        Index('idx_tags_slug', 'slug'),
        Index('idx_tags_popular', 'post_count'),
    )

    def __repr__(self):
        return f"<Tag(id={self.id}, name={self.name})>"
