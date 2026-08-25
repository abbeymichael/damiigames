import { NextRequest, NextResponse } from "next/server";
import { ledgerService } from "@/lib/ledger-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let token = "";
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
    try {
      const body = await req.clone().json();
      if (!token && body?.token) token = String(body.token).trim();
    } catch {}

    const tournament = await ledgerService.cancelTournament(id, token || undefined);
    return NextResponse.json({ success: true, tournament });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel tournament" },
      { status: 400 }
    );
  }
}
