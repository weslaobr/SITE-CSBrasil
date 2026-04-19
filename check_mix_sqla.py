import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text
from app.models.tracker import Match

async def check_mix():
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        stmt = select(Match).where(Match.source == 'mix').limit(1)
        result = await db.execute(stmt)
        match = result.scalar_one_or_none()
        if match:
            print(f"Match ID: {match.match_id}")
            print(f"Source: {match.source}")
            print(f"Demo URL: {match.demo_url}")
        else:
            print("No mix match found in tracker_matches")

if __name__ == "__main__":
    asyncio.run(check_mix())
