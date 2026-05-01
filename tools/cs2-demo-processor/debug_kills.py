"""
debug_kills.py - Diagnóstico de kills de um jogador específico
Uso: python debug_kills.py <caminho_da_demo>
"""
import sys
from demoparser2 import DemoParser

TARGET_NAME = "alkimin"  # busca case-insensitive
TARGET_ID   = "76561199495756542"

def sid(val):
    try:
        return "{:.0f}".format(float(val))
    except:
        return str(val).split(".")[0]

if len(sys.argv) < 2:
    print("Uso: python debug_kills.py <arquivo.dem>")
    sys.exit(1)

demo = sys.argv[1]
print(f"Abrindo: {demo}\n")
parser = DemoParser(demo)

# 1. Ver todos os jogadores via parse_ticks e seus IDs
print("="*60)
print("JOGADORES VIA parse_ticks:")
print("="*60)
df_ticks = parser.parse_ticks(["name", "steamid", "team_name"])
latest = df_ticks.dropna(subset=["steamid"]).drop_duplicates(subset=["steamid"], keep="last")
for _, row in latest.iterrows():
    raw = row["steamid"]
    converted = sid(raw)
    name = str(row.get("name",""))
    print(f"  raw={raw!r:<30} type={type(raw).__name__:<12} sid={converted}  name={name}")

# 2. Ver kills via player_death e os tipos de colunas
print("\n" + "="*60)
print("COLUNAS DO EVENTO player_death:")
print("="*60)
try:
    df_kills = parser.parse_event("player_death", player=["name"], other=[])
except:
    df_kills = parser.parse_event("player_death")
print("Colunas:", list(df_kills.columns))
print()

# Detectar colunas de steamid de atacante
att_cols = [c for c in df_kills.columns if "attacker" in c.lower() and "steam" in c.lower()]
vic_cols  = [c for c in df_kills.columns if ("victim" in c.lower() or "user" in c.lower()) and "steam" in c.lower()]
name_cols = [c for c in df_kills.columns if "name" in c.lower()]
print(f"Colunas attacker steamid: {att_cols}")
print(f"Colunas victim steamid:   {vic_cols}")
print(f"Colunas nome:             {name_cols}")

# 3. Mostrar kills do Alckimin
print("\n" + "="*60)
print(f"KILLS DO ALCKIMIN (busca por '{TARGET_NAME}' ou ID {TARGET_ID}):")
print("="*60)

att_col  = att_cols[0] if att_cols else None
vic_col  = vic_cols[0] if vic_cols else None

kills_as_attacker = 0
kills_as_victim   = 0
target_sid_found  = set()

for _, row in df_kills.iterrows():
    # Busca por nome nos campos de nome
    names_in_row = {c: str(row.get(c,"")).lower() for c in name_cols}
    is_attacker = any(TARGET_NAME in v for v in names_in_row.values() 
                      if any(nc in c for c in name_cols for nc in ["attacker"]))
    is_victim   = any(TARGET_NAME in v for v in names_in_row.values()
                      if any(nc in c for c in name_cols for nc in ["victim", "user"]))
    
    # Busca por ID
    if att_col:
        raw_att = row.get(att_col)
        sid_att = sid(raw_att)
        if sid_att == TARGET_ID or (TARGET_NAME in str(row.get([c for c in name_cols if "att" in c][0] if [c for c in name_cols if "att" in c] else "", "")).lower()):
            kills_as_attacker += 1
            target_sid_found.add((sid_att, str(raw_att), type(raw_att).__name__))
            print(f"  KILL: tick={row.get('tick')} raw_sid={raw_att!r} tipo={type(raw_att).__name__} sid_conv={sid_att}")

print(f"\nTotal kills como atacante: {kills_as_attacker}")
print(f"IDs encontrados para este jogador: {target_sid_found}")

# 4. Buscar por nome diretamente
print("\n" + "="*60)
print("BUSCA POR NOME 'alkimin' EM TODOS OS CAMPOS:")
print("="*60)
att_name_col = next((c for c in df_kills.columns if "attacker" in c.lower() and "name" in c.lower()), None)
if att_name_col:
    mask = df_kills[att_name_col].astype(str).str.lower().str.contains(TARGET_NAME, na=False)
    hits = df_kills[mask]
    print(f"Coluna usada: {att_name_col}")
    print(f"Kills encontradas: {len(hits)}")
    if att_col and not hits.empty:
        print("Primeiras 5 linhas:")
        for _, r in hits.head(5).iterrows():
            raw = r.get(att_col)
            print(f"  tick={r['tick']} raw={raw!r} tipo={type(raw).__name__} sid={sid(raw)} nome={r.get(att_name_col)}")
else:
    print("Coluna attacker_name NÃO encontrada no evento!")
    print("Colunas disponíveis com 'name':", [c for c in df_kills.columns if "name" in c.lower()])
