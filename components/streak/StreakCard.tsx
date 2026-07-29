"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type StreakCardProps = {
  walletAddress: string;
};

type StreakResponse = {
  currentStreak?: number;
  longestStreak?: number;
  playedToday?: boolean;
  nextMilestone?: number | null;
  daysToNextMilestone?: number;
  error?: string;
};

function getRewardName(
  milestone: number | null,
) {
  if (milestone === 3) {
    return "Cyan Trail";
  }

  if (milestone === 7) {
    return "Golden Core";
  }

  if (milestone === 14) {
    return "Neon Pilot";
  }

  if (milestone === 30) {
    return "Genesis Orbit";
  }

  if (milestone === 60) {
    return "Elite Voyager";
  }

  if (milestone === 100) {
    return "Orbit Legend";
  }

  return "All streak rewards unlocked";
}

function getProgressPercentage(
  currentStreak: number,
  nextMilestone: number | null,
) {
  if (nextMilestone === null) {
    return 100;
  }

  const previousMilestones = [
    0,
    3,
    7,
    14,
    30,
    60,
  ];

  const previousMilestone =
    previousMilestones
      .filter(
        (milestone) =>
          milestone < nextMilestone,
      )
      .at(-1) ?? 0;

  const progress =
    ((currentStreak -
      previousMilestone) /
      (nextMilestone -
        previousMilestone)) *
    100;

  return Math.min(
    Math.max(progress, 0),
    100,
  );
}

export default function StreakCard({
  walletAddress,
}: StreakCardProps) {
  const [currentStreak, setCurrentStreak] =
    useState(0);

  const [longestStreak, setLongestStreak] =
    useState(0);

  const [playedToday, setPlayedToday] =
    useState(false);

  const [nextMilestone, setNextMilestone] =
    useState<number | null>(3);

  const [
    daysToNextMilestone,
    setDaysToNextMilestone,
  ] = useState(3);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] = useState("");

  const loadStreak =
    useCallback(async () => {
      try {
        const response = await fetch(
          `/api/streaks?walletAddress=${encodeURIComponent(
            walletAddress,
          )}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result =
          (await response.json()) as StreakResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Streak could not be loaded.",
          );
        }

        setCurrentStreak(
          result.currentStreak ?? 0,
        );

        setLongestStreak(
          result.longestStreak ?? 0,
        );

        setPlayedToday(
          result.playedToday ?? false,
        );

        setNextMilestone(
          result.nextMilestone ?? null,
        );

        setDaysToNextMilestone(
          result.daysToNextMilestone ?? 0,
        );

        setError("");
      } catch (loadError) {
        console.error(
          "Streak request failed:",
          loadError,
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Streak could not be loaded.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [walletAddress]);

  useEffect(() => {
    void loadStreak();

    const refreshTimer =
      window.setInterval(() => {
        void loadStreak();
      }, 10_000);

    const handleWindowFocus = () => {
      void loadStreak();
    };

    window.addEventListener(
      "focus",
      handleWindowFocus,
    );

    return () => {
      window.clearInterval(
        refreshTimer,
      );

      window.removeEventListener(
        "focus",
        handleWindowFocus,
      );
    };
  }, [loadStreak]);

  const progressPercentage =
    getProgressPercentage(
      currentStreak,
      nextMilestone,
    );

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-orange-400/20 bg-orange-500/5 p-5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-orange-400/20 border-t-orange-300" />

          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-orange-300">
              Pilot Streak
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Loading Ranked progress...
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-400/20 bg-red-500/5 p-5 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.24em] text-red-300">
          Streak Unavailable
        </p>

        <p className="mt-2 text-sm text-slate-400">
          {error}
        </p>

        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            void loadStreak();
          }}
          className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200"
        >
          Try Again
        </button>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-orange-400/20 bg-gradient-to-br from-orange-500/10 via-white/[0.04] to-blue-500/10 p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-orange-300">
            Ranked Pilot Streak
          </p>

          <h2 className="mt-2 text-xl font-black text-white">
            Keep the Orbit Alive
          </h2>
        </div>

        <div
          className={`rounded-full border px-3 py-1 text-xs font-bold ${
            playedToday
              ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
              : "border-orange-400/20 bg-orange-500/10 text-orange-200"
          }`}
        >
          {playedToday
            ? "✓ Played Today"
            : "Play Today"}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
          <p className="text-3xl">
            🔥
          </p>

          <p className="mt-2 text-3xl font-black text-white">
            {currentStreak}
          </p>

          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
            Current Streak
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
          <p className="text-3xl">
            🏆
          </p>

          <p className="mt-2 text-3xl font-black text-blue-300">
            {longestStreak}
          </p>

          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
            Best Streak
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Next Cosmetic
            </p>

            <p className="mt-1 font-bold text-white">
              {getRewardName(
                nextMilestone,
              )}
            </p>
          </div>

          {nextMilestone !== null && (
            <p className="shrink-0 text-sm font-black text-orange-300">
              {currentStreak}/
              {nextMilestone}
            </p>
          )}
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-yellow-300 transition-all duration-700"
            style={{
              width: `${progressPercentage}%`,
            }}
          />
        </div>

        <p className="mt-3 text-xs text-slate-400">
          {nextMilestone === null
            ? "Every current streak reward has been unlocked."
            : daysToNextMilestone === 1
              ? "One more Ranked day to unlock this reward."
              : `${daysToNextMilestone} Ranked days remaining.`}
        </p>
      </div>

      {!playedToday && (
        <p className="mt-4 text-center text-xs text-orange-200/80">
          Complete one Ranked run before the
          next UTC reset to continue your
          streak.
        </p>
      )}
    </section>
  );
}