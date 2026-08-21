import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const match = await dbRepository.getMatch(id);
    if (!match) {
      return NextResponse.json({ success: false, error: "Match not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, match });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch match" },
      { status: 500 }
    );
  }
}
