from datetime import datetime

from app.core.enums import ClearTypes, MatchResult, MatchStatus, MatchType
from app.schemas.auth import UserOut
from app.schemas.chart import ChartOut
from pydantic import BaseModel, ConfigDict, Field, model_validator


class MatchScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lamp: ClearTypes
    grade: str
    percent: float | None
    bp: int | None

class PlacementOut(BaseModel):
    played: int
    required: int

class MatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user: UserOut
    chart: ChartOut
    rating_change: float | None
    ladder: str
    game: str
    playtype: str
    result: MatchResult | None
    status: MatchStatus
    type: MatchType
    search_elo: float
    cancel_reason: str | None
    player_placed_before: bool
    player_display_before: float | None
    player_display_after: float | None
    chart_rating_before: float | None
    chart_rating_after: float | None
    score: MatchScoreOut | None
    start_time: datetime
    cutoff_time: datetime
    end_time: datetime | None
    placement: PlacementOut | None = None

    @model_validator(mode="after")
    def keep_only_match_ladder(self):
        self.chart.ratings = [r for r in self.chart.ratings if r.ladder == self.ladder]
        return self

class MatchWithStakesOut(MatchOut):
    potential_gain: float
    potential_loss: float

class MatchDataOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    wins: int
    losses: int

class StartMatchIn(BaseModel):
    tables: list[str] = Field(min_length=1)