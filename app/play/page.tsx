"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import AppContainer from "@/components/layout/AppContainer";
import PlayGate from "@/components/game/PlayGate";
import DailyLeaderboard from "@/components/leaderboard/DailyLeaderboard";

export default function PlayPage() {
  const searchParams = useSearchParams();

  const isRanked =
    searchParams.get("mode") === "ranked";

  return (
    <AppContainer>
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:border-blue-400/30 hover:text-white"
        >
          ← Home
        </Link>

        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.28em] text-blue-300">
            Base Orbit
          </p>

          <h1 className="mt-1 text-2xl font-black text-white">
            Orbit Arena
          </h1>
        </div>
      </div>

      <PlayGate />

      {isRanked && <DailyLeaderboard />}
    </AppContainer>
  );
}