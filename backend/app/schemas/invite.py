from datetime import datetime

from pydantic import BaseModel, ConfigDict


class InviteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    created_at: datetime
    used_at: datetime | None = None
    used_by_name: str | None = None
    used_by_id: int | None = None

class InvitesOut(BaseModel):
    invites: list[InviteOut]
    available: int