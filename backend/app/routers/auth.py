"""
인증 API 라우터
회원가입, 로그인, OAuth
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.core.database import get_db
from app.core.config import settings
from app.core.security import verify_refresh_token
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterResponse,
    RefreshTokenRequest,
    TokenResponse,
)
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    이메일 회원가입

    - 이메일, 사용자명 중복 체크
    - 비밀번호 해싱 후 저장
    """
    # 중복 체크
    email_exists, username_exists = await AuthService.check_email_or_username_exists(
        db, user_data.email, user_data.username
    )

    if email_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 이메일입니다",
        )

    if username_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 사용자명입니다",
        )

    # 사용자 생성
    user = await AuthService.create_user(db, user_data)

    return RegisterResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        display_name=user.display_name,
        message="회원가입이 완료되었습니다",
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    이메일 로그인

    - 이메일/비밀번호 검증
    - JWT 토큰 발급
    """
    user = await AuthService.authenticate_user(
        db, login_data.email, login_data.password
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다",
        )

    # 토큰 생성
    access_token, refresh_token, expires_in = AuthService.create_tokens(user.id)

    # Refresh Token을 HttpOnly 쿠키로 설정
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=expires_in,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout")
async def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
):
    """
    로그아웃

    - Refresh Token 쿠키 삭제
    """
    response.delete_cookie("refresh_token")
    return {"message": "로그아웃되었습니다"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    token_data: Optional[RefreshTokenRequest] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    토큰 갱신

    - Refresh Token으로 새 Access Token 발급
    - 쿠키 또는 요청 본문에서 토큰 추출
    """
    # 쿠키에서 먼저 시도
    refresh_token = request.cookies.get("refresh_token")

    # 요청 본문에서 시도
    if refresh_token is None and token_data:
        refresh_token = token_data.refresh_token

    if refresh_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh Token이 필요합니다",
        )

    # 토큰 검증
    user_id = verify_refresh_token(refresh_token)

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 Refresh Token입니다",
        )

    # 사용자 확인
    user = await AuthService.get_user_by_id(db, user_id)

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자를 찾을 수 없습니다",
        )

    # 새 토큰 생성
    access_token, new_refresh_token, expires_in = AuthService.create_tokens(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=expires_in,
    )


# OAuth 라우터
@router.get("/oauth/google")
async def google_oauth_start():
    """Google OAuth 시작 - 인증 페이지로 리다이렉트"""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth가 설정되지 않았습니다",
        )

    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        "&response_type=code"
        "&scope=email%20profile"
        "&access_type=offline"
    )
    return RedirectResponse(url=auth_url)


@router.get("/oauth/google/callback")
async def google_oauth_callback(
    code: str,
    db: AsyncSession = Depends(get_db),
):
    """Google OAuth 콜백 처리"""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth가 설정되지 않았습니다",
        )

    try:
        # 액세스 토큰 교환
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                },
            )
            token_data = token_response.json()

            if "error" in token_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"OAuth 토큰 교환 실패: {token_data.get('error_description', token_data['error'])}",
                )

            # 사용자 정보 조회
            user_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            user_info = user_response.json()

        # 사용자 생성/조회
        user, is_new = await AuthService.get_or_create_oauth_user(
            db,
            provider="google",
            provider_id=user_info["id"],
            email=user_info["email"],
            display_name=user_info.get("name", user_info["email"].split("@")[0]),
            avatar_url=user_info.get("picture"),
        )

        # JWT 토큰 생성
        access_token, refresh_token, _ = AuthService.create_tokens(user.id)

        # Frontend로 리다이렉트 (토큰 포함)
        redirect_url = f"{settings.FRONTEND_URL}/auth/callback?access_token={access_token}&refresh_token={refresh_token}&new_user={is_new}"
        return RedirectResponse(url=redirect_url)

    except httpx.HTTPError as e:
        logger.error(f"Google OAuth 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth 처리 중 오류가 발생했습니다",
        )


@router.get("/oauth/github")
async def github_oauth_start():
    """GitHub OAuth 시작 - 인증 페이지로 리다이렉트"""
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="GitHub OAuth가 설정되지 않았습니다",
        )

    auth_url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={settings.GITHUB_REDIRECT_URI}"
        "&scope=user:email"
    )
    return RedirectResponse(url=auth_url)


@router.get("/oauth/github/callback")
async def github_oauth_callback(
    code: str,
    db: AsyncSession = Depends(get_db),
):
    """GitHub OAuth 콜백 처리"""
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="GitHub OAuth가 설정되지 않았습니다",
        )

    try:
        async with httpx.AsyncClient() as client:
            # 액세스 토큰 교환
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                },
                headers={"Accept": "application/json"},
            )
            token_data = token_response.json()

            if "error" in token_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"OAuth 토큰 교환 실패: {token_data.get('error_description', token_data['error'])}",
                )

            access_token_github = token_data["access_token"]

            # 사용자 정보 조회
            user_response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token_github}",
                    "Accept": "application/json",
                },
            )
            user_info = user_response.json()

            # 이메일 조회 (비공개인 경우)
            email = user_info.get("email")
            if not email:
                email_response = await client.get(
                    "https://api.github.com/user/emails",
                    headers={
                        "Authorization": f"Bearer {access_token_github}",
                        "Accept": "application/json",
                    },
                )
                emails = email_response.json()
                primary_email = next(
                    (e for e in emails if e.get("primary")),
                    emails[0] if emails else None,
                )
                if primary_email:
                    email = primary_email["email"]

            if not email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="GitHub 계정에 이메일이 설정되어 있지 않습니다",
                )

        # 사용자 생성/조회
        user, is_new = await AuthService.get_or_create_oauth_user(
            db,
            provider="github",
            provider_id=str(user_info["id"]),
            email=email,
            display_name=user_info.get("name") or user_info["login"],
            avatar_url=user_info.get("avatar_url"),
        )

        # JWT 토큰 생성
        access_token, refresh_token, _ = AuthService.create_tokens(user.id)

        # Frontend로 리다이렉트
        redirect_url = f"{settings.FRONTEND_URL}/auth/callback?access_token={access_token}&refresh_token={refresh_token}&new_user={is_new}"
        return RedirectResponse(url=redirect_url)

    except httpx.HTTPError as e:
        logger.error(f"GitHub OAuth 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth 처리 중 오류가 발생했습니다",
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """현재 로그인한 사용자 정보 조회"""
    return UserResponse.model_validate(current_user)
