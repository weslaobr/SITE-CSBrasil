import os, re, urllib.parse, psycopg2
from dotenv import load_dotenv

load_dotenv('e:/Github/SITE-CSBrasil/.env')
raw_url = os.getenv('DATABASE_URL')
url = raw_url.strip('"').strip("'")
m = re.match(r'postgresql://([^:]+):([^@]+)@([^:/]+):?(\d*)/([^?]+)', url)
conn = psycopg2.connect(host=m.group(3), port=int(m.group(4) or 5432), dbname=m.group(5), user=urllib.parse.unquote(m.group(1)), password=urllib.parse.unquote(m.group(2)), sslmode='disable', options='-c search_path=public')
cur = conn.cursor()

MATCH_ID = 'demo_a62ef644613340a4766ee345'

# 1. Reverter Tropoints dos usuários cadastrados que foram afetados
print("=== REVERTENDO TROPOINTS DOS USUÁRIOS AFETADOS ===")
cur.execute('''
    SELECT p."userId", p."eloChange"
    FROM "GlobalMatchPlayer" p
    WHERE p."globalMatchId" = %s AND p."userId" IS NOT NULL AND p."eloChange" IS NOT NULL
''', (MATCH_ID,))
affected_users = cur.fetchall()

for (user_id, elo_change) in affected_users:
    cur.execute('UPDATE "User" SET "rankingPoints" = "rankingPoints" - %s WHERE id = %s', (elo_change, user_id))
    print(f"  Revertido UserId={user_id}: -{elo_change} pts")

# 2. Deletar registros das tabelas relacionadas (tracker)
print("\n=== LIMPANDO TABELAS AUXILIARES ===")
for table in ['tracker_weapon_stats', 'tracker_clutch_events', 'tracker_match_players']:
    try:
        cur.execute(f'DELETE FROM public.{table} WHERE match_id = %s', (MATCH_ID,))
        print(f"  {table}: {cur.rowcount} registro(s) removido(s)")
    except Exception as e:
        print(f"  {table}: ignorado ({e})")
        conn.rollback()

# 3. Deletar os jogadores da partida
print("\n=== DELETANDO JOGADORES DA PARTIDA ===")
cur.execute('DELETE FROM "GlobalMatchPlayer" WHERE "globalMatchId" = %s', (MATCH_ID,))
print(f"  GlobalMatchPlayer: {cur.rowcount} registro(s) removido(s)")

# 4. Deletar a partida
print("\n=== DELETANDO A PARTIDA ===")
cur.execute('DELETE FROM "GlobalMatch" WHERE id = %s', (MATCH_ID,))
print(f"  GlobalMatch: {cur.rowcount} registro(s) removido(s)")

conn.commit()
cur.close()
conn.close()
print("\n✅ Partida removida com segurança!")
