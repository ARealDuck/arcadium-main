from app.core.enums import LAMP_ORDER, ClearTypes
from app.models import Match

LAMP_RANK = {lamp: i for i, lamp in enumerate(LAMP_ORDER)}

LADDER_REQUIREMENT = {
    "ec": ClearTypes.EASY_CLEAR,
    "hc": ClearTypes.HARD_CLEAR
}

def meets_match_clear_requirements(lamp: str, ladder: str) -> bool:
    return LAMP_RANK.get(lamp, -1) >= LAMP_RANK[LADDER_REQUIREMENT[ladder]]

def clears_for_match(scores: list[dict], match: Match):
    return [s for s in scores if meets_match_clear_requirements(s["scoreData"]["lamp"], match.ladder)]

def choose_best_score(scores: list[dict]):
    return max(scores, key=lambda s: LAMP_RANK[s["scoreData"]["lamp"]]) if scores else None

def lamp_counts_as_win(lamp: ClearTypes, ladder: str) -> bool:
    return LAMP_RANK[lamp] >= LAMP_RANK[LADDER_REQUIREMENT[ladder]]