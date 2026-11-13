from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.invites import Invite
from app.models.users import User

INVITES_ON_JOIN = 5
INVITES_PER_MONTH = 3

def months_since(start: datetime) -> int:
    now = datetime.now(UTC)
    months = (now.year - start.year) * 12 + (now.month - start.month)
    if now.day < start.day:
        months -= 1

    return max(months, 0)

def invites_available(db: Session, user: User):
    created = db.scalar(
        select(func.count()).select_from(Invite).where(Invite.created_by == user.id, Invite.is_admin_grant.is_(False))
    )
    earned = INVITES_ON_JOIN + INVITES_PER_MONTH * months_since(user.created_at)
    return max(earned - (created or 0), 0)