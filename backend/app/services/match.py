from collections.abc import Sequence
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy import update as sqlUpdate
from sqlalchemy.orm import Session

from app.core.enums import ClearTypes, MatchResult, MatchStatus, MatchType
from app.core.errors import (
    ChartNotFoundForRating,
    GenericRatingNotFound,
    MatchNotFound,
    MatchNotRollbackable,
    PlayerNotFound,
    SeedPending,
)
from app.job.enqueue import enqueue_match_final_check, enqueue_tachi_seed
from app.logic.glicko import GlickoRating, stakes, update
from app.logic.match import choose_best_score
from app.logic.ratings import ELO_FLOOR
from app.models import Chart, ChartRating, ChartTableLevel, Match, PlayerRating, User
from app.services.rating import get_chart_rating, get_player_rating, seed_player_rating
from app.services.streaks import effective_rd
from app.services.tachi import get_recent_scores, score_from_tachi, score_time

MAX_SEARCH_WINDOW = 300
SEARCH_WINDOW_INCREMENT = 50
SEARCH_WINDOW_START = 50

MATCH_DURATION = timedelta(minutes=10)
STALE_AFTER = timedelta(minutes=5)

def create_match(
        db: Session, 
        user: User, 
        game: str, 
        playtype: str, 
        ladder: str, 
        match_type: MatchType, 
        elo: float | None,
        tables: list[str],
        avoided_chart_ids: Sequence[str] = ()
    ) -> Match:
    seed_key = f"{game}:{playtype}:{ladder}"    # When a player is seeded, it's keyed in this format

    rating = get_player_rating(db, user.id, game, playtype, ladder)

    # If a player has no actual rating, seed them based on their tachi seeds. If they have no tachi seeds, make some
    if rating is None:
        if seed_key not in user.rating_seeds:
            enqueue_tachi_seed(db, user.id)
            raise SeedPending()
        rating = seed_player_rating(db, user.id, game, playtype, ladder, user.rating_seeds[seed_key])

    rating.selected_tables = tables

    search_rating = rating.display_rating

    if match_type == MatchType.CASUAL and elo is not None:
        search_rating = elo

    chart_row = search_for_chart(db, search_rating, ladder, tables, avoided_chart_ids)

    if chart_row is None:
        raise ChartNotFoundForRating()

    random_chart, chart_rating = chart_row

    now = datetime.now(UTC)

    match = Match(
        user_id=user.id, 
        chart_id=random_chart.chart_id, 
        ladder=ladder, 
        game=game, 
        type=match_type,
        search_elo=search_rating,
        playtype=playtype,
        player_mmr_before=rating.display_rating,
        player_display_before=rating.display_rating,
        player_rd_before=rating.rd,
        chart_rating_before=chart_rating.rating,
        chart_rd_before=chart_rating.rd,
        start_time=now,
        cutoff_time=now + MATCH_DURATION,
        player_placed_before=rating.placed
        )

    db.add(match)
    db.flush()

    enqueue_match_final_check(db, user.id, match.id, match.cutoff_time)

    return match

def search_for_chart(db: Session, search_rating: float, ladder: str, tables: list[str], avoided_chart_ids: Sequence[str] = ()) -> tuple[Chart, ChartRating] | None:
    curr_window = SEARCH_WINDOW_START

    while curr_window <= MAX_SEARCH_WINDOW:
        in_selected_tables = (
            select(ChartTableLevel.chart_id)
            .where(ChartTableLevel.table_icon.in_(tables))
)

        random_chart = db.execute(
            select(Chart, ChartRating)
            .join(ChartRating)
            .where(
                ChartRating.ladder == ladder,
                ChartRating.rating >= max(ELO_FLOOR, search_rating - curr_window),
                ChartRating.rating <= search_rating + curr_window,
                Chart.chart_id.not_in(avoided_chart_ids),
                Chart.chart_id.in_(in_selected_tables)
            ).order_by(func.random())
            .limit(1)
        ).tuples().first()

        if random_chart is None:
            curr_window += SEARCH_WINDOW_INCREMENT
        else:
            return random_chart

    return None

# This gets run for EVERYTHING that concludes matches. Such as forfeit, winning, losing, time ending, etc. Anytime we want to end a match legitimately, it should go through here.
def resolve_match(db: Session, match_id: int, won: bool, evidence: dict | None) -> dict:
    match: Match = db.scalar(select(Match).where(Match.id == match_id).with_for_update())

    if match is None:
        raise MatchNotFound(match_id)
    if match.status != MatchStatus.ACTIVE:
        return None

    if evidence is not None:
        match.score = score_from_tachi(evidence)

    if match.type == MatchType.COMPETITIVE:
        apply_rating_update(db, match, won)

    match.status = MatchStatus.RESOLVED
    match.result = MatchResult.WIN if won else MatchResult.LOSS
    match.end_time = match.forfeited_at or datetime.now(UTC)

    db.commit()

    return {"match_id": match.id, "result": match.result}

def apply_rating_update(db: Session, match: Match, won: bool):
    player = get_player_rating(db, match.user_id, match.game, match.playtype, match.ladder)
    chart = get_chart_rating(db, match.chart_id, match.ladder)

    s = float(won)

    rd = effective_rd(db, player, match.user_id, match.ladder, match.game, match.playtype)

    player_old = GlickoRating(player.display_rating, rd, player.volatility)
    chart_old = GlickoRating(chart.rating, chart.rd, chart.volatility)

    player_new = update(player_old, chart_old, s)
    chart_new = update(chart_old, player_old, 1 - s)

    rating_change = player_new.rating - player.display_rating

    if match.score is not None and match.ladder == "ec" and match.score.lamp == ClearTypes.ASSIST_CLEAR:
        rating_change = rating_change / 2

    player.display_rating = player.display_rating + rating_change
    player.rating = player.rating + rating_change
    player.rd = player_new.rd
    player.volatility = player_new.volatility
    player.games_played += 1

    if won:
        player.wins += 1

    if player.peak_rating == 0 or player.display_rating > player.peak_rating:
        player.peak_rating = player.display_rating

    chart.rating = chart_new.rating
    chart.rd = chart_new.rd
    chart.volatility = chart_new.volatility
    chart.games_played += 1

    if player.games_played >= 5:
        player.placed = True

    match.player_display_after = player.display_rating
    match.player_rd_after = player.rd
    match.chart_rating_after = chart.rating
    match.chart_rd_after = chart.rd

def get_active_match_by_userid(db: Session, user_id: int):
    active_match = db.scalar(
        select(Match)
        .where(
            Match.user_id == user_id,
            Match.status == MatchStatus.ACTIVE
        )
        .with_for_update()
    )

    return active_match

def get_standing(db, r, user_id):
    total = db.scalar(
        select(func.count())
        .select_from(PlayerRating)
        .where(
            PlayerRating.game == r.game,
            PlayerRating.playtype == r.playtype,
            PlayerRating.ladder == r.ladder
        )
    )

    rank = db.scalar(
        select(func.count())
        .select_from(PlayerRating)
        .where(
            PlayerRating.game == r.game,
            PlayerRating.playtype == r.playtype,
            PlayerRating.ladder == r.ladder,
            PlayerRating.display_rating > r.display_rating
        )
    ) + 1

    wins = db.scalar(
        select(func.count())
        .select_from(Match)
        .where(
            Match.user_id == user_id,
            Match.result == MatchResult.WIN,
            Match.type == MatchType.COMPETITIVE,
            Match.game == r.game,
            Match.playtype == r.playtype,
            Match.ladder == r.ladder
        )
    )

    losses = db.scalar(
        select(func.count())
        .select_from(Match)
        .where(
            Match.user_id == user_id,
            Match.result == MatchResult.LOSS,
            Match.type == MatchType.COMPETITIVE,
            Match.game == r.game,
            Match.playtype == r.playtype,
            Match.ladder == r.ladder
        )
    )

    return rank, total, wins, losses

def calculate_stakes(db: Session, user: User, match: Match) -> tuple[float, float]:
    rating = next(
        (r for r in user.ratings
        if r.ladder == match.ladder and r.game == match.game and r.playtype == match.playtype),
        None,
    )

    chart_rating : ChartRating = next(
        (r for r in match.chart.ratings
        if r.ladder == match.ladder),
        None,
    )

    rd = effective_rd(db, rating, user.id, match.ladder, match.game, match.playtype)

    return stakes(
        GlickoRating(rating.display_rating, rd, rating.volatility),
        GlickoRating(chart_rating.rating, chart_rating.rd, chart_rating.volatility)
    )

def scores_for_match(scores: list[dict], match: Match) -> list[dict]:
    end = match.forfeited_at or match.cutoff_time

    return [
        s for s in scores
        if s["chartID"] == match.chart_id and match.start_time <= score_time(s) <= end
    ]

def get_best_score_for_match(user: User, match: Match):

    scores = get_recent_scores(user.tachi_api_key, match.playtype)
    candidates = scores_for_match(scores, match)

    return choose_best_score(candidates)

def cancel_stale_matches(db) -> int:
    cutoff = datetime.now(UTC) - STALE_AFTER
    result = db.execute(
        sqlUpdate(Match)
        .where(Match.status == MatchStatus.ACTIVE, Match.cutoff_time < cutoff)
        .values(status=MatchStatus.CANCELLED, end_time=func.now())
    )

    return result.rowcount

def rollback_match(db: Session, match_id: int):
    match = db.scalar(
        select(Match)
        .where(
            Match.id == match_id,
            Match.type == MatchType.COMPETITIVE,
            Match.status.in_([MatchStatus.RESOLVED, MatchStatus.EXPIRED])
        )
    )

    if match is None:
        raise MatchNotFound(match_id)

    user = db.get(User, match.user_id)

    if user is None:
        raise PlayerNotFound(match.user_id)

    if match.player_display_after is None or match.chart_rating_after is None:
        raise MatchNotRollbackable(match_id)

    adjustment = match.player_display_after - match.player_display_before
    chart_adjustment = match.chart_rating_after - match.chart_rating_before
    player_rd_adjustment = 0
    chart_rd_adjustment = 0

    if match.player_rd_after is not None:
        player_rd_adjustment = match.player_rd_after - match.player_rd_before

    if match.chart_rd_after is not None:
        chart_rd_adjustment = match.chart_rd_after - match.chart_rd_before

    user_rating = get_player_rating(db, user.id, match.game, match.playtype, match.ladder)
    chart_rating = get_chart_rating(db, match.chart_id, match.ladder)

    if user_rating is None or chart_rating is None:
        raise GenericRatingNotFound()

    if match.player_placed_before == False:
        user_rating.placed = False

    player_new_rating = user_rating.display_rating - adjustment
    player_new_rd = user_rating.rd - player_rd_adjustment
    chart_new_rating = chart_rating.rating - chart_adjustment
    chart_new_rd = chart_rating.rd - chart_rd_adjustment

    user_rating.display_rating = player_new_rating
    user_rating.rating = player_new_rating
    user_rating.games_played -= 1
    user_rating.rd = player_new_rd

    chart_rating.rating = chart_new_rating
    chart_rating.rd = chart_new_rd

    if match.result == MatchResult.WIN:
        user_rating.wins -= 1

    match.status = MatchStatus.VOIDED