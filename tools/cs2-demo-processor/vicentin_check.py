import os, re, urllib.parse, psycopg2
from dotenv import load_dotenv

load_dotenv('e:/Github/SITE-CSBrasil/.env')
raw_url = os.getenv('DATABASE_URL')
url = raw_url.strip('"').strip("'")
m = re.match(r'postgresql://([^:]+):([^@]+)@([^:/]+):?(\d*)/([^?]+)', url)
conn = psycopg2.connect(host=m.group(3), port=int(m.group(4) or 5432), dbname=m.group(5), user=urllib.parse.unquote(m.group(1)), password=urllib.parse.unquote(m.group(2)), sslmode='disable', options='-c search_path=public')
cur = conn.cursor()

cur.execute('''
    SELECT "matchResult", kills, deaths, adr, mvps, "eloChange"
    FROM "GlobalMatchPlayer"
    WHERE id = '3e995009-971b-4974-b474-3040cdb43305'
''')

row = cur.fetchone()
print('DB Row:', row)

match_result = str(row[0]).lower()
kills = int(row[1] or 0)
deaths = int(row[2] or 0)
adr = float(row[3] or 0.0)
mvps = int(row[4] or 0)

elo_change = 0
if match_result == 'win': elo_change = 15
elif match_result == 'loss': elo_change = -10

if match_result in ['win', 'loss']:
    if kills > deaths: elo_change += 2
    elif deaths > kills + 3: elo_change -= 2
    if adr > 90: elo_change += 3
    elif adr < 50: elo_change -= 2
    elo_change += (mvps * 1)

print('Python calculated:', elo_change)

cur.close()
conn.close()
