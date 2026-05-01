"""check_final_scoreboard.py — A ultima esperanca"""
from demoparser2 import DemoParser

DEMO = r"F:\SteamLibrary\steamapps\common\Counter-Strike Global Offensive\game\csgo\2026-04-23_21-50-41_32_de_inferno_team_giraaaa_Alkimin_vs_team_Fst.dem"
parser = DemoParser(DEMO)

print("Buscando o placar final oficial gravado na demo...")
# Tenta colunas alternativas que a demoparser2 pode usar
cols = ["name", "steamid", "kills", "deaths", "assists", "mvps", "score"]
df = parser.parse_ticks(cols)

if df.empty:
    print("Erro: Placar nao disponivel via parse_ticks.")
else:
    # Pega o ultimo registro de cada SteamID
    df_last = df.dropna(subset=["steamid"]).sort_values("tick").drop_duplicates(subset=["steamid"], keep="last")
    print("\nPLACAR FINAL ENCONTRADO:")
    for _, row in df_last.iterrows():
        print(f"  {row['name']:<20} | K: {row.get('kills')} | D: {row.get('deaths')} | A: {row.get('assists')} | ID: {row.get('steamid')}")
