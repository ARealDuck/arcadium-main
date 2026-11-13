"""Loading the various data tables into the postgres database

Run from backend/ (or inside the container):
    python -m scripts.seed

Safe to re-run: existing rows are updated instead of duplicated
"""

import csv
from pathlib import Path

from app.core.db import SessionLocal, engine
from app.logic.glicko import DEFAULT_VOLATILITY
from app.logic.ratings import SEED_RD
from app.models import Base, Chart, ChartRating, ChartTableLevel
from sqlalchemy.dialects.postgresql import insert

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
BATCH_SIZE = 1000

def empty_to_none(value):
    return value if value not in (None, "") else None

def to_float(value):
    value = empty_to_none(value)
    return float(value) if value is not None else None

def to_int(value):
    value = empty_to_none(value)
    return int(value) if value is not None else None

def read_csv(name):
    with open(DATA_DIR / name, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))

def batches(rows, size):
    for i in range(0, len(rows), size):
        yield rows[i:i + size]

def upsert(session, model, rows, key_columns):
    update_columns = [c.name for c in model.__table__.columns if c.name not in key_columns]
    for batch in batches(rows, BATCH_SIZE):
        stmt = insert(model).values(batch)
        stmt = stmt.on_conflict_do_update(
            index_elements=key_columns,
            set_={name: stmt.excluded[name] for name in update_columns},
        )
        session.execute(stmt)

def insert_missing(session, model, rows, key_columns):
    for batch in batches(rows, BATCH_SIZE):
        stmt = insert(model).values(batch).on_conflict_do_nothing(index_elements=key_columns)
        session.execute(stmt)

def seed():
    Base.metadata.create_all(engine)

    charts = [
        {
            "chart_id": row["chart_id"],
            "song_id": empty_to_none(row["song_id"]),
            "md5": empty_to_none(row["md5"]),
            "sha256": empty_to_none(row["sha256"]),
            "artist": empty_to_none(row["artist"]),
            "title": empty_to_none(row["title"]),
            "subtitle": empty_to_none(row["subtitle"]),
            "sg_ec": to_float(row["sg_ec"]),
            "sg_hc": to_float(row["sg_hc"]),
            "game": "bms",
            "playtype": "7k"
        }
        for row in read_csv("chart_sieglinde_organized.csv")
    ]
    known_ids = {c["chart_id"] for c in charts}

    levels = []
    skipped = 0
    for row in read_csv("chart_table_connection.csv"):
        if row["chart_id"] not in known_ids:
            skipped += 1
            continue
        levels.append({
            "chart_id": row["chart_id"],
            "table_icon": row["table_icon"],
            "table_level": row["table_level"]
        })

    elo_ec = []

    for row in read_csv("elo_chart_ec.csv"):
        rating = to_float(row["elo"])
        if row["chart_id"] not in known_ids or rating is None:
            continue
        elo_ec.append({
            "chart_id": row["chart_id"],
            "ladder": "ec",
            "rating": rating,
            "rd": SEED_RD["sg"],
            "volatility": DEFAULT_VOLATILITY,
            "games_played": 0
        })

    elo_hc = []

    for row in read_csv("elo_chart_hc.csv"):
        rating = to_float(row["elo"])
        if row["chart_id"] not in known_ids or rating is None:
            continue
        elo_hc.append({
            "chart_id": row["chart_id"],
            "ladder": "hc",
            "rating": rating,
            "rd": SEED_RD["sg"],
            "volatility": DEFAULT_VOLATILITY,
            "games_played": 0
        })

    with SessionLocal() as session:
        upsert(session, Chart, charts, ["chart_id"])
        upsert(session, ChartTableLevel, levels, ["chart_id", "table_icon"])
        insert_missing(session, ChartRating, elo_ec, ["chart_id", "ladder"])
        insert_missing(session, ChartRating, elo_hc, ["chart_id", "ladder"])
        session.commit()

    print(f"Charts: {len(charts)}")
    print(f"Table levels: {len(levels)} (skipped {skipped} with unknown chart_id)")
    print(f"EC ELO: {len(elo_ec)} (new rows only inserted)")
    print(f"HC ELO: {len(elo_hc)} (new rows only inserted)")

if __name__ == "__main__":
    seed()