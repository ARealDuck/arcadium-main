from app.core.enums import MatchResult, MatchStatus, MatchType
from app.logic.glicko import streak_rd
from app.models import Match, PlayerRating
from sqlalchemy import select
from sqlalchemy.orm import Session


def effective_rd(db: Session, rating: PlayerRating, user_id: int, ladder: str, game: str, playtype: str) -> float:
    recent = last_n_resolved_matches(db, user_id, ladder, game, playtype, 10)
    surprise = sum((1.0 if m.result == MatchResult.WIN else 0.0) - match_expected(m) for m in recent)
    return streak_rd(rating.rd, surprise)

def last_n_resolved_matches(db: Session, user_id: int, ladder: str, game: str, playtype: str, n: int):
    return db.scalars(
        select(Match)
        .where(
            Match.user_id == user_id,
            Match.ladder == ladder,
            Match.type == MatchType.COMPETITIVE,
            Match.status == MatchStatus.RESOLVED,
            Match.game == game,
            Match.playtype == playtype
        )
        .order_by(Match.end_time.desc().nulls_last(), Match.id.desc())
        .limit(n)
    )

def match_expected(match: Match) -> float:
    if match.player_display_before is None or match.chart_rating_before is None:
        return 0.5
    
    return 1 / (1 + 10 ** ((match.chart_rating_before - match.player_display_before) / 400))