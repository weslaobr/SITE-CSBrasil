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
            
def normalize_side(side) -> str:
    s = str(side).upper().strip()
    if s in ("3", "CT"): return "CT"
    if s in ("2", "T", "TERRORIST"): return "T"
    return "UNKNOWN"

import pandas as pd
from typing import Dict, Any, List
from app.models.tracker import Match, MatchPlayer, Round, KillEvent, Player, DamageEvent, GrenadeEvent, WeaponStat, ClutchEvent
from app.models.global_match import GlobalMatch, GlobalMatchPlayer, PublicUserLookup
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
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
        start_tick = 0
        try:
            match_start_events = []
            if hasattr(self.dem, 'events') and "round_announce_match_start" in self.dem.events:
                match_start_events = self.dem.events["round_announce_match_start"]["tick"].tolist()
            
            exclude_weapons = [
                "knife", "bayonet", "fists", "melee", "hegrenade", "flashbang", 
                "smokegrenade", "molotov", "incgrenade", "decoy", "inferno", "taser", "zeus"
            ]
            exclude_pattern = "|".join(exclude_weapons)
            non_knife_kills = self.dem.kills[~self.dem.kills["weapon"].str.contains(exclude_pattern, case=False, na=False)]
            first_firearm_kill_tick = non_knife_kills["tick"].min() if not non_knife_kills.empty else float('inf')
            
            candidate_starts = [t for t in match_start_events if t < first_firearm_kill_tick]
            if candidate_starts:
                start_tick = max(candidate_starts)
            elif first_firearm_kill_tick != float('inf'):
                try:
                    prev_rounds = self.dem.rounds[self.dem.rounds["end_tick"] < first_firearm_kill_tick]
                    start_tick = prev_rounds["end_tick"].max() if not prev_rounds.empty else 0
                except:
                    start_tick = 0
            
            logger.info(f"Parser: Strict match start detected at tick {start_tick} (Firearm kill at {first_firearm_kill_tick})")
        except Exception as e:
            logger.warning(f"Parser: Error in strict match start detection: {e}")

        def filter_df(df, tick_col="tick"):
            if df is not None and tick_col in df.columns:
                if hasattr(df, "empty") and df.empty: return df
                if not hasattr(df, "empty") and len(df) == 0: return df
                return df[df[tick_col] >= start_tick].copy()
            return df

        # Filter all DataFrames
        self.dem.rounds = filter_df(self.dem.rounds, "end_tick")
        self.dem.kills = filter_df(self.dem.kills)
        self.dem.damages = filter_df(self.dem.damages)
        self.dem.grenades = filter_df(self.dem.grenades, "tick")
        if hasattr(self.dem, 'ticks'):
            self.dem.ticks = filter_df(self.dem.ticks)

        if not self.dem.rounds.empty:
            self.dem.rounds = self.dem.rounds.sort_values("end_tick").reset_index(drop=True)
            self.dem.rounds["round"] = self.dem.rounds.index + 1
        
        extracted_id = self.dem.header.get("match_id") or self.dem.header.get("client_name")
        if not extracted_id or extracted_id in ["Counter-Strike 2", "mock_share_code"]:
            import hashlib
            with open(self.demo_path, "rb") as f:
                file_hash = hashlib.md5(f.read(1024 * 1024)).hexdigest()
            extracted_id = f"demo_{file_hash}"
            
        match_id = match_id_override or extracted_id
        map_name = self.dem.header["map_name"]
        
        # 0. Cleanup
        from app.models.tracker import MatchPlayer as MP, Round as R, KillEvent as KE, DamageEvent as DE, GrenadeEvent as GE, WeaponStat as WS, ClutchEvent as CE
        
        logger.info(f"Parser: Cleaning up old records for match {match_id}")
        await db.execute(delete(MP).where(MP.match_id == match_id))
        await db.execute(delete(R).where(R.match_id == match_id))
        await db.execute(delete(KE).where(KE.match_id == match_id))
        await db.execute(delete(DE).where(DE.match_id == match_id))
        await db.execute(delete(GE).where(GE.match_id == match_id))
        await db.execute(delete(WS).where(WS.match_id == match_id))
        await db.execute(delete(CE).where(CE.match_id == match_id))
        await db.flush()

        # 0.5. Fetch or Create Match
        from app.models.tracker import Match
        match = await db.get(Match, match_id)
        if not match:
            match = Match(match_id=match_id, map_name=map_name, match_date=match_date or datetime.now(), demo_url=demo_url, source=source or "vanilla")
            db.add(match)
        else:
            match.map_name = map_name
            if match_date: match.match_date = match_date
            if demo_url: match.demo_url = demo_url
            if source: match.source = source
        
        score_a, score_b = 0, 0
        last_round_winner = None
        team_mapping = {}
        
        try:
            if hasattr(self.dem, 'ticks') and not self.dem.ticks.empty:
                for offset in [64, 128, 256, 512, 1024]:
                    start_ticks_df = self.dem.ticks[(self.dem.ticks["tick"] >= start_tick + offset - 10) & (self.dem.ticks["tick"] <= start_tick + offset + 10)]
                    if not start_ticks_df.empty:
                        for _, row in start_ticks_df.drop_duplicates("steamid").iterrows():
                            sid = row["steamid"]
                            if sid not in team_mapping:
                                team_num = row.get("team_num", row.get("team_number", 0))
                                if team_num == 3: team_mapping[sid] = "A"
                                elif team_num == 2: team_mapping[sid] = "B"
                    if len(team_mapping) >= 10: break
            
            rounds_df = self.dem.rounds
            if not rounds_df.empty and team_mapping:
                last_side_a = "CT"
                for _, r_row in rounds_df.iterrows():
                    winner_side = r_row["winner_side"]
                    end_tick = r_row["end_tick"]
                    current_side_a = "unknown"
                    sids_a = [sid for sid, t in team_mapping.items() if t == "A"]
                    if sids_a and hasattr(self.dem, 'ticks'):
                        end_ticks_df = self.dem.ticks[(self.dem.ticks["tick"] >= end_tick - 64) & (self.dem.ticks["tick"] <= end_tick)]
                        players_at_end = end_ticks_df[end_ticks_df["steamid"].isin(sids_a)]
                        if not players_at_end.empty:
                            m = players_at_end.groupby("steamid").last()["team_num"] if "team_num" in players_at_end.columns else players_at_end.groupby("steamid").last().get("team_number")
                            if m is not None and not m.empty:
                                team_nums_mode = m.mode()
                                if not team_nums_mode.empty:
                                    dominant_team = team_nums_mode[0]
                                    current_side_a = "CT" if dominant_team == 3 else "T"
                                    last_side_a = current_side_a

                    det_side_a = current_side_a if current_side_a != "unknown" else last_side_a
                    if normalize_side(det_side_a) == normalize_side(winner_side):
                        score_a += 1
                        last_round_winner = "A"
                    else:
                        score_b += 1
                        last_round_winner = "B"
            else:
                score_a = int(rounds_df[rounds_df["winner_side"] == "CT"].shape[0]) if not rounds_df.empty else 0
                score_b = int(rounds_df[rounds_df["winner_side"] == "T"].shape[0]) if not rounds_df.empty else 0
        except Exception as e:
            logger.warning(f"Parser: Error calculating logical scores: {e}")
            score_a = int(rounds_df[rounds_df["winner_side"] == "CT"].shape[0]) if not rounds_df.empty else 0
            score_b = int(rounds_df[rounds_df["winner_side"] == "T"].shape[0]) if not rounds_df.empty else 0

        # --- MEMORY OPTIMIZATION: Ticks are no longer needed after this point ---
        if hasattr(self.dem, 'ticks'):
            logger.info("Parser: Freeing 'ticks' memory")
            del self.dem.ticks
            import gc
            gc.collect()

        if last_round_winner == "A":
            s1, s2 = max(score_a, score_b), min(score_a, score_b)
            score_a, score_b = s1, s2
            match.winner_team = "CT_INITIAL"
        elif last_round_winner == "B":
            s1, s2 = max(score_a, score_b), min(score_a, score_b)
            score_a, score_b = s2, s1
            match.winner_team = "T_INITIAL"
        else:
            match.winner_team = "Draw"
        
        match.score_ct = score_a
        match.score_t = score_b

        if not rounds_df.empty and "end_tick" in rounds_df.columns:
            max_tick = rounds_df["end_tick"].max()
            match.duration_seconds = int(max_tick / 64)
        
        # 2. Players
        player_stats_agg = self.dem.player_stats
        kills_by_player = self.dem.kills.groupby("attacker_steamid").size().to_dict() if not self.dem.kills.empty else {}
        deaths_by_player = self.dem.kills.groupby("victim_steamid").size().to_dict() if not self.dem.kills.empty else {}
        hs_by_player = self.dem.kills[self.dem.kills["is_headshot"] == True].groupby("attacker_steamid").size().to_dict() if not self.dem.kills.empty else {}
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
            
            pkills = int(kills_by_player.get(steamid, 0))
            pdeaths = int(deaths_by_player.get(steamid, 0))
            phscount = int(hs_by_player.get(steamid, 0))
            pdmg = float(dmg_by_player.get(steamid, 0))
            padr = pdmg / num_rounds if num_rounds > 0 else 0.0
            p_logical_team = team_mapping.get(steamid, row["team_name"])

            # Grenade counts for this player
            p_grenades = self.dem.grenades[self.dem.grenades["thrower_steamid"] == steamid] if not self.dem.grenades.empty else pd.DataFrame()
            phe_thrown = int(p_grenades[p_grenades["grenade_type"] == "HeGrenade"].shape[0])
            pflash_thrown = int(p_grenades[p_grenades["grenade_type"] == "Flashbang"].shape[0])
            psmoke_thrown = int(p_grenades[p_grenades["grenade_type"] == "SmokeGrenade"].shape[0])
            pmolotov_thrown = int(p_grenades[p_grenades["grenade_type"].isin(["Molotov", "IncendiaryGrenade"])].shape[0])

            mp_stats = MatchPlayer(
                match_id=match_id, steamid64=steamid, team=p_logical_team, kills=pkills, deaths=pdeaths,
                assists=int(row["assists"]), adr=padr, kast=float(row["kast"]), rating=float(row["rating"]),
                hs_count=phscount, utility_damage=int(row["utility_damage"]), flash_assists=int(row["flash_assists"]),
                fk=0, fd=0, triples=int(row.get("triple_kills", row.get("3k", 0))),
                quads=int(row.get("quad_kills", row.get("4k", 0))), aces=int(row.get("ace_kills", row.get("5k", 0))),
                clutches=int(row.get("clutch_wins", row.get("clutches", 0))), trades=int(row.get("trade_kills", row.get("trades", 0))),
                enemies_flashed=0, total_blind_duration=0.0, avg_kill_distance=0.0, avg_ttd=0.0, utility_damage_roi=0.0,
                he_thrown=phe_thrown, flash_thrown=pflash_thrown, smokes_thrown=psmoke_thrown, molotovs_thrown=pmolotov_thrown
            )
            db.add(mp_stats)

        # Advanced Stats Calculation
        kills_df_early = self.dem.kills.copy() if not self.dem.kills.empty else pd.DataFrame()
        if not kills_df_early.empty and 'round' in kills_df_early.columns:
            fk_counts, fd_counts = {}, {}
            for round_num, round_kills in kills_df_early.groupby('round'):
                first_kill_row = round_kills.nsmallest(1, 'tick').iloc[0]
                attacker = first_kill_row['attacker_steamid']
                victim = first_kill_row['victim_steamid']
                if attacker: fk_counts[attacker] = fk_counts.get(attacker, 0) + 1
                if victim: fd_counts[victim] = fd_counts.get(victim, 0) + 1
            
            for sid in team_mapping.keys():
                fk_val = fk_counts.get(sid, 0)
                fd_val = fd_counts.get(sid, 0)
                if fk_val > 0 or fd_val > 0:
                    await db.execute(update(MP).where(MP.match_id == match_id, MP.steamid64 == int(sid)).values(fk=fk_val, fd=fd_val))

            # Weapon Breakdown
            weapon_groups = kills_df_early.groupby(['attacker_steamid', 'weapon'])
            for (attacker_sid, weapon_name), group in weapon_groups:
                if not attacker_sid: continue
                w_kills, w_hs = len(group), len(group[group['is_headshot'] == True])
                w_damage = 0
                if not self.dem.damages.empty:
                    w_damage = self.dem.damages[(self.dem.damages['attacker_steamid'] == attacker_sid) & (self.dem.damages['weapon'] == weapon_name)]['hp_damage'].sum()
                db.add(WeaponStat(match_id=match_id, steamid64=int(attacker_sid), weapon=weapon_name, kills=w_kills, headshots=w_hs, damage=int(w_damage)))

            # Flash Effectiveness
            if hasattr(self.dem, 'events') and 'player_blind' in self.dem.events:
                blind_events = filter_df(self.dem.events['player_blind'])
                attacker_col = 'attacker_steamid' if 'attacker_steamid' in blind_events.columns else 'attacker_pawn_steamid'
                if attacker_col in blind_events.columns:
                    flash_stats = blind_events.groupby(attacker_col).agg(count=('victim_steamid', 'nunique'), duration=('blind_duration', 'sum'))
                    for sid, f_row in flash_stats.iterrows():
                        await db.execute(update(MP).where(MP.match_id == match_id, MP.steamid64 == int(sid)).values(enemies_flashed=int(f_row['count']), total_blind_duration=float(f_row['duration'])))

            # Kill Distance
            if 'attacker_pos_x' in kills_df_early.columns:
                import numpy as np
                def calc_dist(r):
                    try: return np.linalg.norm(np.array([r['attacker_pos_x'], r['attacker_pos_y'], r['attacker_pos_z']]) - np.array([r['victim_pos_x'], r['victim_pos_y'], r['victim_pos_z']]))
                    except: return 0.0
                kills_df_early['distance'] = kills_df_early.apply(calc_dist, axis=1)
                dist_stats = kills_df_early.groupby('attacker_steamid')['distance'].mean()
                for sid, avg_dist in dist_stats.items():
                    if sid: await db.execute(update(MP).where(MP.match_id == match_id, MP.steamid64 == int(sid)).values(avg_kill_distance=float(avg_dist)))

            # Clutch Analysis
            if hasattr(self.dem, 'clutches') and not self.dem.clutches.empty:
                clutches_df = filter_df(self.dem.clutches, "tick")
                for _, c_row in clutches_df.iterrows():
                    db.add(ClutchEvent(match_id=match_id, steamid64=int(c_row['steamid']), clutch_type=f"1v{c_row['opponents_at_start']}", is_won=bool(c_row['is_won'])))

        # 3. Rounds
        round_map = {}
        for idx, row in self.dem.rounds.iterrows():
            ct_val = int(row.get("ct_eq_val", row.get("ct_equipment_value", 0)))
            t_val = int(row.get("t_eq_val", row.get("t_equipment_value", 0)))
            def get_buy_type(val):
                if val < 5000: return "Eco"
                if val < 15000: return "Force"
                return "Full Buy"
            new_round = Round(match_id=match_id, round_number=int(row["round"]), winner_side=row["winner_side"], reason=row["reason"], end_tick=int(row["end_tick"]), 
                             ct_equipment_value=ct_val, t_equipment_value=t_val, ct_buy_type=get_buy_type(ct_val), t_buy_type=get_buy_type(t_val))
            db.add(new_round)
            await db.flush() 
            round_map[int(row["end_tick"])] = new_round.round_id

        def get_round_id(tick):
            for end_tick, rid in sorted(round_map.items()):
                if tick <= end_tick: return rid
            return None

        # 4. Kills
        victim_weapon_map = {}
        try:
            if hasattr(self.dem, 'events'):
                ie_df = pd.DataFrame()
                if "item_equip" in self.dem.events and not self.dem.events["item_equip"].empty:
                    ie_df = self.dem.events["item_equip"][["tick", "user_steamid", "item"]].rename(columns={"item": "weapon"})
                elif "weapon_fire" in self.dem.events and not self.dem.events["weapon_fire"].empty:
                    ie_df = self.dem.events["weapon_fire"][["tick", "user_steamid", "weapon"]]
                
                if not ie_df.empty and not self.dem.kills.empty:
                    ie_df = ie_df.dropna(subset=["user_steamid"]).sort_values("tick")
                    ie_df["user_steamid"] = ie_df["user_steamid"].astype(str)
                    k_df = self.dem.kills[["tick", "victim_steamid"]].dropna(subset=["victim_steamid"]).sort_values("tick")
                    k_df["victim_steamid"] = k_df["victim_steamid"].astype(str)
                    merged = pd.merge_asof(k_df, ie_df, on="tick", left_by="victim_steamid", right_by="user_steamid", direction="backward")
                    for _, r in merged.iterrows():
                        if pd.notna(r.get("weapon")):
                            victim_weapon_map[(int(r["tick"]), str(r["victim_steamid"]))] = str(r["weapon"])
        except Exception as e:
            logger.warning(f"Parser: Could not extract victim weapons: {e}")

        # Precalculate victim HP before fatal shot
        pre_duel_hp_map = {}
        try:
            if hasattr(self.dem, 'damages') and not self.dem.damages.empty:
                dmg_df = self.dem.damages.copy().sort_values("tick")
                # Group by victim_steamid
                # Calculate running HP loss
                
                # A simpler approach: For each kill, find all damages to this victim in the same round, BEFORE this tick.
                # Since pandas iterrows is slow for nested loops, we will do a fast grouping.
                if not dmg_df.empty:
                    dmg_df['round_id'] = dmg_df['tick'].apply(get_round_id)
                    
                    for _, row in self.dem.kills.iterrows():
                        k_tick = int(row["tick"])
                        v_sid = int(row["victim_steamid"]) if row["victim_steamid"] else None
                        a_sid = int(row["attacker_steamid"]) if row["attacker_steamid"] else None
                        r_id = get_round_id(k_tick)
                        
                        if v_sid:
                            past_dmg_v = dmg_df[(dmg_df['round_id'] == r_id) & (dmg_df['victim_steamid'] == v_sid) & (dmg_df['tick'] < k_tick)]
                            if 'health_damage' in past_dmg_v.columns: total_dmg_v = past_dmg_v['health_damage'].sum()
                            else: total_dmg_v = past_dmg_v['hp_damage'].apply(lambda x: min(x, 100)).sum()
                            pre_duel_hp_map[(k_tick, str(v_sid))] = max(1, 100 - total_dmg_v)
                            
                        if a_sid:
                            past_dmg_a = dmg_df[(dmg_df['round_id'] == r_id) & (dmg_df['victim_steamid'] == a_sid) & (dmg_df['tick'] < k_tick)]
                            if 'health_damage' in past_dmg_a.columns: total_dmg_a = past_dmg_a['health_damage'].sum()
                            else: total_dmg_a = past_dmg_a['hp_damage'].apply(lambda x: min(x, 100)).sum()
                            pre_duel_hp_map[(k_tick, str(a_sid))] = max(1, 100 - total_dmg_a)
        except Exception as e:
            logger.warning(f"Parser: Could not calculate pre-duel HP: {e}")

        for _, row in self.dem.kills.iterrows():
            v_steamid = int(row["victim_steamid"]) if row["victim_steamid"] else None
            a_steamid = int(row["attacker_steamid"]) if row["attacker_steamid"] else None
            v_weap = victim_weapon_map.get((int(row["tick"]), str(v_steamid))) if v_steamid else None
            
            # Use calculated pre-duel HP if available, otherwise default to 100
            v_hp = pre_duel_hp_map.get((int(row["tick"]), str(v_steamid)))
            if v_hp is None:
                v_hp = int(row.get("victim_hp", 100))
                if v_hp == 0: v_hp = 100 # If parser outputs 0, assume 100 as fallback for pre-duel
                
            a_hp = pre_duel_hp_map.get((int(row["tick"]), str(a_steamid)))
            if a_hp is None:
                a_hp = int(row.get("attacker_hp", 100))
                
            db.add(KillEvent(match_id=match_id, round_id=get_round_id(int(row["tick"])), tick=int(row["tick"]), attacker_steamid=a_steamid,
                            victim_steamid=v_steamid, weapon=row["weapon"], victim_weapon=v_weap, is_headshot=bool(row["is_headshot"]), distance=float(row.get("distance", 0.0)),
                            attacker_x=float(row.get("attacker_pos_x", 0)), attacker_y=float(row.get("attacker_pos_y", 0)), attacker_z=float(row.get("attacker_pos_z", 0)),
                            victim_x=float(row.get("victim_pos_x", 0)), victim_y=float(row.get("victim_pos_y", 0)), victim_z=float(row.get("victim_pos_z", 0)),
                            attacker_hp=a_hp, victim_hp=v_hp))

        # 5. Damage
        for _, row in self.dem.damages.iterrows():
            db.add(DamageEvent(match_id=match_id, round_id=get_round_id(int(row["tick"])), tick=int(row["tick"]), attacker_steamid=int(row["attacker_steamid"]) if row["attacker_steamid"] else None,
                              victim_steamid=int(row["victim_steamid"]) if row["victim_steamid"] else None, weapon=row["weapon"], hp_damage=int(row["hp_damage"]), armor_damage=int(row["armor_damage"]), hitgroup=int(row["hitgroup"])))

        # 6. Grenades
        for _, row in self.dem.grenades.iterrows():
            db.add(GrenadeEvent(match_id=match_id, round_id=get_round_id(int(row["tick"])), tick=int(row["tick"]), steamid64=int(row["thrower_steamid"]) if row["thrower_steamid"] else None, grenade_type=row["grenade_type"],
                               x=float(row.get("x", 0)), y=float(row.get("y", 0)), z=float(row.get("z", 0))))

        match.is_parsed = True
        match.parsed_at = pd.Timestamp.now()
        await db.commit()
        logger.info(f"Parser: Successfully finished match {match_id}")

        # 7. Sync with GlobalMatch System (for main site history and Tropoints)
        try:
            from sqlalchemy.dialects.postgresql import insert
            
            # Upsert GlobalMatch
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

            # Upsert GlobalMatchPlayer for each player
            for _, row in player_stats_agg.iterrows():
                sid = str(int(row["steamid"]))
                p_logical_team = team_mapping.get(int(sid), row["team_name"])
                
                # Try to link to a User ID
                user_stmt = select(PublicUserLookup).where(PublicUserLookup.steamId == sid)
                user_res = await db.execute(user_stmt)
                user_lookup = user_res.scalar_one_or_none()
                user_id = user_lookup.id if user_lookup else None

                p_res = "tie"
                if last_round_winner == "A":
                    p_res = "win" if p_logical_team == "A" else "loss"
                elif last_round_winner == "B":
                    p_res = "win" if p_logical_team == "B" else "loss"

                gmp_stmt = insert(GlobalMatchPlayer).values(
                    id=f"{match_id}_{sid}",
                    globalMatchId=match_id,
                    steamId=sid,
                    userId=user_id,
                    team=str(p_logical_team),
                    kills=int(kills_by_player.get(int(sid), 0)),
                    deaths=int(deaths_by_player.get(int(sid), 0)),
                    assists=int(row["assists"]),
                    score=int(row.get("score", 0)),
                    mvps=int(row.get("mvps", 0)),
                    adr=float(dmg_by_player.get(int(sid), 0)) / num_rounds if num_rounds > 0 else 0.0,
                    hsPercentage=round((int(hs_by_player.get(int(sid), 0)) / int(kills_by_player.get(int(sid), 0)) * 100), 1) if kills_by_player.get(int(sid), 0) > 0 else 0.0,
                    matchResult=p_res,
                    metadata={
                        "name": row["name"],
                        "rating": float(row["rating"]),
                        "kast": float(row["kast"]),
                        "utility_damage": int(row["utility_damage"]),
                        "flash_assists": int(row["flash_assists"])
                    }
                ).on_conflict_do_update(
                    constraint="GlobalMatchPlayer_pkey", # Or index_elements=['globalMatchId', 'steamId']
                    set_={
                        "kills": int(kills_by_player.get(int(sid), 0)),
                        "deaths": int(deaths_by_player.get(int(sid), 0)),
                        "matchResult": p_res,
                        "userId": user_id
                    }
                )
                await db.execute(gmp_stmt)
            
            await db.commit()
            logger.info(f"Parser: Successfully synced GlobalMatch tables for {match_id}")

        except Exception as sync_err:
            logger.error(f"Parser: Error syncing GlobalMatch tables for {match_id}: {sync_err}")

        # Trigger Ranking update
        try:
            from app.services.ranking_service import RankingService
            await RankingService.process_match_rankings(db, match_id)
        except Exception as rank_err:
            logger.error(f"Parser: Error updating rankings for {match_id}: {rank_err}")

        return match_id
