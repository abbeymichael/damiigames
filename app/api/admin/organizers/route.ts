import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { requirePermission } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "manage_organizers");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status") as any;

  const organizers = await dbRepository.listOrganizerProfiles(statusParam || undefined);
  return NextResponse.json({ organizers });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "manage_organizers");
  if (auth instanceof NextResponse) return auth;

  const { user: adminUser } = auth;

  try {
    const body = await req.json();
    const { targetUserId, action, reason } = body;

    if (!targetUserId || !["approve", "reject", "revoke"].includes(action)) {
      return NextResponse.json({ error: "Valid targetUserId and action (approve|reject|revoke) required" }, { status: 400 });
    }

    const org = await dbRepository.getOrganizerProfile(targetUserId);
    if (!org) {
      return NextResponse.json({ error: "Organizer request not found" }, { status: 404 });
    }

    const targetUser = await dbRepository.getProfile(targetUserId);
    const now = new Date().toISOString();

    if (action === "approve") {
      org.status = "approved";
      org.reviewedBy = adminUser.token;
      org.reviewedAt = now;
      await dbRepository.saveOrganizerProfile(org);

      if (targetUser && targetUser.role !== "admin" && targetUser.role !== "super_admin") {
        targetUser.role = "organizer";
        await dbRepository.saveProfile(targetUser);
      }

      await dbRepository.createAdminLog({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        adminToken: adminUser.token,
        adminName: adminUser.username,
        action: "organizer.approved",
        target: targetUserId,
        detailsJson: JSON.stringify({ organizationName: org.organizationName }),
        createdAt: now,
      });

      return NextResponse.json({ success: true, organizerProfile: org, message: "Organizer request approved successfully." });
    }

    if (action === "reject") {
      org.status = "rejected";
      org.rejectionReason = reason ? String(reason).trim() : "Did not meet organizer requirements";
      org.reviewedBy = adminUser.token;
      org.reviewedAt = now;
      await dbRepository.saveOrganizerProfile(org);

      await dbRepository.createAdminLog({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        adminToken: adminUser.token,
        adminName: adminUser.username,
        action: "organizer.rejected",
        target: targetUserId,
        detailsJson: JSON.stringify({ reason: org.rejectionReason }),
        createdAt: now,
      });

      return NextResponse.json({ success: true, organizerProfile: org, message: "Organizer request rejected." });
    }

    if (action === "revoke") {
      org.status = "revoked";
      org.rejectionReason = reason ? String(reason).trim() : "Organizer privileges revoked by administrator";
      org.reviewedBy = adminUser.token;
      org.reviewedAt = now;
      await dbRepository.saveOrganizerProfile(org);

      if (targetUser && targetUser.role === "organizer") {
        targetUser.role = "user";
        await dbRepository.saveProfile(targetUser);
      }

      await dbRepository.createAdminLog({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        adminToken: adminUser.token,
        adminName: adminUser.username,
        action: "organizer.revoked",
        target: targetUserId,
        detailsJson: JSON.stringify({ reason: org.rejectionReason }),
        createdAt: now,
      });

      return NextResponse.json({ success: true, organizerProfile: org, message: "Organizer status revoked." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process organizer action" },
      { status: 500 }
    );
  }
}
