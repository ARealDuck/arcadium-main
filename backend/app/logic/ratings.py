from app.models import PlayerRating

LADDER_SEED_OFFSET = {"ec": 150, "hc": 300}

SEED_RD = {
    "sg": 120,
    "other": 225
}

TIERS = [
    ( "Copper", 100 ),
    ( "Bronze", 500 ),
    ( "Silver", 900 ),
    ( "Gold", 1300 ),
    ( "Platinum", 1900 ),
    ( "Emerald", 2500 ),
    ( "Diamond", 3000 ),
    ( "Master", 3400 ),
    ( "Grandmaster", 3800 )
]

DIVISIONS = 5

ELO_BASE = 100
ELO_PER_LEVEL = 100
ELO_FLOOR = 100

def seed_rd(num_scores: int | None) -> float:
    if not num_scores:
        return 300.0
    if num_scores < 50:
        return 250.0
    if num_scores < 300:
        return 200.0
    if num_scores < 1000:
        return 160.0
    return 130.0

def initial_rating(seed: dict | None, ladder: str) -> tuple[float, float]:
    elo = seed["elo"] if seed else ELO_FLOOR
    offset = 0 if seed and seed.get("preset") else LADDER_SEED_OFFSET.get(ladder, 0)
    elo = max(ELO_FLOOR, elo - offset)
    rd = seed_rd(seed["numScores"] if seed else None)
    return elo, rd

def find_rating_for_filter(ratings: list[PlayerRating], game: str, playtype: str, ladder: str) -> PlayerRating:
    for rating in ratings:

        if rating.game == game and rating.playtype == playtype and rating.ladder == ladder:

            return {
                "game": rating.game,
                "playtype": rating.playtype,
                "ladder": rating.ladder,
                "display_rating": rating.display_rating,
                "placed": rating.placed,
                "games_played": rating.games_played,
                "selected_tables": rating.selected_tables
            }

    return None

def calculate_division(elo, index):
    if index == len(TIERS) - 1:
        return None

    division_width = (TIERS[index+1][1] - TIERS[index][1]) / DIVISIONS

    steps = int((elo - TIERS[index][1]) // division_width)
    steps = max(0, min(steps, DIVISIONS - 1))

    return DIVISIONS - steps



def rank_for(elo):
    index = 0
    for i in reversed(range(len(TIERS))):
        if elo >= TIERS[i][1]:
            index = i
            break

    return { 
        "tier": TIERS[index], 
        "division": calculate_division(elo, index)
        }

def sieg_to_elo(sieg):
    return max(ELO_FLOOR, ELO_BASE + ELO_PER_LEVEL * sieg)

def elo_to_sieg(elo: float) -> int:
    level = 0
    for n in range(1, 13 + 25):
        if sieg_to_elo(n) <= elo:
            level = n
    return level