from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.logic.ratings import initial_rating, sieg_to_elo
from app.models import ChartRating, PlayerRating
from app.models.charts import Chart


def seed_player_rating(db: Session, user_id: int, game: str, playtype: str, ladder: str, seed) -> PlayerRating:
    elo, rd = initial_rating(seed, ladder)
    rating = PlayerRating(
        user_id=user_id,
        game=game,
        playtype=playtype,
        ladder=ladder,
        display_rating=elo,
        rd=rd
    )

    db.add(rating)
    db.flush()
    return rating

def get_player_rating(db: Session, user_id: int, game: str, playtype: str, ladder: str) -> PlayerRating | None:
    return db.scalar(
        select(PlayerRating).where(
            PlayerRating.user_id == user_id,
            PlayerRating.game == game,
            PlayerRating.playtype == playtype,
            PlayerRating.ladder == ladder,
        )
    )

def get_chart_rating(db: Session, chart_id: str, ladder: str) -> ChartRating | None:
    return db.scalar(
        select(ChartRating).where(
            ChartRating.chart_id == chart_id,
            ChartRating.ladder == ladder,
        )
    )

def preset_seed_elo(db: Session, ladder: str, level: int) -> float:
    sg_column = getattr(Chart, f"sg_{ladder}")

    median = db.scalar(
        select(func.percentile_cont(0.5).within_group(ChartRating.rating))
        .join(Chart, Chart.chart_id == ChartRating.chart_id)
        .where(ChartRating.ladder == ladder,
               sg_column.between(level - 0.5, level + 0.5))
    )
    return median if median is not None else sieg_to_elo(level)