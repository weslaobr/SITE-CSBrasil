import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check():
    DATABASE_URL = "postgresql+asyncpg://csbrasil:%40Nenezinho1995@csbrasil.postgres.uhserver.com:5432/csbrasil"
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        try:
            m_count = await conn.scalar(text("SELECT count(*) FROM public.tracker_matches"))
            print(f"tracker_matches count: {m_count}")
        except Exception as e:
            print(f"tracker_matches error: {e}")
            
        try:
            res = await conn.execute(text('SELECT metadata FROM public."GlobalMatchPlayer" WHERE metadata IS NOT NULL LIMIT 5'))
            for row in res:
                if row[0]:
                    import json
                    try:
                        m_data = json.loads(row[0]) if isinstance(row[0], str) else row[0]
                        print(f"Metadata keys: {list(m_data.keys())}")
                        if 'leetify_rating' in m_data:
                            print(f"Leetify rating found: {m_data['leetify_rating']}")
                    except:
                        print("Error parsing metadata json")
        except Exception as e:
            print(f"Metadata sample error: {e}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
