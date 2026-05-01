"""who_is_nan.py — Investigando as kills sem dono (v2)"""
from demoparser2 import DemoParser
import pandas as pd

DEMO = r"F:\SteamLibrary\steamapps\common\Counter-Strike Global Offensive\game\csgo\2026-04-23_21-50-41_32_de_inferno_team_giraaaa_Alkimin_vs_team_Fst.dem"
parser = DemoParser(DEMO)

print("Analisando as kills 'nan' da demo...")
df_k = parser.parse_event("player_death", player=["name"], other=["attacker_name", "attacker_steamid", "weapon"])

# Filtra kills onde o ID ou Nome é nulo/nan
df_k["atk_name_str"] = df_k["attacker_name"].astype(str).str.lower()
nan_kills = df_k[(df_k["atk_name_str"].isin(["nan", "none", "unknown", ""])) | (df_k["attacker_steamid"].isna())]

print(f"Encontradas {len(nan_kills)} kills sem atacante identificado.")

if not nan_kills.empty:
    print("\nBuscando autores via eventos de dano (player_hurt)...")
    df_h = parser.parse_event("player_hurt", player=["name"], other=["attacker_name", "attacker_steamid", "dmg_health"])
    
    found_map = {}
    for _, k_row in nan_kills.iterrows():
        tick = k_row["tick"]
        vic = k_row.get("user_name")
        possible = df_h[(df_h["tick"] >= tick-5) & (df_h["tick"] <= tick) & (df_h["user_name"] == vic)]
        if not possible.empty:
            last_attacker = possible.iloc[-1].get("attacker_name")
            found_map[last_attacker] = found_map.get(last_attacker, 0) + 1
            print(f"  Tick {tick}: {vic} morreu. Ultimo dano veio de: {last_attacker}")
        else:
            print(f"  Tick {tick}: {vic} morreu. Nenhuma causa encontrada.")
            
    print("\nRESUMO DE QUEM 'REIVINDICOU' AS KILLS SEM DONO:")
    for name, count in found_map.items():
        print(f"  {name}: {count} kills recuperaveis")
