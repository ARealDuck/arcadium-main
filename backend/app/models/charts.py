from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.matches import Match

# Chart Model -- A chart can be considered a single "difficulty" for a song within rhythm games. It handles the notes 
# and the basic metadata. chart_id and song_id (as well as some other attributes) are based on Tachi's ID systems. For
# additional ID handling, we also store md5 and sha256.

class Chart(Base):
    __tablename__ = "charts"

    chart_id: Mapped[str] = mapped_column(String, primary_key=True)
    song_id: Mapped[str | None] = mapped_column(String, index=True)
    md5: Mapped[str | None] = mapped_column(String(32), index=True)
    sha256: Mapped[str | None] = mapped_column(String(64), index=True)
    artist: Mapped[str | None]
    title: Mapped[str | None]
    subtitle: Mapped[str | None]
    sg_ec: Mapped[float | None]
    sg_hc: Mapped[float | None]
    game: Mapped[str] = mapped_column(String(16), index=True)
    playtype: Mapped[str] = mapped_column(String(8), index=True)

    table_levels: Mapped[list["ChartTableLevel"]] = relationship(back_populates="chart")
    ratings: Mapped[list["ChartRating"]] = relationship(back_populates="chart")
    matches: Mapped[list["Match"]] = relationship(back_populates="chart")

# ChartTableLevel Model -- This is specific to BMS, and maybe USC (or other games with difficulty tables). Connects a chart to the various difficulty tables that you can find the chart in.

class ChartTableLevel(Base):
    __tablename__ = "chart_table_levels"

    chart_id: Mapped[str] = mapped_column(ForeignKey("charts.chart_id"), primary_key=True)
    table_icon: Mapped[str] = mapped_column(primary_key=True)
    table_level: Mapped[str]

    chart: Mapped[Chart] = relationship(back_populates="table_levels")

# ChartRating Model -- Handles a chart's rating (ELO) in a given ladder. We use glicko2, so we have rd (rating deviation), and volatility, along with rating.

class ChartRating(Base):
    __tablename__ = "chart_ratings"

    chart_id: Mapped[str] = mapped_column(ForeignKey("charts.chart_id"), primary_key=True)
    ladder: Mapped[str] = mapped_column(String(8), primary_key=True)
    rating: Mapped[float]
    rd: Mapped[float]
    volatility: Mapped[float]
    games_played: Mapped[int] = mapped_column(default=0)
    wins: Mapped[int] = mapped_column(default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
        )

    chart: Mapped[Chart] = relationship(back_populates="ratings")