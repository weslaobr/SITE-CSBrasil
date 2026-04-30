import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from dotenv import load_dotenv

load_dotenv()

async def test():
    url = os.getenv('DATABASE_URL')
    if 'postgresql://' in url: url = url.replace('postgresql://', 'postgresql+asyncpg://')
    if 'postgres://' in url: url = url.replace('postgres://', 'postgresql+asyncpg://')
    url = url.replace("?sslmode=require", "")
    engine = create_async_engine(url)
    async with AsyncSession(engine) as session:
        res = await session.execute(text('SELECT "globalMatchId", "steamId", "eloChange" FROM public."GlobalMatchPlayer" WHERE "eloChange" IS NULL LIMIT 5'))
        print("Null elo changes:", res.fetchall())
        
        res2 = await session.execute(text('SELECT "globalMatchId", "steamId", "eloChange" FROM public."GlobalMatchPlayer" WHERE "eloChange" IS NOT NULL LIMIT 5'))
        print("Not null elo changes:", res2.fetchall())
        
        # Test fetching a User
        res3 = await session.execute(text('SELECT id, "steamId", "rankingPoints" FROM public."User" LIMIT 5'))
        print("Users:", res3.fetchall())

if __name__ == "__main__":
    asyncio.run(test())
