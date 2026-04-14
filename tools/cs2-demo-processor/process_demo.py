"""
process_demo.py
---------------
Ferramenta local para processar demos CS2 (.dem) e enviar as estatísticas
diretamente para o banco de dados PostgreSQL do site, sem depender da DisCloud.

Dependências: demoparser2, pandas, psycopg2-binary, python-dotenv, customtkinter
Instale via: pip install -r requirements.txt
"""

import os
import sys
import hashlib
import threading
import traceback
from datetime import datetime

import customtkinter as ctk
from tkinter import filedialog, messagebox

try:
    from demoparser2 import DemoParser
    HAS_PARSER = True
except ImportError:
    HAS_PARSER = False

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

import db_connector

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def generate_match_id(header: dict) -> str:
    """Gera um ID único baseado nos dados internos da demo (mapa, tempo e ticks).
    Isso impede arquivos com nomes diferentes de criar partidas duplicadas."""
    map_n = str(header.get("map_name", "unknown"))
    ticks = str(header.get("playback_ticks", "0"))
    time_str = str(header.get("playback_time", "0"))
    server = str(header.get("server_name", "local"))
    
    raw = f"{map_n}_{ticks}_{time_str}_{server}"
    return "demo_" + hashlib.md5(raw.encode()).hexdigest()[:24]


def seconds_to_mmss(seconds: float) -> str:
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m:02d}:{s:02d}"


def normalize_team(raw: str) -> str:
    """Normaliza o nome do time para 'CT' ou 'T'."""
    r = str(raw).upper().strip()
    if "CT" in r or r == "3":
        return "CT"
    if "T" in r or r == "2" or "TERRORIST" in r:
        return "T"
    return r


# ─────────────────────────────────────────────
# Parser de Demo
# ─────────────────────────────────────────────

def parse_demo(filepath: str, log_fn=print) -> dict | None:
    """
    Processa um arquivo .dem e retorna um dict com:
      {
        "match": { id, mapName, duration, scoreA, scoreB, ... },
        "players": [ { steamId, displayName, team, kills, deaths, assists,
                        score, mvps, adr, hsPercentage, matchResult, metadata }, ... ]
      }
    Retorna None em caso de falha fatal.
    """
    if not HAS_PARSER:
        log_fn("❌ demoparser2 não instalado. Execute run.bat para instalar.")
        return None

    log_fn(f"📂 Abrindo: {os.path.basename(filepath)}")
    parser = DemoParser(filepath)

    # ── Header ──────────────────────────────
    header = {}
    try:
        header = parser.parse_header()
        map_name = header.get("map_name", "unknown")
        tick_rate = float(header.get("playback_ticks", 0)) / max(float(header.get("playback_time", 1)), 1)
        duration_secs = float(header.get("playback_time", 0))
        duration_str  = seconds_to_mmss(duration_secs)
        log_fn(f"🗺️  Mapa: {map_name} | Duração: {duration_str}")
    except Exception as e:
        log_fn(f"⚠️  Erro ao ler header: {e}")
        map_name     = "unknown"
        duration_str = None

    # ── Jogadores e Times ───────────────────
    player_info = {}   # steamId -> {name, team}
    try:
        df_pi = parser.parse_player_info()
        df_pi = df_pi[df_pi["name"].notna()]
        df_pi = df_pi[df_pi["name"].str.lower() != "gotv"]

        for _, row in df_pi.iterrows():
            sid = str(row.get("steamid", row.get("steam_id", "0")))
            name = str(row.get("name", "")).strip()
            team_raw = str(row.get("team_name", row.get("team_number", ""))).strip()
            if name and sid != "0":
                player_info[sid] = {"name": name, "team": normalize_team(team_raw)}

        log_fn(f"👥 {len(player_info)} jogadores detectados via parse_player_info.")
    except Exception as e:
        log_fn(f"⚠️  parse_player_info falhou: {e}")

    # Fallback: parse_ticks para capturar steamid + team
    if not player_info:
        try:
            for fields in [
                ["name", "steamid", "team_name"],
                ["name", "steamid", "m_iTeamNum"],
            ]:
                df_t = parser.parse_ticks(fields)
                if df_t is not None and not df_t.empty and "name" in df_t.columns:
                    df_t = df_t[df_t["name"].notna()]
                    df_t = df_t[df_t["name"].str.lower() != "gotv"]
                    sid_col = "steamid" if "steamid" in df_t.columns else None
                    team_col = "team_name" if "team_name" in df_t.columns else "m_iTeamNum"
                    latest = df_t.dropna(subset=["name"]).drop_duplicates(subset=["name"], keep="last")
                    for _, row in latest.iterrows():
                        sid = str(row[sid_col]) if sid_col else "0"
                        name = str(row["name"]).strip()
                        team_raw = str(row.get(team_col, "")).strip()
                        if name:
                            player_info[sid] = {"name": name, "team": normalize_team(team_raw)}
                    if player_info:
                        log_fn(f"👥 {len(player_info)} jogadores via parse_ticks (fallback).")
                        break
        except Exception as e:
            log_fn(f"⚠️  Fallback parse_ticks falhou: {e}")

    if not player_info:
        log_fn("❌ Não foi possível extrair jogadores desta demo.")
        return None

    # ── Kills → KDA + HS% ───────────────────
    # Estrutura: {steamId: {kills, deaths, assists, hs_kills}}
    kda   = {sid: {"kills": 0, "deaths": 0, "assists": 0, "hs_kills": 0} for sid in player_info}
    rounds = 0

    try:
        df_kills = parser.parse_event("player_death")
        if df_kills is not None and not df_kills.empty:
            # Attacker
            for _, row in df_kills.iterrows():
                attacker = str(row.get("attacker_steamid", "0"))
                victim   = str(row.get("user_steamid", row.get("victim_steamid", "0")))
                assister = str(row.get("assister_steamid", "0"))
                is_hs    = bool(row.get("headshot", False))

                if attacker in kda and attacker != victim:
                    kda[attacker]["kills"]    += 1
                    kda[attacker]["hs_kills"] += 1 if is_hs else 0
                if victim in kda:
                    kda[victim]["deaths"] += 1
                if assister in kda and assister != "0":
                    kda[assister]["assists"] += 1

            log_fn(f"💀 Kills extraídos via player_death ({len(df_kills)} eventos).")
    except Exception as e:
        log_fn(f"⚠️  parse_event('player_death') falhou: {e}")
        # Fallback: parse_ticks para kills/deaths/assists
        try:
            for stat_fields in [
                ["name", "steamid", "kills", "assists", "deaths"],
                ["name", "steamid", "m_iKills", "m_iAssists", "m_iDeaths"],
            ]:
                df_s = parser.parse_ticks(stat_fields)
                if df_s is not None and not df_s.empty:
                    k_col = next((c for c in ["kills", "m_iKills"] if c in df_s.columns), None)
                    a_col = next((c for c in ["assists", "m_iAssists"] if c in df_s.columns), None)
                    d_col = next((c for c in ["deaths", "m_iDeaths"] if c in df_s.columns), None)
                    sid_col = "steamid" if "steamid" in df_s.columns else None

                    if k_col:
                        latest = df_s.dropna(subset=["name"]).drop_duplicates(subset=["name"], keep="last")
                        for _, row in latest.iterrows():
                            sid = str(row[sid_col]) if sid_col else "0"
                            if sid in kda:
                                kda[sid]["kills"]   = int(row.get(k_col, 0) or 0)
                                kda[sid]["assists"] = int(row.get(a_col, 0) or 0) if a_col else 0
                                kda[sid]["deaths"]  = int(row.get(d_col, 0) or 0) if d_col else 0
                        log_fn(f"💀 KDA via parse_ticks (fallback) com {k_col}.")
                        break
        except Exception as e2:
            log_fn(f"⚠️  Fallback KDA também falhou: {e2}")

    # ── Dano → ADR ──────────────────────────
    dmg_total = {sid: 0 for sid in player_info}
    try:
        df_dmg = parser.parse_event("player_hurt")
        if df_dmg is not None and not df_dmg.empty:
            dmg_col = next((c for c in ["dmg_health", "damage", "health_damage"] if c in df_dmg.columns), None)
            att_col = next((c for c in ["attacker_steamid", "attacker_steamid64"] if c in df_dmg.columns), None)
            if dmg_col and att_col:
                for _, row in df_dmg.iterrows():
                    sid = str(row.get(att_col, "0"))
                    if sid in dmg_total:
                        dmg_total[sid] += int(row.get(dmg_col, 0) or 0)
                log_fn("💥 Dano extraído via player_hurt.")
    except Exception as e:
        log_fn(f"⚠️  parse_event('player_hurt') falhou: {e}")

    # ── Rounds jogados ───────────────────────
    try:
        df_rounds = parser.parse_event("round_officially_ended")
        rounds = len(df_rounds) if df_rounds is not None else 0
        if rounds == 0:
            df_rounds2 = parser.parse_event("round_end")
            rounds = len(df_rounds2) if df_rounds2 is not None else 30
        log_fn(f"🔄 {rounds} rounds detectados.")
    except Exception:
        rounds = 30  # fallback padrão

    # ── Score e MVPs ─────────────────────────
    score_map = {sid: 0 for sid in player_info}
    mvp_map   = {sid: 0 for sid in player_info}
    try:
        df_sc = parser.parse_ticks(["name", "steamid", "score", "mvps"])
        if df_sc is not None and not df_sc.empty:
            sid_col = "steamid" if "steamid" in df_sc.columns else None
            if sid_col and "score" in df_sc.columns:
                latest_sc = df_sc.dropna(subset=["name"]).drop_duplicates(subset=["name"], keep="last")
                for _, row in latest_sc.iterrows():
                    sid = str(row.get(sid_col, "0"))
                    if sid in score_map:
                        score_map[sid] = int(row.get("score", 0) or 0)
                        mvp_map[sid]   = int(row.get("mvps", 0) or 0)
    except Exception as e:
        log_fn(f"⚠️  Score/MVPs não extraídos: {e}")

    # ── Placar dos Times ─────────────────────
    score_a, score_b = None, None
    try:
        # Pega m_scoreTotal que pertence a CCSTeam e não CCSPlayerController (que usa m_iScore para kills*2)
        df_ts = parser.parse_ticks(["m_scoreTotal", "team_name"])
        
        if df_ts is not None and not df_ts.empty and "m_scoreTotal" in df_ts.columns and "team_name" in df_ts.columns:
            # Pega o placar no final da demo (keep='last')
            latest_teams = df_ts.dropna(subset=["team_name"]).drop_duplicates(subset=["team_name"], keep="last")
            summary = latest_teams.set_index("team_name")["m_scoreTotal"].to_dict()
            
            score_ct = 0
            score_t = 0
            for k, v in summary.items():
                norm_k = normalize_team(str(k))
                if norm_k == "CT":
                    score_ct = max(score_ct, int(v))
                elif norm_k == "T":
                    score_t = max(score_t, int(v))
            
            score_a, score_b = score_ct, score_t
            log_fn(f"📊 Placar extraído via m_scoreTotal: {score_ct} x {score_t}")
        else:
            # Fallback seguro: tentar contar as rodadas ganhas (Não lida com half-swap, mas impede números gigantes)
            df_re = parser.parse_event("round_end")
            if df_re is not None and not df_re.empty and "winner" in df_re.columns:
                wins_t = int((df_re["winner"] == 2).sum())
                wins_ct = int((df_re["winner"] == 3).sum())
                score_a, score_b = wins_ct, wins_t
                log_fn(f"📊 Placar calculado via round_end (Sem considerar swap): CT {wins_ct} x T {wins_t}")
    except Exception as e:
        log_fn(f"⚠️  Placar dos times não extraído: {e}")

    # ── Estatísticas Avançadas (Duelos e Granadas) ──────────
    flash_assists = {sid: 0 for sid in player_info}
    util_dmg      = {sid: 0 for sid in player_info}
    
    adv_stats = {sid: {
        "fk": 0, "fd": 0, "triples": 0, "quads": 0, "aces": 0,
        "blind_time": 0.0, "he": 0, "flash": 0, "smoke": 0, "molotov": 0
    } for sid in player_info}
    

    # Granadas Lançadas
    try:
        events_to_parse = [
            ("hegrenade_detonate", "he"), 
            ("flashbang_detonate", "flash"), 
            ("smokegrenade_detonate", "smoke"), 
            ("inferno_startburn", "molotov")
        ]
        for ev, g_type in events_to_parse:
            df_g = parser.parse_event(ev)
            if df_g is not None and not df_g.empty:
                t_col = next((c for c in ["userid", "user_steamid", "thrower_steamid", "attacker_steamid"] if c in df_g.columns), None)
                if t_col:
                    for _, row in df_g.iterrows():
                        sid = str(row[t_col])
                        if sid in adv_stats:
                            adv_stats[sid][g_type] += 1
    except Exception as e:
        log_fn(f"⚠️  Granadas (lançadas) não extraídas: {e}")

    # Blind Time (Segundos cegando inimigos)
    try:
        df_fa = parser.parse_event("player_blind")
        if df_fa is not None and not df_fa.empty:
            att_col = next((c for c in ["attacker_steamid", "thrower_steamid"] if c in df_fa.columns), None)
            vic_col = next((c for c in ["user_steamid", "victim_steamid"] if c in df_fa.columns), None)
            dur_col = "blind_duration"
            if att_col and dur_col and vic_col:
                for _, row in df_fa.iterrows():
                    sid = str(row.get(att_col, "0"))
                    vic = str(row.get(vic_col, "0"))
                    if sid in flash_assists and sid != vic:
                        flash_assists[sid] += 1
                        adv_stats[sid]["blind_time"] += float(row.get(dur_col, 0) or 0)
    except Exception as e:
        log_fn(f"⚠️  Blind duration falhou: {e}")

    # Utility Damage (HE, Molotov)
    try:
        df_ud = parser.parse_event("player_hurt")
        if df_ud is not None and not df_ud.empty:
            util_weapons = {"hegrenade", "molotov", "inferno", "flashbang"}
            att_col  = next((c for c in ["attacker_steamid"] if c in df_ud.columns), None)
            dmg_col  = next((c for c in ["dmg_health", "damage"] if c in df_ud.columns), None)
            weap_col = next((c for c in ["weapon", "weapon_name"] if c in df_ud.columns), None)
            if att_col and dmg_col and weap_col:
                for _, row in df_ud.iterrows():
                    sid = str(row.get(att_col, "0"))
                    weapon = str(row.get(weap_col, "")).lower()
                    if sid in util_dmg and any(uw in weapon for uw in util_weapons):
                        util_dmg[sid] += int(row.get(dmg_col, 0) or 0)
    except Exception:
        pass

    # Duelos: First Kills / First Deaths e MultiKills
    try:
        df_k = parser.parse_event("player_death")
        df_rs = parser.parse_event("round_start")
        if df_k is not None and not df_k.empty and "tick" in df_k.columns:
            df_k = df_k.sort_values(by="tick")
            round_starts = sorted(df_rs["tick"].tolist()) if (df_rs is not None and not df_rs.empty and "tick" in df_rs.columns) else [0]
            
            def get_round(t):
                # Retorna em qual round este tick pertence
                r = 0
                for start in round_starts:
                    if t >= start:
                        r += 1
                return r

            df_k["round_num"] = df_k["tick"].apply(get_round) if round_starts else [1] * len(df_k)

            for r_num, r_kills in df_k.groupby("round_num"):
                if r_kills.empty: continue
                # First Kill e Death
                first = r_kills.iloc[0]
                att = str(first.get("attacker_steamid", "0"))
                vic = str(first.get("user_steamid", "0"))
                if att in adv_stats and att != vic and att != "0":
                    adv_stats[att]["fk"] += 1
                if vic in adv_stats and vic != "0":
                    adv_stats[vic]["fd"] += 1

                # Multi-kills: filtra apenas mortes causadas pelo atacante dentro deste round
                r_counts = r_kills[r_kills["attacker_steamid"] != r_kills["user_steamid"]].groupby("attacker_steamid").size()
                for atk_sid, count in r_counts.items():
                    atk_sid = str(atk_sid)
                    if atk_sid in adv_stats:
                        if count == 3: adv_stats[atk_sid]["triples"] += 1
                        elif count == 4: adv_stats[atk_sid]["quads"] += 1
                        elif count >= 5: adv_stats[atk_sid]["aces"] += 1
    except Exception as e:
        log_fn(f"⚠️  Duelos não extraídos integralmente: {e}")

    # ──────────────────────────────────────────
    # Monta a lista de jogadores
    # ──────────────────────────────────────────
    players_out = []
    for sid, info in player_info.items():
        k   = kda[sid]["kills"]
        d   = kda[sid]["deaths"]
        a   = kda[sid]["assists"]
        hs  = kda[sid]["hs_kills"]
        dmg = dmg_total.get(sid, 0)

        adr         = round(dmg / max(rounds, 1), 2)
        hs_pct      = round((hs / max(k, 1)) * 100, 1)
        team        = info["team"]

        # matchResult: provisório — será recalculado depois de montar os times
        players_out.append({
            "steamId":       sid,
            "displayName":   info["name"],
            "team":          team,
            "kills":         k,
            "deaths":        d,
            "assists":       a,
            "score":         score_map.get(sid, 0),
            "mvps":          mvp_map.get(sid, 0),
            "adr":           adr,
            "hsPercentage":  hs_pct,
            "matchResult":   "tie",  # calculado abaixo
            "metadata": {
                "flashAssists":  flash_assists.get(sid, 0),
                "utilDmg":       util_dmg.get(sid, 0),
                "rawDmg":        dmg,
                "fk":            adv_stats[sid]["fk"],
                "fd":            adv_stats[sid]["fd"],
                "triples":       adv_stats[sid]["triples"],
                "quads":         adv_stats[sid]["quads"],
                "aces":          adv_stats[sid]["aces"],
                "blindTime":     adv_stats[sid]["blind_time"],
                "heThrown":      adv_stats[sid]["he"],
                "flashThrown":   adv_stats[sid]["flash"],
                "smokesThrown":  adv_stats[sid]["smoke"],
                "molotovThrown": adv_stats[sid]["molotov"]
            },
        })

    # Determina resultado por time
    if score_a is not None and score_b is not None and score_a != score_b: # CT vs T
        winner_team = "CT" if score_a > score_b else "T"
        for p in players_out:
            if p["team"] == winner_team:
                p["matchResult"] = "win"
            elif p["team"] in ("CT", "T"):
                p["matchResult"] = "loss"
            else:
                p["matchResult"] = "tie"
    elif score_a is not None and score_b is not None and score_a == score_b:
        for p in players_out:
            p["matchResult"] = "tie"

    match_id = generate_match_id(header)
    match_out = {
        "id":        match_id,
        "source":    "mix",          # padrão; usuário pode alterar na UI
        "mapName":   map_name,
        "duration":  duration_str,
        "matchDate": datetime.now(),
        "scoreA":    score_a,
        "scoreB":    score_b,
        "metadata":  {"demoFile": os.path.basename(filepath)},
    }

    log_fn(f"✅ Demo processada: {len(players_out)} jogadores, placar {score_a} x {score_b}")
    return {"match": match_out, "players": players_out}


# ─────────────────────────────────────────────
# UI Principal
# ─────────────────────────────────────────────

class DemoProcessorApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("CS2 Demo Processor — CSBrasil")
        self.geometry("1100x720")
        self.minsize(900, 600)
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")

        self._demo_data  = None   # resultado do parse_demo()
        self._processing = False

        self._build_ui()
        self._test_db_connection()

    # ── UI ────────────────────────────────────

    def _build_ui(self):
        self.grid_columnconfigure(0, weight=1, minsize=320)
        self.grid_columnconfigure(1, weight=2)
        self.grid_rowconfigure(1, weight=1)

        # ── Cabeçalho
        hdr = ctk.CTkFrame(self, corner_radius=0, fg_color="#1a1a2e")
        hdr.grid(row=0, column=0, columnspan=2, sticky="ew")

        ctk.CTkLabel(
            hdr,
            text="⚡ CS2 Demo Processor",
            font=ctk.CTkFont(family="Segoe UI", size=22, weight="bold"),
            text_color="#e94560",
        ).pack(side="left", padx=20, pady=14)

        self._db_status_label = ctk.CTkLabel(
            hdr, text="🔌 Verificando banco...",
            font=ctk.CTkFont(size=11), text_color="gray"
        )
        self._db_status_label.pack(side="right", padx=20)

        # ── Painel Esquerdo (controles)
        left = ctk.CTkFrame(self, corner_radius=10)
        left.grid(row=1, column=0, padx=(14, 7), pady=14, sticky="nsew")
        left.grid_rowconfigure(6, weight=1)
        left.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(left, text="Arquivo de Demo", font=ctk.CTkFont(weight="bold")).grid(
            row=0, column=0, padx=14, pady=(14, 4), sticky="w"
        )

        self._demo_path_var = ctk.StringVar(value="Nenhuma demo selecionada")
        ctk.CTkEntry(left, textvariable=self._demo_path_var, state="readonly").grid(
            row=1, column=0, padx=14, pady=(0, 6), sticky="ew"
        )
        ctk.CTkButton(left, text="📁  Selecionar Demo (.dem)", command=self._select_demo).grid(
            row=2, column=0, padx=14, pady=(0, 12), sticky="ew"
        )

        sep = ctk.CTkFrame(left, height=1, fg_color="#333")
        sep.grid(row=3, column=0, padx=14, sticky="ew", pady=4)

        # Source
        ctk.CTkLabel(left, text="Tipo de Partida (source)", font=ctk.CTkFont(weight="bold")).grid(
            row=4, column=0, padx=14, pady=(10, 4), sticky="w"
        )
        self._source_var = ctk.StringVar(value="mix")
        ctk.CTkOptionMenu(
            left,
            values=["mix", "matchmaking", "faceit", "esea", "gcbrasil", "outro"],
            variable=self._source_var,
        ).grid(row=5, column=0, padx=14, pady=(0, 12), sticky="ew")

        # Log
        ctk.CTkLabel(left, text="Log de Processamento", font=ctk.CTkFont(weight="bold")).grid(
            row=6, column=0, padx=14, pady=(10, 4), sticky="w"
        )
        self._log_box = ctk.CTkTextbox(left, font=ctk.CTkFont(family="Consolas", size=11))
        self._log_box.grid(row=7, column=0, padx=14, pady=(0, 10), sticky="nsew")
        left.grid_rowconfigure(7, weight=1)

        # Botões de ação
        btn_frame = ctk.CTkFrame(left, fg_color="transparent")
        btn_frame.grid(row=8, column=0, padx=14, pady=(0, 14), sticky="ew")
        btn_frame.grid_columnconfigure(0, weight=1)
        btn_frame.grid_columnconfigure(1, weight=1)

        self._btn_process = ctk.CTkButton(
            btn_frame, text="🔍  Processar Demo",
            fg_color="#0f3460", hover_color="#16213e",
            command=self._on_process, state="disabled"
        )
        self._btn_process.grid(row=0, column=0, padx=(0, 4), sticky="ew")

        self._btn_send = ctk.CTkButton(
            btn_frame, text="📤  Enviar para Banco",
            fg_color="#e94560", hover_color="#b5334d",
            command=self._on_send, state="disabled"
        )
        self._btn_send.grid(row=0, column=1, padx=(4, 0), sticky="ew")

        # ── Painel Direito (preview)
        right = ctk.CTkFrame(self, corner_radius=10)
        right.grid(row=1, column=1, padx=(7, 14), pady=14, sticky="nsew")
        right.grid_columnconfigure(0, weight=1)
        right.grid_rowconfigure(1, weight=1)

        ctk.CTkLabel(right, text="Preview dos Dados", font=ctk.CTkFont(weight="bold", size=15)).grid(
            row=0, column=0, padx=14, pady=(14, 6), sticky="w"
        )

        self._preview_frame = ctk.CTkScrollableFrame(right, fg_color="transparent")
        self._preview_frame.grid(row=1, column=0, padx=10, pady=(0, 14), sticky="nsew")
        self._preview_frame.grid_columnconfigure(0, weight=1)

        self._show_placeholder()

    def _show_placeholder(self):
        for w in self._preview_frame.winfo_children():
            w.destroy()
        ctk.CTkLabel(
            self._preview_frame,
            text="Selecione um arquivo .dem e clique em\n'Processar Demo' para visualizar os dados.",
            font=ctk.CTkFont(size=13),
            text_color="gray",
            justify="center",
        ).pack(expand=True, pady=60)

    # ── Logs ──────────────────────────────────

    def _log(self, msg: str):
        def _do():
            self._log_box.insert("end", msg + "\n")
            self._log_box.see("end")
        self.after(0, _do)

    # ── DB Status ─────────────────────────────

    def _test_db_connection(self):
        def _run():
            ok, msg = db_connector.test_connection()
            color = "#2ecc71" if ok else "#e74c3c"
            icon  = "✅" if ok else "❌"
            self.after(0, lambda: self._db_status_label.configure(
                text=f"{icon} {msg}", text_color=color
            ))
        threading.Thread(target=_run, daemon=True).start()

    # ── Selecionar Demo ───────────────────────

    def _select_demo(self):
        path = filedialog.askopenfilename(
            title="Selecionar arquivo .dem",
            filetypes=[("CS2 Demo Files", "*.dem"), ("Todos os arquivos", "*.*")]
        )
        if path:
            self._demo_path_var.set(path)
            self._demo_data = None
            self._btn_process.configure(state="normal")
            self._btn_send.configure(state="disabled")
            self._show_placeholder()
            self._log_box.delete("1.0", "end")
            self._log(f"📂 Demo selecionada: {os.path.basename(path)}")

    # ── Processar Demo ────────────────────────

    def _on_process(self):
        if self._processing:
            return
        path = self._demo_path_var.get()
        if not path or not os.path.isfile(path):
            messagebox.showerror("Erro", "Selecione um arquivo .dem válido.")
            return

        self._processing = True
        self._btn_process.configure(state="disabled", text="⏳  Processando...")
        self._btn_send.configure(state="disabled")
        self._demo_data = None

        threading.Thread(target=self._do_parse, args=(path,), daemon=True).start()

    def _do_parse(self, path: str):
        try:
            result = parse_demo(path, log_fn=self._log)
            if result:
                # Aplica o source selecionado pelo usuário
                result["match"]["source"] = self._source_var.get()
                self._demo_data = result
                self.after(0, lambda: self._render_preview(result))
                self.after(0, lambda: self._btn_send.configure(state="normal"))
            else:
                self.after(0, lambda: self._show_placeholder())
        except Exception as e:
            err = traceback.format_exc()
            self._log(f"❌ Exceção inesperada:\n{err}")
        finally:
            self._processing = False
            self.after(0, lambda: self._btn_process.configure(state="normal", text="🔍  Processar Demo"))

    # ── Preview ───────────────────────────────

    def _render_preview(self, data: dict):
        for w in self._preview_frame.winfo_children():
            w.destroy()

        match = data["match"]
        players = data["players"]

        # ── Cabeçalho da partida
        info_frame = ctk.CTkFrame(self._preview_frame, fg_color="#1a1a2e", corner_radius=8)
        info_frame.pack(fill="x", pady=(0, 10))

        already = db_connector.match_exists(match["id"])
        dup_badge = " ⚠️ JÁ IMPORTADA" if already else " ✨ Nova partida"
        dup_color = "#e67e22" if already else "#2ecc71"

        ctk.CTkLabel(
            info_frame,
            text=f"🗺️  {match['mapName'].upper()}   {dup_badge}",
            font=ctk.CTkFont(size=16, weight="bold"),
            text_color=dup_color,
        ).pack(side="left", padx=14, pady=10)

        source_txt = f"Source: {match['source']}   |   Duração: {match.get('duration', '?')}   |   ID: {match['id']}"
        ctk.CTkLabel(info_frame, text=source_txt, font=ctk.CTkFont(size=11), text_color="gray").pack(
            side="right", padx=14
        )

        # ── Placar
        score_a = match.get("scoreA", "?")
        score_b = match.get("scoreB", "?")
        score_frame = ctk.CTkFrame(self._preview_frame, fg_color="#0f3460", corner_radius=8)
        score_frame.pack(fill="x", pady=(0, 12))
        ctk.CTkLabel(
            score_frame,
            text=f"CT  {score_a}  ×  {score_b}  T",
            font=ctk.CTkFont(size=24, weight="bold"),
            text_color="white",
        ).pack(pady=10)

        # ── Tabela de Jogadores
        headers = ["Jogador", "Steam ID", "Time", "K", "D", "A", "ADR", "HS%", "Score", "Resultado"]
        col_weights = [3, 2, 1, 1, 1, 1, 1, 1, 1, 1]

        header_row = ctk.CTkFrame(self._preview_frame, fg_color="#16213e", corner_radius=6)
        header_row.pack(fill="x", pady=(0, 2))
        for i, (h, w) in enumerate(zip(headers, col_weights)):
            header_row.grid_columnconfigure(i, weight=w)
            ctk.CTkLabel(header_row, text=h, font=ctk.CTkFont(weight="bold", size=11), text_color="#aaa").grid(
                row=0, column=i, padx=6, pady=6, sticky="w"
            )

        result_colors = {"win": "#2ecc71", "loss": "#e74c3c", "tie": "#f39c12"}

        # Ordena por kills desc
        sorted_players = sorted(players, key=lambda p: (p.get("kills", 0)), reverse=True)

        for idx, p in enumerate(sorted_players):
            bg = "#1e1e2e" if idx % 2 == 0 else "#252535"
            row_f = ctk.CTkFrame(self._preview_frame, fg_color=bg, corner_radius=4)
            row_f.pack(fill="x", pady=1)
            for i, w in enumerate(col_weights):
                row_f.grid_columnconfigure(i, weight=w)

            res_color = result_colors.get(p.get("matchResult", "tie"), "gray")
            team_color = "#5dade2" if p.get("team") == "CT" else "#e59866"

            values = [
                (p.get("displayName", "?"),    "white"),
                (p.get("steamId", "0"),         "#888"),
                (p.get("team", "?"),            team_color),
                (str(p.get("kills", 0)),        "white"),
                (str(p.get("deaths", 0)),       "#e74c3c"),
                (str(p.get("assists", 0)),      "#f1c40f"),
                (f"{p.get('adr', 0):.1f}",     "#2ecc71"),
                (f"{p.get('hsPercentage', 0):.1f}%", "#9b59b6"),
                (str(p.get("score", 0)),        "white"),
                (p.get("matchResult", "?").upper(), res_color),
            ]

            for i, (val, color) in enumerate(values):
                ctk.CTkLabel(
                    row_f, text=val,
                    font=ctk.CTkFont(size=11),
                    text_color=color, anchor="w"
                ).grid(row=0, column=i, padx=6, pady=5, sticky="w")

    # ── Enviar para Banco ─────────────────────

    def _on_send(self):
        if not self._demo_data:
            messagebox.showerror("Erro", "Processe uma demo primeiro.")
            return

        match = self._demo_data["match"]
        players = self._demo_data["players"]

        # Atualiza source antes de enviar
        match["source"] = self._source_var.get()

        if db_connector.match_exists(match["id"]):
            resp = messagebox.askyesno(
                "Partida já importada",
                "Esta demo já foi enviada para o banco anteriormente.\n"
                "Deseja sobrescrever os dados dos jogadores mesmo assim?"
            )
            if not resp:
                return

        self._btn_send.configure(state="disabled", text="⏳  Enviando...")
        threading.Thread(target=self._do_send, args=(match, players), daemon=True).start()

    def _do_send(self, match, players):
        self._log("📤 Enviando para o banco de dados...")
        ok, msg = db_connector.insert_match(match, players)
        self._log(msg)

        def _after():
            self._btn_send.configure(state="normal", text="📤  Enviar para Banco")
            if ok:
                messagebox.showinfo("Sucesso!", msg)
                # Re-renderiza preview para atualizar badge
                self.after(100, lambda: self._render_preview(self._demo_data))
            else:
                messagebox.showerror("Erro ao Enviar", msg)

        self.after(0, _after)


# ─────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────

if __name__ == "__main__":
    if not HAS_PARSER:
        print("ERRO: demoparser2 não instalado.")
        print("Execute run.bat ou: pip install -r requirements.txt")
        sys.exit(1)

    if not HAS_PANDAS:
        print("ERRO: pandas não instalado.")
        print("Execute run.bat ou: pip install -r requirements.txt")
        sys.exit(1)

    app = DemoProcessorApp()
    app.mainloop()
