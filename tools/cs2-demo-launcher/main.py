import os
import winreg
import subprocess
import customtkinter as ctk
from tkinter import filedialog, messagebox
import re
import urllib.parse
import psutil
import pyautogui
import pygetwindow as gw
import time
import win32gui
import win32con
import threading

try:
    from demoparser2 import DemoParser
    HAS_PARSER = True
except ImportError:
    HAS_PARSER = False

class CS2DemoLauncher(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("CS2 Demo Launcher")
        self.geometry("800x600")
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")

        self.cs2_path = self.detect_cs2_path()
        self.demo_dir = self.get_default_demo_dir()
        self.selected_demo = None
        
        self.setup_ui()
        self.refresh_demos()

    def detect_cs2_path(self):
        """Attempts to find the CS2 installation path via Steam registry."""
        self.steam_path = ""
        try:
            # 1. Get Steam InstallPath from Registry
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Valve\Steam")
            steam_path, _ = winreg.QueryValueEx(key, "InstallPath")
            winreg.CloseKey(key)
            self.steam_path = steam_path

            # 2. Check main library
            cs2_rel_path = r"steamapps\common\Counter-Strike Global Offensive\game\bin\win64\cs2.exe"
            potential_path = os.path.join(steam_path, cs2_rel_path)
            if os.path.exists(potential_path):
                return potential_path

            # 3. Check other libraries via libraryfolders.vdf
            vdf_path = os.path.join(steam_path, "steamapps", "libraryfolders.vdf")
            if os.path.exists(vdf_path):
                with open(vdf_path, 'r') as f:
                    content = f.read()
                    # Find all "path" entries
                    paths = re.findall(r'"path"\s+"([^"]+)"', content)
                    for p in paths:
                        p = p.replace("\\\\", "\\")
                        potential_path = os.path.join(p, cs2_rel_path)
                        if os.path.exists(potential_path):
                            return potential_path
        except Exception as e:
            print(f"Error detecting CS2 path: {e}")
        
        return ""

    def get_default_demo_dir(self):
        if self.cs2_path:
            # Demos are usually in game/csgo/
            return os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(self.cs2_path))), "csgo")
        return ""

    def setup_ui(self):
        # Layout
        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1) # Preview column
        self.grid_rowconfigure(1, weight=1)
        self.grid_rowconfigure(2, weight=0)
        self.grid_rowconfigure(3, weight=0)

        # Header
        self.header_frame = ctk.CTkFrame(self)
        self.header_frame.grid(row=0, column=0, columnspan=2, padx=20, pady=20, sticky="ew")
        
        self.title_label = ctk.CTkLabel(self.header_frame, text="CS2 Demo Launcher", font=ctk.CTkFont(size=24, weight="bold"))
        self.title_label.pack(side="left", padx=10)

        self.path_label = ctk.CTkLabel(self.header_frame, text=f"CS2: {self.cs2_path if self.cs2_path else 'Not Found'}", text_color="gray")
        self.path_label.pack(side="right", padx=10)

        # Left Side: Demo List
        self.list_frame = ctk.CTkFrame(self)
        self.list_frame.grid(row=1, column=0, padx=(20, 10), pady=(0, 10), sticky="nsew")
        
        self.scrollable_frame = ctk.CTkScrollableFrame(self.list_frame, label_text="Available Demos (.dem)")
        self.scrollable_frame.pack(fill="both", expand=True, padx=5, pady=5)

        # Right Side: Preview
        self.preview_frame = ctk.CTkFrame(self)
        self.preview_frame.grid(row=1, column=1, padx=(10, 20), pady=(0, 10), sticky="nsew")
        
        self.preview_label = ctk.CTkLabel(self.preview_frame, text="Select a demo to see details", font=ctk.CTkFont(size=16))
        self.preview_label.pack(pady=20)
        
        self.preview_content = ctk.CTkFrame(self.preview_frame, fg_color="transparent")
        self.preview_content.pack(fill="both", expand=True, padx=10, pady=10)

        # Log Area
        self.log_textbox = ctk.CTkTextbox(self, height=80, font=ctk.CTkFont(size=10))
        self.log_textbox.grid(row=2, column=0, columnspan=2, padx=20, pady=(0, 10), sticky="ew")
        self.log("App started. CS2 Path detected: " + (self.cs2_path if self.cs2_path else "Not found"))

        # Controls
        self.controls_frame = ctk.CTkFrame(self)
        self.controls_frame.grid(row=3, column=0, columnspan=2, padx=20, pady=(0, 20), sticky="ew")

        self.btn_select_folder = ctk.CTkButton(self.controls_frame, text="Select Folder", command=self.select_folder)
        self.btn_select_folder.pack(side="left", padx=10, pady=10)

        self.btn_refresh = ctk.CTkButton(self.controls_frame, text="Refresh", command=self.refresh_demos)
        self.btn_refresh.pack(side="left", padx=10, pady=10)

        self.btn_launch_selected = ctk.CTkButton(self.controls_frame, text="Launch Demo", command=self.launch_selected, state="disabled", fg_color="green", hover_color="darkgreen")
        self.btn_launch_selected.pack(side="right", padx=10, pady=10)

    def select_folder(self):
        folder = filedialog.askdirectory()
        if folder:
            self.demo_dir = folder
            self.refresh_demos()

    def refresh_demos(self):
        # Clear existing
        for widget in self.scrollable_frame.winfo_children():
            widget.destroy()

        if not self.demo_dir or not os.path.exists(self.demo_dir):
            self.log("Demo directory not set or doesn't exist.")
            return

        try:
            demos = [f for f in os.listdir(self.demo_dir) if f.endswith(".dem")]
        except Exception as e:
            self.log(f"Error listing demos: {e}")
            return
        
        if not demos:
            no_demos = ctk.CTkLabel(self.scrollable_frame, text="No .dem files found in selected folder.")
            no_demos.pack(pady=20)
            return

        for demo in sorted(demos):
            btn = ctk.CTkButton(self.scrollable_frame, text=demo, anchor="w", fg_color="transparent", hover_color="#2b2b2b",
                               command=lambda d=demo: self.select_demo(d))
            btn.pack(fill="x", padx=5, pady=2)

    def select_demo(self, demo_name):
        self.selected_demo = demo_name
        self.btn_launch_selected.configure(state="normal")
        
        # Highlight selected button (optional: would need to store buttons)
        for widget in self.scrollable_frame.winfo_children():
            if isinstance(widget, ctk.CTkButton):
                if widget.cget("text") == demo_name:
                    widget.configure(fg_color="#3b3b3b")
                else:
                    widget.configure(fg_color="transparent")
        
        self.update_preview()

    def update_preview(self):
        # Clear preview
        for widget in self.preview_content.winfo_children():
            widget.destroy()
        
        if not self.selected_demo:
            return

        self.preview_label.configure(text=f"Preview: {self.selected_demo}")
        
        loading_label = ctk.CTkLabel(self.preview_content, text="Loading match data...")
        loading_label.pack(pady=20)
        
        # Run parsing in a separate thread to keep UI responsive
        threading.Thread(target=self.fetch_demo_info, daemon=True).start()

    def fetch_demo_info(self):
        if not HAS_PARSER:
            self.after(0, lambda: self.show_preview_error("Parser (demoparser2) not installed.\nPlease run run_launcher.bat"))
            return

        demo_name = self.selected_demo
        demo_dir = self.demo_dir
        
        if not demo_name or not demo_dir:
            return

        demo_path = os.path.join(demo_dir, demo_name)
        try:
            parser = DemoParser(demo_path)
            header = parser.parse_header()
            
            # Get map
            map_name = header.get("map_name", "Unknown")
            
            # Get scores and players
            scores_summary = {}
            players = {}
            
            # --- Try to get player names using parse_player_info() ---
            try:
                df_players = parser.parse_player_info()
                if not df_players.empty and "name" in df_players.columns:
                    df_valid = df_players[(df_players["name"].notna()) & (df_players["name"].astype(str).str.lower() != "gotv")]
                    
                    found_teams = False
                    if "team_name" in df_valid.columns:
                        for _, row in df_valid.iterrows():
                            t = str(row.get("team_name", "Unknown")).strip()
                            if not t or t.lower() == "unassigned":
                                t = "Spectators"
                            p = str(row["name"]).strip()
                            if p:
                                if t not in players:
                                    players[t] = set()
                                players[t].add(p)
                        players = {k: sorted(list(v)) for k, v in players.items()}
                        found_teams = True
                    
                    if not found_teams:
                        # Fallback to parse_ticks for team_name
                        try:
                            for team_field in ["team_name", "m_iTeamNum"]:
                                df_ticks = parser.parse_ticks([team_field, "name"])
                                if not df_ticks.empty and team_field in df_ticks.columns and "name" in df_ticks.columns:
                                    latest_teams = df_ticks.dropna(subset=[team_field, "name"]).drop_duplicates(subset=["name"], keep="last")
                                    for _, row in latest_teams.iterrows():
                                        t = str(row[team_field]).strip()
                                        if team_field == "m_iTeamNum":
                                            # 1=Spectator, 2=TERRORIST, 3=CT
                                            if t == "2": t = "TERRORIST"
                                            elif t == "3": t = "CT"
                                            else: t = "Spectators"
                                        elif not t or t.lower() == "unassigned":
                                            t = "Spectators"
                                            
                                        p = str(row["name"]).strip()
                                        if p and p.lower() != "gotv":
                                            if t not in players:
                                                players[t] = set()
                                            players[t].add(p)
                                    if players:
                                        players = {k: sorted(list(v)) for k, v in players.items()}
                                        found_teams = True
                                        self.log(f"Extracted team grouping using parse_ticks with {team_field}")
                                        break
                        except Exception as e_tick:
                            self.log(f"Fallback team_name error: {e_tick}")

                    if not found_teams:
                        players["Players"] = sorted([p for p in df_valid["name"].unique().tolist() if p])
                else:
                    self.log("Player name column not found in parse_player_info.")
            except Exception as e:
                self.log(f"Player parse error: {e}")

            # --- Try to get team scores ---
            try:
                # CCSTeam.m_iScore and CCSTeam.m_szTeamname might be abstracted.
                # Testing common fields.
                for fields in [
                    ["score", "team_name"],
                    ["m_iTeamScore", "m_szTeamname"],
                    ["CCSTeam.m_iScore", "CCSTeam.m_szTeamname"]
                ]:
                    try:
                        df_teams = parser.parse_ticks(fields)
                        if not df_teams.empty:
                            score_col = fields[0]
                            team_col = fields[1]
                            if score_col in df_teams.columns and team_col in df_teams.columns:
                                scores_summary = df_teams.groupby(team_col)[score_col].max().to_dict()
                                # Filter out empty map names or garbage
                                scores_summary = {k: v for k, v in scores_summary.items() if k and str(k).strip() != ""}
                                if scores_summary:
                                    self.log(f"Extracted scores using fields: {fields}")
                                    break
                    except Exception:
                        pass
                
                if not scores_summary:
                    self.log("Could not find any standard score fields from valid properties: [score, team_name, m_iTeamScore, m_szTeamname]")
                    
            except Exception as e:
                self.log(f"Score query error: {e}")

            # --- Try to get player stats ---
            player_stats = {}
            try:
                # Common stat fields
                stat_fields = ["name", "kills", "assists", "deaths"]
                df_stats = None
                
                try:
                    df = parser.parse_ticks(stat_fields)
                    # Check if at least one stat column actually returned
                    if df is not None and not df.empty and ("kills" in df.columns or "m_iKills" in df.columns):
                        df_stats = df
                except Exception:
                    pass

                # Fallback to internal properties if the first attempt didn't give us stat columns
                if df_stats is None or df_stats.empty or ("kills" not in df_stats.columns and "m_iKills" not in df_stats.columns):
                    stat_fields = ["name", "m_iKills", "m_iAssists", "m_iDeaths"]
                    try:
                        df_stats = parser.parse_ticks(stat_fields)
                    except Exception:
                        pass
                
                # Further fallback to exact CCSPlayerController fields if that failed
                if df_stats is None or df_stats.empty or ("m_iKills" not in df_stats.columns and "kills" not in df_stats.columns):
                    stat_fields = ["name", "CCSPlayerController.m_iKills", "CCSPlayerController.m_iAssists", "CCSPlayerController.m_iDeaths"]
                    try:
                        df_stats = parser.parse_ticks(stat_fields)
                    except Exception:
                        pass

                if df_stats is not None and not df_stats.empty and "name" in df_stats.columns:
                    # Find which column names actually got populated
                    k_col = next((c for c in ["kills", "m_iKills", "CCSPlayerController.m_iKills"] if c in df_stats.columns), None)
                    a_col = next((c for c in ["assists", "m_iAssists", "CCSPlayerController.m_iAssists"] if c in df_stats.columns), None)
                    d_col = next((c for c in ["deaths", "m_iDeaths", "CCSPlayerController.m_iDeaths"] if c in df_stats.columns), None)
                    
                    df_valid_stats = df_stats[df_stats["name"].notna()]
                    
                    kills_dict = df_valid_stats.groupby("name")[k_col].max().to_dict() if k_col else {}
                    assists_dict = df_valid_stats.groupby("name")[a_col].max().to_dict() if a_col else {}
                    deaths_dict = df_valid_stats.groupby("name")[d_col].max().to_dict() if d_col else {}

                    for p_name in df_valid_stats["name"].unique():
                        p_str = str(p_name).strip()
                        if p_str and p_str.lower() != "gotv":
                            k = int(kills_dict.get(p_name, 0)) if kills_dict.get(p_name) is not None else 0
                            a = int(assists_dict.get(p_name, 0)) if assists_dict.get(p_name) is not None else 0
                            d = int(deaths_dict.get(p_name, 0)) if deaths_dict.get(p_name) is not None else 0
                            # Only add to UI if we successfully got at least one of the cols
                            if k_col or a_col or d_col:
                                player_stats[p_str] = f"{k} K / {a} A / {d} D"
                            
            except Exception as e_stats:
                self.log(f"Stats query error: {e_stats}")

            self.after(0, lambda: self.show_preview_data(map_name, scores_summary, players, player_stats))
            
        except Exception as e:
            self.log(f"Error parsing demo: {e}")
            err_msg = str(e)
            self.after(0, lambda: self.show_preview_error(f"Error parsing demo: {err_msg[:50]}..."))

    def show_preview_data(self, map_name, scores, players, player_stats=None):
        for widget in self.preview_content.winfo_children():
            widget.destroy()
        
        # Map Info
        map_label = ctk.CTkLabel(self.preview_content, text=f"Map: {map_name}", font=ctk.CTkFont(weight="bold"))
        map_label.pack(pady=(5, 0))
        
        # Score Info
        score_text = " - ".join([f"{t}: {s}" for t, s in scores.items()]) if scores else "Score: Unknown"
        score_label = ctk.CTkLabel(self.preview_content, text=score_text, font=ctk.CTkFont(size=18, weight="bold"), text_color="orange")
        score_label.pack(pady=5)
        
        # Players List by Team
        players_scroll = ctk.CTkScrollableFrame(self.preview_content, height=200)
        players_scroll.pack(fill="both", expand=True, pady=5)
        
        if isinstance(players, dict):
            for team, team_players in players.items():
                if not team_players:
                    continue
                team_score = scores.get(team, "")
                team_header = f"{team} - {team_score}" if team_score else team
                
                t_label = ctk.CTkLabel(players_scroll, text=team_header, font=ctk.CTkFont(weight="bold", size=14), text_color="#3498db")
                t_label.pack(pady=(10, 2), anchor="w")
                
                for p in team_players:
                    p_text = f"• {p}"
                    if player_stats and p in player_stats:
                        p_text += f"   [{player_stats[p]}]"
                    p_label = ctk.CTkLabel(players_scroll, text=p_text, anchor="w")
                    p_label.pack(fill="x", padx=15, pady=1)
        else:
            # Fallback
            players_label = ctk.CTkLabel(self.preview_content, text="Players:", font=ctk.CTkFont(weight="bold"))
            players_label.pack(pady=(10, 0), anchor="w")
            for p in players:
                p_text = f"• {p}"
                if player_stats and p in player_stats:
                    p_text += f"   [{player_stats[p]}]"
                p_label = ctk.CTkLabel(players_scroll, text=p_text, anchor="w")
                p_label.pack(fill="x", padx=5)

    def show_preview_error(self, error_msg):
        for widget in self.preview_content.winfo_children():
            widget.destroy()
        err_label = ctk.CTkLabel(self.preview_content, text=error_msg, text_color="red", wraplength=200)
        err_label.pack(pady=20)

    def launch_selected(self):
        if self.selected_demo:
            self.launch_demo(self.selected_demo)

    def log(self, message):
        if hasattr(self, 'log_textbox'):
            self.log_textbox.insert("end", f"{message}\n")
            self.log_textbox.see("end")
        print(message)

    def is_cs2_running(self):
        found = False
        try:
            for proc in psutil.process_iter(['pid', 'name', 'exe']):
                if proc.info['name'] and proc.info['name'].lower() == "cs2.exe":
                    self.log(f"Processo detectado! PID: {proc.info['pid']} - Path: {proc.info['exe']}")
                    found = True
        except Exception as e:
            self.log(f"Erro ao verificar processos: {e}")
        return found

    def get_cfg_dir(self):
        """Finds the CS2 cfg directory."""
        if not self.cs2_path:
            return ""
        # From game/bin/win64/cs2.exe to game/csgo/cfg/
        base = os.path.dirname(os.path.dirname(os.path.dirname(self.cs2_path)))
        cfg_dir = os.path.join(base, "csgo", "cfg")
        if os.path.exists(cfg_dir):
            return cfg_dir
        return ""

    def launch_demo(self, demo_name):
        if not self.cs2_path:
            messagebox.showerror("Error", "CS executable não encontrado.")
            return

        demo_full_path = os.path.normpath(os.path.join(self.demo_dir, demo_name))
        
        if not os.path.exists(demo_full_path):
            messagebox.showerror("Error", f"Arquivo não encontrado:\n{demo_full_path}")
            return

        self.log(f"--- Iniciando preparo para: {demo_name} ---")
        
        # Check if already running
        if self.is_cs2_running():
            self.log("CS2 já está aberto. Tentando injetar o comando automaticamente via teclado...")
            # User wants to do it automatically via keyboard injection
            cfg_dir = self.get_cfg_dir()
            if cfg_dir:
                try:
                    cfg_path = os.path.join(cfg_dir, "antigravity_launch.cfg")
                    with open(cfg_path, 'w', encoding='utf-8') as f:
                        fixed_path = demo_full_path.replace('\\', '/')
                        f.write(f'playdemo "{fixed_path}"\n')
                    self.log(f"CFG Bridge atualizada em: {cfg_path}")
                    
                    # Tenta focar a janela e digitar o comando
                    try:
                        windows = gw.getWindowsWithTitle("Counter-Strike 2")
                        if not windows:
                            # Fallback case-insensitive search
                            all_windows = gw.getAllTitles()
                            for t in all_windows:
                                if "counter-strike" in t.lower() or "cs2" in t.lower():
                                    windows = gw.getWindowsWithTitle(t)
                                    break

                        if windows:
                            win = windows[0]
                            try:
                                win.activate()
                            except Exception:
                                pass # Sometimes activate throws an error but still works
                            
                            # Extra fallback using win32gui
                            hwnd = win32gui.FindWindow(None, win.title)
                            if hwnd:
                                # Hack to force foreground window
                                # https://stackoverflow.com/a/14973422
                                win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                                try:
                                    win32gui.SetForegroundWindow(hwnd)
                                except Exception:
                                    pass

                            time.sleep(0.5)
                            
                            # Simula pressionamentos de tecla para garantir que o console abre
                            # Em ABNT2, pode ser aspas, acento agudo, ou til
                            pyautogui.press("'")
                            time.sleep(0.05)
                            pyautogui.press("`")
                            time.sleep(0.05)
                            pyautogui.press("~")
                            time.sleep(0.3)
                            
                            pyautogui.write("exec antigravity_launch")
                            time.sleep(0.1)
                            pyautogui.press("enter")
                            time.sleep(0.1)
                            
                            # Fecha o console
                            pyautogui.press("'")
                            pyautogui.press("`")
                            pyautogui.press("~")
                            
                            self.log("Comando enviado automaticamente por automação de teclado!")
                        else:
                            messagebox.showinfo("Aviso", "Não foi possível focar a janela do CS2.\nVá para o CS2, abra o console e digite:\nexec antigravity_launch")
                    except Exception as auto_e:
                        self.log(f"Erro na automação: {auto_e}")
                        messagebox.showinfo("Aviso", "Erro ao automatizar o teclado.\nVá para o CS2, abra o console e digite:\nexec antigravity_launch")
                except Exception as e:
                    self.log(f"Erro ao atualizar CFG: {e}")
            return

        cfg_dir = self.get_cfg_dir()
        launch_args = ["+playdemo", demo_full_path]
        
        # CFG BRIDGE METHOD (Very robust)
        if cfg_dir:
            try:
                cfg_path = os.path.join(cfg_dir, "antigravity_launch.cfg")
                with open(cfg_path, 'w', encoding='utf-8') as f:
                    # Fixing backslashes for CS2 console just in case
                    fixed_path = demo_full_path.replace('\\', '/')
                    f.write(f'playdemo "{fixed_path}"\n')
                self.log(f"CFG Bridge criado em: {cfg_path}")
                launch_args = ["+exec", "antigravity_launch"]
            except Exception as e:
                self.log(f"Erro ao criar CFG Bridge (tentando launch direto): {e}")

        try:
            if hasattr(self, 'steam_path') and self.steam_path and os.path.exists(os.path.join(self.steam_path, "steam.exe")):
                steam_exe = os.path.join(self.steam_path, "steam.exe")
                cmd = [steam_exe, "-applaunch", "730", "-console", "-dev"] + launch_args
                self.log(f"Executando via Steam: {' '.join(cmd)}")
                subprocess.Popen(cmd)
            else:
                cmd = [self.cs2_path, "-steam", "-console", "-dev"] + launch_args
                self.log(f"Executando diretamente: {' '.join(cmd)}")
                subprocess.Popen(cmd)
            
            messagebox.showinfo("Sucesso", "O jogo está sendo iniciado com a demo...\n\nPor favor, aguarde o jogo carregar completamente.")
            self.log("Comando enviado com sucesso.")
        except Exception as e:
            self.log(f"Erro no launch: {e}")
            messagebox.showerror("Erro", f"Não foi possível abrir o jogo.\nErro: {e}")

if __name__ == "__main__":
    app = CS2DemoLauncher()
    app.mainloop()
