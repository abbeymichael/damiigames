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
        { success: false, error: "Unauthorized. Valid session required to join tournament." },
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

    // IDOR Prevention: strictly bind to the authenticated caller's account
    const safeUserId = auth.user.token;

    const entry = await ledgerService.joinTournament(safeTournamentId, safeUserId);
    return NextResponse.json({ success: true, entry });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to join tournament" },
      { status: 400 }
    );
  }
}

