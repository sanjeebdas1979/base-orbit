import { NextResponse } from "next/server";
import { isAddress } from "viem";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ScoreRequest = {
  walletAddress?: unknown;
  score?: unknown;
  level?: unknown;
};

type ExistingStreak = {
  current_streak: number;
  longest_streak: number;
  last_play_day_id: number;
};

type StreakResult = {
  currentStreak: number;
  longestStreak: number;
  increasedToday: boolean;
  milestone: number | null;
};

const STREAK_MILESTONES = [
  3,
  7,
  14,
  30,
  60,
  100,
] as const;

function getCurrentUtcDayId() {
  return Math.floor(Date.now() / 86_400_000);
}

function getReachedMilestone(
  previousStreak: number,
  currentStreak: number,
) {
  const milestone =
    STREAK_MILESTONES.find(
      (value) =>
        previousStreak < value &&
        currentStreak >= value,
    ) ?? null;

  return milestone;
}

async function updateWalletStreak(
  walletAddress: string,
  dayId: number,
): Promise<StreakResult> {
  const {
    data: existingStreak,
    error: streakReadError,
  } = await supabaseAdmin
    .from("orbit_streaks")
    .select(
      "current_streak, longest_streak, last_play_day_id",
    )
    .eq("wallet_address", walletAddress)
    .maybeSingle<ExistingStreak>();

  if (streakReadError) {
    throw streakReadError;
  }

  if (!existingStreak) {
    const { error: streakInsertError } =
      await supabaseAdmin
        .from("orbit_streaks")
        .insert({
          wallet_address: walletAddress,
          current_streak: 1,
          longest_streak: 1,
          last_play_day_id: dayId,
          updated_at: new Date().toISOString(),
        });

    if (streakInsertError) {
      throw streakInsertError;
    }

    return {
      currentStreak: 1,
      longestStreak: 1,
      increasedToday: true,
      milestone: null,
    };
  }

  const previousStreak =
    existingStreak.current_streak;

  if (
    existingStreak.last_play_day_id === dayId
  ) {
    return {
      currentStreak:
        existingStreak.current_streak,
      longestStreak:
        existingStreak.longest_streak,
      increasedToday: false,
      milestone: null,
    };
  }

  const playedYesterday =
    existingStreak.last_play_day_id ===
    dayId - 1;

  const nextCurrentStreak =
    playedYesterday
      ? existingStreak.current_streak + 1
      : 1;

  const nextLongestStreak = Math.max(
    existingStreak.longest_streak,
    nextCurrentStreak,
  );

  const milestone = playedYesterday
    ? getReachedMilestone(
        previousStreak,
        nextCurrentStreak,
      )
    : null;

  const { error: streakUpdateError } =
    await supabaseAdmin
      .from("orbit_streaks")
      .upsert(
        {
          wallet_address: walletAddress,
          current_streak:
            nextCurrentStreak,
          longest_streak:
            nextLongestStreak,
          last_play_day_id: dayId,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict: "wallet_address",
        },
      );

  if (streakUpdateError) {
    throw streakUpdateError;
  }

  return {
    currentStreak: nextCurrentStreak,
    longestStreak: nextLongestStreak,
    increasedToday: true,
    milestone,
  };
}

/*
 * GET /api/scores
 * Returns today's Top 10 scores.
 */
export async function GET() {
  try {
    const dayId = getCurrentUtcDayId();

    const { data, error } =
      await supabaseAdmin
        .from("orbit_scores")
        .select(
          "wallet_address, score, level, created_at",
        )
        .eq("day_id", dayId)
        .order("score", {
          ascending: false,
        })
        .order("created_at", {
          ascending: true,
        })
        .limit(10);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      dayId,
      scores: data ?? [],
    });
  } catch (error) {
    console.error(
      "Leaderboard read error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Leaderboard could not be loaded.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
 * POST /api/scores
 * Updates the ranked streak once per UTC day.
 * Saves only the wallet's best score for today.
 */
export async function POST(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as ScoreRequest;

    const walletAddress =
      typeof body.walletAddress === "string"
        ? body.walletAddress.toLowerCase()
        : "";

    const score = Number(body.score);
    const level = Number(body.level);

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

    if (
      !Number.isInteger(score) ||
      score < 0 ||
      score > 1_000_000
    ) {
      return NextResponse.json(
        {
          error: "Invalid score.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isInteger(level) ||
      level < 1 ||
      level > 10_000
    ) {
      return NextResponse.json(
        {
          error: "Invalid level.",
        },
        {
          status: 400,
        },
      );
    }

    const dayId = getCurrentUtcDayId();

    /*
     * A valid Ranked run updates the streak,
     * even when the player does not beat
     * their existing daily best.
     */
    const streak =
      await updateWalletStreak(
        walletAddress,
        dayId,
      );

    const {
      data: existingScore,
      error: readError,
    } = await supabaseAdmin
      .from("orbit_scores")
      .select("id, score, level")
      .eq(
        "wallet_address",
        walletAddress,
      )
      .eq("day_id", dayId)
      .maybeSingle();

    if (readError) {
      throw readError;
    }

    if (
      existingScore &&
      existingScore.score >= score
    ) {
      return NextResponse.json({
        saved: false,
        bestScore: existingScore.score,
        level: existingScore.level,
        streak,
      });
    }

    const {
      data: savedScore,
      error: saveError,
    } = await supabaseAdmin
      .from("orbit_scores")
      .upsert(
        {
          wallet_address: walletAddress,
          score,
          level,
          day_id: dayId,
          created_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "wallet_address,day_id",
        },
      )
      .select("score, level")
      .single();

    if (saveError) {
      throw saveError;
    }

    return NextResponse.json({
      saved: true,
      bestScore: savedScore.score,
      level: savedScore.level,
      streak,
    });
  } catch (error) {
    console.error(
      "Score save error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Score could not be saved.",
      },
      {
        status: 500,
      },
    );
  }
}