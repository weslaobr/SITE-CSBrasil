from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, BigInteger, DateTime, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.db.session import Base

class Player(Base):
    __tablename__ = "tracker_players"
    __table_args__ = {"schema": "tracker"}

    steamid64 = Column(BigInteger, primary_key=True)
    personaname = Column(Text)
    avatar_url = Column(Text)
    last_updated = Column(DateTime(timezone=True), server_default=func.now())

class Match(Base):
    __tablename__ = "tracker_matches"
    __table_args__ = {"schema": "tracker"}

    match_id = Column(Text, primary_key=True)
    map_name = Column(Text, nullable=False)
    match_date = Column(DateTime(timezone=True), server_default=func.now())
    duration_seconds = Column(Integer)
    score_ct = Column(Integer, default=0)
    score_t = Column(Integer, default=0)
    winner_team = Column(Text)
    demo_url = Column(Text)
    is_parsed = Column(Boolean, default=False)
    parsed_at = Column(DateTime(timezone=True))
    source = Column(Text, default="vanilla")

class MatchPlayer(Base):
    __tablename__ = "tracker_match_players"
    __table_args__ = {"schema": "tracker"}

    match_id = Column(Text, ForeignKey("tracker.tracker_matches.match_id", ondelete="CASCADE"), primary_key=True)
    steamid64 = Column(BigInteger, ForeignKey("tracker.tracker_players.steamid64"), primary_key=True)
    team = Column(Text)
    kills = Column(Integer, default=0)
    deaths = Column(Integer, default=0)
    assists = Column(Integer, default=0)
    adr = Column(Float, default=0.0)
    kast = Column(Float, default=0.0)
    rating = Column(Float, default=0.0)
    hs_count = Column(Integer, default=0)
    utility_damage = Column(Integer, default=0)
    flash_assists = Column(Integer, default=0)

class Round(Base):
    __tablename__ = "tracker_rounds"
    __table_args__ = {"schema": "tracker"}

    round_id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Text, ForeignKey("tracker.tracker_matches.match_id", ondelete="CASCADE"))
    round_number = Column(Integer, nullable=False)
    winner_side = Column(Text)
    reason = Column(Text)
    end_tick = Column(Integer)

class KillEvent(Base):
    __tablename__ = "tracker_kill_events"
    __table_args__ = {"schema": "tracker"}

    kill_id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Text, ForeignKey("tracker.tracker_matches.match_id", ondelete="CASCADE"))
    round_id = Column(Integer, ForeignKey("tracker.tracker_rounds.round_id", ondelete="CASCADE"))
    tick = Column(Integer, nullable=False)
    attacker_steamid = Column(BigInteger, ForeignKey("tracker.tracker_players.steamid64"))
    victim_steamid = Column(BigInteger, ForeignKey("tracker.tracker_players.steamid64"))
    assister_steamid = Column(BigInteger)
    weapon = Column(Text)
    is_headshot = Column(Boolean, default=False)
    is_wallbang = Column(Boolean, default=False)
    attacker_pos = Column(Geometry(geometry_type="POINTZ", srid=4326))
    victim_pos = Column(Geometry(geometry_type="POINTZ", srid=4326))

# Map Existing Prisma User Table
class PublicUser(Base):
    __tablename__ = "User"
    __table_args__ = {"schema": "public", "extend_existing": True}

    id = Column(String, primary_key=True)
    steamId = Column(String)
    steamMatchAuthCode = Column(String)
    steamLatestMatchCode = Column(String)

class DamageEvent(Base):
    __tablename__ = "tracker_damage_events"
    __table_args__ = {"schema": "tracker"}

    damage_id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Text, ForeignKey("tracker.tracker_matches.match_id", ondelete="CASCADE"))
    round_id = Column(Integer, ForeignKey("tracker.tracker_rounds.round_id", ondelete="CASCADE"))
    tick = Column(Integer, nullable=False)
    attacker_steamid = Column(BigInteger)
    victim_steamid = Column(BigInteger)
    weapon = Column(Text)
    hp_damage = Column(Integer)
    armor_damage = Column(Integer)
    hitgroup = Column(Integer)

class GrenadeEvent(Base):
    __tablename__ = "tracker_grenade_events"
    __table_args__ = {"schema": "tracker"}

    grenade_id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Text, ForeignKey("tracker.tracker_matches.match_id", ondelete="CASCADE"))
    round_id = Column(Integer, ForeignKey("tracker.tracker_rounds.round_id", ondelete="CASCADE"))
    tick = Column(Integer, nullable=False)
    steamid64 = Column(BigInteger)
    grenade_type = Column(Text)
    pos = Column(Geometry(geometry_type="POINTZ", srid=4326))

class TickData(Base):
    __tablename__ = "tracker_tick_data"
    __table_args__ = {"schema": "tracker"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Text, ForeignKey("tracker.tracker_matches.match_id", ondelete="CASCADE"), index=True)
    tick = Column(Integer, nullable=False)
    steamid64 = Column(BigInteger, nullable=False)
    pos = Column(Geometry(geometry_type="POINTZ", srid=4326))
    angle = Column(Float) # Yaw angle
    inventory_json = Column(Text) # Optional: simple list of weapons held
