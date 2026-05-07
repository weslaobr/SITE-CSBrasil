from sqlalchemy import select, text
from app.models.tracker import PublicUser, Match
from app.services.downloader import DownloaderService
from app.tasks.match_tasks import process_match_task
from app.db.session import AsyncSessionLocal
from app.services.faceit_service import FaceitService
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

                    # 5. NEW: Auto-sync Faceit level during the process
                    try:
                        faceit_info = FaceitService.get_player_info(user.steamId)
                        if faceit_info:
                            # Update User Table
                            await db.execute(text("""
                                UPDATE public."User" 
                                SET "faceitLevel" = :level, "faceitElo" = :elo, "faceitNickname" = :nickname
                                WHERE id = :user_id
                            """), {
                                "level": faceit_info["faceit_level"],
                                "elo": faceit_info["faceit_elo"],
                                "nickname": faceit_info["faceit_nickname"],
                                "user_id": user.id
                            })

                            # Update Stats Table (for Ranking)
                            player_result = await db.execute(text('SELECT id FROM public."Player" WHERE "steamId" = :steam_id'), {"steam_id": user.steamId})
                            player = player_result.fetchone()
                            if player:
                                await db.execute(text("""
                                    UPDATE public."Stats" 
                                    SET "faceitLevel" = :level, "faceitElo" = :elo
                                    WHERE "playerId" = :player_id
                                """), {
                                    "level": faceit_info["faceit_level"],
                                    "elo": faceit_info["faceit_elo"],
                                    "player_id": player[0]
                                })
                    except Exception as fe:
                        logger.error(f"SyncService: Failed to sync Faceit for {user.steamId}: {str(fe)}")

                except Exception as e:
                    logger.error(f"SyncService: Failed to sync user {user.steamId}: {str(e)}")
            
            await db.commit()
        
        return len(users)
