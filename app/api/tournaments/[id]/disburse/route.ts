import { NextRequest, NextResponse } from "next/server";
import { ledgerService } from "@/lib/ledger-service";
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

    const { id } = await params;
    const safeTournamentId = securityService.sanitizeInput(id);
    const body = await req.json();
    const { placements } = body;

    if (!Array.isArray(placements) || placements.length === 0) {
      return NextResponse.json(
        { success: false, error: "placements must be a non-empty array of { placement: number, userId: string }" },
        { status: 400 }
      );
    }

    const sanitizedPlacements = placements.map((p: any) => ({
      placement: Number(p.placement),
      userId: securityService.sanitizeInput(String(p.userId || "")),
    }));

    const tournament = await ledgerService.disburseTournament(safeTournamentId, sanitizedPlacements, auth.user.token);
    return NextResponse.json({ success: true, tournament });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to disburse tournament prizes" },
      { status: 400 }
    );
  }
}

