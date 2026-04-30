import os, re, urllib.parse, psycopg2
from dotenv import load_dotenv

load_dotenv('e:/Github/SITE-CSBrasil/.env')
raw_url = os.getenv('DATABASE_URL')
url = raw_url.strip('"').strip("'")
m = re.match(r'postgresql://([^:]+):([^@]+)@([^:/]+):?(\d*)/([^?]+)', url)
conn = psycopg2.connect(
    host=m.group(3), port=int(m.group(4) or 5432),
    dbname=m.group(5), user=urllib.parse.unquote(m.group(1)),
    password=urllib.parse.unquote(m.group(2)),
    sslmode='disable', options='-c search_path=public'
)
cur = conn.cursor()

# Tabela de níveis — IDÊNTICA à mix-level.ts
LEVELS = [
    (1,  0,    299),
    (2,  300,  499),
    (3,  500,  699),
    (4,  700,  899),
    (5,  900,  1099),
    (6,  1100, 1349),
    (7,  1350, 1599),
    (8,  1600, 1899),
    (9,  1900, 2199),
    (10, 2200, 2549),
    (11, 2550, 2899),
    (12, 2900, 3299),
    (13, 3300, 3749),
    (14, 3750, 4249),
    (15, 4250, 4799),
    (16, 4800, 5399),
    (17, 5400, 5999),
    (18, 6000, 6699),
    (19, 6700, 7499),
    (20, 7500, 999999),
]

def points_to_level(pts):
    for lv, mn, mx in LEVELS:
        if mn <= pts <= mx:
            return lv
    return 1

# Buscar todos os usuários
cur.execute('SELECT id, "rankingPoints", "mixLevel" FROM "User"')
users = cur.fetchall()

updated = 0
for (uid, pts, old_level) in users:
    pts_val = int(pts or 500)
    correct_level = points_to_level(pts_val)
    if correct_level != old_level:
        cur.execute('UPDATE "User" SET "mixLevel" = %s WHERE id = %s', (correct_level, uid))
        print(f"  Corrigido: pts={pts_val} → LV {old_level or '?'} → LV {correct_level}")
        updated += 1

conn.commit()
cur.close()
conn.close()

print(f"\n✅ {updated} usuário(s) corrigido(s) de {len(users)} total.")
