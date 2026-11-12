from typing import Annotated

from app.config import settings
from app.core.db import get_db
from app.core.security import hash_token
from app.models import User, UserSession
from app.services.auth import create_session
from fastapi import Cookie, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

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

def get_current_user(
        db: DbSession,
        session_token: str | None = Cookie(default=None, alias=COOKIE_NAME)
) -> User:
    if not session_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not logged in!")

    user = db.scalar(
        select(User)
        .join(UserSession)
        .where(
            UserSession.token_hash == hash_token(session_token),
            UserSession.expires_at > func.now(),
            User.is_active.is_(True),
        )
        .options(selectinload(User.ratings))
    )

    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired or invalid")

    return user

CurrentUser = Annotated[User, Depends(get_current_user)]

def require_admin(user: CurrentUser) -> User:
    if user.id not in settings.admin_user_ids:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    return user

AdminUser = Annotated[User, Depends(require_admin)]