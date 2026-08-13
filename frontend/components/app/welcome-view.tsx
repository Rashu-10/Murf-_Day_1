import React from 'react';
import { Heart, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavbarHeader } from '@/components/app/navbar-header';

function MediBuddyLogo() {
  return (
    <div className="relative mb-6 flex items-center justify-center">
      {/* Outer pulsing ring */}
      <div className="absolute inset-0 rounded-full bg-[#16A34A]/10 animate-ping size-16 scale-125" />
      {/* Inner glowing circle */}
      <div className="relative flex items-center justify-center size-16 rounded-2xl bg-gradient-to-tr from-[#16A34A] to-emerald-400 shadow-md shadow-emerald-500/20 text-white">
        <Heart className="size-8 fill-current animate-pulse text-white" />
      </div>
    </div>
  );
}

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
  hasEnded?: boolean;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  hasEnded = false,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  return (
    <div ref={ref} className="w-full min-h-screen bg-[#F4F6F9] text-slate-800 flex flex-col">
      <NavbarHeader activeTab="home" />
      <div className="flex-1 max-w-md mx-auto px-6 py-8 flex flex-col justify-center">
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center">
          <MediBuddyLogo />

          {hasEnded ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Consultation Completed
              </h1>
              <p className="text-slate-500 text-sm mt-3 leading-relaxed max-w-sm">
                Thank you for speaking with MediBuddy (मेडिबडी). I hope our session was helpful!
              </p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mt-6 text-xs text-left text-emerald-800">
                <div className="flex gap-2.5 items-start">
                  <Activity className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Important Disclaimer:</strong> I am an AI health assistant, not a doctor. I cannot diagnose diseases or prescribe medicines. Please consult a qualified doctor for any medical conditions.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Talk with MediBuddy
              </h1>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed max-w-sm">
                Your warm, empathetic AI health assistant built for the Health Access track.
              </p>
              
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left w-full mt-6 space-y-2 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">How I can help you:</p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>Symptom triage & emergency classification</li>
                  <li>Find nearest Primary Health Centre & Hospitals</li>
                  <li>Wellness tips & health guidance</li>
                </ul>
                <p className="pt-2 text-[10px] text-slate-400 border-t border-slate-200">
                  🌐 Speaks English, Hindi, Telugu, Kannada, Tamil, Bengali and other Indian languages
                </p>
              </div>
            </>
          )}

          <Button
            size="lg"
            onClick={onStartCall}
            className="mt-8 w-full rounded-full font-semibold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-md tracking-wide transition-all hover:scale-[1.02]"
          >
            {hasEnded ? "Start New Consultation" : startButtonText}
          </Button>

          <a 
            href="/dashboard" 
            className="mt-3 w-full inline-flex items-center justify-center py-2.5 px-4 rounded-full text-xs font-semibold bg-[#003B73] hover:bg-[#002855] text-white transition-all shadow-xs"
          >
            📊 View Call Performance Dashboard
          </a>
        </section>

        <div className="mt-8 text-center">
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Need help? Check out the{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://docs.livekit.io/agents/start/voice-ai/"
              className="underline hover:text-slate-600 transition-colors"
            >
              Voice AI quickstart
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};


