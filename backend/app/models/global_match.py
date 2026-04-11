"""
SQLAlchemy models mapping to the Prisma-managed GlobalMatch and GlobalMatchPlayer tables.
These tables live in the 'public' schema of the main Prisma database.
"""

from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.db.session import Base


class GlobalMatch(Base):
    """Maps to Prisma model GlobalMatch (public."GlobalMatch")"""
    __tablename__ = "GlobalMatch"
    __table_args__ = {"schema": "public", "extend_existing": True}

    id = Column(String, primary_key=True)          # share_code or derived unique ID
    source = Column(String, default="matchmaking") # matchmaking, faceit, mix, demo
    mapName = Column(String, nullable=False)
    duration = Column(String)
    matchDate = Column(DateTime(timezone=True), server_default=func.now())
    scoreA = Column(Integer)
    scoreB = Column(Integer)
    metadata = Column(JSONB, default={})            # demo_url, etc.


class GlobalMatchPlayer(Base):
    """Maps to Prisma model GlobalMatchPlayer (public."GlobalMatchPlayer")"""
    __tablename__ = "GlobalMatchPlayer"
    __table_args__ = {"schema": "public", "extend_existing": True}

    id = Column(String, primary_key=True)           # UUID
    globalMatchId = Column(String, ForeignKey("public.\"GlobalMatch\".id", ondelete="CASCADE"), nullable=False)
    steamId = Column(String, nullable=False)        # SteamID64 as string
    userId = Column(String)                         # Optional: linked User.id from Prisma
    team = Column(String, nullable=False)           # CT, T, A, B
    kills = Column(Integer, nullable=False, default=0)
    deaths = Column(Integer, nullable=False, default=0)
    assists = Column(Integer, nullable=False, default=0)
    score = Column(Integer, nullable=False, default=0)
    mvps = Column(Integer, nullable=False, default=0)
    adr = Column(Float)
    hsPercentage = Column(Float)
    matchResult = Column(String, nullable=False, default="unknown")  # win, loss, tie
    metadata = Column(JSONB, default={})             # fk, fd, rating, kast, utilDmg, etc.


class PublicUserLookup(Base):
    """Read-only mapping to Prisma User table for linking steamId → userId"""
    __tablename__ = "User"
    __table_args__ = {"schema": "public", "extend_existing": True}

    id = Column(String, primary_key=True)
    steamId = Column(String, unique=True)
    name = Column(String)
    steamMatchAuthCode = Column(String)
