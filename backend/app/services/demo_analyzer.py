"""
DemoAnalyzerService: Downloads a CS2 demo, parses it with awpy,
and saves the results into GlobalMatch + GlobalMatchPlayer (Prisma tables).
Also links players to existing User accounts by SteamID automatically.
"""

import os
import uuid
import bz2
import logging
import requests
import pandas as pd
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings

logger = logging.getLogger(__name__)


# ─── awpy import with fallback mock ───────────────────────────────────────────

try:
    from awpy import Demo
    AWPY_AVAILABLE = True
    logger.info("awpy loaded successfully ✅")
except ImportError:
    AWPY_AVAILABLE = False
    logger.warning("awpy not available — using mock data for testing")

    class Demo:
        def __init__(self, path):
            self.path = path
            self.header = {"map_name": "de_mirage", "client_name": "mock_demo"}
            self.player_stats = pd.DataFrame([
                {"steamid": "76561198000000001", "name": "Player_CT_1", "team_name": "CT",
                 "kills": 22, "deaths": 14, "assists": 4, "adr": 98.5, "kast": 0.78,
                 "rating": 1.25, "headshot_kills": 14, "utility_damage": 320, "flash_assists": 3,
                 "score": 28, "mvps": 3},
                {"steamid": "76561198000000002", "name": "Player_CT_2", "team_name": "CT",
                 "kills": 18, "deaths": 16, "assists": 6, "adr": 82.0, "kast": 0.71,
                 "rating": 1.05, "headshot_kills": 9, "utility_damage": 280, "flash_assists": 5,
                 "score": 22, "mvps": 2},
                {"steamid": "76561198000000003", "name": "Player_T_1", "team_name": "T",
                 "kills": 15, "deaths": 18, "assists": 3, "adr": 74.0, "kast": 0.65,
                 "rating": 0.91, "headshot_kills": 8, "utility_damage": 180, "flash_assists": 1,
                 "score": 18, "mvps": 1},
            ])
            self.rounds = pd.DataFrame([
                {"round": 1, "winner_side": "CT", "reason": "ct_win_elimination", "end_tick": 2000},
                {"round": 2, "winner_side": "T", "reason": "t_win_elimination", "end_tick": 4500},
            ])
            self.kills = pd.DataFrame([
                {"tick": 150, "round": 1, "attacker_steamid": "76561198000000001",
                 "victim_steamid": "76561198000000003", "weapon": "ak47", "is_headshot": True},
            ])

        def parse(self):
            pass

def normalize_side(side) -> str:
    s = str(side).upper().strip()
    if s in ("3", "CT"): return "CT"
    if s in ("2", "T", "TERRORIST"): return "T"
    return "UNKNOWN"


# ─── Main Service ─────────────────────────────────────────────────────────────

class DemoAnalyzerService:

    def __init__(self, demo_url: str):
        self.demo_url = demo_url
        self.demo_path: Optional[str] = None

    # ------------------------------------------------------------------
    # Step 1: Download
    # ------------------------------------------------------------------

    def download(self) -> str:
        """Downloads (and decompresses if .bz2) the demo file. Returns local path."""
        filename = self.demo_url.split("/")[-1].split("?")[0]
        local_path = os.path.join(settings.DEMO_PATH, filename)

        # Already downloaded
        if os.path.exists(local_path):
            logger.info(f"Demo already cached: {local_path}")
            self.demo_path = local_path
            return local_path

        logger.info(f"Downloading demo: {self.demo_url}")
        r = requests.get(self.demo_url, stream=True, timeout=120)
        r.raise_for_status()

        with open(local_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=65536):
                f.write(chunk)

        # Decompress .bz2
        if filename.endswith(".bz2"):
            decompressed_name = filename[:-4]
            decompressed_path = os.path.join(settings.DEMO_PATH, decompressed_name)
            logger.info(f"Decompressing {filename} → {decompressed_name}")
            with bz2.BZ2File(local_path) as fr, open(decompressed_path, "wb") as fw:
                for chunk in iter(lambda: fr.read(65536), b""):
                    fw.write(chunk)
            self.demo_path = decompressed_path
            return decompressed_path

        self.demo_path = local_path
        return local_path

    # ------------------------------------------------------------------
    # Step 2: Parse + Save to GlobalMatch / GlobalMatchPlayer
    # ------------------------------------------------------------------

    async def analyze_and_save(self, db: AsyncSession, submitted_by_steamid: Optional[str] = None) -> dict:
        """
        Full pipeline: parse demo → save GlobalMatch + GlobalMatchPlayer.
        Returns a summary dict with match info and player stats.
        """
        from app.models.global_match import GlobalMatch, GlobalMatchPlayer, PublicUserLookup

        if not self.demo_path:
            raise RuntimeError("Call download() before analyze_and_save()")

        logger.info(f"Parsing demo: {self.demo_path}")
        dem = Demo(self.demo_path)
        dem.parse()

        # --- Strict Match Start Detection (Exclude Knife/Warmup) ---
        start_tick = 0
        try:
            # 1. Identify match start events (restarts)
            match_start_events = []
            if hasattr(dem, "events") and "round_announce_match_start" in dem.events:
                match_start_events = dem.events["round_announce_match_start"]["tick"].tolist()
            
            # 2. Identify first firearm kill
            exclude_weapons = [
                "knife", "bayonet", "fists", "melee", "hegrenade", "flashbang", 
                "smokegrenade", "molotov", "incgrenade", "decoy", "inferno", "taser", "zeus"
            ]
            exclude_pattern = "|".join(exclude_weapons)
            non_knife_kills = dem.kills[~dem.kills["weapon"].str.contains(exclude_pattern, case=False, na=False)]
            first_firearm_kill_tick = non_knife_kills["tick"].min() if not non_knife_kills.empty else float('inf')
            
            # 3. Match start is the last restart before the first gun kill
            candidate_starts = [t for t in match_start_events if t < first_firearm_kill_tick]
            if candidate_starts:
                start_tick = max(candidate_starts)
            elif first_firearm_kill_tick != float('inf'):
                # Fallback: find the end of the round before the first firearm kill
                try:
                    prev_rounds = dem.rounds[dem.rounds["end_tick"] < first_firearm_kill_tick]
                    start_tick = prev_rounds["end_tick"].max() if not prev_rounds.empty else 0
                except:
                    start_tick = 0
            logger.info(f"DemoAnalyzer: Match start detected at tick {start_tick}")
        except Exception as e:
            logger.warning(f"DemoAnalyzer: Error detecting match start: {e}")

        def filter_tick(df, tick_col="tick"):
            if df is not None and tick_col in df.columns:
                if hasattr(df, "empty") and df.empty: return df
                if not hasattr(df, "empty") and len(df) == 0: return df
                return df[df[tick_col] >= start_tick].copy()
            return df

        # Filter Rounds and Kills before processing stats
        dem.rounds = filter_tick(dem.rounds, "end_tick")
        dem.kills = filter_tick(dem.kills, "tick")
        # -----------------------------------------------------------

        # ── Match metadata ────────────────────────────────────────────
        map_name = dem.header.get("map_name", "unknown")
        # Derive a stable unique ID from the URL (avoids duplicates)
        url_slug = self.demo_url.split("/")[-1].split(".")[0][:40]
        match_id = f"demo_{url_slug}"

        # Check if already processed
        existing = await db.get(GlobalMatch, match_id)
        if existing:
            logger.info(f"Match {match_id} already exists in DB — skipping.")
            return {
                "match_id": match_id,
                "already_existed": True,
                "map": map_name,
                "players": [],
            }

        # ── Calculate scores from rounds (Team A vs Team B tracking)
        score_a, score_b = 0, 0
        last_round_winner = None
        team_mapping = {} # steamid -> "A" (started CT) or "B" (started T)
        
        try:
            rounds_df = dem.rounds
            if not rounds_df.empty and "winner_side" in rounds_df.columns:
                # 1. Identify teams at the start (Robust window)
                # We look for player sides at the beginning of the match
                if hasattr(dem, "ticks") and not dem.ticks.empty:
                    # In awpy, ticks DF has steamid and team_num
                    for offset in [64, 128, 256, 512]:
                        start_ticks = dem.ticks[(dem.ticks["tick"] >= start_tick + offset - 5) & (dem.ticks["tick"] <= start_tick + offset + 5)]
                        if not start_ticks.empty:
                            for _, p_row in start_ticks.drop_duplicates("steamid").iterrows():
                                sid = str(int(p_row["steamid"]))
                                if sid not in team_mapping:
                                    t_num = p_row.get("team_num", p_row.get("team_number", 0))
                                    if t_num == 3: team_mapping[sid] = "A"
                                    elif t_num == 2: team_mapping[sid] = "B"
                        if len(team_mapping) >= 10: break

                # 2. Track score using sides (Checking multiple players for robustness)
                last_side_a = "CT"
                for idx, r_row in rounds_df.iterrows():
                    w_side = r_row["winner_side"]
                    end_tick = r_row["end_tick"]
                    
                    current_side_a = "unknown"
                    sids_a = [sid for sid, t in team_mapping.items() if t == "A"]
                    if sids_a and hasattr(dem, "ticks"):
                        end_ticks = dem.ticks[(dem.ticks["tick"] >= end_tick - 64) & (dem.ticks["tick"] <= end_tick)]
                        players_a = end_ticks[end_ticks["steamid"].astype(str).isin(sids_a)]
                        if not players_a.empty:
                            m = players_a.groupby("steamid").last()["team_num"] if "team_num" in players_a.columns else players_a.groupby("steamid").last().get("team_number")
                            if m is not None and not m.empty:
                                team_nums_mode = m.mode()
                                if not team_nums_mode.empty:
                                    dominant_team = team_nums_mode[0]
                                    current_side_a = "CT" if dominant_team == 3 else "T"
                                    last_side_a = current_side_a
                    
                    det_side_a = current_side_a if current_side_a != "unknown" else last_side_a
                    if normalize_side(det_side_a) == normalize_side(w_side):
                        score_a += 1
                        last_round_winner = "A"
                    else:
                        score_b += 1
                        last_round_winner = "B"

                # Duration: estimate from total rounds
                total_rounds = len(rounds_df)
                avg_round_sec = 110  # ~1:50 per round avg
                duration_str = f"{(total_rounds * avg_round_sec) // 60}:{(total_rounds * avg_round_sec) % 60:02d}"
        except Exception as e:
            logger.warning(f"DemoAnalyzer: Could not calculate logical scores: {e}")
            score_a = int((rounds_df["winner_side"] == "CT").sum()) if not rounds_df.empty else 0
            score_b = int((rounds_df["winner_side"] == "T").sum()) if not rounds_df.empty else 0

        # Assign back to variables used for DB
        score_ct, score_t = score_a, score_b

        # ── Sovereign Winner Logic ────────────────────────────────────
        # The winner of the last round is the match winner.
        # This auto-corrects any potential miscounts in intermediate rounds.
        match_winner = "Draw"
        if last_round_winner == "A":
            match_winner = "A"
            s1, s2 = max(score_a, score_b), min(score_a, score_b)
            score_a, score_b = s1, s2
        elif last_round_winner == "B":
            match_winner = "B"
            s1, s2 = max(score_a, score_b), min(score_a, score_b)
            score_a, score_b = s2, s1
        else:
            match_winner = "tie" if score_a == score_b else ("A" if score_a > score_b else "B")

        res_map = {"A": "win", "B": "loss"}
        if match_winner == "B": res_map = {"A": "loss", "B": "win"}
        elif match_winner == "tie": res_map = {"A": "tie", "B": "tie"}

        # ── Insert GlobalMatch ────────────────────────────────────────
        global_match = GlobalMatch(
            id=match_id,
            source="demo",
            mapName=map_name,
            duration=duration_str,
            scoreA=score_a,
            scoreB=score_b,
            metadata={"demo_url": self.demo_url},
        )
        db.add(global_match)
        await db.flush()  # Ensures FK constraint is satisfied before players

        # ── Load existing users for auto-linking ─────────────────────
        result = await db.execute(
            select(PublicUserLookup).where(PublicUserLookup.steamId.is_not(None))
        )
        users = result.scalars().all()
        steam_to_user_id = {u.steamId: u.id for u in users}

        # ── Process player stats ──────────────────────────────────────
        player_stats = dem.player_stats
        players_summary = []


        # Calculate FK/FD from kill events
        fk_counts: dict[str, int] = {}
        fd_counts: dict[str, int] = {}
        try:
            kills_df = dem.kills
            if not kills_df.empty and "round" in kills_df.columns:
                for _, round_kills in kills_df.groupby("round"):
                    first = round_kills.nsmallest(1, "tick").iloc[0]
                    atk = str(int(first["attacker_steamid"])) if first.get("attacker_steamid") else None
                    vic = str(int(first["victim_steamid"])) if first.get("victim_steamid") else None
                    if atk:
                        fk_counts[atk] = fk_counts.get(atk, 0) + 1
                    if vic:
                        fd_counts[vic] = fd_counts.get(vic, 0) + 1
        except Exception as e:
            logger.warning(f"Could not calculate FK/FD: {e}")

        for _, row in player_stats.iterrows():
            try:
                steam_id_str = str(int(row["steamid"]))
                team = row.get("team_name", "Unknown")
                
                # Determine match result by logical team
                logical_team = team_mapping.get(steam_id_str)
                match_result = res_map.get(logical_team, "Tie")

                # Auto-link to existing user
                user_id = steam_to_user_id.get(steam_id_str)

                # HS%: awpy gives headshot count, convert to %
                total_kills = int(row.get("kills", 0))
                hs_count = int(row.get("headshot_kills", 0))
                hs_pct = round((hs_count / total_kills * 100), 1) if total_kills > 0 else 0.0

                # Score: use 'score' column if available, else K+A
                score_val = int(row.get("score", total_kills + int(row.get("assists", 0))))
                mvps_val = int(row.get("mvps", 0))

                extra_meta = {
                    "rating": float(row.get("rating", 0.0)),
                    "kast": float(row.get("kast", 0.0)),
                    "utilityDamage": int(row.get("utility_damage", 0)),
                    "flashAssists": int(row.get("flash_assists", 0)),
                    "fk": fk_counts.get(steam_id_str, 0),
                    "fd": fd_counts.get(steam_id_str, 0),
                    "triples": int(row.get("triple_kills", row.get("3k", 0))),
                    "quads": int(row.get("quad_kills", row.get("4k", 0))),
                    "aces": int(row.get("ace_kills", row.get("5k", 0))),
                    "playerName": str(row.get("name", "")),
                }

                player_entry = GlobalMatchPlayer(
                    id=str(uuid.uuid4()),
                    globalMatchId=match_id,
                    steamId=steam_id_str,
                    userId=user_id,
                    team=team,
                    kills=total_kills,
                    deaths=int(row.get("deaths", 0)),
                    assists=int(row.get("assists", 0)),
                    score=score_val,
                    mvps=mvps_val,
                    adr=float(row.get("adr", 0.0)),
                    hsPercentage=hs_pct,
                    matchResult=match_result,
                    metadata=extra_meta,
                )
                db.add(player_entry)

                players_summary.append({
                    "steamId": steam_id_str,
                    "name": extra_meta["playerName"],
                    "team": team,
                    "result": match_result,
                    "kills": total_kills,
                    "deaths": int(row.get("deaths", 0)),
                    "assists": int(row.get("assists", 0)),
                    "adr": float(row.get("adr", 0.0)),
                    "hsPercentage": hs_pct,
                    "rating": extra_meta["rating"],
                    "linkedUserId": user_id,
                })

            except Exception as e:
                logger.error(f"Failed to process player row: {e} — row={row.to_dict()}")
                continue

        await db.commit()
        logger.info(f"✅ Demo analysis complete: match_id={match_id}, players={len(players_summary)}")

        return {
            "match_id": match_id,
            "already_existed": False,
            "map": map_name,
            "score_ct": score_ct,
            "score_t": score_t,
            "duration": duration_str,
            "demo_url": self.demo_url,
            "players": players_summary,
            "awpy_available": AWPY_AVAILABLE,
        }
