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


def safe_val(val, default=0.0):
    """Garante que o valor seja um float válido para JSON (sem NaN/Inf)."""
    try:
        import math
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except:
        return default


def sid_norm(val):
    """Normaliza SteamID para string, removendo .0 se necessário."""
    if val is None or str(val) == "0" or str(val) == "None": return ""
    return str(val).split(".")[0].strip()


# ─────────────────────────────────────────────
# Parser de Demo
# ─────────────────────────────────────────────

def quick_scan_demo(filepath: str) -> dict | None:
    """
    Faz um scan super rápido (2-5s) apenas para identificar a partida.
    Retorna { map, scoreA, scoreB, players: [names...] }
    """
    if not HAS_PARSER: return None
    try:
        parser = DemoParser(filepath)
        header = parser.parse_header()
        map_name = str(header.get("map_name", "unknown")).lower()
        
        # Pega jogadores e scores dos últimos ticks
        df_players = parser.parse_ticks(["name", "team_name", "score"])
        if df_players is None or df_players.empty:
            return {"map": map_name, "scoreA": 0, "scoreB": 0, "players": []}
        
        # Pega o último estado de cada jogador
        latest = df_players.dropna(subset=["steamid"]).drop_duplicates(subset=["steamid"], keep="last")
        players = []
        sA, sB = 0, 0
        
        for _, row in latest.iterrows():
            name = str(row.get("name", "Unknown"))
            team = normalize_team(str(row.get("team_name", "")))
            if team == "CT": sA = max(sA, int(row.get("score", 0)))
            if team == "T": sB = max(sB, int(row.get("score", 0)))
            if name and not name.isdigit():
                players.append(f"{name} ({team})")
        
        return {
            "map": map_name,
            "scoreA": sA,
            "scoreB": sB,
            "players": sorted(players),
            "duration": seconds_to_mmss(float(header.get("playback_time", 0)))
        }
    except:
        return None

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
        try:
            df = safe_parse_event(parser, ev)
            if is_empty(df): return None
            # Normalização de colunas para garantir que o resto do código funcione
            rename_map = {
                "attacker_pawn_steamid": "attacker_steamid",
                "victim_pawn_steamid": "victim_steamid",
                "user_pawn_steamid": "victim_steamid",
                "assister_pawn_steamid": "assister_steamid",
                "attacker_steamid64": "attacker_steamid",
                "user_steamid": "victim_steamid",
                "user_steamid64": "victim_steamid",
                "victim_steamid64": "victim_steamid",
                "assister_steamid64": "assister_steamid"
            }
            # Verifica se as colunas existem antes de renomear para evitar erro
            actual_renames = {k: v for k, v in rename_map.items() if k in df.columns}
            if actual_renames:
                df = df.rename(columns=actual_renames)
            return df
        except Exception as e:
            log_fn(f"⚠️ Erro ao parsear evento {ev}: {e}")
            return None

    # ── Header e Duração ─────────────────
    header = {}
    map_name, duration_str = "unknown", "00:00"
    try:
        header = parser.parse_header()
        map_name = str(header.get("map_name", "unknown")).lower()
        # Normalização: Se for Cache (Workshop ou Oficial), força 'de_cache'
        if "cache" in map_name:
            map_name = "de_cache"
        else:
            # Para outros mapas, remove o path do workshop se existir (workshop/123/de_dust2 -> de_dust2)
            map_name = map_name.split("/")[-1]

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
                # Conversão robusta de SteamID
                sid = sid_norm(row.get("steamid"))
                if not sid: continue
                
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
    df_re_raw = _parse("round_end")
    if is_empty(df_re_raw): df_re_raw = _parse("round_officially_ended")
    
    # Filtramos por tick para remover rounds de warmup
    df_re = df_re_raw
    if not is_empty(df_re): 
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
    df_kills_raw = _parse("player_death")
    df_dmg_raw = _parse("player_hurt")
    
    df_kills = filter_tick(df_kills_raw)
    df_dmg = filter_tick(df_dmg_raw)
    
    # Validação de Filtro: se o filtro limpou TUDO mas havia dados antes, o start_tick está errado.
    if is_empty(df_kills) and not is_empty(df_kills_raw):
        log_fn("⚠️  Aviso: Filtro de warmup removeu todas as kills. Ignorando filtro de início.")
        df_kills = df_kills_raw
        df_dmg = df_dmg_raw
        # Ajusta round_end também se necessário
        if not is_empty(df_re_raw): df_re = df_re_raw

    # GARANTIR QUE TODOS OS JOGADORES DOS EVENTOS ESTEJAM NO PLAYER_INFO
    # (Fazemos isso antes de qualquer loop de rounds ou kda)
    for df in [df_kills, df_dmg]:
        if not is_empty(df):
            for col in ["attacker_steamid", "victim_steamid", "assister_steamid"]:
                if col in df.columns:
                    for val in df[col].dropna().unique():
                        sid = sid_norm(val)
                        if sid and sid not in player_info:
                            player_info[sid] = {"name": f"Jogador_{sid[-4:]}", "team": "unknown"}

    # Identificação de rounds para Kills e Dano (Base para métricas) - OTIMIZADO
    round_end_ticks = sorted(df_re["tick"].tolist()) if (df_re is not None and not df_re.empty) else []
    
    def get_round(t):
        if not round_end_ticks: return 1
        return int(np.searchsorted(round_end_ticks, t) + 1)

    if round_end_ticks and not is_empty(df_kills):
        import numpy as np
        df_kills["round_num"] = np.searchsorted(round_end_ticks, df_kills["tick"]) + 1
    elif not is_empty(df_kills):
        df_kills["round_num"] = 1

    if round_end_ticks and not is_empty(df_dmg):
        import numpy as np
        df_dmg["round_num"] = np.searchsorted(round_end_ticks, df_dmg["tick"]) + 1
    elif not is_empty(df_dmg):
        df_dmg["round_num"] = 1

    if progress_fn: progress_fn(0.25)

    # ── ADR e KDA ──
    dmg_total = {}
    kda = {}
    score_map = {}
    mvp_map = {}

    # GARANTIR QUE TODOS OS JOGADORES DOS EVENTOS ESTEJAM NO PLAYER_INFO
    for df in [df_kills, df_dmg]:
        if not is_empty(df):
            for col in ["attacker_steamid", "victim_steamid", "assister_steamid"]:
                if col in df.columns:
                    for val in df[col].dropna().unique():
                        sid = sid_norm(val)
                        if sid and sid not in player_info:
                            player_info[sid] = {"name": f"Jogador_{sid[-4:]}", "team": "unknown"}

    # Inicializar kda para todos os encontrados
    weapon_stats = {}
    for sid in player_info:
        kda[sid] = {"kills": 0, "deaths": 0, "assists": 0, "hs_kills": 0}
        dmg_total[sid] = 0
        weapon_stats[sid] = {}
    
    if not is_empty(df_dmg):
        dmg_col = next((c for c in ["dmg_health", "damage", "health_damage", "dmg"] if c in df_dmg.columns), "dmg_health")
        w_col = next((c for c in ["weapon", "weapon_name"] if c in df_dmg.columns), "weapon")
        for _, row in df_dmg.iterrows():
            sid = sid_norm(row.get("attacker_steamid"))
            dmg_val = int(row.get(dmg_col, 0) or 0)
            if sid in dmg_total: 
                dmg_total[sid] += dmg_val
            
            # Weapon damage tracking
            w = str(row.get(w_col, "unknown")).replace("weapon_", "")
            if sid in player_info:
                if w not in weapon_stats[sid]:
                    weapon_stats[sid][w] = {"kills": 0, "hs": 0, "damage": 0}
                weapon_stats[sid][w]["damage"] += dmg_val

    if not is_empty(df_kills):
        for _, row in df_kills.iterrows():
            atk = sid_norm(row.get("attacker_steamid"))
            vic = sid_norm(row.get("victim_steamid"))
            ass = sid_norm(row.get("assister_steamid"))
            
            if atk and atk in kda and atk != vic:
                kda[atk]["kills"] += 1
                if bool(row.get("headshot", False)): kda[atk]["hs_kills"] += 1
            if vic and vic in kda:
                kda[vic]["deaths"] += 1
            if ass and ass in kda and ass != "0":
                kda[ass]["assists"] += 1

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

    # ── 2. Identificar times no início (Team A = CT, Team B = TR)
    score_a, score_b = 0, 0
    rounds = len(df_re) if df_re is not None else 0
    round_summaries = {}
    team_mapping = {}
    # Tenta descobrir o tick do início do round 1 para mapear times
    first_round_tick = start_tick
    try:
        df_freeze = _parse("round_freeze_end")
        if not is_empty(df_freeze): first_round_tick = int(df_freeze["tick"].min())
    except: pass
    
    # Tenta múltiplos offsets para garantir que pegamos os times após o freeze-time do round 1
    for offset in [128, 256, 512, 1024]:
        probe = parser.parse_ticks(["team_name", "team_num", "steamid"], ticks=[first_round_tick + offset])
        if not probe.empty:
            for _, p_row in probe.iterrows():
                sid = sid_norm(p_row.get("steamid"))
                if not sid: continue
                
                team = str(p_row.get("team_name", ""))
                t_num = p_row.get("team_num", 0)
                
                if sid not in team_mapping:
                    if team == "CT" or t_num == 3:
                        team_mapping[sid] = "A"
                    elif team == "T" or "TERRORIST" in team.upper() or t_num == 2:
                        team_mapping[sid] = "B"
            
            if len(team_mapping) >= 10: break # Já temos dados suficientes


    log_fn(f"👥 Mapeamento de times concluído ({len(team_mapping)} jogadores identificados).")

    # ── Halftime detection e rounds_per_half ──
    # No CS2 (MR12), o halftime padrão é SEMPRE 12.
    # Demos de MIX costumam ter eventos de halftime falsos por causa do warmup.
    rounds_per_half = 12
    
    try:
        convars = parser.parse_convars()
        if convars and "mp_maxrounds" in convars:
            rounds_per_half = int(convars["mp_maxrounds"]) // 2
            log_fn(f"⚙️ Configuração detectada via convar: MR{rounds_per_half*2}")
    except: pass

    # Se detectarmos um halftime via evento, só aceitamos se for 12, 15 ou 3 (OT)
    try:
        df_ht = _parse("cs_intermission")
        if is_empty(df_ht): df_ht = _parse("round_announce_halftime")
        if not is_empty(df_ht):
            ht_tick = int(df_ht["tick"].min())
            rounds_before_ht = int((df_re["tick"] < ht_tick).sum())
            if rounds_before_ht in [12, 15, 3]:
                rounds_per_half = rounds_before_ht
                log_fn(f"🌓 Halftime detectado e validado após {rounds_per_half} rounds.")
            else:
                log_fn(f"⚠️ Halftime detectado após {rounds_before_ht} rounds ignorado (provável warmup). Usando padrão MR{rounds_per_half*2}.")
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
        last_round_winner = None
        
        # Mapeamento dinâmico por round para evitar bugs de halftime
        sids_a = [sid for sid, t in team_mapping.items() if t == "A"]
        
        for i, (_, r_end) in enumerate(df_re.iterrows()):
            r_num = i + 1
            w_side = normalize_team(str(r_end[w_col]))
            end_tick = int(r_end["tick"])
            
            if w_side not in ("CT", "T"):
                continue

            # Identifica qual lado o Time A estava jogando NESTE round
            current_side_a = "unknown"
            if sids_a:
                try:
                    # Verifica posição dos jogadores do Time A perto do fim do round
                    probe = parser.parse_ticks(["team_name", "team_num", "steamid"], ticks=[end_tick - 128])
                    if not probe.empty:
                        # Pega os jogadores do Time A que estão na demo
                        players_a = probe[probe["steamid"].apply(sid_norm).isin(sids_a)]
                        if not players_a.empty:
                            t_num = players_a.iloc[0].get("team_num", 0)
                            current_side_a = "CT" if t_num == 3 else "T"
                except: pass
            
            # Se não conseguiu detectar via tick, usa a lógica de fallback (MR12)
            if current_side_a == "unknown":
                current_side_a = "CT" if r_num <= rounds_per_half else "T"

            is_a_win = (w_side == current_side_a)
            if is_a_win: 
                pts_a += 1
                last_round_winner = "A"
            else: 
                pts_b += 1
                last_round_winner = "B"
            
            round_summaries[r_num] = {
                "kills":[], "damage":{}, "winner": w_side, 
                "reason": str(r_end.get("reason", "")), 
                "logical_winner": "A" if is_a_win else "B"
            }

        
        # Sovereign Winner Logic: The winner of the last round is the match winner
        if last_round_winner == "A":
            final_a, final_b = max(pts_a, pts_b), min(pts_a, pts_b)
            pts_a, pts_b = final_a, final_b
        elif last_round_winner == "B":
            final_a, final_b = min(pts_a, pts_b), max(pts_a, pts_b)
            pts_a, pts_b = final_a, final_b

        # --- Heuristic: Check for rounds with kills but no round_end event ---
        max_kill_round = int(df_kills["round_num"].max()) if not is_empty(df_kills) else 0
        current_rounds = len(df_re) if not is_empty(df_re) else 0
        
        if max_kill_round > current_rounds:
            log_fn(f"⚠️  Heurística: Detectados {max_kill_round - current_rounds} rounds com kills sem evento de fim. Recuperando...")
            for r_num in range(current_rounds + 1, max_kill_round + 1):
                # Determina vencedor do round recuperado
                r_kills = df_kills[df_kills["round_num"] == r_num]
                if r_kills.empty: continue
                
                last_k = r_kills.iloc[-1]
                atk_sid = sid_norm(last_k.get("attacker_steamid"))
                
                # Tenta identificar o lado vencedor
                w_side = "UNKNOWN"
                for field in ["attacker_side", "attacker_team_name", "attacker_team"]:
                    if field in last_k and last_k[field]:
                        w_side = normalize_team(str(last_k[field]))
                        break
                
                # Determina time lógico (A ou B)
                winner_team = team_mapping.get(atk_sid)
                if not winner_team:
                    cur_a_side = side_of_a(r_num)
                    if w_side != "UNKNOWN":
                        winner_team = "A" if w_side == cur_a_side else "B"
                
                if winner_team == "A":
                    pts_a += 1
                    last_round_winner = "A"
                    w_side = side_of_a(r_num)
                elif winner_team == "B":
                    pts_b += 1
                    last_round_winner = "B"
                    w_side = "T" if side_of_a(r_num) == "CT" else "CT"
                
                round_summaries[r_num] = {
                    "kills": [], "damage": {}, "winner": w_side,
                    "reason": "recovered_from_kills",
                    "logical_winner": winner_team if winner_team else "Draw"
                }

        # ── Lógica de Vencedor Soberano Final ──────────────────────────
        # O vencedor do ÚLTIMO round encontrado (oficial ou recuperado) é o vencedor da partida.
        # Isso garante que ele sempre fique com o placar maior (ex: 13, 16 ou 19).
        if last_round_winner == "A":
            s_high, s_low = max(pts_a, pts_b), min(pts_a, pts_b)
            # Se for MR12 e está 12x12 ou menos, o vencedor deve ter pelo menos 13
            if s_high < 13: s_high = 13
            # Se for Overtime (ex: 15-15 -> 16), garante o ponto de vitória
            elif s_high in [15, 18, 21]: s_high += 1
            
            pts_a, pts_b = s_high, s_low
            log_fn(f"🏆 Vitória confirmada para TIME A (venceu último round). Placar: {pts_a}x{pts_b}")
        elif last_round_winner == "B":
            s_high, s_low = max(pts_a, pts_b), min(pts_a, pts_b)
            if s_high < 13: s_high = 13
            elif s_high in [15, 18, 21]: s_high += 1
            
            pts_a, pts_b = s_low, s_high
            log_fn(f"🏆 Vitória confirmada para TIME B (venceu último round). Placar: {pts_a}x{pts_b}")

        log_fn(f"📊 Placar Final: {pts_a} x {pts_b}")
        score_a, score_b = pts_a, pts_b



    # ── Scoreboard Fallback (Se o placar via rounds for suspeito ou 0-0) ──
    if score_a == 0 and score_b == 0:
        try:
            # Tenta pegar o placar oficial dos times no último tick
            df_sc_final = parser.parse_ticks(["team_score_total"])
            if not is_empty(df_sc_final):
                # No CS2, team_score_total costuma refletir o placar da HUD
                score_a = int(df_sc_final["team_score_total"].max())
                log_fn(f"📋 Placar via Scoreboard HUD: {score_a} (Distribuindo...)")
                # Se não temos rounds, usamos o que achamos como base
                if score_a > 0:
                    # Fallback: Se o vencedor foi A, ele fica com o score_a, e B fica com o restante (heurística)
                    pass
        except:
            pass

    log_fn(f"📊 Placar Final: {score_a} x {score_b} ({len(df_re)} rounds)")


    # ── Estatísticas Avançadas (Duelos e Granadas) ──────────
    flash_assists = {sid: 0 for sid in player_info}
    util_dmg      = {sid: 0 for sid in player_info}
    
    adv_stats = {sid: {
        "fk": 0, "fd": 0, "triples": 0, "quads": 0, "aces": 0,
        "blind_time": 0.0, "he": 0, "flash": 0, "smoke": 0, "molotov": 0
    } for sid in player_info}
    
    kast_data = {sid: [False] * (rounds + 1) for sid in player_info}
    

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

            # --- EXTRACT VICTIM WEAPON ---
            victim_weapon_map = {}
            try:
                import pandas as pd
                w_dfs = []
                
                # Try item_equip
                df_ie = _parse("item_equip")
                if not is_empty(df_ie):
                    w_col = next((c for c in ["item", "weapon"] if c in df_ie.columns), None)
                    u_col = next((c for c in ["user_steamid", "userid"] if c in df_ie.columns), None)
                    if w_col and u_col:
                        temp = df_ie[["tick", u_col, w_col]].rename(columns={u_col: "user_steamid", w_col: "weapon"}).dropna(subset=["user_steamid"])
                        w_dfs.append(temp)
                
                # Try weapon_fire
                df_wf = _parse("weapon_fire")
                if not is_empty(df_wf):
                    w_col = next((c for c in ["weapon", "weapon_name"] if c in df_wf.columns), None)
                    u_col = next((c for c in ["user_steamid", "userid"] if c in df_wf.columns), None)
                    if w_col and u_col:
                        temp = df_wf[["tick", u_col, w_col]].rename(columns={u_col: "user_steamid", w_col: "weapon"}).dropna(subset=["user_steamid"])
                        w_dfs.append(temp)
                
                # Try player_hurt (when the victim dealt damage, they were the attacker)
                if not is_empty(df_dmg):
                    w_col = next((c for c in ["weapon", "weapon_name"] if c in df_dmg.columns), None)
                    a_col = next((c for c in ["attacker_steamid", "attacker"] if c in df_dmg.columns), None)
                    if w_col and a_col:
                        temp = df_dmg[["tick", a_col, w_col]].rename(columns={a_col: "user_steamid", w_col: "weapon"}).dropna(subset=["user_steamid"])
                        w_dfs.append(temp)
                
                if w_dfs and not df_k.empty:
                    v_col = next((c for c in ["victim_steamid", "user_steamid"] if c in df_k.columns), None)
                    if v_col:
                        ie_df = pd.concat(w_dfs).sort_values("tick")
                        ie_df["user_steamid"] = ie_df["user_steamid"].apply(sid_norm)
                        k_df = df_k[["tick", v_col]].dropna(subset=[v_col]).sort_values("tick")
                        k_df[v_col] = k_df[v_col].apply(sid_norm)
                        
                        merged = pd.merge_asof(k_df, ie_df, on="tick", left_by=v_col, right_by="user_steamid", direction="backward", tolerance=15000)
                        for _, r in merged.iterrows():
                            if pd.notna(r.get("weapon")):
                                victim_weapon_map[(int(r["tick"]), str(r[v_col]))] = str(r["weapon"])
            except Exception as e:
                log_fn(f"⚠️ Erro ao extrair arma da vitima: {e}")

            # --- CALCULATE PRE-DUEL HP ---
            pre_duel_hp_map = {}
            try:
                if not is_empty(df_dmg):
                    dmg_df = df_dmg.copy().sort_values("tick")
                    d_v_col = next((c for c in ["victim_steamid", "user_steamid", "userid"] if c in dmg_df.columns), None)
                    d_dmg_col = next((c for c in ["health_damage", "dmg_health", "damage", "dmg"] if c in dmg_df.columns), "dmg_health")
                    k_v_col = next((c for c in ["victim_steamid", "user_steamid"] if c in df_k.columns), None)
                    k_a_col = next((c for c in ["attacker_steamid", "attacker"] if c in df_k.columns), None)
                    
                    if d_v_col and d_dmg_col and k_v_col and k_a_col:
                        for r_num, r_kills in df_k.groupby("round_num"):
                            r_dmg = dmg_df[dmg_df["round_num"] == r_num]
                            for _, row in r_kills.iterrows():
                                k_tick = int(row["tick"])
                                v_sid = sid_norm(row.get(k_v_col, ""))
                                a_sid = sid_norm(row.get(k_a_col, ""))
                                
                                if v_sid and v_sid != "0":
                                    past_dmg_v = r_dmg[(r_dmg[d_v_col].apply(sid_norm) == v_sid) & (r_dmg["tick"] < k_tick)]
                                    total_dmg_v = past_dmg_v[d_dmg_col].apply(lambda x: min(float(x or 0), 100)).sum()
                                    pre_duel_hp_map[(k_tick, v_sid)] = max(1, 100 - int(total_dmg_v))
                                
                                if a_sid and a_sid != "0":
                                    past_dmg_a = r_dmg[(r_dmg[d_v_col].apply(sid_norm) == a_sid) & (r_dmg["tick"] < k_tick)]
                                    total_dmg_a = past_dmg_a[d_dmg_col].apply(lambda x: min(float(x or 0), 100)).sum()
                                    pre_duel_hp_map[(k_tick, a_sid)] = max(1, 100 - int(total_dmg_a))
            except Exception as e:
                log_fn(f"⚠️ Erro ao calcular HP pre-duelo: {e}")

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
                    k_att = sid_norm(k_row.get(_att_col))
                    k_vic = sid_norm(k_row.get(_vic_col))
                    k_ass = str(k_row.get(_ass_col, "0") or "0") if "_ass_col" in locals() else "0"
                    
                    if k_att and k_att in player_info:
                        # Weapon Stats
                        w = str(k_row.get("weapon", "unknown")).replace("weapon_", "")
                        if w not in weapon_stats[k_att]:
                            weapon_stats[k_att][w] = {"kills": 0, "hs": 0, "damage": 0}
                        weapon_stats[k_att][w]["kills"] += 1
                        if k_row.get("headshot") or k_row.get("is_headshot"):
                            weapon_stats[k_att][w]["hs"] += 1
                        
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

                        # Descobrir o lado (CT/T) - OTIMIZADO (Usa o info já coletado)
                        att_side = player_info.get(k_att, {}).get("team", "unknown")
                        vic_side = player_info.get(k_vic, {}).get("team", "unknown")

                        # Tenta pegar assister
                        _ass_col = next((c for c in ["assister_steamid", "assister_pawn_steamid", "assister_steamid64"] if c in k_row.index), None)
                        k_ass = sid_norm(k_row.get(_ass_col)) if _ass_col else None
                        
                        tick = int(k_row.get("tick", 0))
                        
                        # Use calculated pre-duel HP if available
                        a_hp = pre_duel_hp_map.get((tick, k_att))
                        if a_hp is None:
                            a_hp = int(safe_val(k_row.get("attacker_hp", 100)))
                            
                        v_hp = pre_duel_hp_map.get((tick, k_vic))
                        if v_hp is None:
                            v_hp = int(safe_val(k_row.get("victim_hp", 100)))
                            if v_hp == 0: v_hp = 100
                            
                        v_weap = victim_weapon_map.get((tick, k_vic), "")

                        round_summaries[r_num]["kills"].append({
                            "attackerName": player_info[k_att]["name"],
                            "attackerSteamId": k_att,
                            "attackerSide": att_side,
                            "attackerHp": a_hp,
                            "victimName": player_info.get(k_vic, {}).get("name", "Jogador"),
                            "victimSteamId": k_vic,
                            "victimSide": vic_side,
                            "victimHp": v_hp,
                            "victimWeapon": v_weap,
                            "assisterSteamId": k_ass,
                            "weapon": w,
                            "isHeadshot": bool(k_row.get("headshot") or k_row.get("is_headshot") or False),
                            "tick": tick,
                            "attX": round(safe_val(k_row.get("attacker_x", 0)), 1),
                            "attY": round(safe_val(k_row.get("attacker_y", 0)), 1),
                            "vicX": round(safe_val(k_row.get("victim_x", 0)), 1),
                            "vicY": round(safe_val(k_row.get("victim_y", 0)), 1)
                        })

                # Winner Lógico (A ou B)
                w_side = round_summaries[r_num]["winner"]
                if w_side in ("CT", "T"):
                    round_summaries[r_num]["logical_winner"] = "A" if w_side == side_of_a(r_num) else "B"
                else:
                    round_summaries[r_num]["logical_winner"] = "Draw"
                        
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
                if not is_empty(df_dmg):
                    # Identificar coluna de dano e atacante
                    dmg_col = next((c for c in ["dmg_health", "damage", "health_damage", "dmg"] if c in df_dmg.columns), "dmg_health")
                    att_col = next((c for c in ["attacker_steamid", "attacker_steamid64", "attacker"] if c in df_dmg.columns), "attacker_steamid")

                    for r_num, r_dmg in df_dmg.groupby("round_num"):
                        r_num = int(r_num)
                        if r_num not in round_summaries:
                            round_summaries[r_num] = {"kills": [], "damage": {}, "winner": "", "reason": "", "logical_winner": ""}
                        
                        for _, row in r_dmg.iterrows():
                            sid = sid_norm(row.get(att_col))
                            if sid:
                                d_val = int(row.get(dmg_col, 0) or 0)
                                round_summaries[r_num]["damage"][sid] = round_summaries[r_num]["damage"].get(sid, 0) + d_val
            except Exception as e:
                log_fn(f"⚠️  Erro ao processar dano por round: {e}")


    except Exception as e:
        log_fn(f"⚠️  Duelos não extraídos integralmente: {e}")

    # ── Finalizar KAST e Fallback Scoreboard ──
    try:
        # Se as kills estão zeradas, tenta pegar do scoreboard oficial do parser
        total_k = sum(v["kills"] for v in kda.values())
        if total_k == 0:
            df_sb = parser.parse_ticks(["kills", "deaths", "assists", "mvps", "score"])
            if not is_empty(df_sb):
                # Pega o último tick de cada jogador
                last_sb = df_sb.sort_values("tick").groupby("steamid").tail(1)
                for _, row in last_sb.iterrows():
                    sid = sid_norm(row.get("steamid"))
                    if sid in kda:
                        kda[sid]["kills"] = int(row.get("kills", 0))
                        kda[sid]["deaths"] = int(row.get("deaths", 0))
                        kda[sid]["assists"] = int(row.get("assists", 0))
                        mvp_map[sid] = int(row.get("mvps", 0))
                        score_map[sid] = int(row.get("score", 0))
    except: pass

    _vic_col_final = "victim_steamid"
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


    player_id_map = {sid: i for i, sid in enumerate(player_info.keys())}
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
            "playerIndexMap": {i: sid for sid, i in player_id_map.items()}
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

    def _show_placeholder(self, text=None):
        for w in self._preview_frame.winfo_children():
            w.destroy()
        
        msg = text if text else "Selecione um arquivo .dem para visualizar os dados\ne identificar a partida antes de processar."
        
        ctk.CTkLabel(
            self._preview_frame,
            text=msg,
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
            self._show_placeholder("🔍 Identificando partida...")
            self._log_box.delete("1.0", "end")
            self._log(f"📂 Demo selecionada: {os.path.basename(path)}")
            
            # Inicia Quick Scan em background
            threading.Thread(target=self._do_quick_scan, args=(path,), daemon=True).start()

    def _do_quick_scan(self, path):
        info = quick_scan_demo(path)
        if info:
            self.after(0, lambda: self._show_quick_preview(info))
        else:
            self.after(0, lambda: self._show_placeholder("⚠️ Não foi possível identificar detalhes rapidamente.\nVocê ainda pode processar a demo normalmente."))

    def _show_quick_preview(self, info):
        for w in self._preview_frame.winfo_children():
            w.destroy()
            
        container = ctk.CTkFrame(self._preview_frame, fg_color="#16213e", corner_radius=15)
        container.pack(fill="x", padx=10, pady=10)
        
        ctk.CTkLabel(container, text="PARTIDA IDENTIFICADA", font=ctk.CTkFont(size=10, weight="bold"), text_color="#e94560").pack(pady=(10,0))
        
        main_info = f"{info['map'].upper()}  |  {info['scoreA']} x {info['scoreB']}"
        ctk.CTkLabel(container, text=main_info, font=ctk.CTkFont(size=24, weight="bold")).pack(pady=5)
        
        ctk.CTkLabel(container, text=f"Duração: {info['duration']}", font=ctk.CTkFont(size=12), text_color="gray").pack()
        
        # Lista de Jogadores
        p_frame = ctk.CTkFrame(container, fg_color="transparent")
        p_frame.pack(fill="x", padx=20, pady=15)
        
        ctk.CTkLabel(p_frame, text="JOGADORES DETECTADOS:", font=ctk.CTkFont(size=9, weight="bold"), text_color="gray").pack(anchor="w")
        
        # Divide em duas colunas se tiver muitos
        cols = 2
        for i, p_name in enumerate(info['players']):
            ctk.CTkLabel(p_frame, text=f"• {p_name}", font=ctk.CTkFont(size=11), anchor="w").pack(anchor="w", pady=1)
            
        ctk.CTkLabel(container, text="Esta é a partida correta? Se sim, clique em 'Processar Demo' abaixo.", font=ctk.CTkFont(size=10, slant="italic"), text_color="#555").pack(pady=(0, 10))

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
            text=f"TIME CT  {score_a}  ×  {score_b}  TIME TR",
            font=ctk.CTkFont(size=24, weight="bold"),
            text_color="white",
        ).pack(pady=8)
        ctk.CTkLabel(
            score_frame,
            text="(Time CT = Início como CT  |  Time TR = Início como TR)",
            font=ctk.CTkFont(size=10),
            text_color="#7ca8d4",
        ).pack(pady=(0, 4))

        ctk.CTkButton(
            score_frame,
            text="🔄  INVERTER LADOS (CT ↔ TR)",
            font=ctk.CTkFont(size=10, weight="bold"),
            fg_color="#16213e",
            hover_color="#1a1a2e",
            height=20,
            command=self._on_swap_result
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
            row_f.bind("<Button-3>", lambda e, player=p: self._on_table_right_click(e, player))
            for i, w in enumerate(col_weights):
                row_f.grid_columnconfigure(i, weight=w)

            res_color = result_colors.get(p.get("matchResult", "Tie"), "gray")
            team_label = "CT (Início)" if p.get("team") == "CT" else "TR (Início)"
            team_color = "#5dade2" if p.get("team") == "CT" else "#e59866"
            m = p.get("metadata", {})

            values = [
                (p.get("displayName", "?"),    "white"),
                (p.get("steamId", "0"),         "#888"),
                (team_label,                    team_color),
                (str(p.get("kills", 0)),        "white"),
                (str(p.get("deaths", 0)),       "#e74c3c"),
                (str(p.get("assists", 0)),      "#f1c40f"),
                (f"{p.get('adr', 0):.1f}",     "#2ecc71"),
                (f"{m.get('kast', 0):.1f}%",   "#3498db"),
                (f"{m.get('rating', 0):.2f}",  "#e94560"),
                (p.get("matchResult", "?").upper(), res_color),
            ]

            for i, (val, color) in enumerate(values):
                lbl = ctk.CTkLabel(
                    row_f, text=val,
                    font=ctk.CTkFont(size=11),
                    text_color=color, anchor="w"
                )
                lbl.grid(row=0, column=i, padx=6, pady=5, sticky="w")
                lbl.bind("<Button-3>", lambda e, player=p: self._on_table_right_click(e, player))

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

    def _on_table_right_click(self, event, player):
        self._selected_player = player
        menu = tk.Menu(self, tearoff=0)
        menu.add_command(label="🔄 Trocar de Time", command=self._swap_player_team)
        menu.post(event.x_root, event.y_root)

    def _swap_player_team(self):
        if not self._selected_player: return
        current = self._selected_player.get("team", "CT")
        self._selected_player["team"] = "T" if current == "CT" else "CT"
        self._log(f"👤 Time de {self._selected_player['displayName']} alterado para {self._selected_player['team']}.")
        self._render_preview(self._demo_data)

    def _on_swap_result(self):
        if not self._demo_data: return
        
        match = self._demo_data["match"]
        players = self._demo_data["players"]
        summaries = match.get("metadata", {}).get("roundSummaries", {})
        
        # 1. Swap Scores
        old_a = match.get("scoreA", 0)
        old_b = match.get("scoreB", 0)
        match["scoreA"] = old_b
        match["scoreB"] = old_a
        
        # 2. Swap Logical Winner in roundSummaries
        for r_num in summaries:
            s = summaries[r_num]
            if s.get("logical_winner") == "A":
                s["logical_winner"] = "B"
            elif s.get("logical_winner") == "B":
                s["logical_winner"] = "A"
        
        # 3. Swap Results for Players
        for p in players:
            if p.get("matchResult") == "Win":
                p["matchResult"] = "Loss"
            elif p.get("matchResult") == "Loss":
                p["matchResult"] = "Win"
        
        self._log("🔄 Lados e Resultados invertidos manualmente (CT ↔ TR).")
        self._render_preview(self._demo_data)

    def _on_export_json(self):
        if not self._demo_data: return
        
        match_id = self._demo_data["match"]["id"]
        default_name = f"match_{match_id}.json"
        
        # Se houve filtragem de rounds, perguntar se quer exportar a versão filtrada
        data_to_export = self._demo_data
        
        # Se os campos de pontuação na UI forem diferentes do dado original, 
        # significa que houve filtragem ou ajuste manual.
        # Vamos gerar um pacote "fresco" para exportação baseado no que está na tela
        if hasattr(self, '_round_vars'):
            # Simula o que o _on_send faz para pegar os dados limpos
            try:
                selected_rounds = [r for r, var in self._round_vars.items() if var.get()]
                if len(selected_rounds) < len(self._demo_data["match"]["metadata"]["roundSummaries"]):
                    # Exportar versão filtrada
                    match_copy = self._demo_data["match"].copy()
                    match_copy["metadata"] = self._demo_data["match"]["metadata"].copy()
                    # Recalcular placar para o JSON
                    summaries = match_copy["metadata"]["roundSummaries"]
                    match_copy["scoreA"] = len([r for r in selected_rounds if (summaries.get(r) or summaries.get(str(r), {})).get("logical_winner") == "A"])
                    match_copy["scoreB"] = len([r for r in selected_rounds if (summaries.get(r) or summaries.get(str(r), {})).get("logical_winner") == "B"])
                    data_to_export = {"match": match_copy, "players": self._demo_data["players"]}
            except: pass

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

        # ── Filtragem Manual de Rounds ──
        selected_rounds = [r for r, var in self._round_vars.items() if var.get()]
        if not selected_rounds:
            messagebox.showerror("Erro", "Selecione pelo menos um round para enviar.")
            return
        
        self._log(f"⚡ Filtrando partida: Mantendo {len(selected_rounds)} rounds...")

        # Recalcular Placar
        summaries = match.get("metadata", {}).get("roundSummaries", {})
        
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
            # Normalização rigorosa do sid para o match do log
            sid = sid_norm(p.get("steamId"))
            p_kills, p_deaths, p_assists, p_damage, p_hs = 0, 0, 0, 0, 0
            
            for r_num in selected_rounds:
                s = summaries.get(r_num) or summaries.get(str(r_num), {})
                if not s: continue
                
                # Eventos do Round
                r_kills = s.get("kills", [])
                p_kills += len([k for k in r_kills if sid_norm(k.get("attackerSteamId")) == sid])
                p_deaths += len([k for k in r_kills if sid_norm(k.get("victimSteamId")) == sid])
                p_hs += len([k for k in r_kills if sid_norm(k.get("attackerSteamId")) == sid and k.get("isHeadshot")])
                p_assists += len([k for k in r_kills if sid_norm(k.get("assisterSteamId")) == sid])
                
                # Dano
                p_damage += s.get("damage", {}).get(sid, 0)

            # GARANTIA: Se o cálculo por rounds falhar mas a demo tiver os dados globais
            orig_p = next((op for op in self._demo_data["players"] if sid_norm(op["steamId"]) == sid), None)
            if orig_p:
                # Se a diferença for muito grande (erro de timeline), usa o global proporcional
                if p_kills == 0 and orig_p.get("kills", 0) > 0:
                    p_kills = orig_p.get("kills", 0)
                    p_deaths = orig_p.get("deaths", 0)
                    p_assists = orig_p.get("assists", 0)
                    p_hs = (orig_p.get("hsPercentage", 0) / 100 * p_kills) if p_kills > 0 else 0
                    p_damage = orig_p.get("adr", 0) * len(selected_rounds)
                elif p_assists == 0 and orig_p.get("assists", 0) > 0:
                    # Caso específico de assistências sumindo
                    p_assists = orig_p.get("assists", 0)
                
            p["kills"] = p_kills
            p["deaths"] = p_deaths
            p["assists"] = p_assists
            p["hsPercentage"] = round((p_hs / max(p_kills, 1)) * 100, 1)
            p["adr"] = round(p_damage / max(len(selected_rounds), 1), 1)
            
            # Winner? (Lógica soberana baseada no placar final da tela)
            if new_score_a > new_score_b:
                # Se o player começou no time que terminou com mais pontos (Time A)
                p["matchResult"] = "win" if p.get("team") == "CT" else "loss"
            elif new_score_b > new_score_a:
                p["matchResult"] = "win" if p.get("team") == "T" else "loss"
            else:
                p["matchResult"] = "tie"

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
    try:
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
    except Exception as e:
        print("\n" + "="*50)
        print("❌ CRITICAL ERROR DURING STARTUP:")
        print("="*50)
        traceback.print_exc()
        print("="*50)
        input("\nPressione ENTER para fechar...")
