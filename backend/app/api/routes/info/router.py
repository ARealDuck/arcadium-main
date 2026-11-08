from fastapi import APIRouter

from app.logic.ratings import TIERS, ELO_BASE, ELO_FLOOR, ELO_PER_LEVEL
from app.schemas.info import TierInfoOut, TierOut, SiegCalculations

router = APIRouter(prefix="/info", tags=["info"])

@router.get("/tiers", response_model=TierInfoOut)
def get_rating_tiers():
    tiers = []

    for tier in TIERS:
        tiers.append(TierOut(name=tier[0], floor=tier[1]))

    sieg_calc = SiegCalculations(elo_base=ELO_BASE, elo_floor=ELO_FLOOR, elo_per_level=ELO_PER_LEVEL)

    return TierInfoOut(sieg_calc=sieg_calc, tiers=tiers)