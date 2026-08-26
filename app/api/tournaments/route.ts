import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { ledgerService, LedgerValidationError } from "@/lib/ledger-service";
import { getAuthContext, validateCsrfToken } from "@/lib/auth-guard";
import { hasPermission } from "@/lib/permissions";
import { securityService } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ? securityService.sanitizeInput(searchParams.get("status")!) : undefined;
    const organizerId = searchParams.get("organizerId") ? securityService.sanitizeInput(searchParams.get("organizerId")!) : undefined;
    const gameType = searchParams.get("gameType") ? securityService.sanitizeInput(searchParams.get("gameType")!) : undefined;
    const rawLimit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), 100);

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
    const auth = await getAuthContext(req);
    if (!auth || !auth.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Valid session required." },
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

    // Must be an organizer, an admin, or hold tournament management permission
    const isSuperAdmin = auth.isSuperAdmin || auth.role === "super_admin";
    const hasOrganizerRole = auth.role === "organizer" || auth.role === "admin" || auth.role === "super_admin";
    const canCreateTournament =
      isSuperAdmin ||
      hasOrganizerRole ||
      auth.permissions.includes("tournaments.create" as any) ||
      auth.permissions.includes("tournaments.manage" as any) ||
      (await hasPermission(auth.user.token, "tournaments.create")) ||
      (await hasPermission(auth.user.token, "tournaments.manage"));

    if (!canCreateTournament) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You do not have permission to organize tournaments." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { gameType, entryFee = 0, totalPrizePool, prizes, tournamentId } = body;

    if (!gameType || totalPrizePool === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: gameType, totalPrizePool" },
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

    // IDOR Prevention: organizerId is strictly bound to the authenticated caller
    const safeOrganizerId = auth.user.token;
    const safeGameType = securityService.sanitizeInput(String(gameType));
    const safeTournamentId = tournamentId ? securityService.sanitizeInput(String(tournamentId)) : undefined;

    const tournament = await ledgerService.createTournamentEscrow({
      tournamentId: safeTournamentId,
      organizerId: safeOrganizerId,
      gameType: safeGameType,
      entryFee: isNaN(feeAmount) || feeAmount < 0 ? 0 : feeAmount,
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

