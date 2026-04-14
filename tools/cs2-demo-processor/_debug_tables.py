import db_connector

conn = db_connector._get_connection()
cur = conn.cursor()
cur.execute("""
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_type = 'BASE TABLE' 
    ORDER BY table_schema, table_name;
""")
rows = cur.fetchall()
for r in rows:
    print(r[0], '->', r[1])
cur.close()
conn.close()
