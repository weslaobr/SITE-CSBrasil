import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def reset_ranking():
    database_url = os.getenv("DATABASE_URL")
    clean_url = database_url.split('?')[0].replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(clean_url)

    async with engine.begin() as conn:
        print("Resetting ranking defaults to Level 5 (500 Tropoints)...")
        
        # 1. Update column defaults
        await conn.execute(text("ALTER TABLE public.\"User\" ALTER COLUMN \"rankingPoints\" SET DEFAULT 500"))
        await conn.execute(text("ALTER TABLE public.\"User\" ALTER COLUMN \"mixLevel\" SET DEFAULT 5"))
        
        # 2. Reset existing users
        await conn.execute(text("UPDATE public.\"User\" SET \"rankingPoints\" = 500, \"mixLevel\" = 5"))
        
        print("Successfully reset all users to Level 5.")

if __name__ == "__main__":
    asyncio.run(reset_ranking())
