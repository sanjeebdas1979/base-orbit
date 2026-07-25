"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type LeaderboardScore = {
  wallet_address: string;
  score: number;
  level: number;
  created_at: string;
};

type LeaderboardResponse = {
  dayId?: number;
  scores?: LeaderboardScore[];
  error?: string;
};

function shortenAddress(address: string) {
  return `${address.slice(
    0,
    6,
  )}...${address.slice(-4)}`;
}

function getRankSymbol(rank: number) {
  if (rank === 1) {
    return "🥇";
  }

  if (rank === 2) {
    return "🥈";
  }

  if (rank === 3) {
    return "🥉";
  }

  return `#${rank}`;
}

export default function DailyLeaderboard() {
  const [scores, setScores] = useState<
    LeaderboardScore[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const loadLeaderboard =
    useCallback(async () => {
      try {
        const response = await fetch(
          "/api/scores",
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result =
          (await response.json()) as LeaderboardResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Leaderboard could not be loaded.",
          );
        }

        setScores(result.scores ?? []);
        setError("");
        setLastUpdated(new Date());
      } catch (loadError) {
        console.error(
          "Leaderboard request failed:",
          loadError,
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Leaderboard could not be loaded.",
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadLeaderboard();

    const refreshTimer =
      window.setInterval(() => {
        void loadLeaderboard();
      }, 10_000);

    return () => {
      window.clearInterval(
        refreshTimer,
      );
    };
  }, [loadLeaderboard]);

  return (
    <section className="w-full rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-blue-300">
            Daily Rankings
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            Top Orbit Pilots
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            void loadLeaderboard();
          }}
          disabled={isLoading}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:border-blue-400/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading
            ? "Loading..."
            : "Refresh"}
        </button>
      </div>

      <div className="mt-5 h-px bg-white/10" />

      {isLoading &&
      scores.length === 0 ? (
        <div className="py-10 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-400/20 border-t-blue-400" />

          <p className="mt-4 text-sm text-slate-400">
            Loading today&apos;s pilots...
          </p>
        </div>
      ) : error ? (
        <div className="py-8 text-center">
          <p className="text-sm text-red-300">
            {error}
          </p>

          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              void loadLeaderboard();
            }}
            className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200"
          >
            Try Again
          </button>
        </div>
      ) : scores.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-3xl">
            🛰️
          </p>

          <h3 className="mt-3 font-bold text-white">
            No pilots ranked yet
          </h3>

          <p className="mt-2 text-sm text-slate-400">
            Become today&apos;s first
            ranked pilot.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {scores.map(
            (entry, index) => {
              const rank = index + 1;

              return (
                <div
                  key={
                    entry.wallet_address
                  }
                  className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                >
                  <div className="text-lg font-black text-white">
                    {getRankSymbol(
                      rank,
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold text-slate-200">
                      {shortenAddress(
                        entry.wallet_address,
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Level{" "}
                      {entry.level}
                    </p>
                  </div>

                  <p className="text-xl font-black text-blue-300">
                    {entry.score}
                  </p>
                </div>
              );
            },
          )}
        </div>
      )}

      {lastUpdated && (
        <p className="mt-4 text-center text-xs text-slate-500">
          Updates automatically every
          10 seconds
        </p>
      )}
    </section>
  );
}