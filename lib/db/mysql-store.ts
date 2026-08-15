import { and, asc, desc, eq, lt, ne, sql } from "drizzle-orm";
import type {
  AdminLog,
  AdminProfile,
  AdminSettings,
  League,
  LeagueMatch,
  LeagueParticipant,
  OrganizerProfile,
  OrganizerStatus,
  Profile,
  Role,
  Room,
  Session,
  WagerEscrow,
  WalletTransaction,
} from "../types";
import { securityService } from "../security";
import { calculateDynamicRatingUpdate, getProfileRank } from "../rank-service";
import { getEnv } from "../env";
import { buildSeedDataset, DEFAULT_ADMIN_SETTINGS } from "./seed-data";
import { lockKey, type DbRepository } from "./repository";
import { assertConnection, closePool, getDb, withTransaction } from "./mysql-connection";
import * as schema from "../../db/schema.mysql";
import {
  adminLogToRow,
  adminProfileToRow,
  escrowToRow,
  leagueMatchToRow,
  leagueToRow,
  organizerProfileToRow,
  participantToRow,
  profileToRow,
  roomToRow,
  rowToAdminLog,
  rowToAdminProfile,
  rowToAdminSettings,
  rowToEscrow,
  rowToLeague,
  rowToLeagueMatch,
  rowToOrganizerProfile,
  rowToParticipant,
  rowToProfile,
  rowToRoom,
  rowToSession,
  rowToTransaction,
  sessionToRow,
  transactionToRow,
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
  if (Number(existing?.count ?? 0) > 0) return;

  const seed = buildSeedDataset();
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
    const existing = await mysqlStore.getProfile(token);
    const now = new Date().toISOString();

    if (!existing) {
      const p: Profile = {
        token,
        username: username.trim(),
        rating: 1000,
        marbles: 0,
        points: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        role: explicitRole && VALID_ROLES.includes(explicitRole) ? explicitRole : "user",
        status: "active",
        createdAt: now,
        updatedAt: now,
      };
      await getDb().insert(schema.profiles).values(profileToRow(p));
      return { ...p };
    }

    existing.username = username.trim();
    if (explicitRole && VALID_ROLES.includes(explicitRole)) existing.role = explicitRole;
    existing.updatedAt = now;
    await getDb()
      .update(schema.profiles)
      .set(profileUpdateSet(existing))
      .where(eq(schema.profiles.token, token));
    return existing;
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
          marbles: sql`${schema.profiles.points} + ${pointsReward}`,
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
