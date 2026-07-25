"use client";

import { useEffect, useState } from "react";
import { useWatchBlockNumber } from "wagmi";

type TimeLeft = {
  hours: number;
  minutes: number;
  seconds: number;
};

function getTimeUntilUtcReset(): TimeLeft {
  const now = new Date();

  const nextReset = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
    ),
  );

  const difference = Math.max(
    0,
    nextReset.getTime() - now.getTime(),
  );

  return {
    hours: Math.floor(difference / (1000 * 60 * 60)),
    minutes: Math.floor(
      (difference % (1000 * 60 * 60)) / (1000 * 60),
    ),
    seconds: Math.floor(
      (difference % (1000 * 60)) / 1000,
    ),
  };
}

function formatNumber(value: number) {
  return value.toString().padStart(2, "0");
}

export default function DailyCard() {
  const [timeLeft, setTimeLeft] =
    useState<TimeLeft | null>(null);

  const [blockNumber, setBlockNumber] =
    useState<bigint | undefined>();

  useWatchBlockNumber({
    chainId: 8453,
    emitOnBegin: true,
    onBlockNumber(number) {
      setBlockNumber(number);
    },
  });

  useEffect(() => {
    const updateCountdown = () => {
      setTimeLeft(getTimeUntilUtcReset());
    };

    updateCountdown();

    const timer = window.setInterval(
      updateCountdown,
      1000,
    );

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="w-full rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Latest Block
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            {blockNumber
              ? `#${blockNumber.toLocaleString("en-US")}`
              : "Loading..."}
          </h2>
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Resets In
          </p>

          <p className="mt-2 font-mono text-xl font-bold text-blue-300">
            {timeLeft
              ? `${formatNumber(timeLeft.hours)}:${formatNumber(
                  timeLeft.minutes,
                )}:${formatNumber(timeLeft.seconds)}`
              : "--:--:--"}
          </p>
        </div>
      </div>

      <div className="mt-5 h-px bg-white/10" />

      <div className="mt-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Daily Orbit
          </p>

          <p className="mt-1 text-sm text-slate-300">
            One challenge for every pilot
          </p>
        </div>

        <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
          Mainnet
        </span>
      </div>
    </section>
  );
}