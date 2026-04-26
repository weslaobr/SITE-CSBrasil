import asyncio
from sqlalchemy import select
from app.db.session import SessionLocal, AsyncSessionLocal
from app.models.tracker import MatchPlayer

async def main():
    async with AsyncSessionLocal() as session:
        stmt = select(MatchPlayer).limit(5)
        result = await session.execute(stmt)
        players = result.scalars().all()
        
        print("--- TRACKER MATCH PLAYERS ---")
        for p in players:
            print(f"Match: {p.match_id}, Steam: {p.steamid64}, KAST: {p.kast}, ADR: {p.adr}")

if __name__ == "__main__":
    asyncio.run(main())
