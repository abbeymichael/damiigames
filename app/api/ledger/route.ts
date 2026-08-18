import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { ledgerService } from "@/lib/ledger-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    const accountType = (searchParams.get("accountType") as "available" | "escrow") || undefined;
    const referenceType = searchParams.get("referenceType") || undefined;
    const referenceId = searchParams.get("referenceId") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 100;

    let balance: number | undefined;
    if (userId && accountType) {
      balance = await ledgerService.getBalance(userId, accountType);
    }

    const entries = await dbRepository.getLedgerEntries({
      userId,
      referenceType,
      referenceId,
      limit,
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
