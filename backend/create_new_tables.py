import asyncio
from app.core.config import settings
from sqlalchemy.ext.asyncio import create_async_engine
from app.db.session import Base
# Import models to ensure they are registered with Base
from app.models.tracker import Player, Match, MatchPlayer, Round, KillEvent, DamageEvent, GrenadeEvent, WeaponStat, ClutchEvent

clean_url = settings.DATABASE_URL.split('?')[0].replace("postgresql://", "postgresql+asyncpg://")
engine = create_async_engine(clean_url)

async def create_tables():
    print("Creating tables...")
    async with engine.begin() as conn:
        # This will only create tables that don't exist
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")

if __name__ == "__main__":
    asyncio.run(create_tables())
