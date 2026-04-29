import asyncio
from sqlalchemy import text
from app.core.config import settings
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Strip query params like ?sslmode=disable for asyncpg
clean_url = settings.DATABASE_URL.split('?')[0].replace("postgresql://", "postgresql+asyncpg://")
engine = create_async_engine(clean_url)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def check_tables():
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            tables = [row[0] for row in result.all()]
            print("Tables in public schema:")
            for t in tables:
                print(f"- {t}")
            
            required = ["tracker_weapon_stats", "tracker_clutch_events"]
            missing = [t for t in required if t not in tables]
            if missing:
                print(f"Missing tables: {missing}")
            else:
                print("All required tables are present.")
        except Exception as e:
            print(f"Error checking tables: {e}")

if __name__ == "__main__":
    asyncio.run(check_tables())
