from pydantic import BaseModel


class TierOut(BaseModel):
    name: str
    floor: float

class SiegCalculations(BaseModel):
    elo_floor: float
    elo_base: float
    elo_per_level: float

class TierInfoOut(BaseModel):
    tiers: list[TierOut]
    sieg_calc: SiegCalculations