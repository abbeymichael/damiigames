import { NextRequest, NextResponse } from "next/server";
import { ledgerService } from "@/lib/ledger-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournament = await ledgerService.cancelTournament(id);
    return NextResponse.json({ success: true, tournament });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel tournament" },
      { status: 400 }
    );
  }
}
