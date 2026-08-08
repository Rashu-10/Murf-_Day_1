'use client';

import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MicPermissionErrorViewProps {
  onRetry: () => void;
}

export function MicPermissionErrorView({ onRetry }: MicPermissionErrorViewProps) {
  return (
    <section className="bg-background flex flex-col items-center justify-center text-center px-6 max-w-md mx-auto h-full">
      <div className="flex items-center justify-center size-20 rounded-full bg-destructive/10 text-destructive mb-6 shadow-sm">
        <ShieldAlert className="size-10" />
      </div>

      <h2 className="text-xl font-bold text-foreground tracking-tight">
        Microphone Access Blocked
      </h2>
      
      <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
        MediBuddy is a voice assistant and needs your microphone to hear and respond to you. Please enable access:
      </p>

      <div className="bg-muted/40 border border-muted/80 rounded-2xl p-4 text-left w-full mt-6 space-y-3.5 text-xs text-foreground/90">
        <div className="flex gap-3 items-start">
          <span className="flex items-center justify-center size-5 rounded-full bg-teal-500/10 text-teal-600 font-bold shrink-0">1</span>
          <p className="leading-relaxed">
            Click the <strong>lock 🔒 or settings icon</strong> next to the website URL in your browser's address bar.
          </p>
        </div>
        <div className="flex gap-3 items-start">
          <span className="flex items-center justify-center size-5 rounded-full bg-teal-500/10 text-teal-600 font-bold shrink-0">2</span>
          <p className="leading-relaxed">
            Find the <strong>Microphone</strong> permission and toggle it to <strong>Allow</strong>.
          </p>
        </div>
        <div className="flex gap-3 items-start">
          <span className="flex items-center justify-center size-5 rounded-full bg-teal-500/10 text-teal-600 font-bold shrink-0">3</span>
          <p className="leading-relaxed">
            After updating, click the button below to re-verify and connect.
          </p>
        </div>
      </div>

      <Button
        size="lg"
        onClick={onRetry}
        className="mt-8 w-full rounded-full font-semibold bg-teal-600 hover:bg-teal-700 text-white flex gap-2 items-center justify-center shadow-lg shadow-teal-500/10"
      >
        <RefreshCw className="size-4" />
        Try Again
      </Button>
    </section>
  );
}
