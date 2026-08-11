import asyncio
import os
import sys
import random
import json
import logging

from dotenv import load_dotenv
from livekit import api

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("outbound_trigger")

# Load environment variables
load_dotenv(".env.local")

# Add src folder to path to import database
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
import database

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

# Config from user request
SIP_TRUNK_ID = "ST_oZThuBbaG9LP"
SIP_CALL_TO = "rashu"

def prep_database():
    database.init_db()
    
    # Pre-populate user records for both full SIP address and short username
    # to ensure personalization works regardless of how identity is reported
    facts = {
        "ongoing_conditions": "asthma and dust allergy",
        "age_band": "adult",
        "last_triage_outcome": "None"
    }
    
    logger.info("Initializing caller database profiles for personalization...")
    database.save_caller("sip:rashu@sip.linphone.org", "Rashu", "English", facts)
    database.save_caller("rashu", "Rashu", "English", facts)
    logger.info("Database initialized successfully.")

async def make_call():
    if not LIVEKIT_URL or not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        logger.error("Error: LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET must be set in .env.local")
        sys.exit(1)
        
    prep_database()
    
    # Generate a unique room name starting with 'outbound_'
    room_name = f"outbound_med_reminder_{random.randint(10000, 99999)}"
    logger.info(f"Connecting to LiveKit at {LIVEKIT_URL}...")
    
    lk_api = api.LiveKitAPI(
        url=LIVEKIT_URL,
        api_key=LIVEKIT_API_KEY,
        api_secret=LIVEKIT_API_SECRET
    )
    
    logger.info(f"Dispatching agent 'my-agent' to room '{room_name}'...")
    try:
        dispatch = await lk_api.agent_dispatch.create_dispatch(
            api.CreateAgentDispatchRequest(
                agent_name="my-agent",
                room=room_name,
                metadata="outbound_medication_reminder"
            )
        )
        logger.info(f"Agent explicitly dispatched. Dispatch ID: {dispatch.id}")
    except Exception as e:
        logger.warning(f"Failed to explicitly dispatch agent: {e}")
        logger.warning("Continuing anyway, as local/Cloud rules might auto-dispatch when participant joins.")

    logger.info(f"Triggering SIP outbound call to {SIP_CALL_TO} via Trunk {SIP_TRUNK_ID}...")
    try:
        participant = await lk_api.sip.create_sip_participant(
            api.CreateSIPParticipantRequest(
                sip_trunk_id=SIP_TRUNK_ID,
                sip_call_to=SIP_CALL_TO,
                room_name=room_name,
                participant_identity="sip:rashu@sip.linphone.org",
                participant_name="Rashu",
                participant_metadata=json.dumps({"language": "English"})
            )
        )
        logger.info(f"SIP Call initiated successfully! Participant identity: {participant.participant_identity}")
        logger.info("Please watch your Linphone app for the incoming call!")
    except Exception as e:
        logger.error(f"Failed to place outbound call: {e}")
        
    await lk_api.aclose()

if __name__ == "__main__":
    asyncio.run(make_call())
