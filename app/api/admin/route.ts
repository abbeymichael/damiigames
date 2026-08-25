import { NextRequest, NextResponse } from "next/server";
import { adminService } from "@/lib/admin-service";
import { leagueService } from "@/lib/league-service";
import { walletService } from "@/lib/wallet-service";
import { dbRepository } from "@/lib/db-client";
import { attachAuthCookies } from "@/lib/auth-guard";
import { hasPermission } from "@/lib/permissions";
import { notificationService } from "@/lib/notification-service";

const cleanToken = (v: unknown) => String(v ?? "").trim().slice(0, 80);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = cleanToken(searchParams.get("token"));

  if (!(await adminService.verifyAdminAccessAsync(token))) {
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

    if (action === "admin_login" || action === "login") {
      const { username, passcode } = body;
      const res = await adminService.adminLogin(String(username || ""), String(passcode || ""));
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

    if (!(await adminService.verifyAdminAccessAsync(token))) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 403 });
    }

    if (action === "seed" || action === "seed_initial_data") {
      const seedResult = await adminService.seedInitialData();
      return NextResponse.json({ success: true, ...seedResult });
    }

    if (action === "get_admin_profile" || action === "admin_profile") {
      const res = await adminService.getAdminSelfProfile(token);
      return NextResponse.json({ success: true, ...res });
    }

    if (action === "update_admin_profile" || action === "edit_admin_profile") {
      const { updates } = body;
      if (!updates || typeof updates !== "object") {
        return NextResponse.json({ error: "Updates object is required" }, { status: 400 });
      }
      const updated = await adminService.updateAdminSelfProfile(token, updates);
      return NextResponse.json({ success: true, profile: updated });
    }

    if (action === "get_user_details") {
      const { targetToken } = body;
      if (!targetToken) return NextResponse.json({ error: "Target user token required" }, { status: 400 });

      const details = await adminService.getUserDetails(token, String(targetToken));
      return NextResponse.json({ success: true, ...details });
    }

    if (action === "suspend_user") {
      const { targetToken, reason } = body;
      if (!targetToken) return NextResponse.json({ error: "Target token required" }, { status: 400 });

      const res = await adminService.suspendUser(token, targetToken, String(reason || ""));
      return NextResponse.json({ success: true, profile: res });
    }

    if (action === "reactivate_user") {
      const { targetToken } = body;
      if (!targetToken) return NextResponse.json({ error: "Target token required" }, { status: 400 });

      const res = await adminService.reactivateUser(token, targetToken);
      return NextResponse.json({ success: true, profile: res });
    }

    if (action === "force_logout_user" || action === "revoke_user_sessions") {
      const { targetToken } = body;
      if (!targetToken) return NextResponse.json({ error: "Target token required" }, { status: 400 });

      const res = await adminService.forceLogoutUser(token, targetToken);
      return NextResponse.json({ success: true, ...res });
    }

    if (action === "change_user_role") {
      const { targetToken, newRole, reason } = body;
      if (!targetToken || !["user", "player", "organizer", "facilitator", "admin", "super_admin", "treasurer"].includes(newRole)) {
        return NextResponse.json({ error: "Valid targetToken and newRole required" }, { status: 400 });
      }

      const res = await adminService.changeUserRole(token, targetToken, newRole, String(reason || ""));
      return NextResponse.json({ success: true, profile: res });
    }

    if (action === "unlink_reset_phone") {
      const { targetToken, reason } = body;
      if (!targetToken) return NextResponse.json({ error: "Target token required" }, { status: 400 });

      const res = await adminService.unlinkResetPhone(token, targetToken, String(reason || ""));
      return NextResponse.json({ success: true, profile: res });
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
        turnTimerSeconds,
        disconnectGraceSeconds,
        unjoinedRoomExpiryMinutes,
        maintenanceMode,
        maintenanceNotice,
        disableWagers,
        disableWithdrawals,
        publicSpectatingEnabled,
        defaultRating,
        ratingKFactor,
        minWagerGhs,
        maxWagerGhs,
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
        turnTimerSeconds: turnTimerSeconds !== undefined ? Number(turnTimerSeconds) : undefined,
        disconnectGraceSeconds: disconnectGraceSeconds !== undefined ? Number(disconnectGraceSeconds) : undefined,
        unjoinedRoomExpiryMinutes: unjoinedRoomExpiryMinutes !== undefined ? Number(unjoinedRoomExpiryMinutes) : undefined,
        maintenanceMode: maintenanceMode !== undefined ? Boolean(maintenanceMode) : undefined,
        maintenanceNotice: maintenanceNotice !== undefined ? String(maintenanceNotice) : undefined,
        disableWagers: disableWagers !== undefined ? Boolean(disableWagers) : undefined,
        disableWithdrawals: disableWithdrawals !== undefined ? Boolean(disableWithdrawals) : undefined,
        publicSpectatingEnabled: publicSpectatingEnabled !== undefined ? Boolean(publicSpectatingEnabled) : undefined,
        defaultRating: defaultRating !== undefined ? Number(defaultRating) : undefined,
        ratingKFactor: ratingKFactor !== undefined ? Number(ratingKFactor) : undefined,
        minWagerGhs: minWagerGhs !== undefined ? Number(minWagerGhs) : undefined,
        maxWagerGhs: maxWagerGhs !== undefined ? Number(maxWagerGhs) : undefined,
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

    if (action === "get_system_funds") {
      const report = await adminService.getSystemFunds(token);
      return NextResponse.json({ success: true, report });
    }

    if (action === "reconcile_funds") {
      const report = await adminService.reconcileFunds(token);
      return NextResponse.json({ success: true, report });
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

    if (action === "get_paystack_balance") {
      const res = await walletService.getPaystackBalance();
      return NextResponse.json({ success: true, ...res });
    }

    if (action === "process_payout" || action === "process_withdrawal") {
      const { transactionId, txId, reference } = body;
      const target = transactionId || txId || reference;
      if (!target) return NextResponse.json({ error: "Transaction ID or reference required" }, { status: 400 });
      const res = await walletService.processWithdrawalPayout(String(target), token);
      return NextResponse.json({ success: true, ...res });
    }

    if (action === "reject_withdrawal") {
      const { transactionId, txId, reference, reason } = body;
      const target = transactionId || txId || reference;
      if (!target) return NextResponse.json({ error: "Transaction ID or reference required" }, { status: 400 });
      if (!reason || !String(reason).trim()) {
        return NextResponse.json({ error: "Rejection reason required for audit trail" }, { status: 400 });
      }
      const res = await walletService.rejectWithdrawal(String(target), token, String(reason).trim());
      return NextResponse.json({ success: true, ...res });
    }

    if (action === "batch_process_payouts") {
      const { transactionIds, txIds } = body;
      const list = Array.isArray(transactionIds) ? transactionIds : Array.isArray(txIds) ? txIds : [];
      if (list.length === 0) return NextResponse.json({ error: "Array of transaction IDs required" }, { status: 400 });
      const res = await walletService.batchProcessWithdrawals(list.map(String), token);
      return NextResponse.json({ success: true, ...res });
    }

    if (action === "verify_deposit" || action === "verify_paystack_deposit") {
      const { reference } = body;
      if (!reference) return NextResponse.json({ error: "Reference required" }, { status: 400 });
      const res = await walletService.verifyAndCreditPaystack(String(reference));
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
          rulesNotes: String(rulesNotes || "Standard 10x10 Damii rules"),
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

    if (action === "dispute" || action === "resolve_dispute") {
      const { roomCode, winnerToken, reason } = body;
      if (!roomCode) return NextResponse.json({ error: "Room code required" }, { status: 400 });

      const room = await adminService.resolveMatchDispute(token, roomCode, winnerToken || null, reason || "Admin resolution");
      return NextResponse.json({ success: true, room });
    }

    if (action === "review_dispute") {
      const { roomCode, decision, winnerToken, reviewNotes } = body;
      if (!roomCode || !decision || !["confirm", "correct", "void"].includes(decision)) {
        return NextResponse.json({ error: "Room code and valid decision (confirm, correct, void) required" }, { status: 400 });
      }

      const room = await adminService.reviewDisputeMatch(
        token,
        String(roomCode),
        decision,
        winnerToken ? String(winnerToken) : null,
        String(reviewNotes || "Administrative review completed")
      );
      return NextResponse.json({ success: true, room });
    }

    if (action === "disqualify_participant") {
      const { leagueId, participantToken, reason, evidence } = body;
      if (!leagueId || !participantToken || !reason) {
        return NextResponse.json({ error: "League ID, participantToken, and reason required" }, { status: 400 });
      }

      const participant = await adminService.adminDisqualifyParticipant(
        token,
        String(leagueId),
        String(participantToken),
        String(reason),
        evidence ? String(evidence) : undefined
      );
      return NextResponse.json({ success: true, participant });
    }

    if (action === "resize_tournament") {
      const { leagueId, newMaxParticipants } = body;
      if (!leagueId || !newMaxParticipants) {
        return NextResponse.json({ error: "League ID and newMaxParticipants required" }, { status: 400 });
      }

      const league = await leagueService.resizeTournament(token, String(leagueId), Number(newMaxParticipants));
      return NextResponse.json({ success: true, league });
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

    if (action === "purge_expired_rooms" || action === "clean_stale_rooms") {
      const res = await adminService.purgeExpiredRooms(token);
      return NextResponse.json({ success: true, ...res });
    }

    if (action === "reconcile_all_balances" || action === "audit_ledger_balances") {
      const res = await adminService.reconcileAllUserBalances(token);
      return NextResponse.json(res);
    }

    if (action === "get_chart_of_accounts") {
      const report = dbRepository.getChartOfAccountsReport
        ? await dbRepository.getChartOfAccountsReport()
        : null;
      return NextResponse.json({ success: true, report });
    }

    if (action === "get_treasury_fund" || action === "get_treasury_details") {
      const details = dbRepository.getTreasuryFundDetails
        ? await dbRepository.getTreasuryFundDetails()
        : null;
      return NextResponse.json({ success: true, details });
    }

    if (action === "reconcile_system_funds") {
      const { reconcileSystemFunds } = await import("@/lib/ledger");
      const res = await reconcileSystemFunds();
      return NextResponse.json(res);
    }

    if (action === "system_diagnostics" || action === "health_check") {
      const diagnostics = await adminService.getSystemDiagnostics(token);
      return NextResponse.json({ success: true, diagnostics });
    }

    if (action === "export_system_snapshot" || action === "backup_state") {
      const snapshot = await adminService.exportSystemSnapshot(token);
      return NextResponse.json({ success: true, snapshot });
    }

    /* ------------------------------------------------------------------------- */
    /* RBAC & Role Management Actions (Section 1)                                */
    /* ------------------------------------------------------------------------- */
    if (action === "get_roles") {
      const rolesList = await adminService.listRoles(token);
      return NextResponse.json({ success: true, roles: rolesList });
    }

    if (action === "create_role") {
      const { name, description, permissionKeys } = body;
      if (!name) return NextResponse.json({ error: "Role name is required" }, { status: 400 });
      const role = await adminService.createRole(token, String(name), String(description || ""), permissionKeys || []);
      return NextResponse.json({ success: true, role });
    }

    if (action === "update_role") {
      const { roleId, name, description, permissionKeys } = body;
      if (!roleId) return NextResponse.json({ error: "Role ID required" }, { status: 400 });
      const role = await adminService.updateRole(token, String(roleId), { name, description }, permissionKeys);
      return NextResponse.json({ success: true, role });
    }

    if (action === "delete_role") {
      const { roleId } = body;
      if (!roleId) return NextResponse.json({ error: "Role ID required" }, { status: 400 });
      const res = await adminService.deleteRole(token, String(roleId));
      return NextResponse.json(res);
    }

    if (action === "get_permissions") {
      const perms = await dbRepository.listPermissions();
      return NextResponse.json({ success: true, permissions: perms });
    }

    if (action === "assign_admin_roles") {
      const { targetUserId, roleIds } = body;
      if (!targetUserId || !Array.isArray(roleIds)) {
        return NextResponse.json({ error: "targetUserId and roleIds array required" }, { status: 400 });
      }
      const res = await adminService.assignAdminRoles(token, String(targetUserId), roleIds);
      return NextResponse.json(res);
    }

    if (action === "get_admin_accounts") {
      const accounts = await adminService.listAdminAccounts(token);
      return NextResponse.json({ success: true, adminAccounts: accounts });
    }

    if (action === "delete_admin" || action === "delete_admin_account") {
      const { targetUserId, targetToken } = body;
      const target = targetUserId || targetToken;
      if (!target) return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
      const res = await adminService.deleteAdminAccount(token, String(target));
      return NextResponse.json(res);
    }

    /* ------------------------------------------------------------------------- */
    /* Organizer Applications & Workflow Management (Section 5)                  */
    /* ------------------------------------------------------------------------- */
    if (action === "list_organizer_applications") {
      const { status } = body;
      const apps = await adminService.listOrganizerApplications(token, status);
      return NextResponse.json({ success: true, applications: apps });
    }

    if (action === "get_organizer_application_detail") {
      const { applicationId } = body;
      if (!applicationId) return NextResponse.json({ error: "applicationId required" }, { status: 400 });
      const detail = await adminService.getOrganizerApplicationDetail(token, String(applicationId));
      return NextResponse.json({ success: true, ...detail });
    }

    if (action === "approve_organizer_application") {
      const { applicationId, reviewNote } = body;
      if (!applicationId) return NextResponse.json({ error: "applicationId required" }, { status: 400 });
      const app = await adminService.approveOrganizerApplication(token, String(applicationId), reviewNote ? String(reviewNote) : undefined);
      return NextResponse.json({ success: true, application: app, message: "Organizer application approved successfully." });
    }

    if (action === "reject_organizer_application") {
      const { applicationId, reviewNote } = body;
      if (!applicationId || !reviewNote) {
        return NextResponse.json({ error: "applicationId and reviewNote (rejection reason) required" }, { status: 400 });
      }
      const app = await adminService.rejectOrganizerApplication(token, String(applicationId), String(reviewNote));
      return NextResponse.json({ success: true, application: app, message: "Organizer application rejected." });
    }

    if (action === "request_more_info_organizer_application") {
      const { applicationId, reviewNote } = body;
      if (!applicationId || !reviewNote) {
        return NextResponse.json({ error: "applicationId and reviewNote (information instructions) required" }, { status: 400 });
      }
      const app = await adminService.requestMoreInfoOrganizerApplication(token, String(applicationId), String(reviewNote));
      return NextResponse.json({ success: true, application: app, message: "Additional information requested from applicant." });
    }

    if (action === "revoke_organizer" || action === "revoke_organizer_status") {
      const { targetToken, targetUserId, applicationId, reason, tournamentHandling } = body;
      const target = targetToken || targetUserId || applicationId;
      if (!target) return NextResponse.json({ error: "targetToken or applicationId required" }, { status: 400 });
      const res = await adminService.revokeOrganizerStatus(
        token,
        String(target),
        String(reason || ""),
        tournamentHandling === "cancel_and_refund" ? "cancel_and_refund" : "reassign_to_system"
      );
      return NextResponse.json({ success: true, ...res });
    }

    if (action === "delete_organizer" || action === "delete_organizer_application") {
      const { targetIdentifier, applicationId, targetToken, targetUserId } = body;
      const target = targetIdentifier || applicationId || targetToken || targetUserId;
      if (!target) return NextResponse.json({ error: "target identifier required" }, { status: 400 });
      const res = await adminService.deleteOrganizer(token, String(target));
      return NextResponse.json({ success: true, ...res });
    }

    /* ------------------------------------------------------------------------- */
    /* Games Catalog Management (Section 2.2)                                    */
    /* ------------------------------------------------------------------------- */
    if (action === "get_games") {
      const games = await adminService.listGames(token);
      return NextResponse.json({ success: true, games });
    }

    if (action === "save_game" || action === "create_game" || action === "update_game") {
      const { game } = body;
      if (!game || !game.name || !game.slug) {
        return NextResponse.json({ error: "Valid game payload with name and slug required" }, { status: 400 });
      }
      const saved = await adminService.saveGame(token, game);
      return NextResponse.json({ success: true, game: saved });
    }

    if (action === "toggle_game_status") {
      const { gameId, status } = body;
      if (!gameId || !["enabled", "disabled"].includes(status)) {
        return NextResponse.json({ error: "gameId and valid status ('enabled'|'disabled') required" }, { status: 400 });
      }
      const updated = await adminService.toggleGameStatus(token, String(gameId), status);
      return NextResponse.json({ success: true, game: updated });
    }

    /* ------------------------------------------------------------------------- */
    /* Tournament Action Requests Queue (Section 2.3)                            */
    /* ------------------------------------------------------------------------- */
    if (action === "get_tournament_requests") {
      const { status } = body;
      const requests = await adminService.listTournamentActionRequests(token, status);
      return NextResponse.json({ success: true, requests });
    }

    if (action === "submit_tournament_request") {
      const { tournamentId, requestType, reason, targetUserId, matchId } = body;
      if (!tournamentId || !requestType || !reason) {
        return NextResponse.json({ error: "tournamentId, requestType, and reason required" }, { status: 400 });
      }
      const reqItem = await adminService.createTournamentActionRequest(
        token,
        String(tournamentId),
        requestType,
        String(reason),
        targetUserId ? String(targetUserId) : undefined,
        matchId ? String(matchId) : undefined
      );
      return NextResponse.json({ success: true, request: reqItem });
    }

    if (action === "review_tournament_request") {
      const { requestId, decision, reviewNote } = body;
      if (!requestId || !["approved", "rejected"].includes(decision)) {
        return NextResponse.json({ error: "requestId and decision ('approved'|'rejected') required" }, { status: 400 });
      }
      const reviewed = await adminService.reviewTournamentActionRequest(
        token,
        String(requestId),
        decision,
        reviewNote ? String(reviewNote) : undefined
      );
      return NextResponse.json({ success: true, request: reviewed });
    }

    /* ------------------------------------------------------------------------- */
    /* System Settings Categories (SMS, Email, General, Security) (Section 2.7)  */
    /* ------------------------------------------------------------------------- */
    if (action === "get_system_settings") {
      const { category } = body;
      const settingsList = await adminService.getSystemSettings(token, category);
      return NextResponse.json({ success: true, settings: settingsList });
    }

    if (action === "save_system_setting") {
      const { category, key, value } = body;
      if (!category || !key) {
        return NextResponse.json({ error: "category and key required" }, { status: 400 });
      }
      const entry = await adminService.saveSystemSetting(token, category, key, value);
      return NextResponse.json({ success: true, setting: entry });
    }

    /* ------------------------------------------------------------------------- */
    /* Notification Providers, Channels & Routing (Section 3.0)                  */
    /* ------------------------------------------------------------------------- */
    if (action === "get_notification_settings") {
      const settings = await notificationService.getAllNotificationSettings();
      return NextResponse.json({ success: true, ...settings });
    }

    if (action === "save_notification_settings") {
      const { category, data } = body;
      if (!category || !data) {
        return NextResponse.json({ error: "category ('in_app'|'whatsapp'|'sms'|'email'|'routing') and data object required" }, { status: 400 });
      }
      const updated = await notificationService.saveNotificationCategorySettings(category, data, token);
      await adminService.logAdminAction(token, "Admin", "NOTIFICATION_SETTINGS_UPDATED", category, { category });
      return NextResponse.json({ success: true, ...updated });
    }

    if (action === "send_test_notification") {
      const {
        channel,
        recipient,
        title,
        message,
        actionUrl,
        actionLabel,
        type,
        customSubject,
        customTemplate,
        templateData,
      } = body;
      if (!channel || !recipient) {
        return NextResponse.json({ error: "channel ('in_app'|'whatsapp'|'sms'|'email') and recipient required" }, { status: 400 });
      }
      const result = await notificationService.sendTestNotification({
        channel,
        recipient,
        title,
        message,
        actionUrl,
        actionLabel,
        type,
        customSubject,
        customTemplate,
        templateData,
      });
      await adminService.logAdminAction(token, "Admin", "TEST_NOTIFICATION_SENT", recipient, { channel, title, result });
      return NextResponse.json({ success: true, result, message: `Test ${channel.toUpperCase()} notification sent to ${recipient}!` });
    }

    if (action === "get_notification_logs") {
      const logs = notificationService.getDispatchedLogs();
      return NextResponse.json({ success: true, logs });
    }

    if (action === "send_communication" || action === "broadcast_communication") {
      const {
        targetType,
        targetRole,
        targetRecipients,
        channels,
        title,
        message,
        urgency,
        type,
        actionUrl,
        actionLabel,
        customSubject,
        customTemplate,
      } = body;

      if (!message || !message.trim()) {
        return NextResponse.json({ error: "Message content is required" }, { status: 400 });
      }

      const res = await adminService.sendAdminCommunication(token, {
        targetType: targetType || "all",
        targetRole,
        targetRecipients,
        channels: channels && channels.length > 0 ? channels : ["in_app"],
        title: title || "DAMII Platform Notice",
        message: message.trim(),
        urgency: urgency || "normal",
        type: type || "system",
        actionUrl: actionUrl || "/arena",
        actionLabel: actionLabel || "Open Arena",
        customSubject,
        customTemplate,
      });

      return NextResponse.json({
        success: true,
        ...res,
        message: `Communication dispatched successfully to ${res.summary.totalTargeted} user(s) across [${res.summary.channels.join(", ")}].`,
      });
    }

    if (action === "send_test_sms") {
      const { phoneNumber, message } = body;
      if (!phoneNumber) return NextResponse.json({ error: "Phone number required" }, { status: 400 });
      await notificationService.sendTestNotification({
        channel: "sms",
        recipient: phoneNumber,
        message: message || "Test message from DAMII",
      });
      await adminService.logAdminAction(token, "Admin", "TEST_SMS_SENT", phoneNumber, { message: message || "Test message from DAMII" });
      return NextResponse.json({ success: true, message: `Test SMS successfully queued to ${phoneNumber}` });
    }

    if (action === "send_test_email") {
      const { email, subject, body: emailBody, type, customSubject, customTemplate, templateData } = body;
      if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
      const result = await notificationService.sendTestNotification({
        channel: "email",
        recipient: email,
        title: subject || customSubject || "DAMII Test Email",
        message: emailBody || customTemplate || "Test notification from DAMII",
        type: type || "system",
        customSubject: customSubject || subject,
        customTemplate: customTemplate || emailBody,
        templateData,
      });
      await adminService.logAdminAction(token, "Admin", "TEST_EMAIL_SENT", email, { subject, body: emailBody });
      return NextResponse.json({ success: true, result, message: `Test email successfully queued to ${email}` });
    }

    return NextResponse.json({ error: "Invalid admin action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Admin execution error" },
      { status: 500 }
    );
  }
}
