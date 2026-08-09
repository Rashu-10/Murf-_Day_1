'use client';

import { useState, useEffect } from 'react';
import { useSessionContext } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import type { AppConfig } from '@/app-config';
import { MediBuddyDashboard } from '@/components/app/medibuddy-dashboard';
import { MicPermissionErrorView } from '@/components/app/mic-permission-error-view';
import { WelcomeView } from '@/components/app/welcome-view';
import { ConnectingView } from '@/components/app/connecting-view';
import { AnimatePresence, motion } from 'motion/react';

const MotionMicErrorView = motion.create(MicPermissionErrorView);
const MotionDashboard = motion.create(MediBuddyDashboard);

const VIEW_MOTION_PROPS = {
  variants: {
    visible: {
      opacity: 1,
    },
    hidden: {
      opacity: 0,
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.4,
    ease: 'easeInOut',
  },
};

interface ViewControllerProps {
  appConfig: AppConfig;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
}

export function ViewController({ 
  appConfig,
  selectedLanguage,
  setSelectedLanguage,
}: ViewControllerProps) {
  const session = useSessionContext();
  const { isConnected, start, connectionState } = session;
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);
  const [micError, setMicError] = useState<'blocked' | 'error' | null>(null);

  // Mark if we successfully connected once during this session
  useEffect(() => {
    if (isConnected) {
      setHasConnectedOnce(true);
    }
  }, [isConnected]);

  // Request mic permission and begin the session connection
  const handleStartCall = async () => {
    setMicError(null);

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());

        setHasConnectedOnce(false);
        await start();
      } catch (err: any) {
        console.error('Microphone permission check failed:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setMicError('blocked');
        } else {
          setMicError('error');
        }
      }
    } else {
      setHasConnectedOnce(false);
      await start();
    }
  };

  const isConnecting = (connectionState as string) === 'connecting' || (connectionState as string) === ConnectionState.Connecting;

  return (
    <AnimatePresence mode="wait">
      {micError !== null ? (
        <MotionMicErrorView
          key="mic-error"
          {...VIEW_MOTION_PROPS}
          onRetry={handleStartCall}
        />
      ) : isConnecting ? (
        <motion.div key="connecting" className="w-full h-full flex items-center justify-center" {...VIEW_MOTION_PROPS}>
          <ConnectingView />
        </motion.div>
      ) : isConnected ? (
        <MotionDashboard
          key="dashboard"
          {...VIEW_MOTION_PROPS}
          startButtonText={appConfig.startButtonText}
          onStartCall={handleStartCall}
          hasEnded={hasConnectedOnce}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
        />
      ) : (
        <motion.div key="welcome" className="w-full h-full flex items-center justify-center" {...VIEW_MOTION_PROPS}>
          <WelcomeView
            startButtonText={appConfig.startButtonText}
            onStartCall={handleStartCall}
            hasEnded={hasConnectedOnce}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

