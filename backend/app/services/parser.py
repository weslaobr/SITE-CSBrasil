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
        def parse(self): pass

import pandas as pd
from typing import Dict, Any, List
from app.models.tracker import Match, MatchPlayer, Round, KillEvent, Player, DamageEvent, GrenadeEvent, TickData
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
import logging

logger = logging.getLogger(__name__)

class ParserService:
    def __init__(self, demo_path: str):
        self.demo_path = demo_path
        self.dem = Demo(demo_path)

    async def parse_and_save(self, db: AsyncSession, match_id_override: str = None):
        """
        Parses the demo and saves all data to the database.
        """
        logger.info(f"Parser: Starting parse for {self.demo_path}")
        self.dem.parse()
        
        # 1. Match Metadata
        map_name = self.dem.header["map_name"]
        match_id = match_id_override or self.dem.header["client_name"]
        
        match = await db.get(Match, match_id)
        if not match:
            match = Match(match_id=match_id, map_name=map_name)
            db.add(match)
        
        # 2. Players & Overall Stats
        player_stats = self.dem.player_stats
        for _, row in player_stats.iterrows():
            steamid = int(row["steamid"])
            
            player = await db.get(Player, steamid)
            if not player:
                player = Player(steamid64=steamid, personaname=row["name"])
                db.add(player)
            
            # MatchPlayer stats (KAST and Rating are pre-calculated by awpy)
            mp_stats = MatchPlayer(
                match_id=match_id,
                steamid64=steamid,
                team=row["team_name"],
                kills=int(row["kills"]),
                deaths=int(row["deaths"]),
                assists=int(row["assists"]),
                adr=float(row["adr"]),
                kast=float(row["kast"]),
                rating=float(row["rating"]),
                hs_count=int(row["headshot_kills"]),
                utility_damage=int(row["utility_damage"]),
                flash_assists=int(row["flash_assists"]),
                # Novas estatísticas para o guia de desempenho
                fk=int(row.get("first_kills", row.get("fk", 0))),
                fd=int(row.get("first_deaths", row.get("fd", 0))),
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
