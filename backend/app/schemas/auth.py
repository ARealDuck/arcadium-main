import re
import unicodedata
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, field_validator, model_validator, StringConstraints
from typing import Annotated

DISPLAY_NAME_RE = re.compile(r"^[\w .\-'!?~★☆]{1,32}$")

DisplayName = Annotated[str, StringConstraints(pattern=r"^[\w .\-'!?~★☆]{1,32}$")]

class RegisterIn(BaseModel):
    username: str = Field(pattern=r"^[A-Za-z0-9_]{3,20}$")
    email: EmailStr
    display_name: DisplayName
    password: str = Field(min_length=8, max_length=128)
    invite_code: str | None = None

    @field_validator("display_name")
    @classmethod
    def clean_display_name(cls, value: str | None) -> str:
        if value is None:
            return None
        value = unicodedata.normalize("NFC", value)
        value = " ".join(value.split())

        if not value:
            return None

        if not DISPLAY_NAME_RE.fullmatch(value):
            raise ValueError("Display name can use letters, numbers, spaces and - ' ! ? ~ ★ ☆ (1–32 characters)")
        return value

    @model_validator(mode="after")
    def default_display_name(self):
        if self.display_name is None:
            self.display_name = self.username
        return self
        


class LoginIn(BaseModel):
    identifier: str # username or email
    password: str

class UserRatingOut(BaseModel):
    model_config = {"from_attributes": True}
    
    ladder: str
    display_rating: float
    placed: bool
    games_played: int
    rank: int
    total: int
    wins: int
    losses: int
    selected_tables: list[str]

class UserOut(BaseModel):
    id: int
    display_name: str
    username: str
    avatar_url: str | None
    has_tachi_key: bool = False
    onboarded_at: datetime | None
    email_verified: bool

    model_config = {"from_attributes": True}