from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from sqlalchemy import select

from app.api.dependencies import AdminUser, CurrentUser, DbSession
from app.core.enums import CancelReason, MatchStatus, MatchType
from app.core.errors import InvalidTables, MatchNotFound, RollbackError, SeedPending
from app.job.enqueue import (
    enqueue_match_cleanup,
    enqueue_match_forfeit,
    enqueue_match_pre_submission,
)
from app.logic.ratings import find_rating_for_filter
from app.models import Match, User, UserAvoidedChart
from app.models.users import PlayerRating
from app.schemas.match import MatchOut, MatchWithStakesOut, PlacementOut, StartMatchIn
from app.services.match import (
    calculate_stakes,
    create_match,
    get_active_match_by_userid,
    rollback_match,
)
from app.services.rating import get_player_rating
from app.services.tables import valid_table_icons

router = APIRouter(prefix="/match", tags=["match"])

@router.get("/{match_id}", response_model=MatchWithStakesOut, status_code=status.HTTP_200_OK)
def get_match_by_id(db: DbSession, match_id: int):
    match = db.get(Match, match_id)

    if match is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Match not found")
    
    user = db.get(User, match.user_id)

    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    pt_gain, pt_loss = calculate_stakes(db, user, match)

    user_rating: PlayerRating | None = get_player_rating(db, user.id, match.game, match.playtype, match.ladder)

    if user_rating is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Player does not appear to have any ratings on this match's ladder.")

    placement = PlacementOut(played=user_rating.games_played, required=5) if user_rating.games_played <= 5 else None

    base = MatchOut.model_validate(match)

    return MatchWithStakesOut(**base.model_dump(exclude={"placement"}), potential_gain=pt_gain, potential_loss=pt_loss, placement=placement)

@router.post("/create", response_model=MatchWithStakesOut, status_code=status.HTTP_201_CREATED)
def start_match(db: DbSession, user: CurrentUser, game: str, playtype: str, ladder: str, body: StartMatchIn, elo: Annotated[float | None, Query(ge=100, le=4200)] = None, type: MatchType = MatchType.COMPETITIVE):
    if not user.tachi_api_key or user.tachi_api_key == "":
        raise HTTPException(status.HTTP_409_CONFLICT, "No Tachi key found. Please set up your Tachi API key!")

    invalid = set(body.tables) - valid_table_icons()

    if invalid:
        raise InvalidTables()

    active_match = get_active_match_by_userid(db, user.id)

    if active_match is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "You already have an active match!")

    try:
        new_match = create_match(db, user, game, playtype, ladder, type, elo, body.tables)
    except SeedPending:
        db.commit()
        raise HTTPException(status.HTTP_409_CONFLICT, "Your rating is still being set up!")

    pt_gain, pt_loss = calculate_stakes(db, user, new_match)

    base = MatchOut.model_validate(new_match)

    db.commit()

    return MatchWithStakesOut(**base.model_dump(), potential_gain=pt_gain, potential_loss=pt_loss)

@router.post("/submit")
def submit_active_match(db: DbSession, user: CurrentUser):
    active_match = get_active_match_by_userid(db, user.id)

    if active_match is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No active match!")

    job = enqueue_match_pre_submission(db, user.id, active_match.id)

    db.commit()

    return {"message": "Submitted", "job_id": job.id}

@router.post("/skip", response_model=MatchWithStakesOut, status_code=status.HTTP_201_CREATED)
def skip_active_match(db: DbSession, user: CurrentUser):
    active_match = get_active_match_by_userid(db, user.id)

    if active_match is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No active match!")

    skip_limit_time = active_match.start_time + timedelta(minutes=0.5)

    if datetime.now(UTC) > skip_limit_time:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not within the allotted time to skip match!")

    active_match.status = MatchStatus.CANCELLED
    active_match.cancel_reason = CancelReason.NO_CHART
    active_match.end_time = datetime.now(UTC)

    user.avoided_charts.append(UserAvoidedChart(chart_id=active_match.chart_id))

    db.flush()

    rating = find_rating_for_filter(user.ratings, active_match.game, active_match.playtype, active_match.ladder)

    if rating is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "The user in this match has no available ratings.")

    new_match = create_match(db, user, active_match.game, active_match.playtype, active_match.ladder, active_match.type, active_match.search_elo, rating.selected_tables, [a.chart_id for a in user.avoided_charts])

    pt_gain, pt_loss = calculate_stakes(db, user, new_match)

    db.commit()

    base = MatchOut.model_validate(new_match)

    return MatchWithStakesOut(**base.model_dump(), potential_gain=pt_gain, potential_loss=pt_loss)

@router.post("/forfeit", status_code=status.HTTP_200_OK)
def forfeit_active_match(db: DbSession, user: CurrentUser):
    active_match = get_active_match_by_userid(db, user.id)

    if active_match is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No active match!")

    if active_match.forfeited_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Match is already being forfeited!")

    active_match.forfeited_at = datetime.now(UTC)

    enqueue_match_forfeit(db, user.id, active_match.id)

    db.commit()

    return {"message": "Submitted Forfeit!"}

@router.put("/cleanup", status_code=status.HTTP_200_OK)
def cleanup_active_matches(db: DbSession, user: CurrentUser):
    enqueue_match_cleanup(db, user.id)

    db.commit()

    return {"message": "Submitted cleanup"}

@router.put("/rollback/{match_id}")
def rollback_match_route(db: DbSession, admin: AdminUser, match_id: int):
    try:
        rollback_match(db, match_id)
    except MatchNotFound:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Match not found or not rollbackable.")
    except RollbackError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Rollback failed: {type(e).__name__}")

    db.commit()
    return {"rolled_back": match_id}

@router.put("/rollback-batch")
def rollback_batch(db: DbSession, admin: AdminUser, start: datetime, end: datetime):
    match_ids = db.scalars(
        select(Match.id)
        .where(
            Match.type == MatchType.COMPETITIVE,
            Match.status.in_([MatchStatus.RESOLVED, MatchStatus.EXPIRED]),
            Match.end_time.between(start, end)
        ).order_by(Match.end_time.desc())
    ).all()

    rolled_back, skipped = [], []

    for match_id in match_ids:
        try:
            rollback_match(db, match_id)
            rolled_back.append(match_id)
        except RollbackError:
            skipped.append(match_id)

    db.commit()
    return {"rolled_back": rolled_back, "skipped": skipped}


@router.get("/{user_id}/table", response_class=HTMLResponse)
def serve_user_table_index(db: DbSession, user_id: int):
    return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8-sig">
    <meta name="bmstable" content="table/header.json">
    <title> Arcadium Match Table</title>
</head>
<body>
    <p>Add this URL to your BMS Client's difficulty tables.</p>
</body>
</html>
"""

@router.get("/{user_id}/table/header.json")
def serve_header_table_data(db: DbSession, user_id: int):
    user = db.get(User, user_id)

    if (user is None):
        raise HTTPException(status.HTTP_404_CONFLICT, "User not found!")
    
    return {
        "name": f"Arcadium Ladder: {user.username}",
        "symbol": "※",
        "data_url": "data.json"
        }

@router.get("/{user_id}/table/data.json")
def serve_data_table_data(db: DbSession, user_id: int):

    chart_data = [{
        "md5": "0" * 32,
        "sha256": "0" * 64,
        "level": "User Has No Active Match!",
        "title": "No active match - Start one on Arcadium!",
        "artist": ""
    }]

    active_match = get_active_match_by_userid(db, user_id)

    if active_match is None:
        return chart_data

    ladder = "Easy Clear Ladder" if active_match.ladder == "ec" else "Hard Clear Ladder"

    chart_data = [{
        "md5": active_match.chart.md5,
        "sha256": active_match.chart.sha256,
        "level": f"{ladder}",
        "title": active_match.chart.title,
        "artist": active_match.chart.artist
    }]

    return chart_data