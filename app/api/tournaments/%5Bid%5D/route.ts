import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await dbRepository.getTournament(id);
    if (!data) {
      return NextResponse.json({ success: false, error: "Tournament not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch tournament" },
      { status: 500 }
    );
  }
}
