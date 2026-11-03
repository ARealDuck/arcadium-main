from datetime import datetime, timedelta, timezone
import secrets, hashlib
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.enums import TokenPurpose
from app.models import User, UserSession
from app.api.dependencies import COOKIE_NAME, DbSession, get_current_user, set_session_cookie
from app.job.enqueue import enqueue_send_verify_email, enqueue_tachi_check, enqueue_tachi_seed
from app.models.tokens import Token
from app.schemas.job import JobOut
from app.core.security import hash_password, hash_token, verify_password

from app.schemas.auth import UserOut, RegisterIn, LoginIn

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, response: Response, db: Session = Depends(get_db)):
    taken = db.scalar(select(User).where(func.lower(User.username) == body.username.lower()))

    if taken:
        raise HTTPException(status.HTTP_409_CONFLICT, "Username is taken!")

    if len(body.password) < 3 and len(body.password) > 20:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Your password should be between 3 and 20 characters!")

    user = User(
        username=body.username, 
        password_hash=hash_password(body.password),
        email=body.email.strip().lower(),
        display_name=body.display_name.strip()
        )
    db.add(user)

    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Username or email is taken")

    set_session_cookie(db, user, response)
    user.last_login_at = func.now()

    enqueue_send_verify_email(db, user.id)

    db.commit()
    return user

@router.post("/login", response_model=UserOut)
def login(body: LoginIn, response: Response, db: Session = Depends(get_db)):
    ident = body.identifier.strip().lower()
    column = User.email if "@" in ident else User.username
    user = db.scalar(select(User).where(func.lower(column) == ident))

    valid, new_hash = verify_password(body.password, user.password_hash if user else None)

    if not user or not valid or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid username or password!")

    if new_hash:
        user.password_hash = new_hash

    set_session_cookie(db, user, response)
    user.last_login_at = func.now()
    db.commit()
    db.refresh(user)

    has_tachi_api_key = False

    if user.tachi_api_key != "" or user.tachi_api_key is not None:
        has_tachi_api_key = True

    user_out = UserOut(id=user.id, display_name=user.display_name, username=user.username, avatar_url=user.avatar_url, has_tachi_key=has_tachi_api_key, onboarded_at=user.onboarded_at, email_verified=user.email_verified)
        

    return user_out

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    session_token: str | None = Cookie(default=None, alias=COOKIE_NAME),
    db: Session = Depends(get_db)
):
    if session_token:
        db.execute(delete(UserSession).where(UserSession.token_hash == hash_token(session_token)))
        db.commit()
    response.delete_cookie(COOKIE_NAME)

@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    has_tachi_key = bool(user.tachi_api_key)

    return UserOut(id=user.id, username=user.username, display_name=user.display_name, avatar_url=user.avatar_url, has_tachi_key=has_tachi_key, onboarded_at=user.onboarded_at, email_verified=user.email_verified)

# Allows a user to link their tachi account. Once this is done, a job is queued to seed them behind the scenes.

@router.post("/me/tachi_key", response_model=JobOut, status_code=200)
def tachi_key(tachi_key: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if (tachi_key == None or tachi_key.strip() == ""):
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Tachi key must not be empty!")
    
    user.rating_seeds = {}

    job = enqueue_tachi_check(db, user.id, tachi_key)    

    db.commit()

    return job

@router.put("/me/confirm_tachi_key", response_model=JobOut, status_code=200)
def confirm_tachi_key(tachi_key: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if (tachi_key == None or tachi_key.strip() == ""):
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Tachi key must not be empty!")

    user.tachi_api_key = tachi_key

    job = enqueue_tachi_seed(db, user.id)

    db.commit()

    return job

@router.put('/me/finish_onboarding', status_code=200)
def finish_onboarding(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.tachi_api_key.strip() == "" or user.tachi_api_key is None:
        raise HTTPException("Link your tachi key first!")

    if user.onboarded_at is None:
        user.onboarded_at = datetime.now(timezone.utc)

    db.commit()

    return UserOut(id=user.id, username=user.username, display_name=user.display_name, avatar_url=user.avatar_url, has_tachi_key=True, onboarded_at=user.onboarded_at, email_verified=user.email_verified)

@router.post("/me/resend_verify", status_code=200)
def resend_verify(db: DbSession, user: User = Depends(get_current_user)):
    job = enqueue_send_verify_email(db, user.id)

    db.commit()

    return job

@router.post('/me/verify', status_code=200)
def verify_email(db: DbSession, token: str, user: User = Depends(get_current_user)):
    if token is None or token.strip() == "":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No token was specified. Aborting.")

    token_hash = hashlib.sha256(token.encode()).hexdigest()

    row = db.scalar(
        select(Token)
        .where(
            Token.token_hash == token_hash,
            Token.purpose == TokenPurpose.VERIFY,
            Token.used_at.is_(None),
            Token.expires_at > func.now()
        )
        .with_for_update()
    )    

    if row is None or row.user_id != user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This link is invalid or has been used.")

    row.used_at = func.now()
    row.user.email_verified = True
    db.commit()
    return {"message": "Email verified"}