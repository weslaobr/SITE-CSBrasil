import os
import re
import urllib.parse
import psycopg2
from dotenv import load_dotenv

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_BASE_DIR  = os.path.dirname(os.path.dirname(_THIS_DIR))
_ENV_PATH  = os.path.join(_BASE_DIR, ".env")
load_dotenv(_ENV_PATH)

def _get_connection():
    raw_url = os.getenv("DATABASE_URL", "")
    url = raw_url.strip('"').strip("'")
    pattern = r"postgresql://([^:]+):([^@]+)@([^:/]+):?(\d*)/([^?]+)(\?.*)?"
    m = re.match(pattern, url)
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
    conn = _get_connection()
    cur = conn.cursor()

    # 1. Resetar rankingPoints de todo mundo para 500
    print("🧹 Resetando Tropoints de todos os usuários para o padrão (500)...")
    cur.execute('UPDATE "User" SET "rankingPoints" = 500;')

    # 2. Buscar TODAS as partidas de MIX em ordem cronológica
    print("🔍 Buscando TODAS as partidas da plataforma Mix...")
    cur.execute("""
        SELECT p.id, p."userId", p."matchResult", p.kills, p.deaths, p.adr, p.mvps, p."steamId"
        FROM "GlobalMatchPlayer" p
        JOIN "GlobalMatch" g ON p."globalMatchId" = g.id
        WHERE LOWER(g.source) = 'mix'
        ORDER BY g."matchDate" ASC
    """)
    
    players_to_update = cur.fetchall()
    print(f"📋 Encontrados {len(players_to_update)} registros de jogadores em partidas de MIX.")

    user_points_cache = {}
    updates_count = 0

    for row in players_to_update:
        (gmp_id, user_id, match_result, kills, deaths, adr, mvps, steam_id) = row
        
        # Iniciar no cache com 500 caso seja a primeira vez
        if user_id and user_id not in user_points_cache:
            user_points_cache[user_id] = 500
            
        base_elo = user_points_cache.get(user_id, 500) if user_id else 500

        match_result = str(match_result).lower()
        kills = int(kills or 0)
        deaths = int(deaths or 0)
        adr = float(adr or 0.0)
        mvps = int(mvps or 0)

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

        if user_id:
            user_points_cache[user_id] = elo_after

        cur.execute("""
            UPDATE "GlobalMatchPlayer"
            SET "eloChange" = %s, "eloAfter" = %s
            WHERE id = %s
        """, (elo_change, elo_after, gmp_id))
        updates_count += 1

    # 3. Salvar os pontos finais recalculados
    print("📈 Consolidando saldo oficial recalculado de volta no perfil dos jogadores...")
    for uid, final_points in user_points_cache.items():
        cur.execute('UPDATE "User" SET "rankingPoints" = %s WHERE id = %s', (final_points, uid))

    conn.commit()
    cur.close()
    conn.close()

    print(f"✅ Sucesso Supremo! {updates_count} registros de MIX foram recalibrados com a matemática oficial!")

if __name__ == "__main__":
    main()
