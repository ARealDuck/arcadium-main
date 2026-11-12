from datetime import UTC, datetime

import httpx
from app.models import MatchScore

TACHI_BASE = "https://boku.tachi.ac/api/v1"

class TachiError(Exception):
    def __init__(self, status_code: int, description: str):
        super().__init__(description)
        self.status_code = status_code

def tachi_get(path: str, api_key: str, params: dict | None = None):
    response = httpx.get(
        f"{TACHI_BASE}{path}",
        headers={"Authorization": f"Bearer {api_key}"},
        params=params,
        timeout=10
    )
    data = response.json()

    if not data.get("success"):
        raise TachiError(response.status_code, data.get("description", "Unknown error"))

    return data["body"]

def score_from_tachi(score: dict) -> MatchScore:
    data = score["scoreData"]

    return MatchScore(
        lamp=data["lamp"],
        grade=data["grade"],
        percent=data.get("percent"),
        bp=(data.get("optional") or {}).get("bp")
    )

def get_recent_scores(api_key: str, playtype: str) -> list[dict]:
    data = tachi_get(f"/users/me/games/bms-{playtype}/scores/recent", api_key)
    return data["scores"]

def score_time(score: dict) -> datetime:
    ms = score.get("timeAchieved") or score["timeAdded"]
    return datetime.fromtimestamp(ms / 1000, tz=UTC)