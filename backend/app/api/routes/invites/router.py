import secrets

from app.api.dependencies import AdminUser, CurrentUser, DbSession
from app.config import settings
from app.models.invites import Invite
from app.models.users import User
from app.schemas.invite import InviteOut, InvitesOut
from app.services.invites import invites_available
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

router = APIRouter(prefix="/invite", tags=["invite"])

@router.post("/create", response_model=InviteOut, status_code=201)
def create_invite_code(db: DbSession, user: CurrentUser):
    db.execute(select(User).where(User.id == user.id).with_for_update())

    if invites_available(db, user) <= 0:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You have no invites left.")
    
    code = secrets.token_urlsafe(9)
    new_invite = Invite(code=code, created_by=user.id)
    db.add(new_invite)
    db.commit()

    return new_invite

@router.get("/list", response_model=InvitesOut)
def list_invite_codes(db: DbSession, user: CurrentUser):
    rows = db.execute(
        select(Invite, User.display_name)
        .outerjoin(User, Invite.used_by == User.id)
        .where(
            Invite.created_by == user.id
        ).order_by(Invite.created_at.desc())
    ).all()

    invites = [
        InviteOut(
            code=invite.code,
            created_at=invite.created_at,
            used_at=invite.used_at,
            used_by_name=used_by_name,
            used_by_id=invite.used_by
        )
        for invite, used_by_name in rows
    ]

    return InvitesOut(invites=invites, available=invites_available(db, user))

@router.get("/status")
def invite_code_status():
    return {"invites_required": settings.invites_required}

@router.post("/admin/create", response_model=list[InviteOut], status_code=201)
def admin_create_invites(db: DbSession, admin: AdminUser, count: int = Query(1, ge=1, le=50)):
    invites = [Invite(code=secrets.token_urlsafe(9), created_by=admin.id, is_admin_grant=True) for _ in range(count)]
    db.add_all(invites)
    db.commit()
    return invites