import { NextRequest, NextResponse } from "next/server";
import { ledgerService } from "@/lib/ledger-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    const entry = await ledgerService.joinTournament(id, userId);
    return NextResponse.json({ success: true, entry });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to join tournament" },
      { status: 400 }
    );
  }
}
