import json
import logging
import math
from datetime import datetime, timezone
import aiohttp
import asyncio
import os

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    RunContext,
    UserStateChangedEvent,
    cli,
    function_tool,
    tokenize,
)
from livekit.plugins import deepgram, google, murf, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

import database

from pathlib import Path

logger = logging.getLogger("agent")

backend_dir = Path(__file__).parent.parent
load_dotenv(backend_dir / ".env.local", override=True)
load_dotenv(backend_dir / ".env", override=True)


# Helper functions for OSM geocoding and querying
headers = {"User-Agent": "MediBuddyHealthAccessAgent/1.0 (contact: support@medibuddy.ai)"}

LOCAL_FACILITIES = {
    "hyderabad": [
        {"name": "Urban Primary Health Centre, Gachibowli", "type": "UPHC", "address": "Gachibowli, near GPRA Qtrs, Hyderabad, Telangana", "distance_km": 1.2},
        {"name": "Urban Primary Health Centre, Madhapur", "type": "UPHC", "address": "Kavuri Hills, Madhapur, Hyderabad, Telangana", "distance_km": 2.5},
        {"name": "Kondapur Area Hospital", "type": "Hospital", "address": "Kondapur Main Road, Hyderabad, Telangana", "distance_km": 3.1}
    ],
    "bangalore": [
        {"name": "Urban Primary Health Centre, Indiranagar", "type": "UPHC", "address": "12th Main Rd, HAL 2nd Stage, Indiranagar, Bangalore, Karnataka", "distance_km": 0.8},
        {"name": "Urban Primary Health Centre, Domlur", "type": "UPHC", "address": "Domlur Layout, Bangalore, Karnataka", "distance_km": 1.9},
        {"name": "Sir C.V. Raman General Hospital", "type": "Hospital", "address": "Indiranagar, Bangalore, Karnataka", "distance_km": 2.2}
    ],
    "delhi": [
        {"name": "Urban Primary Health Centre, Saket", "type": "UPHC", "address": "J-Block, Saket, New Delhi", "distance_km": 1.5},
        {"name": "Max Super Speciality Hospital, Saket", "type": "Hospital", "address": "Press Enclave Road, Saket, New Delhi", "distance_km": 2.0},
        {"name": "Urban Primary Health Centre, Malviya Nagar", "type": "UPHC", "address": "Malviya Nagar, New Delhi", "distance_km": 2.8}
    ],
    "mumbai": [
        {"name": "Urban Health Centre, Bandra", "type": "UPHC", "address": "Bandra West, Mumbai, Maharashtra", "distance_km": 1.1},
        {"name": "Bhabha Hospital", "type": "Hospital", "address": "Belasis Road, Bandra West, Mumbai, Maharashtra", "distance_km": 1.8},
        {"name": "Urban Health Centre, Khar", "type": "UPHC", "address": "Khar West, Mumbai, Maharashtra", "distance_km": 2.5}
    ]
}

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def find_local_fallback(location_query: str):
    query_lower = location_query.lower()
    for key, facilities in LOCAL_FACILITIES.items():
        if key in query_lower:
            return facilities
    return LOCAL_FACILITIES["hyderabad"]

async def geocode_nominatim(location_query: str) -> tuple[float, float, str] | None:
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": location_query,
        "format": "json",
        "limit": 1
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, headers=headers, timeout=4.0) as response:
                if response.status == 200:
                    data = await response.json()
                    if data:
                        lat = float(data[0]["lat"])
                        lon = float(data[0]["lon"])
                        display_name = data[0]["display_name"]
                        return lat, lon, display_name
    except Exception as e:
        logger.warning(f"Nominatim geocoding failed/timed out: {e}")
    return None

async def query_overpass(lat: float, lon: float) -> list[dict] | None:
    url = "https://overpass-api.de/api/interpreter"
    overpass_query = f"""
    [out:json][timeout:5];
    (
      nwr["amenity"="hospital"](around:5000,{lat},{lon});
      nwr["amenity"="clinic"](around:5000,{lat},{lon});
      nwr["amenity"="doctors"](around:5000,{lat},{lon});
      nwr["healthcare"="centre"](around:5000,{lat},{lon});
      nwr["amenity"="health_post"](around:5000,{lat},{lon});
    );
    out tags center;
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, data={"data": overpass_query}, headers=headers, timeout=5.0) as response:
                if response.status == 200:
                    data = await response.json()
                    elements = data.get("elements", [])
                    facilities = []
                    for el in elements:
                        tags = el.get("tags", {})
                        name = tags.get("name", "Unnamed Facility")
                        amenity = tags.get("amenity", tags.get("healthcare", "Health Facility"))
                        addr_street = tags.get("addr:street", "")
                        addr_city = tags.get("addr:city", "")
                        address = f"{addr_street}, {addr_city}".strip(", ")
                        if not address:
                            address = "Details not in live record"
                        
                        el_lat = el.get("lat") or el.get("center", {}).get("lat")
                        el_lon = el.get("lon") or el.get("center", {}).get("lon")
                        
                        distance_km = 0.0
                        if el_lat is not None and el_lon is not None:
                            distance_km = calculate_distance(lat, lon, float(el_lat), float(el_lon))
                        
                        facilities.append({
                            "name": name,
                            "type": amenity,
                            "address": address,
                            "distance_km": round(distance_km, 2)
                        })
                    facilities.sort(key=lambda x: x["distance_km"])
                    return facilities[:3]
    except Exception as e:
        logger.warning(f"Overpass query failed/timed out: {e}")
    return None

def classify_triage(symptoms: str) -> dict:
    s_lower = symptoms.lower()
    
    red_keywords = [
        "chest pain", "chest pressure", "heart attack", "cardiac",
        "cannot breathe", "difficulty breathing", "shortness of breath",
        "breathless", "suffocat", "stroke", "face drooping", "numbness",
        "speech difficulty", "slurred speech", "unconscious", "fainted",
        "passed out", "heavy bleeding", "severe bleeding", "allergic reaction",
        "anaphylaxis", "poison"
    ]
    
    yellow_keywords = [
        "high fever", "102", "103", "104", "fever for days",
        "severe stomach", "abdominal pain", "stomach ache",
        "persistent vomiting", "vomit", "dehydrat", "deep cut",
        "stitches", "wheez", "breath difficulty"
    ]
    
    matched_red = [k for k in red_keywords if k in s_lower]
    matched_yellow = [k for k in yellow_keywords if k in s_lower]
    
    if matched_red:
        return {
            "triage_level": "Emergency",
            "color_code": "Red",
            "guidelines": "Seek immediate medical attention. Call emergency services like 108 or 112 immediately.",
            "matched_flags": matched_red
        }
    elif matched_yellow:
        return {
            "triage_level": "Urgent",
            "color_code": "Yellow",
            "guidelines": "Visit a clinic, primary health centre, or urgent care facility within 24 hours. Monitor symptoms closely, and if they worsen, seek emergency care.",
            "matched_flags": matched_yellow
        }
    else:
        return {
            "triage_level": "Non-Urgent / Routine",
            "color_code": "Green",
            "guidelines": "Get rest, drink plenty of fluids, and monitor symptoms. Visit a general physician if they persist.",
            "matched_flags": ["General/Minor Symptoms"]
        }


# Change this prompt to change what your voice agent does.
# See README.md for example prompts (customer support, language tutor, receptionist).
SYSTEM_PROMPT = """IDENTITY:
You are MediBuddy, a warm and empathetic health assistant built for the Health Access track. Your role is to help people get quick wellness information, healthy habits, nutrition tips, and general health info.

OBJECTIVES:
- Welcome the caller, state you are built for the Health Access track, and explain how you can help (wellness tips, symptom triage classification, and nearest facility lookups).
- Maintain safety by refusing diagnosis or prescriptions, and direct users to appropriate medical services if they show red-flag symptoms.

KNOWLEDGE LIMITS:
- You know general wellness, public health recommendations, exercise habits, nutrition, sleep hygiene, and general definitions of medical terms.
- You do NOT know the user's personal medical records, clinical schedules, or diagnostic tools.
- Never state any health fact without emphasizing that it is for informational purposes only.

GUARDRAILS:
- Hard Refusal 1: You must NEVER diagnose any disease, illness, or medical condition, even if the user asks you to or describes symptoms.
- Hard Refusal 2: You must NEVER prescribe, recommend, name, or suggest specific prescription drugs or medical treatments.
- Never-Claim: You must NEVER claim to be a doctor, nurse, or any licensed medical professional. Always state: "I am an AI, not a doctor."
- Escalation Script: If the user describes red-flag symptoms (such as chest pain, severe shortness of breath, sudden numbness, severe bleeding, or allergic reactions), immediately state: "Please seek immediate medical attention or call emergency services like 108 or 112. As an AI, I cannot assist with emergency or diagnostic situations." Refuse to continue giving advice.

LANGUAGE & MULTILINGUAL SUPPORT:
- Support Telugu, English, Telugu-English code-mixed (Tanglish), Hindi, and Hindi-English code-mixed (Hinglish).
- If the user speaks or writes in Telugu (or Tanglish), you MUST reply in Telugu (using native Telugu script) or Tanglish. Never reply in Hindi to a Telugu speaker.
- If the user speaks or writes in Hindi (or Hinglish), you MUST reply in Hindi (using native Devanagari script) or Hinglish. Never reply in Telugu to a Hindi speaker.
- Match the user's preferred language register, vocabulary, and code-mixing ratio precisely.
- Write the chat text output in native script (Telugu script for Telugu words, Devanagari script for Hindi words) so the chat history displays correctly in the UI.

FEW-SHOT EXAMPLES:
Example 1:
Agent: Hello! I'm MediBuddy, your Health Access voice assistant. How can I help you today?
User: Hi, నాకు fever ఉంది since yesterday.
Agent: మీకు జ్వరం ఉన్నందుకు బాధగా ఉంది. Please drink plenty of water and get enough rest. If the fever continues or gets worse, consult a doctor.
User: Which antibiotic should I take?
Agent: I'm sorry, but I cannot recommend prescription medicines. Please consult a qualified doctor for the right treatment.
User: Thank you.
Agent: You're welcome. Take care, and I wish you a speedy recovery.

STYLE:
- Keep all responses short, clear, and conversational for speech.
- Do NOT use bullet points, list formatting, bold formatting, brackets, or long sentences. Keep each turn under 15-20 words.
- Do not repeat yourself. Keep the tone helpful, warm, and professional."""


class Assistant(Agent):
    def __init__(self, instructions: str = SYSTEM_PROMPT) -> None:
        super().__init__(instructions=instructions)

    @function_tool
    async def lookup_caller(self, context: RunContext, user_id: str) -> str:
        """Use this tool to look up details about a caller in the database.
        
        Args:
            user_id: The unique ID of the caller.
        """
        logger.info(f"LLM called lookup_caller for user_id={user_id}")
        profile = database.get_caller(user_id)
        if profile:
            return json.dumps(profile)
        return "No profile found for this caller."

    @function_tool
    async def save_caller_info(self, context: RunContext, user_id: str, name: str, language_preference: str, facts: dict) -> str:
        """Use this tool to save or update details about a caller in the database.
        ONLY call this tool if the user has explicitly consented to saving their information during this conversation.
        
        Args:
            user_id: The unique ID of the caller.
            name: The caller's name.
            language_preference: The caller's preferred language (e.g. English, Telugu, Hindi).
            facts: A dictionary containing details about the caller. Must include 'age_band', 'ongoing_conditions', and 'last_triage_outcome'.
        """
        logger.info(f"LLM called save_caller_info for user_id={user_id}, name={name}")
        success = database.save_caller(user_id, name, language_preference, facts)
        if success:
            return "Caller profile saved successfully."
        return "Failed to save caller profile."

    @function_tool
    async def triage_symptoms(self, context: RunContext, symptoms: str) -> str:
        """Use this tool to classify symptoms into a triage urgency level (Red/Emergency, Yellow/Urgent, Green/Non-Urgent) and retrieve clinical guidance.
        
        Args:
            symptoms: A string describing the caller's symptoms in detail.
        """
        logger.info(f"LLM called triage_symptoms for symptoms: '{symptoms}'")
        res = classify_triage(symptoms)
        res["data_timestamp"] = "from clinical triage protocols updated as of August 2026"
        return json.dumps(res)

    @function_tool
    async def find_nearest_facility(self, context: RunContext, location_query: str) -> str:
        """Use this tool to search for the nearest healthcare facility (Primary Health Centre, hospital, clinic, or doctor) based on a location name in India.
        
        Args:
            location_query: The name of the city, neighborhood, or area in India to search (e.g. 'Gachibowli, Hyderabad' or 'Indiranagar, Bangalore').
        """
        logger.info(f"LLM called find_nearest_facility for location: '{location_query}'")
        coordinates = await geocode_nominatim(location_query)
        if coordinates is not None:
            lat, lon, display_name = coordinates
            facilities = await query_overpass(lat, lon)
            if facilities is not None and len(facilities) > 0:
                current_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
                return json.dumps({
                    "facilities": facilities,
                    "location_geocoded": display_name,
                    "data_source": "live OpenStreetMap API",
                    "data_timestamp": f"live accessed at {current_time}",
                    "status": "success"
                })
        
        fallback_data = find_local_fallback(location_query)
        return json.dumps({
            "facilities": fallback_data,
            "location_geocoded": f"{location_query} (fallback database mapping)",
            "data_source": "offline local database fallback",
            "data_timestamp": "from our local database last updated in August 2026",
            "status": "offline_fallback_used"
        })

    @function_tool
    async def create_escalation(
        self,
        context: RunContext,
        caller_name: str,
        symptoms: str,
        urgency: str,
        language: str,
        preferred_followup: str,
        what_agent_checked: str
    ) -> str:
        """Create a human help request (escalation) when the user describes emergency symptoms or requests human/doctor assistance.
        Before calling this tool, you MUST explicitly ask the caller for permission to share their name, symptoms, and urgency level with our medical team. Do NOT call this tool if they reject permission.
        
        Args:
            caller_name: The name of the caller.
            symptoms: A brief summary of the caller's symptoms or request details.
            urgency: Urgency level ('Low', 'Medium', 'High', or 'Emergency').
            language: The caller's language preference.
            preferred_followup: Caller's preferred follow-up contact method (e.g. 'Phone' or 'Email').
            what_agent_checked: Summary of what the agent already checked (e.g. 'Triage outcome: Red/Emergency, Location query: Saket').
        """
        logger.info(f"LLM called create_escalation for caller_name={caller_name}, urgency={urgency}")
        from livekit.agents import utils
        esc_id = f"esc-{utils.shortuuid()[:6].lower()}"
        
        caller_id = "unknown_caller"
        for p in context.room.remote_participants.values():
            caller_id = p.identity
            break
            
        success = database.create_escalation_in_db(
            esc_id=esc_id,
            caller_id=caller_id,
            caller_name=caller_name,
            symptoms=symptoms,
            urgency=urgency,
            language=language,
            preferred_followup=preferred_followup,
            what_agent_checked=what_agent_checked
        )
        
        if success:
            webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
            if webhook_url:
                try:
                    color_map = {
                        "emergency": 15158332,
                        "high": 15105536,
                        "medium": 15105536,
                        "low": 3066993
                    }
                    color = color_map.get(urgency.lower(), 3447003)
                    
                    payload = {
                        "embeds": [
                            {
                                "title": f"🚨 Human Escalation Requested ({esc_id})",
                                "color": color,
                                "fields": [
                                    {"name": "Who needs help", "value": f"**Name:** {caller_name}\n**ID:** {caller_id}", "inline": True},
                                    {"name": "Urgency Level", "value": f"**{urgency}**", "inline": True},
                                    {"name": "Language Preference", "value": language, "inline": True},
                                    {"name": "Preferred Follow-up", "value": preferred_followup, "inline": True},
                                    {"name": "What happened (Symptoms/Request)", "value": symptoms},
                                    {"name": "What agent checked", "value": what_agent_checked}
                                ],
                                "timestamp": datetime.now(timezone.utc).isoformat()
                            }
                        ]
                    }
                    
                    async with aiohttp.ClientSession() as session:
                        async with session.post(webhook_url, json=payload, timeout=5.0) as resp:
                            if resp.status in (200, 204):
                                logger.info("Discord webhook sent successfully.")
                            else:
                                logger.warning(f"Discord webhook failed with status {resp.status}")
                except Exception as e:
                    logger.error(f"Error sending Discord Webhook: {e}")
            
            return json.dumps({
                "status": "success",
                "reference_id": esc_id,
                "urgency": urgency,
                "message": "Escalation request created successfully."
            })
        
        return json.dumps({
            "status": "error",
            "message": "Failed to create escalation request in database."
        })

    @function_tool
    async def transfer_to_clinic_specialist(self, context: RunContext, reason: str = "") -> str:
        """Use this tool when the user requests to book, schedule, reschedule, or cancel a clinic or doctor appointment, check doctor availability, or inquire about clinic appointment slots.
        
        Args:
            reason: The user's request details or reason for needing the appointment specialist.
        """
        logger.info(f"Main agent handing off to Clinic & Appointment Specialist. Reason: '{reason}'")
        specialist = ClinicAppointmentSpecialist()
        # Set male voice (en-US-matthew) for specialist assistance
        if hasattr(context.session.tts, "_opts"):
            context.session.tts._opts.voice = "en-US-matthew"
        context.session.update_agent(specialist)
        return "Connected to Clinic & Appointment Specialist. The specialist is now active in the conversation with a male specialist voice."


SPECIALIST_SYSTEM_PROMPT = """IDENTITY:
You are the Clinic & Appointment Specialist for MediBuddy Health Access (a male specialist assistant). Your job is exclusively focused on helping users check doctor slot availability, schedule or book clinic consultations, and provide pre-visit guidelines.

OBJECTIVES:
- When starting or taking over a conversation, introduce yourself warmly: "Hello! I am the Clinic and Appointment Specialist. How can I help schedule or book your visit today?"
- Help the user check doctor schedules, available time slots, and book consultation appointments using your tools.
- Provide clear visit guidelines (e.g., bring photo ID proof, past medical records, and arrive 10 minutes early).
- If the user asks general wellness, symptom triage, or non-appointment questions, hand back to MediBuddy using `transfer_to_main_agent`.

LIMITS & GUARDRAILS:
- You handle appointment bookings, clinic schedules, doctor slot checks, and clinic visit guidelines.
- Do NOT perform symptom triage or provide medical treatment advice.
- Keep responses short, clear, and conversational for speech (15-20 words). No bullet points, markdown formatting, or numbered lists."""


class ClinicAppointmentSpecialist(Agent):
    def __init__(self, instructions: str = SPECIALIST_SYSTEM_PROMPT) -> None:
        super().__init__(instructions=instructions)

    @function_tool
    async def get_available_slots(
        self, context: RunContext, clinic_name: str = "Gachibowli Primary Health Centre", doctor_specialty: str = "General Physician"
    ) -> str:
        """Use this tool to check available doctor consultation time slots at a clinic.
        
        Args:
            clinic_name: Name of the clinic or hospital.
            doctor_specialty: Medical specialty requested (e.g. General Physician, Pediatrics).
        """
        logger.info(f"Specialist LLM called get_available_slots for clinic='{clinic_name}'")
        slots = [
            {"doctor": "Dr. Priya Sharma (General Physician)", "time": "10:00 AM Tomorrow", "status": "Available"},
            {"doctor": "Dr. Rajesh Kumar (General Physician)", "time": "02:30 PM Tomorrow", "status": "Available"},
            {"doctor": "Dr. Ananya Reddy (Pediatrics)", "time": "04:30 PM Tomorrow", "status": "Available"}
        ]
        return json.dumps({
            "clinic": clinic_name,
            "specialty": doctor_specialty,
            "available_slots": slots,
            "instructions": "Offer these available time slots to the caller."
        })

    @function_tool
    async def book_appointment(
        self,
        context: RunContext,
        patient_name: str,
        clinic_name: str,
        doctor_name: str,
        slot_time: str,
        reason_for_visit: str = "General Consultation"
    ) -> str:
        """Use this tool to confirm and book a doctor appointment for the patient.
        
        Args:
            patient_name: Name of the patient.
            clinic_name: Name of the clinic or health facility.
            doctor_name: Name of the selected doctor.
            slot_time: Chosen appointment time slot (e.g. '10:00 AM Tomorrow').
            reason_for_visit: Brief reason for the appointment visit.
        """
        from livekit.agents import utils
        apt_id = f"APT-{utils.shortuuid()[:6].upper()}"
        logger.info(f"Specialist LLM booked appointment {apt_id} for patient={patient_name}")
        return json.dumps({
            "status": "confirmed",
            "appointment_id": apt_id,
            "patient_name": patient_name,
            "doctor": doctor_name,
            "clinic": clinic_name,
            "slot_time": slot_time,
            "visit_guidelines": "Please arrive 10 minutes early with a valid ID proof and past medical records."
        })

    @function_tool
    async def transfer_to_main_agent(self, context: RunContext, reason: str = "") -> str:
        """Use this tool to hand the conversation back to the main MediBuddy assistant if the caller asks general wellness, symptom triage, or non-appointment questions.
        
        Args:
            reason: Reason for handing back to main agent.
        """
        logger.info(f"Specialist handing back to main agent. Reason: '{reason}'")
        main_agent = Assistant()
        # Restore main agent female voice (Anisha)
        if hasattr(context.session.tts, "_opts"):
            context.session.tts._opts.voice = "Anisha"
        context.session.update_agent(main_agent)
        return "Handed back to main MediBuddy health assistant."


server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()
    database.init_db()


server.setup_fnc = prewarm


import asyncio
from typing import Any

from livekit.agents import llm, utils


class MockLLMStream(llm.LLMStream):
    def __init__(self, llm: llm.LLM, chat_ctx: llm.ChatContext, conn_options: Any):
        super().__init__(
            llm,
            chat_ctx=chat_ctx,
            tools=[],
            conn_options=conn_options
        )

    async def _run(self) -> None:
        last_msg = ""
        for msg in reversed(self._chat_ctx.messages()):
            if msg.role == "user":
                last_msg = msg.text_content or ""
                break

        user_text = last_msg.lower().strip()
        if "what track" in user_text or "track" in user_text:
            response = "I am built for the Health Access track. My goal is to help people get quick healthcare information."
        elif "thank" in user_text or "thanks" in user_text:
            response = "You're welcome. Have a healthy day!"
        else:
            response = "Hello! I'm MediBuddy AI. How can I help you today?"

        request_id = utils.shortuuid()
        words = response.split(" ")
        for i, word in enumerate(words):
            space = " " if i > 0 else ""
            chunk = llm.ChatChunk(
                id=request_id,
                delta=llm.ChoiceDelta(
                    role="assistant",
                    content=space + word
                )
            )
            self._event_ch.send_nowait(chunk)
            await asyncio.sleep(0.05)

class MockLLM(llm.LLM):
    def __init__(self):
        super().__init__()

    @property
    def model(self) -> str:
        return "mock-gemini"

    @property
    def provider(self) -> str:
        return "mock"

    def chat(
        self,
        *,
        chat_ctx: llm.ChatContext,
        tools: list[llm.Tool] | None = None,
        conn_options: Any = None,
        parallel_tool_calls: Any = None,
        tool_choice: Any = None,
        extra_kwargs: Any = None,
    ) -> llm.LLMStream:
        return MockLLMStream(self, chat_ctx, conn_options)


SYSTEM_PROMPT_TEMPLATE = """IDENTITY:
You are MediBuddy, a warm and empathetic health assistant built for the Health Access track. Your role is to help people get quick wellness information, healthy habits, nutrition tips, and general health info.

LANGUAGE REQUIREMENT:
The user has selected the language: {language}.
You MUST conduct the entire conversation and reply ONLY in {language}.
Do NOT use other languages. Write the text outputs in the native script of {language} (e.g. Devanagari script for Hindi, Telugu script for Telugu, Bengali script for Bengali, etc. - except for English where you write in English).

LANGUAGE & SCRIPT:
Always write every language in its own native script.
- Hindi → Devanagari (नमस्ते), never romanized (never "namaste").
- Telugu → Telugu script (నమసాకారం/నమస్తే), never romanized (never "namaskaram" or "namaste").
- Same rule for all non-English languages.

OBJECTIVES:
- Welcome the caller, state you are built for the Health Access track, and explain how you can help (wellness tips, symptom triage classification, and nearest facility lookups).
- Maintain safety by refusing diagnosis or prescriptions, and direct users to appropriate medical services if they show red-flag symptoms.

KNOWLEDGE LIMITS:
- You know general wellness, public health recommendations, exercise habits, nutrition, sleep hygiene, and general definitions of medical terms.
- Never state any health fact without emphasizing that it is for informational purposes only.

GUARDRAILS:
- Hard Refusal 1: You must NEVER diagnose any disease, illness, or medical condition, even if the user asks you to or describes symptoms.
- Hard Refusal 2: You must NEVER prescribe, recommend, name, or suggest specific prescription drugs or medical treatments.
- Never-Claim: You must NEVER claim to be a doctor, nurse, or any licensed medical professional. Always state: "I am an AI, not a doctor."
- Escalation Script: If the user describes red-flag symptoms (such as chest pain, severe shortness of breath, sudden numbness, severe bleeding, or allergic reactions), immediately state (in {language}): "If this is a life-threatening emergency, please visit the nearest hospital or call 108 or 112 immediately." Then follow the HUMAN ESCALATION PROTOCOL to ask for permission and escalate.
- Unrelated/Harmful Request Refusal: If the user asks for help with inappropriate, harmful, or unrelated activities (like hacking, programming advice, or non-health topics), you must explicitly and politely refuse to assist with that request, stating that you cannot help with it, and remind them that you can only help with wellness and health-related topics.

HUMAN ESCALATION PROTOCOL:
- You MUST escalate to a human support agent or doctor in these two scenarios:
  1. The caller describes red-flag/emergency symptoms (e.g., chest pain, difficulty breathing, severe bleeding, numbness, allergic reactions).
  2. The caller explicitly requests to talk to a human, doctor, or medical team.
- PROTOCOL STEPS:
  1. **Ask for Permission:** You MUST ask: "I would like to escalate this to our medical support team. May I share your details with them?"
  2. **If Permission Granted (Yes):**
     - Ask: "Should we contact you by phone or email?"
     - Determine urgency level: "Emergency" (for red-flag symptoms), "High", "Medium", or "Low" (for simple human agent request).
     - Invoke the `create_escalation` tool.
     - Once you receive the reference ID, say: "Thank you. Your reference ID is {{reference_id}}. Our team will contact you. For immediate emergencies, call 108 or 112."
  3. **If Permission Denied (No):**
     - Do NOT call `create_escalation`. Say: "Understood. I will not share any details. What else can I help you with?"

CALLER ID & RECORD RETRIEVAL:
- The current caller's ID is: {user_id}
- During your initial greeting (before the user has spoken), do NOT call any tools. Just introduce yourself as MediBuddy and ask how you can help.
- As soon as the user speaks their first message, you MUST call the `lookup_caller` tool with this ID to check if they have a saved profile.
- If the tool returns a profile, you MUST welcome them back warmly by name, reference their last interaction and facts (like ongoing conditions), and ask how they are doing (e.g., "Namaste Ramesh, last time we spoke about your diabetes and recommended rest. Did the rest help?").
- If the tool returns "No profile found", greet them warmly, state that you are built for the Health Access track, and explain how you can help. During the call, ask for their name and other health details.

CONSENT & RECORD SAVING:
- You MUST ask the caller for explicit consent before saving or updating any of their information (e.g., "Would you like me to remember your name, age, and conditions for your next visit?").
- ONLY if the user says YES, call the `save_caller_info` tool to save their details (name, language, and facts: age_band, ongoing_conditions, and last_triage_outcome).
- If the user says NO, do NOT call `save_caller_info`, and explicitly confirm to the user that you will not save their data.
- NEVER save any detailed or written-out medical notes. You are only allowed to save:
  * name
  * language preference
  * facts: age_band (e.g. child, adult, senior), ongoing_conditions, and last_triage_outcome.

SYMPTOM TRIAGE CLASSIFICATION:
- If the user describes any medical symptoms or asks about symptom classification, you MUST immediately call the `triage_symptoms` tool.
- Report the triage urgency level and the clinical guidance returned by the tool.
- You MUST state that the triage guidelines are "from our clinical triage guidelines database updated in August 2026". E.g., "Based on our clinical guidelines from August 2026, this is classified as..."

NEAREST HEALTH FACILITY LOOKUP:
- If the user asks for nearest doctors, clinics, primary health centres, or hospitals, you MUST ask for their location if not known, and call the `find_nearest_facility` tool with their location.
- Present the name, type, and address of the closest facility first. Keep it very conversational.
- You MUST explicitly state the data source and when it is from:
  * If live OpenStreetMap was used successfully: say "According to the live OpenStreetMap database accessed just now, the closest facility is..."
  * If offline fallback database was used: say "Due to a network connection issue, using our offline local database last updated in August 2026, the closest facility is..."

SPECIALIST HANDOFF PROTOCOL:
- If the user asks to book, schedule, reschedule, or cancel a clinic or doctor appointment, check doctor availability, or inquire about clinic appointment slots:
  1. Say: "I will connect you to our clinic and appointment specialist."
  2. Immediately call the `transfer_to_clinic_specialist` tool. Do NOT attempt to book appointments yourself.

STYLE:
- Keep all responses short, clear, and conversational for speech.
- Do NOT use bullet points, list formatting, bold formatting, brackets, or long sentences. Keep each turn under 15-20 words.
- Do not repeat yourself. Keep the tone helpful, warm, and professional."""


OUTBOUND_SYSTEM_PROMPT_TEMPLATE = """IDENTITY:
You are MediBuddy, a warm and empathetic health assistant calling from the Health Access team.

OBJECTIVES:
- Welcome the caller and state who is calling, the purpose of the call, and how to make it stop in the first two sentences.
  Your very first sentence MUST be: "Hello {caller_name}, this is MediBuddy calling with your vaccination and medication reminder."
  Your second sentence MUST be: "You can ask me to stop at any time or simply hang up to opt out of these calls."
- Ask them how they are doing and if they have taken their prescribed medication today (specifically for {conditions}).
- Maintain safety by refusing diagnosis or prescriptions, and direct users to appropriate medical services if they show red-flag symptoms.

GUARDRAILS:
- Hard Refusal 1: You must NEVER diagnose any disease, illness, or medical condition, even if the user asks you to or describes symptoms.
- Hard Refusal 2: You must NEVER prescribe, recommend, name, or suggest specific prescription drugs or medical treatments.
- Never-Claim: You must NEVER claim to be a doctor, nurse, or any licensed medical professional. Always state: "I am an AI, not a doctor."
- Escalation Script: If the user describes red-flag symptoms (such as chest pain, severe shortness of breath, sudden numbness, severe bleeding, or allergic reactions), immediately state: "Please seek immediate medical attention or call emergency services like 108 or 112. As an AI, I cannot assist with emergency or diagnostic situations." Refuse to continue giving advice.

STYLE:
- Keep all responses short, clear, and conversational for speech.
- Do NOT use bullet points, list formatting, bold formatting, brackets, or long sentences. Keep each turn under 15-20 words.
- Do not repeat yourself. Keep the tone helpful, warm, and professional."""


@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: JobContext):
    # Logging setup
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Join the room first to check participant metadata
    await ctx.connect()

    # Determine user's selected language and identity
    selected_language = "English"
    participant_identity = "default_user"
    for p in ctx.room.remote_participants.values():
        participant_identity = p.identity
        if p.metadata:
            try:
                import json
                meta = json.loads(p.metadata)
                if isinstance(meta, dict) and "language" in meta:
                    selected_language = meta["language"]
                    break
            except Exception:
                pass

    logger.info(f"User connected with selected language: {selected_language}, identity: {participant_identity}")

    # Map selected language to corresponding native Murf TTS voices
    voice_map = {
        "English": "Anisha",
        "Hindi": "Anisha",
        "Telugu": "Kavya",
        "Tamil": "Aishwarya",
        "Bengali": "Joya",
        "Gujarati": "Dhwani",
        "Kannada": "Siri",
        "Malayalam": "Ananya",
        "Marathi": "Priya",
        "Punjabi": "Jaspreet",
        "Urdu": "Zoya"
    }

    reprompts = {
        "English": "Hello? Are you still there? Let me know if you need any wellness tips or general health info.",
        "Telugu": "హలో? మీరు ఇంకా అక్కడే ఉన్నారా? మీకు ఏదైనా ఆరోగ్య చిట్కాలు కావాలంటే నాకు చెప్పండి.",
        "Hindi": "हैलो? क्या आप अभी भी वहाँ हैं? मुझे बताएं कि क्या आपको कोई स्वास्थ्य सुझाव चाहिए।",
        "Bengali": "হ্যালো? আপনি কি এখনও আছেন? আপনার কোনো স্বাস্থ্য টিপস লাগবে কিনা আমাকে জানান।",
        "Gujarati": "હેলো? શું તમે ਹજી ત્યાં છો? જો તમને કોઈ આરોગ્ય ટિપ્સ જોઈતી હોય તો મને જણાવો.",
        "Kannada": "ಹলো? ನೀವು ಇನ್ನೂ ಅಲ್ಲೇ ಇದ್ದೀರಾ? ನಿಮಗೆ ಯಾವುದೇ ಆರೋಗ್ಯ ಸಲಹೆಗಳು ಬೇಕಿದ್ದರೆ ನನಗೆ ತಿಳಿಸಿ.",
        "Malayalam": "ഹലോ? നിങ്ങൾ ഇപ്പോഴും അവിടെയുണ്ടോ? നിങ്ങൾക്ക് എന്തെങ്കിലും ആരോഗ്യ ടിപ്പുകൾ വേണമെങ്കിൽ എന്നെ അറിയിക്കൂ.",
        "Marathi": "हॅलो? तुम्ही अजून तिथेच आहात का? तुम्हाला कोणतीही आरोग्य टिप्स हवी असल्यास मला सांगा.",
        "Punjabi": "ਹੈਲੋ? ਕੀ ਤੁਸੀਂ ਅਜੇ ਵੀ ਉੱਥੇ ਹੋ? ਮੈਨੂੰ ਦੱਸੋ ਜੇਕਰ ਤੁਹਾਨੂੰ ਕੋਈ ਸਿਹਤ ਸੁਝਾਅ ਚਾਹੀਦਾ ਹੈ।",
        "Tamil": "ஹலோ? நீங்கள் இன்னும் அங்கே இருக்கிறீர்களா? உங்களுக்கு ஏதேனும் சுகாதார குறிப்புகள் தேவைப்பட்டால் எனக்குத் தெரியப்படுத்துங்கள்.",
        "Urdu": "ہیلو؟ کیا آپ اب بھی وہاں ہیں؟ مجھے بتائیں اگر آپ کو صحت کے بارے میں کوئی معلومات چاہیے۔"
    }

    goodbyes = {
        "English": "It seems you are away. I am ending this call. Goodbye!",
        "Telugu": "మీరు అందుబాటులో లేనట్లున్నారు. నేను ఈ కాల్‌ని ముగిస్తున్నాను. సెలవు!",
        "Hindi": "ऐसा लगता है कि आप दूर हैं। मैं यह कॉल समाप्त कर रहा हूँ। अलविदा!",
        "Bengali": "মনে হচ্ছে আপনি দূরে আছেন। আমি এই কলটি শেষ করছি। বিদায়!",
        "Gujarati": "લાગે છે કે તમે દૂર છો. હું આ કોल समाप्त કરું છું. આવજો!",
        "Kannada": "ನೀವು ದೂರವಿರುವಂತೆ ತೋರುತ್ತಿದೆ. ನಾನು ಈ ಕರೆಯನ್ನು ಕೊನೆಗೊಳಿಸುತ್ತಿದ್ದೇನೆ. ಬೈ!",
        "Malayalam": "നിങ്ങൾ തിരക്കിലാണെന്ന് തോന്നുന്നു. ഞാൻ ഈ കോൾ അവസാനിപ്പിക്കുന്നു. ഗുഡ്ബൈ!",
        "Marathi": "असे वाटते की तुम्ही दूर आहात. मी हा कॉल संपवत आहे. निरोप!",
        "Punjabi": "ਲੱਗਦਾ ਹੈ ਤੁਸੀਂ ਦੂਰ ਹੋ। ਮੈਂ ਇਹ ਕਾਲ ਸਮਾਪਤ ਕਰ ਰਿਹਾ ਹਾਂ। ਅਲਵਿਦਾ!",
        "Tamil": "நீங்கள் தூரமாக இருப்பது போல் தெரிகிறது. நான் இந்த அழைப்பை முடிக்கிறேன். விடைபெறுகிறேன்!",
        "Urdu": "ایسا لگتا ہے کہ آپ دور ہیں۔ میں یہ کال ختم کر رہا ہوں۔ خدا حافظ!"
    }
    voice = voice_map.get(selected_language, "Anisha")

    # Check if this is an outbound call
    is_outbound = ctx.room.name.startswith("outbound_") or (ctx.job.metadata == "outbound_medication_reminder")

    if is_outbound:
        logger.info(f"Outbound call detected for participant: {participant_identity}")
        # Look up profile in database
        profile = database.get_caller(participant_identity)
        if profile:
            caller_name = profile.get("name", "there")
            facts = profile.get("facts", {})
            conditions = facts.get("ongoing_conditions", "your health guidelines")
        else:
            conditions = "your health guidelines"
        
        custom_prompt = OUTBOUND_SYSTEM_PROMPT_TEMPLATE.format(
            caller_name=caller_name,
            conditions=conditions
        )
    else:
        custom_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            language=selected_language,
            user_id=participant_identity
        )

    stt_lang_map = {
        "English": "en",
        "Hindi": "hi",
        "Telugu": "te",
        "Tamil": "ta",
        "Bengali": "bn",
        "Gujarati": "gu",
        "Kannada": "kn",
        "Malayalam": "ml",
        "Marathi": "mr",
        "Punjabi": "pa",
        "Urdu": "ur"
    }
    stt_lang = stt_lang_map.get(selected_language, "en")

    # Set up the voice AI pipeline dynamically
    session = AgentSession(
        stt=deepgram.STT(model="nova-3", language=stt_lang),
        llm=google.LLM(model="gemini-3.5-flash-lite"),
        tts=murf.TTS(
            voice=voice,
            style="Conversation" if voice == "Anisha" else None,
            tokenizer=tokenize.basic.SentenceTokenizer(min_sentence_len=2),
            text_pacing=True,
        ),
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
        user_away_timeout=10.0,
    )

    failures = 0

    @session.on("user_state_changed")
    def on_user_state_changed(event: UserStateChangedEvent):
        nonlocal failures
        logger.info(f"User state changed: {event.old_state} -> {event.new_state}")

        if event.new_state == "speaking":
            failures = 0

        elif event.new_state == "away":
            failures += 1
            logger.info(f"User has been silent. Failure count: {failures}")

            async def handle_silence(fail_count):
                import contextlib
                if fail_count == 1:
                    msg = reprompts.get(selected_language, reprompts["English"])
                    await session.say(msg)
                elif fail_count >= 2:
                    msg = goodbyes.get(selected_language, goodbyes["English"])
                    handle = await session.say(msg)
                    with contextlib.suppress(Exception):
                        await handle.wait_for_playout()
                    logger.info("Shutting down session due to consecutive silences.")
                    session.shutdown()

            task = asyncio.create_task(handle_silence(failures))
            if "tasks" not in session.userdata:
                session.userdata["tasks"] = set()
            session.userdata["tasks"].add(task)
            task.add_done_callback(session.userdata["tasks"].discard)

    # Start the session with customized LLM instructions
    await session.start(
        agent=Assistant(instructions=custom_prompt),
        room=ctx.room,
    )

    await session.generate_reply()

    start_time = datetime.now(timezone.utc)

    @session.on("close")
    def on_session_close():
        duration = int((datetime.now(timezone.utc) - start_time).total_seconds())
        status = "successful" if duration >= 5 else "failed"
        call_id = f"CALL-{utils.shortuuid()[:6].upper()}"
        database.record_call(
            call_id=call_id,
            caller_id=participant_identity,
            caller_name=participant_identity if participant_identity != "default_user" else "Browser Caller",
            status=status,
            duration_seconds=duration,
            notes="Health consultation completed" if status == "successful" else "Call ended prematurely",
            channel="sip" if is_outbound else "browser",
            language=selected_language,
            triage_level="Routine"
        )
        logger.info(f"Recorded end-of-call record: {call_id} (duration={duration}s, status={status})")


if __name__ == "__main__":
    cli.run_app(server)

