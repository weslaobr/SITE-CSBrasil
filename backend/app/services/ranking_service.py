from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.tracker import MatchPlayer, PublicUser, Match
import logging
import math

logger = logging.getLogger(__name__)

class RankingService:
    @staticmethod
    def calculate_level(points: int) -> int:
        """
        Calculates level from 1 to 20 based on Tropoints.
        Level 1: 0-100 Tropoints
        Level 5: 401-500 Tropoints (Initial)
        Level 20: 1901+ Tropoints
        """
        if points <= 0: return 1
        level = math.ceil(points / 100)
        return min(max(level, 1), 20)

    @classmethod
    async def process_match_rankings(cls, db: AsyncSession, match_id: str):
        """
        Updates Tropoints for all players in a match.
        Formula: 
        Base: Win +20, Loss -20, Tie 0
        Performance Bonus: (Rating - 1.0) * 20
        """
        logger.info(f"Ranking: Processing Tropoints for match {match_id}")
        
        # 1. Fetch match and players
        match = await db.get(Match, match_id)
        if not match:
            logger.error(f"Ranking: Match {match_id} not found")
            return

        stmt = select(MatchPlayer).where(MatchPlayer.match_id == match_id)
        result = await db.execute(stmt)
        players = result.scalars().all()

        if not players:
            logger.warning(f"Ranking: No players found for match {match_id}")
            return

        # Determine match outcome from internal scores
        # match.score_ct vs match.score_t
        # But players have 'team' A or B. 
        # Parser sets team A = CT start, B = T start.
        
        for p in players:
            # 2. Get User record
            user_stmt = select(PublicUser).where(PublicUser.steamId == str(p.steamid64))
            user_result = await db.execute(user_stmt)
            user = user_result.scalar_one_or_none()
            
            if not user:
                continue

            # 3. Determine base delta
            is_win = False
            is_loss = False
            is_tie = False

            # Logical Team A (CT start) vs Team B (T start)
            if match.score_ct > match.score_t:
                if p.team == 'A': is_win = True
                else: is_loss = True
            elif match.score_t > match.score_ct:
                if p.team == 'B': is_win = True
                else: is_loss = True
            else:
                is_tie = True

            base_points = 20 if is_win else (-20 if is_loss else 0)
            
            # 4. Performance adjustment
            # Rating 2.0 is normalized around 1.0
            rating = p.rating or 1.0
            perf_delta = (rating - 1.0) * 20
            
            total_delta = round(base_points + perf_delta)
            
            # Minimum -50, Maximum +50 to prevent extreme jumps
            total_delta = min(max(total_delta, -50), 50)
            
            old_points = user.rankingPoints or 1000
            new_points = max(0, old_points + total_delta)
            new_level = cls.calculate_level(new_points)

            # 5. Update User
            user.rankingPoints = new_points
            user.mixLevel = new_level
            
            logger.info(f"Ranking: User {p.steamid64} | {old_points} -> {new_points} (Delta: {total_delta}, Level: {new_level})")

            # 6. Update GlobalMatchPlayer if it exists (for history)
            # We use a raw SQL update because GlobalMatchPlayer might not be in our Python models yet
            try:
                from sqlalchemy import text
                await db.execute(text(
                    "UPDATE public.\"GlobalMatchPlayer\" SET \"eloChange\" = :change, \"eloAfter\" = :after "
                    "WHERE \"globalMatchId\" = :mid AND \"steamId\" = :sid"
                ), {"change": total_delta, "after": new_points, "mid": match_id, "sid": str(p.steamid64)})
            except Exception as e:
                logger.warning(f"Ranking: Could not update GlobalMatchPlayer history for {p.steamid64}: {e}")

        await db.commit()
        logger.info(f"Ranking: Finished processing match {match_id}")
