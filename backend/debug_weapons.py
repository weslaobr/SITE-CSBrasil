import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text('SELECT count(*) FROM public.tracker_weapon_stats'))
        w_count = res.scalar()
        print(f'Weapon stats count: {w_count}')
        
        res = await db.execute(text('SELECT count(*) FROM public.tracker_match_players WHERE avg_ttd > 0 OR avg_kill_distance > 0'))
        p_count = res.scalar()
        print(f'Match players with advanced stats: {p_count}')

        if w_count > 0:
            res = await db.execute(text('SELECT * FROM public.tracker_weapon_stats LIMIT 5'))
            print("Sample weapon rows:", res.all())

if __name__ == "__main__":
    asyncio.run(check())
