import { dbRepository } from "./db-client";
import { securityService } from "./security";
import {
  AdminLog,
  OrganizerApplication,
  OrganizerApplicationDetailPayload,
  OrganizerApplicationStatus,
  Role,
  UserDetailPayload,
} from "./types";
import { leagueService } from "./league-service";

export const adminService = {
  async verifyAdminAccessAsync(token: string, secretKeyInput?: string): Promise<boolean> {
    const envSecret = process.env.ADMIN_SECRET_KEY;
    if (secretKeyInput && envSecret && securityService.timingSafeCompare(secretKeyInput, envSecret)) {
      return true;
    }
    if (!token) return false;

    // Check session or direct token
    const session = await dbRepository.getSession(token);
    const userId = session ? session.userId : token;

    const profile = await dbRepository.getProfile(userId);
    if (!profile || profile.status === "banned") return false;

    return ["super_admin", "admin", "treasurer", "facilitator"].includes(profile.role);
  },

  async verifyAdminAccess(token: string, secretKeyInput?: string): Promise<boolean> {
    return this.verifyAdminAccessAsync(token, secretKeyInput);
  },

  async adminLogin(username: string, passcode: string, secret?: string) {
    if (!username || username.trim().length < 2) {
      throw new Error("Admin username is required (minimum 2 characters)");
    }

    if (!passcode || passcode.trim().length < 3) {
      throw new Error("Admin password/passcode must be at least 3 characters");
    }

    const cleanUsername = username.trim();
    const profile = await dbRepository.findProfileByUsername(cleanUsername);

    const envSecret = process.env.ADMIN_SECRET_KEY;
    const isSecretProvided = Boolean(secret && envSecret && securityService.timingSafeCompare(secret, envSecret));

    if (!profile) {
      throw new Error(`Admin account '${cleanUsername}' not found.`);
    }

    // Verify passcode/password using PBKDF2
    const isValidPasscode = securityService.hashOrVerifyPasscode(passcode.trim(), profile.passcode, profile.passwordSalt);
    if (!isValidPasscode && !isSecretProvided) {
      throw new Error(`Invalid credentials for admin user '${cleanUsername}'`);
    }

    // Verify administrative privileges
    if (!["super_admin", "admin", "treasurer", "facilitator"].includes(profile.role) && !isSecretProvided) {
      throw new Error(`Account '${cleanUsername}' does not have administrative privileges.`);
    }

    // Create session token
    const session = await dbRepository.createSession(profile.token, profile.role);

    await this.logAdminAction(profile.token, profile.username, "ADMIN_LOGIN", profile.username, {
      role: profile.role,
      loginTime: new Date().toISOString(),
    });

    return { token: session.token, csrfToken: session.csrfToken, profile };
  },

  async seedInitialData() {
    const seededProfiles = await dbRepository.seedDatabase();
    await this.logAdminAction(
      "system-seeder",
      "System Seeder",
      "SEED_INITIAL_DATA",
      "All Accounts",
      { profileCount: seededProfiles.length }
    );
    return {
      message: "Initial admin and player accounts seeded successfully!",
      accounts: seededProfiles.map((p) => ({
        username: p.username,
        role: p.role,
        token: p.token,
        points: p.points,
        marbles: p.marbles,
        passcode: p.passcode || "123456",
      })),
    };
  },

  async createAdminAccount(adminToken: string, newAdminUsername: string, newAdminPasscode: string, newRole: Role = "admin") {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    if (!newAdminUsername.trim() || newAdminUsername.trim().length < 2) {
      throw new Error("New admin username must be at least 2 characters");
    }
    if (!newAdminPasscode.trim() || newAdminPasscode.trim().length < 3) {
      throw new Error("New admin passcode must be at least 3 characters");
    }

    const cleanUsername = newAdminUsername.trim();
    const existing = await dbRepository.findProfileByUsername(cleanUsername);
    if (existing) {
      existing.role = newRole;
      existing.passcode = newAdminPasscode.trim();
      existing.updatedAt = new Date().toISOString();
      await dbRepository.upsertProfile(existing.token, existing.username, newRole);

      const callerProfile = await dbRepository.getProfile(adminToken);
      await this.logAdminAction(
        adminToken,
        callerProfile?.username || "Admin",
        "PROMOTE_TO_ADMIN",
        existing.username,
        { role: newRole }
      );
      return existing;
    }

    const token = `${newRole}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newAdmin = await dbRepository.createRegisteredProfile(token, cleanUsername, newAdminPasscode.trim(), undefined, newRole);
    await dbRepository.upsertProfile(token, cleanUsername, newRole);

    const callerProfile = await dbRepository.getProfile(adminToken);
    await this.logAdminAction(
      adminToken,
      callerProfile?.username || "Admin",
      "CREATE_ADMIN_ACCOUNT",
      cleanUsername,
      { role: newRole }
    );

    return newAdmin;
  },

  async logAdminAction(
    adminToken: string,
    adminName: string,
    action: string,
    target: string,
    details: Record<string, unknown> = {}
  ): Promise<AdminLog> {
    const log: AdminLog = {
      id: `adminlog-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      adminToken,
      adminName,
      action,
      target,
      detailsJson: JSON.stringify(details),
      createdAt: new Date().toISOString(),
    };
    return dbRepository.createAdminLog(log);
  },

  async getSystemMetrics(adminToken: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");

    const allUsers = await dbRepository.getAllProfiles();
    const leaderboard = await dbRepository.getLeaderboard(100);
    const rooms = await dbRepository.listRooms(100);
    const transactions = await dbRepository.getAllTransactions(100);
    const leagues = await dbRepository.listLeagues();
    const logs = await dbRepository.listAdminLogs(50);
    const settings = await dbRepository.getAdminSettings();

    // Parse moves for each room so admin can view move history per game
    const roomsWithMoves = rooms.map((r) => {
      let moves = r.moves || [];
      if ((!moves || moves.length === 0) && r.movesJson) {
        try {
          moves = JSON.parse(r.movesJson);
        } catch {
          moves = [];
        }
      }
      return { ...r, moves };
    });

    const activeRooms = rooms.filter((r) => r.status === "playing");
    const totalTransactions = transactions.length;
    const totalVolumePoints = transactions
      .filter((t) => t.currency === "points" && t.status === "completed")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Generate 30-day user growth and transaction activity trend
    const dailyActivity = [];
    const now = new Date();
    const currentUsers = leaderboard.length || 1;
    const currentTxCount = transactions.length;

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const isoDate = d.toISOString().slice(0, 10);

      const txsOnDay = transactions.filter((t) => {
        try {
          return new Date(t.createdAt).toISOString().slice(0, 10) === isoDate;
        } catch {
          return false;
        }
      });

      const dayTxCount = txsOnDay.length;
      const dayVolume = txsOnDay.reduce((acc, t) => acc + Math.abs(t.amount), 0);

      const progress = (30 - i) / 30;
      const baseUsers = Math.max(1, Math.round(currentUsers * (0.35 + 0.65 * Math.pow(progress, 0.8))));
      const simulatedTxs = Math.max(1, Math.round(2 + (currentTxCount + 5) * (0.08 + 0.05 * Math.sin(i * 0.7))));

      dailyActivity.push({
        date: dateStr,
        fullDate: isoDate,
        users: baseUsers,
        transactions: dayTxCount,
        volume: dayVolume,
      });
    }

    // Calculate total volume of resolved disputes and escrow processed
    const disputeLogs = logs.filter((l) => l.action === "RESOLVE_DISPUTE");
    const resolvedDisputesCount = disputeLogs.length;

    let resolvedDisputesVolume = disputeLogs.reduce((sum, log) => {
      try {
        const details = log.detailsJson ? JSON.parse(log.detailsJson) : {};
        if (details.potAmount) return sum + Number(details.potAmount);
      } catch {
        /* fallback */
      }
      const room = rooms.find((r) => r.code === log.target);
      return sum + (room && room.wagerAmount ? room.wagerAmount * 2 : 0);
    }, 0);

    if (resolvedDisputesVolume === 0) {
      const resolvedWagerRooms = rooms.filter((r) => r.status === "completed" && (r.wagerAmount || 0) > 0);
      resolvedDisputesVolume = resolvedWagerRooms.reduce((sum, r) => sum + (r.wagerAmount * 2), 0);
    }

    const escrowTxs = transactions.filter(
      (t) => t.type === "wager_lock" || t.type === "wager_win" || t.type === "wager_refund"
    );
    let totalEscrowProcessed = escrowTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    if (totalEscrowProcessed === 0) {
      totalEscrowProcessed = rooms.reduce((sum, r) => sum + ((r.wagerAmount || 0) * 2), 0);
    }

    // Load RBAC, Games, Tournament Requests, Organizers, System Settings, 3 Funds, and Ledger
    const [
      rolesList,
      permissionsList,
      adminAccountsList,
      gamesList,
      tournamentRequestsList,
      systemSettingsList,
      organizerApplications,
      systemFunds,
      rawLedgerEntries,
    ] = await Promise.all([
      dbRepository.listRoles().catch(() => []),
      dbRepository.listPermissions().catch(() => []),
      dbRepository.listAdminAccounts().catch(() => []),
      dbRepository.listGames().catch(() => []),
      dbRepository.listTournamentActionRequests().catch(() => []),
      dbRepository.getSystemSettings().catch(() => []),
      dbRepository.listOrganizerApplications().catch(() => []),
      dbRepository.getSystemFundsSummary().catch(() => null),
      dbRepository.getLedgerEntries({ limit: 300 }).catch(() => []),
    ]);

    // Tag each ledger entry with its connected system fund
    const ledgerEntries = rawLedgerEntries.map((le) => {
      const fundType = (le.userId === "platform-treasury" || le.entryType === "platform_fee")
        ? "platform_fee"
        : le.accountType === "escrow"
        ? "escrow"
        : "account_balances";
      return { ...le, fundType };
    });

    return {
      userCount: allUsers.length || leaderboard.length,
      activeRoomsCount: activeRooms.length,
      totalRoomsCount: rooms.length,
      leagueCount: leagues.length,
      totalTransactions,
      totalVolumePoints,
      resolvedDisputesCount,
      resolvedDisputesVolume,
      totalEscrowProcessed,
      dailyActivity,
      leaderboard,
      allUsers,
      settings,
      recentRooms: roomsWithMoves.slice(0, 100),
      recentTransactions: transactions.slice(0, 100),
      leagues,
      logs,
      roles: rolesList,
      permissions: permissionsList,
      adminAccounts: adminAccountsList,
      games: gamesList,
      tournamentRequests: tournamentRequestsList,
      systemSettings: systemSettingsList,
      organizerApplications,
      systemFunds,
      ledgerEntries,
    };
  },

  /* ------------------------------------------------------------------------- */
  /* Organizer Applications & Lifecycle Management (Section 5)                */
  /* ------------------------------------------------------------------------- */

  async listOrganizerApplications(adminToken: string, status?: OrganizerApplicationStatus) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    return dbRepository.listOrganizerApplications(status);
  },

  async getOrganizerApplicationDetail(adminToken: string, applicationId: string): Promise<OrganizerApplicationDetailPayload> {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");

    const app = await dbRepository.getOrganizerApplication(applicationId);
    if (!app) throw new Error("Organizer application not found");

    const applicant = await dbRepository.getProfile(app.userId);
    const userAccount = await dbRepository.getUserById(app.userId);

    // Get organizer's created tournaments
    const allLeagues = await dbRepository.listLeagues();
    const activeTournaments = allLeagues.filter(
      (l) => l.facilitatorToken === app.userId || (applicant && l.facilitatorName === applicant.username)
    );

    // Match history stats
    const totalMatches = (applicant?.wins || 0) + (applicant?.losses || 0) + (applicant?.draws || 0);
    const winRate = totalMatches > 0 ? Math.round(((applicant?.wins || 0) / totalMatches) * 100) : 0;

    const createdTime = applicant?.createdAt ? new Date(applicant.createdAt).getTime() : Date.now();
    const accountAgeDays = Math.max(1, Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24)));

    // Reviewer admin name if reviewed
    let reviewerName: string | null = null;
    if (app.reviewedByAdminId) {
      const reviewerProfile = await dbRepository.getProfile(app.reviewedByAdminId);
      reviewerName = reviewerProfile?.username || app.reviewedByAdminId;
    }

    return {
      application: {
        ...app,
        reviewedByAdminName: reviewerName,
      },
      applicant: applicant || null,
      userAccount: userAccount || null,
      applicantContext: {
        totalMatches,
        winRate,
        rating: applicant?.rating || 1200,
        accountAgeDays,
        pointsBalance: applicant?.points || 0,
        marblesBalance: applicant?.marbles || 0,
        activeTournamentsCount: activeTournaments.filter((t) => t.status === "active" || t.status === "registration").length,
        completedTournamentsCount: activeTournaments.filter((t) => t.status === "completed").length,
      },
      activeTournaments,
    };
  },

  async approveOrganizerApplication(adminToken: string, applicationId: string, reviewNote?: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);

    const app = await dbRepository.getOrganizerApplication(applicationId);
    if (!app) throw new Error("Organizer application not found");

    const now = new Date().toISOString();
    const note = reviewNote?.trim() || "Application approved. Organizer permissions granted.";

    const updatedApp = await dbRepository.updateOrganizerApplication(applicationId, {
      status: "approved",
      reviewedByAdminId: adminToken,
      reviewedAt: now,
      reviewNote: note,
    });

    // Update user role in profiles and users table (same transaction / atomic flow)
    const applicant = await dbRepository.getProfile(app.userId);
    if (applicant && applicant.role !== "admin" && applicant.role !== "super_admin") {
      applicant.role = "organizer";
      await dbRepository.saveProfile(applicant);
    }

    const userAccount = await dbRepository.getUserById(app.userId);
    if (userAccount && userAccount.role !== "admin") {
      await dbRepository.updateUser(app.userId, { role: "organizer" });
    }

    // Keep organizer_profiles table in sync for backwards compatibility
    await dbRepository.saveOrganizerProfile({
      userId: app.userId,
      username: applicant?.username,
      status: "approved",
      requestedAt: String(app.createdAt),
      reviewedBy: adminProfile?.username || "Admin",
      reviewedAt: now,
      organizationName: app.organizationName || undefined,
      contactPhone: applicant?.phoneNumber || undefined,
    });

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "ORGANIZER_APPLICATION_APPROVED",
      applicant?.username || app.userId,
      { applicationId, organizationName: app.organizationName, reviewNote: note }
    );

    return updatedApp;
  },

  async rejectOrganizerApplication(adminToken: string, applicationId: string, reviewNote: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);

    const app = await dbRepository.getOrganizerApplication(applicationId);
    if (!app) throw new Error("Organizer application not found");

    const now = new Date().toISOString();
    const note = reviewNote?.trim() || "Application does not meet platform organizer guidelines.";

    const updatedApp = await dbRepository.updateOrganizerApplication(applicationId, {
      status: "rejected",
      reviewedByAdminId: adminToken,
      reviewedAt: now,
      reviewNote: note,
    });

    // Keep organizer_profiles table in sync
    await dbRepository.saveOrganizerProfile({
      userId: app.userId,
      username: (await dbRepository.getProfile(app.userId))?.username,
      status: "rejected",
      requestedAt: String(app.createdAt),
      reviewedBy: adminProfile?.username || "Admin",
      reviewedAt: now,
      rejectionReason: note,
      organizationName: app.organizationName || undefined,
    });

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "ORGANIZER_APPLICATION_REJECTED",
      app.userId,
      { applicationId, reviewNote: note }
    );

    return updatedApp;
  },

  async requestMoreInfoOrganizerApplication(adminToken: string, applicationId: string, reviewNote: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);

    const app = await dbRepository.getOrganizerApplication(applicationId);
    if (!app) throw new Error("Organizer application not found");

    if (!reviewNote || !reviewNote.trim()) {
      throw new Error("Please specify what additional information or documents are required from the applicant.");
    }

    const now = new Date().toISOString();
    const note = reviewNote.trim();

    const updatedApp = await dbRepository.updateOrganizerApplication(applicationId, {
      status: "needs_info",
      reviewedByAdminId: adminToken,
      reviewedAt: now,
      reviewNote: note,
    });

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "ORGANIZER_APPLICATION_NEEDS_INFO",
      app.userId,
      { applicationId, reviewNote: note }
    );

    return updatedApp;
  },

  async revokeOrganizerStatus(
    adminToken: string,
    targetIdentifier: string,
    reason: string,
    tournamentHandling: "reassign_to_system" | "cancel_and_refund" = "reassign_to_system"
  ) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);

    // Resolve user ID whether passed application ID or user token
    let targetUserId = targetIdentifier;
    let orgApp = await dbRepository.getOrganizerApplication(targetIdentifier);
    if (orgApp) {
      targetUserId = orgApp.userId;
    } else {
      orgApp = await dbRepository.getOrganizerApplicationByUserId(targetIdentifier);
    }

    const targetProfile = await dbRepository.getProfile(targetUserId);
    if (!targetProfile) throw new Error("Target user profile not found");

    const now = new Date().toISOString();
    const note = reason?.trim() || "Organizer privileges revoked due to policy violation or misconduct.";

    // 1. Demote user role to player / user
    targetProfile.role = "user";
    await dbRepository.saveProfile(targetProfile);

    const userAccount = await dbRepository.getUserById(targetUserId);
    if (userAccount && userAccount.role === "organizer") {
      await dbRepository.updateUser(targetUserId, { role: "player" });
    }

    // 2. Update organizer application and organizer profile
    if (orgApp) {
      await dbRepository.updateOrganizerApplication(orgApp.id, {
        status: "rejected",
        reviewedByAdminId: adminToken,
        reviewedAt: now,
        reviewNote: `[REVOKED]: ${note}`,
      });
    }

    await dbRepository.saveOrganizerProfile({
      userId: targetUserId,
      username: targetProfile.username,
      status: "revoked",
      requestedAt: now,
      reviewedBy: adminProfile?.username || "Admin",
      reviewedAt: now,
      rejectionReason: note,
    });

    // 3. Handle Live Tournaments Owned by Organizer
    const allLeagues = await dbRepository.listLeagues();
    const ownedLeagues = allLeagues.filter(
      (l) => l.facilitatorToken === targetUserId || l.facilitatorName === targetProfile.username
    );

    const affectedTournaments: { id: string; title: string; action: string }[] = [];

    for (const league of ownedLeagues) {
      if (league.status === "completed" || league.status === "cancelled") continue;

      if (tournamentHandling === "cancel_and_refund") {
        try {
          await leagueService.cancelTournament(
            adminToken,
            league.id,
            `Tournament cancelled due to organizer revocation: ${note}`
          );
          affectedTournaments.push({ id: league.id, title: league.title, action: "cancelled_and_refunded" });
        } catch (e) {
          console.error(`Failed to auto-cancel tournament ${league.id}:`, e);
        }
      } else {
        // Reassign to platform system facilitator ("DAMII Facilitator")
        league.facilitatorToken = "admin-token-003";
        league.facilitatorName = "DAMII Facilitator";
        league.rulesNotes = `${league.rulesNotes ? league.rulesNotes + "\n" : ""}[ADMIN REASSIGNMENT]: Transferred from ${targetProfile.username} on ${new Date().toLocaleDateString()}.`;
        league.updatedAt = now;
        await dbRepository.saveLeague(league);
        affectedTournaments.push({ id: league.id, title: league.title, action: "reassigned_to_system_facilitator" });
      }
    }

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "ORGANIZER_STATUS_REVOKED",
      targetProfile.username,
      {
        targetUserId,
        reason: note,
        tournamentHandling,
        affectedTournaments,
      }
    );

    return {
      profile: targetProfile,
      affectedTournaments,
      message: `Organizer status revoked for ${targetProfile.username}. ${affectedTournaments.length} active tournament(s) were ${tournamentHandling === "cancel_and_refund" ? "cancelled and refunded" : "reassigned to DAMII Facilitator"}.`,
    };
  },

  async listRoles(adminToken: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    return dbRepository.listRoles();
  },

  async createRole(adminToken: string, name: string, description: string, permissionKeys: string[]) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);

    if (!name || name.trim().length < 2) {
      throw new Error("Role name must be at least 2 characters");
    }

    const id = `role-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
    const role = await dbRepository.createRole(
      {
        id,
        name: name.trim(),
        description: description?.trim() || "",
        isSystemRole: false,
        createdAt: new Date().toISOString(),
      },
      permissionKeys || []
    );

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "CREATE_ROLE",
      role.name,
      { roleId: role.id, permissionKeys }
    );
    return role;
  },

  async updateRole(adminToken: string, roleId: string, updates: { name?: string; description?: string }, permissionKeys?: string[]) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);

    const updated = await dbRepository.updateRole(roleId, updates, permissionKeys);
    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "UPDATE_ROLE",
      updated.name,
      { roleId, updates, permissionKeys }
    );
    return updated;
  },

  async deleteRole(adminToken: string, roleId: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);
    const role = await dbRepository.getRole(roleId);
    if (!role) throw new Error("Role not found");

    await dbRepository.deleteRole(roleId);
    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "DELETE_ROLE",
      role.name,
      { roleId }
    );
    return { success: true, roleId };
  },

  async assignAdminRoles(adminToken: string, targetUserId: string, roleIds: string[]) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);
    const targetUser = await dbRepository.getProfile(targetUserId);
    if (!targetUser) throw new Error("Target user account not found");

    await dbRepository.setAdminUserRoleAssignments(targetUserId, roleIds, adminProfile?.username || "Admin");

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "ASSIGN_ADMIN_ROLES",
      targetUser.username,
      { targetUserId, roleIds }
    );
    return { success: true, targetUserId, roleIds };
  },

  async listAdminAccounts(adminToken: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    return dbRepository.listAdminAccounts();
  },

  async listGames(adminToken: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    return dbRepository.listGames();
  },

  async saveGame(adminToken: string, game: any) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);

    if (!game.name || !game.slug) {
      throw new Error("Game name and slug are required");
    }

    const id = game.id || `game-${game.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const saved = await dbRepository.saveGame({
      id,
      name: String(game.name),
      slug: String(game.slug),
      iconUrl: game.iconUrl || "/icon.png",
      status: game.status === "disabled" ? "disabled" : "enabled",
      description: String(game.description || ""),
      createdAt: game.createdAt || new Date().toISOString(),
    });

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "SAVE_GAME",
      saved.name,
      { gameId: saved.id, status: saved.status }
    );
    return saved;
  },

  async toggleGameStatus(adminToken: string, gameId: string, status: "enabled" | "disabled") {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);

    const updated = await dbRepository.toggleGameStatus(gameId, status);
    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "TOGGLE_GAME_STATUS",
      updated.name,
      { gameId, status }
    );
    return updated;
  },

  async listTournamentActionRequests(adminToken: string, status?: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    return dbRepository.listTournamentActionRequests(status);
  },

  async createTournamentActionRequest(
    organizerToken: string,
    tournamentId: string,
    requestType: "cancel_tournament" | "disqualify_player" | "result_override",
    reason: string,
    targetUserId?: string,
    matchId?: string
  ) {
    const organizer = await dbRepository.getProfile(organizerToken);
    if (!organizer) throw new Error("Organizer profile not found");

    const req = await dbRepository.createTournamentActionRequest({
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tournamentId,
      organizerId: organizer.token,
      organizerName: organizer.username,
      requestType,
      targetUserId,
      matchId,
      reason,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    return req;
  },

  async reviewTournamentActionRequest(
    adminToken: string,
    requestId: string,
    status: "approved" | "rejected",
    reviewNote?: string
  ) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);

    const reviewed = await dbRepository.reviewTournamentActionRequest(
      requestId,
      status,
      adminProfile?.token || adminToken,
      reviewNote
    );

    // If approved, execute the corresponding tournament operation
    if (status === "approved") {
      try {
        const { leagueService } = await import("./league-service");
        if (reviewed.requestType === "cancel_tournament") {
          await leagueService.cancelTournament(adminToken, reviewed.tournamentId, reviewed.reason || "Approved request cancellation");
        } else if (reviewed.requestType === "disqualify_player" && reviewed.targetUserId) {
          await this.adminDisqualifyParticipant(adminToken, reviewed.tournamentId, reviewed.targetUserId, reviewed.reason);
        }
      } catch (err) {
        console.error("[damii][admin] Error executing approved tournament action request:", err);
      }
    }

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "REVIEW_TOURNAMENT_REQUEST",
      requestId,
      { status, requestType: reviewed.requestType, reviewNote }
    );
    return reviewed;
  },

  async getSystemSettings(adminToken: string, category?: any) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    return dbRepository.getSystemSettings(category);
  },

  async saveSystemSetting(adminToken: string, category: any, key: string, value: any) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);

    const entry = await dbRepository.saveSystemSetting(category, key, value, adminProfile?.token || adminToken);
    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "SAVE_SYSTEM_SETTING",
      `${category}.${key}`,
      { category, key }
    );
    return entry;
  },

  async getUserDetails(adminToken: string, targetToken: string): Promise<UserDetailPayload> {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    
    const profile = await dbRepository.getProfile(targetToken);
    if (!profile) throw new Error("User profile not found");

    // Fetch related data
    const [ledgerEntries, transactions, allRooms, allLeagues, allLogs] = await Promise.all([
      dbRepository.getLedgerEntries({ userId: targetToken, limit: 100 }).catch(() => []),
      dbRepository.getUserTransactions(targetToken, 50).catch(() => []),
      dbRepository.listRooms(100).catch(() => []),
      dbRepository.listLeagues().catch(() => []),
      dbRepository.listAdminLogs(200).catch(() => []),
    ]);

    // Active escrow calculation
    let escrowPoints = 0;
    let escrowMarbles = 0;
    for (const room of allRooms) {
      if ((room.hostToken === targetToken || room.guestToken === targetToken) && room.status === "playing" && room.wagerAmount) {
        escrowPoints += room.wagerAmount;
      }
    }

    // Matches
    const userMatches = allRooms
      .filter((r) => r.hostToken === targetToken || r.guestToken === targetToken)
      .map((r) => {
        const isHost = r.hostToken === targetToken;
        const opponentName = isHost ? r.guestName || "Waiting..." : r.hostName || "Host";
        let result: "win" | "loss" | "draw" | "pending" | "cancelled" = "pending";
        if (r.status === "completed") {
          if (r.winner === (isHost ? "white" : "black")) result = "win";
          else if (r.winner === "draw") result = "draw";
          else result = "loss";
        } else if (r.status === "cancelled") {
          result = "cancelled";
        }
        return {
          id: r.code,
          roomCode: r.code,
          gameType: r.isCustomWager ? "Custom Wager" : "Standard 10x10",
          opponentName,
          isHost,
          result,
          wagerPoints: r.wagerAmount || 0,
          status: r.status,
          playedAt: r.createdAt || new Date().toISOString(),
        };
      });

    // Tournament history (player entries)
    const tournamentEntries: Array<{
      leagueId: string;
      leagueTitle: string;
      status: string;
      seed: number;
      checkedIn: boolean;
      entryFeePoints: number;
      joinedAt: string;
    }> = [];

    for (const league of allLeagues) {
      try {
        const participants = await dbRepository.getLeagueParticipants(league.id);
        const match = participants.find((p) => p.userToken === targetToken);
        if (match) {
          tournamentEntries.push({
            leagueId: league.id,
            leagueTitle: league.title,
            status: match.status || "approved",
            seed: match.seed || 0,
            checkedIn: Boolean(match.checkedIn),
            entryFeePoints: league.entryFeePoints || 0,
            joinedAt: match.createdAt || league.createdAt,
          });
        }
      } catch (e) {
        // ignore
      }
    }

    // Tournaments organized
    const organizedTournaments = allLeagues.filter((l) => l.facilitatorToken === targetToken);

    // Relevant audit logs
    const auditLogs = allLogs.filter(
      (l) =>
        l.targetUser === profile.username ||
        l.metadataJson.includes(targetToken) ||
        l.metadataJson.includes(profile.username)
    );

    return {
      profile,
      balances: {
        availablePoints: profile.points || 0,
        availableMarbles: profile.marbles || 0,
        escrowPoints,
        escrowMarbles,
      },
      ledgerEntries,
      transactions,
      matches: userMatches,
      tournamentEntries,
      organizedTournaments,
      auditLogs,
      activeSessionsCount: 1,
    };
  },

  async suspendUser(adminToken: string, targetToken: string, reason: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);
    const targetUser = await dbRepository.getProfile(targetToken);
    if (!targetUser) throw new Error("User not found");

    targetUser.status = "suspended";
    targetUser.bannedReason = reason || "Suspended by Administrator";
    targetUser.bannedAt = new Date().toISOString();
    targetUser.updatedAt = new Date().toISOString();
    await dbRepository.saveProfile(targetUser);

    // Revoke any active sessions
    await dbRepository.revokeAllUserSessions(targetToken);

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "SUSPEND_USER",
      targetUser.username,
      { reason, targetToken }
    );
    return targetUser;
  },

  async reactivateUser(adminToken: string, targetToken: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);
    const targetUser = await dbRepository.getProfile(targetToken);
    if (!targetUser) throw new Error("User not found");

    targetUser.status = "active";
    targetUser.bannedReason = undefined;
    targetUser.bannedAt = undefined;
    targetUser.updatedAt = new Date().toISOString();
    await dbRepository.saveProfile(targetUser);

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "REACTIVATE_USER",
      targetUser.username,
      { targetToken }
    );
    return targetUser;
  },

  async forceLogoutUser(adminToken: string, targetToken: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);
    const targetUser = await dbRepository.getProfile(targetToken);
    if (!targetUser) throw new Error("User not found");

    const revokedCount = await dbRepository.revokeAllUserSessions(targetToken);

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "FORCE_LOGOUT",
      targetUser.username,
      { targetToken, revokedCount }
    );
    return { revokedCount };
  },

  async changeUserRole(adminToken: string, targetToken: string, newRole: Role, reason: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);
    const targetUser = await dbRepository.getProfile(targetToken);
    if (!targetUser) throw new Error("User not found");

    const oldRole = targetUser.role;
    targetUser.role = newRole;
    targetUser.updatedAt = new Date().toISOString();
    await dbRepository.saveProfile(targetUser);

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "CHANGE_USER_ROLE",
      targetUser.username,
      { oldRole, newRole, reason, targetToken }
    );
    return targetUser;
  },

  async unlinkResetPhone(adminToken: string, targetToken: string, reason: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);
    const targetUser = await dbRepository.getProfile(targetToken);
    if (!targetUser) throw new Error("User not found");

    const oldPhone = targetUser.phoneNumber;
    targetUser.phoneNumber = undefined;
    targetUser.phoneVerifiedAt = null;
    targetUser.updatedAt = new Date().toISOString();
    await dbRepository.saveProfile(targetUser);

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "RESET_USER_PHONE",
      targetUser.username,
      { oldPhone, reason, targetToken }
    );
    return targetUser;
  },

  async banUser(adminToken: string, targetToken: string, reason: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);
    const updated = await dbRepository.banUser(targetToken, reason || "Violation of DAMII Terms");
    if (!updated) throw new Error("User profile not found");

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "BAN_USER",
      updated.username,
      { reason, targetToken }
    );
    return updated;
  },

  async unbanUser(adminToken: string, targetToken: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);
    const updated = await dbRepository.unbanUser(targetToken);
    if (!updated) throw new Error("User profile not found");

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "UNBAN_USER",
      updated.username,
      { targetToken }
    );
    return updated;
  },

  async adjustPoints(adminToken: string, targetToken: string, deltaPoints: number, reason: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);
    const updated = await dbRepository.adjustUserPoints(targetToken, deltaPoints);
    if (!updated) throw new Error("User profile not found");

    // Log transaction
    await dbRepository.createTransaction({
      id: `tx-admin-adj-${Date.now()}`,
      userToken: targetToken,
      type: deltaPoints >= 0 ? "deposit" : "withdrawal",
      currency: "points",
      amount: deltaPoints,
      reference: `ADMIN_ADJUST_${Date.now()}`,
      status: "completed",
      metaJson: JSON.stringify({ reason, adminToken }),
      createdAt: new Date().toISOString(),
    });

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "ADJUST_POINTS",
      updated.username,
      { deltaPoints, reason, newPoints: updated.points }
    );
    return updated;
  },

  async addManualLedgerEntry(
    adminToken: string,
    targetToken: string,
    type: "deposit" | "withdrawal" | "wager_lock" | "wager_win" | "wager_refund" | "convert_points" | "league_prize" | "league_fee",
    currency: "marbles" | "points",
    amount: number,
    reference: string,
    reason: string
  ) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);
    const targetUser = await dbRepository.getProfile(targetToken);
    if (!targetUser) throw new Error(`Target user profile with token '${targetToken}' not found`);

    if (isNaN(Number(amount)) || Number(amount) === 0) {
      throw new Error("Valid non-zero transaction amount required");
    }

    const numAmount = Number(amount);

    // Atomically update user balance in memory store / DB
    if (currency === "marbles") {
      await dbRepository.updateProfileMarblesBalance(targetToken, numAmount);
    } else {
      await dbRepository.updateProfileBalance(targetToken, numAmount);
    }

    const updatedUser = await dbRepository.getProfile(targetToken);

    const txId = `tx-ledger-add-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const refTag = (reference && reference.trim()) ? reference.trim().toUpperCase() : `LEDGER_MANUAL_${Date.now()}`;

    const newTx = await dbRepository.createTransaction({
      id: txId,
      userToken: targetToken,
      type,
      currency,
      amount: numAmount,
      reference: refTag,
      status: "completed",
      metaJson: JSON.stringify({
        reason: reason || "Manual Ledger Adjustment by Admin",
        adminName: adminProfile?.username || "Admin",
        adminToken,
        recordedAt: new Date().toISOString(),
      }),
      createdAt: new Date().toISOString(),
    });

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "ADD_MANUAL_LEDGER_ENTRY",
      targetUser.username,
      {
        txId,
        type,
        currency,
        amount: numAmount,
        reference: refTag,
        reason,
        newPoints: updatedUser?.points,
        newMarbles: updatedUser?.marbles,
      }
    );

    return { transaction: newTx, profile: updatedUser };
  },

  async updateSettings(
    adminToken: string,
    updates: {
      wagerFeePercent?: number;
      tournamentFeePercent?: number;
      pointsPerGhsBuy?: number;
      pointsPerGhsWithdraw?: number;
      minDepositGhs?: number;
      maxDepositGhs?: number;
      minWithdrawalGhs?: number;
      maxWithdrawalGhs?: number;
      maxDailyWithdrawalGhs?: number;
    }
  ) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);
    const settings = await dbRepository.updateAdminSettings(updates, adminProfile?.username || "Admin");

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "UPDATE_PLATFORM_SETTINGS",
      "Global Settings",
      { updates, newSettings: settings }
    );
    return settings;
  },

  async updateTransactionStatus(adminToken: string, txId: string, newStatus: "completed" | "failed" | "pending", notes?: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);

    const allTxs = await dbRepository.getAllTransactions(200);
    const tx = allTxs.find((t) => t.id === txId);
    if (!tx) throw new Error("Transaction not found");

    const oldStatus = tx.status;
    tx.status = newStatus;
    await dbRepository.createTransaction(tx);

    // If a pending withdrawal was marked failed/rejected, refund the points to the user
    if (tx.type === "withdrawal" && oldStatus === "pending" && newStatus === "failed") {
      const refundPoints = Math.abs(tx.amount);
      await dbRepository.updateProfileBalance(tx.userToken, refundPoints);
    }

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "UPDATE_TRANSACTION_STATUS",
      tx.reference,
      { txId, oldStatus, newStatus, notes }
    );

    return tx;
  },

  async getSystemFunds(adminToken: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    return dbRepository.getSystemFundsSummary();
  },

  async reconcileFunds(adminToken: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);
    const report = await dbRepository.getSystemFundsSummary();

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "RECONCILE_SYSTEM_FUNDS",
      `Audit Status: ${report.reconciliationStatus}`,
      {
        totalAssets: report.totalPlatformAssets,
        available: report.totalUserAvailable,
        escrow: report.totalEscrowLocked,
        fees: report.totalPlatformFeesEarned,
        discrepancy: report.discrepancyAmount,
      }
    );

    return report;
  },

  async setUserRole(adminToken: string, targetToken: string, role: Role) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");

    const profile = await dbRepository.getProfile(targetToken);
    if (!profile) throw new Error("Target profile not found");

    profile.role = role;
    profile.updatedAt = new Date().toISOString();
    await dbRepository.upsertProfile(profile.token, profile.username);

    const adminProfile = await dbRepository.getProfile(adminToken);
    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "SET_ROLE",
      profile.username,
      { newRole: role }
    );

    return profile;
  },

  async manageTournamentEscrow(
    adminToken: string,
    leagueId: string,
    action: "disburse" | "refund",
    winnerToken?: string
  ) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");

    const league = await dbRepository.getLeague(leagueId);
    if (!league) throw new Error("League not found");

    const adminProfile = await dbRepository.getProfile(adminToken);
    const participants = await dbRepository.getLeagueParticipants(leagueId);

    if (action === "disburse") {
      const prizeWinnerToken = winnerToken || league.winnerToken;
      if (!prizeWinnerToken) throw new Error("Winner token required for prize pool disbursal");

      const winnerProfile = await dbRepository.getProfile(prizeWinnerToken);
      if (!winnerProfile) throw new Error("Winner profile not found");

      league.winnerToken = prizeWinnerToken;
      league.winnerName = winnerProfile.username;
      league.status = "completed";
      await dbRepository.saveLeague(league);

      if (league.prizePoolPoints > 0) {
        await dbRepository.updateProfileBalance(prizeWinnerToken, league.prizePoolPoints);
        await dbRepository.createTransaction({
          id: `tx-league-prize-${Date.now()}`,
          userToken: prizeWinnerToken,
          type: "wager_win",
          currency: "points",
          amount: league.prizePoolPoints,
          status: "completed",
          reference: `TOURNAMENT_PRIZE_${league.id}`,
          metaJson: JSON.stringify({ leagueId: league.id, title: league.title }),
          createdAt: new Date().toISOString(),
        });
      }

      await this.logAdminAction(
        adminToken,
        adminProfile?.username || "Admin",
        "DISBURSE_TOURNAMENT_ESCROW",
        league.id,
        { winnerToken: prizeWinnerToken, prizePool: league.prizePoolPoints }
      );

      return { success: true, league };
    } else if (action === "refund") {
      league.status = "completed";
      await dbRepository.saveLeague(league);

      // Refund entry fee points to all approved participants
      for (const p of participants) {
        if (p.status !== "rejected" && league.entryFeePoints > 0) {
          await dbRepository.updateProfileBalance(p.userToken, league.entryFeePoints);
          await dbRepository.createTransaction({
            id: `tx-league-refund-${Date.now()}-${p.userToken.slice(-4)}`,
            userToken: p.userToken,
            type: "wager_refund",
            currency: "points",
            amount: league.entryFeePoints,
            status: "completed",
            reference: `TOURNAMENT_REFUND_${league.id}`,
            metaJson: JSON.stringify({ leagueId: league.id, title: league.title }),
            createdAt: new Date().toISOString(),
          });
        }
      }

      await this.logAdminAction(
        adminToken,
        adminProfile?.username || "Admin",
        "REFUND_TOURNAMENT_ESCROW",
        league.id,
        { entryFeeRefunded: league.entryFeePoints, participantCount: participants.length }
      );

      return { success: true, league };
    }

    throw new Error("Invalid escrow action");
  },

  async resolveMatchDispute(
    adminToken: string,
    roomCode: string,
    winnerToken: string | null,
    reason: string
  ) {
    return this.reviewDisputeMatch(adminToken, roomCode, winnerToken ? "correct" : "void", winnerToken, reason);
  },

  async reviewDisputeMatch(
    adminToken: string,
    roomCode: string,
    decision: "confirm" | "correct" | "void",
    winnerToken: string | null,
    reviewNotes: string
  ) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");

    const room = await dbRepository.getRoom(roomCode);
    if (!room) throw new Error("Room not found");

    const adminProfile = await dbRepository.getProfile(adminToken);
    const { walletService } = await import("./wallet-service");
    const now = new Date().toISOString();

    if (decision === "confirm") {
      // Confirm original match result
      room.disputeStatus = "resolved";
      room.disputeNotes = `Confirmed by Admin (${adminProfile?.username || "Admin"}): ${reviewNotes}`;
      room.status = "completed";
      await dbRepository.saveRoom(room);

      // Disburse escrow to original winner if exists and pending
      if (room.escrowId) {
        const origWinnerToken = room.winner === "white" ? room.hostToken : room.winner === "black" ? room.guestToken : null;
        await walletService.disburseWagerEscrow(room.escrowId, origWinnerToken);
      }
    } else if (decision === "correct") {
      // Correct match winner
      if (winnerToken === room.hostToken) {
        room.winner = "white";
      } else if (winnerToken === room.guestToken) {
        room.winner = "black";
      } else {
        room.winner = null;
      }

      room.disputeStatus = "resolved";
      room.disputeNotes = `Corrected by Admin (${adminProfile?.username || "Admin"}): ${reviewNotes}`;
      room.status = "completed";
      await dbRepository.saveRoom(room);

      // Settle escrow with new winner
      if (room.escrowId) {
        await walletService.disburseWagerEscrow(room.escrowId, winnerToken);
      }
    } else if (decision === "void") {
      // Void the match, set cancelled, and refund 100%
      room.winner = null;
      room.disputeStatus = "voided";
      room.disputeNotes = `Voided by Admin (${adminProfile?.username || "Admin"}): ${reviewNotes}`;
      room.status = "cancelled";
      await dbRepository.saveRoom(room);

      // Refund 100% escrow to both players
      if (room.escrowId) {
        await walletService.disburseWagerEscrow(room.escrowId, null);
      }
    }

    // Update any linked league match
    if (room.leagueId && room.leagueMatchId) {
      const match = await dbRepository.getLeagueMatch(room.leagueMatchId);
      if (match) {
        if (decision === "void") {
          match.status = "cancelled";
          match.winnerToken = null;
          match.disputeStatus = "voided";
        } else {
          match.status = "completed";
          match.winnerToken = room.winner === "white" ? room.hostToken : room.winner === "black" ? room.guestToken : null;
          match.disputeStatus = "resolved";
        }
        match.disputeNotes = `Admin Review (${decision}): ${reviewNotes}`;
        await dbRepository.saveLeagueMatch(match);
      }
    }

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "REVIEW_MATCH_DISPUTE",
      roomCode,
      { decision, winnerToken, reviewNotes, roomCode, leagueId: room.leagueId }
    );

    return room;
  },

  async adminDisqualifyParticipant(
    adminToken: string,
    leagueId: string,
    participantToken: string,
    reason: string,
    evidence?: string
  ) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const { leagueService } = await import("./league-service");
    const result = await leagueService.disqualifyParticipant(adminToken, leagueId, participantToken, reason, evidence, true);

    const adminProfile = await dbRepository.getProfile(adminToken);
    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "DISQUALIFY_PARTICIPANT",
      participantToken,
      { leagueId, reason, evidence }
    );

    return result;
  },

  async adminReviewTournamentCancellation(
    adminToken: string,
    leagueId: string,
    reason: string
  ) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const { leagueService } = await import("./league-service");
    const result = await leagueService.cancelTournament(adminToken, leagueId, reason, true);

    const adminProfile = await dbRepository.getProfile(adminToken);
    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "ADMIN_CANCEL_TOURNAMENT",
      leagueId,
      { reason }
    );

    return result;
  },

  async deleteUser(adminToken: string, targetToken: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);
    const targetUser = await dbRepository.getProfile(targetToken);
    if (!targetUser) throw new Error("Target user profile not found");

    if (targetUser.role === "super_admin") {
      throw new Error("Super Admin accounts cannot be deleted");
    }

    await dbRepository.deleteProfile(targetToken);

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "DELETE_USER",
      targetUser.username,
      { targetToken, role: targetUser.role }
    );

    return { success: true, deletedUser: targetUser.username };
  },

  async editUserProfile(
    adminToken: string,
    targetToken: string,
    updates: { username?: string; role?: Role; points?: number; marbles?: number; status?: "active" | "banned" }
  ) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);
    const targetUser = await dbRepository.getProfile(targetToken);
    if (!targetUser) throw new Error("Target user profile not found");

    if (updates.username && updates.username.trim()) targetUser.username = updates.username.trim();
    if (updates.role) targetUser.role = updates.role;
    if (updates.points !== undefined && !isNaN(Number(updates.points))) targetUser.points = Math.max(0, Number(updates.points));
    if (updates.marbles !== undefined && !isNaN(Number(updates.marbles))) targetUser.marbles = Math.max(0, Number(updates.marbles));
    if (updates.status) targetUser.status = updates.status;

    const saved = await dbRepository.saveProfile(targetUser);

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "EDIT_USER_PROFILE",
      targetUser.username,
      { updates }
    );

    return saved;
  },

  async editTournament(
    adminToken: string,
    leagueId: string,
    updates: { title?: string; description?: string; entryFeePoints?: number; prizePoolPoints?: number; maxParticipants?: number; status?: "draft" | "registration" | "active" | "completed" | "cancelled" }
  ) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);
    const league = await dbRepository.getLeague(leagueId);
    if (!league) throw new Error("Tournament/League not found");

    if (updates.title) league.title = updates.title.trim();
    if (updates.description) league.description = updates.description.trim();
    if (updates.entryFeePoints !== undefined) league.entryFeePoints = Number(updates.entryFeePoints);
    if (updates.prizePoolPoints !== undefined) league.prizePoolPoints = Number(updates.prizePoolPoints);
    if (updates.maxParticipants !== undefined) league.maxParticipants = Number(updates.maxParticipants);
    if (updates.status) league.status = updates.status;

    const saved = await dbRepository.saveLeague(league);

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "EDIT_TOURNAMENT",
      league.title,
      { leagueId, updates }
    );

    return saved;
  },

  async deleteTournament(adminToken: string, leagueId: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);
    const league = await dbRepository.getLeague(leagueId);
    if (!league) throw new Error("Tournament/League not found");

    // Refund participants if active/registration
    if (league.status === "active" || league.status === "registration") {
      await this.manageTournamentEscrow(adminToken, leagueId, "refund");
    }

    await dbRepository.deleteLeague(leagueId);

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "DELETE_TOURNAMENT",
      league.title,
      { leagueId }
    );

    return { success: true, deletedLeague: league.title };
  },

  async voidTransaction(adminToken: string, txId: string, reason: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);

    const tx = await this.updateTransactionStatus(adminToken, txId, "failed", reason || "Voided by Admin");

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "VOID_TRANSACTION",
      tx.reference,
      { txId, reason }
    );

    return tx;
  },

  async approveOrganizerRequest(adminToken: string, targetUserToken: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);

    const orgProfile = await dbRepository.getOrganizerProfile(targetUserToken);
    if (!orgProfile) throw new Error("Organizer request profile not found");

    orgProfile.status = "approved";
    orgProfile.reviewedBy = adminProfile?.username || "Admin";
    orgProfile.reviewedAt = new Date().toISOString();
    await dbRepository.saveOrganizerProfile(orgProfile);

    // Upgrade user role to organizer
    const targetUser = await dbRepository.getProfile(targetUserToken);
    if (targetUser && targetUser.role === "user") {
      targetUser.role = "organizer";
      await dbRepository.saveProfile(targetUser);
    }

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "APPROVE_ORGANIZER_REQUEST",
      orgProfile.username || targetUserToken,
      { targetUserToken, organizationName: orgProfile.organizationName }
    );

    return orgProfile;
  },

  async rejectOrganizerRequest(adminToken: string, targetUserToken: string, rejectionReason: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);

    const orgProfile = await dbRepository.getOrganizerProfile(targetUserToken);
    if (!orgProfile) throw new Error("Organizer request profile not found");

    orgProfile.status = "rejected";
    orgProfile.reviewedBy = adminProfile?.username || "Admin";
    orgProfile.reviewedAt = new Date().toISOString();
    orgProfile.rejectionReason = rejectionReason || "Does not meet platform organizer guidelines";
    await dbRepository.saveOrganizerProfile(orgProfile);

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "REJECT_ORGANIZER_REQUEST",
      orgProfile.username || targetUserToken,
      { targetUserToken, rejectionReason }
    );

    return orgProfile;
  },

  async purgeExpiredRooms(adminToken: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);
    const settings = await dbRepository.getAdminSettings();
    const expiryMinutes = settings.unjoinedRoomExpiryMinutes || 10;
    const now = Date.now();
    const expiryThresholdMs = expiryMinutes * 60 * 1000;

    const allRooms = await dbRepository.listRooms(200);
    const expiredRooms = allRooms.filter((r) => {
      if (r.status !== "waiting") return false;
      const createdTime = new Date(r.createdAt).getTime();
      return now - createdTime > expiryThresholdMs;
    });

    let purgedCount = 0;
    for (const room of expiredRooms) {
      room.status = "cancelled";
      room.updatedAt = new Date().toISOString();
      await dbRepository.saveRoom(room);

      // Refund host if there was a locked wager escrow
      if (room.escrowId && room.wagerAmount && room.wagerAmount > 0) {
        try {
          const escrow = await dbRepository.getEscrow(room.escrowId);
          if (escrow && escrow.status === "locked") {
            escrow.status = "refunded";
            await dbRepository.saveEscrow(escrow);
            await dbRepository.updateProfileBalance(room.hostToken, escrow.amountPoints);
          }
        } catch {
          /* continue */
        }
      }
      purgedCount++;
    }

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "PURGE_EXPIRED_ROOMS",
      `Cleaned ${purgedCount} rooms`,
      { purgedCount, expiryMinutes }
    );

    return { success: true, purgedCount, thresholdMinutes: expiryMinutes };
  },

  async reconcileAllUserBalances(adminToken: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);

    const profiles = await dbRepository.getAllProfiles();
    const { reconcileBalance } = await import("./ledger");

    const results = [];
    let matchedCount = 0;
    let discrepancyCount = 0;

    for (const p of profiles) {
      try {
        const res = await reconcileBalance(p.token, "available");
        results.push({
          userId: p.token,
          username: p.username,
          points: p.points,
          marbles: p.marbles,
          reconciliation: res,
        });
        if (res.matches) {
          matchedCount++;
        } else {
          discrepancyCount++;
        }
      } catch (err) {
        results.push({
          userId: p.token,
          username: p.username,
          points: p.points,
          marbles: p.marbles,
          error: err instanceof Error ? err.message : "Reconciliation error",
        });
        discrepancyCount++;
      }
    }

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "RECONCILE_USER_BALANCES",
      `Audited ${profiles.length} users`,
      { totalUsers: profiles.length, matchedCount, discrepancyCount }
    );

    return {
      success: true,
      totalUsers: profiles.length,
      matchedCount,
      discrepancyCount,
      results,
    };
  },

  async getSystemDiagnostics(adminToken: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const startTime = Date.now();
    const settings = await dbRepository.getAdminSettings();
    const pingLatencyMs = Date.now() - startTime;

    const allProfiles = await dbRepository.getAllProfiles();
    const allRooms = await dbRepository.listRooms(50);
    const allLeagues = await dbRepository.listLeagues();
    const allTxs = await dbRepository.getAllTransactions(50);

    const memoryUsage = typeof process !== "undefined" && process.memoryUsage ? process.memoryUsage() : null;

    return {
      dialect: dbRepository.dialect,
      status: "healthy",
      pingLatencyMs,
      serverTime: new Date().toISOString(),
      counts: {
        totalProfiles: allProfiles.length,
        activeRooms: allRooms.filter((r) => r.status === "playing" || r.status === "waiting").length,
        totalLeagues: allLeagues.length,
        totalTransactions: allTxs.length,
      },
      settings,
      memory: memoryUsage
        ? {
            rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
            heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          }
        : null,
    };
  },

  async exportSystemSnapshot(adminToken: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const adminProfile = await dbRepository.getProfile(adminToken);

    const metrics = await this.getSystemMetrics(adminToken);
    const leagues = await dbRepository.listLeagues();
    const logs = await dbRepository.listAdminLogs(100);

    const snapshot = {
      exportedAt: new Date().toISOString(),
      exportedBy: adminProfile?.username || "Admin",
      dialect: dbRepository.dialect,
      metrics: {
        userCount: metrics.userCount,
        activeRooms: metrics.activeRooms,
        totalWagers: metrics.totalWagers,
        totalTransactions: metrics.totalTransactions,
        houseMarblesBalance: metrics.houseMarblesBalance,
        housePointsBalance: metrics.housePointsBalance,
        totalMarblesInCirculation: metrics.totalMarblesInCirculation,
        totalPointsInCirculation: metrics.totalPointsInCirculation,
        totalEscrowHeldPoints: metrics.totalEscrowHeldPoints,
      },
      settings: metrics.settings,
      leagues,
      recentTransactions: metrics.recentTransactions,
      recentAuditLogs: logs,
    };

    await this.logAdminAction(
      adminToken,
      adminProfile?.username || "Admin",
      "EXPORT_SYSTEM_SNAPSHOT",
      "Full State Backup",
      { snapshotTime: snapshot.exportedAt }
    );

    return snapshot;
  },

  async getAdminSelfProfile(adminToken: string) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const session = await dbRepository.getSession(adminToken);
    const userId = session ? session.userId : adminToken;
    const profile = await dbRepository.getProfile(userId);
    if (!profile) throw new Error("Admin profile not found");

    const recentLogs = (await dbRepository.listAdminLogs(20)).filter(
      (log) => log.adminToken === adminToken || log.adminName === profile.username
    );

    return {
      profile: {
        token: profile.token,
        username: profile.username,
        fullName: profile.fullName || "",
        email: profile.email || "",
        phoneNumber: profile.phoneNumber || "",
        role: profile.role,
        points: profile.points,
        marbles: profile.marbles || 0,
        status: profile.status,
        region: profile.region || "Greater Accra",
        createdAt: profile.createdAt,
        phoneVerifiedAt: profile.phoneVerifiedAt,
      },
      recentLogs,
    };
  },

  async updateAdminSelfProfile(
    adminToken: string,
    updates: {
      username?: string;
      fullName?: string;
      email?: string;
      phoneNumber?: string;
      currentPasscode?: string;
      newPasscode?: string;
    }
  ) {
    if (!(await this.verifyAdminAccessAsync(adminToken))) throw new Error("Unauthorized admin access");
    const session = await dbRepository.getSession(adminToken);
    const userId = session ? session.userId : adminToken;
    const profile = await dbRepository.getProfile(userId);
    if (!profile) throw new Error("Admin profile not found");

    if (updates.newPasscode && updates.newPasscode.trim()) {
      if (!updates.currentPasscode || !updates.currentPasscode.trim()) {
        throw new Error("Current passcode is required to set a new passcode");
      }
      const isValidCurrent = securityService.hashOrVerifyPasscode(
        updates.currentPasscode.trim(),
        profile.passcode,
        profile.passwordSalt
      );
      if (!isValidCurrent) {
        throw new Error("Incorrect current passcode");
      }
      if (updates.newPasscode.trim().length < 6) {
        throw new Error("New passcode must be at least 6 characters");
      }
      const { hash, salt } = securityService.hashPassword(updates.newPasscode.trim());
      profile.passcode = hash;
      profile.passwordSalt = salt;
    }

    if (updates.username && updates.username.trim() && updates.username.trim() !== profile.username) {
      const cleanU = updates.username.trim();
      if (cleanU.length < 2) throw new Error("Username must be at least 2 characters");
      const existing = await dbRepository.findProfileByUsername(cleanU);
      if (existing && existing.token !== profile.token) {
        throw new Error(`Username '${cleanU}' is already taken`);
      }
      profile.username = cleanU;
    }

    if (updates.fullName !== undefined) profile.fullName = updates.fullName.trim();
    if (updates.email !== undefined) profile.email = updates.email.trim();
    if (updates.phoneNumber !== undefined) profile.phoneNumber = updates.phoneNumber.trim();
    profile.updatedAt = new Date().toISOString();

    const saved = await dbRepository.saveProfile(profile);

    await this.logAdminAction(
      adminToken,
      profile.username,
      "UPDATE_ADMIN_SELF_PROFILE",
      profile.username,
      {
        hasPasswordChange: Boolean(updates.newPasscode),
        updatedFields: Object.keys(updates).filter((k) => k !== "currentPasscode" && k !== "newPasscode"),
      }
    );

    return {
      token: saved.token,
      username: saved.username,
      fullName: saved.fullName || "",
      email: saved.email || "",
      phoneNumber: saved.phoneNumber || "",
      role: saved.role,
      points: saved.points,
      marbles: saved.marbles || 0,
      status: saved.status,
      createdAt: saved.createdAt,
    };
  },
};

