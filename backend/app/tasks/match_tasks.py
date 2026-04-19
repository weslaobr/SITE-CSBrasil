from app.core.celery_app import celery_app
from app.services.downloader import DownloaderService
from app.services.parser import ParserService
from app.db.session import AsyncSessionLocal
import asyncio
from datetime import datetime

@celery_app.task(name="process_match_task")
def process_match_task(match_id: str, steamid: str, demo_url: str, match_date: str = None):
    """
    Background task to download and parse a demo.
    """
    # Downloader
    filename = f"{match_id}.dem.bz2"
    local_path = DownloaderService.download_demo(demo_url, filename)
    
    # Parser
    parser = ParserService(local_path)
    
    # Running async session in celery (which is synchronous)
    async def run_parser():
        async with AsyncSessionLocal() as db:
            import logging
            task_logger = logging.getLogger("app.tasks")
            task_logger.info(f"Starting async parser for {match_id}")
            # Parse date string if available
            dt_match = None
            if match_date:
                try:
                    # Accepts YYYY-MM-DD or ISO formats
                    dt_match = datetime.fromisoformat(match_date)
                except ValueError:
                    try:
                        dt_match = datetime.strptime(match_date, "%Y-%m-%d %H:%M")
                    except ValueError:
                        task_logger.warning(f"Invalid match_date format: {match_date}")

            await parser.parse_and_save(db, match_id_override=match_id, match_date=dt_match, demo_url=demo_url)
            task_logger.info(f"Finished async parser for {match_id}")
            
    asyncio.run(run_parser())
    
    return {"status": "success", "match_id": match_id}

@celery_app.task(name="sync_all_users_task")
def sync_all_users_task():
    """
    Periodic task to check for new matches across all users.
    """
    from app.services.sync_service import SyncService
    
    # Running async service in celery (synchronous)
    asyncio.run(SyncService.sync_all_registered_users())
    
    return {"status": "sync_complete"}
