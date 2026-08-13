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
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS calls (
                id TEXT PRIMARY KEY,
                caller_id TEXT,
                caller_name TEXT,
                status TEXT,
                duration_seconds INTEGER,
                created_at TEXT,
                notes TEXT,
                channel TEXT DEFAULT 'browser',
                language TEXT DEFAULT 'English',
                triage_level TEXT DEFAULT 'Routine',
                agent_latency_ms INTEGER DEFAULT 850,
                failure_reason TEXT DEFAULT NULL
            )
        """)
        conn.commit()

        # Check existing columns to add missing ones if upgrading
        cursor.execute("PRAGMA table_info(calls)")
        existing_cols = [col[1] for col in cursor.fetchall()]
        if 'channel' not in existing_cols:
            cursor.execute("ALTER TABLE calls ADD COLUMN channel TEXT DEFAULT 'browser'")
        if 'language' not in existing_cols:
            cursor.execute("ALTER TABLE calls ADD COLUMN language TEXT DEFAULT 'English'")
        if 'triage_level' not in existing_cols:
            cursor.execute("ALTER TABLE calls ADD COLUMN triage_level TEXT DEFAULT 'Routine'")
        if 'agent_latency_ms' not in existing_cols:
            cursor.execute("ALTER TABLE calls ADD COLUMN agent_latency_ms INTEGER DEFAULT 850")
        if 'failure_reason' not in existing_cols:
            cursor.execute("ALTER TABLE calls ADD COLUMN failure_reason TEXT DEFAULT NULL")
        conn.commit()

        # Seed initial sample calls if table is empty
        cursor.execute("SELECT COUNT(*) FROM calls")
        if cursor.fetchone()[0] == 0:
            sample_calls = [
                ("CALL-1001", "sip:rashu@sip.linphone.org", "Rashu", "successful", 145, datetime.now(timezone.utc).isoformat(), "Medication reminder confirmed", "sip", "English", "Routine", 780, None),
                ("CALL-1002", "sip:john@sip.linphone.org", "John Doe", "successful", 98, datetime.now(timezone.utc).isoformat(), "General wellness inquiry answered", "browser", "Hindi", "Routine", 820, None),
                ("CALL-1003", "sip:priya@sip.linphone.org", "Priya Sharma", "failed", 12, datetime.now(timezone.utc).isoformat(), "Call disconnected unexpectedly", "browser", "Telugu", "Urgent", 910, "Incomplete Task"),
                ("CALL-1004", "sip:rashu@sip.linphone.org", "Rashu", "successful", 210, datetime.now(timezone.utc).isoformat(), "Triage symptom check completed", "sip", "English", "Emergency", 750, None),
                ("CALL-1005", "sip:alex@sip.linphone.org", "Alex Smith", "failed", 5, datetime.now(timezone.utc).isoformat(), "Network connection timeout", "browser", "English", "Routine", 1200, "Incomplete Task"),
            ]
            cursor.executemany("""
                INSERT INTO calls (id, caller_id, caller_name, status, duration_seconds, created_at, notes, channel, language, triage_level, agent_latency_ms, failure_reason)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, sample_calls)
            conn.commit()
            logger.info("Seeded initial call records into database.")

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

def sync_calls_to_json():
    try:
        calls = get_recent_calls(100)
        with open(os.path.join(BACKEND_DIR, "calls.json"), "w", encoding="utf-8") as f:
            json.dump(calls, f, indent=2)
    except Exception as e:
        logger.error(f"Error syncing calls to JSON: {e}")

def record_call(
    call_id: str,
    caller_id: str,
    caller_name: str,
    status: str,
    duration_seconds: int = 0,
    notes: str = "",
    channel: str = "browser",
    language: str = "English",
    triage_level: str = "Routine",
    agent_latency_ms: int = 850,
    failure_reason: str = None
):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        from datetime import timezone
        created_at = datetime.now(timezone.utc).isoformat()
        if status == "failed" and not failure_reason:
            failure_reason = "Incomplete Task"
        cursor.execute("""
            INSERT INTO calls (id, caller_id, caller_name, status, duration_seconds, created_at, notes, channel, language, triage_level, agent_latency_ms, failure_reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (call_id, caller_id, caller_name, status, duration_seconds, created_at, notes, channel, language, triage_level, agent_latency_ms, failure_reason))
        conn.commit()
        conn.close()
        logger.info(f"Recorded call {call_id} with status {status}")
        sync_calls_to_json()
        return True
    except Exception as e:
        logger.error(f"Error recording call: {e}")
        return False

def get_call_stats():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM calls")
        total_calls = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT COUNT(*) FROM calls WHERE status = 'successful'")
        successful_calls = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT COUNT(*) FROM calls WHERE status = 'failed'")
        failed_calls = cursor.fetchone()[0] or 0

        cursor.execute("SELECT AVG(agent_latency_ms) FROM calls")
        avg_latency = round((cursor.fetchone()[0] or 850) / 1000.0, 2)
        
        # Channel breakdown
        cursor.execute("SELECT COUNT(*) FROM calls WHERE LOWER(channel) = 'browser'")
        browser_calls = cursor.fetchone()[0] or 0
        cursor.execute("SELECT COUNT(*) FROM calls WHERE LOWER(channel) = 'sip'")
        sip_calls = cursor.fetchone()[0] or 0

        # Failure categories breakdown
        cursor.execute("SELECT COUNT(*) FROM calls WHERE failure_reason = 'User Declined'")
        user_declined = cursor.fetchone()[0] or 0
        cursor.execute("SELECT COUNT(*) FROM calls WHERE failure_reason = 'Incomplete Task' OR failure_reason IS NULL AND status = 'failed'")
        incomplete_task = cursor.fetchone()[0] or 0
        cursor.execute("SELECT COUNT(*) FROM calls WHERE failure_reason = 'Technical Error'")
        technical_error = cursor.fetchone()[0] or 0
        cursor.execute("SELECT COUNT(*) FROM calls WHERE failure_reason = 'Escalation Timeout'")
        escalation_timeout = cursor.fetchone()[0] or 0

        conn.close()
        
        success_rate = round((successful_calls / total_calls * 100), 1) if total_calls > 0 else 0.0
        
        return {
            "total_calls": total_calls,
            "successful_calls": successful_calls,
            "failed_calls": failed_calls,
            "success_rate": success_rate,
            "avg_latency": avg_latency,
            "channel_breakdown": {
                "browser": browser_calls,
                "sip": sip_calls
            },
            "failure_categories": {
                "user_declined": user_declined,
                "incomplete_task": incomplete_task,
                "technical_error": technical_error,
                "escalation_timeout": escalation_timeout
            }
        }
    except Exception as e:
        logger.error(f"Error fetching call stats: {e}")
        return {
            "total_calls": 0,
            "successful_calls": 0,
            "failed_calls": 0,
            "success_rate": 0.0,
            "avg_latency": 0.85,
            "channel_breakdown": { "browser": 0, "sip": 0 },
            "failure_categories": { "user_declined": 0, "incomplete_task": 0, "technical_error": 0, "escalation_timeout": 0 }
        }

def get_recent_calls(limit: int = 50):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, caller_id, caller_name, status, duration_seconds, created_at, notes, channel, language, triage_level, agent_latency_ms, failure_reason
            FROM calls
            ORDER BY datetime(created_at) DESC
            LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        conn.close()
        return [{
            "id": r[0],
            "caller_id": r[1],
            "caller_name": r[2],
            "status": r[3],
            "duration_seconds": r[4],
            "created_at": r[5],
            "notes": r[6],
            "channel": r[7] or "browser",
            "language": r[8] or "English",
            "triage_level": r[9] or "Routine",
            "agent_latency_ms": r[10] or 850,
            "failure_reason": r[11]
        } for r in rows]
    except Exception as e:
        logger.error(f"Error fetching recent calls: {e}")
        return []


