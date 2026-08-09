import json
import logging
import sqlite3
from datetime import datetime

logger = logging.getLogger("agent.database")

DB_PATH = "caller_data.db"

def init_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS callers (
                user_id TEXT PRIMARY KEY,
                name TEXT,
                language_preference TEXT,
                facts TEXT,
                last_interaction TEXT
            )
        """)
        conn.commit()
        conn.close()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")

def get_caller(user_id: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT name, language_preference, facts, last_interaction FROM callers WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return {
                "user_id": user_id,
                "name": row[0],
                "language_preference": row[1],
                "facts": json.loads(row[2]) if row[2] else {},
                "last_interaction": row[3]
            }
    except Exception as e:
        logger.error(f"Error reading from database: {e}")
    return None

def save_caller(user_id: str, name: str, language_preference: str, facts: dict):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        facts_json = json.dumps(facts)
        from datetime import timezone
        last_interaction = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            INSERT INTO callers (user_id, name, language_preference, facts, last_interaction)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                name=excluded.name,
                language_preference=excluded.language_preference,
                facts=excluded.facts,
                last_interaction=excluded.last_interaction
        """, (user_id, name, language_preference, facts_json, last_interaction))
        conn.commit()
        conn.close()
        logger.info(f"Saved caller {user_id} - Name: {name}")
        return True
    except Exception as e:
        logger.error(f"Error saving to database: {e}")
        return False
