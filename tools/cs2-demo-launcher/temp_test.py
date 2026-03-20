import os
from demoparser2 import DemoParser

demo_dir = r'e:\Github\SITE-CSBrasil\tools\cs2-demo-launcher\venv\demos' # wait, where are the demos?
# let's find a demo
def find_demo():
    for root, dirs, files in os.walk(r'e:\Github\SITE-CSBrasil'):
        for file in files:
            if file.endswith('.dem'):
                return os.path.join(root, file)
    return None

demo_path = find_demo()
if not demo_path:
    print("No demo found")
    exit()

print(f"Testing with demo: {demo_path}")
parser = DemoParser(demo_path)

try:
    print("Trying parse_player_info()...")
    df = parser.parse_player_info()
    print("Player info found!")
    print(df.columns)
    print(df['name'].unique().tolist())
except Exception as e:
    print(f"Error parse_player_info: {e}")

try:
    print("Trying CCSTeam scores...")
    df = parser.parse_ticks(["score", "team_name"])
    print("Score columns:", df.columns)
    print(df.head())
except Exception as e:
    print(f"Error parse_ticks score: {e}")
