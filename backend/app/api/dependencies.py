from typing import Annotated

from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.core.db import get_db
from app.core.security import hash_token
from app.models import User, UserSession
from app.services.auth import create_session

COOKIE_NAME = "session"
DbSession = Annotated[Session, Depends(get_db)]

def set_session_cookie(db: Session, user: User, response: Response) -> None:
    token = create_session(db, user)
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=settings.session_days * 24 * 3600,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure
    )

def get_current_session(request: Request, db: DbSession) -> UserSession:
    token = request.cookies.get(COOKIE_NAME)

    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED)

    session = db.scalar(
        select(UserSession)
        .join(User, User.id == UserSession.user_id)
        .where(
            UserSession.token_hash == hash_token(token),
            UserSession.expires_at > func.now(),
            User.is_active.is_(True)
        )
    )

    if session is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED)
    return session

CurrentSession = Annotated[UserSession, Depends(get_current_session)]

def get_current_user(
    session: CurrentSession
) -> User:
    return session.user

CurrentUser = Annotated[User, Depends(get_current_user)]

def require_admin(user: CurrentUser) -> User:
    if user.id not in settings.admin_user_ids:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    return user

AdminUser = Annotated[User, Depends(require_admin)]