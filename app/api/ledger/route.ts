import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { ledgerService } from "@/lib/ledger-service";
import { getAuthContext } from "@/lib/auth-guard";
import { hasPermission } from "@/lib/permissions";
import { securityService } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth || !auth.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access. Valid session required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const rawUserId = searchParams.get("userId")?.trim() || undefined;
    const accountType = (searchParams.get("accountType") as "available" | "escrow") || undefined;
    const referenceType = searchParams.get("referenceType") ? securityService.sanitizeInput(searchParams.get("referenceType")!) : undefined;
    const referenceId = searchParams.get("referenceId") ? securityService.sanitizeInput(searchParams.get("referenceId")!) : undefined;
    const rawLimit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    // Check if authenticated user holds administrative financial ledger permissions
    const isSuperAdmin = auth.isSuperAdmin || auth.role === "super_admin";
    const hasAdminRole = ["admin", "super_admin", "treasurer"].includes(auth.role);
    const hasPerm =
      isSuperAdmin ||
      hasAdminRole ||
      auth.permissions.includes("wallet.view" as any) ||
      auth.permissions.includes("ledger.adjust" as any) ||
      (await hasPermission(auth.user.token, "wallet.view")) ||
      (await hasPermission(auth.user.token, "ledger.adjust"));

    let targetUserId: string | undefined = rawUserId;

    // If caller is not an administrator/treasurer, strictly lock query to their own account (IDOR prevention)
    if (!hasPerm) {
      targetUserId = auth.user.token;
    }

    const safeLimit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), hasPerm ? 500 : 100);

    let balance: number | undefined;
    if (targetUserId && accountType) {
      balance = await ledgerService.getBalance(targetUserId, accountType);
    }

    const entries = await dbRepository.getLedgerEntries({
      userId: targetUserId,
      referenceType,
      referenceId,
      limit: safeLimit,
    });

    return NextResponse.json({
      success: true,
      balance,
      entries,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to query ledger" },
      { status: 500 }
    );
  }
}

