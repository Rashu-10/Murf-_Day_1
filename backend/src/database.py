import json
import logging
import sqlite3
from datetime import datetime

logger = logging.getLogger("agent.database")

import os

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BACKEND_DIR, "caller_data.db")
JSON_PATH = os.path.join(BACKEND_DIR, "escalations.json")

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
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS escalations (
                id TEXT PRIMARY KEY,
                caller_id TEXT,
                caller_name TEXT,
                symptoms TEXT,
                urgency TEXT,
                language TEXT,
                preferred_followup TEXT,
                what_agent_checked TEXT,
                created_at TEXT,
                status TEXT
            )
        """)
        conn.commit()
        conn.close()
        logger.info("Database initialized successfully.")
        # Ensure json syncs on startup as well
        sync_escalations_to_json()
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

def sync_escalations_to_json():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, caller_id, caller_name, symptoms, urgency, language, preferred_followup, what_agent_checked, created_at, status
            FROM escalations
            ORDER BY datetime(created_at) DESC
        """)
        rows = cursor.fetchall()
        conn.close()
        
        escalations = []
        for row in rows:
            escalations.append({
                "id": row[0],
                "caller_id": row[1],
                "caller_name": row[2],
                "symptoms": row[3],
                "urgency": row[4],
                "language": row[5],
                "preferred_followup": row[6],
                "what_agent_checked": row[7],
                "created_at": row[8],
                "status": row[9]
            })
            
        with open(JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(escalations, f, indent=2)
        logger.info(f"Synchronized {len(escalations)} escalations to JSON.")
        return True
    except Exception as e:
        logger.error(f"Error syncing escalations to JSON: {e}")
        return False

def create_escalation_in_db(esc_id: str, caller_id: str, caller_name: str, symptoms: str, urgency: str, language: str, preferred_followup: str, what_agent_checked: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        from datetime import timezone
        created_at = datetime.now(timezone.utc).isoformat()
        status = "open"
        cursor.execute("""
            INSERT INTO escalations (id, caller_id, caller_name, symptoms, urgency, language, preferred_followup, what_agent_checked, created_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (esc_id, caller_id, caller_name, symptoms, urgency, language, preferred_followup, what_agent_checked, created_at, status))
        conn.commit()
        conn.close()
        logger.info(f"Created escalation {esc_id} in DB.")
        sync_escalations_to_json()
        return True
    except Exception as e:
        logger.error(f"Error creating escalation in DB: {e}")
        return False

def get_all_escalations():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, caller_id, caller_name, symptoms, urgency, language, preferred_followup, what_agent_checked, created_at, status FROM escalations ORDER BY datetime(created_at) DESC")
        rows = cursor.fetchall()
        conn.close()
        return [{
            "id": r[0], "caller_id": r[1], "caller_name": r[2], "symptoms": r[3],
            "urgency": r[4], "language": r[5], "preferred_followup": r[6],
            "what_agent_checked": r[7], "created_at": r[8], "status": r[9]
        } for r in rows]
    except Exception as e:
        logger.error(f"Error getting escalations: {e}")
        return []

def update_escalation_status(esc_id: str, status: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE escalations SET status = ? WHERE id = ?", (status, esc_id))
        conn.commit()
        conn.close()
        logger.info(f"Updated escalation {esc_id} status to {status}.")
        sync_escalations_to_json()
        return True
    except Exception as e:
        logger.error(f"Error updating escalation status: {e}")
        return False

