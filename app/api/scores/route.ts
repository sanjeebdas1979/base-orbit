import { NextResponse } from "next/server";
import { isAddress } from "viem";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ScoreRequest = {
  walletAddress?: unknown;
  score?: unknown;
  level?: unknown;
};

function getCurrentUtcDayId() {
  return Math.floor(Date.now() / 86_400_000);
}

/*
 * GET /api/scores
 * Returns today's Top 10 scores.
 */
export async function GET() {
  try {
    const dayId = getCurrentUtcDayId();

    const { data, error } = await supabaseAdmin
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
 * Saves only the wallet's best score for today.
 */
export async function POST(request: Request) {
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