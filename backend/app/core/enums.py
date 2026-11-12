from enum import StrEnum


class MatchResult(StrEnum):
    WIN = "win"
    LOSS = "loss"

class MatchStatus(StrEnum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    VOIDED = "voided"

class TokenPurpose(StrEnum):
    VERIFY = "verify"
    RESET = "reset"

class CancelReason(StrEnum):
    NO_CHART = "No Chart"

class MatchType(StrEnum):
    CASUAL = "casual"
    COMPETITIVE = "competitive"

class ClearTypes(StrEnum):
    NO_PLAY = "NO PLAY"
    FAILED = "FAILED"
    ASSIST_CLEAR = "ASSIST CLEAR"
    EASY_CLEAR = "EASY CLEAR"
    CLEAR = "CLEAR"
    HARD_CLEAR = "HARD CLEAR"
    EX_HARD_CLEAR = "EX HARD CLEAR"
    FULL_COMBO = "FULL COMBO"

LAMP_ORDER = [
    ClearTypes.NO_PLAY,
    ClearTypes.FAILED,
    ClearTypes.ASSIST_CLEAR,
    ClearTypes.EASY_CLEAR,
    ClearTypes.CLEAR,
    ClearTypes.HARD_CLEAR,
    ClearTypes.EX_HARD_CLEAR,
    ClearTypes.FULL_COMBO
]