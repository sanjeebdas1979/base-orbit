"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="flex flex-col items-center text-center">
      <div className="relative mb-8 flex h-40 w-40 items-center justify-center">
        {/* Outer glow */}
        <motion.div
          className="absolute h-36 w-36 rounded-full bg-blue-500/20 blur-3xl"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.45, 0.8, 0.45],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Outer orbit ring */}
        <motion.div
          className="absolute h-36 w-36 rounded-full border border-blue-400/25"
          animate={{ rotate: 360 }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <div className="absolute left-1/2 top-[-4px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-blue-300 shadow-[0_0_18px_rgba(147,197,253,0.9)]" />
        </motion.div>

        {/* Inner orbit ring */}
        <motion.div
          className="absolute h-28 w-28 rounded-full border border-white/10"
          animate={{ rotate: -360 }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <div className="absolute bottom-[-3px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-white/80 shadow-[0_0_14px_rgba(255,255,255,0.8)]" />
        </motion.div>

        {/* Core */}
        <motion.div
          className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#4B8CFF] via-[#1D6FFF] to-[#0052FF] shadow-[0_0_55px_rgba(0,82,255,0.75)]"
          animate={{
            scale: [1, 1.06, 1],
            boxShadow: [
              "0 0 45px rgba(0,82,255,0.55)",
              "0 0 85px rgba(0,82,255,0.9)",
              "0 0 45px rgba(0,82,255,0.55)",
            ],
          }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="h-9 w-9 rounded-full bg-white shadow-[0_0_24px_rgba(255,255,255,0.85)]" />
        </motion.div>
      </div>

      <motion.h1
        className="text-4xl font-black tracking-[0.28em] text-white sm:text-5xl"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        BASE ORBIT
      </motion.h1>

      <motion.p
        className="mt-5 text-sm leading-6 text-slate-400 sm:text-base"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.7 }}
      >
        Survive the Block.
        <br />
        Own the Streak.
      </motion.p>
    </section>
  );
}