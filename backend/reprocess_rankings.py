import asyncio
import os
import sys
import json
import re

# Adicionar o diretório atual ao path para importar o app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ReprocessRankings")

# Database URL cleanup for asyncpg
DATABASE_URL = "postgresql://csbrasil:%40Nenezinho1995@csbrasil.postgres.uhserver.com:5432/csbrasil?sslmode=disable"
DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
DATABASE_URL = re.sub(r'[?&]sslmode=[^&]*', '', DATABASE_URL)

def calculate_level(points: int) -> int:
    if points <= 0: return 1
    import math
    level = math.ceil(points / 100)
    return min(max(level, 1), 20)

async def reprocess_all():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        logger.info("Starting retroactive ranking reprocessing from GlobalMatch (source='mix')...")

        # 1. Reset all users
        logger.info("Resetting all users to 500 Tropoints (Level 5)...")
        await db.execute(text("UPDATE public.\"User\" SET \"rankingPoints\" = 500, \"mixLevel\" = 5"))
        
        # 2. Reset history
        logger.info("Clearing ranking history in GlobalMatchPlayer...")
        await db.execute(text("UPDATE public.\"GlobalMatchPlayer\" SET \"eloChange\" = NULL, \"eloAfter\" = NULL"))
        await db.commit()

        # 3. Get all mix matches ordered by date
        # We use raw SQL to avoid model mismatches if they occur
        matches_res = await db.execute(text("SELECT id, \"scoreA\", \"scoreB\", \"matchDate\" FROM public.\"GlobalMatch\" WHERE source = 'mix' ORDER BY \"matchDate\" ASC"))
        matches = matches_res.fetchall()

        logger.info(f"Found {len(matches)} mix matches to reprocess.")

        # 4. Process each match
        count = 0
        for m_id, scoreA, scoreB, m_date in matches:
            # Get players for this match
            players_res = await db.execute(text("SELECT \"steamId\", team, metadata, adr FROM public.\"GlobalMatchPlayer\" WHERE \"globalMatchId\" = :mid"), {"mid": m_id})
            players = players_res.fetchall()
            
            for sid, team, meta_raw, adr in players:
                # Get User
                user_res = await db.execute(text("SELECT \"rankingPoints\" FROM public.\"User\" WHERE \"steamId\" = :sid"), {"sid": sid})
                user_row = user_res.fetchone()
                if not user_row: continue
                
                old_points = user_row[0] or 500
                
                # Logic
                is_win = (scoreA > scoreB and team == 'A') or (scoreB > scoreA and team == 'B')
                is_loss = (scoreA < scoreB and team == 'A') or (scoreB < scoreA and team == 'B')
                is_tie = scoreA == scoreB
                
                base_points = 20 if is_win else (-20 if is_loss else 0)
                
                # Performance
                perf_delta = 0
                try:
                    m_data = json.loads(meta_raw) if isinstance(meta_raw, str) else meta_raw
                    if m_data and 'leetify_rating' in m_data:
                        perf_delta = float(m_data['leetify_rating']) * 20
                    elif adr:
                        perf_delta = (float(adr) - 80) / 4
                except:
                    pass
                
                total_delta = round(base_points + perf_delta)
                total_delta = min(max(total_delta, -50), 50)
                
                new_points = max(0, old_points + total_delta)
                new_level = calculate_level(new_points)
                
                # Update User
                await db.execute(text("UPDATE public.\"User\" SET \"rankingPoints\" = :pts, \"mixLevel\" = :lvl WHERE \"steamId\" = :sid"), 
                                 {"pts": new_points, "lvl": new_level, "sid": sid})
                
                # Update GlobalMatchPlayer
                await db.execute(text("UPDATE public.\"GlobalMatchPlayer\" SET \"eloChange\" = :chg, \"eloAfter\" = :aft WHERE \"globalMatchId\" = :mid AND \"steamId\" = :sid"),
                                 {"chg": total_delta, "aft": new_points, "mid": m_id, "sid": sid})

            await db.commit()
            count += 1
            if count % 10 == 0:
                logger.info(f"Progress: {count}/{len(matches)} matches processed.")

        logger.info(f"Successfully reprocessed {count} matches.")
        
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(reprocess_all())
