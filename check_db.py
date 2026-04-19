import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def check_columns():
    async with AsyncSessionLocal() as db:
        try:
            # Check tracker_matches table
            result = await db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'tracker' AND table_name = 'tracker_matches'"))
            columns = [row[0] for row in result.fetchall()]
            print(f"Columns in tracker.tracker_matches: {columns}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_columns())
