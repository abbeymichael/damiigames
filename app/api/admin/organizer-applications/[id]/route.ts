import { NextRequest, NextResponse } from "next/server";
import { adminService } from "@/lib/admin-service";
import { requirePermission, handleAuthError } from "@/lib/auth-guard";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requirePermission(req, "manage_organizers");
    if (auth instanceof NextResponse) return auth;

    const { id } = await context.params;
    const adminToken = auth?.user?.token || auth?.token || "admin";
    const detail = await adminService.getOrganizerApplicationDetail(adminToken, id);

    return NextResponse.json({
      success: true,
      ...detail,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
