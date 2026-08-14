import { NextRequest, NextResponse } from "next/server";
import { adminService } from "@/lib/admin-service";
import { leagueService } from "@/lib/league-service";
import { dbRepository } from "@/lib/db-client";
import { attachAuthCookies } from "@/lib/auth-guard";

const cleanToken = (v: unknown) => String(v ?? "").trim().slice(0, 80);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = cleanToken(searchParams.get("token"));
  const secret = searchParams.get("secret") || undefined;

  if (!(await adminService.verifyAdminAccessAsync(token, secret))) {
    return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
  }

  try {
    const metrics = await adminService.getSystemMetrics(token);
    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Admin error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action ?? "").trim().toLowerCase();
    const token = cleanToken(body.token);
    const secret = body.secret ? String(body.secret) : undefined;

    if (action === "admin_login" || action === "login") {
      const { username, passcode } = body;
      const res = await adminService.adminLogin(String(username || ""), String(passcode || ""), secret);
      const metrics = await adminService.getSystemMetrics(res.token);
      const nextRes = NextResponse.json({
        success: true,
        token: res.token,
        csrfToken: res.csrfToken,
        profile: res.profile,
        metrics,
      });
      attachAuthCookies(nextRes, res.token, res.csrfToken);
      return nextRes;
    }

    if (!(await adminService.verifyAdminAccessAsync(token, secret))) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    if (action === "seed" || action === "seed_initial_data") {
      const seedResult = await adminService.seedInitialData();
      return NextResponse.json({ success: true, ...seedResult });
    }

    if (action === "role") {
      const { targetToken, role } = body;
      if (!targetToken || !["user", "facilitator", "admin", "super_admin", "treasurer"].includes(role)) {
        return NextResponse.json({ error: "Target token and valid role required" }, { status: 400 });
      }

      const res = await adminService.setUserRole(token, targetToken, role);
      return NextResponse.json({ success: true, profile: res });
    }

    if (action === "ban_user") {
      const { targetToken, reason } = body;
      if (!targetToken) return NextResponse.json({ error: "Target token required" }, { status: 400 });

      const res = await adminService.banUser(token, targetToken, String(reason || ""));
      return NextResponse.json({ success: true, profile: res });
    }

    if (action === "delete_user") {
      const { targetToken } = body;
      if (!targetToken) return NextResponse.json({ error: "Target token required" }, { status: 400 });

      const res = await adminService.deleteUser(token, targetToken);
      return NextResponse.json({ ...res });
    }

    if (action === "edit_user" || action === "edit_user_profile") {
      const { targetToken, updates } = body;
      if (!targetToken || !updates) return NextResponse.json({ error: "Target token and updates required" }, { status: 400 });

      const res = await adminService.editUserProfile(token, targetToken, updates);
      return NextResponse.json({ success: true, profile: res });
    }

    if (action === "edit_tournament") {
      const { leagueId, updates } = body;
      if (!leagueId || !updates) return NextResponse.json({ error: "League ID and updates required" }, { status: 400 });

      const res = await adminService.editTournament(token, leagueId, updates);
      return NextResponse.json({ success: true, league: res });
    }

    if (action === "delete_tournament") {
      const { leagueId } = body;
      if (!leagueId) return NextResponse.json({ error: "League ID required" }, { status: 400 });

      const res = await adminService.deleteTournament(token, leagueId);
      return NextResponse.json({ ...res });
    }

    if (action === "void_transaction") {
      const { txId, reason } = body;
      if (!txId) return NextResponse.json({ error: "Transaction ID required" }, { status: 400 });

      const res = await adminService.voidTransaction(token, txId, String(reason || ""));
      return NextResponse.json({ success: true, transaction: res });
    }

    if (action === "unban_user") {
      const { targetToken } = body;
      if (!targetToken) return NextResponse.json({ error: "Target token required" }, { status: 400 });

      const res = await adminService.unbanUser(token, targetToken);
      return NextResponse.json({ success: true, profile: res });
    }

    if (action === "adjust_points") {
      const { targetToken, deltaPoints, reason } = body;
      if (!targetToken || isNaN(Number(deltaPoints))) {
        return NextResponse.json({ error: "Target token and deltaPoints number required" }, { status: 400 });
      }

      const res = await adminService.adjustPoints(token, targetToken, Number(deltaPoints), String(reason || "Admin point adjustment"));
      return NextResponse.json({ success: true, profile: res });
    }

    if (action === "update_settings") {
      const {
        wagerFeePercent,
        tournamentFeePercent,
        pointsPerGhsBuy,
        pointsPerGhsWithdraw,
        minDepositGhs,
        maxDepositGhs,
        minWithdrawalGhs,
        maxWithdrawalGhs,
        maxDailyWithdrawalGhs,
      } = body;
      const res = await adminService.updateSettings(token, {
        wagerFeePercent: wagerFeePercent !== undefined ? Number(wagerFeePercent) : undefined,
        tournamentFeePercent: tournamentFeePercent !== undefined ? Number(tournamentFeePercent) : undefined,
        pointsPerGhsBuy: pointsPerGhsBuy !== undefined ? Number(pointsPerGhsBuy) : undefined,
        pointsPerGhsWithdraw: pointsPerGhsWithdraw !== undefined ? Number(pointsPerGhsWithdraw) : undefined,
        minDepositGhs: minDepositGhs !== undefined ? Number(minDepositGhs) : undefined,
        maxDepositGhs: maxDepositGhs !== undefined ? Number(maxDepositGhs) : undefined,
        minWithdrawalGhs: minWithdrawalGhs !== undefined ? Number(minWithdrawalGhs) : undefined,
        maxWithdrawalGhs: maxWithdrawalGhs !== undefined ? Number(maxWithdrawalGhs) : undefined,
        maxDailyWithdrawalGhs: maxDailyWithdrawalGhs !== undefined ? Number(maxDailyWithdrawalGhs) : undefined,
      });
      return NextResponse.json({ success: true, settings: res });
    }

    if (action === "update_transaction") {
      const { txId, newStatus, notes } = body;
      if (!txId || !["completed", "failed", "pending"].includes(newStatus)) {
        return NextResponse.json({ error: "Valid txId and status required" }, { status: 400 });
      }

      const res = await adminService.updateTransactionStatus(token, txId, newStatus, notes);
      return NextResponse.json({ success: true, transaction: res });
    }

    if (action === "create_admin") {
      const { newAdminUsername, newAdminPasscode, newRole } = body;
      const res = await adminService.createAdminAccount(
        token,
        String(newAdminUsername || ""),
        String(newAdminPasscode || ""),
        newRole || "admin"
      );
      return NextResponse.json({ success: true, profile: res });
    }

    if (action === "tournament_escrow") {
      const { leagueId, escrowAction, winnerToken } = body;
      if (!leagueId || !["disburse", "refund"].includes(escrowAction)) {
        return NextResponse.json({ error: "League ID and valid escrow action (disburse/refund) required" }, { status: 400 });
      }

      const res = await adminService.manageTournamentEscrow(token, leagueId, escrowAction, winnerToken);
      return NextResponse.json(res);
    }

    if (action === "add_ledger_entry" || action === "add_manual_transaction") {
      const { targetToken, type, currency, amount, reference, reason } = body;
      if (!targetToken || !amount) {
        return NextResponse.json({ error: "Target user token and non-zero amount required" }, { status: 400 });
      }

      const res = await adminService.addManualLedgerEntry(
        token,
        String(targetToken),
        type || "deposit",
        currency === "marbles" ? "marbles" : "points",
        Number(amount),
        String(reference || ""),
        String(reason || "")
      );
      return NextResponse.json({ success: true, ...res });
    }

    if (action === "get_tournament_details") {
      const { leagueId } = body;
      if (!leagueId) return NextResponse.json({ error: "League ID required" }, { status: 400 });

      const details = await leagueService.getLeagueDetails(String(leagueId));
      return NextResponse.json({ success: true, ...details });
    }

    if (action === "admin_create_tournament") {
      const { title, description, entryFeePoints, prizePoolPoints, maxParticipants, format, isPrivate, inviteCode, requiresApproval, scheduleDate, scheduleTime, gameDays, turnTimerSeconds, rulesNotes } = body;
      if (!title || !title.trim()) {
        return NextResponse.json({ error: "Tournament title required" }, { status: 400 });
      }

      const session = await dbRepository.getSession(token);
      const adminProfile = await dbRepository.getProfile(session ? session.userId : token);
      const facilitatorName = adminProfile?.username || "Admin Organizer";

      const league = await leagueService.createLeague(
        token,
        facilitatorName,
        String(title),
        String(description || ""),
        Number(entryFeePoints || 0),
        Number(prizePoolPoints || 0),
        Number(maxParticipants || 8),
        {
          format,
          isPrivate: Boolean(isPrivate),
          inviteCode: String(inviteCode || ""),
          requiresApproval: Boolean(requiresApproval),
          scheduleDate: String(scheduleDate || "Flexible"),
          scheduleTime: String(scheduleTime || "18:00 GMT"),
          gameDays: String(gameDays || "Weekends"),
          turnTimerSeconds: Number(turnTimerSeconds || 60),
          rulesNotes: String(rulesNotes || "Standard 10x10 Ghanaian Damii rules"),
        }
      );

      await adminService.logAdminAction(token, facilitatorName, "CREATE_TOURNAMENT", league.id, { title: league.title, format: league.format });

      return NextResponse.json({ success: true, league });
    }

    if (action === "admin_update_tournament") {
      const { leagueId, updates } = body;
      if (!leagueId || !updates) return NextResponse.json({ error: "League ID and updates object required" }, { status: 400 });

      const league = await leagueService.updateLeagueSettings(token, String(leagueId), updates);
      return NextResponse.json({ success: true, league });
    }

    if (action === "admin_add_participant") {
      const { leagueId, username } = body;
      if (!leagueId || !username) return NextResponse.json({ error: "League ID and username required" }, { status: 400 });

      const participant = await leagueService.addParticipantManual(token, String(leagueId), String(username));
      return NextResponse.json({ success: true, participant });
    }

    if (action === "admin_approve_applicant") {
      const { participantId } = body;
      if (!participantId) return NextResponse.json({ error: "Participant ID required" }, { status: 400 });

      const participant = await leagueService.approveApplicant(token, String(participantId));
      return NextResponse.json({ success: true, participant });
    }

    if (action === "admin_reject_applicant") {
      const { participantId } = body;
      if (!participantId) return NextResponse.json({ error: "Participant ID required" }, { status: 400 });

      const participant = await leagueService.rejectApplicant(token, String(participantId));
      return NextResponse.json({ success: true, participant });
    }

    if (action === "admin_cancel_tournament") {
      const { leagueId, reason } = body;
      if (!leagueId) return NextResponse.json({ error: "League ID required" }, { status: 400 });

      const league = await leagueService.cancelTournament(token, String(leagueId), String(reason || "Cancelled by Admin"));
      return NextResponse.json({ success: true, league });
    }

    if (action === "admin_generate_bracket") {
      const { leagueId } = body;
      if (!leagueId) return NextResponse.json({ error: "League ID required" }, { status: 400 });

      const matches = await leagueService.generateTournamentBracket(String(leagueId));
      return NextResponse.json({ success: true, matches });
    }

    if (action === "admin_submit_match_result") {
      const { matchId, winnerToken, disputeNotes } = body;
      if (!matchId || winnerToken === undefined) {
        return NextResponse.json({ error: "Match ID and winnerToken/draw required" }, { status: 400 });
      }

      const res = await leagueService.submitLeagueMatchResult(
        token,
        String(matchId),
        winnerToken === "draw" ? "draw" : String(winnerToken),
        String(disputeNotes || "")
      );
      return NextResponse.json({ success: true, ...res });
    }

    if (action === "dispute") {
      const { roomCode, winnerToken, reason } = body;
      if (!roomCode) return NextResponse.json({ error: "Room code required" }, { status: 400 });

      const room = await adminService.resolveMatchDispute(token, roomCode, winnerToken || null, reason || "Admin resolution");
      return NextResponse.json({ success: true, room });
    }

    if (action === "approve_organizer") {
      const { targetToken } = body;
      if (!targetToken) return NextResponse.json({ error: "Target token required" }, { status: 400 });

      const res = await adminService.approveOrganizerRequest(token, String(targetToken));
      return NextResponse.json({ success: true, organizerProfile: res });
    }

    if (action === "reject_organizer") {
      const { targetToken, reason } = body;
      if (!targetToken) return NextResponse.json({ error: "Target token required" }, { status: 400 });

      const res = await adminService.rejectOrganizerRequest(token, String(targetToken), String(reason || ""));
      return NextResponse.json({ success: true, organizerProfile: res });
    }

    return NextResponse.json({ error: "Invalid admin action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Admin execution error" },
      { status: 500 }
    );
  }
}
