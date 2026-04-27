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

def parse_demo(filepath: str, log_fn=print, match_date=None) -> dict | None:
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

    # helpers
    def is_empty(df):
        if df is None: return True
        if hasattr(df, "empty"): return df.empty
        return len(df) == 0

    start_tick = 0 # Inicializado cedo para filter_tick

    def filter_tick(df):
        if not is_empty(df) and (hasattr(df, "columns") and "tick" in df.columns or isinstance(df, pd.DataFrame)):
            try:
                return df[df["tick"] >= start_tick]
            except:
                return df
        return df

    # ── Header e Duração Segura ─────────────────
    header = {}
    try:
        header = parser.parse_header()
        map_name = header.get("map_name", "unknown")
        
        # O playback_time costuma vir corrompido no CS2, então já calculamos via round_end
        duration_secs = float(header.get("playback_time", 0))
        duration_str = "00:00"
        
        if duration_secs > 0:
            duration_str = seconds_to_mmss(duration_secs)
        else:
            try:
                df_re = parser.parse_event("round_end")
                if not is_empty(df_re) and "tick" in df_re.columns:
                    max_tick = int(df_re["tick"].max())
                    m, s = divmod(int(max_tick / 64), 60)
                    duration_str = f"{m:02d}:{s:02d}"
            except:
                pass
                
        log_fn(f"🗺️  Mapa: {map_name} | Duração: {duration_str}")
    except Exception as e:
        log_fn(f"⚠️  Erro ao ler header: {e}")
        map_name     = "unknown"
        duration_str = "00:00"

    # ── Início da Partida (Processamos tudo a partir do tick 0) ──
    start_tick = 0
    log_fn("ℹ️  Processando todos os eventos desde o tick 0. Selecione os rounds manualmente na linha do tempo.")

    # ── Jogadores e Times ───────────────────
    player_info = {}   # steamId -> {name, team}
    try:
        df_pi = parser.parse_player_info()
        df_pi = df_pi[df_pi["name"].notna()]
        df_pi = df_pi[df_pi["name"].str.lower() != "gotv"]

        for _, row in df_pi.iterrows():
            # AnimGraph 2: steamid pode vir como 'steamid', 'xuid', 'steam_id', ou 'steamid64'
            sid = str(
                row.get("steamid")
                or row.get("xuid")
                or row.get("steam_id")
                or row.get("steamid64")
                or "0"
            ).split(".")[0]  # Remove casas decimais de floats (ex: "76561198...0.0" → "76561198...")
            name = str(row.get("name", "")).strip()
            team_raw = str(row.get("team_name", row.get("team_number", row.get("team", "")))).strip()
            if name and name.lower() not in ("gotv", "") and sid not in ("0", "None", ""):
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
                if not is_empty(df_t) and "name" in df_t.columns:
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

    # ── Diagnóstico: descobrir eventos e campos disponíveis ───────
    _available_events = set()
    try:
        _available_events = set(parser.list_game_events())
        log_fn(f"🔍 Eventos disponíveis na demo: {sorted(_available_events)}")
    except Exception as _e:
        log_fn(f"⚠️  Não foi possível listar eventos: {_e}")

    try:
        _updated_fields = parser.list_updated_fields()
        log_fn(f"📋 Campos disponíveis (amostra): {sorted(_updated_fields)[:30]}")
    except Exception as _e:
        log_fn(f"⚠️  list_updated_fields não disponível: {_e}")

    # Testa se parse_ticks funciona com campo mínimo
    _ticks_work = False
    try:
        _probe = parser.parse_ticks(["steamid"])
        _ticks_work = not is_empty(_probe)
        if _ticks_work:
            log_fn("✅ parse_ticks básico funciona nesta demo.")
        else:
            log_fn("⚠️  parse_ticks retornou vazio (demo pode ser formato não suportado).")
    except Exception as _e:
        log_fn(f"⚠️  parse_ticks não funciona nesta demo: {_e}")

    # ── Helper: parse_event robusto para demos de servidor local ──────
    def safe_parse_event(event_name):
        """Tenta parse_event compatível com demoparser2 >= 0.41.2 (AnimGraph 2).

        BREAKING CHANGE em 0.41.2: player_props/other_props renomeados para player/other.
        Tenta a nova API primeiro, cai no fallback sem kwargs se TypeError.
        """
        # Tentativa 1: nova API 0.41.2 — sem player entities (mais leve e compatível
        # com demos AnimGraph 2 onde entidades de jogador podem não ter o mapeamento antigo)
        for kwargs in [
            {"player": [], "other": []},  # 0.41.2+: minimal, sem entity join
            {"player": []},               # 0.41.2+: sem player entity join
            {},                           # padrão: deixa o parser decidir
        ]:
            try:
                df = parser.parse_event(event_name, **kwargs)
                return df  # Aceita mesmo vazio — o chamador decide
            except TypeError:
                continue  # kwarg não suportado, tenta próximo
            except Exception:
                continue
        # Último recurso: sem nenhum kwarg
        try:
            return parser.parse_event(event_name)
        except Exception:
            return None

    # ── Kills → KDA + HS% ─────────────────────
    # Estrutura: {steamId: {kills, deaths, assists, hs_kills}}
    kda   = {sid: {"kills": 0, "deaths": 0, "assists": 0, "hs_kills": 0} for sid in player_info}
    rounds = 0

    # Tenta parse_event('player_death') usando safe_parse_event
    df_kills = safe_parse_event("player_death")
    if df_kills is not None:
        df_kills = filter_tick(df_kills)
        if not is_empty(df_kills):
            # Descobrir colunas de steamid (variam entre versões/formatos)
            att_col = next((c for c in ["attacker_steamid", "attacker_steamid64", "attacker"] if c in df_kills.columns), None)
            vic_col = next((c for c in ["victim_steamid", "victim_steamid64", "user_steamid", "user"] if c in df_kills.columns), None)
            ass_col = next((c for c in ["assister_steamid", "assister_steamid64", "assister"] if c in df_kills.columns), None)
            log_fn(f"💀 player_death colunas: {list(df_kills.columns)}")
            for _, row in df_kills.iterrows():
                attacker = str(row.get(att_col, "0")) if att_col else "0"
                victim   = str(row.get(vic_col, "0")) if vic_col else "0"
                assister = str(row.get(ass_col, "0")) if ass_col else "0"
                is_hs    = bool(row.get("headshot", False))

                if attacker in kda and attacker != victim:
                    kda[attacker]["kills"]    += 1
                    kda[attacker]["hs_kills"] += 1 if is_hs else 0
                if victim in kda:
                    kda[victim]["deaths"] += 1
                if assister in kda and assister != "0":
                    kda[assister]["assists"] += 1

            log_fn(f"💀 Kills extraídos ({len(df_kills)} eventos).")
        else:
            log_fn("⚠️  player_death retornou vazio após filtro.")
    else:
        log_fn("⚠️  parse_event('player_death') falhou: EntityNotFound (todas as tentativas).")
        # Fallback: parse_ticks com campos de estatísticas (se disponível)
        if _ticks_work:
            _kda_ok = False
            for stat_fields in [
                ["name", "steamid", "kills", "assists", "deaths"],
                ["name", "steamid", "m_iKills", "m_iAssists", "m_iDeaths"],
                ["steamid", "kills", "deaths"],
                ["steamid", "m_iKills", "m_iDeaths"],
            ]:
                try:
                    df_s = parser.parse_ticks(stat_fields)
                    if not is_empty(df_s):
                        k_col = next((c for c in ["kills", "m_iKills"] if c in df_s.columns), None)
                        a_col = next((c for c in ["assists", "m_iAssists"] if c in df_s.columns), None)
                        d_col = next((c for c in ["deaths", "m_iDeaths"] if c in df_s.columns), None)
                        sid_col = "steamid" if "steamid" in df_s.columns else None
                        if k_col and sid_col:
                            dedup_col = "name" if "name" in df_s.columns else sid_col
                            latest = df_s.dropna(subset=[dedup_col]).drop_duplicates(subset=[dedup_col], keep="last")
                            for _, row in latest.iterrows():
                                sid = str(row[sid_col])
                                if sid in kda:
                                    kda[sid]["kills"]   = int(row.get(k_col, 0) or 0)
                                    kda[sid]["assists"] = int(row.get(a_col, 0) or 0) if a_col else 0
                                    kda[sid]["deaths"]  = int(row.get(d_col, 0) or 0) if d_col else 0
                            log_fn(f"💀 KDA via parse_ticks ({k_col}).")
                            _kda_ok = True
                            break
                except Exception:
                    continue
            if not _kda_ok:
                log_fn("⚠️  Fallback KDA também falhou.")
        else:
            log_fn("⚠️  Fallback KDA ignorado (parse_ticks não funciona nesta demo).")


    # ── Dano → ADR ──────────────────────────
    dmg_total = {sid: 0 for sid in player_info}
    df_dmg = safe_parse_event("player_hurt")
    if df_dmg is not None:
        df_dmg = filter_tick(df_dmg)
        if not is_empty(df_dmg):
            dmg_col = next((c for c in ["dmg_health", "damage", "health_damage", "dmg"] if c in df_dmg.columns), None)
            att_col = next((c for c in ["attacker_steamid", "attacker_steamid64", "attacker"] if c in df_dmg.columns), None)
            if dmg_col and att_col:
                for _, row in df_dmg.iterrows():
                    sid = str(row.get(att_col, "0"))
                    if sid in dmg_total:
                        dmg_total[sid] += int(row.get(dmg_col, 0) or 0)
                log_fn("💥 Dano extraído.")
    else:
        log_fn("⚠️  player_hurt não disponível nesta demo.")

    # ── Rounds jogados ───────────────────────
    try:
        df_rounds = safe_parse_event("round_officially_ended")
        df_rounds_filtered = filter_tick(df_rounds)
        rounds = len(df_rounds_filtered) if df_rounds_filtered is not None else 0
        if rounds == 0:
            df_rounds2 = safe_parse_event("round_end")
            df_rounds2_filtered = filter_tick(df_rounds2)
            rounds = len(df_rounds2_filtered) if df_rounds2_filtered is not None else 30
        log_fn(f"🔄 {rounds} rounds detectados total.")
    except Exception:
        rounds = 30

    # ── Score e MVPs ─────────────────────────
    score_map = {sid: 0 for sid in player_info}
    mvp_map   = {sid: 0 for sid in player_info}
    try:
        df_sc = parser.parse_ticks(["name", "steamid", "score", "mvps"])
        if not is_empty(df_sc):
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

    # ── Placar dos Times e Duração ─────────────────────
    score_a, score_b = 0, 0
    team_mapping = {}     # steamid -> "A" ou "B"
    round_summaries = {}  # round_num -> {kills: [], damage: {}, winner: "", reason: "", logical_winner: ""}
    df_re = None
    
    try:
        # Usa round_officially_ended como fonte principal (round_end pode não existir)
        df_roe = safe_parse_event("round_officially_ended")
        df_re_fallback = safe_parse_event("round_end")
        # Prefere round_end se existir (tem 'winner'), senão usa round_officially_ended
        if not is_empty(df_re_fallback) and df_re_fallback is not None:
            df_re = filter_tick(df_re_fallback)
        elif not is_empty(df_roe) and df_roe is not None:
            df_re = filter_tick(df_roe)
        else:
            df_re = None

        if df_re is not None:
            log_fn(f"📖 round event colunas: {list(df_re.columns)}")
        
        # ── Mapeamento de Times (CT=Time A, TR=Time B no round 1) ─────────────────
        # ESTRATÉGIA: descobrir qual time começou no CT e qual começou no TR,
        # para poder seguir os pontos de cada time através da troca de lado no halftime.
        #
        # Fonte 1 (mais confiável): parse_ticks no tick do PRIMEIRO round competitivo.
        #   → Captura o lado exato de cada jogador NO INÍCIO do jogo, não do warmup.
        # Fonte 2: player_info (já construído de parse_player_info).
        # Fonte 3: player_team events (menos confiável — pode conter warmup).

        # Tenta descobrir o tick do início do round 1 (primeiro round_freeze_end competitivo)
        first_round_tick = start_tick
        try:
            df_freeze_start = safe_parse_event("round_freeze_end")
            if not is_empty(df_freeze_start) and "tick" in df_freeze_start.columns:
                first_round_tick = int(df_freeze_start["tick"].min())
        except Exception:
            first_round_tick = start_tick

        # Fonte 1: parse_ticks no tick exato do início do round 1
        team_mapping_built = False
        for offset in [0, 32, 64, 128, 256]:
            try:
                probe = parser.parse_ticks(
                    ["team_name"],
                    ticks=[first_round_tick + offset]
                )
                if not is_empty(probe) and "steamid" in probe.columns and "team_name" in probe.columns:
                    for _, row in probe.iterrows():
                        sid = str(row["steamid"] or "0").split(".")[0]
                        team = normalize_team(str(row.get("team_name", "")))
                        if sid not in team_mapping and team in ("CT", "T") and sid in player_info:
                            team_mapping[sid] = "A" if team == "CT" else "B"
                    if len(team_mapping) >= 2:
                        log_fn(f"👥 Times via ticks (R1 tick={first_round_tick+offset}): {len(team_mapping)} jogadores")
                        team_mapping_built = True
                        break
            except Exception:
                continue

        # Fonte 2: player_info (já coletado de parse_player_info — reflete início do jogo)
        if not team_mapping_built or len(team_mapping) < len(player_info):
            for sid, info in player_info.items():
                if sid not in team_mapping:
                    if info["team"] == "CT":
                        team_mapping[sid] = "A"
                    elif info["team"] == "T":
                        team_mapping[sid] = "B"
            if team_mapping:
                log_fn(f"👥 Times completados via player_info: {len(team_mapping)} jogadores")
                team_mapping_built = True

        # Fonte 3: player_team events (fallback, menos confiável)
        if not team_mapping_built:
            df_player_team = safe_parse_event("player_team")
            if df_player_team is not None and not is_empty(df_player_team):
                log_fn(f"📖 player_team colunas: {list(df_player_team.columns)}")
                sid_col_pt = next((c for c in ["userid", "user_steamid", "steamid"] if c in df_player_team.columns), None)
                team_col_pt = next((c for c in ["team", "teamnum", "newteam"] if c in df_player_team.columns), None)
                if sid_col_pt and team_col_pt:
                    for _, pt_row in df_player_team.iterrows():
                        sid = str(pt_row.get(sid_col_pt, "0")).split(".")[0]
                        t_num = str(pt_row.get(team_col_pt, ""))
                        if sid not in team_mapping:
                            if t_num in ("3", "CT"): team_mapping[sid] = "A"
                            elif t_num in ("2", "T", "TERRORIST"): team_mapping[sid] = "B"
                log_fn(f"👥 Times via player_team (fallback): {len(team_mapping)} jogadores")

        # Verifica coerência: Team A deve ter jogadores no CT, Team B no TR
        ct_players = [sid for sid, t in team_mapping.items() if t == "A"]
        tr_players = [sid for sid, t in team_mapping.items() if t == "B"]
        log_fn(f"✅ Time A (CT inicial): {len(ct_players)} jogadores | Time B (TR inicial): {len(tr_players)} jogadores")

        if not is_empty(df_re):
            # Detectar coluna de vencedor
            winner_col = next((c for c in ["winner", "winner_name", "winning_team"] if c in df_re.columns), None)
            if winner_col is None:
                raise ValueError(f"Sem coluna winner. Colunas: {list(df_re.columns)}")

            df_re = df_re.sort_values("tick").reset_index(drop=True)
            pts_a, pts_b = 0, 0
            initial_side_a = "CT"   # Team A sempre começa como CT (team_num=3)

            # ── Detectar formato: MR12 (padrão CS2 2023+) ou MR15 (legado) ────────
            # O CS2 padrão usa MR12: 12 rounds por metade, vence quem fizer 13 primeiro.
            # Detectamos o halftime pelo evento cs_intermission (mais confiável).
            # Fallback: contamos rounds até a troca de lado aparecer nos ticks do parser.
            # Fallback final: MR12 (rounds_per_half = 12).
            rounds_per_half = 12  # padrão CS2 MR12

            try:
                # Tentativa 1: evento cs_intermission (fim da primeira metade)
                df_ht = safe_parse_event("cs_intermission")
                if is_empty(df_ht):
                    df_ht = safe_parse_event("round_announce_halftime")
                if not is_empty(df_ht) and "tick" in df_ht.columns:
                    ht_tick = int(df_ht["tick"].min())
                    # Conta rounds que terminaram ANTES do tick de halftime
                    rounds_first_half = int((df_re["tick"] < ht_tick).sum())
                    if rounds_first_half > 0:
                        rounds_per_half = rounds_first_half
                        log_fn(f"⏱️  Halftime detectado via evento: {rounds_per_half} rounds/metade")
                else:
                    raise ValueError("Evento de halftime não encontrado, tentando fallback")
            except Exception as _ht_e:
                # Tentativa 2: inferir pelo tick de início de round (round_freeze_end)
                try:
                    df_freeze = safe_parse_event("round_freeze_end")
                    # A pausa de halftime é visivelmente mais longa do que a de início de round.
                    # Procura o maior gap entre ticks consecutivos de round_freeze_end.
                    if not is_empty(df_freeze) and "tick" in df_freeze.columns:
                        freeze_ticks = sorted(df_freeze["tick"].tolist())
                        if len(freeze_ticks) >= 4:
                            gaps = [(freeze_ticks[i+1] - freeze_ticks[i], i+1)
                                    for i in range(len(freeze_ticks)-1)]
                            max_gap_round = max(gaps, key=lambda x: x[0])[1]
                            if 8 <= max_gap_round <= 16:   # sanidade: halftime entre round 8-16
                                rounds_per_half = max_gap_round
                                log_fn(f"⏱️  Halftime inferido por gap de freeze: round {rounds_per_half}")
                            else:
                                raise ValueError(f"Gap suspeito no round {max_gap_round}")
                        else:
                            raise ValueError("Poucos ticks de freeze para inferir halftime")
                    else:
                        raise ValueError("round_freeze_end vazio")
                except Exception as _fb_e:
                    log_fn(f"⏱️  Halftime não detectado ({_fb_e}), usando MR12 padrão (12 rounds/metade)")
                    rounds_per_half = 12

            # OT no CS2: 3 rounds por metade (MR3-OT)
            ot_rounds_per_half = 3
            reg_rounds = rounds_per_half * 2   # total de rounds na fase regular

            def side_of_a(r_num: int) -> str:
                """Retorna o lado (CT/T) do Time A no round r_num (1-based)."""
                if r_num <= rounds_per_half:
                    # Primeira metade
                    return initial_side_a
                elif r_num <= reg_rounds:
                    # Segunda metade (após halftime)
                    return "T" if initial_side_a == "CT" else "CT"
                else:
                    # Overtime: alterna a cada ot_rounds_per_half rounds
                    ot_r = r_num - reg_rounds - 1   # 0-indexed dentro do OT
                    ot_half = ot_r // ot_rounds_per_half
                    if ot_half % 2 == 0:
                        return initial_side_a          # OT half par → lado inicial
                    else:
                        return "T" if initial_side_a == "CT" else "CT"

            log_fn(f"📐 Formato detectado: MR{rounds_per_half} | Troca no round {rounds_per_half + 1}")

            for r_idx, (_, r_end) in enumerate(df_re.iterrows()):
                r_num = r_idx + 1   # 1-based limpo
                w_side = normalize_team(str(r_end[winner_col]))
                current_side_a = side_of_a(r_num)
                is_a_win = (current_side_a == w_side)

                if is_a_win:
                    pts_a += 1
                else:
                    pts_b += 1

                if r_num not in round_summaries:
                    round_summaries[r_num] = {"kills": [], "damage": {}, "winner": w_side, "reason": ""}
                round_summaries[r_num]["logical_winner"] = "A" if is_a_win else "B"

            score_a = pts_a
            score_b = pts_b
            log_fn(f"📊 Placar Final: {score_a} x {score_b} (Time A={initial_side_a} R1, MR{rounds_per_half})")
        else:
            raise ValueError("Nenhum evento de round encontrado após filtro.")
            
    except Exception as e:
        log_fn(f"⚠️  Falha ao reconstruir placar detalhado: {e}")
        # Fallback 1: contagem simples via round_end
        try:
            if not is_empty(df_re) and "winner" in df_re.columns:
                score_a = len(df_re[df_re["winner"].astype(str).str.contains("3|CT")])
                score_b = len(df_re[df_re["winner"].astype(str).str.contains("2|T")])
                log_fn(f"ℹ️  Placar estimado via contagem simples: {score_a} x {score_b}")
            else:
                score_a, score_b = 0, 0
        except:
            score_a, score_b = 0, 0

        # Fallback 2 (pós-Animgraph2): cs_win_panel_match não usa entidades de jogador
        if score_a == 0 and score_b == 0:
            try:
                df_wp = safe_parse_event("cs_win_panel_match")
                if not is_empty(df_wp):
                    log_fn(f"📖 cs_win_panel_match colunas: {list(df_wp.columns)}")
                    # Tenta extrair pontuação dos times
                    ct_col = next((c for c in ["ct_score", "team_ct_score", "score_ct"] if c in df_wp.columns), None)
                    t_col  = next((c for c in ["t_score",  "team_t_score",  "score_t"]  if c in df_wp.columns), None)
                    if ct_col and t_col:
                        row = df_wp.iloc[-1]
                        score_a = int(row.get(ct_col, 0) or 0)
                        score_b = int(row.get(t_col,  0) or 0)
                        log_fn(f"📊 Placar via cs_win_panel_match: {score_a} x {score_b}")
                    else:
                        # Tenta qualquer coluna com "score" no nome
                        score_cols = [c for c in df_wp.columns if "score" in c.lower()]
                        if len(score_cols) >= 2:
                            row = df_wp.iloc[-1]
                            score_a = int(row.get(score_cols[0], 0) or 0)
                            score_b = int(row.get(score_cols[1], 0) or 0)
                            log_fn(f"📊 Placar via cs_win_panel_match ({score_cols}): {score_a} x {score_b}")
            except Exception as ewp:
                log_fn(f"⚠️  cs_win_panel_match também falhou: {ewp}")


    # ── Estatísticas Avançadas (Duelos e Granadas) ──────────
    flash_assists = {sid: 0 for sid in player_info}
    util_dmg      = {sid: 0 for sid in player_info}
    
    adv_stats = {sid: {
        "fk": 0, "fd": 0, "triples": 0, "quads": 0, "aces": 0,
        "blind_time": 0.0, "he": 0, "flash": 0, "smoke": 0, "molotov": 0
    } for sid in player_info}
    

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
                df_g = safe_parse_event(ev)
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
    df_fa = safe_parse_event("player_blind")
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
        round_end_ticks = sorted(df_re["tick"].tolist()) if (df_re is not None and not df_re.empty) else []
        
        def get_round(t):
            # Retorna em qual round este tick pertence (1-based)
            # Round N vai até o tick de df_re.iloc[N-1]
            for i, end_t in enumerate(round_end_ticks):
                if t <= end_t:
                    return i + 1
            return len(round_end_ticks) # Se for depois do último, joga no último
        
        if not is_empty(df_k) and "tick" in df_k.columns:
            df_k = df_k.sort_values(by="tick")
            df_k["round_num"] = df_k["tick"].apply(get_round)

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
                    if k_att != "0":
                        # Descobrir o lado (CT/T) de cada um para o visual
                        # Como as trocas de lado ocorrem, pegamos o lado do atacante no tick da kill
                        att_side = "unknown"
                        vic_side = "unknown"
                        try:
                            # Tenta pegar info rápida do lado — nova API 0.41.2 usa keyword args
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
                            "attackerName": player_info.get(k_att, {}).get("name", "Jogador"),
                            "attackerSteamId": k_att,
                            "attackerSide": att_side,
                            "victimName": player_info.get(k_vic, {}).get("name", "Jogador"),
                            "victimSteamId": k_vic,
                            "victimSide": vic_side,
                            "weapon": str(k_row.get("weapon", "unknown")),
                            "isHeadshot": bool(k_row.get("headshot", False))
                        })

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
                df_dmg_rounds = parser.parse_event("player_hurt")
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

    # ──────────────────────────────────────────
    # Monta a lista de jogadores (somente quem participou da partida real)
    # ──────────────────────────────────────────
    players_out = []
    # Só aplicamos o filtro de k/d=0 se realmente extraímos dados de kills.
    # Se parse_event('player_death') falhou com EntityNotFound, todos ficam com 0
    # e não devemos eliminar ninguém.
    total_kills_extracted = sum(kda[s]["kills"] + kda[s]["deaths"] for s in kda)
    apply_kda_filter = total_kills_extracted > 0

    for sid, info in player_info.items():
        k   = kda[sid]["kills"]
        d   = kda[sid]["deaths"]
        a   = kda[sid]["assists"]
        
        # Filtra apenas se temos dados reais de KDA — evita eliminar todos quando
        # parse_event falha com EntityNotFound/ClassNotFound.
        if apply_kda_filter and k == 0 and d == 0:
            continue

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
            "matchResult":   "Tie",  # calculado abaixo
            "metadata": {
                "name":          info["name"],
                "nickname":      info["name"],
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

    # Determina resultado final baseado no Time A vs Time B
    if score_a is not None and score_b is not None:
        if score_a > score_b: # Time A venceu
            results_map = {"A": "Win", "B": "Loss"}
        elif score_b > score_a: # Time B venceu
            results_map = {"A": "Loss", "B": "Win"}
        else: # Empate
            results_map = {"A": "Tie", "B": "Tie"}
            
        for p in players_out:
            sid = p["steamId"]
            logical_team = team_mapping.get(sid)
            if logical_team:
                p["matchResult"] = results_map[logical_team]
            else:
                # Fallback caso o jogador tenha entrado depois
                p["matchResult"] = "Tie"

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
            "roundSummaries": round_summaries
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
        self._log_box.grid(row=10, column=0, padx=14, pady=(0, 10), sticky="nsew")
        left.grid_rowconfigure(10, weight=1)

        # Botões de ação
        btn_frame = ctk.CTkFrame(left, fg_color="transparent")
        btn_frame.grid(row=11, column=0, padx=14, pady=(0, 14), sticky="ew")
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

            try:
                result = parse_demo(path, log_fn=self._log, match_date=m_date)
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
        try:
            result = parse_demo(path, log_fn=self._log, match_date=m_date)
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

    # ── Enviar para Banco ─────────────────────

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
