import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { requirePermission } from "@/lib/auth-guard";
import type { GameTypeLimit } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const limits = await dbRepository.getGameTypeLimits();
    return NextResponse.json({ success: true, limits });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch game type limits" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "manage_tournaments");
    const body = await req.json();
    const {
      gameType,
      minWager,
      maxWager,
      minTournamentPrizePool,
      maxTournamentPrizePool,
      platformFeePercent,
    } = body;

    if (!gameType || minWager === undefined || maxWager === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: gameType, minWager, maxWager" },
        { status: 400 }
      );
    }

    const cleanGameType = String(gameType).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");

    const existing = await dbRepository.getGameTypeLimit(cleanGameType);

    const limit: GameTypeLimit = {
      id: body.id || `limit-${cleanGameType}`,
      gameType: cleanGameType,
      minWager: Number(minWager).toFixed(2),
      maxWager: Number(maxWager).toFixed(2),
      minTournamentPrizePool: Number(minTournamentPrizePool ?? 10).toFixed(2),
      maxTournamentPrizePool: Number(maxTournamentPrizePool ?? 10000).toFixed(2),
      platformFeePercent: Number(platformFeePercent ?? 0.05).toFixed(4),
      updatedAt: new Date().toISOString(),
    };

    const saved = await dbRepository.saveGameTypeLimit(limit);

    const adminUser = auth.user;
    const now = new Date().toISOString();

    // Write audit log (actionType: "game_type_limits_create" / "game_type_limits_update")
    await dbRepository.createAdminLog({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      adminToken: adminUser?.token || "admin",
      adminName: adminUser?.username || "Admin",
      action: existing ? "game_type_limits_update" : "game_type_limits_create",
      target: cleanGameType,
      detailsJson: JSON.stringify({
        actionType: existing ? "game_type_limits_update" : "game_type_limits_create",
        gameType: cleanGameType,
        beforeState: existing || null,
        afterState: limit,
        changedAt: now,
      }),
      createdAt: now,
    });

    return NextResponse.json({ success: true, limit: saved }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save game type limit" },
      { status: 500 }
    );
  }
}
