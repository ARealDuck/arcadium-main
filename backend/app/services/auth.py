from datetime import UTC, datetime, timedelta

from app.config import settings
from app.core.security import hash_token, new_session_token
from app.models import User, UserSession
from sqlalchemy.orm import Session


def create_session(db: Session, user: User) -> str:
    token = new_session_token()
    expires_at = datetime.now(UTC) + timedelta(days=settings.session_days)
    db.add(UserSession(user_id=user.id, token_hash=hash_token(token), expires_at=expires_at))
    return token