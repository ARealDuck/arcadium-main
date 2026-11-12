from app.models import PlayerRating
from app.services.match import get_standing
from sqlalchemy.orm import Session


def build_rating_out(db: Session, rating: PlayerRating, user_id: int) -> dict:
    rank, total, wins, losses = get_standing(db, rating, user_id)
    
    return {
        "game": rating.game,
        "playtype": rating.playtype,
        "ladder": rating.ladder,
        "display_rating": rating.display_rating,
        "placed": rating.placed,
        "games_played": rating.games_played,
        "selected_tables": rating.selected_tables,
        "rank": rank,
        "total": total,
        "wins": wins,
        "losses": losses
    }