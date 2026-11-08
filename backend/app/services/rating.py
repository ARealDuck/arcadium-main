from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import PlayerRating, ChartRating
from app.logic.ratings import initial_rating
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

def get_chart_rating(db: Session, chart_id: str, ladder: str) -> ChartRating:
    return db.scalar(
        select(ChartRating).where(
            ChartRating.chart_id == chart_id,
            ChartRating.ladder == ladder,
        )
    )