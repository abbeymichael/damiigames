import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { ledgerService, LedgerValidationError } from "@/lib/ledger-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const organizerId = searchParams.get("organizerId") || undefined;
    const gameType = searchParams.get("gameType") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;

    const tournaments = await dbRepository.listTournaments({ status, organizerId, gameType, limit });
    return NextResponse.json({ success: true, tournaments });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch tournaments" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizerId, gameType, entryFee = 0, totalPrizePool, prizes, tournamentId } = body;

    if (!organizerId || !gameType || totalPrizePool === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: organizerId, gameType, totalPrizePool" },
        { status: 400 }
      );
    }

    const prizePoolAmount = Number(totalPrizePool);
    const feeAmount = Number(entryFee);

    if (isNaN(prizePoolAmount) || prizePoolAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "totalPrizePool must be a positive number" },
        { status: 400 }
      );
    }

    const tournament = await ledgerService.createTournamentEscrow({
      tournamentId,
      organizerId,
      gameType,
      entryFee: isNaN(feeAmount) ? 0 : feeAmount,
      totalPrizePool: prizePoolAmount,
      prizes,
    });

    return NextResponse.json({ success: true, tournament }, { status: 201 });
  } catch (error: any) {
    if (error instanceof LedgerValidationError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create tournament" },
      { status: 500 }
    );
  }
}
