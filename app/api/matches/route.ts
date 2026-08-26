import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { ledgerService, LedgerValidationError } from "@/lib/ledger-service";
import { getAuthContext, validateCsrfToken } from "@/lib/auth-guard";
import { securityService } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ? securityService.sanitizeInput(searchParams.get("status")!) : undefined;
    const gameType = searchParams.get("gameType") ? securityService.sanitizeInput(searchParams.get("gameType")!) : undefined;
    const playerId = searchParams.get("playerId") ? securityService.sanitizeInput(searchParams.get("playerId")!) : undefined;
    const rawLimit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), 100);

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
    const auth = await getAuthContext(req);
    if (!auth || !auth.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. You must be signed in to create a match." },
        { status: 401 }
      );
    }

    const csrf = validateCsrfToken(req, auth.session);
    if (!csrf.valid) {
      return NextResponse.json(
        { success: false, error: csrf.error || "Invalid or missing CSRF token" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { gameType, wagerAmount, matchId } = body;

    if (!gameType || wagerAmount === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: gameType, wagerAmount" },
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

    // IDOR Prevention: strictly bind playerAId to authenticated user's token
    const safePlayerAId = auth.user.token;
    const safeGameType = securityService.sanitizeInput(String(gameType));
    const safeMatchId = matchId ? securityService.sanitizeInput(String(matchId)) : undefined;

    const match = await ledgerService.createMatchEscrow({
      matchId: safeMatchId,
      gameType: safeGameType,
      playerAId: safePlayerAId,
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
