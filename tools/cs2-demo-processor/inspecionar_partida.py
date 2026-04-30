import os, re, urllib.parse, psycopg2
from dotenv import load_dotenv

load_dotenv('e:/Github/SITE-CSBrasil/.env')
raw_url = os.getenv('DATABASE_URL')
url = raw_url.strip('"').strip("'")
m = re.match(r'postgresql://([^:]+):([^@]+)@([^:/]+):?(\d*)/([^?]+)', url)
conn = psycopg2.connect(host=m.group(3), port=int(m.group(4) or 5432), dbname=m.group(5), user=urllib.parse.unquote(m.group(1)), password=urllib.parse.unquote(m.group(2)), sslmode='disable', options='-c search_path=public')
cur = conn.cursor()

MATCH_ID = 'demo_a62ef644613340a4766ee345'

print("=== INFORMAÇÕES DA PARTIDA ===")
cur.execute('SELECT id, source, "mapName", "matchDate", "scoreA", "scoreB" FROM "GlobalMatch" WHERE id = %s', (MATCH_ID,))
row = cur.fetchone()
if row:
    print(f"ID: {row[0]}")
    print(f"Source: {row[1]}")
    print(f"Mapa: {row[2]}")
    print(f"Data: {row[3]}")
    print(f"Score: {row[4]}-{row[5]}")
else:
    print("Partida NÃO encontrada na tabela GlobalMatch!")

print("\n=== JOGADORES NESSA PARTIDA ===")
cur.execute('''
    SELECT p."steamId", p."matchResult", p.kills, p.deaths, p.adr, p."eloChange", p."userId"
    FROM "GlobalMatchPlayer" p
    WHERE p."globalMatchId" = %s
''', (MATCH_ID,))
players = cur.fetchall()
for p in players:
    print(f"Steam: {p[0]}, Result: {p[1]}, K/D: {p[2]}/{p[3]}, ADR: {p[4]}, EloChange: {p[5]}, UserId: {p[6]}")

print(f"\nTotal de {len(players)} jogador(es) encontrado(s).")

cur.close()
conn.close()
