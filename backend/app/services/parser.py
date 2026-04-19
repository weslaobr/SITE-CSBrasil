try:
    from awpy import Demo
except ImportError:
    # Quick Mock for environments where awpy/numpy build fails (e.g. Python 3.14 on Windows)
    class Demo:
        def __init__(self, path): 
            self.path = path
            self.header = {"map_name": "de_mirage", "client_name": "mock_share_code"}
            self.player_stats = pd.DataFrame([
                {"steamid": "76561198000000000", "name": "Mock Player CT", "team_name": "CT", "kills": 20, "deaths": 10, "assists": 5, "adr": 95.0, "kast": 0.75, "rating": 1.2, "headshot_kills": 12, "utility_damage": 300, "flash_assists": 2},
                {"steamid": "76561198000000001", "name": "Mock Player T", "team_name": "T", "kills": 15, "deaths": 20, "assists": 3, "adr": 75.0, "kast": 0.65, "rating": 0.9, "headshot_kills": 8, "utility_damage": 100, "flash_assists": 1}
            ])
            self.rounds = pd.DataFrame([{"round": 1, "winner_side": "CT", "reason": "ct_win_elimination", "end_tick": 2000}])
            self.kills = pd.DataFrame([{"tick": 100, "attacker_steamid": "76561198000000000", "victim_steamid": "76561198000000001", "weapon": "m4a1_s", "is_headshot": True}])
            self.damages = pd.DataFrame([])
            self.grenades = pd.DataFrame([])
            self.ticks = pd.DataFrame([{"tick": 0, "steamid": "76561198000000000", "pos_x": -1000, "pos_y": 500, "yaw": 90}])
        def parse(self): 
            import os
            if os.getenv("PYTHON_ENV") != "development":
                raise ImportError("awpy is not installed. Mock data is restricted in production.")
            pass

import pandas as pd
from typing import Dict, Any, List
from app.models.tracker import Match, MatchPlayer, Round, KillEvent, Player, DamageEvent, GrenadeEvent, TickData
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ParserService:
    def __init__(self, demo_path: str):
        self.demo_path = demo_path
        self.dem = Demo(demo_path)

    async def parse_and_save(self, db: AsyncSession, match_id_override: str = None, match_date: datetime = None, demo_url: str = None, source: str = None):
        # 1. Match Metadata
        logger.info(f"Parser: Starting parse for {self.demo_path}")
        self.dem.parse()

        # --- Strict Match Start Detection ---
        # We need to ignore warmup and especially the "knife round".
        # A knife round is usually followed by a restart.
        start_tick = 0
        try:
            # 1. Identify all match start events
            match_start_events = []
            if hasattr(self.dem, 'events') and "round_announce_match_start" in self.dem.events:
                match_start_events = self.dem.events["round_announce_match_start"]["tick"].tolist()
            
            # 2. Identify the first firearm kill
            # Firearms = anything that is not a knife or a decoy (sometimes used for trolling)
            non_knife_kills = self.dem.kills[~self.dem.kills["weapon"].str.contains("knife", case=False, na=False)]
            first_firearm_kill_tick = non_knife_kills["tick"].min() if not non_knife_kills.empty else float('inf')
            
            # 3. Decision: The match start is the LAST 'round_announce_match_start' 
            # that occurs BEFORE or AT the first firearm kill.
            candidate_starts = [t for t in match_start_events if t < first_firearm_kill_tick]
            if candidate_starts:
                start_tick = max(candidate_starts)
            elif first_firearm_kill_tick != float('inf'):
                # Fallback: find the start of the round that contains the first firearm kill
                firearm_round = self.dem.rounds[self.dem.rounds["end_tick"] > first_firearm_kill_tick]
                if not firearm_round.empty:
                    # CS2 rounds often don't have start_tick in awpy yet, 
                    # so we approximate by the end of previous round or 0
                    prev_rounds = self.dem.rounds[self.dem.rounds["end_tick"] < first_firearm_kill_tick]
                    start_tick = prev_rounds["end_tick"].max() if not prev_rounds.empty else 0
            
            logger.info(f"Parser: Strict match start detected at tick {start_tick} (Firearm kill at {first_firearm_kill_tick})")
        except Exception as e:
            logger.warning(f"Parser: Error in strict match start detection: {e}")

        def filter_df(df, tick_col="tick"):
            if df is not None and not df.empty and tick_col in df.columns:
                return df[df[tick_col] >= start_tick].copy()
            return df

        # Filter all DataFrames
        self.dem.rounds = filter_df(self.dem.rounds, "end_tick") # Rounds use end_tick
        self.dem.kills = filter_df(self.dem.kills)
        self.dem.damages = filter_df(self.dem.damages)
        self.dem.grenades = filter_df(self.dem.grenades, "tick")
        if hasattr(self.dem, 'ticks'):
            self.dem.ticks = filter_df(self.dem.ticks)

        # Re-number rounds to be 1-based for the competitive part
        if not self.dem.rounds.empty:
            self.dem.rounds = self.dem.rounds.sort_values("end_tick").reset_index(drop=True)
            self.dem.rounds["round"] = self.dem.rounds.index + 1
        # --- End Match Start Detection ---
        
        # Determine unique match_id from demo header or file hash fallback
        # This prevents duplication if the same demo is re-uploaded with different filenames/URLs
        extracted_id = self.dem.header.get("match_id") or self.dem.header.get("client_name")
        
        # If the ID is too generic or missing, use a file content hash
        if not extracted_id or extracted_id in ["Counter-Strike 2", "mock_share_code"]:
            import hashlib
            with open(self.demo_path, "rb") as f:
                # Hash first 1MB for speed and high collision avoidance 
                file_hash = hashlib.md5(f.read(1024 * 1024)).hexdigest()
            extracted_id = f"demo_{file_hash}"
            
        match_id = match_id_override or extracted_id
        map_name = self.dem.header["map_name"]
        
        # 0. Cleanup existing data for this match_id
        from sqlalchemy import delete
        from app.models.tracker import MatchPlayer as MP, Round as R, KillEvent as KE, DamageEvent as DE, GrenadeEvent as GE, TickData as TD
        
        logger.info(f"Parser: Cleaning up old records for match {match_id}")
        await db.execute(delete(MP).where(MP.match_id == match_id))
        await db.execute(delete(R).where(R.match_id == match_id))
        await db.execute(delete(KE).where(KE.match_id == match_id))
        await db.execute(delete(DE).where(DE.match_id == match_id))
        await db.execute(delete(GE).where(GE.match_id == match_id))
        await db.execute(delete(TD).where(TD.match_id == match_id))
        await db.flush()

        # 0.5. Fetch or Create Match record
        from app.models.tracker import Match
        match = await db.get(Match, match_id)
        
        if not match:
            match = Match(
                match_id=match_id, 
                map_name=map_name,
                match_date=match_date or datetime.now(),
                demo_url=demo_url,
                source=source or "vanilla"
            )
            db.add(match)
        else:
            match.map_name = map_name
            if match_date:
                match.match_date = match_date
            if demo_url:
                match.demo_url = demo_url
            if source:
                match.source = source
        
        # Calcular scores a partir dos rounds
        rounds_df = self.dem.rounds
        if not rounds_df.empty:
            match.score_ct = int(rounds_df[rounds_df["winner_side"] == "CT"].shape[0])
            match.score_t = int(rounds_df[rounds_df["winner_side"] == "T"].shape[0])
            if "end_tick" in rounds_df.columns:
                max_tick = rounds_df["end_tick"].max()
                # Assumindo 64 tick para duração básica ou pegando do header se disponível
                match.duration_seconds = int(max_tick / 64)
            
            if match.score_ct > match.score_t: match.winner_team = "CT"
            elif match.score_t > match.score_ct: match.winner_team = "T"
            else: match.winner_team = "Draw"
        
        # 2. Players & Overall Stats
        # We recalculate stats from filtered DataFrames to ensure accuracy (no mockup/warmup kills)
        # However, we still need the list of players.
        player_stats_agg = self.dem.player_stats
        
        # Pre-calculate counts from filtered kills/damages
        kills_by_player = self.dem.kills.groupby("attacker_steamid").size().to_dict() if not self.dem.kills.empty else {}
        deaths_by_player = self.dem.kills.groupby("victim_steamid").size().to_dict() if not self.dem.kills.empty else {}
        hs_by_player = self.dem.kills[self.dem.kills["is_headshot"] == True].groupby("attacker_steamid").size().to_dict() if not self.dem.kills.empty else {}
        
        # Damage aggregation for ADR
        # Filter out team damage if possible (assumes attacker_side != victim_side or similar)
        # For now, we take all damage in filtered DF
        dmg_by_player = self.dem.damages.groupby("attacker_steamid")["hp_damage"].sum().to_dict() if not self.dem.damages.empty else {}
        
        num_rounds = len(self.dem.rounds) if not self.dem.rounds.empty else 1

        for _, row in player_stats_agg.iterrows():
            steamid = int(row["steamid"])
            
            player = await db.get(Player, steamid)
            if not player:
                player = Player(steamid64=steamid, personaname=row["name"])
                db.add(player)
            else:
                player.personaname = row["name"]
            
            # Extract recalculated stats
            pkills = int(kills_by_player.get(steamid, 0))
            pdeaths = int(deaths_by_player.get(steamid, 0))
            phscount = int(hs_by_player.get(steamid, 0))
            pdmg = float(dmg_by_player.get(steamid, 0))
            padr = pdmg / num_rounds if num_rounds > 0 else 0.0

            # MatchPlayer stats
            mp_stats = MatchPlayer(
                match_id=match_id,
                steamid64=steamid,
                team=row["team_name"],
                kills=pkills,
                deaths=pdeaths,
                assists=int(row["assists"]), # Assists are harder to re-calc, use row for now
                adr=padr,
                kast=float(row["kast"]), # Keep original KAST/Rating as fallback/approximation
                rating=float(row["rating"]),
                hs_count=phscount,
                utility_damage=int(row["utility_damage"]),
                flash_assists=int(row["flash_assists"]),
                # Novas estatísticas para o guia de desempenho
                fk=0, # Will be updated below
                fd=0, # Will be updated below
                triples=int(row.get("triple_kills", row.get("3k", 0))),
                quads=int(row.get("quad_kills", row.get("4k", 0))),
                aces=int(row.get("ace_kills", row.get("5k", 0))),
                clutches=int(row.get("clutch_wins", row.get("clutches", 0))),
                trades=int(row.get("trade_kills", row.get("trades", 0)))
            )
            db.add(mp_stats)

        # 2b. Calcular FK/FD por round a partir dos kill events
        kills_df_early = self.dem.kills.copy() if not self.dem.kills.empty else pd.DataFrame()
        if not kills_df_early.empty and 'round' in kills_df_early.columns:
            # Para cada round, encontre o primeiro kill (menor tick)
            fk_counts = {}  # steamid -> count de rounds onde foi o abridor
            fd_counts = {}  # steamid -> count de rounds onde foi a primeira morte

            for round_num, round_kills in kills_df_early.groupby('round'):
                # A primeira kill do round = kill com menor tick
                first_kill_row = round_kills.nsmallest(1, 'tick').iloc[0]
                attacker = str(int(first_kill_row['attacker_steamid'])) if first_kill_row.get('attacker_steamid') else None
                victim = str(int(first_kill_row['victim_steamid'])) if first_kill_row.get('victim_steamid') else None
                if attacker:
                    fk_counts[attacker] = fk_counts.get(attacker, 0) + 1
                if victim:
                    fd_counts[victim] = fd_counts.get(victim, 0) + 1

            # Atualizar os registros MatchPlayer com os valores calculados
            for _, row in player_stats.iterrows():
                steamid_str = str(int(row['steamid']))
                fk_val = fk_counts.get(steamid_str, 0)
                fd_val = fd_counts.get(steamid_str, 0)
                if fk_val > 0 or fd_val > 0:
                    # Atualizar o registro via query
                    from sqlalchemy import update
                    from app.models.tracker import MatchPlayer as MP
                    await db.execute(
                        update(MP).where(
                            MP.match_id == match_id,
                            MP.steamid64 == int(row['steamid'])
                        ).values(fk=fk_val, fd=fd_val)
                    )



        # 3. Rounds (With deep mapping)
        rounds_df = self.dem.rounds

        round_map = {} # tick -> round_id for mapping events
        for idx, row in rounds_df.iterrows():
            new_round = Round(
                match_id=match_id,
                round_number=int(row["round"]),
                winner_side=row["winner_side"],
                reason=row["reason"],
                end_tick=int(row["end_tick"])
            )
            db.add(new_round)
            await db.flush() 
            round_map[int(row["end_tick"])] = new_round.round_id

        # Helper to find round_id from tick
        def get_round_id(tick):
            # Simplified: finds first round that ended after this tick
            for end_tick, rid in sorted(round_map.items()):
                if tick <= end_tick:
                    return rid
            return None

        # 4. Kills
        kills_df = self.dem.kills
        for _, row in kills_df.iterrows():
            rid = get_round_id(int(row["tick"]))
            kill = KillEvent(
                match_id=match_id,
                round_id=rid,
                tick=int(row["tick"]),
                attacker_steamid=int(row["attacker_steamid"]) if row["attacker_steamid"] else None,
                victim_steamid=int(row["victim_steamid"]) if row["victim_steamid"] else None,
                weapon=row["weapon"],
                is_headshot=bool(row["is_headshot"])
            )
            db.add(kill)

        # 5. Damage Events (Phase 3)
        damages_df = self.dem.damages
        for _, row in damages_df.iterrows():
            rid = get_round_id(int(row["tick"]))
            damage = DamageEvent(
                match_id=match_id,
                round_id=rid,
                tick=int(row["tick"]),
                attacker_steamid=int(row["attacker_steamid"]) if row["attacker_steamid"] else None,
                victim_steamid=int(row["victim_steamid"]) if row["victim_steamid"] else None,
                weapon=row["weapon"],
                hp_damage=int(row["hp_damage"]),
                armor_damage=int(row["armor_damage"]),
                hitgroup=int(row["hitgroup"])
            )
            db.add(damage)

        # 6. Grenade Events (Phase 3)
        grenades_df = self.dem.grenades
        for _, row in grenades_df.iterrows():
            rid = get_round_id(int(row["tick"]))
            grenade = GrenadeEvent(
                match_id=match_id,
                round_id=rid,
                tick=int(row["tick"]),
                steamid64=int(row["thrower_steamid"]) if row["thrower_steamid"] else None,
                grenade_type=row["grenade_type"]
            )
            db.add(grenade)

        # 7. Tick Data Sampling (Phase 3)
        # Every 16 ticks (approx 4-8 updates per second depending on demo tickrate)
        ticks_df = self.dem.ticks
        if not ticks_df.empty:
            sampled_ticks = ticks_df[ticks_df["tick"] % 16 == 0]
            for _, row in sampled_ticks.iterrows():
                tick_entry = TickData(
                    match_id=match_id,
                    tick=int(row["tick"]),
                    steamid64=int(row["steamid"]),
                    angle=float(row["yaw"]) if "yaw" in row else 0.0
                    # For PostGIS PointZ: ST_SetSRID(ST_MakePoint(X, Y, Z), 4326)
                    # We will handle the PostGIS geometry conversion in a raw SQL flush or custom column type later if needed
                )
                db.add(tick_entry)

        match.is_parsed = True
        match.parsed_at = pd.Timestamp.now()
        await db.commit()
        logger.info(f"Parser: Successfully finished match {match_id}")
        return match_id
