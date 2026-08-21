import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { adminService } from "@/lib/admin-service";
import { requirePermission, handleAuthError } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "manage_organizers");
    if (auth instanceof NextResponse) return auth;

    const adminToken = auth?.user?.token || auth?.token || "admin";

    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");
    const statusParam = searchParams.get("status") as any;

    if (idParam) {
      try {
        const detail = await adminService.getOrganizerApplicationDetail(adminToken, idParam);
        return NextResponse.json({ success: true, ...detail });
      } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to load organizer application detail" }, { status: 404 });
      }
    }

    const applications = await dbRepository.listOrganizerApplications(
      statusParam && statusParam !== "all" ? statusParam : undefined
    );
    const legacyProfiles = await dbRepository.listOrganizerProfiles(statusParam || undefined);

    return NextResponse.json({ success: true, applications, organizers: legacyProfiles });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "manage_organizers");
    if (auth instanceof NextResponse) return auth;

    const adminToken = auth?.user?.token || auth?.token || "admin";

    const body = await req.json();
    const {
      applicationId,
      targetUserId,
      action,
      reason,
      reviewNote,
      tournamentHandling,
    } = body;

    const note = reviewNote || reason || "";

    // 1. New application-based actions
    if (applicationId) {
      if (action === "approve") {
        const app = await adminService.approveOrganizerApplication(adminToken, applicationId, note);
        return NextResponse.json({ success: true, application: app, message: "Organizer application approved successfully." });
      }

      if (action === "reject") {
        if (!note.trim()) {
          return NextResponse.json({ error: "Review note / rejection reason required" }, { status: 400 });
        }
        const app = await adminService.rejectOrganizerApplication(adminToken, applicationId, note);
        return NextResponse.json({ success: true, application: app, message: "Organizer application rejected." });
      }

      if (action === "request_info" || action === "needs_info") {
        if (!note.trim()) {
          return NextResponse.json({ error: "Instructions for required information or documents are required" }, { status: 400 });
        }
        const app = await adminService.requestMoreInfoOrganizerApplication(adminToken, applicationId, note);
        return NextResponse.json({ success: true, application: app, message: "Additional information requested from applicant." });
      }

      if (action === "revoke") {
        const res = await adminService.revokeOrganizerStatus(
          adminToken,
          applicationId,
          note,
          tournamentHandling === "cancel_and_refund" ? "cancel_and_refund" : "reassign_to_system"
        );
        return NextResponse.json({ success: true, ...res });
      }

      if (action === "get_detail") {
        const detail = await adminService.getOrganizerApplicationDetail(adminToken, applicationId);
        return NextResponse.json({ success: true, ...detail });
      }
    }

    // 2. User ID based actions / legacy compatibility
    if (targetUserId) {
      if (action === "approve") {
        // Find application by user ID if exists
        const app = await dbRepository.getOrganizerApplicationByUserId(targetUserId);
        if (app) {
          const updated = await adminService.approveOrganizerApplication(adminToken, app.id, note);
          return NextResponse.json({ success: true, application: updated, message: "Organizer request approved successfully." });
        }
        const profile = await adminService.approveOrganizerRequest(adminToken, targetUserId);
        return NextResponse.json({ success: true, organizerProfile: profile, message: "Organizer request approved successfully." });
      }

      if (action === "reject") {
        const app = await dbRepository.getOrganizerApplicationByUserId(targetUserId);
        if (app) {
          const updated = await adminService.rejectOrganizerApplication(adminToken, app.id, note);
          return NextResponse.json({ success: true, application: updated, message: "Organizer request rejected." });
        }
        const profile = await adminService.rejectOrganizerRequest(adminToken, targetUserId, note);
        return NextResponse.json({ success: true, organizerProfile: profile, message: "Organizer request rejected." });
      }

      if (action === "revoke") {
        const res = await adminService.revokeOrganizerStatus(
          adminToken,
          targetUserId,
          note,
          tournamentHandling === "cancel_and_refund" ? "cancel_and_refund" : "reassign_to_system"
        );
        return NextResponse.json({ success: true, ...res });
      }
    }

    return NextResponse.json({ error: "Invalid action or missing applicationId / targetUserId" }, { status: 400 });
  } catch (err) {
    return handleAuthError(err);
  }
}

