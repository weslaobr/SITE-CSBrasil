-- CS2 Tracker Schema (TropaCS)
-- Requires PostGIS: CREATE EXTENSION IF NOT EXISTS postgis;

CREATE SCHEMA IF NOT EXISTS tracker;

-- Players table (cached from Steam)
CREATE TABLE tracker.players (
    steamid64 BIGINT PRIMARY KEY,
    personaname TEXT,
    avatar_url TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Matches table
CREATE TABLE tracker.matches (
    match_id TEXT PRIMARY KEY, -- Valve Share Code or UUID
    map_name TEXT NOT NULL,
    match_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration_seconds INT,
    score_ct INT DEFAULT 0,
    score_t INT DEFAULT 0,
    winner_team TEXT, -- 'CT', 'T', or 'Draw'
    demo_url TEXT,
    is_parsed BOOLEAN DEFAULT FALSE,
    parsed_at TIMESTAMP WITH TIME ZONE,
    source TEXT DEFAULT 'vanilla' -- 'vanilla', 'faceit', 'gc'
);

-- Players in a specific match (link table with overall stats)
CREATE TABLE tracker.match_players (
    match_id TEXT REFERENCES tracker.matches(match_id) ON DELETE CASCADE,
    steamid64 BIGINT REFERENCES tracker.players(steamid64),
    team TEXT, -- 'CT' or 'T'
    kills INT DEFAULT 0,
    deaths INT DEFAULT 0,
    assists INT DEFAULT 0,
    adr FLOAT DEFAULT 0.0,
    kast FLOAT DEFAULT 0.0,
    rating FLOAT DEFAULT 0.0,
    hs_count INT DEFAULT 0,
    utility_damage INT DEFAULT 0,
    flash_assists INT DEFAULT 0,
    fk INT DEFAULT 0,
    fd INT DEFAULT 0,
    triples INT DEFAULT 0,
    quads INT DEFAULT 0,
    aces INT DEFAULT 0,
    clutches INT DEFAULT 0,
    trades INT DEFAULT 0,
    enemies_flashed INT DEFAULT 0,
    total_blind_duration FLOAT DEFAULT 0.0,
    avg_kill_distance FLOAT DEFAULT 0.0,
    avg_ttd FLOAT DEFAULT 0.0,
    utility_damage_roi FLOAT DEFAULT 0.0,
    he_thrown INT DEFAULT 0,
    flash_thrown INT DEFAULT 0,
    smokes_thrown INT DEFAULT 0,
    molotovs_thrown INT DEFAULT 0,
    PRIMARY KEY (match_id, steamid64)
);

-- Rounds table
CREATE TABLE tracker.rounds (
    round_id SERIAL PRIMARY KEY,
    match_id TEXT REFERENCES tracker.matches(match_id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    winner_side TEXT, -- 'CT' or 'T'
    reason TEXT, -- 'bomb_defused', 'target_bombed', 'ct_win_elimination', etc.
    end_tick INT,
    ct_equipment_value INT DEFAULT 0,
    t_equipment_value INT DEFAULT 0,
    ct_buy_type TEXT,
    t_buy_type TEXT
);

-- Stats per player per round
CREATE TABLE tracker.player_round_stats (
    round_id INT REFERENCES tracker.rounds(round_id) ON DELETE CASCADE,
    steamid64 BIGINT REFERENCES tracker.players(steamid64),
    kills INT DEFAULT 0,
    deaths INT DEFAULT 0,
    damage_dealt INT DEFAULT 0,
    utility_damage INT DEFAULT 0,
    spent_money INT DEFAULT 0,
    equipment_value INT DEFAULT 0,
    PRIMARY KEY (round_id, steamid64)
);

-- Kill events (with PostGIS for Heatmaps)
CREATE TABLE tracker.kill_events (
    kill_id SERIAL PRIMARY KEY,
    match_id TEXT REFERENCES tracker.matches(match_id) ON DELETE CASCADE,
    round_id INT REFERENCES tracker.rounds(round_id) ON DELETE CASCADE,
    tick INT NOT NULL,
    attacker_steamid BIGINT REFERENCES tracker.players(steamid64),
    victim_steamid BIGINT REFERENCES tracker.players(steamid64),
    assister_steamid BIGINT,
    weapon TEXT,
    is_headshot BOOLEAN DEFAULT FALSE,
    is_wallbang BOOLEAN DEFAULT FALSE,
    attacker_pos GEOMETRY(PointZ, 4326), -- PostGIS Z-coordinate support
    victim_pos GEOMETRY(PointZ, 4326),
    distance FLOAT
);

-- Damage events
CREATE TABLE tracker.damage_events (
    damage_id SERIAL PRIMARY KEY,
    match_id TEXT REFERENCES tracker.matches(match_id) ON DELETE CASCADE,
    round_id INT REFERENCES tracker.rounds(round_id) ON DELETE CASCADE,
    tick INT NOT NULL,
    attacker_steamid BIGINT REFERENCES tracker.players(steamid64),
    victim_steamid BIGINT REFERENCES tracker.players(steamid64),
    weapon TEXT,
    hp_damage INT,
    armor_damage INT,
    hitgroup INT
);

-- Grenade events
CREATE TABLE tracker.grenade_events (
    grenade_id SERIAL PRIMARY KEY,
    match_id TEXT REFERENCES tracker.matches(match_id) ON DELETE CASCADE,
    round_id INT REFERENCES tracker.rounds(round_id) ON DELETE CASCADE,
    tick INT NOT NULL,
    steamid64 BIGINT REFERENCES tracker.players(steamid64),
    grenade_type TEXT, -- 'flashbang', 'smokegrenade', etc.
    pos GEOMETRY(PointZ, 4326)
);

-- Indexes for performance
CREATE INDEX idx_matches_date ON tracker.matches(match_date);
CREATE INDEX idx_kill_events_match ON tracker.kill_events(match_id);
CREATE INDEX idx_kill_events_attacker ON tracker.kill_events(attacker_steamid);
CREATE INDEX idx_damage_events_match ON tracker.damage_events(match_id);
CREATE INDEX idx_match_players_steamid ON tracker.match_players(steamid64);

-- Phase 3: Advanced Analytics & 2D Viewer
CREATE TABLE tracker.tracker_damage_events (
    damage_id SERIAL PRIMARY KEY,
    match_id TEXT REFERENCES tracker.matches(match_id) ON DELETE CASCADE,
    round_id INT REFERENCES tracker.rounds(round_id) ON DELETE CASCADE,
    tick INT NOT NULL,
    attacker_steamid BIGINT,
    victim_steamid BIGINT,
    weapon TEXT,
    hp_damage INT,
    armor_damage INT,
    hitgroup INT
);

CREATE TABLE tracker.tracker_grenade_events (
    grenade_id SERIAL PRIMARY KEY,
    match_id TEXT REFERENCES tracker.matches(match_id) ON DELETE CASCADE,
    round_id INT REFERENCES tracker.rounds(round_id) ON DELETE CASCADE,
    tick INT NOT NULL,
    steamid64 BIGINT,
    grenade_type TEXT,
    pos GEOMETRY(PointZ, 4326)
);

CREATE TABLE tracker.tracker_tick_data (
    id SERIAL PRIMARY KEY,
    match_id TEXT REFERENCES tracker.matches(match_id) ON DELETE CASCADE,
    tick INT NOT NULL,
    steamid64 BIGINT NOT NULL,
    pos GEOMETRY(PointZ, 4326),
    angle FLOAT,
    inventory_json TEXT
);

CREATE INDEX idx_tick_data_match ON tracker.tracker_tick_data(match_id);
CREATE INDEX idx_tick_data_tick ON tracker.tracker_tick_data(tick);

-- New Tables for Advanced Analytics
CREATE TABLE tracker.tracker_weapon_stats (
    id SERIAL PRIMARY KEY,
    match_id TEXT REFERENCES tracker.matches(match_id) ON DELETE CASCADE,
    steamid64 BIGINT REFERENCES tracker.players(steamid64),
    weapon TEXT NOT NULL,
    kills INT DEFAULT 0,
    headshots INT DEFAULT 0,
    damage INT DEFAULT 0,
    accuracy FLOAT DEFAULT 0.0
);

CREATE TABLE tracker.tracker_clutch_events (
    clutch_id SERIAL PRIMARY KEY,
    match_id TEXT REFERENCES tracker.matches(match_id) ON DELETE CASCADE,
    round_id INT REFERENCES tracker.tracker_rounds(round_id) ON DELETE CASCADE,
    steamid64 BIGINT REFERENCES tracker.players(steamid64),
    clutch_type TEXT, -- '1v1', '1v2', etc
    is_won BOOLEAN
);
