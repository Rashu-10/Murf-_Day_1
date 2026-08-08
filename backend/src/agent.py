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


SYSTEM_PROMPT_TEMPLATE = """IDENTITY:
You are MediBuddy, a warm and empathetic health assistant built for the Health Access track. Your role is to help people get quick wellness information, healthy habits, nutrition tips, and general health info.

LANGUAGE REQUIREMENT:
The user has selected the language: {language}.
You MUST conduct the entire conversation and reply ONLY in {language}.
Do NOT use other languages. Write the text outputs in the native script of {language} (e.g. Devanagari script for Hindi, Telugu script for Telugu, Bengali script for Bengali, etc. - except for English where you write in English).

OBJECTIVES:
- Welcome the caller, state you are built for the Health Access track, and explain how you can help (wellness tips, general health definitions, and habits).
- Maintain safety by refusing diagnosis or prescriptions, and direct users to appropriate medical services if they show red-flag symptoms.

KNOWLEDGE LIMITS:
- You know general wellness, public health recommendations, exercise habits, nutrition, sleep hygiene, and general definitions of medical terms.
- Never state any health fact without emphasizing that it is for informational purposes only.

GUARDRAILS:
- Hard Refusal 1: You must NEVER diagnose any disease, illness, or medical condition, even if the user asks you to or describes symptoms.
- Hard Refusal 2: You must NEVER prescribe, recommend, name, or suggest specific prescription drugs or medical treatments.
- Never-Claim: You must NEVER claim to be a doctor, nurse, or any licensed medical professional. Always state: "I am an AI, not a doctor."
- Escalation Script: If the user describes red-flag symptoms (such as chest pain, severe shortness of breath, sudden numbness, severe bleeding, or allergic reactions), immediately state (in {language}): "Please seek immediate medical attention or call emergency services like 108 or 112. As an AI, I cannot assist with emergency or diagnostic situations." Refuse to continue giving advice.

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

    # Determine user's selected language
    selected_language = "English"
    for p in ctx.room.remote_participants.values():
        if p.metadata:
            try:
                import json
                meta = json.loads(p.metadata)
                if isinstance(meta, dict) and "language" in meta:
                    selected_language = meta["language"]
                    break
            except Exception:
                pass

    logger.info(f"User connected with selected language: {selected_language}")

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
        "Urdu": "Zoya",
    }
    voice = voice_map.get(selected_language, "Anisha")

    greetings = {
        "English": "Hello! I am MediBuddy, your AI health assistant. I can help you with wellness tips, nutrition, and healthy habits. Please note, I am an AI, not a doctor. How can I help you today?",
        "Telugu": "నమస్తే! నేను మెడిబడ్డీ, మీ AI ఆరోగ్య సహాయకుడిని. నేను మీకు సాధారణ ఆరోగ్యం, పోషణ మరియు మంచి అలవాట్లపై చిట్కాలు ఇవ్వగలను. నేను AI మాత్రమే, డాక్టర్ని కాదు. ఈరోజు నేను మీకు ఎలా సహాయపడగలను?",
        "Hindi": "नमस्ते! मैं मेडिबडी हूँ, आपका एआई स्वास्थ्य सहायक। मैं आपको सामान्य स्वास्थ्य, पोषण और स्वस्थ आदतों के बारे में सुझाव दे सकता हूँ। कृपया ध्यान दें, मैं एक एआई हूँ, डॉक्टर नहीं। आज मैं आपकी क्या मदद कर सकता हूँ?",
        "Bengali": "নমস্কার! আমি মেডিবাডি, আপনার এআই স্বাস্থ্য সহকারী। আমি আপনাকে সাধারণ সুস্থতা, পুষ্টি এবং স্বাস্থ্যকর অভ্যাস সম্পর্কে পরামর্শ দিতে পারি। মনে রাখবেন, আমি এআই, ডাক্তার নই। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?",
        "Gujarati": "નમસ્તે! હું મેડીબડી છું, તમારા એઆઈ આરોગ્ય સહાયક. હું તમને સામાન્ય સુખાકારી, પોષણ અને તંદુરસ્ત આદતો વિશે માહિતી આપી શકું છું. મહેરબાની કરીને નોંધ લો કે હું એઆઈ છું, ડોક્ટર નથી. આજે હું તમારી શું મદદ કરી શકું?",
        "Kannada": "ನಮಸ್ತೆ! ನಾನು ಮೆಡಿಬಡ್ಡಿ, ನಿಮ್ಮ ಎಐ ಆರೋಗ್ಯ ಸಹಾಯಕ. ನಾನು ನಿಮಗೆ ಸಾಮಾನ್ಯ ಸ್ವಾಸ್ಥ್ಯ, ಪೋಷಣೆ ಮತ್ತು ಆರೋಗ್ಯಕರ ಅಭ್ಯಾಸಗಳ ಬಗ್ಗೆ ಸಲಹೆ ನೀಡಬಲ್ಲೆ. ದಯವಿಟ್ಟು ಗಮನಿಸಿ, ನಾನು ಎಐ, ವೈದ್ಯನಲ್ಲ. ಇವತ್ತು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
        "Malayalam": "നമസ്കാരം! ഞാൻ മെഡിബഡി, നിങ്ങളുടെ എഐ ആരോഗ്യ സഹായിയാണ്. പൊതുവായ ആരോഗ്യം, പോഷകാഹാരം, നല്ല ശീലങ്ങൾ എന്നിവയെക്കുറിച്ച് ഞാൻ ടിപ്പുകൾ നൽകാം. ഞാൻ ഒരു എഐ മാത്രമാണ്, ഡോക്ടറല്ല. ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കണം?",
        "Marathi": "नमस्कार! मी मेडिबडी आहे, तुमचा एआय आरोग्य सहाय्यक. मी तुम्हाला सामान्य आरोग्य, पोषण आणि निरोगी सवयींबद्दल सल्ला देऊ शकतो. कृपया लक्षात ठेवा, मी एक एआई आहे, डॉक्टर नाही. आज मी तुमची काय मदत करू शकतो?",
        "Punjabi": "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਮੇਡੀਬਡੀ ਹਾਂ, ਤੁਹਾਡਾ ਏਆਈ ਸਿਹਤ ਸਹਾਇਕ। ਮੈਂ ਤੁਹਾਨੂੰ ਤੰਦਰੁਸਤੀ, ਪੋਸ਼ਣ ਅਤੇ ਸਿਹਤਮੰਦ ਆਦਤਾਂ ਬਾਰੇ ਜਾਣਕਾਰੀ ਦੇ ਸਕਦਾ ਹਾਂ। ਕਿਰਪਾ ਕਰਕੇ ਧਿਆਨ ਦਿਓ, ਮੈਂ ਏਆਈ ਹਾਂ, ਡਾਕਟਰ ਨਹੀਂ। ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?",
        "Tamil": "வணக்கம்! நான் மெடிபடி, உங்கள் ஏஐ சுகாதார உதவியாளர். ஆரோக்கியம், ஊட்டச்சத்து மற்றும் நல்ல பழக்கவழக்கங்கள் பற்றிய குறிப்புகளை நான் உங்களுக்கு வழங்க முடியும். நான் ஏஐ தான், மருத்துவர் அல்ல. இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?",
        "Urdu": "السلام علیکم! میں میڈی بڈی ہوں، آپ کا اے آئی صحت کا معاون۔ میں تندرستی، غذائیت اور صحت مند عادات کے بارے میں معلومات دے سکتا ہوں۔ براہ کرم یاد رکھیں، میں اے آئی ہوں، ڈاکٹر نہیں۔ آج میں آپ کی کیا مدد کر سکتا ہوں؟"
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

    custom_prompt = SYSTEM_PROMPT_TEMPLATE.format(language=selected_language)

    # Set up the voice AI pipeline dynamically
    session = AgentSession(
        stt=deepgram.STT(model="nova-3", language="multi"),
        llm=google.LLM(model="gemini-3.5-flash-lite"),
        tts=murf.TTS(
            voice=voice,
            style="Conversation" if voice == "Anisha" else None,
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
                    msg = reprompts.get(selected_language, reprompts["English"])
                    await session.say(msg)
                elif fail_count >= 2:
                    msg = goodbyes.get(selected_language, goodbyes["English"])
                    handle = await session.say(msg)
                    try:
                        await handle.wait_for_playout()
                    except Exception:
                        pass
                    logger.info("Shutting down session due to consecutive silences.")
                    session.shutdown()

            asyncio.create_task(handle_silence(failures))

    # Start the session with customized LLM instructions
    await session.start(
        agent=Agent(instructions=custom_prompt),
        room=ctx.room,
    )

    # Play initial welcome greeting in selected language
    welcome_msg = greetings.get(selected_language, greetings["English"])
    await session.say(welcome_msg)


if __name__ == "__main__":
    cli.run_app(server)
