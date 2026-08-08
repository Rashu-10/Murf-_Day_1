import React from 'react';
import { Heart, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

function MediBuddyLogo() {
  return (
    <div className="relative mb-6 flex items-center justify-center">
      {/* Outer pulsing ring */}
      <div className="absolute inset-0 rounded-full bg-teal-500/10 animate-ping size-16 scale-125" />
      {/* Inner glowing circle */}
      <div className="relative flex items-center justify-center size-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 shadow-md shadow-teal-500/20 text-white">
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
    <div ref={ref} className="w-full max-w-md mx-auto px-6 py-8">
      <section className="bg-background flex flex-col items-center justify-center text-center">
        <MediBuddyLogo />

        {hasEnded ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Consultation Completed
            </h1>
            <p className="text-muted-foreground text-sm mt-3 leading-relaxed max-w-sm">
              Thank you for speaking with MediBuddy. I hope our session was helpful!
            </p>
            <div className="bg-teal-500/5 border border-teal-500/10 rounded-2xl p-4 mt-6 text-xs text-left text-teal-800 dark:text-teal-300">
              <div className="flex gap-2.5 items-start">
                <Activity className="size-4 shrink-0 text-teal-500 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Important Disclaimer:</strong> I am an AI health assistant, not a doctor. I cannot diagnose diseases or prescribe medicines. Please consult a qualified doctor for any medical conditions.
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Talk with MediBuddy
            </h1>
            <p className="text-muted-foreground text-sm mt-2 leading-relaxed max-w-sm">
              Your warm, empathetic AI health assistant built for the Health Access track.
            </p>
            
            <div className="bg-muted/40 border border-muted/80 rounded-2xl p-4 text-left w-full mt-6 space-y-2 text-xs text-foreground/80">
              <p className="font-semibold text-foreground/90">How I can help you:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Provide wellness and nutrition tips</li>
                <li>Suggest healthy habits and hygiene tips</li>
                <li>Explain general medical terms</li>
              </ul>
              <p className="pt-2 text-[10px] text-muted-foreground border-t border-muted-foreground/10">
                🌐 Speaks English, Telugu (Tanglish) and Hindi (Hinglish)
              </p>
            </div>
          </>
        )}

        <Button
          size="lg"
          onClick={onStartCall}
          className="mt-8 w-full rounded-full font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-500/15 tracking-wide transition-all hover:scale-[1.02]"
        >
          {hasEnded ? "Start New Consultation" : startButtonText}
        </Button>
      </section>

      <div className="mt-12 text-center">
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Need help? Check out the{' '}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://docs.livekit.io/agents/start/voice-ai/"
            className="underline hover:text-foreground transition-colors"
          >
            Voice AI quickstart
          </a>
          .
        </p>
      </div>
    </div>
  );
};

