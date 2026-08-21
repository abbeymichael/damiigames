import { NextRequest, NextResponse } from "next/server";
import { ledgerService } from "@/lib/ledger-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const match = await ledgerService.cancelMatchEscrow(id);
    return NextResponse.json({ success: true, match });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel match" },
      { status: 400 }
    );
  }
}
