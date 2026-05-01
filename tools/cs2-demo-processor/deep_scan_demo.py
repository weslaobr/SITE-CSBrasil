"""deep_scan_demo.py — Scanner exaustivo (ASCII version)"""
import sys
from demoparser2 import DemoParser
import pandas as pd
import numpy as np

DEMO = r"F:\SteamLibrary\steamapps\common\Counter-Strike Global Offensive\game\csgo\2026-04-23_21-50-41_32_de_inferno_team_giraaaa_Alkimin_vs_team_Fst.dem"
TARGET_ID = 76561199495756542

print(f"DEBUG: Abrindo demo {DEMO}")
parser = DemoParser(DEMO)

# 1. Ticks
df_ticks = parser.parse_ticks(["name", "steamid", "team_name"])
p_data = df_ticks[df_ticks["steamid"] == TARGET_ID]
if p_data.empty:
    print("ERRO: Jogador nao encontrado.")
    sys.exit(1)
print(f"JOGADOR: {p_data['name'].iloc[-1]}")

# 2. Kills
df_kills = parser.parse_event("player_death", player=["name", "steamid"], other=["attacker_name", "attacker_steamid"])
# Forcar conversao para string de 17 digitos para comparar
def to_sid(v):
    try: return "{:.0f}".format(float(v))
    except: return str(v)

df_kills["att_sid"] = df_kills["attacker_steamid"].apply(to_sid)
target_sid_str = str(TARGET_ID)
kills = df_kills[df_kills["att_sid"] == target_sid_str]
print(f"KILLS COMO ATACANTE (EVENTOS): {len(kills)}")

# 3. Scoreboard (A verdade final da demo)
df_sb = parser.parse_ticks(["steamid", "kills", "deaths", "assists"])
p_sb = df_sb[df_sb["steamid"] == TARGET_ID]
if not p_sb.empty:
    # Ver o valor máximo de kills registrado no scoreboard durante toda a demo
    max_k = p_sb["kills"].max()
    print(f"KILLS NO SCOREBOARD (MAXIMO): {max_k}")
    
    # Ver evolução por tick para detectar reset
    # Pega amostras a cada 1000 ticks
    samples = p_sb.iloc[::1000]
    print("EVOLUCAO DE KILLS NO SCOREBOARD:")
    for _, row in samples.iterrows():
        print(f"  Tick {row['tick']}: {row['kills']} Kills")
    
    # Valor final
    last_k = p_sb.sort_values("tick")["kills"].iloc[-1]
    print(f"VALOR FINAL NO SCOREBOARD: {last_k}")
else:
    print("Scoreboard indisponivel.")
