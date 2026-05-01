"""find_the_killer.py — Quem matou 21 pessoas?"""
from demoparser2 import DemoParser
import pandas as pd

DEMO = r"F:\SteamLibrary\steamapps\common\Counter-Strike Global Offensive\game\csgo\2026-04-23_21-50-41_32_de_inferno_team_giraaaa_Alkimin_vs_team_Fst.dem"
parser = DemoParser(DEMO)

print("Listando jogadores registrados no início (parse_ticks)...")
df_p = parser.parse_ticks(["name", "steamid"])
players = df_p.dropna(subset=["steamid"]).drop_duplicates(subset=["steamid"])
id_map = {str(row["steamid"]): row["name"] for _, row in players.iterrows()}
for sid, name in id_map.items():
    print(f"  ID: {sid:<20} Nome: {name}")

print("\nAnalisando eventos de morte (player_death)...")
df_k = parser.parse_event("player_death", player=["name"], other=["attacker_name", "attacker_steamid"])

def to_sid(v):
    try: return "{:.0f}".format(float(v))
    except: return str(v)

df_k["sid"] = df_k["attacker_steamid"].apply(to_sid)
counts = df_k["sid"].value_counts()

print("\nRANKING DE KILLS POR ID NA DEMO:")
for sid, count in counts.items():
    name = id_map.get(sid, "NOME DESCONHECIDO")
    # Tenta buscar o nome no próprio evento se não estiver no id_map
    if name == "NOME DESCONHECIDO":
        name_in_ev = df_k[df_k["sid"] == sid]["attacker_name"].iloc[0]
        name = f"{name_in_ev} (apenas em eventos)"
    print(f"  Kills: {count:<3} | ID: {sid:<20} | Jogador: {name}")

print("\nVerificando se o Alckimin aparece com algum ID diferente...")
alk_kills = df_k[df_k["attacker_name"].astype(str).str.lower().str.contains("alkimin", na=False)]
if not alk_kills.empty:
    print(f"Kills encontradas para nome contendo 'alkimin': {len(alk_kills)}")
    print(f"IDs usados por esse nome: {alk_kills['sid'].unique()}")
else:
    print("Nenhuma kill encontrada buscando pelo nome 'alkimin'!")
