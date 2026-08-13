'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSessionContext, useAgent, useSessionMessages, useVoiceAssistant, useChat } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import { 
  Heart, 
  Activity, 
  Settings, 
  Mic, 
  MicOff, 
  PhoneOff, 
  AlertTriangle, 
  Info,
  Sparkles,
  LifeBuoy,
  Stethoscope,
  ChevronRight,
  Loader2,
  X,
  Volume2,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AudioVisualizer } from '@/components/agents-ui/blocks/agent-session-view-01/components/audio-visualizer';

// Full translation dictionary for all 11 languages
const TRANSLATIONS: Record<string, Record<string, string>> = {
  English: {
    headerSubtitle: "Health Access Voice Assistant",
    title: "How can I help you today?",
    subtitle: "Talk naturally in English, Telugu, or other Indian languages.",
    startBtn: "Start Consultation",
    endBtn: "End Consultation",
    liveTranscript: "Live Transcript",
    noTranscript: "Your transcript will appear here once the conversation starts.",
    quickInquiries: "Quick Inquiries",
    generalHealth: "General Health",
    generalHealthDesc: "wellness & habits",
    wellnessTips: "Wellness Tips",
    firstAid: "First Aid",
    doctorAdvice: "Doctor Advice",
    ask: "Ask",
    safetyHeader: "Safety Notice",
    safetyBody: "MediBuddy AI is an automated guide for general health information. It is not a doctor, cannot diagnose diseases, and cannot prescribe medicines. Always seek professional medical advice for clinical concerns.",
    emergencyHeader: "Emergency Notice",
    emergencyBody: "If you are experiencing chest pain, difficulty breathing, severe bleeding, or any medical emergency, please contact your local emergency service (like 108 or 112) or visit the nearest hospital immediately.",
    poweredBy: "Powered by Murf Falcon — the fastest TTS API",
    campaign: "10 Days of AI Voice Agents — VoiceForBharat",
    settingsTitle: "Settings & Details",
    micInput: "Microphone Input",
    defaultInput: "Default System Input",
    agentDetails: "Agent Details",
    ttsText: "TTS: Murf Falcon (Native language voice)",
    closeSettings: "Close Settings",
    connectedStatus: "Connected",
    connectingStatus: "Connecting",
    endedStatus: "Ended",
    readyStatus: "Ready",
    tapToTalk: "Tap the microphone to talk",
    listening: "Listening to you...",
    thinking: "Thinking...",
    speaking: "MediBuddy is speaking...",
    connectedReady: "Connected. Tap mic to speak",
    welcomeTitle: "Talk with MediBuddy",
    welcomeSubtitle: "Your warm, empathetic AI health assistant built for the Health Access track.",
    howIHelp: "How I can help you:",
    help1: "Provide wellness and nutrition tips",
    help2: "Suggest healthy habits and hygiene tips",
    help3: "Explain general medical terms",
    speaks: "🌐 Speaks English, Telugu, Hindi and other Indian languages"
  },
  Hindi: {
    headerSubtitle: "स्वास्थ्य सेवा आवाज सहायक",
    title: "आज मैं आपकी क्या मदद कर सकता हूँ?",
    subtitle: "हिंदी, अंग्रेजी या अन्य भारतीय भाषाओं में स्वाभाविक रूप से बात करें।",
    startBtn: "परामर्श शुरू करें",
    endBtn: "परामर्श समाप्त करें",
    liveTranscript: "लाइव बातचीत प्रतिलेख",
    noTranscript: "बातचीत शुरू होने पर आपका प्रतिलेख यहां दिखाई देगा।",
    quickInquiries: "त्वरित पूछताछ",
    generalHealth: "सामान्य स्वास्थ्य",
    generalHealthDesc: "स्वस्थ आदतें",
    wellnessTips: "कल्याण युक्तियाँ",
    firstAid: "प्राथमिक चिकित्सा",
    doctorAdvice: "डॉक्टर की सलाह",
    ask: "पूछें",
    safetyHeader: "सुरक्षा सूचना",
    safetyBody: "मेडिबडी एआई सामान्य स्वास्थ्य जानकारी के लिए एक स्वचालित मार्गदर्शिका है। यह डॉक्टर नहीं है, बीमारियों का निदान नहीं कर सकता है, और दवाएं नहीं लिख सकता है। हमेशा चिकित्सीय चिंताओं के लिए पेशेवर सलाह लें।",
    emergencyHeader: "आपातकालीन सूचना",
    emergencyBody: "यदि आपको सीने में दर्द, सांस लेने में कठिनाई, गंभीर रक्तस्राव या कोई चिकित्सीय आपात स्थिति है, तो तुरंत आपातकालीन सेवा (जैसे 108 या 112) से संपर्क करें या नजदीकी अस्पताल जाएं।",
    poweredBy: "मर्फ फाल्कन द्वारा संचालित — सबसे तेज टीटीएस एपीआई",
    campaign: "10 दिन एआई वॉयस एजेंट्स — वॉयस फॉर भारत",
    settingsTitle: "सेटिंग्स और विवरण",
    micInput: "माइक्रोफोन इनपुट",
    defaultInput: "डिफ़ॉल्ट सिस्टम इनपुट",
    agentDetails: "एजेंट विवरण",
    ttsText: "टीटीएस: मर्फ फाल्कन (मूल भाषा आवाज)",
    closeSettings: "सेटिंग्स बंद करें",
    connectedStatus: "जुड़ा हुआ",
    connectingStatus: "कनेक्ट हो रहा है",
    endedStatus: "समाप्त",
    readyStatus: "तैयार",
    tapToTalk: "बात करने के लिए माइक्रोफ़ोन टैप करें",
    listening: "आपकी बात सुन रहे हैं...",
    thinking: "सोच रहा हूँ...",
    speaking: "मेडिबडी बोल रहा है...",
    connectedReady: "जुड़ा हुआ। बात करने के लिए टैप करें",
    welcomeTitle: "मेडिबडी से बात करें",
    welcomeSubtitle: "हेल्थ एक्सेस ट्रैक के लिए निर्मित आपका आत्मीय एआई स्वास्थ्य सहायक।",
    howIHelp: "मैं आपकी कैसे मदद कर सकता हूँ:",
    help1: "कल्याण और पोषण युक्तियाँ प्रदान करना",
    help2: "स्वस्थ आदतों और स्वच्छता युक्तियों का सुझाव देना",
    help3: "सामान्य चिकित्सा शब्दों की व्याख्या करना",
    speaks: "🌐 अंग्रेजी, तेलुगु, हिंदी और अन्य भारतीय भाषाएं बोलता है"
  },
  Telugu: {
    headerSubtitle: "ఆరోగ్య సహాయక వాయిస్ అసిస్టెంట్",
    title: "ఈరోజు నేను మీకు ఎలా సహాయపడగలను?",
    subtitle: "తెలుగు, ఇంగ్లీష్ లేదా ఇతర భారతీయ భాషల్లో సహజంగా మాట్లాడండి.",
    startBtn: "సంప్రదింపులు ప్రారంభించండి",
    endBtn: "కాల్ ముగించండి",
    liveTranscript: "ライవ్ సంభాషణ ప్రతిలేఖనం",
    noTranscript: "సంభాషణ ప్రారంభమైన తర్వాత మీ ప్రతిలేఖనం ఇక్కడ కనిపిస్తుంది.",
    quickInquiries: "త్వరిత విచారణలు",
    generalHealth: "సాధారణ ఆరోగ్యం",
    generalHealthDesc: "మంచి అలవాట్లు",
    wellnessTips: "ఆరోగ్య చిట్కాలు",
    firstAid: "ప్రథమ చికిత్స",
    doctorAdvice: "వైద్యుని సలహా",
    ask: "అడగండి",
    safetyHeader: "భద్రతా నోటీసు",
    safetyBody: "మెడిబడ్డీ ఎఐ సాధారణ ఆరోగ్య సమాచారం కోసం ఒక స్వయంచాలక గైడ్. ఇది వైద్యుడు కాదు, వ్యాధులను నిర్ధారించలేదు మరియు మందులను సూచించలేదు. క్లినికల్ సమస్యల కోసం ఎల్లప్పుడూ వైద్యుల సలహా తీసుకోండి.",
    emergencyHeader: "అత్యవసర నోటీసు",
    emergencyBody: "మీకు గుండెనొప్పి, శ్వాస తీసుకోవడంలో ఇబ్బంది, తీవ్ర రక్తస్రావం లేదా ఏదైనా అత్యవసర పరిస్థితి ఉంటే, దయచేసి వెంటనే అత్యవసర సేవను (108 లేదా 112) సంప్రదించండి లేదా సమీప ఆసుపత్రికి వెళ్లండి.",
    poweredBy: "మర్ఫ్ ఫాల్కன் ద్వారా శక్తిమంతం — వేగవంతమైన TTS API",
    campaign: "10 రోజుల AI వాయిస్ ఏజెంట్లు — వాయిస్ ఫర్ భారత్",
    settingsTitle: "సెట్టింగులు & వివరాలు",
    micInput: "మైక్రోఫోన్ ఇన్పుట్",
    defaultInput: "సిస్టమ్ డిఫాల్ట్ ఇన్పుట్",
    agentDetails: "ఏజెంట్ వివరాలు",
    ttsText: "TTS: మర్ఫ్ ఫాల్కன் (మాతృభాష వాయిస్)",
    closeSettings: "సెట్టింగులు మూసివేయి",
    connectedStatus: "కనెక్ట్ అయింది",
    connectingStatus: "కనెక్ట్ అవుతోంది",
    endedStatus: "ముగిసింది",
    readyStatus: "సిద్ధం",
    tapToTalk: "మాట్లాడటానికి మైక్రోఫోన్ నొక్కండి",
    listening: "మీరు మాట్లాడేది వింటున్నాను...",
    thinking: "ఆলোచిస్తున్నాను...",
    speaking: "మెడిబడ్డీ మాట్లాడుతోంది...",
    connectedReady: "కనెక్ట్ అయింది. మాట్లాడటానికి నొక్కండి",
    welcomeTitle: "మెడిబడ్డీతో మాట్లాడండి",
    welcomeSubtitle: "హెల్త్ యాక్సెస్ ట్రాక్ కోసం నిర్మించబడిన మీ ఆత్మీయ AI ఆరోగ్య సహాయకుడు.",
    howIHelp: "నేను మీకు ఎలా సహాయపడగలను:",
    help1: "ఆరోగ్య మరియు పోషణ చిట్కాలను అందించడం",
    help2: "మంచి అలవాట్లు మరియు పరిశుಭ్రత చిట్కాలను సూచించడం",
    help3: "సాధారణ వైద్య పదాలను వివరించడం",
    speaks: "🌐 ఇంగ్లీష్, తెలుగు, హిందీ మరియు ఇతర భారతీయ భాషలు మాట్లాడగలదు"
  },
  Bengali: {
    headerSubtitle: "স্বাস্থ্য পরিষেবা ভয়েস সহকারী",
    title: "আজ আপনাকে কীভাবে সাহায্য করতে পারি?",
    subtitle: "বাংলা, ইংরেজি বা অন্য ভারতীয় ভাষায় স্বাভাবিকভাবে কথা বলুন।",
    startBtn: "পরামর্শ শুরু করুন",
    endBtn: "পরামর্শ শেষ করুন",
    liveTranscript: "লাইভ ট্রান্সক্রিপ্ট",
    noTranscript: "কথোপকথন শুরু হলে আপনার ট্রান্সক্রিপ্ট এখানে প্রদর্শিত হবে।",
    quickInquiries: "দ্রুত জিজ্ঞাসা",
    generalHealth: "সাধারণ স্বাস্থ্য",
    generalHealthDesc: "সুস্থ অভ্যাস",
    wellnessTips: "সুস্থতা টিপস",
    firstAid: "প্রাথমিক চিকিৎসা",
    doctorAdvice: "ডাক্তারের পরামর্শ",
    ask: "জিজ্ঞেস করুন",
    safetyHeader: "নিরাপত্তা বিজ্ঞপ্তি",
    safetyBody: "মেডিবাডি এআই সাধারণ স্বাস্থ্য তথ্যের জন্য একটি স্বয়ংক্রিয় গাইড। এটি ডাক্তার নয়, রোগ নির্ণয় করতে পারে না এবং ওষুধ লিখতে পারে না। সর্বদা পেশাদার পরামর্শ নিন।",
    emergencyHeader: "জরুরী বিজ্ঞপ্তি",
    emergencyBody: "বুকে ব্যথা, শ্বাসকষ্ট, বা কোনো জরুরী অবস্থা হলে অবিলম্বে ১০৮ বা ১১২ নম্বরে যোগাযোগ করুন বা নিকটস্থ হাসপাতালে যান।",
    poweredBy: "মার্ফ ফ্যালকন দ্বারা চালিত — দ্রুততম TTS API",
    campaign: "১০ দিনের এআই ভয়েস এজেন্ট — ভয়েস ফর ভারত",
    settingsTitle: "সেটিংস এবং বিশদ বিবরণ",
    micInput: "মাইক্রোফোন ইনপুট",
    defaultInput: "ডিফল্ট সিস্টেম ইনপুট",
    agentDetails: "এজেন্ট বিবরণ",
    ttsText: "টিটিএস: মার্ফ ফ্যালকন (মাতৃভাষার ভয়েস)",
    closeSettings: "সেটিংস বন্ধ করুন",
    connectedStatus: "সংযুক্ত",
    connectingStatus: "সংযোগ করা হচ্ছে",
    endedStatus: "সমাপ্ত",
    readyStatus: "প্রস্তুত",
    tapToTalk: "কথা বলতে মাইক্রোফোনে চাপ দিন",
    listening: "শুনছি...",
    thinking: "ভাবছি...",
    speaking: "মেডিবাডি কথা বলছে...",
    connectedReady: "সংযুক্ত। কথা বলতে ট্যাপ করুন",
    welcomeTitle: "মেডিবাডির সাথে কথা বলুন",
    welcomeSubtitle: "হেলথ অ্যাক্সেসের জন্য নির্মিত আপনার সহানুভূতিশীল এআই স্বাস্থ্য সহকারী।",
    howIHelp: "আমি কীভাবে সাহায্য করতে পারি:",
    help1: "পুষ্টি এবং স্বাস্থ্য পরামর্শ প্রদান করা",
    help2: "স্বাস্থ্যকর অভ্যাস এবং স্বাস্থ্যবিধি প্রস্তাব করা",
    help3: "সাধারণ চিকিৎসা পদ ব্যাখ্যা করা",
    speaks: "🌐 বাংলা, ইংরেজি, হিন্দি এবং অন্যান্য ভারতীয় ভাষা বলতে পারে"
  },
  Gujarati: {
    headerSubtitle: "હેલ્થ એક્સેસ વૉઇસ આસિસ્ટન્ટ",
    title: "આજે હું તમારી શું મદદ કરી શકું?",
    subtitle: "ગુજરાતી, અંગ્રેજી અથવા અન્ય ભારતીય ભાષાઓમાં વાત કરો.",
    startBtn: "પરામર્શ શરૂ કરો",
    endBtn: "કોલ સમાપ્ત કરો",
    liveTranscript: "લાઈવ ટ્રાન્સક્રિપ્ટ",
    noTranscript: "સંભાષણ શરૂ થતાં જ તમારું ટ્રાન્સક્રિપ્ટ અહીં દેખાશે.",
    quickInquiries: "ઝડપી પૂછપરછ",
    generalHealth: "સામાન્ય સ્વાસ્થ્ય",
    generalHealthDesc: "સુખાકારી અને આદતો",
    wellnessTips: "વેલનેસ ટિપ્સ",
    firstAid: "પ્રાથમિક સારવાર",
    doctorAdvice: "ડોક્ટરની સલાહ",
    ask: "પૂછો",
    safetyHeader: "સુરક્ષા સૂચના",
    safetyBody: "મેડીબડી એઆઈ સામાન્ય સ્વાસ્થ્ય માહિતી માટે સ્વચાલિત માર્ગદર્શિકા છે. આ કોઈ ડોક્ટર નથી, રોગનું નિદાન કરી શકતું નથી અને દવાઓ લખી શકતું નથી. હંમેશા વ્યાવસાયિક સલાહ લો.",
    emergencyHeader: "કટોકટીની નોટીસ",
    emergencyBody: "જો તમને છાતીમાં દુખાવો, શ્વાસ લેવામાં તકલીફ, ગંભીર રક્તસ્ત્રાવ અથવા કોઈપણ તબીબી કટોકટી હોય, તો કૃપા કરીને તરત જ ૧૦૮ અથવા ૧૧૨ પર સંપર્ક કરો અથવા નજીકની હોસ્પિટલની મુલાકાત લો.",
    poweredBy: "મર્ફ ફાલ્કન દ્વારા સંચાલિત — સૌથી ઝડપી TTS API",
    campaign: "૧૦ દિવસ એઆઈ વૉઇસ એજન્ટ્સ — વૉઇસ ફોર ભારત",
    settingsTitle: "સેટિંગ્સ અને વિગતો",
    micInput: "માઇક્રોફોન ઇનપુટ",
    defaultInput: "સિસ્ટમ ડિફોલ્ટ ઇનપુટ",
    agentDetails: "એજન્ટ વિગતો",
    ttsText: "TTS: મર્ફ ફાલ્કન (માતૃભાષા વૉઇસ)",
    closeSettings: "સેટિંગ્સ બંધ કરો",
    connectedStatus: "જોડાયેલ",
    connectingStatus: "કનેક્ટ થઈ રહ્યું છે",
    endedStatus: "સમાપ્ત",
    readyStatus: "તૈયાર",
    tapToTalk: "વાત કરવા માટે માઇક્રોફોન પર ટેપ કરો",
    listening: "સાંભળી રહ્યા છીએ...",
    thinking: "વિચારી રહ્યું છે...",
    speaking: "મેડીબડી બોલી રહ્યું છે...",
    connectedReady: "જોડાયેલ. વાત કરવા માટે ટેપ કરો",
    welcomeTitle: "મેડીબડી સાથે વાત કરો",
    welcomeSubtitle: "હેલ્થ એક્સેસ ટ્રેક માટે બનેલ તમારા એઆઈ આરોગ્ય સહાયક.",
    howIHelp: "હું કેવી રીતે મદદ કરી શકું:",
    help1: "સુખાકારી અને પોષણ અંગે સલાહ આપવી",
    help2: "તંદુરસ્ત આદતો અને સ્વચ્છતાની ભલામણ કરવી",
    help3: "સામાન્ય તબીબી શબ્દો સમજાવવા",
    speaks: "🌐 અંગ્રેજી, તેલુગુ, હિન્દી અને અન્ય ભારતીય ભાષાઓ બોલે છે"
  },
  Kannada: {
    headerSubtitle: "ಆರೋಗ್ಯ ಸಹಾಯ ವಾಯ್ಸ್ ಅಸಿಸ್ಟೆಂಟ್",
    title: "ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
    subtitle: "ಕನ್ನಡ, ಇಂಗ್ಲಿಷ್ ಅಥವಾ ಇತರ ಭಾರತೀಯ ಭಾಷೆಗಳಲ್ಲಿ ಸಹಜವಾಗಿ ಮಾತನಾಡಿ.",
    startBtn: "ಸಮಾಲೋಚನೆ ಪ್ರಾರಂಭಿಸಿ",
    endBtn: "ಕರೆ ಮುಕ್ತಾಯಗೊಳಿಸಿ",
    liveTranscript: "ಲೈವ್ ಲಿಪ್ಯಂತರ",
    noTranscript: "ಸಂಭಾಷಣೆ ಪ್ರಾರಂಭವಾದ ನಂತರ ಲಿಪ್ಯಂತರವು ಇಲ್ಲಿ ಗೋಚರಿಸುತ್ತದೆ.",
    quickInquiries: "ತ್ವರಿತ ವಿಚಾರಣೆಗಳು",
    generalHealth: "ಸಾಮಾನ್ಯ ಆರೋಗ್ಯ",
    generalHealthDesc: "ಸ್ವಾಸ್ಥ್ಯ ಮತ್ತು ಅಭ್ಯಾಸಗಳು",
    wellnessTips: "ವೆಲ್ನೆಸ್ ಸಲಹೆಗಳು",
    firstAid: "ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ",
    doctorAdvice: "ವೈದ್ಯರ ಸಲಹೆ",
    ask: "ಕೇಳಿ",
    safetyHeader: "ಸುರಕ್ಷತಾ ಸೂಚನೆ",
    safetyBody: "ಮೆಡಿಬಡ್ಡಿ ಎಐ ಸಾಮಾನ್ಯ ಆರೋಗ್ಯ ಮಾಹಿತಿಗಾಗಿ ಸ್ವಯಂಚಾಲಿತ ಮಾರ್ಗದರ್ಶಿಯಾಗಿದೆ. ಇದು ವೈದ್ಯರಲ್ಲ, ಕಾಯಿಲೆಗಳನ್ನು ಪತ್ತೆಹಚ್ಚಲು ಮತ್ತು ಔಷಧಿಗಳನ್ನು ಸೂಚಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ಯಾವಾಗಲೂ ವೃತ್ತಿಪರ ಸಲಹೆ ಪಡೆಯಿರಿ.",
    emergencyHeader: "ತುರ್ತು ಸೂಚನೆ",
    emergencyBody: "ನಿಮಗೆ ಎದೆನೋವು, ಉಸಿರಾಟದ ತೊಂದರೆ, ತೀವ್ರ ರಕ್ತಸ್ರಾವ ಅಥವಾ ಯಾವುದೇ ತುರ್ತು ಪರಿಸ್ಥಿತಿಯಿದ್ದರೆ, ದಯವಿಟ್ಟು ತಕ್ಷಣ 108 ಅಥವಾ 112 ಕ್ಕೆ ಕರೆ ಮಾಡಿ ಅಥವಾ ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗೆ ಭೇಟಿ ನೀಡಿ.",
    poweredBy: "ಮರ್ಫ್ ಫಾಲ್ಕನ್ ಮೂಲಕ ಚಾಲಿತ — ಅತ್ಯಂತ ವೇಗದ TTS API",
    campaign: "10 ದಿನಗಳ AI ಧ್ವನಿ ಏಜೆಂಟ್‌ಗಳು — ಭಾರತಕ್ಕಾಗಿ ಧ್ವನಿ",
    settingsTitle: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು ಮತ್ತು ವಿವರಗಳು",
    micInput: "ಮೈಕ್ರೊಫೋನ್ ಇನ್‌ಪುಟ್",
    defaultInput: "ಸಿಸ್ಟಮ್ ಡೀಫಾಲ್ಟ್ ಇನ್‌ಪುಟ್",
    agentDetails: "ಏಜೆಂಟ್ ವಿವರಗಳು",
    ttsText: "TTS: ಮರ್ಫ್ ಫಾಲ್ಕನ್ (ಸ್ಥಳೀಯ ಭಾಷೆಯ ಧ್ವನಿ)",
    closeSettings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳನ್ನು ಮುಚ್ಚಿ",
    connectedStatus: "ಸಂಪರ್ಕಗೊಂಡಿದೆ",
    connectingStatus: "ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ",
    endedStatus: "ಮುಕ್ತಾಯಗೊಂಡಿದೆ",
    readyStatus: "ಸಿದ್ಧವಾಗಿದೆ",
    tapToTalk: "ಮಾತನಾಡಲು ಮೈಕ್ರೊಫೋನ್ ಟ್ಯಾಪ್ ಮಾಡಿ",
    listening: "ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ...",
    thinking: "ಯೋಚಿಸುತ್ತಿದೆ...",
    speaking: "ಮೆಡಿಬಡ್ಡಿ ಮಾತನಾಡುತ್ತಿದೆ...",
    connectedReady: "ಸಂಪರ್ಕಗೊಂಡಿದೆ. ಮಾತನಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ",
    welcomeTitle: "ಮೆಡಿಬಡ್ಡಿ ಜೊತೆ ಮಾತನಾಡಿ",
    welcomeSubtitle: "ಆರೋಗ್ಯ ಪ್ರವೇಶ ಟ್ರ್ಯಾಕ್‌ಗಾಗಿ ನಿರ್ಮಿಸಲಾದ ನಿಮ್ಮ ಪ್ರೀತಿಯ AI ಆರೋಗ್ಯ ಸಹಾಯಕ.",
    howIHelp: "ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ:",
    help1: "ಆರೋಗ್ಯ ಮತ್ತು ಪೋಷಣೆ ಸಲಹೆ ನೀಡುವುದು",
    help2: "ಆರೋಗ್ಯಕರ ಅಭ್ಯಾಸಗಳು ಮತ್ತು ನೈರ್ಮಲ್ಯ ಸಲಹೆಗಳನ್ನು ನೀಡುವುದು",
    help3: "ಸಾಮಾನ್ಯ ವೈದ್ಯಕೀಯ ಪದಗಳನ್ನು ವಿವರಿಸುವುದು",
    speaks: "🌐 ಇಂಗ್ಲಿಷ್, ತೆಲುಗು, ಹಿಂದಿ ಮತ್ತು ಇತರ ಭಾರತೀಯ ಭಾಷೆಗಳನ್ನು ಮಾತನಾಡುತ್ತದೆ"
  },
  Malayalam: {
    headerSubtitle: "ആരോഗ്യ സഹായ വോയ്‌സ് അസിസ്റ്റന്റ്",
    title: "ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കണം?",
    subtitle: "മലയാളം, ഇംഗ്ലീഷ് അല്ലെങ്കിൽ മറ്റ് ഇന്ത്യൻ ഭാഷകളിൽ സംസാരിക്കുക.",
    startBtn: "ആലോചന ആരംഭിക്കുക",
    endBtn: "കോൾ അവസാനിപ്പിക്കുക",
    liveTranscript: "തത്സമയ വിവരണം",
    noTranscript: "സംഭാഷണം ആരംഭിക്കുമ്പോൾ നിങ്ങളുടെ വിവരണം ഇവിടെ ദൃശ്യമാകും.",
    quickInquiries: "ദ്രുത അന്വേഷണങ്ങൾ",
    generalHealth: "பொതുവായ ആരോഗ്യം",
    generalHealthDesc: "ശീലങ്ങളും ആരോഗ്യവും",
    wellnessTips: "വെൽനസ് ടിപ്പുകൾ",
    firstAid: "പ്രഥമശുശ്രൂഷ",
    doctorAdvice: "ഡോക്ടറുടെ നിർദ്ദേശം",
    ask: "ചോദിക്കുക",
    safetyHeader: "സുരക്ഷാ മുന്നറിയിപ്പ്",
    safetyBody: "മെഡിബഡി എഐ പൊതുവായ ആരോഗ്യ വിവരങ്ങൾക്കുള്ള സ്വയമേവയുള്ള ഗൈഡാണ്. ഇതൊരു ഡോക്ടറല്ല, രോഗനിർണ്ണയം നടത്താനോ മരുന്ന് നിർദ്ദേശിക്കാനോ കഴിയില്ല. എല്ലായ്പ്പോഴും ഒരു പ്രൊഫഷണൽ ഡോക്ടറുടെ ഉപദേശം തേടുക.",
    emergencyHeader: "അടിയന്തിര മുന്നറിയിപ്പ്",
    emergencyBody: "നെഞ്ചുവേദന, ശ്വാസതടസ്സം, കടുത്ത രക്തസ്രാവം എന്നിവയുണ്ടായാൽ ഉടൻ തന്നെ 108 അല്ലെങ്കിൽ 112 എന്ന നമ്പറിൽ ബന്ധപ്പെടുകയോ അടുത്തുള്ള ആശുപത്രി സന്ദർശിക്കുകയോ ചെയ്യുക.",
    poweredBy: "മർഫ് ഫാൽക്കൺ മുഖേനയുള്ള പ്രവർത്തനം — അതിവേഗത്തിലുള്ള TTS API",
    campaign: "10 ദിവസത്തെ AI വോയ്സ് ഏജന്റുകൾ — ഭാരതത്തിനായുള്ള ശബ്ദം",
    settingsTitle: "ക്രമീകരണങ്ങളും വിവരങ്ങളും",
    micInput: "മൈക്രോഫോൺ ഇൻപുട്ട്",
    defaultInput: "സിസ്റ്റം ഡിഫോൾട്ട് ഇൻപുട്ട്",
    agentDetails: "ഏജന്റ് വിവരങ്ങൾ",
    ttsText: "TTS: മർഫ് ഫാൽക്കൺ (മാതൃഭാഷാ ശബ്ദം)",
    closeSettings: "ക്രമീകരണങ്ങൾ അടയ്ക്കുക",
    connectedStatus: "കണക്ട് ആയി",
    connectingStatus: "കണക്ട് ആകുന്നു",
    endedStatus: "അവസാനിച്ചു",
    readyStatus: "തയ്യാറാണ്",
    tapToTalk: "സംസാരിക്കാൻ മൈക്രോഫോൺ ടാപ്പ് ചെയ്യുക",
    listening: "കേൾക്കുന്നു...",
    thinking: "ചിന്തിക്കുന്നു...",
    speaking: "മെഡിബഡി സംസാരിക്കുന്നു...",
    connectedReady: "കണക്ട് ആയി. സംസാരിക്കാൻ ടാപ്പ് ചെയ്യുക",
    welcomeTitle: "മെഡിബഡിയുമായി സംസാരിക്കുക",
    welcomeSubtitle: "ആരോഗ്യ സഹായത്തിനായി നിർമ്മിച്ച നിങ്ങളുടെ പ്രിയപ്പെട്ട എഐ ആരോഗ്യ സഹായി.",
    howIHelp: "ഞാൻ എങ്ങനെ സഹായിക്കും:",
    help1: "ആരോഗ്യവും പോഷകാഹാരവും സംബന്ധിച്ച വിവരങ്ങൾ നൽകുക",
    help2: "നല്ല ശീലങ്ങളും ശുചിത്വ ടിപ്പുകളും നിർദ്ദേശിക്കുക",
    help3: "പൊതുവായ മെഡിക്കൽ പദങ്ങൾ വിശദീകരിക്കുക",
    speaks: "🌐 മലയാളം, ഇംഗ്ലീഷ്, ഹിന്ദി എന്നിവയും മറ്റ് ഇന്ത്യൻ ഭാഷകളും സംസാരിക്കുന്നു"
  },
  Marathi: {
    headerSubtitle: "आरोग्य सहाय्यक व्हॉईस असिस्टंट",
    title: "आज मी आपली काय मदत करू शकतो?",
    subtitle: "मराठी, इंग्रजी किंवा इतर भारतीय भाषांमध्ये सहजपणे बोला.",
    startBtn: "सल्ला सुरू करा",
    endBtn: "कॉल संपवा",
    liveTranscript: "थेट संभाषण प्रतिलेख",
    noTranscript: "संभाषण सुरू झाल्यावर आपले प्रतिलेख येथे दिसेल.",
    quickInquiries: "त्वरित चौकशी",
    generalHealth: "सामान्य आरोग्य",
    generalHealthDesc: "आरोग्य आणि सवयी",
    wellnessTips: "वेलनेस टिप्स",
    firstAid: "प्रथमोपचार",
    doctorAdvice: "डॉक्टरांचा सल्ला",
    ask: "विचारा",
    safetyHeader: "सुरक्षा सूचना",
    safetyBody: "मेडिबडी एआय सामान्य आरोग्य माहितीसाठी एक स्वयंचलित मार्गदर्शक आहे. हे डॉक्टर नाही, आजारांचे निदान करू शकत नाही आणि औषधोपचार लिहू शकत नाही. नेहमी डॉक्टरांचा सल्ला घ्या.",
    emergencyHeader: "आणीबाणीची नोटीस",
    emergencyBody: "छातीत दुखणे, श्वास घेण्यास त्रास होणे, किंवा वैद्यकीय आणीबाणी असल्यास, कृपया त्वरित १०८ किंवा ११२ वर संपर्क साधा किंवा जवळच्या रुग्णालयात जा.",
    poweredBy: "मर्फ फाल्कन द्वारे समर्थित — सर्वात वेगवान TTS API",
    campaign: "१० दिवस एआय व्हॉईस एजंट्स — व्हॉईस फॉर भारत",
    settingsTitle: "सेटिंग्ज आणि तपशील",
    micInput: "मायक्रोफोन इनपुट",
    defaultInput: "सिस्टम डिफॉल्ट इनपुट",
    agentDetails: "एजंट तपशील",
    ttsText: "TTS: मर्फ फाल्कन (मातृभाषा व्हॉईस)",
    closeSettings: "सेटिंग्ज बंद करा",
    connectedStatus: "कनेक्ट झाले",
    connectingStatus: "कनेक्ट होत आहे",
    endedStatus: "संपले",
    readyStatus: "तयार",
    tapToTalk: "बोलण्यासाठी मायक्रोफोनवर टॅप करा",
    listening: "ऐकत आहे...",
    thinking: "विचार करत आहे...",
    speaking: "मेडिबडी बोलत आहे...",
    connectedReady: "कनेक्ट झाले. बोलण्यासाठी टॅप करा",
    welcomeTitle: "मेडिबडीशी बोला",
    welcomeSubtitle: "हेल्थ ऍक्सेससाठी तयार केलेला आपला आत्मीय एआय आरोग्य सहाय्यक.",
    howIHelp: "मी कशी मदत करू शकतो:",
    help1: "आरोग्य आणि पोषण विषयक सल्ला देणे",
    help2: "निरोगी सवयी आणि स्वच्छता सुचवणे",
    help3: "सामान्य वैद्यकीय संज्ञा स्पष्ट करणे",
    speaks: "🌐 इंग्रजी, मराठी, हिंदी आणि इतर भारतीय भाषा बोलू शकतो"
  },
  Punjabi: {
    headerSubtitle: "ਸਿਹਤ ਸਹਾਇਤਾ ਵੌਇਸ ਅਸਿਸਟੈਂਟ",
    title: "ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?",
    subtitle: "ਪੰਜਾਬੀ, ਅੰਗਰੇਜ਼ੀ ਜਾਂ ਹੋਰ ਭਾਰਤੀ ਭਾਸ਼ਾਵਾਂ ਵਿੱਚ ਸੁਭਾਵਿਕ ਗੱਲਬਾਤ ਕਰੋ।",
    startBtn: "ਸਲਾਹ ਸ਼ੁਰੂ ਕਰੋ",
    endBtn: "ਕਾਲ ਖਤਮ ਕਰੋ",
    liveTranscript: "ਲਾਈਵ ਲਿਖਤ",
    noTranscript: "ਗੱਲਬਾਤ ਸ਼ੁਰੂ ਹੋਣ 'ਤੇ ਤੁਹਾਡੀ ਲਿਖਤ ਇੱਥੇ ਦਿਖਾਈ ਦੇਵੇਗੀ।",
    quickInquiries: "ਤੁਰੰਤ ਪੁੱਛਗਿੱਛ",
    generalHealth: "ਆਮ ਸਿਹਤ",
    generalHealthDesc: "ਤੰਦਰੁਸਤੀ ਅਤੇ ਆਦਤਾਂ",
    wellnessTips: "ਵੈਲਨੈਸ ਸੁਝਾਅ",
    firstAid: "ਮੁੱਢਲੀ ਸਹਾਇਤਾ",
    doctorAdvice: "ਡਾਕਟਰ ਦੀ ਸਲਾਹ",
    ask: "ਪੁੱਛੋ",
    safetyHeader: "ਸੁਰੱਖਿਆ ਨੋਟਿਸ",
    safetyBody: "ਮੇਡੀਬਡੀ ਏਆਈ ਆਮ ਸਿਹਤ ਜਾਣਕਾਰੀ ਲਈ ਇੱਕ ਸਵੈਚਾਲਿਤ ਗਾਈਡ ਹੈ। ਇਹ ਡਾਕਟਰ ਨਹੀਂ ਹੈ, ਬਿਮਾਰੀਆਂ ਦਾ ਪਤਾ ਨਹੀਂ ਲਗਾ ਸਕਦਾ, ਅਤੇ ਦਵਾਈਆਂ ਨਹੀਂ ਲਿਖ ਸਕਦਾ। ਹਮੇਸ਼ਾ ਡਾਕਟਰੀ ਸਲਾਹ ਲਓ।",
    emergencyHeader: "ਐਮਰਜੈਂਸੀ ਨੋਟਿਸ",
    emergencyBody: "ਜੇਕਰ ਤੁਹਾਨੂੰ ਛਾਤੀ ਵਿੱਚ ਦਰਦ, ਸਾਹ ਲੈਣ ਵਿੱਚ ਤਕਲੀਫ਼, ਜਾਂ ਕੋਈ ਮੈਡੀਕਲ ਐਮਰਜੈਂਸੀ ਹੈ, ਤਾਂ ਕਿਰਪਾ ਕਰਕੇ ਤੁਰੰਤ 108 ਜਾਂ 112 'ਤੇ ਸੰਪਰਕ ਕਰੋ ਜਾਂ ਨੇੜਲੇ ਹਸਪਤਾਲ ਜਾਓ।",
    poweredBy: "ਮਰਫ ਫਾਲਕਨ ਦੁਆਰਾ ਸੰਚਾਲਿਤ — ਸਭ ਤੋਂ ਤੇਜ਼ TTS API",
    campaign: "10 ਦਿਨਾਂ ਦੇ AI ਵੌਇਸ ਏਜੰਟ — ਭਾਰਤ ਲਈ ਆਵਾਜ਼",
    settingsTitle: "ਸੈਟਿੰਗਾਂ ਅਤੇ ਵੇਰਵੇ",
    micInput: "ਮਾਈਕ੍ਰੋਫੋਨ ਇਨਪੁਟ",
    defaultInput: "ਸਿਸਟਮ ਡਿਫਾਲਟ ਇਨਪੁਟ",
    agentDetails: "ਏਜੰਟ ਵੇਰਵੇ",
    ttsText: "TTS: ਮਰਫ ਫਾਲਕਨ (ਮਾਤ੍ਰਭਾਸ਼ਾ ਆਵਾਜ਼)",
    closeSettings: "ਸੈਟਿੰਗਾਂ ਬੰਦ ਕਰੋ",
    connectedStatus: "ਕਨੈਕਟ ਹੋ ਗਿਆ",
    connectingStatus: "ਕਨੈਕਟ ਹੋ ਰਿਹਾ ਹੈ",
    endedStatus: "ਸਮਾਪਤ",
    readyStatus: "ਤਿਆਰ",
    tapToTalk: "ਗੱਲ ਕਰਨ ਲਈ ਮਾਈਕ੍ਰੋਫੋਨ 'ਤੇ ਟੈਪ ਕਰੋ",
    listening: "ਸੁਣ ਰਿਹਾ ਹਾਂ...",
    thinking: "ਸੋਚ ਰਿਹਾ ਹੈ...",
    speaking: "ਮੇਡੀਬਡੀ ਬੋਲ ਰਿਹਾ ਹੈ...",
    connectedReady: "ਕਨੈਕਟ ਹੋ ਗਿਆ। ਗੱਲ ਕਰਨ ਲਈ ਟੈਪ ਕਰੋ",
    welcomeTitle: "ਮੇਡੀਬਡੀ ਨਾਲ ਗੱਲ ਕਰੋ",
    welcomeSubtitle: "ਸਿਹਤ ਸਹਾਇਤਾ ਲਈ ਬਣਾਇਆ ਗਿਆ ਤੁਹਾਡਾ ਪਿਆਰਾ ਏਆਈ ਸਿਹਤ ਸਹਾਇਕ।",
    howIHelp: "ਮੈਂ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ:",
    help1: "ਸਿਹਤ ਅਤੇ ਖੁਰਾਕ ਸੰਬੰਧੀ ਸੁਝਾਅ ਦੇਣਾ",
    help2: "ਸਿਹਤਮੰਦ ਆਦਤਾਂ ਅਤੇ ਸਫਾਈ ਦੇ ਨਿਯਮ ਦੱਸਣਾ",
    help3: "ਆਮ ਡਾਕਟਰੀ ਸ਼ਬਦਾਂ ਦੀ ਵਿਆਖਿਆ ਕਰਨਾ",
    speaks: "🌐 ਪੰਜਾਬੀ, ਅੰਗਰੇਜ਼ੀ, ਹਿੰਦੀ ਅਤੇ ਹੋਰ ਭਾਰਤੀ ਭਾਸ਼ਾਵਾਂ ਬੋਲ ਸਕਦਾ ਹੈ"
  },
  Tamil: {
    headerSubtitle: "சுகாதார உதவி குரல் உதவியாளர்",
    title: "இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?",
    subtitle: "தமிழ், ஆங்கிலம் அல்லது பிற இந்திய மொழிகளில் இயல்பாகப் பேசுங்கள்.",
    startBtn: "ஆலோசனை தொடங்கு",
    endBtn: "அழைப்பை முடி",
    liveTranscript: "நேரடி உரையாடல் உரை",
    noTranscript: "உரையாடல் தொடங்கியவுடன் உங்கள் உரை இங்கே தோன்றும்.",
    quickInquiries: "விரைவான விசாரணைகள்",
    generalHealth: "பொது ஆரோக்கியம்",
    generalHealthDesc: "நல்வாழ்வு & பழக்கங்கள்",
    wellnessTips: "ஆரோக்கிய குறிப்புகள்",
    firstAid: "முதலுதவி",
    doctorAdvice: "மருத்துவர் ஆலோசனை",
    ask: "கேள்",
    safetyHeader: "பாதுகாப்பு அறிவிப்பு",
    safetyBody: "மெடிபடி ஏஐ பொதுவான சுகாதார தகவல்களுக்கான ஒரு தானியங்கி வழிகாட்டியாகும். இது மருத்துவர் அல்ல, நோய்களைக் கண்டறியவோ மருந்து பரிந்துரைக்கவோ முடியாது. எப்போதும் தகுதியான மருத்துவ ஆலோசனையைப் பெறவும்.",
    emergencyHeader: "அவசர அறிவிப்பு",
    emergencyBody: "நெஞ்சுவலி, மூச்சுத்திணறல், அல்லது கடுமையான அவசரநிலை ஏற்பட்டால், உடனடியாக 108 அல்லது 112 என்ற எண்ணைத் தொடர்பு கொள்ளவும் அல்லது அருகிலுள்ள மருத்துவமனைக்குச் செல்லவும்.",
    poweredBy: "மர்ப் ஃபால்கன் மூலம் இயக்கப்படுகிறது — மிக வேகமான TTS API",
    campaign: "10 நாட்கள் AI குரல் முகவர்கள் — வாய்ஸ் ஃபார் பாரத்",
    settingsTitle: "அமைப்புகள் & விவரங்கள்",
    micInput: "மைக்ரோஃபோன் உள்ளீடு",
    defaultInput: "இயல்புநிலை கணினி உள்ளீடு",
    agentDetails: "முகவர் விவரங்கள்",
    ttsText: "TTS: மர்ப் ஃபால்கன் (தாய்மொழி குரல்)",
    closeSettings: "அமைப்புகளை மூடு",
    connectedStatus: "இணைக்கப்பட்டது",
    connectingStatus: "இணைக்கப்படுகிறது",
    endedStatus: "முடிந்தது",
    readyStatus: "தயார்",
    tapToTalk: "பேசுவதற்கு மைக்ரோஃபோனைத் தட்டவும்",
    listening: "கேட்கிறது...",
    thinking: "யோசிக்கிறது...",
    speaking: "மெடிபடி பேசுகிறது...",
    connectedReady: "இணைக்கப்பட்டது. பேச தட்டவும்",
    welcomeTitle: "மெடிபடியுடன் பேசுங்கள்",
    welcomeSubtitle: "சுகாதார உதவிகாக உருவாக்கப்பட்ட உங்கள் அன்பான ஏஐ சுகாதார உதவியாளர்.",
    howIHelp: "நான் எப்படி உதவ முடியும்:",
    help1: "சுகாதாரம் மற்றும் ஊட்டச்சத்து குறிப்புகளை வழங்குவது",
    help2: "ஆரோக்கியமான பழக்கவழக்கங்கள் மற்றும் தூய்மை குறிப்புகளை பரிந்துரைப்பது",
    help3: "பொதுவான மருத்துவ சொற்களை விளக்குவது",
    speaks: "🌐 தமிழ், ஆங்கிலம், இந்தி மற்றும் பிற இந்திய மொழிகளைப் பேசும்"
  },
  Urdu: {
    headerSubtitle: "صحت کی معاونت کا صوتی معاون",
    title: "آج میں آپ کی کیا مدد کر سکتا ہوں؟",
    subtitle: "اردو، انگریزی یا دیگر ہندوستانی زبانوں میں بات کریں۔",
    startBtn: "مشورہ شروع کریں",
    endBtn: "کال ختم کریں",
    liveTranscript: "لائیو گفتگو کی تحریر",
    noTranscript: "گفتگو شروع ہونے پر آپ کی تحریر یہاں ظاہر ہوگی۔",
    quickInquiries: "فوری سوالات",
    generalHealth: "عام صحت",
    generalHealthDesc: "تندرستی اور عادات",
    wellnessTips: "صحت کے مشورے",
    firstAid: "ابتدائی طبی امداد",
    doctorAdvice: "ڈاکٹر کا مشورہ",
    ask: "پوچھیں",
    safetyHeader: "حفاظتی نوٹ",
    safetyBody: "میڈی بڈی اے آئی عام صحت کی معلومات کے لیے ایک خودکار گائیڈ ہے۔ یہ ڈاکٹر نہیں ہے, بیماریوں کی تشخیص نہیں کر سکتا، اور ادویات تجویز نہیں کر سکتا۔ ہمیشہ طبی مشورہ لیں۔",
    emergencyHeader: "ہنگامی نوٹ",
    emergencyBody: "اگر آپ کو سینے میں درد، سانس لینے میں دشواری، یا کوئی ہنگامی طبی صورتحال پیش ہو، تو فوری طور پر 108 یا 112 پر رابطہ کریں یا قریبی ہسپتال جائیں۔",
    poweredBy: "مرف فالکن کے ذریعے چلنے والا — تیز ترین TTS API",
    campaign: "10 دن AI وائس ایجنٹس — وائس فار بھارت",
    settingsTitle: "سیٹنگز اور تفصیلات",
    micInput: "مائیکروفون ان پٹ",
    defaultInput: "سسٹم ڈیفالٹ ان پٹ",
    agentDetails: "ایجنٹ کی تفصیلات",
    ttsText: "TTS: مرف فالکن (مادری زبان کی آواز)",
    closeSettings: "ترتیبات بند کریں",
    connectedStatus: "منسلک",
    connectingStatus: "منسلک ہو رہا ہے",
    endedStatus: "ختم ہو گیا",
    readyStatus: "تیار",
    tapToTalk: "بات کرنے کے لیے مائیکروفون پر ٹیپ کریں",
    listening: "سن رہا ہے...",
    thinking: "سوچ رہا ہے...",
    speaking: "میڈی بڈی بات کر رہا ہے...",
    connectedReady: "منسلک۔ بات کرنے کے لیے ٹیپ کریں",
    welcomeTitle: "میڈی بڈی سے بات کریں",
    welcomeSubtitle: "صحت کی معاونت کے لیے بنایا گیا آپ کا پیارا اے آئی صحت کا معاون۔",
    howIHelp: "میں کیسے مدد کر سکتا ہوں:",
    help1: "تندرستی اور غذا کے بارے میں مشورہ دینا",
    help2: "صحت مند عادات اور صفائی کے طریقے بتانا",
    help3: "عام طبی الفاظ کی وضاحت کرنا",
    speaks: "🌐 انگریزی، اردو، ہندی اور دیگر ہندوستانی زبانیں بول سکتا ہے"
  }
};

const LANGUAGES = [
  { name: 'Bengali', native: 'বাংলা' },
  { name: 'English', native: 'English' },
  { name: 'Gujarati', native: 'ગુજરાતી' },
  { name: 'Hindi', native: 'हिन्दी' },
  { name: 'Kannada', native: 'ಕನ್ನಡ' },
  { name: 'Malayalam', native: 'മലയാളം' },
  { name: 'Marathi', native: 'मराठी' },
  { name: 'Punjabi (Gurmukhi)', nameCode: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { name: 'Tamil', native: 'தமிழ்' },
  { name: 'Telugu', native: 'తెలుగు' },
  { name: 'Urdu', native: 'اردو' }
];

interface MediBuddyDashboardProps {
  startButtonText: string;
  onStartCall: () => void;
  hasEnded?: boolean;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
}

export function MediBuddyDashboard({
  startButtonText,
  onStartCall,
  hasEnded = false,
  selectedLanguage,
  setSelectedLanguage,
}: MediBuddyDashboardProps) {
  const session = useSessionContext();
  const { state: agentState } = useAgent();
  const { messages } = useSessionMessages(session);
  const { audioTrack } = useVoiceAssistant();
  const { send } = useChat();

  const [showSettings, setShowSettings] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Register listener for lk.agent.events topic packets to avoid browser console warnings
  useEffect(() => {
    if (!session?.room) return;
    const handleDataReceived = (_payload: Uint8Array, _participant: any, _kind: any, _topic?: string) => {};
    session.room.on('dataReceived', handleDataReceived);
    return () => {
      session.room.off('dataReceived', handleDataReceived);
    };
  }, [session?.room]);


  const [activeTab, setActiveTab] = useState<'transcript' | 'escalations'>('transcript');
  const [escalations, setEscalations] = useState<any[]>([]);

  const fetchEscalations = async () => {
    try {
      const res = await fetch('/api/escalations');
      if (res.ok) {
        const data = await res.json();
        setEscalations(data);
      }
    } catch (err) {
      console.error('Error fetching escalations:', err);
    }
  };

  useEffect(() => {
    fetchEscalations();
    const interval = setInterval(fetchEscalations, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/escalations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        fetchEscalations();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const isConnected = session.isConnected;
  const connectionState = session.connectionState;

  // Auto-scroll chat transcript to the bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Mute/Unmute toggle
  const toggleMute = () => {
    const localAudio = session.room.localParticipant.audioTrackPublications.values().next().value;
    if (localAudio) {
      if (micMuted) {
        localAudio.track?.unmute();
        setMicMuted(false);
      } else {
        localAudio.track?.mute();
        setMicMuted(true);
      }
    }
  };

  // Helper to translate key string based on selected language (Locked to English as requested)
  const t = (key: string): string => {
    const dict = TRANSLATIONS['English'];
    return dict[key] || key;
  };

  // Handle Quick Action click
  const handleQuickAction = async (prompt: string) => {
    if (!isConnected) {
      onStartCall();
    } else {
      try {
        await send(prompt);
      } catch (err) {
        console.error('Failed to send quick action:', err);
      }
    }
  };

  // Determine current interaction status text
  const getStatusText = () => {
    if (connectionState === ConnectionState.Connecting) {
      return t('connectingStatus') + '...';
    }
    if (!isConnected) {
      return t('tapToTalk');
    }
    switch (agentState) {
      case 'listening':
        return t('listening');
      case 'thinking':
        return t('thinking');
      case 'speaking':
        return t('speaking');
      default:
        return t('connectedReady');
    }
  };

  // Determine dynamic classes for the visual orb
  const getOrbStateClasses = () => {
    if (connectionState === ConnectionState.Connecting) {
      return "border-amber-400 bg-amber-500/10 shadow-amber-500/20";
    }
    if (!isConnected) {
      return "border-teal-500/20 bg-teal-500/5 shadow-teal-500/5 hover:border-teal-500/40 hover:bg-teal-500/10";
    }
    switch (agentState) {
      case 'listening':
        return "border-emerald-500 bg-emerald-500/10 shadow-emerald-500/30 animate-pulse";
      case 'speaking':
        return "border-indigo-500 bg-indigo-500/10 shadow-indigo-500/30 scale-105";
      case 'thinking':
        return "border-cyan-500 bg-cyan-500/10 shadow-cyan-500/30 rotate-glow";
      default:
        return "border-teal-500 bg-teal-500/10 shadow-teal-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 flex flex-col justify-between font-sans">
      
      {/* 1. Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-sm/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
            <Heart className="size-5 fill-current" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight leading-none text-slate-800">MediBuddy AI</h1>
            <p className="text-[10px] text-slate-500 font-medium mt-1">{t('headerSubtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection status indicator */}
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-xs transition-all",
            agentState === 'listening' && "bg-emerald-50 text-emerald-600 border-emerald-200",
            agentState === 'speaking' && "bg-indigo-50 text-indigo-600 border-indigo-200",
            agentState === 'thinking' && "bg-cyan-50 text-cyan-600 border-cyan-200",
            (!agentState || agentState === 'idle') && "bg-teal-50 text-teal-600 border-teal-200"
          )}>
            <span className={cn(
              "size-1.5 rounded-full",
              agentState === 'listening' && "bg-emerald-500 animate-pulse",
              agentState === 'speaking' && "bg-indigo-500 animate-ping",
              agentState === 'thinking' && "bg-cyan-500 animate-spin",
              (!agentState || agentState === 'idle') && "bg-teal-500"
            )} />
            <span>
              {agentState === 'listening' && "🎤 Listening"}
              {agentState === 'speaking' && "🔊 Speaking"}
              {agentState === 'thinking' && "Thinking"}
              {(!agentState || agentState === 'idle') && "Connected"}
            </span>
          </div>

          {/* Language Selector Dropdown */}
          <div className="relative">
            <Button
              id="language-selector-btn"
              variant="outline"
              size="sm"
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="rounded-full flex gap-1.5 items-center bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
            >
              <Globe className="size-3.5 text-teal-600" />
              <span>{selectedLanguage}</span>
            </Button>
            
            {langMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2 max-h-72 overflow-y-auto scrollbar-thin">
                {LANGUAGES.map((lang) => {
                  const displayName = lang.name;
                  const valueName = lang.nameCode || lang.name;
                  return (
                    <button
                      key={displayName}
                      id={`lang-option-${valueName}`}
                      onClick={() => {
                        setSelectedLanguage(valueName);
                        setLangMenuOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 transition-colors flex justify-between items-center font-medium",
                        selectedLanguage === valueName ? "text-teal-600 bg-teal-50/40 font-semibold" : "text-slate-700"
                      )}
                    >
                      <span>{displayName}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{lang.native}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Button 
            id="settings-toggle-btn"
            size="icon" 
            variant="ghost" 
            className="rounded-full hover:bg-slate-100 text-slate-500"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="size-4" />
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start flex-1">
        
        {/* Left Side: Hero Section & Voice Orb */}
        <section className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col items-center justify-between min-h-[500px]">
          {/* Hero Header */}
          <div className="text-center w-full max-w-lg mb-4">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
              {t('title')}
            </h2>
            <p className="text-slate-500 text-xs md:text-sm mt-2 font-medium">
              {t('subtitle')}
            </p>
          </div>

          {/* Orb & Microphone Section */}
          <div className="relative flex flex-col items-center justify-center py-6 w-full">
            {/* Holographic Sound Visualizer Aura */}
            {isConnected && (
              <div className="absolute inset-0 flex items-center justify-center scale-110 pointer-events-none">
                <AudioVisualizer
                  audioVisualizerType="aura"
                  audioVisualizerColor={
                    agentState === 'listening' ? "#10b981" : // emerald-500
                    agentState === 'speaking' ? "#6366f1" :  // indigo-500
                    agentState === 'thinking' ? "#06b6d4" :  // cyan-500
                    "#0d9488"                                // teal-600
                  }
                  audioVisualizerColorShift={0.1}
                  isChatOpen={false}
                  className="size-[320px] md:size-[380px]"
                />
              </div>
            )}

            {/* Visualizer Concentric Rings */}
            <div className={cn(
              "relative flex items-center justify-center size-52 md:size-60 rounded-full border-2 transition-all duration-500 shadow-xl",
              getOrbStateClasses()
            )}>
              {/* Outer pulsing ring in active state */}
              {isConnected && agentState === 'speaking' && (
                <div className="absolute inset-0 rounded-full bg-indigo-500/5 animate-ping scale-110" />
              )}
              {isConnected && agentState === 'listening' && (
                <div className="absolute inset-0 rounded-full bg-emerald-500/5 animate-ping scale-110" />
              )}

              {/* Doctor Avatar Image inside the Orb */}
              <div className="absolute size-36 md:size-44 rounded-full overflow-hidden border border-slate-100/30 bg-slate-50 shadow-inner">
                <img 
                  src="/medibuddy_avatar.png" 
                  alt="MediBuddy AI" 
                  className={cn(
                    "size-full object-cover transition-all duration-300",
                    agentState === 'thinking' && "brightness-95 contrast-95 animate-pulse",
                    !isConnected && "grayscale"
                  )}
                />
              </div>

              {/* Floating Action Button (Mic Toggle / Connect button) in the bottom right corner of the orb */}
              <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3 z-30">
                {!isConnected ? (
                  <Button
                    id="mic-action-btn"
                    onClick={onStartCall}
                    disabled={connectionState === ConnectionState.Connecting}
                    className="size-14 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/30 border-2 border-white hover:scale-105 transition-all"
                  >
                    {connectionState === ConnectionState.Connecting ? (
                      <Loader2 className="animate-spin size-6" />
                    ) : (
                      <Mic className="size-6 fill-current" />
                    )}
                  </Button>
                ) : (
                  <Button
                    id="mic-action-btn"
                    onClick={toggleMute}
                    className={cn(
                      "size-14 rounded-full shadow-lg border-2 border-white hover:scale-105 transition-all",
                      micMuted ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30" : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30"
                    )}
                  >
                    {micMuted ? <MicOff className="size-6" /> : <Mic className="size-6 fill-current" />}
                  </Button>
                )}
              </div>
            </div>

            {/* Interaction Status */}
            <div className="text-center mt-6 z-20">
              <p className={cn(
                "font-semibold text-sm tracking-wide transition-all",
                agentState === 'listening' && "text-emerald-600 font-bold",
                agentState === 'speaking' && "text-indigo-600 font-bold",
                agentState === 'thinking' && "text-cyan-600 font-bold animate-pulse",
                !isConnected && "text-slate-500"
              )}>
                {agentState === 'listening' && "🟢 " + t('listening')}
                {agentState === 'speaking' && "🟣 " + t('speaking')}
                {agentState === 'thinking' && t('thinking')}
                {(!agentState || agentState === 'idle') && (isConnected ? "🟢 Connected. Tap mic to speak" : t('tapToTalk'))}
              </p>
              
              {/* Pulse waveform while listening */}
              {isConnected && agentState === 'listening' && (
                <div className="flex justify-center items-center gap-1 mt-3.5 h-6">
                  {[...Array(6)].map((_, i) => (
                    <span 
                      key={i} 
                      className="bg-emerald-600/80 w-0.5 rounded-full animate-pulse"
                      style={{ 
                        height: `${40 + Math.sin(i) * 30}%`,
                        animationDuration: `${0.8}s`,
                        animationDelay: `${i * 0.15}s`,
                        animationIterationCount: 'infinite'
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Waveform while speaking */}
              {isConnected && agentState === 'speaking' && (
                <div className="flex justify-center items-center gap-1 mt-3.5 h-6">
                  {[...Array(6)].map((_, i) => (
                    <span 
                      key={i} 
                      className="bg-indigo-600/80 w-0.5 rounded-full animate-bounce"
                      style={{ 
                        height: `${20 + Math.random() * 80}%`,
                        animationDuration: `${0.4 + i * 0.15}s`,
                        animationIterationCount: 'infinite'
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* End Call Button when connected */}
          {isConnected && (
            <Button
              id="end-consultation-btn"
              variant="destructive"
              onClick={async () => {
                try {
                  await fetch('/api/calls', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      status: 'successful',
                      caller_name: 'Rashu',
                      channel: 'browser',
                      language: selectedLanguage,
                      triage_level: 'Routine',
                      duration_seconds: 45,
                      notes: 'Routine triage & health consultation completed'
                    })
                  });
                } catch (e) {}
                session.end();
              }}
              className="mt-4 px-6 rounded-full flex gap-2 items-center bg-rose-600 hover:bg-rose-700 font-semibold shadow-md shadow-rose-600/20"
            >
              <PhoneOff className="size-4" />
              {t('endBtn')}
            </Button>
          )}
        </section>

        {/* Right Side: Conversation Transcript & Guides */}
        <section className="lg:col-span-1 flex flex-col gap-6 w-full lg:sticky lg:top-6 lg:self-start">
          
          {/* Transcript Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col h-[500px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
              <div className="flex gap-2">
                <button
                  id="tab-btn-transcript"
                  onClick={() => setActiveTab('transcript')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                    activeTab === 'transcript' 
                      ? "bg-teal-600 text-white shadow-sm" 
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  <Activity className="size-3.5" />
                  <span>Transcript</span>
                </button>
                <button
                  id="tab-btn-escalations"
                  onClick={() => setActiveTab('escalations')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer relative",
                    activeTab === 'escalations' 
                      ? "bg-teal-600 text-white shadow-sm" 
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  <LifeBuoy className="size-3.5" />
                  <span>Escalations</span>
                  {escalations.filter(e => e.status === 'open').length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-bold size-4 flex items-center justify-center rounded-full animate-pulse border border-white">
                      {escalations.filter(e => e.status === 'open').length}
                    </span>
                  )}
                </button>
              </div>
            </div>
            
            {activeTab === 'transcript' ? (
              /* Chat Messages */
              <div 
                id="transcript-container"
                className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 scrollbar-thin"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-4">
                    <Volume2 className="size-8 text-slate-300 mb-2" />
                    <p className="text-xs">{t('noTranscript')}</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isUser = msg.from?.isLocal === true;
                    return (
                      <div 
                        key={msg.id} 
                        className={cn(
                          "flex flex-col max-w-[85%] text-xs rounded-2xl px-3 py-2.5 shadow-sm",
                          isUser 
                            ? "ml-auto bg-slate-100 text-slate-800 rounded-tr-none" 
                            : "bg-teal-50/50 border border-teal-500/10 text-teal-900 rounded-tl-none"
                        )}
                      >
                        <span className="font-bold text-[9px] uppercase tracking-wider opacity-60 mb-0.5">
                          {isUser ? "You" : "MediBuddy"}
                        </span>
                        <p className="leading-relaxed">{msg.message}</p>
                      </div>
                    );
                  })
                )}


                <div ref={transcriptEndRef} />
              </div>
            ) : (
              /* Escalations Panel */
              <div className="flex-1 overflow-y-auto space-y-3 pr-1.5 scrollbar-thin">
                {escalations.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-4">
                    <LifeBuoy className="size-8 text-slate-300 mb-2" />
                    <p className="text-xs">No active escalations. They will appear here if the agent requests human help.</p>
                  </div>
                ) : (
                  escalations.map((esc) => {
                    const getUrgencyBadge = (urgency: string) => {
                      const u = urgency.toLowerCase();
                      if (u === 'emergency') return 'bg-rose-500 text-white border-rose-600';
                      if (u === 'high') return 'bg-amber-500 text-white border-amber-600';
                      if (u === 'medium') return 'bg-yellow-500 text-yellow-950 border-yellow-600';
                      return 'bg-emerald-500 text-white border-emerald-600';
                    };
                    return (
                      <div 
                        key={esc.id} 
                        className={cn(
                          "flex flex-col gap-2 border rounded-2xl p-3.5 shadow-xs transition-all text-xs bg-slate-50/60 border-slate-100",
                          esc.status === 'open' && "border-l-4 border-l-rose-500 bg-rose-50/5 border-slate-200/60",
                          esc.status === 'in_progress' && "border-l-4 border-l-amber-500 bg-amber-50/5 border-slate-200/60",
                          esc.status === 'resolved' && "opacity-75 grayscale border-l-4 border-l-slate-400 bg-slate-100/40"
                        )}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-extrabold text-slate-700 uppercase tracking-wide text-[9px]">
                            {esc.id}
                          </span>
                          <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase border tracking-wider", getUrgencyBadge(esc.urgency))}>
                            {esc.urgency}
                          </span>
                        </div>

                        <div className="space-y-1 mt-1 text-slate-700">
                          <div>
                            <strong>Caller:</strong> <span className="font-semibold text-slate-800">{esc.caller_name || 'Anonymous'}</span>
                          </div>
                          <div>
                            <strong>Symptoms:</strong> <span className="text-slate-600">{esc.symptoms}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            <strong>Checked:</strong> {esc.what_agent_checked}
                          </div>
                          <div className="flex gap-3 text-[10px] text-slate-500 mt-1 pt-1.5 border-t border-slate-200/60">
                            <span>📞 {esc.preferred_followup}</span>
                            <span>🌐 {esc.language}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-200/40 justify-end shrink-0">
                          {esc.status === 'open' && (
                            <>
                              <button 
                                className="h-6 text-[10px] px-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-semibold cursor-pointer"
                                onClick={() => handleUpdateStatus(esc.id, 'in_progress')}
                              >
                                In Progress
                              </button>
                              <button 
                                className="h-6 text-[10px] px-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold cursor-pointer"
                                onClick={() => handleUpdateStatus(esc.id, 'resolved')}
                              >
                                Resolve
                              </button>
                            </>
                          )}
                          {esc.status === 'in_progress' && (
                            <button 
                              className="h-6 text-[10px] px-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold cursor-pointer"
                              onClick={() => handleUpdateStatus(esc.id, 'resolved')}
                            >
                              Resolve
                            </button>
                          )}
                          {esc.status === 'resolved' && (
                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                              ✓ Resolved
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-3 mb-3">
              {t('quickInquiries')}
            </h3>
            <div className="grid grid-cols-2 gap-3.5">
              <button 
                id="quick-action-general-health"
                onClick={() => handleQuickAction("Can you give me some general health tips?")}
                className="flex flex-col items-start text-left p-3.5 rounded-2xl bg-teal-50/20 border border-teal-500/5 hover:border-teal-500/20 hover:bg-teal-50/40 transition group"
              >
                <Stethoscope className="size-5 text-teal-600 mb-2" />
                <span className="font-bold text-xs text-slate-800">{t('generalHealth')}</span>
                <span className="text-[10px] text-slate-500 mt-0.5 group-hover:text-teal-600 flex items-center gap-0.5">
                  {t('ask')} <ChevronRight className="size-3" />
                </span>
              </button>

              <button 
                id="quick-action-wellness-tips"
                onClick={() => handleQuickAction("What are some simple daily wellness tips?")}
                className="flex flex-col items-start text-left p-3.5 rounded-2xl bg-teal-50/20 border border-teal-500/5 hover:border-teal-500/20 hover:bg-teal-50/40 transition group"
              >
                <Sparkles className="size-5 text-teal-600 mb-2" />
                <span className="font-bold text-xs text-slate-800">{t('wellnessTips')}</span>
                <span className="text-[10px] text-slate-500 mt-0.5 group-hover:text-teal-600 flex items-center gap-0.5">
                  {t('ask')} <ChevronRight className="size-3" />
                </span>
              </button>

              <button 
                id="quick-action-first-aid"
                onClick={() => handleQuickAction("What first aid steps should I know?")}
                className="flex flex-col items-start text-left p-3.5 rounded-2xl bg-teal-50/20 border border-teal-500/5 hover:border-teal-500/20 hover:bg-teal-50/40 transition group"
              >
                <LifeBuoy className="size-5 text-teal-600 mb-2" />
                <span className="font-bold text-xs text-slate-800">{t('firstAid')}</span>
                <span className="text-[10px] text-slate-500 mt-0.5 group-hover:text-teal-600 flex items-center gap-0.5">
                  {t('ask')} <ChevronRight className="size-3" />
                </span>
              </button>

              <button 
                id="quick-action-doctor-advice"
                onClick={() => handleQuickAction("When should I consult a doctor?")}
                className="flex flex-col items-start text-left p-3.5 rounded-2xl bg-teal-50/20 border border-teal-500/5 hover:border-teal-500/20 hover:bg-teal-50/40 transition group"
              >
                <AlertTriangle className="size-5 text-teal-600 mb-2" />
                <span className="font-bold text-xs text-slate-800">{t('doctorAdvice')}</span>
                <span className="text-[10px] text-slate-500 mt-0.5 group-hover:text-teal-600 flex items-center gap-0.5">
                  {t('ask')} <ChevronRight className="size-3" />
                </span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Notices Section (Safety & Emergency) */}
      <section className="bg-slate-100/80 border-t border-slate-200/50 py-6 px-4 md:px-8 mt-8 shrink-0">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
          {/* 5. Safety Notice */}
          <div className="flex gap-3 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-slate-700">
            <Info className="size-5 text-teal-600 shrink-0 mt-0.5" />
            <p>
              <strong>{t('safetyHeader')}:</strong> {t('safetyBody')}
            </p>
          </div>

          {/* 6. Emergency Section */}
          <div className="flex gap-3 bg-rose-500/5 border border-rose-200 rounded-2xl p-4 shadow-sm text-rose-950 dark:text-rose-300">
            <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
            <p>
              <strong>{t('emergencyHeader')}:</strong> {t('emergencyBody')}
            </p>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 px-4 md:px-8 text-center text-xs shrink-0 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <p>{t('poweredBy')}</p>
          <p className="font-medium text-slate-300">{t('campaign')}</p>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-md font-bold text-[10px] uppercase">
              Health Access
            </span>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-100 shadow-2xl relative"
            >
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-4 right-4 rounded-full text-slate-400 hover:bg-slate-100"
                onClick={() => setShowSettings(false)}
              >
                <X className="size-4" />
              </Button>

              <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                <Settings className="size-5 text-teal-600" />
                {t('settingsTitle')}
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[9px] mb-1.5">{t('micInput')}</h4>
                  <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl font-medium text-slate-700 flex justify-between items-center">
                    <span>{t('defaultInput')}</span>
                    <span className="size-2 rounded-full bg-emerald-500" />
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[9px] mb-1.5">{t('agentDetails')}</h4>
                  <ul className="space-y-2 p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-slate-700 font-medium list-inside list-disc">
                    <li>{t('ttsText')}</li>
                    <li>{t('vadLabel') || "VAD: Silero Voice Activity Detector"}</li>
                    <li>{t('llmLabel') || "LLM: Google Gemini 3.5 Flash Lite"}</li>
                    <li>{t('langSupport') || "Language: 11 Indian Languages"}</li>
                  </ul>
                </div>
              </div>

              <Button
                onClick={() => setShowSettings(false)}
                className="w-full mt-6 rounded-full bg-teal-600 hover:bg-teal-700 font-semibold"
              >
                {t('closeSettings')}
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
