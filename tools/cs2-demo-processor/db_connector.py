"""
db_connector.py
---------------
Módulo responsável pela conexão e inserção de dados de demos CS2
diretamente no banco de dados PostgreSQL remoto.

Tabelas utilizadas:
  - GlobalMatch        (1 registro por partida)
  - GlobalMatchPlayer  (1 por jogador por partida, até 10)
  - User               (lookup por steamId para vincular conta do site)
"""

import os
import re
import urllib.parse
import uuid
import psycopg2
import psycopg2.extras
from datetime import datetime
from dotenv import load_dotenv

# Carrega o .env da raiz do projeto
# tools/cs2-demo-processor/ -> tools/ -> project root
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_BASE_DIR  = os.path.dirname(os.path.dirname(_THIS_DIR))
_ENV_PATH  = os.path.join(_BASE_DIR, ".env")
load_dotenv(_ENV_PATH)


def _get_connection():
    """Cria e retorna uma conexão psycopg2 usando a DATABASE_URL do .env."""
    raw_url = os.getenv("DATABASE_URL", "")
    if not raw_url:
        raise ValueError(
            "DATABASE_URL não encontrada no .env.\n"
            "Verifique o arquivo .env na raiz do projeto."
        )

    # Remove parâmetros extras incompatíveis com psycopg2 (como search_path na query string)
    # e converte a url para componentes individuais
    url = raw_url.strip('"').strip("'")

    # Parse manual da connection string postgresql://user:pass@host:port/db?params
    pattern = r"postgresql://([^:]+):([^@]+)@([^:/]+):?(\d*)/([^?]+)(\?.*)?"
    m = re.match(pattern, url)
    if not m:
        raise ValueError(f"Formato da DATABASE_URL não reconhecido: {url[:60]}...")

    # URL-decode user e password (ex: %40 → @, %23 → #)
    user     = urllib.parse.unquote(m.group(1))
    password = urllib.parse.unquote(m.group(2))
    host     = m.group(3)
    port     = int(m.group(4)) if m.group(4) else 5432
    dbname   = m.group(5)

    conn = psycopg2.connect(
        host=host,
        port=port,
        dbname=dbname,
        user=user,
        password=password,
        sslmode="disable",
        connect_timeout=10,
        options="-c search_path=public"
    )
    return conn


def test_connection() -> tuple[bool, str]:
    """Testa a conexão com o banco. Retorna (sucesso, mensagem)."""
    try:
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute('SELECT COUNT(*) FROM "GlobalMatch";')
        count = cur.fetchone()[0]
        cur.close()
        conn.close()
        return True, f"Conexão OK — {count} partidas globais no banco."
    except Exception as e:
        return False, f"Erro de conexão: {e}"


def steam_id_to_64(steam_id_str: str) -> str | None:
    """Converte SteamID no formato que o demoparser retorna para SteamID64 string."""
    try:
        val = int(steam_id_str)
        if val > 76561197960265728:
            return str(val)
        # Tenta converter de SteamID32
        return str(val + 76561197960265728)
    except (ValueError, TypeError):
        return None


def get_user_id_by_steam(conn, steam_id: str) -> tuple[str | None, int]:
    """Busca o userId e rankingPoints do site (tabela User) pelo steamId."""
    try:
        cur = conn.cursor()
        cur.execute('SELECT id, "rankingPoints" FROM "User" WHERE "steamId" = %s LIMIT 1;', (steam_id,))
        row = cur.fetchone()
        cur.close()
        if row:
            return row[0], (row[1] if row[1] is not None else 500)
        return None, 500
    except Exception:
        return None, 500


def match_exists(match_id: str) -> bool:
    """Verifica se uma partida com esse ID já foi importada."""
    try:
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute('SELECT 1 FROM "GlobalMatch" WHERE id = %s LIMIT 1;', (match_id,))
        exists = cur.fetchone() is not None
        cur.close()
        conn.close()
        return exists
    except Exception:
        return False


def get_match_status(match_id: str, filename: str = None) -> dict:
    """Retorna o status detalhado da partida (se existe e quando foi criada)."""
    try:
        conn = _get_connection()
        cur = conn.cursor()
        
        # 1. Tenta pelo ID primário
        cur.execute('SELECT "createdAt" FROM "GlobalMatch" WHERE id = %s LIMIT 1;', (match_id,))
        row = cur.fetchone()
        
        # 2. Se não achou e temos o nome do arquivo, tenta pelo metadata
        if not row and filename:
            # PostgreSQL syntax para buscar dentro do JSONB metadata
            cur.execute('SELECT "createdAt" FROM "GlobalMatch" WHERE metadata->>\'demoFile\' = %s LIMIT 1;', (filename,))
            row = cur.fetchone()
            
        cur.close()
        conn.close()
        
        if row:
            return {"exists": True, "createdAt": row[0]}
        return {"exists": False, "createdAt": None}
    except Exception as e:
        return {"exists": False, "createdAt": None, "error": str(e)}


def insert_match(match_data: dict, players_data: list[dict]) -> tuple[bool, str]:
    """
    Insere uma GlobalMatch e seus GlobalMatchPlayers no banco.

    match_data esperado:
        {
          "id": str,           # ID único da partida (ex: hash do nome do arquivo)
          "source": str,       # "mix" | "matchmaking" | "faceit"
          "mapName": str,
          "duration": str,     # Ex: "35:42"
          "matchDate": datetime,
          "scoreA": int,
          "scoreB": int,
          "metadata": dict     # Ex: {"demoFile": "nuke_mix.dem"}
        }

    players_data esperado (lista de até 10 dicts):
        {
          "steamId": str,
          "displayName": str,  # Apenas para log, não vai para o banco
          "team": str,         # "CT" ou "T" (ou "TeamA" / "TeamB")
          "kills": int,
          "deaths": int,
          "assists": int,
          "score": int,
          "mvps": int,
          "adr": float,
          "hsPercentage": float,
          "matchResult": str,  # "win" | "loss" | "tie"
          "metadata": dict     # {"flashAssists": x, "utilDmg": y, ...}
        }

    Retorna (sucesso: bool, mensagem: str).
    """
    try:
        conn = _get_connection()
        cur = conn.cursor()

        # --- Limpeza de dados antigos (Sobrescrita total) ---
        # Antes de salvar os novos dados, removemos todos os jogadores anteriores desta partida
        # para garantir que se a demo foi reprocessada com menos pessoas, herde apenas as novas.
        match_id = match_data["id"]

        # --- Reversão de Tropoints (Elo) em caso de reprocessamento ---
        # Antes de deletar os jogadores antigos, precisamos reverter os pontos que eles ganharam nesta partida
        try:
            cur.execute('SELECT "userId", "eloChange" FROM "GlobalMatchPlayer" WHERE "globalMatchId" = %s AND "userId" IS NOT NULL AND "eloChange" IS NOT NULL;', (match_id,))
            for uid, old_elo_change in cur.fetchall():
                cur.execute('UPDATE "User" SET "rankingPoints" = "rankingPoints" - %s WHERE id = %s;', (old_elo_change, uid))
        except Exception as e:
            pass # Pode falhar se a coluna não existir, ignoramos

        cur.execute('DELETE FROM "GlobalMatchPlayer" WHERE "globalMatchId" = %s;', (match_id,))
        
        # --- Insere GlobalMatch ---
        import json
        cur.execute(
            """
            INSERT INTO "GlobalMatch" (id, source, "mapName", duration, "matchDate", "scoreA", "scoreB", metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                source = EXCLUDED.source,
                "mapName" = EXCLUDED."mapName",
                duration = EXCLUDED.duration,
                "matchDate" = EXCLUDED."matchDate",
                "scoreA" = EXCLUDED."scoreA",
                "scoreB" = EXCLUDED."scoreB",
                metadata = EXCLUDED.metadata;
            """,
            (
                match_data["id"],
                match_data.get("source", "mix"),
                match_data["mapName"],
                match_data.get("duration"),
                match_data.get("matchDate", datetime.now()),
                match_data.get("scoreA"),
                match_data.get("scoreB"),
                json.dumps(match_data.get("metadata", {})),
            ),
        )

        inserted_players = 0
        errors = []

        for p in players_data:
            steam_id = str(p.get("steamId", ""))
            if not steam_id or steam_id == "0":
                errors.append(f"Jogador sem SteamID: {p.get('displayName', '?')}")
                continue

            user_id, base_elo = get_user_id_by_steam(conn, steam_id)

            # --- Cálculo do Tropoints (Elo) ---
            match_result = str(p.get("matchResult", "tie")).lower()
            kills = int(p.get("kills", 0))
            deaths = int(p.get("deaths", 0))
            adr = float(p.get("adr", 0.0))
            mvps = int(p.get("mvps", 0))

            elo_change = None
            elo_after = None

            # Apenas calcula pontos para partidas da plataforma MIX
            if match_data.get("source", "mix").lower() == "mix":
                elo_change = 0
                if match_result == "win": elo_change = 15
                elif match_result == "loss": elo_change = -10
                
                if match_result in ["win", "loss"]:
                    if kills > deaths: elo_change += 2
                    elif deaths > kills + 3: elo_change -= 2
                    if adr > 90: elo_change += 3
                    elif adr < 50: elo_change -= 2
                    elo_change += (mvps * 1) # Bônus de MVP
                    
                elo_after = max(0, base_elo + elo_change)

            try:
                # Atualizar Tropoints na tabela User (apenas se for MIX e tiver conta)
                if user_id and elo_after is not None:
                    cur.execute('UPDATE "User" SET "rankingPoints" = %s WHERE id = %s;', (elo_after, user_id))

                # Garantir que o nome esteja no metadata para o site ler
                p_meta = p.get("metadata", {})
                if "name" not in p_meta: p_meta["name"] = p.get("displayName", "Jogador")
                if "nickname" not in p_meta: p_meta["nickname"] = p.get("displayName", "Jogador")

                cur.execute(
                    """
                    INSERT INTO "GlobalMatchPlayer"
                        (id, "globalMatchId", "steamId", "userId", team, kills, deaths, assists,
                         score, mvps, adr, "hsPercentage", "matchResult", "eloChange", "eloAfter", metadata)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    ,
                    (
                        str(uuid.uuid4()),
                        match_data["id"],
                        steam_id,
                        user_id,
                        p.get("team", "Unknown"),
                        int(p.get("kills", 0)),
                        int(p.get("deaths", 0)),
                        int(p.get("assists", 0)),
                        int(p.get("score", 0)),
                        int(p.get("mvps", 0)),
                        float(p.get("adr", 0.0)),
                        float(p.get("hsPercentage", 0.0)),
                        p.get("matchResult", "tie"),
                        elo_change,
                        elo_after,
                        json.dumps(p_meta),
                    ),
                )
                inserted_players += 1
            except Exception as pe:
                errors.append(f"Erro ao inserir {p.get('displayName', steam_id)}: {pe}")

        conn.commit()
        cur.close()
        conn.close()

        msg = f"✅ Partida inserida com {inserted_players} jogador(es)."
        if errors:
            msg += f"\n⚠️ Avisos:\n" + "\n".join(errors)
        return True, msg

    except Exception as e:
        return False, f"❌ Erro ao inserir no banco: {e}"
