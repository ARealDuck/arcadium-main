import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, ForeignKey, String, UniqueConstraint, func, text, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB

from app.models.base import Base
from app.models.matches import Match
from app.models.charts import Chart

# User Model -- Self explanatory. Handles all user basic information, their Tachi API key, and seeding for initial placements.

class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("uq_users_username_lower", text("lower(username)"), unique=True),
        Index("uq_users_email_lower", text("lower(email)"), unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    display_name: Mapped[str] = mapped_column(String(32))
    username: Mapped[str] = mapped_column(String(20))
    tachi_api_key: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    email_verified: Mapped[bool] = mapped_column(default=False)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    avatar_url: Mapped[str | None]
    is_active: Mapped[bool] = mapped_column(default=True)
    rating_seeds: Mapped[dict] = mapped_column(JSONB, server_default="{}")
    onboarded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    identities: Mapped[list["UserIdentity"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    sessions: Mapped[list["UserSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    ratings: Mapped[list["PlayerRating"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    matches: Mapped[list["Match"]] = relationship(
        back_populates="user"
    )

    avoided_charts: Mapped[list["UserAvoidedChart"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    tokens: Mapped[list["Token"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )

# UserIdentity Model -- Currently not in use, but meant for OAuth2 once that is implemented

class UserIdentity(Base):
    __tablename__ = "user_identities"
    __table_args__ = (UniqueConstraint("provider", "provider_user_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[str] = mapped_column(String(32))
    provider_user_id: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped[User] = relationship(back_populates="identities")

# UserSession -- Handles logged in user sessions. Keeps a cookie hash and a user ID, when a request is sent it 
# checks the hash against the cookie (which gets hashed), and if the same, the user is logged in and can proceed.

class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="sessions")

# PlayerRating Model - Handles a player's glicko2 rating. There is an internal rating, but I don't know if I want to use that. Keeping in place for now, though.

class PlayerRating(Base):
    __tablename__ = "player_ratings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    game: Mapped[str] = mapped_column(String(16), primary_key=True)
    playtype: Mapped[str] = mapped_column(String(8), primary_key=True)
    ladder: Mapped[str] = mapped_column(String(8), primary_key=True)

    selected_tables: Mapped[list[str]] = mapped_column(ARRAY(String), server_default="{}")

    rating: Mapped[float] = mapped_column(default=850)
    rd: Mapped[float] = mapped_column(default=300)
    volatility: Mapped[float] = mapped_column(default=0.06)

    display_rating: Mapped[float] = mapped_column(default=850)
    placed: Mapped[bool] = mapped_column(default=False)

    games_played: Mapped[int] = mapped_column(default=0)
    wins: Mapped[int] = mapped_column(default=0, server_default="0")
    peak_rating: Mapped[float] = mapped_column(default=0, server_default="0")
    last_played_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="ratings")

class UserAvoidedChart(Base):
    __tablename__ = "user_avoided_charts"
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), primary_key=True
    )
    chart_id: Mapped[str] = mapped_column(
        ForeignKey("charts.chart_id", ondelete="CASCADE"), primary_key=True
    )
    user: Mapped["User"] = relationship(back_populates="avoided_charts")
    chart: Mapped["Chart"] = relationship()
