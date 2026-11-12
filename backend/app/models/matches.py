from typing import TYPE_CHECKING

# Normally causes circular import. Need this to stop IDE from yelling at me.
if TYPE_CHECKING:
    from app.models.charts import Chart
    from app.models.users import User

from datetime import datetime

from app.core.enums import ClearTypes, MatchResult, MatchStatus, MatchType
from app.models.base import Base, enum_check, str_enum
from sqlalchemy import DateTime, ForeignKey, Index, String, false, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

# Match Model -- Players compete in matches. One player versus a chart. Each player can only have one active match at a time across all ladders.

class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (
        Index(
            "uq_matches_one_active",
            "user_id",
            unique=True,
            postgresql_where=text("status = 'active'")
        ),
        enum_check("status", MatchStatus, "ck_matches_status"),
        enum_check("result", MatchResult, "ck_matches_result"),
        enum_check("type", MatchType, "ck_matches_type")
    )


    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    chart_id: Mapped[str] = mapped_column(
        ForeignKey("charts.chart_id"), index=True
    )
    rating_change: Mapped[float | None]
    ladder: Mapped[str] = mapped_column(String(8))
    game: Mapped[str] = mapped_column(String(32))
    playtype: Mapped[str] = mapped_column(String(32))
    result: Mapped[MatchResult | None] = mapped_column(str_enum(MatchResult))
    status: Mapped[MatchStatus] = mapped_column(str_enum(MatchStatus), index=True, default=MatchStatus.ACTIVE)
    type: Mapped[MatchType] = mapped_column(str_enum(MatchType), index=True, default=MatchType.COMPETITIVE, server_default=MatchType.COMPETITIVE)
    search_elo: Mapped[float | None]
    cancel_reason: Mapped[str | None] = mapped_column(String(255))
    player_placed_before: Mapped[bool] = mapped_column(default = False, server_default = false())
    player_mmr_before: Mapped[float | None]
    player_mmr_after: Mapped[float | None]
    player_display_before: Mapped[float | None]
    player_display_after: Mapped[float | None]
    player_rd_before: Mapped[float | None]
    player_rd_after: Mapped[float | None]
    chart_rating_before: Mapped[float | None]
    chart_rating_after: Mapped[float | None]
    chart_rd_before: Mapped[float | None]
    chart_rd_after: Mapped[float | None]
    forfeited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True)
    )
    cutoff_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True)
    )
    end_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    user: Mapped["User"] = relationship(back_populates="matches")
    chart: Mapped["Chart"] = relationship(back_populates="matches")
    score: Mapped["MatchScore | None"] = relationship(back_populates="match", uselist=False)

class MatchScore(Base):
    __tablename__ = "match_scores"
    __table_args__ = (enum_check("lamp", ClearTypes, "ck_match_scores_lamp"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(
        ForeignKey("matches.id"), index=True
    )
    lamp: Mapped[ClearTypes] = mapped_column(str_enum(ClearTypes))
    grade: Mapped[str] = mapped_column(String(8))
    percent: Mapped[float | None]
    bp: Mapped[int | None]

    match: Mapped["Match"] = relationship(back_populates="score")