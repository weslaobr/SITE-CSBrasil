import os, re, urllib.parse, psycopg2
from dotenv import load_dotenv

load_dotenv('e:/Github/SITE-CSBrasil/.env')
raw_url = os.getenv('DATABASE_URL')
url = raw_url.strip('"').strip("'")
m = re.match(r'postgresql://([^:]+):([^@]+)@([^:/]+):?(\d*)/([^?]+)', url)
user, password = urllib.parse.unquote(m.group(1)), urllib.parse.unquote(m.group(2))
host, port, dbname = m.group(3), int(m.group(4) or 5432), m.group(5)

conn = psycopg2.connect(host=host, port=port, dbname=dbname, user=user, password=password, sslmode='disable', options='-c search_path=public')
cur = conn.cursor()

steam_id = '76561198751404862'

cur.execute('SELECT id, name, "rankingPoints" FROM "User" WHERE "steamId" = %s;', (steam_id,))
u = cur.fetchone()
if u:
    print(f'Player: {u[1]}, UserID: {u[0]}, Current Tropoints: {u[2]}')
else:
    print('Player not found in User table.')

cur.execute('''
    SELECT g.source, p."matchResult", p.kills, p.deaths, p.adr, p.mvps, p."eloChange", g."matchDate"
    FROM "GlobalMatchPlayer" p
    JOIN "GlobalMatch" g ON p."globalMatchId" = g.id
    WHERE p."steamId" = %s
    ORDER BY g."matchDate" ASC;
''', (steam_id,))

rows = cur.fetchall()
print('\nRecent matches (Mix/Others):')
total = 500
for r in rows:
    elo_change = r[6] if r[6] is not None else 0
    total += elo_change
    print(f'[{r[0]}] Result: {r[1]}, K/D: {r[2]}/{r[3]}, ADR: {r[4]}, MVPs: {r[5]} -> eloChange: {elo_change} | Expected Total: {total}')

cur.close()
conn.close()
