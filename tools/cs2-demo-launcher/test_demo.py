import os
import winreg

def find_demo():
    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Valve\Steam")
        steam_path, _ = winreg.QueryValueEx(key, "InstallPath")
        winreg.CloseKey(key)
        
        csgo_path = os.path.join(steam_path, r"steamapps\common\Counter-Strike Global Offensive\game\csgo")
        if os.path.exists(csgo_path):
            for f in os.listdir(csgo_path):
                if f.endswith('.dem'):
                    return os.path.join(csgo_path, f)
    except:
        pass
    
    # Check D drive, C drive...
    for drive in ['C', 'D', 'E']:
        base = f"{drive}:\\SteamLibrary\\steamapps\\common\\Counter-Strike Global Offensive\\game\\csgo"
        if os.path.exists(base):
            for f in os.listdir(base):
                if f.endswith('.dem'):
                    return os.path.join(base, f)
                    
    return None

demo_path = find_demo()
if demo_path:
    print(f"Found: {demo_path}")
    from demoparser2 import DemoParser
    parser = DemoParser(demo_path)
    print("Players:")
    try:
        df = parser.parse_player_info()
        print(df.columns)
        print(df.head())
    except Exception as e:
        print(e)
    
    print("\nScores:")
    try:
        # Instead of parsing everything, let's see available fields somehow?
        # demoparser2 has parse_ticks(["score", "team_name"]) Let's try "score"
        df = parser.parse_ticks(["score"]) # maybe player score?
        print(df.head())
    except:
        print("score not found")
        
    try:
        df = parser.parse_ticks(["CCSTeam.m_iTeamScore"])
        print(df.head())
    except:
        import traceback
        traceback.print_exc()

else:
    print("No demo found anywhere")
