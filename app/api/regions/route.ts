import { NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";

export async function GET() {
  try {
    const regions = await dbRepository.getRegions();
    return NextResponse.json({
      success: true,
      regions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch regions" },
      { status: 500 },
    );
  }
}
