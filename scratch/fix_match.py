import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://csbrasil:%40Nenezinho1995@csbrasil.postgres.uhserver.com:5432/csbrasil"

async def fix_match(match_id):
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        # 1. Swap scores in GlobalMatch
        q = text("UPDATE public.\"GlobalMatch\" SET \"scoreA\" = \"scoreB\", \"scoreB\" = \"scoreA\" WHERE id = :id")
        await conn.execute(q, {"id": match_id})
        print("Swapped scores in GlobalMatch.")

        # 2. Flip matchResult in GlobalMatchPlayer
        q = text("""
            UPDATE public.\"GlobalMatchPlayer\" 
            SET \"matchResult\" = CASE 
                WHEN \"matchResult\" = 'win' THEN 'loss' 
                WHEN \"matchResult\" = 'loss' THEN 'win' 
                ELSE \"matchResult\" 
            END 
            WHERE \"globalMatchId\" = :id
        """)
        await conn.execute(q, {"id": match_id})
        print("Flipped match results for all players.")

        # 3. Fix the 'Unknown' team for players if any
        # Let's see if we can deduce the team.
        # But for now, let's just make sure [1st] WESLAO is 'T' if they were Unknown
        q = text("""
            UPDATE public.\"GlobalMatchPlayer\" 
            SET team = 'T' 
            WHERE \"globalMatchId\" = :id AND team = 'Unknown'
        """)
        await conn.execute(q, {"id": match_id})
        print("Updated 'Unknown' team to 'T'.")

if __name__ == "__main__":
    match_id = "demo_f287ea4c78c2dae6827bd460"
    asyncio.run(fix_match(match_id))
