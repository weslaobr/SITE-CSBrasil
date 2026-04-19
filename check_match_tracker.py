import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def check_match_id():
    async with AsyncSessionLocal() as db:
        match_id = '7e9536ca-9c1a-48bf-8751-f412fe423925'
        result = await db.execute(text(f"SELECT match_id, demo_url, source FROM tracker.tracker_matches WHERE match_id = '{match_id}'"))
        row = result.fetchone()
        if row:
            print(f"Match found in Tracker: ID={row[0]}, URL={row[1]}, SOURCE={row[2]}")
        else:
            print(f"Match {match_id} not found in tracker_matches")

if __name__ == "__main__":
    asyncio.run(check_match_id())
