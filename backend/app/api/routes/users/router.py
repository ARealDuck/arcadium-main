from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse, Response
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from app.api.dependencies import CurrentUser, DbSession
from app.core.constants import SEED_PRESETS
from app.logic.ratings import elo_to_sieg, initial_rating, sieg_to_elo
from app.services.match import get_standing, get_active_match_by_userid, SEARCH_WINDOW_START
from app.services.user import (
    get_user_by_id, 
    get_num_double_a, 
    get_rank_on_ladder, 
    get_last_played_on_ladder, 
    get_rating_series, 
    get_table_winrates,
    get_latest_matches,
    get_activity,
    get_lamps
    )
from app.services.rating import get_player_rating, preset_seed_elo, seed_player_rating
from app.api.routes.users.responses import build_rating_out
from app.core.errors import SeedPending
from app.logic.ratings import ELO_FLOOR, find_rating_for_filter
from app.models import ChartTableLevel, ChartRating
from app.job.enqueue import enqueue_tachi_seed

from app.schemas.match import MatchOut
from app.schemas.auth import UserRatingOut
from app.schemas.user import SeedOptionOut, SeedOptionsOut, SettingsOut, SetupIn, UserProfileInfoOut, ProfileGenericOut, BMSProfileOut, LadderStatsOut


router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me/ratings", response_model=list[UserRatingOut])
def get_user_ratings(db: DbSession, user: CurrentUser):
    results = []
    
    for rating in user.ratings:

        results.append(build_rating_out(db, rating, user.id))

    return results

@router.get("/me/ratings/{game}/{playtype}/{ladder}", response_model=UserRatingOut)
def get_user_rating_filtered(game: str, playtype: str, ladder: str, db: DbSession, user: CurrentUser):

    if len(user.ratings) == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No rating on this ladder yet!")
    
    for rating in user.ratings:

        if rating.game == game and rating.playtype == playtype and rating.ladder == ladder:
            return build_rating_out(db, rating, user.id)

    raise HTTPException(status.HTTP_404_NOT_FOUND, "No rating on this ladder yet!")

@router.post("/me/ratings/{game}/{playtype}/{ladder}", response_model=UserRatingOut)
def set_up_user_rating(db: DbSession, user: CurrentUser, game: str, playtype: str, ladder: str, response: Response, body: SetupIn | None = None):

    rating = get_player_rating(db, user.id, game, playtype, ladder)
    if rating is not None:
        return build_rating_out(db, rating, user.id)

    if body and body.source == "preset":
        if body.preset is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Pick a starting level.")
        level = SEED_PRESETS[body.preset]
        seed = {"elo": preset_seed_elo(db, ladder, level), "numScores": None, "preset": True}
    else:
        seed_key = f"{game}:{playtype}:{ladder}"
    
        if seed_key not in user.rating_seeds:
            enqueue_tachi_seed(db, user.id)
            db.commit()
            return JSONResponse(status_code=202, content={"message": "Your seed is being set up!"})
        seed = user.rating_seeds[seed_key]

    try:
        rating = seed_player_rating(db, user.id, game, playtype, ladder, seed)
        db.commit()
    except IntegrityError:
        db.rollback()
        rating = get_player_rating(db, user.id, game, playtype, ladder)
    response.status_code = status.HTTP_201_CREATED
    return build_rating_out(db, rating, user.id)

@router.get("/me/ratings/{game}/{playtype}/{ladder}/seed-options", response_model=SeedOptionsOut)
def get_seed_options(db: DbSession, user: CurrentUser, game: str, playtype: str, ladder: str):
    presets = []
    for key, level in SEED_PRESETS.items():
        seed = {"elo": preset_seed_elo(db, ladder, level), "numScores": None, "preset": True}
        elo, _ = initial_rating(seed, ladder)
        presets.append(SeedOptionOut(key=key, level=level, elo=elo))

    tachi = None
    seed = user.rating_seeds.get(f"{game}:{playtype}:{ladder}")
    if seed:
        elo, _ = initial_rating(seed, ladder)
        tachi = SeedOptionOut(key="tachi", level=elo_to_sieg(elo), elo=elo)

    return SeedOptionsOut(presets=presets, tachi=tachi)

@router.get("/me/can-queue")
def can_queue(user: CurrentUser):
    able = False

    if user.tachi_api_key != "" and user.tachi_api_key:
        able = True

    return {
        "can_queue": able
    }

@router.get("/me/active-match", response_model=MatchOut | None)
def get_user_active_match(db: DbSession, user: CurrentUser):
    return get_active_match_by_userid(db, user.id)

@router.get("/me/get_table_search_counts/{game}/{playtype}/{ladder}", response_model=dict[str, int])
def get_table_search_counts(db: DbSession, user: CurrentUser, game: str, playtype: str, ladder: str):
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "You are not logged in!")

    rating = find_rating_for_filter(user.ratings, game, playtype, ladder)

    low = max(ELO_FLOOR, rating["display_rating"] - SEARCH_WINDOW_START)
    high = rating["display_rating"] + SEARCH_WINDOW_START

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

@router.get("/profile/{id}/{game}/{playtype}/{ladder}", response_model=UserProfileInfoOut, status_code=200)
def get_profile_info(db: DbSession, id: int, game: str, playtype: str, ladder: str):
    user = get_user_by_id(db, id)

    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User doesn't exist!")

    player_rating = get_player_rating(db, user.id, game, playtype, ladder)

    num_aa = 0

    if game == "bms":
        num_aa = get_num_double_a(db, user.id, playtype, ladder)

    profile_generic = ProfileGenericOut(display_name=user.display_name, join_date=user.created_at, avatar_url=user.avatar_url)

    if player_rating is None:
        return UserProfileInfoOut(
            generic=profile_generic,
            ratings=user.ratings
        )

    rank, total = get_rank_on_ladder(db, player_rating)
    last_played = get_last_played_on_ladder(db, user.id, game, playtype, ladder);
    rating_series = get_rating_series(db, user.id, game, playtype, ladder)
    table_winrate = get_table_winrates(db, user.id, game, playtype, ladder)
    latest_matches = get_latest_matches(db, user.id, game, playtype, ladder)
    activity = get_activity(db, user.id, game, playtype, ladder)
    lamp_counts = get_lamps(db, user.id, game, playtype, ladder)

    ladder_stats = LadderStatsOut(rating_series=rating_series, matches=latest_matches, activity=activity, lamp_counts=lamp_counts)

    return UserProfileInfoOut(
        generic=profile_generic,
        ratings=user.ratings,
        ladder_stats=ladder_stats,
        rating_rank=rank,
        rating_total=total,
        last_played=last_played,
        bms=BMSProfileOut(num_aa=num_aa, table_winrate=table_winrate)
    )

@router.get("/me/settings", response_model=SettingsOut)
def get_user_profile_settings(db: DbSession, user: CurrentUser):
    key = user.tachi_api_key
    return SettingsOut(bokutachi_key_hint=f"••••••{key[-4:]}" if key else None)