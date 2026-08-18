import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { ledgerService, LedgerValidationError } from "@/lib/ledger-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const gameType = searchParams.get("gameType") || undefined;
    const playerId = searchParams.get("playerId") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;

    const matches = await dbRepository.listMatches({ status, gameType, playerId, limit });
    return NextResponse.json({ success: true, matches });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch matches" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameType, playerAId, wagerAmount, matchId } = body;

    if (!gameType || !playerAId || wagerAmount === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: gameType, playerAId, wagerAmount" },
        { status: 400 }
      );
    }

    const amount = Number(wagerAmount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "wagerAmount must be a positive number" },
        { status: 400 }
      );
    }

    const match = await ledgerService.createMatchEscrow({
      matchId,
      gameType,
      playerAId,
      wagerAmount: amount,
    });

    return NextResponse.json({ success: true, match }, { status: 201 });
  } catch (error: any) {
    if (error instanceof LedgerValidationError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create match" },
      { status: 500 }
    );
  }
}
