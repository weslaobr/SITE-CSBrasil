import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://csbrasil:%40Nenezinho1995@csbrasil.postgres.uhserver.com:5432/csbrasil"

async def check_match(match_id):
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        # Search for user
        q = text("SELECT id, name, \"steamId\" FROM public.\"User\" WHERE name ILIKE '%weslao%'")
        result = await conn.execute(q)
        rows = result.fetchall()
        for r in rows:
            print(f"User: {r[1]} | ID: {r[0]} | SteamID: {r[2]}")
        return

        # Check players in GlobalMatchPlayer
        q = text("SELECT * FROM public.\"GlobalMatchPlayer\" WHERE \"globalMatchId\" = :id")
        result = await conn.execute(q, {"id": match_id})
        players = result.fetchall()

        print("\n=== Players in GlobalMatchPlayer ===")
        for p in players:
            p_dict = p._asdict()
            # Try to get player name from User table if possible
            p_name_query = text("SELECT name FROM public.\"User\" WHERE \"id\" = :userid")
            name_result = await conn.execute(p_name_query, {"userid": p_dict['userId']})
            name_row = name_result.fetchone()
            name = name_row[0] if name_row else "Unknown"
            
            print(f"Team: {p_dict['team']} | Name: {name} | K: {p_dict['kills']} | D: {p_dict['deaths']} | Result: {p_dict['matchResult']}")
        return
        
        # Also check all tables again but with ILIKE for the ID
        tables_query = text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name ILIKE '%match%'")
        result = await conn.execute(tables_query)
        tables = [row[0] for row in result.fetchall()]
        
        print("\n=== Searching for substring of ID in all match tables ===")
        short_id = match_id.replace("demo_", "")
        for table in tables:
            try:
                # Try all columns in the table to see if any contain the ID
                cols_q = text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'")
                cols_res = await conn.execute(cols_q)
                cols = [c[0] for c in cols_res.fetchall()]
                
                for col in cols:
                    try:
                        q = text(f"SELECT COUNT(*) FROM public.\"{table}\" WHERE CAST(\"{col}\" AS TEXT) ILIKE :id")
                        res = await conn.execute(q, {"id": f"%{short_id}%"})
                        count = res.scalar()
                        if count > 0:
                            print(f"Found match in {table}.{col}")
                    except: pass
            except: pass
        return

        for table in tables:
            # Check if match_id exists in this table
            # Some tables use 'id', some use 'match_id', some use 'externalId'
            try:
                # Try 'id'
                q = text(f"SELECT COUNT(*) FROM public.\"{table}\" WHERE id = :id")
                res = await conn.execute(q, {"id": match_id})
                count = res.scalar()
                if count > 0:
                    print(f"Found in {table} by 'id'")
                    continue
            except: pass

            try:
                # Try 'match_id'
                q = text(f"SELECT COUNT(*) FROM public.\"{table}\" WHERE match_id = :id")
                res = await conn.execute(q, {"id": match_id})
                count = res.scalar()
                if count > 0:
                    print(f"Found in {table} by 'match_id'")
                    continue
            except: pass

            try:
                # Try 'externalId'
                q = text(f"SELECT COUNT(*) FROM public.\"{table}\" WHERE \"externalId\" = :id")
                res = await conn.execute(q, {"id": match_id})
                count = res.scalar()
                if count > 0:
                    print(f"Found in {table} by 'externalId'")
                    continue
            except: pass
        return

        print("\n=== Match Info ===")
        # match_row is a row object, we can convert to dict for better display
        match_dict = match_row._asdict()
        for k, v in match_dict.items():
            print(f"{k}: {v}")

        # Check players
        players_query = text("SELECT * FROM public.tracker_match_players WHERE match_id = :match_id")
        result = await conn.execute(players_query, {"match_id": match_id})
        players = result.fetchall()

        print("\n=== Players ===")
        for p in players:
            p_dict = p._asdict()
            # Try to get player name if possible
            p_name_query = text("SELECT personaname FROM public.tracker_players WHERE steamid64 = :steamid64")

        print("\n=== Match Info ===")
        # match_row is a row object, we can convert to dict for better display
        match_dict = match_row._asdict()
        for k, v in match_dict.items():
            print(f"{k}: {v}")

        # Check players
        players_query = text("SELECT * FROM tracker.tracker_match_players WHERE match_id = :match_id")
        result = await conn.execute(players_query, {"match_id": match_id})
        players = result.fetchall()

        print("\n=== Players ===")
        for p in players:
            p_dict = p._asdict()
            # Try to get player name if possible
            p_name_query = text("SELECT personaname FROM tracker.tracker_players WHERE steamid64 = :steamid64")
            name_result = await conn.execute(p_name_query, {"steamid64": p_dict['steamid64']})
            name_row = name_result.fetchone()
            name = name_row[0] if name_row else "Unknown"
            
            print(f"Team: {p_dict['team']} | Name: {name} | K: {p_dict['kills']} | D: {p_dict['deaths']} | SteamID: {p_dict['steamid64']}")

if __name__ == "__main__":
    match_id = "demo_f287ea4c78c2dae6827bd460"
    asyncio.run(check_match(match_id))
