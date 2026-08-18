import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { requirePermission } from "@/lib/auth-guard";
import type { GameTypeLimit } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameType: string }> }
) {
  try {
    const { gameType } = await params;
    const limit = await dbRepository.getGameTypeLimit(gameType);
    if (!limit) {
      return NextResponse.json({ success: false, error: "Limit not found" }, { status: 404 });
    }

    // Check if change history is requested
    const { searchParams } = new URL(req.url);
    const includeHistory = searchParams.get("history") === "true";

    let history: any[] = [];
    if (includeHistory) {
      const allLogs = await dbRepository.listAdminLogs(200);
      history = allLogs
        .filter((l) => {
          if (l.target === gameType || l.target === `limit-${gameType}`) return true;
          try {
            const parsed = JSON.parse(l.detailsJson || "{}");
            return parsed.gameType === gameType || parsed.actionType === "game_type_limits_update";
          } catch {
            return false;
          }
        })
        .map((l) => {
          let details: any = {};
          try {
            details = JSON.parse(l.detailsJson || "{}");
          } catch {
            details = {};
          }
          return {
            id: l.id,
            adminToken: l.adminToken,
            adminName: l.adminName,
            action: l.action,
            target: l.target,
            actionType: details.actionType || l.action,
            beforeState: details.beforeState || null,
            afterState: details.afterState || null,
            createdAt: l.createdAt,
          };
        });
    }

    return NextResponse.json({ success: true, limit, history });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch limit" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ gameType: string }> }
) {
  try {
    const auth = await requirePermission(req, "manage_tournaments");
    const { gameType } = await params;
    const body = await req.json();
    const existing = await dbRepository.getGameTypeLimit(gameType);

    const limit: GameTypeLimit = {
      id: existing?.id || `limit-${gameType}`,
      gameType,
      minWager: body.minWager !== undefined ? Number(body.minWager).toFixed(2) : (existing?.minWager ?? "1.00"),
      maxWager: body.maxWager !== undefined ? Number(body.maxWager).toFixed(2) : (existing?.maxWager ?? "1000.00"),
      minTournamentPrizePool: body.minTournamentPrizePool !== undefined ? Number(body.minTournamentPrizePool).toFixed(2) : (existing?.minTournamentPrizePool ?? "10.00"),
      maxTournamentPrizePool: body.maxTournamentPrizePool !== undefined ? Number(body.maxTournamentPrizePool).toFixed(2) : (existing?.maxTournamentPrizePool ?? "10000.00"),
      platformFeePercent: body.platformFeePercent !== undefined ? Number(body.platformFeePercent).toFixed(4) : (existing?.platformFeePercent ?? "0.0500"),
      updatedAt: new Date().toISOString(),
    };

    const saved = await dbRepository.saveGameTypeLimit(limit);

    const adminUser = auth.user;
    const now = new Date().toISOString();

    // Write audit log (actionType: "game_type_limits_update", beforeState/afterState)
    await dbRepository.createAdminLog({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      adminToken: adminUser?.token || "admin",
      adminName: adminUser?.username || "Admin",
      action: "game_type_limits_update",
      target: gameType,
      detailsJson: JSON.stringify({
        actionType: "game_type_limits_update",
        gameType,
        beforeState: existing || null,
        afterState: limit,
        changedAt: now,
      }),
      createdAt: now,
    });

    return NextResponse.json({ success: true, limit: saved });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update limit" },
      { status: 500 }
    );
  }
}

