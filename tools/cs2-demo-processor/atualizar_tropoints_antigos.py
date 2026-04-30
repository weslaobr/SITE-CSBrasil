import os
import re
import urllib.parse
import psycopg2
from dotenv import load_dotenv

# Carrega o .env da raiz do projeto
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_BASE_DIR  = os.path.dirname(os.path.dirname(_THIS_DIR))
_ENV_PATH  = os.path.join(_BASE_DIR, ".env")
load_dotenv(_ENV_PATH)

def _get_connection():
    raw_url = os.getenv("DATABASE_URL", "")
    if not raw_url:
        raise ValueError("DATABASE_URL não encontrada no .env.")

    url = raw_url.strip('"').strip("'")
    pattern = r"postgresql://([^:]+):([^@]+)@([^:/]+):?(\d*)/([^?]+)(\?.*)?"
    m = re.match(pattern, url)
    if not m:
        raise ValueError("Formato da DATABASE_URL não reconhecido.")

    user     = urllib.parse.unquote(m.group(1))
    password = urllib.parse.unquote(m.group(2))
    host     = m.group(3)
    port     = int(m.group(4)) if m.group(4) else 5432
    dbname   = m.group(5)

    return psycopg2.connect(
        host=host, port=port, dbname=dbname, user=user,
        password=password, sslmode="disable", options="-c search_path=public"
    )

def main():
    print("🔄 Conectando ao banco de dados...")
    try:
        conn = _get_connection()
        cur = conn.cursor()
    except Exception as e:
        print(f"❌ Erro ao conectar no banco: {e}")
        return

    # 1. Buscar todas as partidas que não tem eloChange
    print("🔍 Buscando registros de partidas antigos sem Tropoints computados...")
    cur.execute("""
        SELECT p.id, p."userId", p."matchResult", p.kills, p.deaths, p.adr, p.mvps, u."rankingPoints", p."steamId"
        FROM "GlobalMatchPlayer" p
        LEFT JOIN "User" u ON p."userId" = u.id
        WHERE p."eloChange" IS NULL
    """)
    
    players_to_update = cur.fetchall()
    print(f"📋 Encontrados {len(players_to_update)} registros de jogadores para atualizar.")

    if not players_to_update:
        print("✨ Tudo já está atualizado!")
        cur.close()
        conn.close()
        return

    # Armazena em memória os pontos dos usuários para ir somando (já que podem ter várias partidas)
    user_points_cache = {}
    updates_count = 0

    for row in players_to_update:
        (gmp_id, user_id, match_result, kills, deaths, adr, mvps, ranking_points, steam_id) = row
        
        # Se for um usuário registrado, pegamos do cache ou do banco (default 500)
        if user_id:
            if user_id not in user_points_cache:
                user_points_cache[user_id] = ranking_points if ranking_points is not None else 500
            base_elo = user_points_cache[user_id]
        else:
            base_elo = 500

        # Tratar tipos para não dar erro
        match_result = str(match_result).lower()
        kills = int(kills or 0)
        deaths = int(deaths or 0)
        adr = float(adr or 0.0)
        mvps = int(mvps or 0)

        # Cálculo do Tropoints
        elo_change = 0
        if match_result == "win": elo_change = 15
        elif match_result == "loss": elo_change = -10
        
        if match_result in ["win", "loss"]:
            if kills > deaths: elo_change += 2
            elif deaths > kills + 3: elo_change -= 2
            if adr > 90: elo_change += 3
            elif adr < 50: elo_change -= 2
            elo_change += (mvps * 1)
            
        elo_after = max(0, base_elo + elo_change)

        # Atualizar cache de pontos do usuário para a próxima partida iterada
        if user_id:
            user_points_cache[user_id] = elo_after

        # Atualizar GlobalMatchPlayer
        try:
            cur.execute("""
                UPDATE "GlobalMatchPlayer"
                SET "eloChange" = %s, "eloAfter" = %s
                WHERE id = %s
            """, (elo_change, elo_after, gmp_id))
            updates_count += 1
        except Exception as e:
            print(f"⚠️ Erro ao atualizar jogador {steam_id}: {e}")

    # Depois de processar todas as partidas, atualizar o rankingPoints consolidado de cada usuário
    print("📈 Atualizando saldo consolidado no perfil dos jogadores...")
    for uid, final_points in user_points_cache.items():
        try:
            cur.execute('UPDATE "User" SET "rankingPoints" = %s WHERE id = %s', (final_points, uid))
        except Exception as e:
            print(f"⚠️ Erro ao atualizar User {uid}: {e}")

    conn.commit()
    cur.close()
    conn.close()

    print(f"✅ Sucesso! {updates_count} registros antigos foram processados e receberam Tropoints.")

if __name__ == "__main__":
    main()
