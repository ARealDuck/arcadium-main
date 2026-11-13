from collections.abc import Sequence
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.enums import MatchStatus, MatchType
from app.models import ChartTableLevel, Match, MatchScore, PlayerRating, User
from app.schemas.user import RatingPointOut, TableWinrateOut


def get_user_by_id(db: Session, id: int):
    return db.get(User, id)

def get_num_double_a(db: Session, user_id: int, playtype: str, ladder: str):
    AA_OR_BETTER = ("AA", "AAA", "MAX")

    return db.scalar(
        select(func.count())
        .select_from(MatchScore)
        .join(Match, MatchScore.match_id == Match.id)
        .where(
            Match.user_id == user_id,
            Match.game == "bms",
            Match.playtype == playtype,
            Match.ladder == ladder,
            Match.type == MatchType.COMPETITIVE,
            Match.status != MatchStatus.VOIDED,
            MatchScore.grade.in_(AA_OR_BETTER)
        )
    ) or 0

def get_rank_on_ladder(db: Session, rating: PlayerRating):
    same_ladder = (
        PlayerRating.game == rating.game,
        PlayerRating.ladder == rating.ladder,
        PlayerRating.playtype == rating.playtype
    )

    higher = db.scalar(
        select(func.count()).where(*same_ladder, PlayerRating.display_rating > rating.display_rating)
    ) or 0

    total = db.scalar(select(func.count()).where(*same_ladder))

    return higher + 1, total

def get_last_played_on_ladder(db: Session, user_id: int, game: str, playtype: str, ladder: str) -> datetime | None:
    latest_match = db.scalars(
        select(Match)
        .where(
            Match.user_id == user_id,
            Match.game == game,
            Match.playtype == playtype,
            Match.ladder == ladder,
            Match.type == MatchType.COMPETITIVE,
            Match.status != MatchStatus.VOIDED
        )
        .order_by(Match.start_time.desc())
    ).first()

    return latest_match.start_time if latest_match else None

def get_rating_series(db: Session, user_id: int, game: str, playtype: str, ladder: str, days: int = 365) -> list[RatingPointOut]:
    day = func.date(Match.end_time).label("day")
    since = datetime.now(UTC) - timedelta(days=days)

    rows = db.execute(
        select(day, Match.player_display_after.label("rating"))
        .where(
            Match.user_id == user_id,
            Match.game == game,
            Match.playtype == playtype,
            Match.ladder == ladder,
            Match.type == MatchType.COMPETITIVE,
            Match.player_display_after.is_not(None),
            Match.end_time >= since,
            Match.status != MatchStatus.VOIDED
        )
        .distinct(day)
        .order_by(day, Match.end_time.desc())
    ).all()

    return [RatingPointOut(date=r.day, rating=r.rating) for r in rows]

def get_table_winrates(db: Session, user_id: int, game: str, playtype: str, ladder: str, limit: int = 5) -> list[TableWinrateOut]:
    games = func.count().label("games")
    wins = func.count().filter(Match.result == "win").label("wins")

    rows = db.execute(
        select(ChartTableLevel.table_icon, games, wins)
        .join(Match, Match.chart_id == ChartTableLevel.chart_id)
        .where(
            Match.user_id == user_id,
            Match.game == game,
            Match.playtype == playtype,
            Match.ladder == ladder,
            Match.type == MatchType.COMPETITIVE,
            Match.result.is_not(None),
            Match.status != MatchStatus.VOIDED
        )
        .group_by(ChartTableLevel.table_icon)
        .order_by(games.desc())
        .limit(limit)
    ).all()

    return [TableWinrateOut(table_icon=r.table_icon, games=r.games, wins=r.wins) for r in rows]

def get_latest_matches(db: Session, user_id: int, game: str, playtype: str, ladder: str, limit: int = 20) -> Sequence[Match]:
    latest_matches = db.scalars(
        select(Match)
        .where(
            Match.user_id == user_id,
            Match.game == game,
            Match.playtype == playtype,
            Match.ladder == ladder,
            Match.type == MatchType.COMPETITIVE,
            Match.status != MatchStatus.CANCELLED,
            Match.status != MatchStatus.VOIDED
        )
        .order_by(Match.end_time.desc())
        .limit(limit)
    ).all()

    return latest_matches

def get_activity(db: Session, user_id: int, game: str, playtype: str, ladder: str, days: int = 365) -> dict[str, int]:
    day = func.date(Match.start_time).label("day")
    since = datetime.now(UTC) - timedelta(days=days)

    rows = db.execute(
        select(day, func.count())
        .where(
            Match.user_id == user_id,
            Match.game == game,
            Match.playtype == playtype,
            Match.ladder == ladder,
            Match.status != MatchStatus.CANCELLED,
            Match.type == MatchType.COMPETITIVE,
            Match.start_time >= since,
            Match.status != MatchStatus.VOIDED
        )
        .group_by(day)
        .order_by(day)
    ).all()

    return {d.isoformat(): n for d, n in rows}

def get_lamps(db: Session, user_id: int, game: str, playtype: str, ladder: str) -> dict[str, int]:
    rows = db.execute(
        select(MatchScore.lamp, func.count())
        .join(Match, MatchScore.match_id == Match.id)
        .where(
            Match.user_id == user_id,
            Match.game == game,
            Match.playtype == playtype,
            Match.ladder == ladder,
            Match.type == MatchType.COMPETITIVE,
            Match.status != MatchStatus.CANCELLED,
            MatchScore.lamp != "FAILED",
            Match.status != MatchStatus.VOIDED
        )
        .group_by(MatchScore.lamp)
    ).all()

    return {lamp: n for lamp, n in rows}

def find_user_by_identifier(db: Session, identifier: str) -> User | None:
    ident = identifier.strip()

    if "@" in ident:
        return db.scalar(select(User).where(func.lower(User.email) == ident.lower()))

    return db.scalar(select(User).where(func.lower(User.username) == ident.lower()))