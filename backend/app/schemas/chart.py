from pydantic import BaseModel, ConfigDict


class ChartLevelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    table_icon: str
    table_level: str

class ChartRatingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ladder: str
    rating: float
    rd: float
    games_played: int
    wins: int

class ChartOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    chart_id: str
    md5: str
    title: str | None
    artist: str | None
    subtitle: str | None
    sg_ec: float | None
    sg_hc: float | None
    ratings: list[ChartRatingOut]
    table_levels: list[ChartLevelOut]

class TableSearchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    table_icon: str
    count: int