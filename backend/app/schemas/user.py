from datetime import datetime, date
from typing import Literal
from pydantic import BaseModel, ConfigDict

from app.schemas.match import MatchOut

class ProfileGenericOut(BaseModel):
    display_name: str
    join_date: datetime
    avatar_url: str | None

class ProfilePlayerRatingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    game: str
    playtype: str
    ladder: str
    display_rating: float
    placed: bool
    games_played: int
    wins: int
    peak_rating: float

class TableWinrateOut(BaseModel):
    table_icon: str
    games: int
    wins: int

class RatingPointOut(BaseModel):
    date: date
    rating: float

class LadderStatsOut(BaseModel):
    rating_series: list[RatingPointOut]
    matches: list[MatchOut]
    activity: dict[str, int]
    lamp_counts: dict[str, int]

class BMSProfileOut(BaseModel):
    num_aa: int
    table_winrate: list[TableWinrateOut]

# Eventually put rating_rank and rating_total within ratings somehow.
class UserProfileInfoOut(BaseModel):
    generic: ProfileGenericOut
    ratings: list[ProfilePlayerRatingOut]
    ladder_stats: LadderStatsOut | None = None
    rating_rank: int | None = None
    rating_total: int | None = None
    last_played: datetime | None = None
    bms: BMSProfileOut | None = None

class SetupIn(BaseModel):
    source: Literal["tachi", "preset"]
    preset: Literal["beginner", "intermediate", "advanced", "experienced"] | None

class SeedOptionOut(BaseModel):
    key: str
    level: int
    elo: float

class SeedOptionsOut(BaseModel):
    presets: list[SeedOptionOut]
    tachi: SeedOptionOut | None = None

class SettingsOut(BaseModel):
    bokutachi_key_hint: str | None = None