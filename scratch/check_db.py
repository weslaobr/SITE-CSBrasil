import sys
import os

# Adiciona o diretório da ferramenta ao path
sys.path.append(os.path.join(os.getcwd(), 'tools', 'cs2-demo-processor'))

from db_connector import _get_connection

def check_db():
    try:
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute('SELECT id, "createdAt", "matchDate" FROM "GlobalMatch" ORDER BY "matchDate" DESC LIMIT 5')
        rows = cur.fetchall()
        for row in rows:
            print(f"ID: {row[0]} | CreatedAt: {row[1]} | MatchDate: {row[2]}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_db()
