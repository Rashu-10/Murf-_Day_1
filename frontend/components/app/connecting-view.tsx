'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export function ConnectingView() {
  return (
    <section className="bg-background flex flex-col items-center justify-center text-center px-4">
      {/* Calm breathing animated concentric rings */}
      <div className="relative flex items-center justify-center size-48 mb-8">
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.15, 0.4, 0.15],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-full bg-teal-500/20"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute size-36 rounded-full bg-teal-500/30"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="relative flex items-center justify-center size-24 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-400 shadow-lg shadow-teal-500/20 text-white"
        >
          <Loader2 className="animate-spin size-8" />
        </motion.div>
      </div>

      <h2 className="text-xl font-bold text-foreground tracking-tight">
        Connecting to MediBuddy
      </h2>
      <p className="text-muted-foreground text-sm max-w-sm mt-2 leading-relaxed">
        Please wait while we secure your private, encrypted voice connection...
      </p>
    </section>
  );
}
