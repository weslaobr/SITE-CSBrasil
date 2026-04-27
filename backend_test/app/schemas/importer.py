from pydantic import BaseModel
from typing import List, Optional

class ImportMatchRequest(BaseModel):
    steamid: str
    auth_code: str
    share_code: Optional[str] = None # Optional for manual import

class MatchResponse(BaseModel):
    match_id: str
    status: str
    map_name: Optional[str] = None
    processed: bool = False
