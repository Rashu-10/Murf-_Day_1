import logging

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    UserStateChangedEvent,
    cli,
    room_io,
    tokenize,
)
from livekit.plugins import deepgram, google, murf, noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logger = logging.getLogger("agent")

load_dotenv(".env.local")

# Change this prompt to change what your voice agent does.
# See README.md for example prompts (customer support, language tutor, receptionist).
SYSTEM_PROMPT = """IDENTITY:
You are MediBuddy, a warm and empathetic health assistant built for the Health Access track. Your role is to help people get quick wellness information, healthy habits, nutrition tips, and general health info.

OBJECTIVES:
- Welcome the caller, state you are built for the Health Access track, and explain how you can help (wellness tips, general health definitions, and habits).
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
    def __init__(self) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)

    # To add tools, use the @function_tool decorator.
    # Here's an example that adds a simple weather tool.
    # You also have to add `from livekit.agents import function_tool, RunContext` to the top of this file
    # @function_tool
    # async def lookup_weather(self, context: RunContext, location: str):
    #     """Use this tool to look up current weather information in the given location.
    #
    #     If the location is not supported by the weather service, the tool will indicate this. You must tell the user the location's weather is unavailable.
    #
    #     Args:
    #         location: The location to look up weather information for (e.g. city name)
    #     """
    #
    #     logger.info(f"Looking up weather for {location}")
    #
    #     return "sunny with a temperature of 70 degrees."


server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


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


@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: JobContext):
    # Logging setup
    # Add any other context you want in all log entries here
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Set up a voice AI pipeline using Murf Falcon, Deepgram, and the LiveKit turn detector
    session = AgentSession(
        stt=deepgram.STT(model="nova-3", language="multi"),
        llm=google.LLM(model="gemini-3.5-flash-lite"),
        tts=murf.TTS(
            voice="Anisha",
            style="Conversation",
            tokenizer=tokenize.basic.SentenceTokenizer(min_sentence_len=1),
            text_pacing=False,
        ),
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
                if fail_count == 1:
                    # First silence: play a polite re-prompt
                    await session.say(
                        "Hello? Are you still there? Meeru akkade unnaara? Mujhe sun sakte hain aap? "
                        "Let me know if you need any wellness tips or general health info."
                    )
                elif fail_count >= 2:
                    # Second silence: say goodbye and shut down
                    handle = await session.say(
                        "It seems you are away. Nenu ee call ni end chesthunnaanu. Phir milenge! Goodbye!"
                    )
                    try:
                        await handle.wait_for_playout()
                    except Exception:
                        pass
                    logger.info("Shutting down session due to consecutive silences.")
                    session.shutdown()

            asyncio.create_task(handle_silence(failures))

    # Start the session, which initializes the voice pipeline and warms up the models
    await session.start(
        agent=Assistant(),
        room=ctx.room,
    )

    # Join the room and connect to the user
    await ctx.connect()

    # Play initial welcome greeting
    await session.say(
        "Hello! I am MediBuddy, your AI health assistant for the Health Access track. "
        "Nenu meeku general wellness tips, nutrition, and healthy habits toh sahayyam cheyagalanu. "
        "Please note, I am an AI, not a doctor, and cannot diagnose diseases or prescribe medicines. "
        "How can I help you today?"
    )


if __name__ == "__main__":
    cli.run_app(server)
