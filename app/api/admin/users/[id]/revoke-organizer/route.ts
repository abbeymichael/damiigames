import { NextRequest, NextResponse } from "next/server";
import { adminService } from "@/lib/admin-service";
import { requirePermission, handleAuthError } from "@/lib/auth-guard";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requirePermission(req, "manage_organizers");
    if (auth instanceof NextResponse) return auth;

    const { id } = await context.params;
    const adminToken = auth?.user?.token || auth?.token || "admin";

    const body = await req.json();
    const reason = String(body.reason ?? "").trim();
    const evidenceUrl = body.evidenceUrl ? String(body.evidenceUrl).trim() : undefined;
    const tournamentHandling =
      body.tournamentHandling === "cancel_and_refund" ? "cancel_and_refund" : "reassign_to_system";

    if (!reason) {
      return NextResponse.json(
        { error: "A mandatory reason for organizer revocation is required." },
        { status: 400 },
      );
    }

    const result = await adminService.revokeOrganizerStatus(
      adminToken,
      id,
      reason,
      tournamentHandling,
    );

    return NextResponse.json({
      success: true,
      message: result.message,
      affectedTournaments: result.affectedTournaments,
      profile: result.profile,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
