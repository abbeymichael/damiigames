import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { requirePermission } from "@/lib/auth-guard";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requirePermission(req, "manage_organizers");
    const { id } = await context.params;
    const { user: adminUser } = auth;

    const application = await dbRepository.getOrganizerApplication(id);
    if (!application) {
      return NextResponse.json({ error: "Organizer application not found" }, { status: 404 });
    }

    const body = await req.json();
    const decision = String(body.decision ?? "").trim().toLowerCase();
    const note = body.note ? String(body.note).trim() : undefined;

    if (!["approve", "reject", "needs_info"].includes(decision)) {
      return NextResponse.json(
        { error: "Decision must be one of: 'approve', 'reject', 'needs_info'" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    if (decision === "approve") {
      // 1. Update application record
      const updatedApp = await dbRepository.updateOrganizerApplication(id, {
        status: "approved",
        reviewedByAdminId: adminUser.token,
        reviewedAt: now,
        reviewNote: note || "Organizer credentials verified and approved.",
      });

      // 2. Update user role in users table to 'organizer'
      const user = await dbRepository.getUserById(application.userId);
      if (user && user.role !== "admin") {
        await dbRepository.updateUser(user.id, { role: "organizer" });
      }

      // 3. Update profile role in profiles table to 'organizer'
      const profile = await dbRepository.getProfile(application.userId);
      if (profile && profile.role !== "admin" && profile.role !== "super_admin") {
        profile.role = "organizer";
        await dbRepository.saveProfile(profile);
      }

      // 4. Update organizer_profiles status
      await dbRepository.saveOrganizerProfile({
        userId: application.userId,
        username: profile?.username || user?.username,
        status: "approved",
        requestedAt: new Date(application.createdAt).toISOString(),
        reviewedBy: adminUser.token,
        reviewedAt: now,
        organizationName: application.organizationName || undefined,
      });

      // 5. Create audit log
      await dbRepository.createAdminLog({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        adminToken: adminUser.token,
        adminName: adminUser.username,
        action: "organizer_application.approved",
        target: application.userId,
        detailsJson: JSON.stringify({
          applicationId: id,
          applicantType: application.applicantType,
          organizationName: application.organizationName,
          note,
        }),
        createdAt: now,
      });

      return NextResponse.json({
        success: true,
        message: "Organizer application approved successfully. User role updated to 'organizer'.",
        application: updatedApp,
      });
    }

    if (decision === "reject") {
      const updatedApp = await dbRepository.updateOrganizerApplication(id, {
        status: "rejected",
        reviewedByAdminId: adminUser.token,
        reviewedAt: now,
        reviewNote: note || "Application rejected. Did not meet platform organizer criteria.",
      });

      // Sync organizer profile status
      await dbRepository.saveOrganizerProfile({
        userId: application.userId,
        status: "rejected",
        requestedAt: new Date(application.createdAt).toISOString(),
        reviewedBy: adminUser.token,
        reviewedAt: now,
        rejectionReason: note || "Application rejected by administrator.",
        organizationName: application.organizationName || undefined,
      });

      // Create audit log
      await dbRepository.createAdminLog({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        adminToken: adminUser.token,
        adminName: adminUser.username,
        action: "organizer_application.rejected",
        target: application.userId,
        detailsJson: JSON.stringify({
          applicationId: id,
          reason: note,
        }),
        createdAt: now,
      });

      return NextResponse.json({
        success: true,
        message: "Organizer application rejected.",
        application: updatedApp,
      });
    }

    if (decision === "needs_info") {
      const updatedApp = await dbRepository.updateOrganizerApplication(id, {
        status: "needs_info",
        reviewedByAdminId: adminUser.token,
        reviewedAt: now,
        reviewNote: note || "Additional information or documentation requested.",
      });

      // Sync organizer profile status
      await dbRepository.saveOrganizerProfile({
        userId: application.userId,
        status: "pending",
        requestedAt: new Date(application.createdAt).toISOString(),
        reviewedBy: adminUser.token,
        reviewedAt: now,
        rejectionReason: `Additional information requested: ${note || "Please check requirement details."}`,
        organizationName: application.organizationName || undefined,
      });

      // Create audit log
      await dbRepository.createAdminLog({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        adminToken: adminUser.token,
        adminName: adminUser.username,
        action: "organizer_application.needs_info",
        target: application.userId,
        detailsJson: JSON.stringify({
          applicationId: id,
          note,
        }),
        createdAt: now,
      });

      return NextResponse.json({
        success: true,
        message: "Organizer application marked as needs_info. The applicant can update and resubmit.",
        application: updatedApp,
      });
    }

    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record decision" },
      { status: 500 },
    );
  }
}
