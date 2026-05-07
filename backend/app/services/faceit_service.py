import os
import requests
import logging

logger = logging.getLogger(__name__)

class FaceitService:
    API_URL = "https://open.faceit.com/data/v4"
    
    @classmethod
    def get_player_info(cls, steam_id: str):
        """
        Fetch player info from FACEIT Data API using SteamID64.
        """
        api_key = os.getenv("FACEIT_API_KEY")
        if not api_key:
            logger.error("FACEIT_API_KEY not found in environment variables")
            return None
            
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json"
        }
        
        try:
            # Endpoint: /players?game=cs2&game_player_id={steam_id}
            url = f"{cls.API_URL}/players"
            params = {
                "game": "cs2",
                "game_player_id": steam_id
            }
            
            response = requests.get(url, headers=headers, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                cs2_data = data.get("games", {}).get("cs2", {})
                
                return {
                    "faceit_level": cs2_data.get("skill_level"),
                    "faceit_elo": cs2_data.get("faceit_elo"),
                    "faceit_nickname": data.get("nickname"),
                    "faceit_id": data.get("player_id")
                }
            elif response.status_code == 404:
                # Player might not have a FACEIT account linked to this SteamID
                return None
            else:
                logger.error(f"FACEIT API error for SteamID {steam_id}: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Exception while fetching FACEIT data for {steam_id}: {str(e)}")
            return None
