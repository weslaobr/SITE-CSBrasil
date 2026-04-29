from fastapi import FastAPI, Depends, HTTPException, Body, BackgroundTasks
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
async def import_match(request: ImportMatchRequest, background_tasks: BackgroundTasks):
    """
    Receives SteamID and Auth Code, fetches match history OR accepts a direct share_code / link for manual import.
    """
    # 1. Manual Demo Import (if share_code or url is provided)
    if request.share_code:
        import uuid
        is_url = "http" in request.share_code
        match_id_mock = request.share_code.split("/")[-1].split(".")[0] if is_url else request.share_code

        background_tasks.add_task(
            process_match_task,
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
        background_tasks.add_task(
            process_match_task,
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
    from app.models.tracker import Match, MatchPlayer, WeaponStat, ClutchEvent
    from sqlalchemy import select
    
    match = await db.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    from app.models.tracker import MatchPlayer, Player
    players_stmt = (
        select(MatchPlayer, Player.personaname)
        .join(Player, MatchPlayer.steamid64 == Player.steamid64)
        .where(MatchPlayer.match_id == match_id)
    )
    players_res = await db.execute(players_stmt)
    players_rows = players_res.all()
    
    # Convert to list of dicts or objects that have personaname
    players = []
    for mp, name in players_rows:
        p_dict = {c.name: getattr(mp, c.name) for c in mp.__table__.columns}
        p_dict["personaname"] = name
        players.append(p_dict)

    weapon_stmt = select(WeaponStat).where(WeaponStat.match_id == match_id)
    weapon_res = await db.execute(weapon_stmt)
    weapon_stats = weapon_res.scalars().all()

    clutch_stmt = select(ClutchEvent).where(ClutchEvent.match_id == match_id)
    clutch_res = await db.execute(clutch_stmt)
    clutches = clutch_res.scalars().all()

    # New: Fetch Rounds and KillEvents for the timeline/duels
    from app.models.tracker import Round, KillEvent
    rounds_stmt = select(Round).where(Round.match_id == match_id).order_by(Round.round_number)
    rounds_res = await db.execute(rounds_stmt)
    rounds = rounds_res.scalars().all()

    kills_stmt = select(KillEvent).where(KillEvent.match_id == match_id).order_by(KillEvent.tick)
    kills_res = await db.execute(kills_stmt)
    kills = kills_res.scalars().all()
    
    return {
        "match": match,
        "players": players,
        "weapon_stats": weapon_stats,
        "clutch_events": clutches,
        "rounds": rounds,
        "kill_events": kills
    }


@app.post("/api/match/{match_id}/parse", tags=["Tracker"])
async def trigger_match_parse(match_id: str, payload: dict):
    """
    Enfileira o processamento de uma demo específica.
    Payload: { "demo_url": "...", "steamid": "...", "source": "..." }
    """
    from app.tasks.match_tasks import process_match_task
    demo_url = payload.get("demo_url")
    steamid = payload.get("steamid")
    source = payload.get("source", "matchmaking")
    
    if not demo_url:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="demo_url is required")
        
    process_match_task.delay(match_id=match_id, steamid=steamid, demo_url=demo_url, source=source)
    return {"status": "queued", "match_id": match_id}

@app.get("/api/match/list", tags=["Tracker"])
async def list_matches(steamid: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    from app.models.tracker import Match, MatchPlayer
    from sqlalchemy import select, desc
    
    if steamid:
        # If steamid is provided, join with MatchPlayer to get stats
        # Handle both string and int (steamid64 is BigInteger in DB)
        try:
            s64 = int(steamid)
        except:
            s64 = 0
            
        stmt = select(Match, MatchPlayer).join(MatchPlayer).where(MatchPlayer.steamid64 == s64).order_by(desc(Match.parsed_at))
        result = await db.execute(stmt)
        rows = result.all()
        
        matches_with_stats = []
        for match, player in rows:
            m_dict = {c.name: getattr(match, c.name) for c in match.__table__.columns}
            p_dict = {c.name: getattr(player, c.name) for c in player.__table__.columns}
            # Merge player stats into match dict
            m_dict.update({
                "kills": p_dict.get("kills", 0),
                "deaths": p_dict.get("deaths", 0),
                "assists": p_dict.get("assists", 0),
                "adr": p_dict.get("adr", 0),
                "kast": p_dict.get("kast", 0),
                "rating": p_dict.get("rating", 0),
                "hs_count": p_dict.get("hs_count", 0),
                "eloChange": p_dict.get("elo_change"),
                "eloAfter": p_dict.get("elo_after"),
            })
            matches_with_stats.append(m_dict)
        return matches_with_stats
    
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

@app.on_event("startup")
async def startup_event():
    import asyncio
    from app.tasks.match_tasks import sync_all_users_task
    
    async def run_periodic_sync():
        while True:
            await asyncio.sleep(4 * 3600)  # A cada 4 horas
            try:
                logger.info("Iniciando sincronizacao periodica de todos os usuarios...")
                sync_all_users_task()
            except Exception as e:
                logger.error(f"Erro no sync periodico: {e}")
                
    # Inicia a task em background nativa do python
    asyncio.create_task(run_periodic_sync())

# Entry point for local testing
if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
