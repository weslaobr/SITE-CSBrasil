from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from app.db.session import get_db
from app.schemas.importer import ImportMatchRequest
from app.tasks.match_tasks import process_match_task
from app.services.downloader import DownloaderService
from app.services.demo_analyzer import DemoAnalyzerService
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG)


class DemoAnalyzeRequest(BaseModel):
    demo_url: str
    submitted_by_steamid: Optional[str] = None

# CORS (Frontend Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "TropaCS Tracker API v1"}

@app.post("/api/importer/import-match", tags=["Importer"])
async def import_match(request: ImportMatchRequest):
    """
    Receives SteamID and Auth Code, fetches match history OR accepts a direct share_code / link for manual import.
    """
    # 1. Manual Demo Import (if share_code or url is provided)
    if request.share_code:
        import uuid
        is_url = "http" in request.share_code
        match_id_mock = request.share_code.split("/")[-1].split(".")[0] if is_url else request.share_code

        process_match_task.delay(
            match_id=match_id_mock,
            steamid=request.steamid,
            demo_url=request.share_code if is_url else None,
            source="mix"
        )
        return {
            "status": "processing",
            "message": "Queued manual match import.",
            "matches": [{"sharing_code": request.share_code}]
        }

    # 2. Automated Official Import
    matches = DownloaderService.get_match_history(request.steamid, request.auth_code)
    
    if not matches:
        raise HTTPException(status_code=404, detail="No matches found or invalid Auth Code.")

    # Trigger tasks for each match
    for match in matches:
        process_match_task.delay(
            match_id=match["sharing_code"],
            steamid=request.steamid,
            demo_url=match["demo_url"],
            source="matchmaking"
        )
    
    return {
        "status": "processing",
        "message": f"Queued {len(matches)} matches for processing.",
        "matches": matches
    }

@app.get("/api/match/{match_id}/stats", tags=["Tracker"])
async def get_match_stats(match_id: str, db: AsyncSession = Depends(get_db)):
    from app.models.tracker import Match, MatchPlayer
    from sqlalchemy import select
    
    match = await db.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    stmt = select(MatchPlayer).where(MatchPlayer.match_id == match_id)
    result = await db.execute(stmt)
    players = result.scalars().all()
    
    return {
        "match": match,
        "players": players
    }

@app.get("/api/match/{match_id}/ticks", tags=["Tracker"])
async def get_match_ticks(match_id: str, db: AsyncSession = Depends(get_db)):
    from app.models.tracker import TickData
    from sqlalchemy import select
    
    stmt = select(TickData).where(TickData.match_id == match_id).order_by(TickData.tick.asc())
    result = await db.execute(stmt)
    ticks = result.scalars().all()
    
    return {"ticks": ticks}

@app.get("/api/match/list", tags=["Tracker"])
async def list_matches(db: AsyncSession = Depends(get_db)):
    from app.models.tracker import Match
    from sqlalchemy import select, desc
    
    stmt = select(Match).order_by(desc(Match.parsed_at))
    result = await db.execute(stmt)
    matches = result.scalars().all()
    
    return matches

@app.get("/api/match/{match_id}/demo", tags=["Tracker"])
async def download_match_demo(match_id: str, db: AsyncSession = Depends(get_db)):
    """
    Serves the downloaded .dem file for a match, or redirects to the external URL.
    """
    import os
    from app.models.tracker import Match
    
    # Check for local file first
    file_path = os.path.join(settings.DEMO_PATH, f"{match_id}.dem")
    if not os.path.exists(file_path):
        file_path = os.path.join(settings.DEMO_PATH, f"{match_id}.dem.bz2")
    
    if os.path.exists(file_path):
        return FileResponse(
            path=file_path, 
            filename=f"{match_id}.dem" + (".bz2" if file_path.endswith(".bz2") else ""),
            media_type='application/octet-stream'
        )
        
    # File not on server, check if we have a demo_url to redirect to
    match = await db.get(Match, match_id)
    if match and match.demo_url and match.demo_url.startswith("http"):
        return RedirectResponse(url=match.demo_url)
        
    raise HTTPException(status_code=404, detail="Demo file not found and no external URL available.")

# Entry point for local testing
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
