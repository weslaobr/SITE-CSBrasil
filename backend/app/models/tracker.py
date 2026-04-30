from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, BigInteger, DateTime, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class Player(Base):
    __tablename__ = "tracker_players"
    __table_args__ = {"schema": "public"}

    steamid64 = Column(BigInteger, primary_key=True)
    personaname = Column(Text)
    avatar_url = Column(Text)
    last_updated = Column(DateTime(timezone=True), server_default=func.now())

class Match(Base):
    __tablename__ = "tracker_matches"
    __table_args__ = {"schema": "public"}

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
    __table_args__ = {"schema": "public"}

    match_id = Column(Text, ForeignKey("public.tracker_matches.match_id", ondelete="CASCADE"), primary_key=True)
    steamid64 = Column(BigInteger, ForeignKey("public.tracker_players.steamid64"), primary_key=True)
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
    
    fk = Column(Integer, default=0)
    fd = Column(Integer, default=0)
    triples = Column(Integer, default=0)
    quads = Column(Integer, default=0)
    aces = Column(Integer, default=0)
    clutches = Column(Integer, default=0)
    trades = Column(Integer, default=0)

    enemies_flashed = Column(Integer, default=0)
    total_blind_duration = Column(Float, default=0.0)
    avg_kill_distance = Column(Float, default=0.0)
    avg_ttd = Column(Float, default=0.0)
    utility_damage_roi = Column(Float, default=0.0)

    # Thrown grenade counts
    he_thrown = Column(Integer, default=0)
    flash_thrown = Column(Integer, default=0)
    smokes_thrown = Column(Integer, default=0)
    molotovs_thrown = Column(Integer, default=0)

    # Ranking System (Tropoints)
    elo_change = Column(Integer)
    elo_after = Column(Integer)

class Round(Base):
    __tablename__ = "tracker_rounds"
    __table_args__ = {"schema": "public"}

    round_id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Text, ForeignKey("public.tracker_matches.match_id", ondelete="CASCADE"))
    round_number = Column(Integer, nullable=False)
    winner_side = Column(Text)
    reason = Column(Text)
    end_tick = Column(Integer)
    
    ct_equipment_value = Column(Integer, default=0)
    t_equipment_value = Column(Integer, default=0)
    ct_buy_type = Column(Text)
    t_buy_type = Column(Text)

class KillEvent(Base):
    __tablename__ = "tracker_kill_events"
    __table_args__ = {"schema": "public"}

    kill_id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Text, ForeignKey("public.tracker_matches.match_id", ondelete="CASCADE"))
    round_id = Column(Integer, ForeignKey("public.tracker_rounds.round_id", ondelete="CASCADE"))
    tick = Column(Integer, nullable=False)
    attacker_steamid = Column(BigInteger, ForeignKey("public.tracker_players.steamid64"))
    victim_steamid = Column(BigInteger, ForeignKey("public.tracker_players.steamid64"))
    assister_steamid = Column(BigInteger)
    weapon = Column(Text)
    victim_weapon = Column(Text)
    is_headshot = Column(Boolean, default=False)
    is_wallbang = Column(Boolean, default=False)
    # Posições como colunas separadas (Sem PostGIS)
    attacker_x = Column(Float)
    attacker_y = Column(Float)
    attacker_z = Column(Float)
    victim_x = Column(Float)
    victim_y = Column(Float)
    victim_z = Column(Float)
    distance = Column(Float)
    attacker_hp = Column(Integer)
    victim_hp = Column(Integer) # HP before fatal shot

class DamageEvent(Base):
    __tablename__ = "tracker_damage_events"
    __table_args__ = {"schema": "public"}

    damage_id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Text, ForeignKey("public.tracker_matches.match_id", ondelete="CASCADE"))
    round_id = Column(Integer, ForeignKey("public.tracker_rounds.round_id", ondelete="CASCADE"))
    tick = Column(Integer, nullable=False)
    attacker_steamid = Column(BigInteger)
    victim_steamid = Column(BigInteger)
    weapon = Column(Text)
    hp_damage = Column(Integer)
    armor_damage = Column(Integer)
    hitgroup = Column(Integer)

class GrenadeEvent(Base):
    __tablename__ = "tracker_grenade_events"
    __table_args__ = {"schema": "public"}

    grenade_id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Text, ForeignKey("public.tracker_matches.match_id", ondelete="CASCADE"))
    round_id = Column(Integer, ForeignKey("public.tracker_rounds.round_id", ondelete="CASCADE"))
    tick = Column(Integer, nullable=False)
    steamid64 = Column(BigInteger)
    grenade_type = Column(Text)
    # Posição como colunas separadas (Sem PostGIS)
    x = Column(Float)
    y = Column(Float)
    z = Column(Float)
    blind_duration = Column(Float)

class WeaponStat(Base):
    __tablename__ = "tracker_weapon_stats"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Text, ForeignKey("public.tracker_matches.match_id", ondelete="CASCADE"))
    steamid64 = Column(BigInteger, ForeignKey("public.tracker_players.steamid64"))
    weapon = Column(Text, nullable=False)
    kills = Column(Integer, default=0)
    headshots = Column(Integer, default=0)
    damage = Column(Integer, default=0)
    accuracy = Column(Float, default=0.0)

class ClutchEvent(Base):
    __tablename__ = "tracker_clutch_events"
    __table_args__ = {"schema": "public"}

    clutch_id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Text, ForeignKey("public.tracker_matches.match_id", ondelete="CASCADE"))
    round_id = Column(Integer, ForeignKey("public.tracker_rounds.round_id", ondelete="CASCADE"))
    steamid64 = Column(BigInteger, ForeignKey("public.tracker_players.steamid64"))
    clutch_type = Column(String)
    is_won = Column(Boolean)

class PublicUser(Base):
    __tablename__ = "User"
    __table_args__ = {"schema": "public", "extend_existing": True}
    id = Column(String, primary_key=True)
    steamId = Column(String)
    rankingPoints = Column(Integer, default=500)
    mixLevel = Column(Integer, default=5)
    steamMatchAuthCode = Column(String)
    steamLatestMatchCode = Column(String)
