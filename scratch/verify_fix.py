import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://csbrasil:%40Nenezinho1995@csbrasil.postgres.uhserver.com:5432/csbrasil"

async def verify(match_id):
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        q = text("SELECT \"scoreA\", \"scoreB\" FROM public.\"GlobalMatch\" WHERE id = :id")
        res = await conn.execute(q, {"id": match_id})
        match = res.fetchone()
        print(f"Match Score: {match[0]} - {match[1]}")

        q = text("SELECT team, \"matchResult\", kills, deaths FROM public.\"GlobalMatchPlayer\" WHERE \"globalMatchId\" = :id")
        res = await conn.execute(q, {"id": match_id})
        players = res.fetchall()
        for p in players:
            print(f"Team: {p[0]} | Result: {p[1]} | K/D: {p[2]}/{p[3]}")

if __name__ == "__main__":
    asyncio.run(verify("demo_f287ea4c78c2dae6827bd460"))
