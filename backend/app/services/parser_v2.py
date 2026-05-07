import os
import pandas as pd
import numpy as np
import logging
from typing import Dict, Any, List
from datetime import datetime
import hashlib
import json

from demoparser2 import DemoParser
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, insert

from app.models.tracker import Match, MatchPlayer, Round, KillEvent, Player, DamageEvent, GrenadeEvent, WeaponStat, ClutchEvent
from app.models.global_match import GlobalMatch, GlobalMatchPlayer, PublicUserLookup
from app.core.config import settings

logger = logging.getLogger(__name__)

def normalize_side(side) -> str:
    s = str(side).upper().strip()
    if s in ("3", "CT"): return "CT"
    if s in ("2", "T", "TERRORIST"): return "T"
    return "UNKNOWN"

class ParserV2Service:
    """
    High-performance CS2 Demo Parser using demoparser2 (Rust-based).
    Replaces the slow awpy-based parser.
    """
    def __init__(self, demo_path: str):
        self.demo_path = demo_path
        self.parser = DemoParser(demo_path)

    async def parse_and_save(self, db: AsyncSession, match_id_override: str = None, match_date: datetime = None, demo_url: str = None, source: str = None):
        logger.info(f"ParserV2: Starting high-speed parse for {self.demo_path}")
        
        # 1. Extract Header and Basic Info
        header = self.parser.parse_header()
        map_name = header.get("map_name", "unknown")
        
        # 2. Extract Events (The fast way)
        # We fetch all necessary events in bulk
        
        # Kills
        kills_df = self.parser.parse_event("player_death", 
            player=["X", "Y", "Z", "team_num"], 
            other=["weapon", "is_headshot", "attacker_steamid", "user_steamid", "assister_steamid"]
        )
        # Rename user_steamid to victim_steamid for consistency with models
        if not kills_df.empty:
            kills_df = kills_df.rename(columns={"user_steamid": "victim_steamid"})
        
        # Rounds
        rounds_df = self.parser.parse_event("round_end", other=["winner", "reason"])
        
        # Damage
        damage_df = self.parser.parse_event("player_hurt", 
            player=["team_num"],
            other=["attacker_steamid", "user_steamid", "weapon", "dmg_health", "dmg_armor", "hitgroup"]
        )
        if not damage_df.empty:
            damage_df = damage_df.rename(columns={"user_steamid": "victim_steamid", "dmg_health": "hp_damage", "dmg_armor": "armor_damage"})

        # Grenades
        grenade_events = []
        for g_type in ["hegrenade_detonate", "flashbang_detonate", "smokegrenade_detonate", "molotov_detonate"]:
            df = self.parser.parse_event(g_type, player=["X", "Y", "Z"])
            if not df.empty:
                df["grenade_type"] = g_type.replace("_detonate", "").capitalize()
                grenade_events.append(df)
        
        grenades_df = pd.concat(grenade_events) if grenade_events else pd.DataFrame()
        if not grenades_df.empty:
            grenades_df = grenades_df.rename(columns={"user_steamid": "steamid"})

        # Blind events
        blind_df = self.parser.parse_event("player_blind", other=["attacker_steamid", "user_steamid", "blind_duration"])

        # 3. Match Start Detection (Skip Warmup)
        # Look for round_announce_match_start
        start_events = self.parser.parse_event("round_announce_match_start")
        start_tick = 0
        if not start_events.empty:
            start_tick = start_events["tick"].max()
        else:
            # Fallback: first firearm kill
            exclude_weapons = ["knife", "bayonet", "fists", "melee", "hegrenade", "flashbang", "smokegrenade", "molotov", "incgrenade", "decoy", "taser", "zeus"]
            if not kills_df.empty:
                firearm_kills = kills_df[~kills_df["weapon"].str.contains("|".join(exclude_weapons), case=False, na=False)]
                if not firearm_kills.empty:
                    first_kill_tick = firearm_kills["tick"].min()
                    # Find the round end before this kill
                    if not rounds_df.empty:
                        prev_rounds = rounds_df[rounds_df["tick"] < first_kill_tick]
                        if not prev_rounds.empty:
                            start_tick = prev_rounds["tick"].max()

        logger.info(f"ParserV2: Match start detected at tick {start_tick}")

        # Filter all dataframes by start_tick
        def filter_tick(df):
            if df.empty: return df
            return df[df["tick"] >= start_tick].copy()

        kills_df = filter_tick(kills_df)
        rounds_df = filter_tick(rounds_df)
        damage_df = filter_tick(damage_df)
        if not grenades_df.empty: grenades_df = filter_tick(grenades_df)
        if not blind_df.empty: blind_df = filter_tick(blind_df)

        # 4. Process Match ID
        if match_id_override and not match_id_override.startswith("manual_"):
            match_id = match_id_override
        else:
            # Generate hash-based ID
            import hashlib
            with open(self.demo_path, "rb") as f:
                file_hash = hashlib.md5(f.read(1024 * 1024)).hexdigest()
            match_id = f"demo_{file_hash[:16]}"

        # 5. Database Cleanup
        from app.models.tracker import MatchPlayer as MP, Round as R, KillEvent as KE, DamageEvent as DE, GrenadeEvent as GE, WeaponStat as WS, ClutchEvent as CE
        await db.execute(delete(MP).where(MP.match_id == match_id))
        await db.execute(delete(R).where(R.match_id == match_id))
        await db.execute(delete(KE).where(KE.match_id == match_id))
        await db.execute(delete(DE).where(DE.match_id == match_id))
        await db.execute(delete(GE).where(GE.match_id == match_id))
        await db.execute(delete(WS).where(WS.match_id == match_id))
        await db.execute(delete(CE).where(CE.match_id == match_id))
        await db.flush()

        # 6. Create/Update Match
        match = await db.get(Match, match_id)
        if not match:
            match = Match(match_id=match_id, map_name=map_name, match_date=match_date or datetime.now(), demo_url=demo_url, source=source or "demo")
            db.add(match)
        else:
            match.map_name = map_name
            match.match_date = match_date or match.match_date
            match.demo_url = demo_url or match.demo_url
            match.source = source or match.source

        # 7. Process Rounds and Scores
        # demoparser2 round_end 'winner' is usually 2 (T) or 3 (CT)
        score_a, score_b = 0, 0 # A=CT, B=T (Logical teams)
        last_round_winner = None
        
        # We need to map SteamIDs to Team A/B
        # Get team_num at the start of the match
        team_mapping = {}
        # We use ticks to find players and their teams at the beginning
        start_ticks = self.parser.parse_ticks(["team_num"], ticks=[start_tick + 128])
        if not start_ticks.empty:
            for _, row in start_ticks.iterrows():
                sid = str(row["steamid"])
                if sid != "0":
                    if row["team_num"] == 3: team_mapping[sid] = "A"
                    elif row["team_num"] == 2: team_mapping[sid] = "B"

        round_entities = []
        for i, row in rounds_df.sort_values("tick").reset_index(drop=True).iterrows():
            round_num = i + 1
            winner_side = "CT" if row["winner"] == 3 else "T"
            
            # Simple score tracking for now (A=CT, B=T)
            if winner_side == "CT": score_a += 1
            else: score_b += 1
            
            r = Round(
                match_id=match_id, 
                round_number=round_num, 
                winner_side=winner_side, 
                reason=str(row.get("reason", "unknown")), 
                end_tick=int(row["tick"])
            )
            round_entities.append(r)
            db.add(r)
        
        await db.flush() # To get round_ids
        round_map = {r.end_tick: r.round_id for r in round_entities}

        def get_round_id(tick):
            for end_tick, rid in sorted(round_map.items()):
                if tick <= end_tick: return rid
            return round_entities[-1].round_id if round_entities else None

        # 8. Process Players and Stats
        all_players = set()
        if not kills_df.empty:
            all_players.update(kills_df["attacker_steamid"].dropna().unique())
            all_players.update(kills_df["victim_steamid"].dropna().unique())
        
        # Calculate stats per player
        player_stats = {}
        num_rounds = len(round_entities) or 1

        for sid in all_players:
            sid_str = str(int(sid))
            if sid_str == "0": continue
            
            # Basic K/D/A
            p_kills = kills_df[kills_df["attacker_steamid"] == sid]
            p_deaths = kills_df[kills_df["victim_steamid"] == sid]
            p_assists = kills_df[kills_df["assister_steamid"] == sid]
            
            kills_count = len(p_kills)
            deaths_count = len(p_deaths)
            assists_count = len(p_assists)
            hs_count = len(p_kills[p_kills["is_headshot"] == True])
            
            # Damage & ADR
            p_dmg = damage_df[damage_df["attacker_steamid"] == sid]["hp_damage"].sum()
            adr = float(p_dmg) / num_rounds
            
            # Grenades
            p_grenades = grenades_df[grenades_df["steamid"] == sid] if not grenades_df.empty else pd.DataFrame()
            he_thrown = len(p_grenades[p_grenades["grenade_type"] == "He"])
            flash_thrown = len(p_grenades[p_grenades["grenade_type"] == "Flashbang"])
            smokes_thrown = len(p_grenades[p_grenades["grenade_type"] == "Smokegrenade"])
            molotovs_thrown = len(p_grenades[p_grenades["grenade_type"].isin(["Molotov", "Incendiary"])])

            # Flash stats
            p_blind = blind_df[blind_df["attacker_steamid"] == sid] if not blind_df.empty else pd.DataFrame()
            enemies_flashed = p_blind["user_steamid"].nunique()
            total_blind = p_blind["blind_duration"].sum()

            # Create/Update Player record
            player_record = await db.get(Player, int(sid))
            if not player_record:
                player_record = Player(steamid64=int(sid), personaname=f"Player_{sid_str}")
                db.add(player_record)

            # MatchPlayer
            # Heuristic for rating (Simplified)
            rating = (adr / 80.0) + (kills_count / num_rounds) - (deaths_count / num_rounds * 0.1)
            
            mp = MatchPlayer(
                match_id=match_id,
                steamid64=int(sid),
                team=team_mapping.get(sid_str, "unknown"),
                kills=kills_count,
                deaths=deaths_count,
                assists=assists_count,
                adr=adr,
                kast=70.0, # Placeholder, KAST is complex to calculate accurately
                rating=rating,
                hs_count=hs_count,
                utility_damage=int(damage_df[(damage_df["attacker_steamid"] == sid) & (damage_df["weapon"].isin(["hegrenade", "molotov", "incendiary"]))]["hp_damage"].sum()),
                flash_assists=0, # Need to track this from blind events + kills
                he_thrown=he_thrown,
                flash_thrown=flash_thrown,
                smokes_thrown=smokes_thrown,
                molotovs_thrown=molotovs_thrown,
                enemies_flashed=enemies_flashed,
                total_blind_duration=float(total_blind)
            )
            db.add(mp)
            player_stats[sid_str] = {"kills": kills_count, "deaths": deaths_count, "assists": assists_count, "adr": adr, "hs": hs_count, "name": f"Player_{sid_str}"}

        # 9. Process Kill Events
        for _, row in kills_df.iterrows():
            a_sid = int(row["attacker_steamid"]) if pd.notna(row["attacker_steamid"]) else None
            v_sid = int(row["victim_steamid"]) if pd.notna(row["victim_steamid"]) else None
            
            ke = KillEvent(
                match_id=match_id,
                round_id=get_round_id(row["tick"]),
                tick=int(row["tick"]),
                attacker_steamid=a_sid,
                victim_steamid=v_sid,
                weapon=str(row["weapon"]),
                is_headshot=bool(row["is_headshot"]),
                attacker_x=float(row.get("attacker_X", 0)),
                attacker_y=float(row.get("attacker_Y", 0)),
                attacker_z=float(row.get("attacker_Z", 0)),
                victim_x=float(row.get("X", 0)),
                victim_y=float(row.get("Y", 0)),
                victim_z=float(row.get("Z", 0))
            )
            db.add(ke)

        # 10. Process Damage Events
        for _, row in damage_df.iterrows():
            a_sid = int(row["attacker_steamid"]) if pd.notna(row["attacker_steamid"]) else None
            v_sid = int(row["victim_steamid"]) if pd.notna(row["victim_steamid"]) else None
            
            de = DamageEvent(
                match_id=match_id,
                round_id=get_round_id(row["tick"]),
                tick=int(row["tick"]),
                attacker_steamid=a_sid,
                victim_steamid=v_sid,
                weapon=str(row["weapon"]),
                hp_damage=int(row["hp_damage"]),
                armor_damage=int(row["armor_damage"]),
                hitgroup=int(row["hitgroup"])
            )
            db.add(de)

        # 11. Finalize Match Info
        match.score_ct = score_a
        match.score_t = score_b
        match.winner_team = "CT" if score_a > score_b else ("T" if score_b > score_a else "Draw")
        match.is_parsed = True
        match.parsed_at = datetime.now()
        match.duration_seconds = int((rounds_df["tick"].max() - start_tick) / 64) if not rounds_df.empty else 0

        await db.commit()
        logger.info(f"ParserV2: Successfully finished match {match_id}")

        # 12. Sync with GlobalMatch System
        try:
            # Re-using the logic from the original parser for consistency
            match_meta = {
                "demo_url": demo_url,
                "score_ct": score_a,
                "score_t": score_b,
                "duration_seconds": match.duration_seconds
            }
            
            gm_stmt = insert(GlobalMatch).values(
                id=match_id,
                source=source or "demo",
                mapName=map_name,
                duration=f"{match.duration_seconds // 60} min" if match.duration_seconds else "45 min",
                matchDate=match_date or datetime.now(),
                scoreA=score_a,
                scoreB=score_b,
                metadata=match_meta
            ).on_conflict_do_update(
                index_elements=['id'],
                set_={
                    "scoreA": score_a,
                    "scoreB": score_b,
                    "mapName": map_name,
                    "metadata": match_meta
                }
            )
            await db.execute(gm_stmt)

            for sid_str, stats in player_stats.items():
                user_stmt = select(PublicUserLookup).where(PublicUserLookup.steamId == sid_str)
                user_res = await db.execute(user_stmt)
                user_lookup = user_res.scalar_one_or_none()
                user_id = user_lookup.id if user_lookup else None

                gmp_stmt = insert(GlobalMatchPlayer).values(
                    id=f"{match_id}_{sid_str}",
                    globalMatchId=match_id,
                    steamId=sid_str,
                    userId=user_id,
                    team="unknown", # We can improve this by checking final team
                    kills=stats["kills"],
                    deaths=stats["deaths"],
                    assists=stats["assists"],
                    score=0,
                    mvps=0,
                    adr=stats["adr"],
                    hsPercentage=round((stats["hs"] / stats["kills"] * 100), 1) if stats["kills"] > 0 else 0.0,
                    matchResult="tie",
                    metadata={"name": stats["name"]}
                ).on_conflict_do_update(
                    constraint="GlobalMatchPlayer_pkey",
                    set_={
                        "kills": stats["kills"],
                        "deaths": stats["deaths"],
                        "userId": user_id
                    }
                )
                await db.execute(gmp_stmt)
            
            await db.commit()
        except Exception as sync_err:
            logger.error(f"ParserV2: Error syncing GlobalMatch: {sync_err}")

        return match_id
