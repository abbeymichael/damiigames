import { NextRequest, NextResponse } from "next/server";
import { ledgerService } from "@/lib/ledger-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { placements } = body;

    let token = "";
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
    if (!token && body?.token) token = String(body.token).trim();

    if (!Array.isArray(placements) || placements.length === 0) {
      return NextResponse.json(
        { success: false, error: "placements must be a non-empty array of { placement: number, userId: string }" },
        { status: 400 }
      );
    }

    const tournament = await ledgerService.disburseTournament(id, placements, token || undefined);
    return NextResponse.json({ success: true, tournament });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to disburse tournament prizes" },
      { status: 400 }
    );
  }
}
