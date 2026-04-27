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

def generate_match_id(header: dict, filepath: str = "") -> str:
    """Gera um ID único baseado nos dados internos da demo (mapa, tempo e ticks).
    Inclui o nome do arquivo como fallback para demos de servidor local onde
    os campos do header (ticks/time/server) podem ser 0/unknown."""
    map_n    = str(header.get("map_name", "unknown"))
    ticks    = str(header.get("playback_ticks", "0"))
    time_str = str(header.get("playback_time", "0"))
    server   = str(header.get("server_name", "local"))

    # Se os campos críticos do header são genéricos (demo local/mix),
    # usamos o nome do arquivo como âncora para garantir unicidade.
    header_is_generic = (ticks in ("0", "0.0") and time_str in ("0", "0.0")
                         and server in ("local", "", "unknown"))
    filename_anchor = os.path.basename(filepath) if (header_is_generic and filepath) else ""

    raw = f"{map_n}_{ticks}_{time_str}_{server}_{filename_anchor}"
    return "demo_" + hashlib.md5(raw.encode()).hexdigest()[:24]


def seconds_to_mmss(seconds: float) -> str:
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m:02d}:{s:02d}"


def normalize_team(raw: str) -> str:
    """Normaliza o nome do time para 'CT' ou 'T'."""
    raw_s = str(raw).upper().strip()
    if raw_s in ["NAN", "NONE", "UNKNOWN", "0", "1"]:
        return "Unknown"
    if "CT" in raw_s or raw_s == "3":
        return "CT"
    if "T" in raw_s or raw_s == "2" or "TERRORIST" in raw_s:
        return "T"
    return raw_s


# ─────────────────────────────────────────────
# Parser de Demo
# ─────────────────────────────────────────────

def safe_parse_event(parser, event_name):
    """Tenta parse_event compatível com demoparser2 >= 0.41.2."""
    for kwargs in [{"player": [], "other": []}, {"player": []}, {}]:
        try:
            return parser.parse_event(event_name, **kwargs)
        except (TypeError, Exception):
            continue
    try:
        return parser.parse_event(event_name)
    except Exception:
        return None

def parse_demo(filepath: str, log_fn=print, match_date=None, progress_fn=None) -> dict | None:
    """
    Processa um arquivo .dem e retorna um dict com:
      {
        "match": { id, mapName, duration, scoreA, scoreB, ... },
        "players": [ { steamId, displayName, team, kills, deaths, assists,
                        score, mvps, adr, hsPercentage, matchResult, metadata }, ... ]
      }
    """
    if not HAS_PARSER:
        log_fn("❌ demoparser2 não instalado. Execute run.bat para instalar.")
        return None

    if progress_fn: progress_fn(0.02)
    log_fn(f"📖 Iniciando parse: {os.path.basename(filepath)}")
    
    try:
        parser = DemoParser(filepath)
    except Exception as e:
        log_fn(f"❌ Erro ao abrir demo: {e}")
        return None

    # helpers
    def is_empty(df):
        if df is None: return True
        if hasattr(df, "empty"): return df.empty
        return len(df) == 0

    start_tick = 0 

    def filter_tick(df):
        if not is_empty(df) and (hasattr(df, "columns") and "tick" in df.columns or isinstance(df, pd.DataFrame)):
            try:
                return df[df["tick"] >= start_tick]
            except:
                return df
        return df

    def _parse(ev):
        return safe_parse_event(parser, ev)

    # ── Header e Duração ─────────────────
    header = {}
    map_name, duration_str = "unknown", "00:00"
    try:
        header = parser.parse_header()
        map_name = str(header.get("map_name", "unknown")).lower()
        duration_secs = float(header.get("playback_time", 0))
        if duration_secs > 0:
            duration_str = seconds_to_mmss(duration_secs)
        log_fn(f"🗺️  Mapa: {map_name} | Duração inicial: {duration_str}")
    except Exception as e:
        log_fn(f"⚠️  Erro ao ler header: {e}")

    if progress_fn: progress_fn(0.05)

    # ── Jogadores ──────────────────────────
    player_info = {} # {steamid: {name, team}}
    try:
        # Tenta pegar de vários ticks para garantir nomes
        df_p = parser.parse_ticks(["name", "steamid", "team_name"])
        if not is_empty(df_p):
            # Ordena por tick para pegar o estado mais recente
            df_p = df_p.sort_values("tick")
            for _, row in df_p.iterrows():
                sid = str(row.get("steamid", "0")).split(".")[0]
                if sid == "0" or not sid: continue
                
                name = str(row.get("name", ""))
                team = normalize_team(str(row.get("team_name", "")))
                
                if sid not in player_info:
                    player_info[sid] = {"name": name, "team": team}
                else:
                    # Atualiza nome se o atual for ruim (vazio ou só números) e o novo for bom
                    curr_name = player_info[sid]["name"]
                    if name and (not curr_name or curr_name.isdigit()) and not name.isdigit():
                        player_info[sid]["name"] = name
                    if team != "unknown":
                        player_info[sid]["team"] = team

        log_fn(f"👥 {len(player_info)} jogadores detectados via ticks.")
    except Exception as e:
        log_fn(f"⚠️ Erro ao extrair lista de jogadores via ticks: {e}")

    if progress_fn: progress_fn(0.15)
    
    # ── Match Start Detection (Warmup Filter) ──
    # Tentamos detectar o tick real onde o jogo "valendo" começou.
    # Eventos possíveis: round_announce_match_start (oficial), ou o primeiro round_start após warmup.
    df_m_start = _parse("round_announce_match_start")
    if not is_empty(df_m_start):
        start_tick = int(df_m_start["tick"].max())
        log_fn(f"🎮 Início da partida detectado no tick {start_tick}")
    else:
        # Fallback: Se não houver announce, tenta o tick do warmup_end
        df_w_end = _parse("warmup_end")
        if not is_empty(df_w_end):
            start_tick = int(df_w_end["tick"].max())
            log_fn(f"🎮 Fim do warmup detectado no tick {start_tick}")
    
    # ── Eventos de Fim de Round ──
    df_re = _parse("round_end")
    if is_empty(df_re): df_re = _parse("round_officially_ended")
    
    # Filtramos por tick para remover rounds de warmup
    if df_re is not None: 
        df_re = df_re[df_re["tick"] >= start_tick].sort_values("tick").reset_index(drop=True)
    
    # Heurística: se o primeiro round_end for antes de 1 minuto de jogo real, 
    # e houver muitos rounds, pode ser que o start_tick falhou.
    # Mas por ora confiamos nos eventos.

    # Duração Fallback se estiver 00:00
    if duration_str == "00:00" and not is_empty(df_re):
        max_t = df_re["tick"].max()
        # Aproximação de 64 ticks por segundo
        ds = max_t / 64
        duration_str = seconds_to_mmss(ds)
        log_fn(f"⏳ Duração estimada via rounds: {duration_str}")

    # ── Kills e Dano ──
    df_kills = _parse("player_death")
    if df_kills is not None: df_kills = filter_tick(df_kills)
    
    df_dmg = _parse("player_hurt")
    if df_dmg is not None: df_dmg = filter_tick(df_dmg)

    # Identificação de rounds para Kills e Dano (Base para métricas)
    round_end_ticks = sorted(df_re["tick"].tolist()) if (df_re is not None and not df_re.empty) else []
    def get_round(t):
        for i, end_t in enumerate(round_end_ticks):
            if t <= end_t: return i + 1
        return len(round_end_ticks)

    if not is_empty(df_kills): df_kills["round_num"] = df_kills["tick"].apply(get_round)
    if not is_empty(df_dmg):   df_dmg["round_num"]   = df_dmg["tick"].apply(get_round)

    if progress_fn: progress_fn(0.25)

    # ── ADR e KDA ──
    dmg_total = {sid: 0 for sid in player_info}
    kda = {sid: {"kills": 0, "deaths": 0, "assists": 0, "hs_kills": 0} for sid in player_info}
    
    if not is_empty(df_dmg):
        att_col = next((c for c in ["attacker_steamid", "attacker_steamid64"] if c in df_dmg.columns), "attacker_steamid")
        dmg_col = next((c for c in ["dmg_health", "damage"] if c in df_dmg.columns), "dmg_health")
        for _, row in df_dmg.iterrows():
            sid = str(row.get(att_col, "0")).split(".")[0]
            if sid in dmg_total: dmg_total[sid] += int(row.get(dmg_col, 0) or 0)

    if not is_empty(df_kills):
        att_col = next((c for c in ["attacker_steamid", "attacker_steamid64"] if c in df_kills.columns), "attacker_steamid")
        vic_col = next((c for c in ["victim_steamid", "victim_steamid64"] if c in df_kills.columns), "victim_steamid")
        ass_col = next((c for c in ["assister_steamid", "assister_steamid64"] if c in df_kills.columns), "assister_steamid")
        for _, row in df_kills.iterrows():
            atk, vic, ass = str(row.get(att_col, "0")).split(".")[0], str(row.get(vic_col, "0")).split(".")[0], str(row.get(ass_col, "0")).split(".")[0]
            if atk in kda and atk != vic:
                kda[atk]["kills"] += 1
                if bool(row.get("headshot", False)): kda[atk]["hs_kills"] += 1
            if vic in kda: kda[vic]["deaths"] += 1
            if ass in kda and ass != "0": kda[ass]["assists"] += 1

    if progress_fn: progress_fn(0.4)

    # ── Score e MVPs ──
    score_map, mvp_map = {sid: 0 for sid in player_info}, {sid: 0 for sid in player_info}
    try:
        df_sc = parser.parse_ticks(["name", "steamid", "score", "mvps"])
        if not is_empty(df_sc):
            latest_sc = df_sc.dropna(subset=["steamid"]).drop_duplicates(subset=["steamid"], keep="last")
            for _, row in latest_sc.iterrows():
                sid = str(row["steamid"]).split(".")[0]
                if sid in score_map:
                    score_map[sid] = int(row.get("score", 0) or 0)
                    mvp_map[sid] = int(row.get("mvps", 0) or 0)
    except: pass

    # ── Placar e Lados ──
    score_a, score_b = 0, 0
    rounds = len(df_re) if df_re is not None else 0
    round_summaries = {}
    team_mapping = {} # sid -> A/B

    # Tenta descobrir o tick do início do round 1 para mapear times
    first_round_tick = start_tick
    try:
        df_freeze = _parse("round_freeze_end")
        if not is_empty(df_freeze): first_round_tick = int(df_freeze["tick"].min())
    except: pass

    # Fonte 1: parse_ticks no R1
    try:
        probe = parser.parse_ticks(["team_name"], ticks=[first_round_tick])
        if not is_empty(probe):
            for _, row in probe.iterrows():
                sid = str(row["steamid"]).split(".")[0]
                team = normalize_team(str(row.get("team_name", "")))
                if sid in player_info and team in ("CT", "T"):
                    team_mapping[sid] = "A" if team == "CT" else "B"
    except: pass

    # Fonte 2: player_info (fallback)
    if not team_mapping:
        for sid, info in player_info.items():
            team_mapping[sid] = "A" if info["team"] == "CT" else "B"

    # Halftime detection e rounds_per_half
    # Tenta detectar via convars (mp_maxrounds)
    rounds_per_half = 12
    try:
        convars = parser.parse_convars()
        if convars and "mp_maxrounds" in convars:
            rounds_per_half = int(convars["mp_maxrounds"]) // 2
            log_fn(f"⚙️ Configuração detectada: MR{rounds_per_half*2}")
    except: pass

    # Tenta detectar via eventos de halftime (mais preciso se houver mudança no meio do jogo)
    try:
        df_ht = _parse("cs_intermission")
        if is_empty(df_ht): df_ht = _parse("round_announce_halftime")
        if not is_empty(df_ht):
            ht_tick = int(df_ht["tick"].min())
            # O halftime acontece DEPOIS do último round da primeira metade
            rounds_before_ht = int((df_re["tick"] < ht_tick).sum())
            if rounds_before_ht > 0:
                rounds_per_half = rounds_before_ht
                log_fn(f"🌓 Halftime detectado após {rounds_per_half} rounds.")
    except: pass

    def side_of_a(r_num):
        if r_num <= rounds_per_half: return "CT"
        reg_rounds = rounds_per_half * 2
        if r_num <= reg_rounds: return "T"
        ot_r = r_num - reg_rounds - 1
        # OT é MR3 (3 rounds cada lado)
        return "CT" if (ot_r // 3) % 2 == 0 else "T"

    if not is_empty(df_re):
        pts_a, pts_b = 0, 0
        w_col = next((c for c in ["winner", "winner_name"] if c in df_re.columns), "winner")
        for i, (_, r_end) in enumerate(df_re.iterrows()):
            r_num = i + 1
            w_side = normalize_team(str(r_end[w_col]))
            
            # Só conta ponto se houver um vencedor claro (CT ou T)
            if w_side in ("CT", "T"):
                cur_a_side = side_of_a(r_num)
                is_a_win = (w_side == cur_a_side)
                if is_a_win: pts_a += 1
                else: pts_b += 1
            
            round_summaries[r_num] = {
                "kills":[], "damage":{}, "winner": w_side, 
                "reason": str(r_end.get("reason", "")), 
                "logical_winner": "A" if (w_side in ("CT", "T") and w_side == side_of_a(r_num)) else ("B" if w_side in ("CT", "T") else "Draw")
            }
        
        score_a, score_b = pts_a, pts_b
        log_fn(f"📊 Placar calculado: {score_a} x {score_b} ({len(df_re)} rounds, RPH: {rounds_per_half})")


    # ── Estatísticas Avançadas (Duelos e Granadas) ──────────
    flash_assists = {sid: 0 for sid in player_info}
    util_dmg      = {sid: 0 for sid in player_info}
    
    adv_stats = {sid: {
        "fk": 0, "fd": 0, "triples": 0, "quads": 0, "aces": 0,
        "blind_time": 0.0, "he": 0, "flash": 0, "smoke": 0, "molotov": 0
    } for sid in player_info}
    
    kast_data = {sid: [False] * (rounds + 1) for sid in player_info}
    weapon_stats = {sid: {} for sid in player_info}
    

    # Granadas Lançadas — tenta parse_grenades() (nativo 0.41.x) antes dos eventos individuais
    try:
        _grenade_type_map = {
            "hegrenade": "he", "flashbang": "flash",
            "smokegrenade": "smoke", "molotov": "molotov", "incgrenade": "molotov",
            "decoy": "other",
        }
        df_grenades_native = parser.parse_grenades()
        if not is_empty(df_grenades_native):
            log_fn(f"💣 parse_grenades colunas: {list(df_grenades_native.columns)}")
            _sid_col = next((c for c in ["thrower_steamid", "thrower", "steamid", "user_steamid"] if c in df_grenades_native.columns), None)
            _type_col = next((c for c in ["grenade_type", "type", "weapon"] if c in df_grenades_native.columns), None)
            if _sid_col and _type_col:
                for _, row in df_grenades_native.iterrows():
                    sid = str(row[_sid_col] or "0").split(".")[0]
                    gtype_raw = str(row[_type_col]).lower().replace("weapon_", "")
                    gtype = _grenade_type_map.get(gtype_raw)
                    if sid in adv_stats and gtype and gtype in adv_stats[sid]:
                        adv_stats[sid][gtype] += 1
                log_fn("💣 Granadas via parse_grenades() (nativo).")
        else:
            raise ValueError("parse_grenades() retornou vazio — tentando fallback por eventos")
    except Exception as _eg:
        log_fn(f"⚠️  parse_grenades falhou ({_eg}), tentando eventos individuais...")
        try:
            events_to_parse = [
                ("hegrenade_detonate", "he"),
                ("flashbang_detonate", "flash"),
                ("smokegrenade_detonate", "smoke"),
                ("inferno_startburn", "molotov")
            ]
            for ev, g_type in events_to_parse:
                df_g = _parse(ev)
                if df_g is None: continue
                df_g = filter_tick(df_g)
                if not is_empty(df_g):
                    t_col = next((c for c in ["userid", "user_steamid", "thrower_steamid", "attacker_steamid", "attacker_steamid64", "thrower"] if c in df_g.columns), None)
                    if t_col:
                        for _, row in df_g.iterrows():
                            sid = str(row[t_col] or "0").split(".")[0]
                            if sid in adv_stats:
                                adv_stats[sid][g_type] += 1
        except Exception as e:
            log_fn(f"⚠️  Granadas (lançadas) não extraídas: {e}")

    # Blind Time (Segundos cegando inimigos)
    df_fa = _parse("player_blind")
    if df_fa is not None:
        df_fa = filter_tick(df_fa)
        if not is_empty(df_fa):
            att_col = next((c for c in ["attacker_steamid", "attacker_steamid64", "thrower_steamid", "thrower"] if c in df_fa.columns), None)
            vic_col = next((c for c in ["victim_steamid", "victim_steamid64", "user_steamid", "user"] if c in df_fa.columns), None)
            dur_col = next((c for c in ["blind_duration", "blind_time", "duration"] if c in df_fa.columns), None)
            if att_col and vic_col and dur_col:
                for _, row in df_fa.iterrows():
                    sid = str(row.get(att_col, "0"))
                    vic = str(row.get(vic_col, "0"))
                    if sid in flash_assists and sid != vic:
                        flash_assists[sid] += 1
                        adv_stats[sid]["blind_time"] += float(row.get(dur_col, 0) or 0)
            else:
                log_fn(f"⚠️  player_blind: campos insuficientes {list(df_fa.columns)}")
    else:
        log_fn("⚠️  player_blind não disponível nesta demo.")

    # Utility Damage (HE, Molotov)
    if df_dmg is not None:
        try:
            df_ud = filter_tick(df_dmg)  # reutiliza player_hurt já carregado
            if not is_empty(df_ud):
                util_weapons = {"hegrenade", "molotov", "inferno", "flashbang"}
                att_col  = next((c for c in ["attacker_steamid", "attacker_steamid64", "attacker"] if c in df_ud.columns), None)
                dmg_col  = next((c for c in ["dmg_health", "damage", "health_damage", "dmg"] if c in df_ud.columns), None)
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
    # Reutiliza df_kills já carregado pelo safe_parse_event acima
    try:
        df_k = df_kills  # já carregado e filtrado
        
        # DEFINIÇÃO ROBUSTA DE ROUNDS: Usamos os ticks de fim de round como fronteiras.
        # Isso garante que kills e danos caiam exatamente nas linhas exibidas na UI.
        # Re-utilizamos os round_end_ticks já definidos acima
        df_k = df_kills  # já carregado e com round_num
        
        if not is_empty(df_k) and "tick" in df_k.columns:
            df_k = df_k.sort_values(by="tick")

            # Mapear vencedores e motivos por round usando round_end
            round_ends = {} # round_num -> {winner, reason}
            if not is_empty(df_re):
                for _, re_row in df_re.iterrows():
                    re_tick = int(re_row["tick"])
                    re_num = get_round(re_tick)
                    round_ends[re_num] = {
                        "winner_side": normalize_team(str(re_row.get("winner", ""))),
                        "reason": str(re_row.get("reason", ""))
                    }

            for r_num, r_kills in df_k.groupby("round_num"):
                r_num = int(r_num)
                r_end_info = round_ends.get(r_num, {})
                
                if r_num not in round_summaries:
                    round_summaries[r_num] = {
                        "kills": [], 
                        "damage": {},
                        "winner": r_end_info.get("winner_side", ""),
                        "reason": r_end_info.get("reason", "")
                    }
                
                if r_kills.empty: continue
                # First Kill e Death
                first = r_kills.iloc[0]
                # AnimGraph 2: coluna pode ser victim_steamid (novo) ou user_steamid (antigo)
                _att_col = next((c for c in ["attacker_steamid", "attacker_steamid64", "attacker"] if c in r_kills.columns), "attacker_steamid")
                _vic_col = next((c for c in ["victim_steamid", "victim_steamid64", "user_steamid", "user"] if c in r_kills.columns), "victim_steamid")
                _ass_col = next((c for c in ["assister_steamid", "assister_steamid64", "assister"] if c in r_kills.columns), "assister_steamid")
                att = str(first.get(_att_col, "0") or "0")
                vic = str(first.get(_vic_col, "0") or "0")
                if att in adv_stats and att != vic and att != "0":
                    adv_stats[att]["fk"] += 1
                if vic in adv_stats and vic != "0":
                    adv_stats[vic]["fd"] += 1

                # Registrar todas as kills do round para o log
                for _, k_row in r_kills.iterrows():
                    k_att = str(k_row.get(_att_col, "0") or "0")
                    k_vic = str(k_row.get(_vic_col, "0") or "0")
                    k_ass = str(k_row.get(_ass_col, "0") or "0") if "_ass_col" in locals() else "0"
                    
                    if k_att != "0" and k_att in player_info:
                        # Weapon Stats
                        w = str(k_row.get("weapon", "unknown")).replace("weapon_", "")
                        weapon_stats[k_att][w] = weapon_stats[k_att].get(w, 0) + 1
                        
                        # KAST (Kill)
                        if r_num <= rounds: kast_data[k_att][r_num] = True
                        
                        # Tenta atualizar nome se o atual for ruim
                        att_name = str(k_row.get("attacker_name", ""))
                        if att_name and (not player_info[k_att]["name"] or player_info[k_att]["name"].isdigit()) and not att_name.isdigit():
                            player_info[k_att]["name"] = att_name

                        if k_vic != "0" and k_vic in player_info:
                            vic_name = str(k_row.get("user_name", ""))
                            if vic_name and (not player_info[k_vic]["name"] or player_info[k_vic]["name"].isdigit()) and not vic_name.isdigit():
                                player_info[k_vic]["name"] = vic_name

                        # Descobrir o lado (CT/T) de cada um para o visual
                        att_side = "unknown"
                        vic_side = "unknown"
                        try:
                            # Tenta pegar info rápida do lado
                            sides_df = parser.parse_ticks(
                                ["team_name"],
                                ticks=[int(k_row["tick"])],
                                players=[int(k_att), int(k_vic)]
                            )
                            if sides_df is not None and not sides_df.empty:
                                for _, s_row in sides_df.iterrows():
                                    if str(s_row["steamid"]) == k_att: att_side = normalize_team(str(s_row["team_name"]))
                                    if str(s_row["steamid"]) == k_vic: vic_side = normalize_team(str(s_row["team_name"]))
                        except: pass

                        round_summaries[r_num]["kills"].append({
                            "attackerName": player_info[k_att]["name"],
                            "attackerSteamId": k_att,
                            "attackerSide": att_side,
                            "victimName": player_info.get(k_vic, {}).get("name", "Jogador"),
                            "victimSteamId": k_vic,
                            "victimSide": vic_side,
                            "weapon": w,
                            "isHeadshot": bool(k_row.get("headshot", False)),
                            "tick": int(k_row["tick"]),
                            "attX": float(k_row.get("attacker_x", 0)),
                            "attY": float(k_row.get("attacker_y", 0)),
                            "vicX": float(k_row.get("victim_x", 0)),
                            "vicY": float(k_row.get("victim_y", 0))
                        })
                        
                    if k_ass != "0" and k_ass in player_info and r_num <= rounds:
                        kast_data[k_ass][r_num] = True # KAST (Assist)

                # Multi-kills
                r_counts = r_kills[r_kills[_att_col] != r_kills[_vic_col]].groupby(_att_col).size()
                for atk_sid, count in r_counts.items():
                    atk_sid = str(atk_sid)
                    if atk_sid in adv_stats:
                        if count == 3: adv_stats[atk_sid]["triples"] += 1
                        elif count == 4: adv_stats[atk_sid]["quads"] += 1
                        elif count >= 5: adv_stats[atk_sid]["aces"] += 1

            # Extrair Dano por Round
            try:
                df_dmg_rounds = _parse("player_hurt")
                df_dmg_rounds = filter_tick(df_dmg_rounds)
                if not is_empty(df_dmg_rounds):
                    df_dmg_rounds["round_num"] = df_dmg_rounds["tick"].apply(get_round) if round_end_ticks else [1] * len(df_dmg_rounds)
                    
                    # Identificar coluna de dano
                    dmg_col = next((c for c in ["dmg_health", "damage", "health_damage", "dmg"] if c in df_dmg_rounds.columns), None)
                    att_col = next((c for c in ["attacker_steamid", "attacker_steamid64", "attacker"] if c in df_dmg_rounds.columns), None)

                    if dmg_col and att_col:
                        for r_num, r_dmg in df_dmg_rounds.groupby("round_num"):
                            r_num = int(r_num)
                            if r_num not in round_summaries:
                                round_summaries[r_num] = {"kills": [], "damage": {}}
                            
                            # Dano causado por atacante neste round
                            dmg_agg = r_dmg.groupby(att_col)[dmg_col].sum()
                            for sid, d_val in dmg_agg.items():
                                round_summaries[r_num]["damage"][str(sid)] = int(d_val)
                                
            except Exception as e:
                log_fn(f"⚠️  Erro ao processar dano por round: {e}")


    except Exception as e:
        log_fn(f"⚠️  Duelos não extraídos integralmente: {e}")

    # ── Finalizar KAST (Survival) ──
    _vic_col_final = next((c for c in ["victim_steamid", "victim_steamid64", "user_steamid", "user"] if not is_empty(df_kills) and c in df_kills.columns), "victim_steamid")
    for sid in player_info:
        for r in range(1, rounds + 1):
            if not kast_data[sid][r]:
                # Se não morreu no round, KAST = True
                died = any((df_kills["round_num"] == r) & (df_kills[_vic_col_final] == sid)) if not is_empty(df_kills) else False
                if not died:
                    kast_data[sid][r] = True

    # ──────────────────────────────────────────
    # Monta a lista de jogadores (somente quem participou da partida real)
    # ──────────────────────────────────────────
    players_out = []
    total_kills_extracted = sum(kda[s]["kills"] + kda[s]["deaths"] for s in kda)
    apply_kda_filter = total_kills_extracted > 0

    for sid, info in player_info.items():
        k, d, a = kda[sid]["kills"], kda[sid]["deaths"], kda[sid]["assists"]
        
        if apply_kda_filter and k == 0 and d == 0:
            continue

        hs  = kda[sid]["hs_kills"]
        dmg = dmg_total.get(sid, 0)
        adr = round(dmg / max(rounds, 1), 1)
        
        # KAST %
        kast = round((sum(kast_data[sid][1:rounds+1]) / max(rounds, 1)) * 100, 1)
        
        # Rating 2.0 Simplificado
        kpr, dpr = k / max(rounds, 1), d / max(rounds, 1)
        rating = round(0.0073 * kast + 0.3591 * kpr - 0.5329 * dpr + 0.0032 * adr + 0.1587, 2)

        players_out.append({
            "steamId":       sid,
            "displayName":   info["name"],
            "team":          info["team"],
            "kills":         k,
            "deaths":        d,
            "assists":       a,
            "score":         score_map.get(sid, 0),
            "mvps":          mvp_map.get(sid, 0),
            "adr":           adr,
            "hsPercentage":  round((hs / max(k, 1)) * 100, 1),
            "matchResult":   "tie",
            "metadata": {
                "name": info["name"], "nickname": info["name"],
                "kast": kast, "rating": rating, "weaponStats": weapon_stats[sid],
                "flashAssists": flash_assists.get(sid, 0), "utilDmg": util_dmg.get(sid, 0), "rawDmg": dmg,
                "fk": adv_stats[sid]["fk"], "fd": adv_stats[sid]["fd"],
                "triples": adv_stats[sid]["triples"], "quads": adv_stats[sid]["quads"], "aces": adv_stats[sid]["aces"],
                "blindTime": round(adv_stats[sid]["blind_time"], 1),
                "heThrown": adv_stats[sid]["he"], "flashThrown": adv_stats[sid]["flash"], 
                "smokesThrown": adv_stats[sid]["smoke"], "molotovThrown": adv_stats[sid]["molotov"]
            },
        })

    # ── Extração de Trajetórias para Replay 2D ──
    log_fn("📍 Extraindo trajetórias para replay 2D...")
    replay_data = {}
    try:
        p_header = parser.parse_header()
        playback_ticks = p_header.get("playback_ticks", 0)
        # Amostragem de ~1Hz (64 ticks em CS2 / 32-64 ticks dependendo da demo)
        interval = 64
        target_ticks = list(range(0, int(playback_ticks), interval))
        if target_ticks and target_ticks[-1] < playback_ticks: target_ticks.append(int(playback_ticks))
        
        # Colunas de interesse para o replay
        pos_cols = ["X", "Y", "Z", "view_angle", "team_name", "is_alive"]
        df_pos = parser.parse_ticks(pos_cols, ticks=target_ticks)
        
        if not is_empty(df_pos):
            # Agrupa por tick
            for tick, group in df_pos.groupby("tick"):
                tick_pos = []
                for _, row in group.iterrows():
                    sid = str(row.get("steamid", "0")).split(".")[0]
                    # Fallback para steamid se vier em outra coluna
                    if sid == "0" and "user_steamid" in row: sid = str(row["user_steamid"]).split(".")[0]
                    
                    if sid in player_info:
                        tick_pos.append({
                            "id": sid,
                            "x": round(float(row.get("X", 0)), 1),
                            "y": round(float(row.get("Y", 0)), 1),
                            "a": round(float(row.get("view_angle", 0)), 1),
                            "l": bool(row.get("is_alive", True)),
                            "s": normalize_team(str(row.get("team_name", "Unknown")))
                        })
                if tick_pos:
                    replay_data[str(tick)] = tick_pos
            log_fn(f"📍 Trajetórias extraídas: {len(replay_data)} frames.")
    except Exception as e:
        log_fn(f"⚠️ Erro ao extrair trajetórias: {e}")

    # Determina resultado final baseado no Time A vs Time B
    if score_a is not None and score_b is not None:
        if score_a > score_b: # Time A venceu
            results_map = {"A": "win", "B": "loss"}
        elif score_b > score_a: # Time B venceu
            results_map = {"A": "loss", "B": "win"}
        else: # Empate
            results_map = {"A": "tie", "B": "tie"}
            
        for p in players_out:
            sid = p["steamId"]
            logical_team = team_mapping.get(sid)
            if logical_team:
                p["matchResult"] = results_map[logical_team]
            else:
                # Fallback caso o jogador tenha entrado depois
                p["matchResult"] = "tie"

    match_id = generate_match_id(header, filepath)
    match_out = {
        "id":        match_id,
        "source":    "mix",          # padrão; usuário pode alterar na UI
        "mapName":   map_name,
        "duration":  duration_str,
        "matchDate": match_date if match_date else datetime.now(),
        "scoreA":    score_a,
        "scoreB":    score_b,
        "metadata":  {
            "demoFile": os.path.basename(filepath),
            "roundSummaries": round_summaries,
            "replayData": replay_data
        },
    }

    log_fn(f"✅ Demo processada: {len(players_out)} jogadores, placar {score_a} x {score_b}")
    log_fn(f"🔑 Match ID gerado: {match_id}")
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
        self._batch_files = []    # lista de arquivos para fila

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
        left.grid_rowconfigure(8, weight=1)
        left.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(left, text="Arquivo de Demo", font=ctk.CTkFont(weight="bold")).grid(
            row=0, column=0, padx=14, pady=(14, 4), sticky="w"
        )

        self._demo_path_var = ctk.StringVar(value="Nenhuma demo selecionada")
        ctk.CTkEntry(left, textvariable=self._demo_path_var, state="readonly").grid(
            row=1, column=0, padx=14, pady=(0, 6), sticky="ew"
        )
        ctk.CTkButton(left, text="📁  Selecionar Demo Única", command=self._select_demo).grid(
            row=2, column=0, padx=14, pady=(0, 6), sticky="ew"
        )
        ctk.CTkButton(left, text="📂  Selecionar Múltiplas (Fila)", command=self._select_multiple_demos, fg_color="#34495e", hover_color="#2c3e50").grid(
            row=3, column=0, padx=14, pady=(0, 12), sticky="ew"
        )

        sep = ctk.CTkFrame(left, height=1, fg_color="#333")
        sep.grid(row=4, column=0, padx=14, sticky="ew", pady=4)

        # Source
        ctk.CTkLabel(left, text="Tipo de Partida (source)", font=ctk.CTkFont(weight="bold")).grid(
            row=5, column=0, padx=14, pady=(10, 4), sticky="w"
        )
        self._source_var = ctk.StringVar(value="mix")
        ctk.CTkOptionMenu(
            left,
            values=["mix", "matchmaking", "faceit", "esea", "gcbrasil", "outro"],
            variable=self._source_var,
        ).grid(row=6, column=0, padx=14, pady=(0, 12), sticky="ew")

        # Data da Partida
        ctk.CTkLabel(left, text="Data da Partida (YYYY-MM-DD HH:MM)", font=ctk.CTkFont(weight="bold")).grid(
            row=7, column=0, padx=14, pady=(5, 4), sticky="w"
        )
        self._date_var = ctk.StringVar(value=datetime.now().strftime("%Y-%m-%d %H:%M"))
        ctk.CTkEntry(left, textvariable=self._date_var).grid(
            row=8, column=0, padx=14, pady=(0, 12), sticky="ew"
        )

        # Log
        ctk.CTkLabel(left, text="Log de Processamento", font=ctk.CTkFont(weight="bold")).grid(
            row=9, column=0, padx=14, pady=(10, 4), sticky="w"
        )
        self._log_box = ctk.CTkTextbox(left, font=ctk.CTkFont(family="Consolas", size=11))
        self._log_box.grid(row=10, column=0, padx=14, pady=(0, 6), sticky="nsew")
        left.grid_rowconfigure(10, weight=1)

        # Barra de Progresso
        self._progress_var = ctk.DoubleVar(value=0.0)
        self._progress_bar = ctk.CTkProgressBar(left, variable=self._progress_var, progress_color="#e94560")
        self._progress_bar.grid(row=11, column=0, padx=14, pady=(0, 10), sticky="ew")

        # Botões de ação
        btn_frame = ctk.CTkFrame(left, fg_color="transparent")
        btn_frame.grid(row=12, column=0, padx=14, pady=(0, 14), sticky="ew")
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

        self._btn_export = ctk.CTkButton(
            btn_frame, text="💾  Exportar JSON",
            fg_color="#16213e", hover_color="#0f3460",
            command=self._on_export_json, state="disabled"
        )
        self._btn_export.grid(row=1, column=0, columnspan=2, pady=(8, 0), sticky="ew")

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
            self._batch_files = []
            self._demo_path_var.set(os.path.basename(path))
            self._full_path = path
            self._demo_data = None
            
            # Tenta pegar a data do arquivo
            try:
                mtime = os.path.getmtime(path)
                f_date = datetime.fromtimestamp(mtime)
                self._date_var.set(f_date.strftime("%Y-%m-%d %H:%M"))
                self._log(f"📅 Data detectada do arquivo: {f_date.strftime('%d/%m/%Y %H:%M')}")
            except:
                pass

            self._btn_process.configure(state="normal", text="🔍  Processar Demo")
            self._btn_send.configure(state="disabled")
            self._show_placeholder()
            self._log_box.delete("1.0", "end")
            self._log(f"📂 Demo selecionada: {os.path.basename(path)}")

    def _select_multiple_demos(self):
        paths = filedialog.askopenfilenames(
            title="Selecionar múltiplas demos (.dem)",
            filetypes=[("CS2 Demo Files", "*.dem"), ("Todos os arquivos", "*.*")]
        )
        if paths:
            self._batch_files = list(paths)
            self._demo_path_var.set(f"{len(paths)} arquivos selecionados")
            self._demo_data = None
            self._btn_process.configure(state="normal", text="🚀  Iniciar Fila")
            self._btn_send.configure(state="disabled")
            self._show_placeholder()
            self._log_box.delete("1.0", "end")
            self._log(f"📂 {len(paths)} demos na fila para processamento.")

    # ── Processar Demo ────────────────────────

    def _on_process(self):
        if self._processing:
            return

        if self._batch_files:
            self._on_batch_process()
            return

        path = self._full_path if hasattr(self, '_full_path') else self._demo_path_var.get()
        if not path or not os.path.isfile(path):
            messagebox.showerror("Erro", "Selecione um arquivo .dem válido.")
            return

        # Pega a data da UI
        try:
            m_date = datetime.strptime(self._date_var.get(), "%Y-%m-%d %H:%M")
        except:
            m_date = datetime.now()
            self._log("⚠️ Formato de data inválido, usando agora.")

        self._processing = True
        self._btn_process.configure(state="disabled", text="⏳  Processando...")
        self._btn_send.configure(state="disabled")
        self._demo_data = None

        threading.Thread(target=self._do_parse, args=(path, m_date), daemon=True).start()

    def _on_batch_process(self):
        self._processing = True
        self._btn_process.configure(state="disabled", text="⏳  Em Fila...")
        self._btn_send.configure(state="disabled")
        self._log_box.delete("1.0", "end")
        self._log(f"🚀 Iniciando processamento de {len(self._batch_files)} demos...")
        
        threading.Thread(target=self._do_batch_process, daemon=True).start()

    def _do_batch_process(self):
        count = len(self._batch_files)
        success = 0
        errors = 0
        source = self._source_var.get()

        for i, path in enumerate(self._batch_files):
            name = os.path.basename(path)
            self._log(f"\n--- [{i+1}/{count}] {name} ---")
            
            # Para fila, sempre tenta pegar data do arquivo
            m_date = datetime.now()
            try:
                mtime = os.path.getmtime(path)
                m_date = datetime.fromtimestamp(mtime)
                self._log(f"📅 Data do arquivo: {m_date.strftime('%d/%m/%Y %H:%M')}")
            except:
                pass

            def update_progress(val):
                total_val = (i + val) / count
                self.after(0, lambda: self._progress_var.set(total_val))

            try:
                result = parse_demo(path, log_fn=self._log, match_date=m_date, progress_fn=update_progress)
                if result:
                    result["match"]["source"] = source
                    self._log("📤 Enviando para o banco (Auto-overwrite)...")
                    # O db_connector.insert_match já faz overwrite por causa do DELETE GlobalMatchPlayer
                    ok, msg = db_connector.insert_match(result["match"], result["players"])
                    if ok:
                        success += 1
                        self._log(f"✅ Sucesso: {msg}")
                    else:
                        errors += 1
                        self._log(f"❌ Erro no banco: {msg}")
                else:
                    errors += 1
                    self._log(f"❌ Falha no parse da demo.")
            except Exception as e:
                errors += 1
                self._log(f"❌ Erro inesperado: {str(e)}")
            
            # Pequeno delay para UI respirar
            self.after(100)

        self._processing = False
        summary = f"\n✨ Fila Concluída!\n✅ Sucessos: {success}\n❌ Erros: {errors}"
        self._log(summary)
        self.after(0, lambda: messagebox.showinfo("Fila Concluída", summary))
        self.after(0, lambda: self._btn_process.configure(state="normal", text="🚀  Iniciar Fila"))

    def _do_parse(self, path: str, m_date):
        def update_progress(val):
            self.after(0, lambda: self._progress_var.set(val))

        try:
            result = parse_demo(
                path, 
                log_fn=self._log, 
                match_date=m_date,
                progress_fn=update_progress
            )
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

        # ── Placar (Time A = quem começou como CT | Time B = quem começou como TR)
        score_a = match.get("scoreA", "?")
        score_b = match.get("scoreB", "?")
        score_frame = ctk.CTkFrame(self._preview_frame, fg_color="#0f3460", corner_radius=8)
        score_frame.pack(fill="x", pady=(0, 12))
        ctk.CTkLabel(
            score_frame,
            text=f"TIME A  {score_a}  ×  {score_b}  TIME B",
            font=ctk.CTkFont(size=24, weight="bold"),
            text_color="white",
        ).pack(pady=8)
        ctk.CTkLabel(
            score_frame,
            text="(Time A = CT inicial  |  Time B = TR inicial)",
            font=ctk.CTkFont(size=10),
            text_color="#7ca8d4",
        ).pack(pady=(0, 8))

        # ── Tabela de Jogadores
        headers = ["Jogador", "Steam ID", "Time", "K", "D", "A", "ADR", "KAST", "Rating", "Resultado"]
        col_weights = [3, 2, 1, 1, 1, 1, 1, 1, 1, 1]

        header_row = ctk.CTkFrame(self._preview_frame, fg_color="#16213e", corner_radius=6)
        header_row.pack(fill="x", pady=(0, 2))
        for i, (h, w) in enumerate(zip(headers, col_weights)):
            header_row.grid_columnconfigure(i, weight=w)
            ctk.CTkLabel(header_row, text=h, font=ctk.CTkFont(weight="bold", size=11), text_color="#aaa").grid(
                row=0, column=i, padx=6, pady=6, sticky="w"
            )

        result_colors = {"Win": "#2ecc71", "Loss": "#e74c3c", "Tie": "#f39c12"}

        # Ordena por Rating desc
        sorted_players = sorted(players, key=lambda p: (p.get("metadata", {}).get("rating", 0)), reverse=True)

        for idx, p in enumerate(sorted_players):
            bg = "#1e1e2e" if idx % 2 == 0 else "#252535"
            row_f = ctk.CTkFrame(self._preview_frame, fg_color=bg, corner_radius=4)
            row_f.pack(fill="x", pady=1)
            for i, w in enumerate(col_weights):
                row_f.grid_columnconfigure(i, weight=w)

            res_color = result_colors.get(p.get("matchResult", "Tie"), "gray")
            team_color = "#5dade2" if p.get("team") == "CT" else "#e59866"
            m = p.get("metadata", {})

            values = [
                (p.get("displayName", "?"),    "white"),
                (p.get("steamId", "0"),         "#888"),
                (p.get("team", "?"),            team_color),
                (str(p.get("kills", 0)),        "white"),
                (str(p.get("deaths", 0)),       "#e74c3c"),
                (str(p.get("assists", 0)),      "#f1c40f"),
                (f"{p.get('adr', 0):.1f}",     "#2ecc71"),
                (f"{m.get('kast', 0):.1f}%",   "#3498db"),
                (f"{m.get('rating', 0):.2f}",  "#e94560"),
                (p.get("matchResult", "?").upper(), res_color),
            ]

            for i, (val, color) in enumerate(values):
                ctk.CTkLabel(
                    row_f, text=val,
                    font=ctk.CTkFont(size=11),
                    text_color=color, anchor="w"
                ).grid(row=0, column=i, padx=6, pady=5, sticky="w")

        # ── Linha do Tempo (Rounds) ────────────────
        ctk.CTkLabel(
            self._preview_frame, 
            text="⏳ LINHA DO TEMPO (Selecione os rounds que deseja enviar)", 
            font=ctk.CTkFont(size=13, weight="bold"),
            text_color="#aaa"
        ).pack(fill="x", pady=(20, 10))

        summaries = match.get("metadata", {}).get("roundSummaries", {})
        self._round_vars = {}

        if not summaries:
            ctk.CTkLabel(self._preview_frame, text="Nenhum dado de round disponível.", text_color="gray").pack()
        else:
            # Container pros rounds
            timeline_f = ctk.CTkFrame(self._preview_frame, fg_color="transparent")
            timeline_f.pack(fill="x")
            
            # Ordena rounds numericamente
            sorted_rounds = sorted([int(k) for k in summaries.keys()])
            
            for r_num in sorted_rounds:
                # Busca flexível (aceita chave int ou str)
                s = summaries.get(r_num) or summaries.get(str(r_num))
                if not s: 
                    continue
                    
                r_frame = ctk.CTkFrame(timeline_f, fg_color="#1a1a2e", corner_radius=6)
                r_frame.pack(fill="x", pady=2)
                
                # Checkbox
                var = ctk.BooleanVar(value=True)
                self._round_vars[r_num] = var
                cb = ctk.CTkCheckBox(r_frame, text="", variable=var, width=20, checkbox_width=18, checkbox_height=18)
                cb.pack(side="left", padx=10)
                
                # Info
                winner = s.get("winner", "Unknown")
                reason = s.get("reason", "").replace("ct_win_", "").replace("t_win_", "").replace("_", " ")
                color = "#5dade2" if winner == "CT" else "#e59866"
                
                txt = f"ROUND {r_num:02d} | "
                ctk.CTkLabel(r_frame, text=txt, font=ctk.CTkFont(size=11, weight="bold")).pack(side="left")
                
                win_label = ctk.CTkLabel(r_frame, text=f" {winner} ", text_color="white", fg_color=color, corner_radius=4, font=ctk.CTkFont(size=10, weight="bold"))
                win_label.pack(side="left", padx=5)
                
                ctk.CTkLabel(r_frame, text=f" {reason}", font=ctk.CTkFont(size=11), text_color="#ccc").pack(side="left", padx=10)
                
                kills = s.get("kills", [])
                if kills:
                    kills_txt = f"({len(kills)} kills)"
                    # Verifica se houve morte de faca
                    has_knife = any("knife" in str(k.get("weapon", "")).lower() or "bayonet" in str(k.get("weapon", "")).lower() for k in kills)
                    if has_knife:
                        kills_txt = "🔪 " + kills_txt
                    ctk.CTkLabel(r_frame, text=kills_txt, font=ctk.CTkFont(size=10), text_color="gray").pack(side="right", padx=15)

        self._btn_send.configure(state="normal")
        self._btn_export.configure(state="normal")

    # ── Enviar para Banco ─────────────────────

    def _on_export_json(self):
        if not self._demo_data: return
        
        match_id = self._demo_data["match"]["id"]
        default_name = f"match_{match_id}.json"
        
        file_path = filedialog.asksaveasfilename(
            defaultextension=".json",
            initialfile=default_name,
            filetypes=[("JSON files", "*.json")],
            title="Exportar Partida para JSON"
        )
        
        if file_path:
            try:
                import json
                # Helper para datetime
                def dt_handler(obj):
                    if hasattr(obj, 'isoformat'): return obj.isoformat()
                    return str(obj)
                
                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(self._demo_data, f, indent=4, default=dt_handler, ensure_ascii=False)
                
                self._log(f"✅ Exportado com sucesso: {os.path.basename(file_path)}")
                messagebox.showinfo("Exportar", "Dados exportados com sucesso!")
            except Exception as e:
                self._log(f"❌ Erro ao exportar: {e}")
                messagebox.showerror("Erro", f"Falha ao exportar JSON: {e}")

    def _on_send(self):
        if not self._demo_data:
            messagebox.showerror("Erro", "Processe uma demo primeiro.")
            return

        # Cria cópia profunda parcial para não corromper os dados originais em caso de re-envio
        match = self._demo_data["match"].copy()
        match["metadata"] = self._demo_data["match"]["metadata"].copy()
        
        players = [p.copy() for p in self._demo_data["players"]]
        raw_data = self._demo_data.get("raw", {}) # Supondo que parse_demo retorne os DFs brutos no 'raw'

        # ── Filtragem Manual de Rounds ──
        selected_rounds = [r for r, var in self._round_vars.items() if var.get()]
        if not selected_rounds:
            messagebox.showerror("Erro", "Selecione pelo menos um round para enviar.")
            return
        
        self._log(f"⚡ Filtrando partida: Mantendo {len(selected_rounds)} rounds...")

        # Recalcular Placar
        new_score_a = 0
        new_score_b = 0
        summaries = match.get("metadata", {}).get("roundSummaries", {})
        
        # Identificar Time A/B via mapping original
        # O mapping está no metadata.roundSummaries em cada kill ou derivado de logic
        # Mas vamos usar o score_a/score_b original vs winner_side
        # Na verdade, a forma mais segura é filtrar os pontos
        
        # Como já fizemos a lógica robusta de Logical Team A/B no parse_demo,
        # vamos apenas re-executar a contagem sobre os rounds selecionados.
        # Mas para simplificar aqui (já que não temos o team_mapping em mãos fácil na UI),
        # vamos pedir pro db_connector aceitar o que mandamos.
        
        def is_team_a_winner(r_num):
            s = summaries.get(r_num) or summaries.get(str(r_num), {})
            return s.get("logical_winner") == "A"
        
        def is_team_b_winner(r_num):
            s = summaries.get(r_num) or summaries.get(str(r_num), {})
            return s.get("logical_winner") == "B"

        new_score_a = len([r for r in selected_rounds if is_team_a_winner(r)])
        new_score_b = len([r for r in selected_rounds if is_team_b_winner(r)])
        
        match["scoreA"] = new_score_a
        match["scoreB"] = new_score_b
        
        # Recalcular Estatísticas de Jogadores
        for p in players:
            sid = p["steamId"]
            p_kills = 0
            p_deaths = 0
            p_assists = 0
            p_damage = 0
            p_hs = 0
            
            for r_num in selected_rounds:
                s = summaries.get(r_num) or summaries.get(str(r_num), {})
                if not s: continue
                
                # Kills
                r_kills = s.get("kills", [])
                p_kills += len([k for k in r_kills if str(k.get("attackerSteamId") or k.get("attacker_steamid")) == sid])
                p_deaths += len([k for k in r_kills if str(k.get("victimSteamId") or k.get("user_steamid")) == sid])
                p_assists += len([k for k in r_kills if str(k.get("assisterSteamId") or k.get("assister_steamid")) == sid])
                p_hs += len([k for k in r_kills if str(k.get("attackerSteamId") or k.get("attacker_steamid")) == sid and k.get("isHeadshot")])
                
                # Damage (usando o summary damage map)
                p_damage += s.get("damage", {}).get(sid, 0)

            p["kills"] = p_kills
            p["deaths"] = p_deaths
            p["assists"] = p_assists
            p["adr"] = p_damage / len(selected_rounds) if selected_rounds else 0
            p["hsPercentage"] = (p_hs / p_kills * 100) if p_kills > 0 else 0
            
            # Winner?
            if new_score_a > new_score_b:
                # O Time original do player é mantido
                # Precisamos saber se ele era A ou B.
                # No parse_demo, salvei o resultado na lógica original.
                # Se p["matchResult"] mudou, vamos herdar da nova pontuação
                if p["matchResult"] == "tie": pass # mantém
                else:
                    # Se antes era win e A ganhou, ele é A.
                    # Se antes era loss e A ganhou, ele é B.
                    # Vamos simplificar: se o resultado original era baseado em ser A...
                    pass # Na verdade a lógica de win/loss precisa ser consistente.

        # --- NOVO: Filtrar o JSON de metadados para que o site reflita a exclusão ---
        filtered_summaries = {}
        for r_num in selected_rounds:
            key = str(r_num)
            if key in summaries:
                filtered_summaries[key] = summaries[key]
            elif r_num in summaries:
                filtered_summaries[key] = summaries[r_num]
        
        # Substitui no metadata original (cópia)
        match["metadata"]["roundSummaries"] = filtered_summaries

        # Atualiza a UI para mostrar que estamos enviando dados filtrados
        self._log(f"📊 Novo placar: {new_score_a} - {new_score_b}")
        
        # Atualiza source
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
            self._btn_export.configure(state="normal")
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
