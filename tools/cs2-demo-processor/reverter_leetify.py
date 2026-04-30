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
    print("Conectando ao banco de dados para reverter Leetify...")
    conn = _get_connection()
    cur = conn.cursor()

    # Buscar partidas que NÃO são mix mas ganharam Tropoints
    cur.execute("""
        SELECT p.id, p."userId", p."eloChange"
        FROM "GlobalMatchPlayer" p
        JOIN "GlobalMatch" g ON p."globalMatchId" = g.id
        WHERE LOWER(g.source) != 'mix' AND p."eloChange" IS NOT NULL
    """)
    
    players_to_revert = cur.fetchall()
    print(f"Encontrados {len(players_to_revert)} registros incorretos (nao-MIX).")

    user_points_deduction = {}

    for row in players_to_revert:
        (gmp_id, user_id, elo_change) = row
        
        if user_id:
            user_points_deduction[user_id] = user_points_deduction.get(user_id, 0) + elo_change

        # Remover eloChange e eloAfter
        cur.execute("""
            UPDATE "GlobalMatchPlayer"
            SET "eloChange" = NULL, "eloAfter" = NULL
            WHERE id = %s
        """, (gmp_id,))

    # Abater os pontos dos usuarios
    for uid, deduction in user_points_deduction.items():
        cur.execute('UPDATE "User" SET "rankingPoints" = "rankingPoints" - %s WHERE id = %s', (deduction, uid))

    conn.commit()
    cur.close()
    conn.close()

    print(f"Revertido com sucesso!")

if __name__ == "__main__":
    main()
