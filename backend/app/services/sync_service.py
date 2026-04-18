from sqlalchemy import select
from app.models.tracker import PublicUser, Match
from app.services.downloader import DownloaderService
from app.tasks.match_tasks import process_match_task
from app.db.session import AsyncSessionLocal
import logging

logger = logging.getLogger(__name__)

class SyncService:
    @staticmethod
    async def sync_all_registered_users():
        """
        Global sync job: checks all users with steam auth codes for new matches.
        """
        async with AsyncSessionLocal() as db:
            # 1. Fetch all users from Public schema (Prisma)
            stmt = select(PublicUser).where(PublicUser.steamMatchAuthCode.is_not(None))
            result = await db.execute(stmt)
            users = result.scalars().all()
            
            logger.info(f"SyncService: Starting sync for {len(users)} users.")

            for user in users:
                if not user.steamId:
                    continue
                
                try:
                    # 2. Get history from Valve
                    matches = DownloaderService.get_match_history(user.steamId, user.steamMatchAuthCode)
                    
                    for m in matches:
                        match_id = m["sharing_code"]
                        
                        # 3. Check if match already exists in Tracker schema
                        existing = await db.get(Match, match_id)
                        if not existing:
                            logger.info(f"SyncService: Found new match {match_id} for user {user.steamId}. Queuing parsing task.")
                            # 4. Trigger async processing
                            process_match_task.delay(
                                match_id=match_id,
                                steamid=user.steamId,
                                demo_url=m["demo_url"],
                                match_date=m.get("date")
                            )
                except Exception as e:
                    logger.error(f"SyncService: Failed to sync user {user.steamId}: {str(e)}")
        
        return len(users)
