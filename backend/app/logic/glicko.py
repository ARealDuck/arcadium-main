import math
from dataclasses import dataclass


@dataclass
class GlickoRating:
    rating: float
    rd: float
    volatility: float

DEFAULT_VOLATILITY = 0.06

SCALE = 173.7178   # 400 / ln(10)
CENTER = 1500      # only differences matter
TAU = 0.5          # volatility change speed (0.3–1.2)
EPSILON = 1e-6

SURPRISE_THRESHOLD = 3.0
RD_PER_SURPRISE = 15
RD_STREAK_CAP = 150
RD_STREAK_BASE = 60

# Uncertainty factor (0 -> 1)
def _g(phi):
    return 1 / math.sqrt(1 + 3 * phi**2 / math.pi**2)

def update(player: GlickoRating, opponent: GlickoRating, score: float):
    mu = (player.rating - CENTER) / SCALE
    phi = player.rd / SCALE
    mu_j = (opponent.rating - CENTER) / SCALE
    phi_j = opponent.rd / SCALE

    g = _g(phi_j)
    e = expected(mu, mu_j, phi_j)
    v = 1 / (g**2 * e * (1 - e))
    delta = v * g * (score - e)

    sigma = new_volatility(player.volatility, phi, v, delta)
    phi_star = math.sqrt(phi**2 + sigma**2)
    phi_new = 1 / math.sqrt(1 / phi_star**2 + 1 / v)
    mu_new = mu + phi_new**2 * g * (score - e)

    return GlickoRating(mu_new * SCALE + CENTER, phi_new * SCALE, sigma)

# Probability that you'll win (0 -> 1)
def expected(mu, mu_j, phi_j):
    return 1 / (1 + math.exp(-_g(phi_j) * (mu - mu_j)))

def new_volatility(sigma, phi, v, delta):
    a = math.log(sigma**2)

    def f(x):
        ex = math.exp(x)
        return (ex * (delta**2 - phi**2 - v - ex)) / (2 * (phi**2 * v + ex) ** 2) - (x - a) / TAU**2

    A = a

    if delta**2 > phi**2 + v:
        B = math.log(delta**2 - phi**2 - v)
    else:
        k = 1
        while(f(a - k * TAU)) < 0:
            k += 1
        B = a - k * TAU

    fA, fB = f(A), f(B)

    while abs(B - A) > EPSILON:
        C = A + (A - B) * fA / (fB - fA)
        fC = f(C)
        if fC * fB <= 0:
            A, fA = B, fB
        else:
            fA /= 2
        B, fB = C, fC

    return math.exp(A/2)

def stakes(player: GlickoRating, chart: GlickoRating) -> tuple[float, float]:
    gain = update(player, chart, 1).rating - player.rating
    loss = update(player, chart, 0).rating - player.rating

    return gain, loss

def streak_rd(current_rd: float, surprise: float) -> float:
    if abs(surprise) < SURPRISE_THRESHOLD:
        return current_rd

    target = min(RD_STREAK_CAP, RD_STREAK_BASE + RD_PER_SURPRISE * abs(surprise))
    return max(current_rd, target)