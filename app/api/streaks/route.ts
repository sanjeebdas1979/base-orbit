import { NextResponse } from "next/server";
import { isAddress } from "viem";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StreakRow = {
  current_streak: number;
  longest_streak: number;
  last_play_day_id: number;
};

function getCurrentUtcDayId() {
  return Math.floor(Date.now() / 86_400_000);
}

function getNextMilestone(currentStreak: number) {
  const milestones = [
    3,
    7,
    14,
    30,
    60,
    100,
  ];

  return (
    milestones.find(
      (milestone) =>
        milestone > currentStreak,
    ) ?? null
  );
}

/*
 * GET /api/streaks?walletAddress=0x...
 *
 * Returns the connected wallet's
 * current and longest Ranked streak.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(
      request.url,
    );

    const walletAddress = (
      searchParams.get("walletAddress") ?? ""
    ).toLowerCase();

    if (!isAddress(walletAddress)) {
      return NextResponse.json(
        {
          error: "Invalid wallet address.",
        },
        {
          status: 400,
        },
      );
    }

    const { data, error } =
      await supabaseAdmin
        .from("orbit_streaks")
        .select(
          "current_streak, longest_streak, last_play_day_id",
        )
        .eq(
          "wallet_address",
          walletAddress,
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    const currentDayId =
      getCurrentUtcDayId();

    if (!data) {
      return NextResponse.json({
        currentStreak: 0,
        longestStreak: 0,
        playedToday: false,
        nextMilestone: 3,
        daysToNextMilestone: 3,
      });
    }

    const streakRow = data as StreakRow;

    const playedToday =
      streakRow.last_play_day_id ===
      currentDayId;

    /*
     * The stored current streak resets only
     * after the player submits another Ranked
     * score. For display purposes, show zero
     * when more than one UTC day was missed.
     */
    const missedAtLeastOneFullDay =
      streakRow.last_play_day_id <
      currentDayId - 1;

    const displayedCurrentStreak =
      missedAtLeastOneFullDay
        ? 0
        : streakRow.current_streak;

    const nextMilestone =
      getNextMilestone(
        displayedCurrentStreak,
      );

    return NextResponse.json({
      currentStreak:
        displayedCurrentStreak,
      longestStreak:
        streakRow.longest_streak,
      playedToday,
      nextMilestone,
      daysToNextMilestone:
        nextMilestone === null
          ? 0
          : Math.max(
              nextMilestone -
                displayedCurrentStreak,
              0,
            ),
    });
  } catch (error) {
    console.error(
      "Streak read error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Streak information could not be loaded.",
      },
      {
        status: 500,
      },
    );
  }
}