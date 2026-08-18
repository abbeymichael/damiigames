import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import type { GameTypeLimit } from "@/lib/types";

export async function GET() {
  try {
    const limits = await dbRepository.getGameTypeLimits();
    return NextResponse.json({ success: true, limits });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch game type limits" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      gameType,
      minWager,
      maxWager,
      minTournamentPrizePool,
      maxTournamentPrizePool,
      platformFeePercent,
    } = body;

    if (!gameType || minWager === undefined || maxWager === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: gameType, minWager, maxWager" },
        { status: 400 }
      );
    }

    const limit: GameTypeLimit = {
      id: body.id || `limit-${gameType}`,
      gameType,
      minWager: Number(minWager).toFixed(2),
      maxWager: Number(maxWager).toFixed(2),
      minTournamentPrizePool: Number(minTournamentPrizePool ?? 10).toFixed(2),
      maxTournamentPrizePool: Number(maxTournamentPrizePool ?? 10000).toFixed(2),
      platformFeePercent: Number(platformFeePercent ?? 0.05).toFixed(4),
      updatedAt: new Date().toISOString(),
    };

    const saved = await dbRepository.saveGameTypeLimit(limit);
    return NextResponse.json({ success: true, limit: saved }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save game type limit" },
      { status: 500 }
    );
  }
}
