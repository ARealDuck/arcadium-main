from functools import lru_cache

from app.core.db import SessionLocal
from app.models import ChartTableLevel
from sqlalchemy import select


@lru_cache(maxsize=1)
def valid_table_icons() -> frozenset[str]:
    with SessionLocal() as db:
        icons = db.scalars(
            select(ChartTableLevel.table_icon)
            .distinct()
        )
        return frozenset(icons)