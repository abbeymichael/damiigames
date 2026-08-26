import { NextRequest, NextResponse } from "next/server";
import { ledgerService } from "@/lib/ledger-service";
import { dbRepository } from "@/lib/db-client";
import { getAuthContext, validateCsrfToken } from "@/lib/auth-guard";
import { securityService } from "@/lib/security";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(req);
    if (!auth || !auth.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Valid session required to cancel match." },
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

    const { id } = await params;
    const safeMatchId = securityService.sanitizeInput(id);

    const matchData = await dbRepository.getMatch(safeMatchId);
    if (!matchData) {
      return NextResponse.json({ success: false, error: "Match not found" }, { status: 404 });
    }

    // Only match creator, joined participant, or admin can cancel
    const isSuperAdmin = auth.isSuperAdmin || auth.role === "super_admin";
    const isAdmin = auth.role === "admin";
    const isParticipant = auth.user.token === matchData.playerAId || auth.user.token === matchData.playerBId;

    if (!isSuperAdmin && !isAdmin && !isParticipant) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You are not authorized to cancel this match." },
        { status: 403 }
      );
    }

    const match = await ledgerService.cancelMatchEscrow(safeMatchId);
    return NextResponse.json({ success: true, match });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel match" },
      { status: 400 }
    );
  }
}

