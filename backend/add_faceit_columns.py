import os
import asyncio
import asyncpg
from dotenv import load_dotenv

root_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(root_path, '.env'))

db_url = os.getenv('DATABASE_URL')

async def add_columns():
    try:
        conn = await asyncpg.connect(db_url)
        print("Connected to database.")
        
        # Check if columns exist
        cols = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND table_schema = 'public'")
        existing_cols = [c['column_name'] for c in cols]
        
        if 'faceitLevel' not in existing_cols:
            print("Adding faceitLevel...")
            await conn.execute('ALTER TABLE public."User" ADD COLUMN "faceitLevel" INTEGER;')
        
        if 'faceitElo' not in existing_cols:
            print("Adding faceitElo...")
            await conn.execute('ALTER TABLE public."User" ADD COLUMN "faceitElo" INTEGER;')
            
        print("Done.")
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(add_columns())
