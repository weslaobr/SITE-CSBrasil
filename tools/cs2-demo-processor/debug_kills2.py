"""debug_kills2.py — Investigação completa das kills na demo"""
import sys
from demoparser2 import DemoParser

DEMO = r"F:\SteamLibrary\steamapps\common\Counter-Strike Global Offensive\game\csgo\2026-04-23_21-50-41_32_de_inferno_team_giraaaa_Alkimin_vs_team_Fst.dem"
TARGET_NAME = "alkimin"

parser = DemoParser(DEMO)
df = parser.parse_event("player_death", player=["name"], other=[])
print(f"Total de events player_death: {len(df)}")
print(f"Colunas: {list(df.columns)}\n")

# Kills como atacante (attacker_name contém alkimin)
att_col = "attacker_steamid"
vic_col = "user_steamid"
att_name = "attacker_name"
vic_name = "user_name"

kills_att = df[df[att_name].astype(str).str.lower().str.contains(TARGET_NAME, na=False)]
kills_vic = df[df[vic_name].astype(str).str.lower().str.contains(TARGET_NAME, na=False)]

print(f"Linhas onde Alckimin é ATACANTE: {len(kills_att)}")
print(f"Linhas onde Alckimin é VÍTIMA:   {len(kills_vic)}")
print()

print("Primeiras kills como atacante:")
for _, r in kills_att.head(5).iterrows():
    print(f"  tick={r['tick']} att_sid='{r.get(att_col)}' vic_sid='{r.get(vic_col)}' weapon={r.get('weapon')} hs={r.get('headshot')}")

# Ver se há kills com user_steamid sendo Alckimin mas atacante sendo outro
print("\nVerificando: Alckimin aparece como VÍTIMA com qual atacante?")
for _, r in kills_vic.head(5).iterrows():
    print(f"  tick={r['tick']} att={r.get(att_name)} vic={r.get(vic_name)} weapon={r.get('weapon')}")

# Ver o scoreboard oficial para comparar kills
print("\n--- SCOREBOARD OFICIAL (parse_ticks kills) ---")
df_sc = parser.parse_ticks(["name", "steamid", "kills", "deaths", "assists", "score", "mvps"])
latest = df_sc.groupby("steamid").tail(1)
for _, r in latest.iterrows():
    name = str(r.get("name",""))
    if TARGET_NAME in name.lower() or "alkimin" in name.lower():
        print(f"  Nome={name}")
        print(f"  raw_steamid={r.get('steamid')!r} tipo={type(r.get('steamid')).__name__}")
        print(f"  kills={r.get('kills')} deaths={r.get('deaths')} assists={r.get('assists')}")
        print(f"  score={r.get('score')} mvps={r.get('mvps')}")

print("\n--- TODOS OS JOGADORES NO SCOREBOARD ---")
for _, r in latest.iterrows():
    name = str(r.get("name",""))
    raw = r.get("steamid")
    print(f"  {name:<20} raw={raw!r:<30} kills={r.get('kills')} deaths={r.get('deaths')}")
