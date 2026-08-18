import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";

const cleanToken = (v: unknown) => String(v ?? "").trim().slice(0, 80);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = cleanToken(searchParams.get("token"));

  if (!token) {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  const profile = await dbRepository.getProfile(token);
  if (!profile) {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  const notifications: Array<{
    id: string;
    type: "league_invite" | "wager_settlement" | "system";
    title: string;
    message: string;
    timestamp: string;
    link: string;
  }> = [];

  // 1. Check open/active leagues (Invitations / Registrations)
  const leagues = await dbRepository.listLeagues();
  for (const l of leagues) {
    if (l.status === "registration") {
      const participants = await dbRepository.getLeagueParticipants(l.id);
      const isParticipant = participants.some((p) => p.userToken === token);
      if (!isParticipant) {
        notifications.push({
          id: `league-invite-${l.id}`,
          type: "league_invite",
          title: "League Registration Open",
          message: `Join "${l.title}" - Prize Pool: ${l.prizePoolPoints} Points!`,
          timestamp: l.updatedAt || l.createdAt,
          link: "/leagues",
        });
      }
    } else if (l.status === "active") {
      const matches = await dbRepository.getLeagueMatches(l.id);
      const userPendingMatch = matches.find(
        (m) =>
          (m.player1Token === token || m.player2Token === token) &&
          (m.status === "pending" || m.status === "in_progress")
      );
      if (userPendingMatch) {
        const opponentName =
          userPendingMatch.player1Token === token
            ? userPendingMatch.player2Name
            : userPendingMatch.player1Name;
        notifications.push({
          id: `league-match-${userPendingMatch.id}`,
          type: "league_invite",
          title: "Tournament Match Scheduled",
          message: `Your match vs ${opponentName || "TBD"} in "${l.title}" is ready!`,
          timestamp: l.updatedAt || l.createdAt,
          link: "/leagues",
        });
      }
    }
  }

  // 2. Check recent Wager Settlements & Wallet Updates
  const txs = await dbRepository.getUserTransactions(token, 15);
  for (const tx of txs) {
    if (tx.type === "wager_win") {
      notifications.push({
        id: `tx-wager-win-${tx.id}`,
        type: "wager_settlement",
        title: "Wager Victory Settled!",
        message: `You won +${tx.amount} Points from your recent wager match!`,
        timestamp: tx.createdAt,
        link: "/wallet",
      });
    } else if (tx.type === "wager_refund") {
      notifications.push({
        id: `tx-wager-refund-${tx.id}`,
        type: "wager_settlement",
        title: "Wager Escrow Refunded",
        message: `${tx.amount} Points returned to your wallet balance.`,
        timestamp: tx.createdAt,
        link: "/wallet",
      });
    } else if (tx.type === "league_prize") {
      notifications.push({
        id: `tx-league-prize-${tx.id}`,
        type: "wager_settlement",
        title: "League Prize Credited!",
        message: `Congratulations! +${tx.amount} Points awarded for tournament placement.`,
        timestamp: tx.createdAt,
        link: "/wallet",
      });
    }
  }

  // 3. System Welcome Notification
  notifications.push({
    id: `system-welcome-${profile.token}`,
    type: "system",
    title: "Welcome to DAMII Arena",
    message: `Account active as ${profile.username}. Current Balance: ${profile.points} Points.`,
    timestamp: profile.createdAt,
    link: "/arena",
  });

  return NextResponse.json({
    notifications,
    unreadCount: notifications.length,
  });
}
