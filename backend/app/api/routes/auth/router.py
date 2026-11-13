import hashlib
import io
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Cookie, HTTPException, Response, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import Field
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError

from app.api.dependencies import (
    COOKIE_NAME,
    CurrentSession,
    CurrentUser,
    DbSession,
    set_session_cookie,
)
from app.api.routes.auth.responses import build_user_out
from app.config import settings
from app.core.constants import ALLOWED_FORMATS, MAX_AVATAR_BYTES, MAX_IMAGE_PIXELS
from app.core.enums import TokenPurpose
from app.core.security import hash_password, hash_token, verify_password
from app.job.enqueue import (
    enqueue_job,
    enqueue_send_verify_email,
    enqueue_tachi_check,
    enqueue_tachi_seed,
)
from app.models import User, UserSession
from app.models.invites import Invite
from app.models.tokens import Token
from app.schemas.auth import EmailIn, ForgotIn, LoginIn, PasswordIn, RegisterIn, ResetIn, UserOut
from app.schemas.job import JobOut
from app.services.user import find_user_by_identifier

router = APIRouter(prefix="/auth", tags=["auth"])
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, response: Response, db: DbSession):
    invite = None

    if settings.invites_required or body.invite_code:
        if not body.invite_code:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "An invite code is required.")

        invite = db.scalar(
            select(Invite)
            .where(Invite.code == body.invite_code.strip(), Invite.used_by.is_(None))
            .with_for_update()
        )
        if invite is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "That invite code is invalid or already used.")

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

    if invite:
        invite.used_by = user.id
        invite.used_at = func.now()

    set_session_cookie(db, user, response)
    user.last_login_at = func.now()

    enqueue_send_verify_email(db, user.id)

    db.commit()
    return user

@router.post("/login", response_model=UserOut)
def login(body: LoginIn, response: Response, db: DbSession):
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

    user_out = build_user_out(user)

    return user_out

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    db: DbSession,
    session_token: str | None = Cookie(default=None, alias=COOKIE_NAME),
):
    if session_token:
        db.execute(delete(UserSession).where(UserSession.token_hash == hash_token(session_token)))
        db.commit()
    response.delete_cookie(COOKIE_NAME)

@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    has_tachi_key = bool(user.tachi_api_key)

    return build_user_out(user)
# Allows a user to link their tachi account. Once this is done, a job is queued to seed them behind the scenes.

@router.post("/me/tachi_key", response_model=JobOut, status_code=200)
def tachi_key(tachi_key: str, user: CurrentUser, db: DbSession):
    if (tachi_key == None or tachi_key.strip() == ""):
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Tachi key must not be empty!")
    
    user.rating_seeds = {}

    job = enqueue_tachi_check(db, user.id, tachi_key)    

    db.commit()

    return job



@router.put("/me/confirm_tachi_key", response_model=JobOut | None, status_code=200)
def confirm_tachi_key(tachi_key: str, user: CurrentUser, db: DbSession):
    if (tachi_key == None or tachi_key.strip() == ""):
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Tachi key must not be empty!")

    job = None
    skip_seeding = False

    # We might need to move seeding to a different function, or change how we do it for use with multiple games
    # If first seed job fails, they won't have any seeds to use. This is fine, since we have presets. but just a thought.
    if user.tachi_api_key:
        skip_seeding = True

    user.tachi_api_key = tachi_key

    if not skip_seeding:
        job = enqueue_tachi_seed(db, user.id)

    db.commit()

    return job

@router.put('/me/finish_onboarding', status_code=200)
def finish_onboarding(user: CurrentUser, db: DbSession):
    if user.tachi_api_key.strip() == "" or user.tachi_api_key is None:
        raise HTTPException("Link your tachi key first!")

    if user.onboarded_at is None:
        user.onboarded_at = datetime.now(UTC)

    db.commit()

    return build_user_out(user)

@router.post("/me/resend_verify", status_code=200)
def resend_verify(db: DbSession, user: CurrentUser):
    job = enqueue_send_verify_email(db, user.id)

    db.commit()

    return job

@router.post('/me/verify', status_code=200)
def verify_email(db: DbSession, token: str, user: CurrentUser):
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

@router.post('/me/avatar', status_code=200)
def update_avatar(file: UploadFile, db: DbSession, user: CurrentUser):

    data = file.file.read(MAX_AVATAR_BYTES + 1)

    if len(data) > MAX_AVATAR_BYTES:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Image must be 5 MB or smaller")
    
    try:
        img = Image.open(io.BytesIO(data))
        img.load()

        if img.format not in ALLOWED_FORMATS:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "That file isn't a supported image.")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(400, "That file isn't a supported image.")

    img = ImageOps.exif_transpose(img).convert("RGBA")
    img = ImageOps.fit(img, (256, 256))
    out = io.BytesIO()
    img.save(out, "WEBP", quality=85)

    path = Path(settings.media_dir) / "avatars" / f"{uuid4()}.webp"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(out.getvalue())
    old_url = user.avatar_url
    user.avatar_url = f"/api/media/avatars/{path.name}"
    db.commit()

    if old_url and old_url.startswith("/api/media/avatars/"):
        (Path(settings.media_dir) / "avatars" / Path(old_url).name).unlink(missing_ok=True)

    return build_user_out(user)

# Maybe lock this down further by asking for password at some point?
@router.put("/me/email", status_code=200)
def change_email(db: DbSession, body: EmailIn, user: CurrentUser):

    if body.email == user.email:
        return build_user_out(user)

    user.email = body.email
    user.email_verified = False

    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "That email is already in use.")

    enqueue_send_verify_email(db, user.id)
    
    db.commit()

    return build_user_out(user)

@router.put("/me/password", status_code=200)
def change_password(db: DbSession, session: CurrentSession, body: PasswordIn, user: CurrentUser):

    if not user.email_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Your email must be verified to change your password.")

    valid, _ = verify_password(body.old_password, user.password_hash)

    if not valid:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Your password is incorrect.")

    user.password_hash = hash_password(body.new_password)

    db.execute(
        delete(UserSession).where(
            UserSession.user_id == user.id,
            UserSession.token_hash != session.token_hash
        )
    )

    db.commit()

    return build_user_out(user)

@router.post("/password/forgot", status_code=200)
def send_forgot_password(db: DbSession, body: ForgotIn):
    user = find_user_by_identifier(db, body.identifier)

    if user is not None:
        enqueue_job(db, user.id, "send_password_reset_email")
        db.commit()

    return {"msg": "If a user with that name or email exists, we've sent a link to the email on file."}

@router.put("/password/reset", status_code=200)
def reset_password(db: DbSession, body: ResetIn):

    token_hash = hashlib.sha256(body.token.encode()).hexdigest()

    row = db.scalar(
        select(Token)
        .where(
            Token.token_hash == token_hash,
            Token.purpose == TokenPurpose.RESET,
            Token.used_at.is_(None),
            Token.expires_at > func.now()
        )
        .with_for_update()
    )

    if row is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This link is invalid or has been used.")

    user = db.get(User, row.user_id)

    if user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This link is invalid or has been used.")

    user.password_hash = hash_password(body.new_password)
    user.email_verified = True

    db.execute(
        delete(UserSession).where(
            UserSession.user_id == user.id
        )
    )
    
    row.used_at = func.now()

    db.commit()

    return {"msg": "Your password has now been reset. You may log in now."}

    

    