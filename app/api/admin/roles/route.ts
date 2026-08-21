import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { requirePermission, handleAuthError } from "@/lib/auth-guard";
import { AdminPermission, AdminProfile } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "manage_admins");
    if (auth instanceof NextResponse) return auth;

    const adminProfiles = await dbRepository.listAdminProfiles();
    
    // Also fetch corresponding profile info for usernames
    const enriched = await Promise.all(
      adminProfiles.map(async (ap) => {
        const u = await dbRepository.getProfile(ap.userId);
        return {
          ...ap,
          username: u?.username || ap.userId,
          role: u?.role || "admin",
        };
      })
    );

    return NextResponse.json({ adminProfiles: enriched });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "manage_admins");
    if (auth instanceof NextResponse) return auth;

    const callerToken = auth?.user?.token || auth?.token || "admin";
    const callerUsername = auth?.user?.username || "Admin";

    const body = await req.json();
    const { targetUserId, permissions, isSuperAdmin, action } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "Target user ID is required" }, { status: 400 });
    }

    const targetUser = await dbRepository.getProfile(targetUserId);
    if (!targetUser) {
      return NextResponse.json({ error: "Target user profile not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    let existingAdmin = await dbRepository.getAdminProfile(targetUserId);

    if (action === "revoke_admin") {
      if (existingAdmin?.isSuperAdmin && targetUserId === callerToken) {
        return NextResponse.json({ error: "Super admins cannot revoke their own admin rights" }, { status: 400 });
      }

      if (targetUser.role === "admin" || targetUser.role === "super_admin" || targetUser.role === "treasurer") {
        targetUser.role = "user";
        await dbRepository.saveProfile(targetUser);
      }

      if (existingAdmin) {
        existingAdmin.permissions = [];
        existingAdmin.isSuperAdmin = false;
        await dbRepository.saveAdminProfile(existingAdmin);
      }

      await dbRepository.createAdminLog({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        adminToken: callerToken,
        adminName: callerUsername,
        action: "admin.demoted",
        target: targetUserId,
        detailsJson: JSON.stringify({ targetUsername: targetUser.username }),
        createdAt: now,
      });

      return NextResponse.json({ success: true, message: `Admin access revoked for ${targetUser.username}` });
    }

    // Grant or Update Admin Permissions
    const validPermissions: AdminPermission[] = Array.isArray(permissions) ? permissions : [];

    const updatedAdminProfile: AdminProfile = {
      userId: targetUserId,
      isSuperAdmin: Boolean(isSuperAdmin),
      permissions: validPermissions,
      grantedBy: callerToken,
      grantedAt: existingAdmin?.grantedAt || now,
    };

    await dbRepository.saveAdminProfile(updatedAdminProfile);

    // Ensure user role reflects admin status
    if (targetUser.role !== "super_admin" && targetUser.role !== "admin") {
      targetUser.role = isSuperAdmin ? "super_admin" : "admin";
      await dbRepository.saveProfile(targetUser);
    }

    await dbRepository.createAdminLog({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      adminToken: callerToken,
      adminName: callerUsername,
      action: "admin.permission_granted",
      target: targetUserId,
      detailsJson: JSON.stringify({ permissions: validPermissions, isSuperAdmin }),
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      adminProfile: updatedAdminProfile,
      message: `Updated admin permissions for ${targetUser.username}`,
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
