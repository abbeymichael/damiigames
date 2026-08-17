import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import type { GameTypeLimit } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameType: string }> }
) {
  try {
    const { gameType } = await params;
    const limit = await dbRepository.getGameTypeLimit(gameType);
    if (!limit) {
      return NextResponse.json({ success: false, error: "Limit not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, limit });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch limit" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ gameType: string }> }
) {
  try {
    const { gameType } = await params;
    const body = await req.json();
    const existing = await dbRepository.getGameTypeLimit(gameType);

    const limit: GameTypeLimit = {
      id: existing?.id || `limit-${gameType}`,
      gameType,
      minWager: body.minWager !== undefined ? Number(body.minWager).toFixed(2) : (existing?.minWager ?? "1.00"),
      maxWager: body.maxWager !== undefined ? Number(body.maxWager).toFixed(2) : (existing?.maxWager ?? "1000.00"),
      minTournamentPrizePool: body.minTournamentPrizePool !== undefined ? Number(body.minTournamentPrizePool).toFixed(2) : (existing?.minTournamentPrizePool ?? "10.00"),
      maxTournamentPrizePool: body.maxTournamentPrizePool !== undefined ? Number(body.maxTournamentPrizePool).toFixed(2) : (existing?.maxTournamentPrizePool ?? "10000.00"),
      platformFeePercent: body.platformFeePercent !== undefined ? Number(body.platformFeePercent).toFixed(4) : (existing?.platformFeePercent ?? "0.0500"),
      updatedAt: new Date().toISOString(),
    };

    const saved = await dbRepository.saveGameTypeLimit(limit);
    return NextResponse.json({ success: true, limit: saved });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update limit" },
      { status: 500 }
    );
  }
}
