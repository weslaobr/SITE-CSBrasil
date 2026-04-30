import requests
import os
from app.core.config import settings

class DownloaderService:
    @staticmethod
    def get_match_history(steamid: str, auth_code: str):
        """
        Calls Valve's ISteamGameStats/GetMatchHistory/v1.
        Returns a list of share codes and their demo URLs.
        """
        # Mocking for Phase 1
        # In production, use requests.get(f"https://tropacsdemos.discloud.app/ISteamGameStats/GetMatchHistory/v1/?key={settings.STEAM_API_KEY}&steamid={steamid}&matchauth={auth_code}")
        
        # Example Response Structure
        return [
            {
                "sharing_code": "CSGO-V3G6E-N7Q2K-xxxx-xxxx",
                "demo_url": "http://replay.valve.net/730/0036..._123.dem.bz2",
                "map": "de_mirage",
                "date": "2026-03-31"
            }
        ]

    @staticmethod
    def download_demo(url: str, filename: str):
        """
        Downloads and decompresses the demo if needed.
        """
        # Determine if we should treat it as bz2
        is_bz2 = ".bz2" in url.lower() or filename.lower().endswith(".bz2")
        
        # Ensure filename has correct extension if we know it's not bz2
        if not is_bz2 and filename.endswith(".bz2"):
            filename = filename[:-4]

        local_path = os.path.join(settings.DEMO_PATH, filename)
        
        if os.path.exists(local_path):
            return local_path
            
        print(f"Downloader: Downloading {url} to {local_path}")
        r = requests.get(url, stream=True)
        r.raise_for_status()
        
        with open(local_path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        
        # Decompress if it's actually a bz2
        if is_bz2:
            import bz2
            decompressed_name = filename.replace(".bz2", "")
            decompressed_path = os.path.join(settings.DEMO_PATH, decompressed_name)
            
            print(f"Downloader: Decompressing BZ2 {local_path} -> {decompressed_path}")
            try:
                with bz2.BZ2File(local_path) as fr, open(decompressed_path, 'wb') as fw:
                    for data in iter(lambda: fr.read(100 * 1024), b''):
                        fw.write(data)
                return decompressed_path
            except Exception as e:
                print(f"Downloader: BZ2 decompression failed (maybe it wasn't a bz2): {e}")
                return local_path
            
        return local_path
