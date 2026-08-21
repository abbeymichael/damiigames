import { NextRequest, NextResponse } from "next/server";
import { ledgerService } from "@/lib/ledger-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { playerBId } = body;

    if (!playerBId) {
      return NextResponse.json(
        { success: false, error: "Missing playerBId" },
        { status: 400 }
      );
    }

    const match = await ledgerService.joinMatchEscrow(id, playerBId);
    return NextResponse.json({ success: true, match });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to join match" },
      { status: 400 }
    );
  }
}
