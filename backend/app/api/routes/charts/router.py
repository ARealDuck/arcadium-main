from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.dependencies import DbSession
from app.logic.ratings import ELO_FLOOR
from app.models import Chart, ChartRating, ChartTableLevel
from app.schemas.chart import ChartOut
from app.services.match import SEARCH_WINDOW_START

router = APIRouter(prefix="/chart", tags=["chart"])

@router.get("", response_model=list[ChartOut])
def get_charts(
    db: DbSession,
    ladder: Annotated[str, Query(pattern="^(ec|hc)$")] = "ec",
    min_rating: float | None = None,
    max_rating: float | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0
):
    stmt = (
        select(Chart)
        .join(ChartRating, ChartRating.chart_id == Chart.chart_id)
        .where(ChartRating.ladder == ladder)
        .options(selectinload(Chart.ratings), selectinload(Chart.table_levels))
    )

    if min_rating is not None:
        stmt = stmt.where(ChartRating.rating >= min_rating)
    if max_rating is not None:
        stmt = stmt.where(ChartRating.rating <= max_rating)

    stmt = stmt.order_by(ChartRating.rating).limit(limit).offset(offset)
    return db.scalars(stmt).all()

@router.get("/get_table_search_counts/{game}/{playtype}/{ladder}/{elo}", response_model=dict[str, int])
def get_table_search_counts(db: DbSession, elo: int, game: str, playtype: str, ladder: str):

    low = max(ELO_FLOOR, elo - SEARCH_WINDOW_START)
    high = elo + SEARCH_WINDOW_START

    search = (
        select(
        ChartTableLevel.table_icon,
        func.count(func.distinct(ChartTableLevel.chart_id)).label("count"),
    
        )
        .join(ChartRating, ChartRating.chart_id == ChartTableLevel.chart_id)
        .where(
            ChartRating.ladder == ladder,
            ChartRating.rating.between(low, high),
        )
        .group_by(ChartTableLevel.table_icon)
    )

    rows = db.execute(search).all()

    return {r.table_icon: r.count for r in rows}