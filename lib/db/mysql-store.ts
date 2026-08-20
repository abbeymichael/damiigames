import { and, asc, desc, eq, gte, lt, ne, or, sql } from "drizzle-orm";
import type {
  AdminAccount,
  AdminLog,
  AdminProfile,
  AdminSettings,
  AppRole,
  GameCatalogItem,
  GameTypeLimit,
  League,
  LeagueMatch,
  LeagueParticipant,
  LedgerAccountType,
  LedgerEntry,
  LedgerEntryInput,
  Match,
  OrganizerApplication,
  OrganizerApplicationStatus,
  OrganizerProfile,
  OrganizerRevocation,
  OrganizerStatus,
  OtpRequest,
  Permission,
  Profile,
  Region,
  Role,
  Room,
  Session,
  SystemFundSummary,
  SystemFundType,
  SystemFundsReport,
  SystemSettingEntry,
  SystemSettingsCategory,
  Tournament,
  TournamentActionRequest,
  TournamentEntry,
  TournamentPrize,
  User,
  WagerEscrow,
  WalletTransaction,
} from "../types";
import { SYSTEM_PERMISSIONS, SEED_ROLES_CONFIG } from "../permissions-constants";
import { securityService } from "../security";
import { calculateDynamicRatingUpdate, getProfileRank } from "../rank-service";
import { getEnv } from "../env";
import { buildSeedDataset, DEFAULT_ADMIN_SETTINGS, DEFAULT_REGIONS } from "./seed-data";
import { lockKey, type DbRepository } from "./repository";
import { assertConnection, closePool, getDb, withTransaction } from "./mysql-connection";
import * as schema from "../../db/schema.mysql";
import {
  adminLogToRow,
  adminProfileToRow,
  escrowToRow,
  gameToRow,
  gameTypeLimitToRow,
  leagueMatchToRow,
  leagueToRow,
  ledgerEntryToRow,
  matchToRow,
  organizerApplicationToRow,
  organizerProfileToRow,
  organizerRevocationToRow,
  participantToRow,
  permissionToRow,
  profileToRow,
  regionToRow,
  roleToRow,
  roomToRow,
  rowToAdminLog,
  rowToAdminProfile,
  rowToAdminSettings,
  rowToEscrow,
  rowToGame,
  rowToGameTypeLimit,
  rowToLeague,
  rowToLeagueMatch,
  rowToLedgerEntry,
  rowToMatch,
  rowToOrganizerApplication,
  rowToOrganizerProfile,
  rowToOtpRequest,
  rowToParticipant,
  rowToPermission,
  rowToProfile,
  rowToRegion,
  rowToRole,
  rowToRoom,
  rowToSession,
  rowToSystemSetting,
  rowToTournament,
  rowToTournamentActionRequest,
  rowToTournamentEntry,
  rowToTournamentPrize,
  rowToTransaction,
  rowToUser,
  sessionToRow,
  systemSettingToRow,
  tournamentActionRequestToRow,
  tournamentEntryToRow,
  tournamentPrizeToRow,
  tournamentToRow,
  transactionToRow,
  userToRow,
} from "./mysql-mappers";

/**
 * Production-grade MySQL store (Drizzle ORM + mysql2 pool).
 *
 * This is the ONLY persistence backend for DAMII — it serves both local
 * development and production. There is deliberately no JSON-file fallback:
 * data durability, cross-process safety and transactional money movement all
 * come from MySQL itself.
 *
 * Concurrency notes:
 *  - Balance changes use atomic SQL (`points = GREATEST(points + ?, 0)`) inside
 *    a transaction, so concurrent requests and even multiple app instances
 *    cannot double-spend.
 *  - Idempotency keys (Paystack refs, sessions) rely on PRIMARY KEY conflicts,
 *    not read-then-write checks.
 *  - `lockKey` is still honoured for cheap in-process serialisation, but
 *    correctness never depends on it.
 */

const VALID_ROLES: Role[] = ["admin", "super_admin", "facilitator", "treasurer", "organizer", "user", "player"];

function sessionTtlMs(): number {
  try {
    return getEnv().sessionTtlDays * 24 * 60 * 60 * 1000;
  } catch {
    return 7 * 24 * 60 * 60 * 1000;
  }
}

/** Applies a full domain Profile update. Centralised so every mutation path persists the same columns. */
function profileUpdateSet(p: Profile) {
  return {
    username: p.username,
    usernameLower: p.username.trim().toLowerCase(),
    phoneNumber: p.phoneNumber ?? null,
    passcode: p.passcode ?? null,
    passwordSalt: p.passwordSalt ?? null,
    rating: p.rating,
    marbles: p.marbles,
    points: p.points,
    wins: p.wins,
    losses: p.losses,
    draws: p.draws,
    winStreak: p.winStreak ?? 0,
    bestStreak: p.bestStreak ?? 0,
    lastMatchAt: p.lastMatchAt ?? null,
    matchesLast7Days: p.matchesLast7Days ?? 0,
    opponentRatingAvg: Math.round(p.opponentRatingAvg ?? 0),
    totalOpponentsFaced: p.totalOpponentsFaced ?? 0,
    role: p.role,
    status: p.status || "active",
    bannedAt: p.bannedAt ?? null,
    bannedReason: p.bannedReason ?? null,
    updatedAt: p.updatedAt,
  };
}

async function ensureSchema(): Promise<void> {
  /**
   * The schema is applied via `npm run db:migrate` / `db:push` (drizzle-kit).
   * At runtime we only verify connectivity + that the core table exists so a
   * misconfigured deploy fails fast with a readable message.
   */
  await assertConnection();
  try {
    await getDb().select({ token: schema.profiles.token }).from(schema.profiles).limit(1);
  } catch (err) {
    throw new Error(
      "Connected to MySQL but the DAMII tables are missing. " +
        "Run `npm run db:migrate` (or `npm run db:push`) to create the schema. " +
        `Underlying error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function seedIfEmpty(): Promise<void> {
  const db = getDb();
  const [existing] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.profiles);
  
  const seed = buildSeedDataset();
  if (Number(existing?.count ?? 0) > 0) {
    // If profiles already exist, ensure organizer applications are seeded as well
    const [appCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.organizerApplications);
    if (Number(appCount?.count ?? 0) === 0) {
      for (const app of seed.organizerApplications) {
        await mysqlStore.createOrganizerApplication(app);
      }
    }
    return;
  }

  await withTransaction(async () => {
    for (const p of seed.profiles) {
      await db.insert(schema.profiles).values(profileToRow(p));
    }
    for (const a of seed.adminProfiles) {
      await db.insert(schema.adminProfiles).values(adminProfileToRow(a));
    }
    for (const o of seed.organizerProfiles) {
      await db.insert(schema.organizerProfiles).values(organizerProfileToRow(o));
    }
    for (const app of seed.organizerApplications) {
      await mysqlStore.createOrganizerApplication(app);
    }
    for (const l of seed.leagues) {
      await db.insert(schema.leagues).values(leagueToRow(l));
    }
    for (const p of seed.leagueParticipants) {
      await db.insert(schema.leagueParticipants).values(participantToRow(p));
    }
    await db
      .insert(schema.adminSettings)
      .values({ id: 1, ...seed.adminSettings, updatedBy: seed.adminSettings.updatedBy ?? null })
      .onDuplicateKeyUpdate({ set: { updatedAt: seed.adminSettings.updatedAt } });
  });
}

let initPromise: Promise<void> | null = null;

export const mysqlStore: DbRepository = {
  dialect: "mysql",
  lockKey,

  async init() {
    // Singleton so concurrent first-requests don't race the connectivity probe.
    if (!initPromise) {
      initPromise = (async () => {
        await ensureSchema();
        await seedIfEmpty();
        console.log("[damii][db] MySQL store ready");
      })();
      initPromise.catch(() => {
        // Allow a later retry if the database was briefly unavailable.
        initPromise = null;
      });
    }
    return initPromise;
  },

  async close() {
    await closePool();
  },

  // --- Sessions ---
  async createSession(userId, role, ipAddress, userAgent) {
    const now = new Date();
    const session: Session = {
      id: `s_${securityService.generateCsprngToken(8)}`,
      userId,
      token: `sess_${securityService.generateCsprngToken(32)}`,
      role,
      csrfToken: `csrf_${securityService.generateCsprngToken(32)}`,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + sessionTtlMs()).toISOString(),
      ipAddress,
      userAgent,
    };
    await getDb().insert(schema.sessions).values(sessionToRow(session));
    return { ...session };
  },

  async getSession(token) {
    if (!token) return null;
    const [row] = await getDb()
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.token, token))
      .limit(1);
    if (!row) return null;
    if (new Date(row.expiresAt).getTime() < Date.now()) {
      await getDb().delete(schema.sessions).where(eq(schema.sessions.token, token));
      return null;
    }
    if (!row.csrfToken) {
      row.csrfToken = `csrf_${securityService.generateCsprngToken(32)}`;
      await getDb()
        .update(schema.sessions)
        .set({ csrfToken: row.csrfToken })
        .where(eq(schema.sessions.token, token));
    }
    return rowToSession(row);
  },

  async rotateSession(oldToken, ipAddress, userAgent) {
    const existing = await mysqlStore.getSession(oldToken);
    if (!existing) return null;

    const now = new Date();
    const updated: Session = {
      id: existing.id || `s_${securityService.generateCsprngToken(8)}`,
      userId: existing.userId,
      token: `sess_${securityService.generateCsprngToken(32)}`,
      role: existing.role,
      csrfToken: `csrf_${securityService.generateCsprngToken(32)}`,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + sessionTtlMs()).toISOString(),
      ipAddress: ipAddress || existing.ipAddress,
      userAgent: userAgent || existing.userAgent,
    };

    await withTransaction(async () => {
      await getDb().delete(schema.sessions).where(eq(schema.sessions.token, oldToken));
      await getDb().insert(schema.sessions).values(sessionToRow(updated));
    });
    return { ...updated };
  },

  async deleteSession(token) {
    const result = await getDb().delete(schema.sessions).where(eq(schema.sessions.token, token));
    return (result[0]?.affectedRows ?? 0) > 0;
  },

  async deleteUserSessions(userId) {
    const result = await getDb().delete(schema.sessions).where(eq(schema.sessions.userId, userId));
    return result[0]?.affectedRows ?? 0;
  },

  async revokeAllUserSessions(userId, exceptSessionToken) {
    const condition = exceptSessionToken
      ? and(eq(schema.sessions.userId, userId), ne(schema.sessions.token, exceptSessionToken))
      : eq(schema.sessions.userId, userId);
    const result = await getDb().delete(schema.sessions).where(condition);
    return result[0]?.affectedRows ?? 0;
  },

  async purgeExpiredSessions() {
    const now = new Date().toISOString();
    const result = await getDb().delete(schema.sessions).where(lt(schema.sessions.expiresAt, now));
    return result[0]?.affectedRows ?? 0;
  },

  // --- Profiles ---
  async saveProfile(profile) {
    const next: Profile = { ...profile, updatedAt: new Date().toISOString() };
    const row = profileToRow(next);
    await getDb()
      .insert(schema.profiles)
      .values(row)
      .onDuplicateKeyUpdate({ set: profileUpdateSet(next) });
    return { ...next };
  },

  async deleteProfile(token) {
    return withTransaction(async () => {
      await getDb().delete(schema.sessions).where(eq(schema.sessions.userId, token));
      await getDb().delete(schema.adminProfiles).where(eq(schema.adminProfiles.userId, token));
      await getDb().delete(schema.organizerProfiles).where(eq(schema.organizerProfiles.userId, token));
      const result = await getDb().delete(schema.profiles).where(eq(schema.profiles.token, token));
      return (result[0]?.affectedRows ?? 0) > 0;
    });
  },

  async getProfile(token) {
    if (!token) return null;
    const [row] = await getDb()
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.token, token))
      .limit(1);
    return row ? rowToProfile(row) : null;
  },

  async getAllProfiles() {
    const rows = await getDb().select().from(schema.profiles);
    return rows.map(rowToProfile);
  },

  async findProfileByUsername(username) {
    const clean = username.trim().toLowerCase();
    if (!clean) return null;
    const [row] = await getDb()
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.usernameLower, clean))
      .limit(1);
    return row ? rowToProfile(row) : null;
  },

  async createRegisteredProfile(token, username, passcode, phoneNumber, explicitRole, passwordSalt) {
    const now = new Date().toISOString();
    const role: Role = explicitRole && VALID_ROLES.includes(explicitRole) ? explicitRole : "user";
    const p: Profile = {
      token,
      username: username.trim(),
      phoneNumber: phoneNumber?.trim() || undefined,
      passcode,
      passwordSalt,
      rating: 1000,
      marbles: 0,
      points: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winStreak: 0,
      bestStreak: 0,
      matchesLast7Days: 0,
      opponentRatingAvg: 0,
      totalOpponentsFaced: 0,
      role,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await getDb().insert(schema.profiles).values(profileToRow(p));
    return { ...p };
  },

  async updateUserProfile(token, updates) {
    const p = await mysqlStore.getProfile(token);
    if (!p) return null;
    if (updates.username?.trim()) p.username = updates.username.trim();
    if (updates.phoneNumber !== undefined) p.phoneNumber = updates.phoneNumber.trim();
    if (updates.passcode?.trim()) p.passcode = updates.passcode.trim();
    if (updates.passwordSalt !== undefined) p.passwordSalt = updates.passwordSalt;
    p.updatedAt = new Date().toISOString();
    await getDb()
      .update(schema.profiles)
      .set(profileUpdateSet(p))
      .where(eq(schema.profiles.token, token));
    return p;
  },

  async upsertProfile(token, username, explicitRole) {
    const cleanUsername = username.trim();
    const existing = await mysqlStore.getProfile(token);
    const now = new Date().toISOString();

    if (existing) {
      existing.username = cleanUsername;
      if (explicitRole && VALID_ROLES.includes(explicitRole)) existing.role = explicitRole;
      existing.updatedAt = now;
      await getDb()
        .update(schema.profiles)
        .set(profileUpdateSet(existing))
        .where(eq(schema.profiles.token, existing.token));
      return existing;
    }

    // Check if profile exists by username (case-insensitive) to prevent duplicate key constraint failure
    const existingByUsername = await mysqlStore.findProfileByUsername(cleanUsername);
    if (existingByUsername) {
      if (explicitRole && VALID_ROLES.includes(explicitRole)) existingByUsername.role = explicitRole;
      existingByUsername.updatedAt = now;
      await getDb()
        .update(schema.profiles)
        .set(profileUpdateSet(existingByUsername))
        .where(eq(schema.profiles.token, existingByUsername.token));
      return existingByUsername;
    }

    const p: Profile = {
      token,
      username: cleanUsername,
      rating: 1000,
      marbles: 0,
      points: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winStreak: 0,
      bestStreak: 0,
      matchesLast7Days: 0,
      opponentRatingAvg: 0,
      totalOpponentsFaced: 0,
      role: explicitRole && VALID_ROLES.includes(explicitRole) ? explicitRole : "user",
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await getDb()
      .insert(schema.profiles)
      .values(profileToRow(p))
      .onDuplicateKeyUpdate({ set: profileUpdateSet(p) });
    return { ...p };
  },

  async banUser(token, reason) {
    const now = new Date().toISOString();
    return withTransaction(async () => {
      const [row] = await getDb()
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.token, token))
        .limit(1);
      if (!row) return null;
      await getDb()
        .update(schema.profiles)
        .set({ status: "banned", bannedAt: now, bannedReason: reason.slice(0, 512), updatedAt: now })
        .where(eq(schema.profiles.token, token));
      // Banning must immediately invalidate all live sessions.
      await getDb().delete(schema.sessions).where(eq(schema.sessions.userId, token));
      const [fresh] = await getDb()
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.token, token))
        .limit(1);
      return fresh ? rowToProfile(fresh) : null;
    });
  },

  async unbanUser(token) {
    const now = new Date().toISOString();
    const result = await getDb()
      .update(schema.profiles)
      .set({ status: "active", bannedAt: null, bannedReason: null, updatedAt: now })
      .where(eq(schema.profiles.token, token));
    if ((result[0]?.affectedRows ?? 0) === 0) return null;
    return mysqlStore.getProfile(token);
  },

  async adjustUserPoints(token, delta) {
    return mysqlStore.updateProfileBalance(token, delta);
  },

  async updateProfileBalance(token, pointsDelta) {
    // Atomic in SQL: concurrent requests cannot double-spend or go negative.
    return withTransaction(async () => {
      const result = await getDb()
        .update(schema.profiles)
        .set({
          points: sql`GREATEST(${schema.profiles.points} + ${pointsDelta}, 0)`,
          marbles: sql`GREATEST(${schema.profiles.points} + ${pointsDelta}, 0)`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.profiles.token, token));
      if ((result[0]?.affectedRows ?? 0) === 0) return null;
      const [row] = await getDb()
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.token, token))
        .limit(1);
      return row ? rowToProfile(row) : null;
    });
  },

  async updateProfileMarblesBalance(token, marblesDelta) {
    return mysqlStore.updateProfileBalance(token, marblesDelta);
  },

  async updateProfileStats(token, isWin, isDraw = false, opponentToken) {
    return withTransaction(async () => {
      const [row] = await getDb()
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.token, token))
        .limit(1);
      if (!row) return null;

      let opponentRow = null;
      if (opponentToken) {
        const [opp] = await getDb()
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.token, opponentToken))
          .limit(1);
        opponentRow = opp ?? null;
      }

      const p = rowToProfile(row);
      const opponent = opponentRow ? rowToProfile(opponentRow) : null;
      const update = calculateDynamicRatingUpdate(p, opponent, isWin, isDraw);

      const pointsReward = isWin ? 100 : isDraw ? 20 : 10;
      const marblesReward = isWin ? 25 : isDraw ? 10 : 5;

      await getDb()
        .update(schema.profiles)
        .set({
          rating: update.newRating,
          wins: update.newWins,
          losses: update.newLosses,
          draws: update.newDraws,
          winStreak: update.newWinStreak ?? 0,
          bestStreak: update.newBestStreak ?? 0,
          matchesLast7Days: update.newMatchesLast7Days ?? 0,
          opponentRatingAvg: Math.round(update.newOpponentRatingAvg ?? 0),
          totalOpponentsFaced: update.newTotalOpponentsFaced ?? 0,
          lastMatchAt: update.lastMatchAt ?? null,
          points: sql`${schema.profiles.points} + ${pointsReward}`,
          marbles: sql`${schema.profiles.marbles} + ${marblesReward}`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.profiles.token, token));

      const [fresh] = await getDb()
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.token, token))
        .limit(1);
      return fresh ? rowToProfile(fresh) : null;
    });
  },

  async getLeaderboard(limit = 10) {
    // DPI ordering is computed in JS (rank-service), so fetch the competitive pool.
    const rows = await getDb().select().from(schema.profiles);
    return rows
      .map(rowToProfile)
      .sort((a, b) => getProfileRank(b).dpi - getProfileRank(a).dpi || b.wins - a.wins)
      .slice(0, limit);
  },

  // --- Admin settings ---
  async getAdminSettings() {
    const db = getDb();
    const [row] = await db.select().from(schema.adminSettings).where(eq(schema.adminSettings.id, 1)).limit(1);
    if (row) return rowToAdminSettings(row);

    // Lazily create the singleton row on first access.
    const now = new Date().toISOString();
    await db
      .insert(schema.adminSettings)
      .values({ id: 1, ...DEFAULT_ADMIN_SETTINGS, updatedAt: now, updatedBy: "System" })
      .onDuplicateKeyUpdate({ set: { id: 1 } });
    const [fresh] = await db.select().from(schema.adminSettings).where(eq(schema.adminSettings.id, 1)).limit(1);
    return fresh ? rowToAdminSettings(fresh) : { ...DEFAULT_ADMIN_SETTINGS, updatedAt: now };
  },

  async updateAdminSettings(updates, adminName) {
    return withTransaction(async () => {
      const current = await mysqlStore.getAdminSettings();
      const positive = (v?: number) => v !== undefined && v > 0;
      const nonNegative = (v?: number) => v !== undefined && v >= 0;

      const next: AdminSettings = { ...current };
      if (nonNegative(updates.wagerFeePercent)) next.wagerFeePercent = updates.wagerFeePercent!;
      if (nonNegative(updates.tournamentFeePercent)) next.tournamentFeePercent = updates.tournamentFeePercent!;
      if (positive(updates.pointsPerGhsBuy)) next.pointsPerGhsBuy = Math.round(updates.pointsPerGhsBuy!);
      if (positive(updates.pointsPerGhsWithdraw)) next.pointsPerGhsWithdraw = Math.round(updates.pointsPerGhsWithdraw!);
      if (nonNegative(updates.minDepositGhs)) next.minDepositGhs = updates.minDepositGhs!;
      if (positive(updates.maxDepositGhs)) next.maxDepositGhs = updates.maxDepositGhs!;
      if (nonNegative(updates.minWithdrawalGhs)) next.minWithdrawalGhs = updates.minWithdrawalGhs!;
      if (positive(updates.maxWithdrawalGhs)) next.maxWithdrawalGhs = updates.maxWithdrawalGhs!;
      if (positive(updates.maxDailyWithdrawalGhs)) next.maxDailyWithdrawalGhs = updates.maxDailyWithdrawalGhs!;
      if (positive(updates.turnTimerSeconds)) next.turnTimerSeconds = updates.turnTimerSeconds!;
      if (positive(updates.disconnectGraceSeconds)) next.disconnectGraceSeconds = updates.disconnectGraceSeconds!;
      if (positive(updates.unjoinedRoomExpiryMinutes)) next.unjoinedRoomExpiryMinutes = updates.unjoinedRoomExpiryMinutes!;
      if (updates.maintenanceMode !== undefined) next.maintenanceMode = Boolean(updates.maintenanceMode);
      if (updates.maintenanceNotice !== undefined) next.maintenanceNotice = String(updates.maintenanceNotice);
      if (updates.disableWagers !== undefined) next.disableWagers = Boolean(updates.disableWagers);
      if (updates.disableWithdrawals !== undefined) next.disableWithdrawals = Boolean(updates.disableWithdrawals);
      if (updates.publicSpectatingEnabled !== undefined) next.publicSpectatingEnabled = Boolean(updates.publicSpectatingEnabled);
      if (positive(updates.defaultRating)) next.defaultRating = updates.defaultRating!;
      if (positive(updates.ratingKFactor)) next.ratingKFactor = updates.ratingKFactor!;
      if (positive(updates.minWagerGhs)) next.minWagerGhs = updates.minWagerGhs!;
      if (positive(updates.maxWagerGhs)) next.maxWagerGhs = updates.maxWagerGhs!;
      next.updatedAt = new Date().toISOString();
      if (adminName) next.updatedBy = adminName;

      await getDb()
        .update(schema.adminSettings)
        .set({
          wagerFeePercent: next.wagerFeePercent,
          tournamentFeePercent: next.tournamentFeePercent,
          pointsPerGhsBuy: next.pointsPerGhsBuy ?? 1,
          pointsPerGhsWithdraw: next.pointsPerGhsWithdraw ?? 1,
          minDepositGhs: next.minDepositGhs,
          maxDepositGhs: next.maxDepositGhs,
          minWithdrawalGhs: next.minWithdrawalGhs,
          maxWithdrawalGhs: next.maxWithdrawalGhs,
          maxDailyWithdrawalGhs: next.maxDailyWithdrawalGhs ?? 5000,
          updatedAt: next.updatedAt,
          updatedBy: next.updatedBy ?? null,
        })
        .where(eq(schema.adminSettings.id, 1));

      return next;
    });
  },

  // --- Paystack idempotency ---
  async markPaystackRefProcessed(reference) {
    // Relies on the PRIMARY KEY: a duplicate insert means already processed.
    const result = await getDb()
      .insert(schema.paystackEvents)
      .values({ reference, processedAt: new Date().toISOString() })
      .onDuplicateKeyUpdate({ set: { reference } });
    // affectedRows === 1 for a fresh insert; 2 (or 0) for a duplicate update.
    return (result[0]?.affectedRows ?? 0) === 1;
  },

  async isPaystackRefProcessed(reference) {
    const [row] = await getDb()
      .select({ reference: schema.paystackEvents.reference })
      .from(schema.paystackEvents)
      .where(eq(schema.paystackEvents.reference, reference))
      .limit(1);
    return Boolean(row);
  },

  // --- Rooms ---
  async getRoom(code) {
    const [row] = await getDb().select().from(schema.rooms).where(eq(schema.rooms.code, code)).limit(1);
    return row ? rowToRoom(row) : null;
  },

  async saveRoom(room) {
    const next: Room = { ...room, updatedAt: new Date().toISOString() };
    const row = roomToRow(next);
    await getDb()
      .insert(schema.rooms)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          hostName: row.hostName,
          hostToken: row.hostToken,
          guestName: row.guestName,
          guestToken: row.guestToken,
          boardJson: row.boardJson,
          movesJson: row.movesJson,
          turn: row.turn,
          forcedFrom: row.forcedFrom,
          winner: row.winner,
          status: row.status,
          mode: row.mode,
          wagerAmount: row.wagerAmount,
          escrowId: row.escrowId,
          leagueId: row.leagueId,
          matchId: row.matchId,
          moveCount: row.moveCount,
          resultApplied: row.resultApplied,
          lastMoveTime: row.lastMoveTime,
          disconnectTime: row.disconnectTime,
          disconnectedPlayer: row.disconnectedPlayer,
          updatedAt: row.updatedAt,
        },
      });
    return { ...next };
  },

  async listRooms(limit = 20) {
    const rows = await getDb()
      .select()
      .from(schema.rooms)
      .orderBy(desc(schema.rooms.updatedAt))
      .limit(limit);
    return rows.map(rowToRoom);
  },

  async getAllRooms(limit = 20) {
    return mysqlStore.listRooms(limit);
  },

  // --- Wallet ---
  async createTransaction(tx) {
    await getDb().insert(schema.walletTransactions).values(transactionToRow(tx));
    return { ...tx };
  },

  async getUserTransactions(token, limit = 20) {
    const rows = await getDb()
      .select()
      .from(schema.walletTransactions)
      .where(eq(schema.walletTransactions.userToken, token))
      .orderBy(desc(schema.walletTransactions.createdAt))
      .limit(limit);
    return rows.map(rowToTransaction);
  },

  async getAllTransactions(limit = 50) {
    const rows = await getDb()
      .select()
      .from(schema.walletTransactions)
      .orderBy(desc(schema.walletTransactions.createdAt))
      .limit(limit);
    return rows.map(rowToTransaction);
  },

  // --- Escrows ---
  async createEscrow(escrow) {
    await getDb().insert(schema.escrows).values(escrowToRow(escrow));
    return { ...escrow };
  },

  async getEscrow(id) {
    const [row] = await getDb().select().from(schema.escrows).where(eq(schema.escrows.id, id)).limit(1);
    return row ? rowToEscrow(row) : null;
  },

  async saveEscrow(escrow) {
    const row = escrowToRow(escrow);
    await getDb()
      .insert(schema.escrows)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          status: row.status,
          winnerToken: row.winnerToken,
          disbursedAt: row.disbursedAt,
          player2Token: row.player2Token,
          amountMarbles: row.amountMarbles,
          amountPoints: row.amountPoints,
        },
      });
    return { ...escrow };
  },

  // --- Leagues ---
  async listLeagues() {
    const rows = await getDb().select().from(schema.leagues).orderBy(desc(schema.leagues.createdAt));
    return rows.map(rowToLeague);
  },

  async getAllLeagues() {
    return mysqlStore.listLeagues();
  },

  async getLeague(id) {
    const [row] = await getDb().select().from(schema.leagues).where(eq(schema.leagues.id, id)).limit(1);
    return row ? rowToLeague(row) : null;
  },

  async saveLeague(league) {
    const next: League = { ...league, updatedAt: new Date().toISOString() };
    const row = leagueToRow(next);
    await getDb()
      .insert(schema.leagues)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          title: row.title,
          description: row.description,
          entryFeeMarbles: row.entryFeeMarbles,
          entryFeePoints: row.entryFeePoints,
          prizePoolPoints: row.prizePoolPoints,
          status: row.status,
          format: row.format,
          facilitatorToken: row.facilitatorToken,
          facilitatorName: row.facilitatorName,
          maxParticipants: row.maxParticipants,
          participantCount: row.participantCount,
          winnerToken: row.winnerToken,
          winnerName: row.winnerName,
          runnerUpToken: row.runnerUpToken,
          runnerUpName: row.runnerUpName,
          thirdPlaceToken: row.thirdPlaceToken,
          thirdPlaceName: row.thirdPlaceName,
          isPrivate: row.isPrivate,
          inviteCode: row.inviteCode,
          requiresApproval: row.requiresApproval,
          scheduleDate: row.scheduleDate,
          scheduleTime: row.scheduleTime,
          gameDays: row.gameDays,
          turnTimerSeconds: row.turnTimerSeconds,
          roundsCount: row.roundsCount,
          prizeDistributionJson: row.prizeDistributionJson,
          rulesNotes: row.rulesNotes,
          updatedAt: row.updatedAt,
        },
      });
    return { ...next };
  },

  async deleteLeague(id) {
    return withTransaction(async () => {
      await getDb().delete(schema.leagueParticipants).where(eq(schema.leagueParticipants.leagueId, id));
      await getDb().delete(schema.leagueMatches).where(eq(schema.leagueMatches.leagueId, id));
      await getDb().delete(schema.leagues).where(eq(schema.leagues.id, id));
      return true;
    });
  },

  async getLeagueParticipants(leagueId) {
    const rows = await getDb()
      .select()
      .from(schema.leagueParticipants)
      .where(eq(schema.leagueParticipants.leagueId, leagueId));
    return rows.map(rowToParticipant);
  },

  async addLeagueParticipant(participant) {
    return withTransaction(async () => {
      await getDb()
        .insert(schema.leagueParticipants)
        .values(participantToRow(participant))
        .onDuplicateKeyUpdate({
          set: {
            status: participant.status || "approved",
            seed: participant.seed ?? 0,
            checkedIn: participant.checkedIn ? 1 : 0,
          },
        });

      // Keep the denormalised participant counter in sync (excludes rejected).
      const [countRow] = await getDb()
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.leagueParticipants)
        .where(
          and(
            eq(schema.leagueParticipants.leagueId, participant.leagueId),
            ne(schema.leagueParticipants.status, "rejected"),
          ),
        );
      await getDb()
        .update(schema.leagues)
        .set({ participantCount: Number(countRow?.count ?? 0) })
        .where(eq(schema.leagues.id, participant.leagueId));

      return { ...participant };
    });
  },

  async updateParticipantStatus(participantId, status) {
    return withTransaction(async () => {
      const [row] = await getDb()
        .select()
        .from(schema.leagueParticipants)
        .where(eq(schema.leagueParticipants.id, participantId))
        .limit(1);
      if (!row) return null;

      await getDb()
        .update(schema.leagueParticipants)
        .set({ status })
        .where(eq(schema.leagueParticipants.id, participantId));

      const [countRow] = await getDb()
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.leagueParticipants)
        .where(
          and(
            eq(schema.leagueParticipants.leagueId, row.leagueId),
            eq(schema.leagueParticipants.status, "approved"),
          ),
        );
      await getDb()
        .update(schema.leagues)
        .set({ participantCount: Number(countRow?.count ?? 0) })
        .where(eq(schema.leagues.id, row.leagueId));

      const [fresh] = await getDb()
        .select()
        .from(schema.leagueParticipants)
        .where(eq(schema.leagueParticipants.id, participantId))
        .limit(1);
      return fresh ? rowToParticipant(fresh) : null;
    });
  },

  async getLeagueMatches(leagueId) {
    const rows = leagueId
      ? await getDb()
          .select()
          .from(schema.leagueMatches)
          .where(eq(schema.leagueMatches.leagueId, leagueId))
          .orderBy(asc(schema.leagueMatches.round), asc(schema.leagueMatches.matchNumber))
      : await getDb()
          .select()
          .from(schema.leagueMatches)
          .orderBy(asc(schema.leagueMatches.round), asc(schema.leagueMatches.matchNumber));
    return rows.map(rowToLeagueMatch);
  },

  async saveLeagueMatch(match) {
    const row = leagueMatchToRow(match);
    await getDb()
      .insert(schema.leagueMatches)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          round: row.round,
          matchNumber: row.matchNumber,
          bracketType: row.bracketType,
          player1Token: row.player1Token,
          player1Name: row.player1Name,
          player1Score: row.player1Score,
          player2Token: row.player2Token,
          player2Name: row.player2Name,
          player2Score: row.player2Score,
          winnerToken: row.winnerToken,
          roomCode: row.roomCode,
          scheduledTime: row.scheduledTime,
          status: row.status,
          disputeNotes: row.disputeNotes,
        },
      });
    return { ...match };
  },

  async setLeagueMatches(matches) {
    if (!matches.length) return;
    await withTransaction(async () => {
      for (const m of matches) {
        await mysqlStore.saveLeagueMatch(m);
      }
    });
  },

  // --- Audit log ---
  async createAdminLog(log) {
    await getDb().insert(schema.adminLogs).values(adminLogToRow(log));
    return { ...log };
  },

  async listAdminLogs(limit = 30) {
    const rows = await getDb()
      .select()
      .from(schema.adminLogs)
      .orderBy(desc(schema.adminLogs.createdAt))
      .limit(limit);
    return rows.map(rowToAdminLog);
  },

  async getAdminLogs(limit = 30) {
    return mysqlStore.listAdminLogs(limit);
  },

  // --- Organizer profiles ---
  async getOrganizerProfile(userId) {
    const [row] = await getDb()
      .select()
      .from(schema.organizerProfiles)
      .where(eq(schema.organizerProfiles.userId, userId))
      .limit(1);
    return row ? rowToOrganizerProfile(row) : null;
  },

  async saveOrganizerProfile(profile) {
    const row = organizerProfileToRow(profile);
    await getDb()
      .insert(schema.organizerProfiles)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          username: row.username,
          status: row.status,
          requestedAt: row.requestedAt,
          reviewedBy: row.reviewedBy,
          reviewedAt: row.reviewedAt,
          rejectionReason: row.rejectionReason,
          organizationName: row.organizationName,
          bio: row.bio,
          contactPhone: row.contactPhone,
        },
      });
    return { ...profile };
  },

  async listOrganizerProfiles(status?: OrganizerStatus) {
    const rows = status
      ? await getDb()
          .select()
          .from(schema.organizerProfiles)
          .where(eq(schema.organizerProfiles.status, status))
          .orderBy(desc(schema.organizerProfiles.requestedAt))
      : await getDb()
          .select()
          .from(schema.organizerProfiles)
          .orderBy(desc(schema.organizerProfiles.requestedAt));
    return rows.map(rowToOrganizerProfile);
  },

  // --- Admin profiles ---
  async getAdminProfile(userId) {
    const [row] = await getDb()
      .select()
      .from(schema.adminProfiles)
      .where(eq(schema.adminProfiles.userId, userId))
      .limit(1);
    return row ? rowToAdminProfile(row) : null;
  },

  async saveAdminProfile(profile) {
    const row = adminProfileToRow(profile);
    await getDb()
      .insert(schema.adminProfiles)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          permissionsJson: row.permissionsJson,
          isSuperAdmin: row.isSuperAdmin,
          grantedBy: row.grantedBy,
          grantedAt: row.grantedAt,
        },
      });
    return { ...profile };
  },

  async listAdminProfiles() {
    const rows = await getDb()
      .select()
      .from(schema.adminProfiles)
      .orderBy(desc(schema.adminProfiles.grantedAt));
    return rows.map(rowToAdminProfile);
  },

  // --- Users & Profile Completion ---
  async getUserById(id) {
    const [row] = await getDb().select().from(schema.users).where(eq(schema.users.id, id));
    return row ? rowToUser(row) : null;
  },

  async getUserByPhone(phoneNumber) {
    const [row] = await getDb().select().from(schema.users).where(eq(schema.users.phoneNumber, phoneNumber));
    return row ? rowToUser(row) : null;
  },

  async getUserByUsername(username) {
    const [row] = await getDb().select().from(schema.users).where(eq(schema.users.username, username));
    return row ? rowToUser(row) : null;
  },

  async saveUser(user) {
    const row = userToRow(user);
    await getDb()
      .insert(schema.users)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          phoneNumber: row.phoneNumber,
          phoneVerifiedAt: row.phoneVerifiedAt,
          fullName: row.fullName,
          email: row.email,
          emailVerifiedAt: row.emailVerifiedAt,
          ghanaCardNumber: row.ghanaCardNumber,
          dateOfBirth: row.dateOfBirth,
          gender: row.gender,
          avatarUrl: row.avatarUrl,
          region: row.region,
          city: row.city,
          address: row.address,
          momoNumber: row.momoNumber,
          momoNetwork: row.momoNetwork,
          username: row.username,
          referralCode: row.referralCode,
          role: row.role,
          profileCompletedAt: row.profileCompletedAt,
        },
      });
    const updated = await this.getUserById(user.id);
    return updated || (rowToUser(row as schema.UserRow));
  },

  async updateUser(id, updates) {
    const existing = await this.getUserById(id);
    if (!existing) return null;
    return this.saveUser({ ...existing, ...updates });
  },

  // --- OTP Requests ---
  async createOtpRequest(req) {
    const row = {
      id: req.id,
      phoneNumber: req.phoneNumber.slice(0, 20),
      codeHash: req.codeHash.slice(0, 128),
      ipAddress: req.ipAddress.slice(0, 45),
      expiresAt: req.expiresAt,
      consumedAt: null,
      createdAt: new Date(),
    };
    await getDb().insert(schema.otpRequests).values(row);
    return rowToOtpRequest(row as schema.OtpRequestRow);
  },

  async getOtpRequest(id) {
    const [row] = await getDb().select().from(schema.otpRequests).where(eq(schema.otpRequests.id, id));
    return row ? rowToOtpRequest(row) : null;
  },

  async consumeOtpRequest(id) {
    const now = new Date();
    await getDb()
      .update(schema.otpRequests)
      .set({ consumedAt: now })
      .where(eq(schema.otpRequests.id, id));
    return this.getOtpRequest(id);
  },

  async getRecentOtpRequestsByPhone(phoneNumber, since) {
    const rows = await getDb()
      .select()
      .from(schema.otpRequests)
      .where(
        and(
          eq(schema.otpRequests.phoneNumber, phoneNumber),
          gte(schema.otpRequests.createdAt, since),
        ),
      )
      .orderBy(desc(schema.otpRequests.createdAt));
    return rows.map(rowToOtpRequest);
  },

  async getRecentOtpRequestsByIp(ipAddress, since) {
    const rows = await getDb()
      .select()
      .from(schema.otpRequests)
      .where(
        and(
          eq(schema.otpRequests.ipAddress, ipAddress),
          gte(schema.otpRequests.createdAt, since),
        ),
      )
      .orderBy(desc(schema.otpRequests.createdAt));
    return rows.map(rowToOtpRequest);
  },

  // --- Organizer Applications ---
  async createOrganizerApplication(app) {
    const row = organizerApplicationToRow(app);
    await getDb()
      .insert(schema.organizerApplications)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          organizationName: row.organizationName,
          organizationRegNumber: row.organizationRegNumber,
          applicantType: row.applicantType,
          status: row.status,
          previousApplicationId: row.previousApplicationId,
          submittedAt: row.submittedAt,
          needsInfoRequestedAt: row.needsInfoRequestedAt,
          needsInfoNote: row.needsInfoNote,
          ghanaCardFrontUrl: row.ghanaCardFrontUrl,
          ghanaCardBackUrl: row.ghanaCardBackUrl,
          selfieUrl: row.selfieUrl,
          physicalAddress: row.physicalAddress,
          proofOfAddressUrl: row.proofOfAddressUrl,
          intendedGameTypes: row.intendedGameTypes,
          expectedTournamentSize: row.expectedTournamentSize,
          expectedFrequency: row.expectedFrequency,
          priorExperience: row.priorExperience,
          termsAcceptedAt: row.termsAcceptedAt,
          reviewNote: row.reviewNote,
          reviewedAt: row.reviewedAt,
          reviewedByAdminId: row.reviewedByAdminId,
        },
      });
    return rowToOrganizerApplication(row as schema.OrganizerApplicationRow);
  },

  async getOrganizerApplication(id) {
    const [row] = await getDb().select().from(schema.organizerApplications).where(eq(schema.organizerApplications.id, id));
    return row ? rowToOrganizerApplication(row) : null;
  },

  async getOrganizerApplicationByUserId(userId) {
    const [row] = await getDb()
      .select()
      .from(schema.organizerApplications)
      .where(eq(schema.organizerApplications.userId, userId))
      .orderBy(desc(schema.organizerApplications.createdAt))
      .limit(1);
    return row ? rowToOrganizerApplication(row) : null;
  },

  async listOrganizerApplicationsByUserId(userId: string): Promise<OrganizerApplication[]> {
    const rows = await getDb()
      .select()
      .from(schema.organizerApplications)
      .where(eq(schema.organizerApplications.userId, userId))
      .orderBy(desc(schema.organizerApplications.createdAt));
    return rows.map(rowToOrganizerApplication);
  },

  async listOrganizerApplications(status) {
    let query = getDb().select().from(schema.organizerApplications);
    const rows = status
      ? await query.where(eq(schema.organizerApplications.status, status)).orderBy(desc(schema.organizerApplications.createdAt))
      : await query.orderBy(desc(schema.organizerApplications.createdAt));
    return rows.map(rowToOrganizerApplication);
  },

  async updateOrganizerApplication(id, updates) {
    const existing = await this.getOrganizerApplication(id);
    if (!existing) return null;
    const merged: OrganizerApplication = { ...existing, ...updates };
    const row = organizerApplicationToRow(merged);
    await getDb()
      .update(schema.organizerApplications)
      .set({
        applicantType: row.applicantType,
        organizationName: row.organizationName,
        organizationRegNumber: row.organizationRegNumber,
        ghanaCardFrontUrl: row.ghanaCardFrontUrl,
        ghanaCardBackUrl: row.ghanaCardBackUrl,
        selfieUrl: row.selfieUrl,
        physicalAddress: row.physicalAddress,
        proofOfAddressUrl: row.proofOfAddressUrl,
        intendedGameTypes: row.intendedGameTypes,
        expectedTournamentSize: row.expectedTournamentSize,
        expectedFrequency: row.expectedFrequency,
        priorExperience: row.priorExperience,
        termsAcceptedAt: row.termsAcceptedAt,
        status: row.status,
        previousApplicationId: row.previousApplicationId,
        submittedAt: row.submittedAt,
        needsInfoRequestedAt: row.needsInfoRequestedAt,
        needsInfoNote: row.needsInfoNote,
        reviewedByAdminId: row.reviewedByAdminId,
        reviewedAt: row.reviewedAt,
        reviewNote: row.reviewNote,
      })
      .where(eq(schema.organizerApplications.id, id));
    return this.getOrganizerApplication(id);
  },

  // --- Organizer Revocations ---
  async createOrganizerRevocation(revocation: OrganizerRevocation): Promise<OrganizerRevocation> {
    const row = organizerRevocationToRow(revocation);
    await getDb().insert(schema.organizerRevocations).values(row);
    return rowToOrganizerRevocation(row as schema.OrganizerRevocationRow);
  },

  async getOrganizerRevocationByUserId(userId: string): Promise<OrganizerRevocation | null> {
    const [row] = await getDb()
      .select()
      .from(schema.organizerRevocations)
      .where(eq(schema.organizerRevocations.userId, userId))
      .orderBy(desc(schema.organizerRevocations.createdAt))
      .limit(1);
    return row ? rowToOrganizerRevocation(row) : null;
  },

  async listOrganizerRevocations(): Promise<OrganizerRevocation[]> {
    const rows = await getDb()
      .select()
      .from(schema.organizerRevocations)
      .orderBy(desc(schema.organizerRevocations.createdAt));
    return rows.map(rowToOrganizerRevocation);
  },

  // --- Regions ---
  async getRegions(): Promise<Region[]> {
    try {
      const rows = await getDb()
        .select()
        .from(schema.regions)
        .where(eq(schema.regions.active, 1))
        .orderBy(asc(schema.regions.sortOrder), asc(schema.regions.name));

      if (rows && rows.length > 0) {
        return rows.map(rowToRegion);
      }

      // Auto-populate default regions into DB if empty
      for (const r of DEFAULT_REGIONS) {
        await mysqlStore.saveRegion(r).catch(() => null);
      }
      return [...DEFAULT_REGIONS];
    } catch {
      return [...DEFAULT_REGIONS];
    }
  },

  async saveRegion(region: Region): Promise<Region> {
    const row = regionToRow(region);
    await getDb()
      .insert(schema.regions)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          name: row.name,
          code: row.code,
          sortOrder: row.sortOrder,
          active: row.active,
        },
      });
    return region;
  },

  // --- Matches (Section 6) ---
  async createMatch(match: Match): Promise<Match> {
    const row = matchToRow(match);
    await getDb().insert(schema.matches).values(row);
    return match;
  },

  async getMatch(id: string): Promise<Match | null> {
    const [row] = await getDb()
      .select()
      .from(schema.matches)
      .where(eq(schema.matches.id, id));
    return row ? rowToMatch(row) : null;
  },

  async updateMatch(id: string, updates: Partial<Match>): Promise<Match | null> {
    const existing = await mysqlStore.getMatch(id);
    if (!existing) return null;

    const merged: Match = {
      ...existing,
      ...updates,
      id,
    };

    const updatePayload: Record<string, unknown> = {};
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.playerBId !== undefined) updatePayload.playerBId = updates.playerBId;
    if (updates.winnerId !== undefined) updatePayload.winnerId = updates.winnerId;
    if (updates.settledAt !== undefined) {
      updatePayload.settledAt = updates.settledAt
        ? updates.settledAt instanceof Date
          ? updates.settledAt
          : new Date(updates.settledAt)
        : null;
    }

    if (Object.keys(updatePayload).length > 0) {
      await getDb()
        .update(schema.matches)
        .set(updatePayload)
        .where(eq(schema.matches.id, id));
    }

    return merged;
  },

  async listMatches(filter: { status?: string; gameType?: string; playerId?: string; limit?: number } = {}): Promise<Match[]> {
    const conditions = [];
    if (filter.status) conditions.push(eq(schema.matches.status, filter.status as any));
    if (filter.gameType) conditions.push(eq(schema.matches.gameType, filter.gameType));
    if (filter.playerId) {
      conditions.push(
        or(
          eq(schema.matches.playerAId, filter.playerId),
          eq(schema.matches.playerBId, filter.playerId)
        )
      );
    }

    let query = getDb().select().from(schema.matches);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    const rows = await query
      .orderBy(desc(schema.matches.createdAt))
      .limit(filter.limit ?? 50);

    return rows.map(rowToMatch);
  },

  // --- Tournaments & Prizes (Section 7) ---
  async createTournament(
    tournament: Tournament,
    prizes: { placement: number; amount: number | string }[] = []
  ): Promise<Tournament> {
    await withTransaction(async () => {
      const row = tournamentToRow(tournament);
      await getDb().insert(schema.tournaments).values(row);

      for (const p of prizes) {
        const prizeRow = tournamentPrizeToRow({
          id: crypto.randomUUID(),
          tournamentId: tournament.id,
          placement: p.placement,
          amount: p.amount,
        });
        await getDb().insert(schema.tournamentPrizes).values(prizeRow);
      }
    });

    return tournament;
  },

  async getTournament(id: string): Promise<{ tournament: Tournament; prizes: TournamentPrize[]; entries: TournamentEntry[] } | null> {
    const [tRow] = await getDb()
      .select()
      .from(schema.tournaments)
      .where(eq(schema.tournaments.id, id));
    if (!tRow) return null;

    const prizeRows = await getDb()
      .select()
      .from(schema.tournamentPrizes)
      .where(eq(schema.tournamentPrizes.tournamentId, id))
      .orderBy(asc(schema.tournamentPrizes.placement));

    const entryRows = await getDb()
      .select()
      .from(schema.tournamentEntries)
      .where(eq(schema.tournamentEntries.tournamentId, id))
      .orderBy(asc(schema.tournamentEntries.joinedAt));

    return {
      tournament: rowToTournament(tRow),
      prizes: prizeRows.map(rowToTournamentPrize),
      entries: entryRows.map(rowToTournamentEntry),
    };
  },

  async listTournaments(filter: { status?: string; organizerId?: string; gameType?: string; limit?: number } = {}): Promise<Tournament[]> {
    const conditions = [];
    if (filter.status) conditions.push(eq(schema.tournaments.status, filter.status as any));
    if (filter.organizerId) conditions.push(eq(schema.tournaments.organizerId, filter.organizerId));
    if (filter.gameType) conditions.push(eq(schema.tournaments.gameType, filter.gameType));

    let query = getDb().select().from(schema.tournaments);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    const rows = await query
      .orderBy(desc(schema.tournaments.createdAt))
      .limit(filter.limit ?? 50);

    return rows.map(rowToTournament);
  },

  async updateTournament(id: string, updates: Partial<Tournament>): Promise<Tournament | null> {
    const existingResult = await mysqlStore.getTournament(id);
    if (!existingResult) return null;

    const merged: Tournament = {
      ...existingResult.tournament,
      ...updates,
      id,
    };

    const updatePayload: Record<string, unknown> = {};
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.completedAt !== undefined) {
      updatePayload.completedAt = updates.completedAt
        ? updates.completedAt instanceof Date
          ? updates.completedAt
          : new Date(updates.completedAt)
        : null;
    }

    if (Object.keys(updatePayload).length > 0) {
      await getDb()
        .update(schema.tournaments)
        .set(updatePayload)
        .where(eq(schema.tournaments.id, id));
    }

    return merged;
  },

  async createTournamentEntry(entry: TournamentEntry): Promise<TournamentEntry> {
    const row = tournamentEntryToRow(entry);
    await getDb().insert(schema.tournamentEntries).values(row);
    return entry;
  },

  async getTournamentEntries(tournamentId: string): Promise<TournamentEntry[]> {
    const rows = await getDb()
      .select()
      .from(schema.tournamentEntries)
      .where(eq(schema.tournamentEntries.tournamentId, tournamentId))
      .orderBy(asc(schema.tournamentEntries.joinedAt));
    return rows.map(rowToTournamentEntry);
  },

  async updateTournamentEntryPlacement(entryId: string, placement: number): Promise<TournamentEntry | null> {
    await getDb()
      .update(schema.tournamentEntries)
      .set({ finalPlacement: placement })
      .where(eq(schema.tournamentEntries.id, entryId));

    const [row] = await getDb()
      .select()
      .from(schema.tournamentEntries)
      .where(eq(schema.tournamentEntries.id, entryId));
    return row ? rowToTournamentEntry(row) : null;
  },

  async getTournamentPrizes(tournamentId: string): Promise<TournamentPrize[]> {
    const rows = await getDb()
      .select()
      .from(schema.tournamentPrizes)
      .where(eq(schema.tournamentPrizes.tournamentId, tournamentId))
      .orderBy(asc(schema.tournamentPrizes.placement));
    return rows.map(rowToTournamentPrize);
  },

  // --- Game Type Limits (Section 8) ---
  async getGameTypeLimit(gameType: string): Promise<GameTypeLimit | null> {
    const [row] = await getDb()
      .select()
      .from(schema.gameTypeLimits)
      .where(eq(schema.gameTypeLimits.gameType, gameType));
    return row ? rowToGameTypeLimit(row) : null;
  },

  async getGameTypeLimits(): Promise<GameTypeLimit[]> {
    const rows = await getDb()
      .select()
      .from(schema.gameTypeLimits)
      .orderBy(asc(schema.gameTypeLimits.gameType));
    return rows.map(rowToGameTypeLimit);
  },

  async saveGameTypeLimit(limit: GameTypeLimit): Promise<GameTypeLimit> {
    const row = gameTypeLimitToRow(limit);
    await getDb()
      .insert(schema.gameTypeLimits)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          minWager: row.minWager,
          maxWager: row.maxWager,
          minTournamentPrizePool: row.minTournamentPrizePool,
          maxTournamentPrizePool: row.maxTournamentPrizePool,
          platformFeePercent: row.platformFeePercent,
          updatedAt: new Date(),
        },
      });
    return limit;
  },

  // --- Double-Entry Ledger ---
  async writeLedger(entries: LedgerEntryInput[]): Promise<LedgerEntry[]> {
    if (entries.length === 0) return [];

    const results: LedgerEntry[] = [];
    await withTransaction(async () => {
      for (const e of entries) {
        const id = crypto.randomUUID();
        const le: LedgerEntry = {
          id,
          userId: e.userId,
          accountType: e.accountType,
          entryType: e.entryType,
          amount: String(e.amount),
          referenceType: e.referenceType,
          referenceId: e.referenceId,
          createdAt: new Date(),
        };
        const row = ledgerEntryToRow(le);
        await getDb().insert(schema.ledgerEntries).values(row);
        results.push(le);
      }
    });

    return results;
  },

  async getLedgerBalance(userId: string, accountType: LedgerAccountType): Promise<number> {
    const [res] = await getDb()
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(schema.ledgerEntries)
      .where(
        and(
          eq(schema.ledgerEntries.userId, userId),
          eq(schema.ledgerEntries.accountType, accountType)
        )
      );
    return Number(res?.total ?? 0);
  },

  async getLedgerEntries(filter: { userId?: string; referenceType?: string; referenceId?: string; limit?: number } = {}): Promise<LedgerEntry[]> {
    const conditions = [];
    if (filter.userId) conditions.push(eq(schema.ledgerEntries.userId, filter.userId));
    if (filter.referenceType) conditions.push(eq(schema.ledgerEntries.referenceType, filter.referenceType));
    if (filter.referenceId) conditions.push(eq(schema.ledgerEntries.referenceId, filter.referenceId));

    let query = getDb().select().from(schema.ledgerEntries);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    const rows = await query
      .orderBy(desc(schema.ledgerEntries.createdAt))
      .limit(filter.limit ?? 100);

    return rows.map(rowToLedgerEntry);
  },

  async getSystemFundsSummary(): Promise<SystemFundsReport> {
    const allEntries = await getDb()
      .select()
      .from(schema.ledgerEntries)
      .orderBy(desc(schema.ledgerEntries.createdAt));

    const allProfiles = await getDb().select().from(schema.profiles);
    const totalProfilesPoints = allProfiles.reduce((sum, p) => sum + (Number(p.points) || 0), 0);

    let accBalanceInflow = 0;
    let accBalanceOutflow = 0;
    let accBalanceCount = 0;

    let escrowInflow = 0;
    let escrowOutflow = 0;
    let escrowCount = 0;

    let platformFeeInflow = 0;
    let platformFeeOutflow = 0;
    let platformFeeCount = 0;

    let totalDeposits = 0;
    let totalWithdrawals = 0;

    const latestBalances = new Map<string, number>();

    for (const entry of allEntries) {
      const key = `${entry.userId}:${entry.accountType}`;
      if (!latestBalances.has(key)) {
        latestBalances.set(key, Number(entry.balanceAfter || 0));
      }

      const amt = Number(entry.amount || 0);
      const isFee = entry.userId === "platform-treasury" || entry.entryType === "platform_fee";
      const isEscrow = entry.accountType === "escrow";

      if (entry.entryType === "deposit" && amt > 0) totalDeposits += amt;
      else if (entry.entryType === "withdrawal" && amt < 0) totalWithdrawals += Math.abs(amt);

      if (isFee) {
        platformFeeCount++;
        if (amt >= 0) platformFeeInflow += amt;
        else platformFeeOutflow += Math.abs(amt);
      } else if (isEscrow) {
        escrowCount++;
        if (amt >= 0) escrowInflow += amt;
        else escrowOutflow += Math.abs(amt);
      } else {
        accBalanceCount++;
        if (amt >= 0) accBalanceInflow += amt;
        else accBalanceOutflow += Math.abs(amt);
      }
    }

    let accountBalancesFundTotal = 0;
    let escrowFundTotal = 0;
    let platformFeeFundTotal = 0;
    let activeUsersCount = 0;

    for (const [key, bal] of latestBalances.entries()) {
      const [userId, accType] = key.split(":");
      if (userId === "platform-treasury") {
        platformFeeFundTotal += bal;
      } else if (accType === "escrow") {
        escrowFundTotal += bal;
      } else if (accType === "available") {
        accountBalancesFundTotal += bal;
        if (bal > 0) activeUsersCount++;
      }
    }

    if (latestBalances.size === 0 && totalProfilesPoints > 0) {
      accountBalancesFundTotal = totalProfilesPoints;
      activeUsersCount = allProfiles.filter((p) => p.points > 0).length;
    }

    const totalPlatformAssets = Number((accountBalancesFundTotal + escrowFundTotal + platformFeeFundTotal).toFixed(2));
    const expectedAssets = Number((totalDeposits - totalWithdrawals).toFixed(2));
    const discrepancyAmount = Math.abs(Number((totalPlatformAssets - (totalDeposits > 0 ? expectedAssets : totalPlatformAssets)).toFixed(2)));
    const isBalanced = discrepancyAmount < 0.01;

    const now = new Date().toISOString();

    const accountBalancesSummary: SystemFundSummary = {
      fundType: "account_balances",
      name: "Account Balances Fund",
      description: "Total liquid funds available across all registered user wallets for gameplay, tournaments, and withdrawals.",
      balance: Number(accountBalancesFundTotal.toFixed(2)),
      entryCount: accBalanceCount,
      totalInflow: Number(accBalanceInflow.toFixed(2)),
      totalOutflow: Number(accBalanceOutflow.toFixed(2)),
      netFlow: Number((accBalanceInflow - accBalanceOutflow).toFixed(2)),
      activeHoldersCount: activeUsersCount,
      lastActivityAt: allEntries[0]?.createdAt ? new Date(allEntries[0].createdAt).toISOString() : now,
    };

    const escrowSummary: SystemFundSummary = {
      fundType: "escrow",
      name: "Escrow Fund",
      description: "Total funds actively locked in trust for ongoing wager matches, tournament prize pools, and participant entry fees.",
      balance: Number(escrowFundTotal.toFixed(2)),
      entryCount: escrowCount,
      totalInflow: Number(escrowInflow.toFixed(2)),
      totalOutflow: Number(escrowOutflow.toFixed(2)),
      netFlow: Number((escrowInflow - escrowOutflow).toFixed(2)),
      lastActivityAt: allEntries.find((e) => e.accountType === "escrow")?.createdAt
        ? new Date(allEntries.find((e) => e.accountType === "escrow")!.createdAt).toISOString()
        : now,
    };

    const platformFeeSummary: SystemFundSummary = {
      fundType: "platform_fee",
      name: "Platform Fee Fund",
      description: "Accumulated platform commissions (5% match fees, 10% tournament fees, and cancellation surcharges) retained as platform revenue.",
      balance: Number(platformFeeFundTotal.toFixed(2)),
      entryCount: platformFeeCount,
      totalInflow: Number(platformFeeInflow.toFixed(2)),
      totalOutflow: Number(platformFeeOutflow.toFixed(2)),
      netFlow: Number((platformFeeInflow - platformFeeOutflow).toFixed(2)),
      lastActivityAt: allEntries.find((e) => e.userId === "platform-treasury" || e.entryType === "platform_fee")?.createdAt
        ? new Date(allEntries.find((e) => e.userId === "platform-treasury" || e.entryType === "platform_fee")!.createdAt).toISOString()
        : now,
    };

    return {
      accountBalancesFund: accountBalancesSummary,
      escrowFund: escrowSummary,
      platformFeeFund: platformFeeSummary,
      totalPlatformAssets,
      totalUserAvailable: Number(accountBalancesFundTotal.toFixed(2)),
      totalEscrowLocked: Number(escrowFundTotal.toFixed(2)),
      totalPlatformFeesEarned: Number(platformFeeFundTotal.toFixed(2)),
      totalDeposits: Number(totalDeposits.toFixed(2)),
      totalWithdrawals: Number(totalWithdrawals.toFixed(2)),
      reconciliationStatus: isBalanced ? "balanced" : "discrepancy",
      discrepancyAmount,
      generatedAt: now,
    };
  },

  // --- Roles & RBAC (Section 1) ---
  async listRoles(): Promise<AppRole[]> {
    const roleRows = await getDb().select().from(schema.roles).orderBy(asc(schema.roles.name));
    const allRolePerms = await getDb()
      .select({
        roleId: schema.rolePermissions.roleId,
        permissionKey: schema.permissions.key,
      })
      .from(schema.rolePermissions)
      .innerJoin(
        schema.permissions,
        eq(schema.permissions.id, schema.rolePermissions.permissionId)
      );

    const permMap = new Map<string, string[]>();
    for (const rp of allRolePerms) {
      const list = permMap.get(rp.roleId) || [];
      list.push(rp.permissionKey);
      permMap.set(rp.roleId, list);
    }

    const adminCounts = await getDb()
      .select({
        roleId: schema.adminUserRoles.roleId,
        count: sql<number>`COUNT(*)`,
      })
      .from(schema.adminUserRoles)
      .groupBy(schema.adminUserRoles.roleId);

    const countMap = new Map<string, number>();
    for (const c of adminCounts) {
      countMap.set(c.roleId, Number(c.count));
    }

    return roleRows.map((r) => {
      const role = rowToRole(r);
      role.permissionKeys = permMap.get(r.id) || [];
      role.adminCount = countMap.get(r.id) || 0;
      return role;
    });
  },

  async getRole(id: string): Promise<AppRole | undefined> {
    const [row] = await getDb().select().from(schema.roles).where(eq(schema.roles.id, id)).limit(1);
    if (!row) return undefined;

    const perms = await getDb()
      .select({ permissionKey: schema.permissions.key })
      .from(schema.rolePermissions)
      .innerJoin(
        schema.permissions,
        eq(schema.permissions.id, schema.rolePermissions.permissionId)
      )
      .where(eq(schema.rolePermissions.roleId, id));

    const role = rowToRole(row);
    role.permissionKeys = perms.map((p) => p.permissionKey);
    return role;
  },

  async createRole(role: AppRole, permissionKeys: string[] = []): Promise<AppRole> {
    const row = roleToRow(role);
    await getDb().insert(schema.roles).values(row);

    if (permissionKeys.length > 0) {
      const perms = await getDb()
        .select({ id: schema.permissions.id, key: schema.permissions.key })
        .from(schema.permissions);

      const keyToId = new Map(perms.map((p) => [p.key, p.id]));
      const links = permissionKeys
        .map((k) => keyToId.get(k))
        .filter((id): id is string => Boolean(id))
        .map((permId) => ({ roleId: role.id, permissionId: permId }));

      if (links.length > 0) {
        await getDb().insert(schema.rolePermissions).values(links);
      }
    }

    role.permissionKeys = permissionKeys;
    return role;
  },

  async updateRole(id: string, updates: Partial<AppRole>, permissionKeys?: string[]): Promise<AppRole> {
    const existing = await mysqlStore.getRole(id);
    if (!existing) throw new Error(`Role ${id} not found`);

    if (existing.isSystemRole && updates.name && updates.name !== existing.name) {
      throw new Error("Cannot rename the system Super Admin role");
    }

    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name.slice(0, 64);
    if (updates.description !== undefined) payload.description = updates.description?.slice(0, 255);

    if (Object.keys(payload).length > 0) {
      await getDb().update(schema.roles).set(payload).where(eq(schema.roles.id, id));
    }

    if (permissionKeys !== undefined) {
      await getDb().delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, id));

      if (permissionKeys.length > 0) {
        const perms = await getDb().select().from(schema.permissions);
        const keyToId = new Map(perms.map((p) => [p.key, p.id]));
        const links = permissionKeys
          .map((k) => keyToId.get(k))
          .filter((pid): pid is string => Boolean(pid))
          .map((permId) => ({ roleId: id, permissionId: permId }));

        if (links.length > 0) {
          await getDb().insert(schema.rolePermissions).values(links);
        }
      }
    }

    const updated = await mysqlStore.getRole(id);
    return updated!;
  },

  async deleteRole(id: string): Promise<void> {
    const role = await mysqlStore.getRole(id);
    if (role?.isSystemRole) {
      throw new Error("Cannot delete a system-level role");
    }
    await getDb().delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, id));
    await getDb().delete(schema.adminUserRoles).where(eq(schema.adminUserRoles.roleId, id));
    await getDb().delete(schema.roles).where(eq(schema.roles.id, id));
  },

  async listPermissions(): Promise<Permission[]> {
    const rows = await getDb().select().from(schema.permissions).orderBy(asc(schema.permissions.key));
    return rows.map(rowToPermission);
  },

  async getAdminUserRoleAssignments(userId: string): Promise<string[]> {
    const rows = await getDb()
      .select({ roleId: schema.adminUserRoles.roleId })
      .from(schema.adminUserRoles)
      .where(eq(schema.adminUserRoles.userId, userId));
    return rows.map((r) => r.roleId);
  },

  async setAdminUserRoleAssignments(userId: string, roleIds: string[], assignedByAdminId: string): Promise<void> {
    await getDb().delete(schema.adminUserRoles).where(eq(schema.adminUserRoles.userId, userId));
    if (roleIds.length > 0) {
      const rows = roleIds.map((roleId) => ({
        userId,
        roleId,
        assignedByAdminId,
      }));
      await getDb().insert(schema.adminUserRoles).values(rows);
    }
  },

  async listAdminAccounts(): Promise<AdminAccount[]> {
    const profiles = await mysqlStore.getAllProfiles();
    const adminProfiles = profiles.filter((p) => ["admin", "super_admin", "treasurer", "facilitator"].includes(p.role));

    const rolesList = await mysqlStore.listRoles();
    const roleMap = new Map(rolesList.map((r) => [r.id, r]));

    const userRoles = await getDb().select().from(schema.adminUserRoles);
    const userRoleMap = new Map<string, string[]>();
    for (const ur of userRoles) {
      const list = userRoleMap.get(ur.userId) || [];
      list.push(ur.roleId);
      userRoleMap.set(ur.userId, list);
    }

    return adminProfiles.map((p) => {
      const assignedRoleIds = userRoleMap.get(p.token) || [];
      const assignedRoles = assignedRoleIds
        .map((rid) => roleMap.get(rid))
        .filter((r): r is AppRole => Boolean(r))
        .map((r) => ({ id: r.id, name: r.name, isSystemRole: r.isSystemRole }));

      // Detect known default seed passwords
      const isDefaultCreds =
        (p.username === "admin" || p.username === "superadmin" || p.username === "DAMII Facilitator") &&
        (p.passcode === undefined || p.passcode === "admin123" || p.passcode === "123456");

      return {
        userId: p.token,
        username: p.username,
        phoneNumber: p.phoneNumber,
        role: p.role,
        status: p.status === "banned" ? "banned" : "active",
        roles: assignedRoles,
        isSuperAdmin: p.role === "super_admin" || assignedRoles.some((r) => r.isSystemRole),
        isDefaultCredentials: isDefaultCreds,
        forcePasswordReset: isDefaultCreds,
        createdAt: typeof p.createdAt === "string" ? p.createdAt : new Date(p.createdAt).toISOString(),
      };
    });
  },

  // --- Games Catalog (Section 2.2) ---
  async listGames(): Promise<GameCatalogItem[]> {
    const rows = await getDb().select().from(schema.games).orderBy(asc(schema.games.name));
    return rows.map(rowToGame);
  },

  async getGame(slugOrId: string): Promise<GameCatalogItem | undefined> {
    const [row] = await getDb()
      .select()
      .from(schema.games)
      .where(or(eq(schema.games.id, slugOrId), eq(schema.games.slug, slugOrId)))
      .limit(1);
    return row ? rowToGame(row) : undefined;
  },

  async saveGame(game: GameCatalogItem): Promise<GameCatalogItem> {
    const row = gameToRow(game);
    await getDb()
      .insert(schema.games)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          name: row.name,
          iconUrl: row.iconUrl,
          status: row.status,
          description: row.description,
        },
      });
    return game;
  },

  async toggleGameStatus(id: string, status: "enabled" | "disabled"): Promise<GameCatalogItem> {
    await getDb().update(schema.games).set({ status }).where(eq(schema.games.id, id));
    const updated = await mysqlStore.getGame(id);
    if (!updated) throw new Error(`Game ${id} not found`);
    return updated;
  },

  // --- Tournament Action Requests Queue (Section 2.3) ---
  async listTournamentActionRequests(status?: string): Promise<TournamentActionRequest[]> {
    let query = getDb().select().from(schema.tournamentActionRequests);
    if (status && status !== "all") {
      query = query.where(eq(schema.tournamentActionRequests.status, status as any)) as any;
    }
    const rows = await query.orderBy(desc(schema.tournamentActionRequests.createdAt));
    return rows.map(rowToTournamentActionRequest);
  },

  async createTournamentActionRequest(req: TournamentActionRequest): Promise<TournamentActionRequest> {
    const row = tournamentActionRequestToRow(req);
    await getDb().insert(schema.tournamentActionRequests).values(row);
    return req;
  },

  async reviewTournamentActionRequest(
    id: string,
    status: "approved" | "rejected",
    adminId: string,
    reviewNote?: string
  ): Promise<TournamentActionRequest> {
    const now = new Date();
    await getDb()
      .update(schema.tournamentActionRequests)
      .set({
        status,
        reviewedByAdminId: adminId,
        reviewedAt: now,
        reviewNote: reviewNote || null,
      })
      .where(eq(schema.tournamentActionRequests.id, id));

    const [row] = await getDb()
      .select()
      .from(schema.tournamentActionRequests)
      .where(eq(schema.tournamentActionRequests.id, id))
      .limit(1);

    if (!row) throw new Error(`TournamentActionRequest ${id} not found`);
    return rowToTournamentActionRequest(row);
  },

  // --- System Settings (Section 2.7) ---
  async getSystemSettings(category?: SystemSettingsCategory): Promise<SystemSettingEntry[]> {
    let query = getDb().select().from(schema.systemSettings);
    if (category) {
      query = query.where(eq(schema.systemSettings.category, category)) as any;
    }
    const rows = await query.orderBy(asc(schema.systemSettings.key));
    return rows.map(rowToSystemSetting);
  },

  async saveSystemSetting(
    category: SystemSettingsCategory,
    key: string,
    value: any,
    adminId?: string
  ): Promise<SystemSettingEntry> {
    const id = `setting-${category}-${key}`;
    const row = systemSettingToRow({
      id,
      category,
      key,
      value,
      updatedByAdminId: adminId,
      updatedAt: new Date().toISOString(),
    });

    await getDb()
      .insert(schema.systemSettings)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          value: row.value,
          updatedByAdminId: row.updatedByAdminId,
          updatedAt: new Date(),
        },
      });

    return {
      id,
      category,
      key,
      value,
      updatedByAdminId: adminId,
      updatedAt: new Date().toISOString(),
    };
  },

  // --- Seeder ---
  async seedDatabase() {
    // Idempotent upsert of the canonical seed dataset.
    const seed = buildSeedDataset();
    await withTransaction(async () => {
      for (const p of seed.profiles) {
        const row = profileToRow(p);
        await getDb()
          .insert(schema.profiles)
          .values(row)
          .onDuplicateKeyUpdate({ set: profileUpdateSet(p) });
      }
      for (const a of seed.adminProfiles) await mysqlStore.saveAdminProfile(a);
      for (const o of seed.organizerProfiles) await mysqlStore.saveOrganizerProfile(o);
      for (const l of seed.leagues) await mysqlStore.saveLeague(l);
      for (const p of seed.leagueParticipants) await mysqlStore.addLeagueParticipant(p);
      for (const r of seed.regions || []) await mysqlStore.saveRegion(r);
      for (const g of seed.gameTypeLimits) await mysqlStore.saveGameTypeLimit(g);

      // Seed standard permissions
      for (const p of SYSTEM_PERMISSIONS) {
        const permRow = permissionToRow({
          id: `perm-${p.key.replace(/\./g, "-")}`,
          key: p.key,
          category: p.category as any,
          description: p.description,
        });
        await getDb()
          .insert(schema.permissions)
          .values(permRow)
          .onDuplicateKeyUpdate({ set: { description: permRow.description, category: permRow.category } });
      }

      // Seed standard roles & their permissions
      const allPermRows = await getDb().select().from(schema.permissions);
      const permKeyToId = new Map(allPermRows.map((pr) => [pr.key, pr.id]));

      for (const rc of SEED_ROLES_CONFIG) {
        const roleId = `role-${rc.name.toLowerCase().replace(/\s+/g, "-")}`;
        const roleRow = roleToRow({
          id: roleId,
          name: rc.name,
          description: rc.description,
          isSystemRole: rc.isSystemRole,
          createdAt: new Date().toISOString(),
        });

        await getDb()
          .insert(schema.roles)
          .values(roleRow)
          .onDuplicateKeyUpdate({ set: { description: roleRow.description } });

        // Connect permissions
        const links = rc.permissionKeys
          .map((k) => permKeyToId.get(k))
          .filter((pid): pid is string => Boolean(pid))
          .map((permissionId) => ({ roleId, permissionId }));

        if (links.length > 0) {
          for (const link of links) {
            await getDb()
              .insert(schema.rolePermissions)
              .values(link)
              .onDuplicateKeyUpdate({ set: { roleId: link.roleId } });
          }
        }
      }

      // Assign Super Admin role to admin and superadmin user accounts
      const superAdminRoleId = "role-super-admin";
      for (const adminToken of ["token-admin", "token-superadmin"]) {
        await getDb()
          .insert(schema.adminUserRoles)
          .values({
            userId: adminToken,
            roleId: superAdminRoleId,
            assignedByAdminId: "system-bootstrap",
          })
          .onDuplicateKeyUpdate({ set: { assignedAt: new Date() } });
      }

      // Seed default games catalog
      const defaultGames: GameCatalogItem[] = [
        {
          id: "game-damii-10x10",
          name: "Ghanaian Damii (10x10)",
          slug: "damii-10x10",
          iconUrl: "/icon.png",
          status: "enabled",
          description: "Traditional Ghanaian 10x10 Draughts with flying kings and compulsory multi-capture chains.",
          createdAt: new Date().toISOString(),
        },
        {
          id: "game-damii-blitz",
          name: "Damii Blitz (15s Turn)",
          slug: "damii-blitz",
          iconUrl: "/icon.png",
          status: "enabled",
          description: "High-speed Ghanaian Draughts with 15-second move clocks for adrenaline play.",
          createdAt: new Date().toISOString(),
        },
        {
          id: "game-damii-classic-8x8",
          name: "Classic Checkers (8x8)",
          slug: "checkers-8x8",
          iconUrl: "/icon.png",
          status: "disabled",
          description: "Standard 8x8 international checkers rules (Coming soon in season 2).",
          createdAt: new Date().toISOString(),
        },
      ];
      for (const dg of defaultGames) {
        await mysqlStore.saveGame(dg);
      }

      // Seed standard system settings defaults
      await mysqlStore.saveSystemSetting("sms", "config", {
        provider: "hubtel",
        senderId: "DAMII",
        enabled: true,
        otpTemplate: "Your DAMII verification code is {code}. Valid for 5 minutes.",
        matchInviteTemplate: "DAMII Alert: {opponent} has invited you to a {stake} GHS match. Join room: {roomCode}",
        tournamentAlertTemplate: "DAMII Tournament: Round {round} has started in {tournament}. Your match is ready.",
      }, "system");

      await mysqlStore.saveSystemSetting("email", "config", {
        provider: "smtp",
        senderEmail: "support@damii.game",
        senderName: "DAMII Arena Notifications",
        enabled: true,
        welcomeTemplate: "Welcome to DAMII Ghana! Master the 10x10 board, challenge players, and compete in tournaments.",
        payoutAlertTemplate: "Your withdrawal of GHS {amount} via Mobile Money ({phone}) has been processed successfully.",
      }, "system");

      await mysqlStore.saveSystemSetting("general", "config", {
        appName: "DAMII Ghanaian Draughts Platform",
        supportPhone: "+233 24 000 0000",
        supportEmail: "support@damii.game",
        defaultCurrency: "GHS",
        timezone: "GMT / UTC",
        maintenanceMode: false,
        maintenanceNotice: "System scheduled maintenance in progress. Match rooms will reopen shortly.",
        featureFlags: {
          wagerEscrowEnabled: true,
          cashoutsEnabled: true,
          spectatingEnabled: true,
          referralsEnabled: true,
        },
      }, "system");

      await mysqlStore.saveSystemSetting("security", "config", {
        minPasscodeLength: 6,
        adminSessionTimeoutHours: 8,
        enforce2FAForAdmins: false,
        maxLoginAttempts: 5,
        ipAllowlist: [],
        flagDefaultCredentials: true,
      }, "system");

      // Seed standard organizer applications across all statuses
      for (const sapp of seed.organizerApplications) {
        await mysqlStore.createOrganizerApplication(sapp);
      }
    });

    // Recompute participant counters after seeding (they mutate leagues).
    const [countRow] = await getDb()
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.leagueParticipants)
      .where(
        and(
          eq(schema.leagueParticipants.leagueId, "league-open-2026"),
          ne(schema.leagueParticipants.status, "rejected"),
        ),
      );
    await getDb()
      .update(schema.leagues)
      .set({ participantCount: Number(countRow?.count ?? 0) })
      .where(eq(schema.leagues.id, "league-open-2026"));

    return mysqlStore.getAllProfiles();
  },
};
