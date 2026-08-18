import type {
  AdminLog,
  AdminProfile,
  AdminSettings,
  League,
  LeagueMatch,
  LeagueParticipant,
  OrganizerApplication,
  OrganizerApplicationStatus,
  OrganizerProfile,
  OrganizerStatus,
  OtpRequest,
  Profile,
  Role,
  Room,
  Session,
  User,
  WagerEscrow,
  WalletTransaction,
} from "../types";
import { securityService } from "../security";
import { calculateDynamicRatingUpdate, getProfileRank } from "../rank-service";
import { getEnv } from "../env";
import { buildSeedDataset, DEFAULT_ADMIN_SETTINGS } from "./seed-data";
import { lockKey, type DbRepository } from "./repository";

const VALID_ROLES: Role[] = ["admin", "super_admin", "facilitator", "treasurer", "organizer", "user", "player"];

function sessionTtlMs(): number {
  try {
    return getEnv().sessionTtlDays * 24 * 60 * 60 * 1000;
  } catch {
    return 7 * 24 * 60 * 60 * 1000;
  }
}

interface MemoryData {
  sessions: Map<string, Session>;
  profiles: Map<string, Profile>;
  users: Map<string, User>;
  otpRequests: Map<string, OtpRequest>;
  organizerApplications: Map<string, OrganizerApplication>;
  adminProfiles: Map<string, AdminProfile>;
  organizerProfiles: Map<string, OrganizerProfile>;
  adminSettings: AdminSettings;
  paystackEvents: Set<string>;
  rooms: Map<string, Room>;
  walletTransactions: WalletTransaction[];
  escrows: Map<string, WagerEscrow>;
  leagues: Map<string, League>;
  leagueParticipants: Map<string, LeagueParticipant>;
  leagueMatches: Map<string, LeagueMatch>;
  adminLogs: AdminLog[];
  initialized: boolean;
}

const globalForMemory = globalThis as unknown as { __damiiMemoryData?: MemoryData };

function getMemoryData(): MemoryData {
  if (!globalForMemory.__damiiMemoryData) {
    globalForMemory.__damiiMemoryData = {
      sessions: new Map(),
      profiles: new Map(),
      users: new Map(),
      otpRequests: new Map(),
      organizerApplications: new Map(),
      adminProfiles: new Map(),
      organizerProfiles: new Map(),
      adminSettings: { ...DEFAULT_ADMIN_SETTINGS },
      paystackEvents: new Set(),
      rooms: new Map(),
      walletTransactions: [],
      escrows: new Map(),
      leagues: new Map(),
      leagueParticipants: new Map(),
      leagueMatches: new Map(),
      adminLogs: [],
      initialized: false,
    };
  }
  return globalForMemory.__damiiMemoryData;
}

export const memoryStore: DbRepository = {
  dialect: "memory",
  lockKey,

  async init() {
    const data = getMemoryData();
    if (!data.initialized || data.profiles.size === 0) {
      const seed = buildSeedDataset();
      for (const p of seed.profiles) {
        data.profiles.set(p.token, { ...p });
      }
      for (const a of seed.adminProfiles) {
        data.adminProfiles.set(a.userId, { ...a });
      }
      for (const o of seed.organizerProfiles) {
        data.organizerProfiles.set(o.userId, { ...o });
      }
      for (const l of seed.leagues) {
        data.leagues.set(l.id, { ...l });
      }
      for (const p of seed.leagueParticipants) {
        data.leagueParticipants.set(p.id, { ...p });
      }
      data.adminSettings = { ...seed.adminSettings };
      data.initialized = true;
      console.log("[damii][db] Memory store initialized with seed accounts");
    }
  },

  async close() {
    // No-op for memory store
  },

  // --- Sessions ---
  async createSession(userId, role, ipAddress, userAgent) {
    const data = getMemoryData();
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
    data.sessions.set(session.token, { ...session });
    return { ...session };
  },

  async getSession(token) {
    if (!token) return null;
    const data = getMemoryData();
    const session = data.sessions.get(token);
    if (!session) return null;

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      data.sessions.delete(token);
      return null;
    }

    if (!session.csrfToken) {
      session.csrfToken = `csrf_${securityService.generateCsprngToken(32)}`;
      data.sessions.set(token, { ...session });
    }

    return { ...session };
  },

  async rotateSession(oldToken, ipAddress, userAgent) {
    const existing = await memoryStore.getSession(oldToken);
    if (!existing) return null;

    const data = getMemoryData();
    data.sessions.delete(oldToken);

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

    data.sessions.set(updated.token, { ...updated });
    return { ...updated };
  },

  async deleteSession(token) {
    const data = getMemoryData();
    return data.sessions.delete(token);
  },

  async deleteUserSessions(userId) {
    const data = getMemoryData();
    let count = 0;
    for (const [token, session] of data.sessions.entries()) {
      if (session.userId === userId) {
        data.sessions.delete(token);
        count++;
      }
    }
    return count;
  },

  async revokeAllUserSessions(userId, exceptSessionToken) {
    const data = getMemoryData();
    let count = 0;
    for (const [token, session] of data.sessions.entries()) {
      if (session.userId === userId && token !== exceptSessionToken) {
        data.sessions.delete(token);
        count++;
      }
    }
    return count;
  },

  async purgeExpiredSessions() {
    const data = getMemoryData();
    const now = Date.now();
    let count = 0;
    for (const [token, session] of data.sessions.entries()) {
      if (new Date(session.expiresAt).getTime() < now) {
        data.sessions.delete(token);
        count++;
      }
    }
    return count;
  },

  // --- Profiles ---
  async saveProfile(profile) {
    const data = getMemoryData();
    const next: Profile = { ...profile, updatedAt: new Date().toISOString() };
    data.profiles.set(next.token, { ...next });
    return { ...next };
  },

  async deleteProfile(token) {
    const data = getMemoryData();
    for (const [sessToken, session] of data.sessions.entries()) {
      if (session.userId === token) data.sessions.delete(sessToken);
    }
    data.adminProfiles.delete(token);
    data.organizerProfiles.delete(token);
    return data.profiles.delete(token);
  },

  async getProfile(token) {
    if (!token) return null;
    const data = getMemoryData();
    const p = data.profiles.get(token);
    return p ? { ...p } : null;
  },

  async getAllProfiles() {
    const data = getMemoryData();
    return Array.from(data.profiles.values()).map((p) => ({ ...p }));
  },

  async findProfileByUsername(username) {
    const clean = username.trim().toLowerCase();
    if (!clean) return null;
    const data = getMemoryData();
    for (const p of data.profiles.values()) {
      if (p.username.trim().toLowerCase() === clean) {
        return { ...p };
      }
    }
    return null;
  },

  async createRegisteredProfile(token, username, passcode, phoneNumber, explicitRole, passwordSalt) {
    const data = getMemoryData();
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
    data.profiles.set(token, { ...p });
    return { ...p };
  },

  async updateUserProfile(token, updates) {
    const data = getMemoryData();
    const p = data.profiles.get(token);
    if (!p) return null;
    if (updates.username?.trim()) p.username = updates.username.trim();
    if (updates.phoneNumber !== undefined) p.phoneNumber = updates.phoneNumber.trim();
    if (updates.passcode?.trim()) p.passcode = updates.passcode.trim();
    if (updates.passwordSalt !== undefined) p.passwordSalt = updates.passwordSalt;
    p.updatedAt = new Date().toISOString();
    data.profiles.set(token, { ...p });
    return { ...p };
  },

  async upsertProfile(token, username, explicitRole) {
    const data = getMemoryData();
    const existing = data.profiles.get(token);
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
      data.profiles.set(token, { ...p });
      return { ...p };
    }

    existing.username = username.trim();
    if (explicitRole && VALID_ROLES.includes(explicitRole)) existing.role = explicitRole;
    existing.updatedAt = now;
    data.profiles.set(token, { ...existing });
    return { ...existing };
  },

  async banUser(token, reason) {
    const data = getMemoryData();
    const p = data.profiles.get(token);
    if (!p) return null;
    const now = new Date().toISOString();
    p.status = "banned";
    p.bannedAt = now;
    p.bannedReason = reason.slice(0, 512);
    p.updatedAt = now;
    data.profiles.set(token, { ...p });

    for (const [sessToken, session] of data.sessions.entries()) {
      if (session.userId === token) data.sessions.delete(sessToken);
    }
    return { ...p };
  },

  async unbanUser(token) {
    const data = getMemoryData();
    const p = data.profiles.get(token);
    if (!p) return null;
    const now = new Date().toISOString();
    p.status = "active";
    p.bannedAt = undefined;
    p.bannedReason = undefined;
    p.updatedAt = now;
    data.profiles.set(token, { ...p });
    return { ...p };
  },

  async adjustUserPoints(token, delta) {
    return memoryStore.updateProfileBalance(token, delta);
  },

  async updateProfileBalance(token, pointsDelta) {
    const data = getMemoryData();
    const p = data.profiles.get(token);
    if (!p) return null;
    const newPoints = Math.max(0, (p.points || 0) + pointsDelta);
    p.points = newPoints;
    p.marbles = newPoints;
    p.updatedAt = new Date().toISOString();
    data.profiles.set(token, { ...p });
    return { ...p };
  },

  async updateProfileMarblesBalance(token, marblesDelta) {
    return memoryStore.updateProfileBalance(token, marblesDelta);
  },

  async updateProfileStats(token, isWin, isDraw = false, opponentToken) {
    const data = getMemoryData();
    const p = data.profiles.get(token);
    if (!p) return null;

    const opponent = opponentToken ? data.profiles.get(opponentToken) : null;
    const update = calculateDynamicRatingUpdate(p, opponent ? { ...opponent } : null, isWin, isDraw);

    const pointsReward = isWin ? 100 : isDraw ? 20 : 10;
    p.rating = update.newRating;
    p.wins = update.newWins;
    p.losses = update.newLosses;
    p.draws = update.newDraws;
    p.winStreak = update.newWinStreak ?? 0;
    p.bestStreak = update.newBestStreak ?? 0;
    p.matchesLast7Days = update.newMatchesLast7Days ?? 0;
    p.opponentRatingAvg = Math.round(update.newOpponentRatingAvg ?? 0);
    p.totalOpponentsFaced = update.newTotalOpponentsFaced ?? 0;
    p.lastMatchAt = update.lastMatchAt ?? undefined;
    p.points = (p.points || 0) + pointsReward;
    p.marbles = (p.marbles || 0) + pointsReward;
    p.updatedAt = new Date().toISOString();

    data.profiles.set(token, { ...p });
    return { ...p };
  },

  async getLeaderboard(limit = 10) {
    const data = getMemoryData();
    const profiles = Array.from(data.profiles.values()).map((p) => ({ ...p }));
    return profiles
      .sort((a, b) => getProfileRank(b).dpi - getProfileRank(a).dpi || b.wins - a.wins)
      .slice(0, limit);
  },

  // --- Admin settings ---
  async getAdminSettings() {
    const data = getMemoryData();
    return { ...data.adminSettings };
  },

  async updateAdminSettings(updates, adminName) {
    const data = getMemoryData();
    const current = data.adminSettings;
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

    data.adminSettings = { ...next };
    return { ...next };
  },

  // --- Paystack idempotency ---
  async markPaystackRefProcessed(reference) {
    const data = getMemoryData();
    if (data.paystackEvents.has(reference)) {
      return false;
    }
    data.paystackEvents.add(reference);
    return true;
  },

  async isPaystackRefProcessed(reference) {
    const data = getMemoryData();
    return data.paystackEvents.has(reference);
  },

  // --- Rooms ---
  async getRoom(code) {
    const data = getMemoryData();
    const room = data.rooms.get(code);
    return room ? { ...room } : null;
  },

  async saveRoom(room) {
    const data = getMemoryData();
    const next: Room = { ...room, updatedAt: new Date().toISOString() };
    data.rooms.set(next.code, { ...next });
    return { ...next };
  },

  async listRooms(limit = 20) {
    const data = getMemoryData();
    return Array.from(data.rooms.values())
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .slice(0, limit)
      .map((r) => ({ ...r }));
  },

  // --- Wallet ---
  async createTransaction(tx) {
    const data = getMemoryData();
    data.walletTransactions.unshift({ ...tx });
    return { ...tx };
  },

  async getUserTransactions(token, limit = 20) {
    const data = getMemoryData();
    return data.walletTransactions
      .filter((t) => t.userToken === token)
      .slice(0, limit)
      .map((t) => ({ ...t }));
  },

  async getAllTransactions(limit = 50) {
    const data = getMemoryData();
    return data.walletTransactions.slice(0, limit).map((t) => ({ ...t }));
  },

  // --- Escrows ---
  async createEscrow(escrow) {
    const data = getMemoryData();
    data.escrows.set(escrow.id, { ...escrow });
    return { ...escrow };
  },

  async getEscrow(id) {
    const data = getMemoryData();
    const e = data.escrows.get(id);
    return e ? { ...e } : null;
  },

  async saveEscrow(escrow) {
    const data = getMemoryData();
    data.escrows.set(escrow.id, { ...escrow });
    return { ...escrow };
  },

  // --- Leagues ---
  async listLeagues() {
    const data = getMemoryData();
    return Array.from(data.leagues.values())
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .map((l) => ({ ...l }));
  },

  async getLeague(id) {
    const data = getMemoryData();
    const l = data.leagues.get(id);
    return l ? { ...l } : null;
  },

  async saveLeague(league) {
    const data = getMemoryData();
    const next: League = { ...league, updatedAt: new Date().toISOString() };
    data.leagues.set(next.id, { ...next });
    return { ...next };
  },

  async deleteLeague(id) {
    const data = getMemoryData();
    for (const [pId, p] of data.leagueParticipants.entries()) {
      if (p.leagueId === id) data.leagueParticipants.delete(pId);
    }
    for (const [mId, m] of data.leagueMatches.entries()) {
      if (m.leagueId === id) data.leagueMatches.delete(mId);
    }
    return data.leagues.delete(id);
  },

  async getLeagueParticipants(leagueId) {
    const data = getMemoryData();
    return Array.from(data.leagueParticipants.values())
      .filter((p) => p.leagueId === leagueId)
      .map((p) => ({ ...p }));
  },

  async addLeagueParticipant(participant) {
    const data = getMemoryData();
    data.leagueParticipants.set(participant.id, { ...participant });

    const approvedCount = Array.from(data.leagueParticipants.values()).filter(
      (p) => p.leagueId === participant.leagueId && p.status !== "rejected",
    ).length;

    const league = data.leagues.get(participant.leagueId);
    if (league) {
      league.participantCount = approvedCount;
      data.leagues.set(league.id, { ...league });
    }

    return { ...participant };
  },

  async updateParticipantStatus(participantId, status) {
    const data = getMemoryData();
    const p = data.leagueParticipants.get(participantId);
    if (!p) return null;

    p.status = status;
    data.leagueParticipants.set(participantId, { ...p });

    const approvedCount = Array.from(data.leagueParticipants.values()).filter(
      (item) => item.leagueId === p.leagueId && item.status === "approved",
    ).length;

    const league = data.leagues.get(p.leagueId);
    if (league) {
      league.participantCount = approvedCount;
      data.leagues.set(league.id, { ...league });
    }

    return { ...p };
  },

  async getLeagueMatches(leagueId) {
    const data = getMemoryData();
    const matches = Array.from(data.leagueMatches.values());
    const filtered = leagueId ? matches.filter((m) => m.leagueId === leagueId) : matches;
    return filtered
      .sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber)
      .map((m) => ({ ...m }));
  },

  async saveLeagueMatch(match) {
    const data = getMemoryData();
    data.leagueMatches.set(match.id, { ...match });
    return { ...match };
  },

  async setLeagueMatches(matches) {
    const data = getMemoryData();
    for (const m of matches) {
      data.leagueMatches.set(m.id, { ...m });
    }
  },

  // --- Audit log ---
  async createAdminLog(log) {
    const data = getMemoryData();
    data.adminLogs.unshift({ ...log });
    return { ...log };
  },

  async listAdminLogs(limit = 30) {
    const data = getMemoryData();
    return data.adminLogs.slice(0, limit).map((l) => ({ ...l }));
  },

  // --- Organizer profiles ---
  async getOrganizerProfile(userId) {
    const data = getMemoryData();
    const o = data.organizerProfiles.get(userId);
    return o ? { ...o } : null;
  },

  async saveOrganizerProfile(profile) {
    const data = getMemoryData();
    data.organizerProfiles.set(profile.userId, { ...profile });
    return { ...profile };
  },

  async listOrganizerProfiles(status?: OrganizerStatus) {
    const data = getMemoryData();
    const profiles = Array.from(data.organizerProfiles.values());
    const filtered = status ? profiles.filter((o) => o.status === status) : profiles;
    return filtered
      .sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime())
      .map((o) => ({ ...o }));
  },

  // --- Admin profiles ---
  async getAdminProfile(userId) {
    const data = getMemoryData();
    const a = data.adminProfiles.get(userId);
    return a ? { ...a } : null;
  },

  async saveAdminProfile(profile) {
    const data = getMemoryData();
    data.adminProfiles.set(profile.userId, { ...profile });
    return { ...profile };
  },

  async listAdminProfiles() {
    const data = getMemoryData();
    return Array.from(data.adminProfiles.values())
      .sort((a, b) => new Date(b.grantedAt || 0).getTime() - new Date(a.grantedAt || 0).getTime())
      .map((a) => ({ ...a }));
  },

  // --- Users & Profile Completion ---
  async getUserById(id) {
    const data = getMemoryData();
    const u = data.users.get(id);
    return u ? { ...u } : null;
  },

  async getUserByPhone(phoneNumber) {
    const data = getMemoryData();
    for (const u of data.users.values()) {
      if (u.phoneNumber === phoneNumber) return { ...u };
    }
    return null;
  },

  async getUserByUsername(username) {
    const data = getMemoryData();
    const clean = username.toLowerCase().trim();
    for (const u of data.users.values()) {
      if (u.username && u.username.toLowerCase().trim() === clean) return { ...u };
    }
    return null;
  },

  async saveUser(user) {
    const data = getMemoryData();
    const existing = data.users.get(user.id) || {
      id: user.id,
      phoneNumber: user.phoneNumber,
      role: "player" as const,
      createdAt: new Date().toISOString(),
    };
    const updated: User = {
      ...existing,
      ...user,
      phoneNumber: user.phoneNumber || existing.phoneNumber,
      role: user.role || existing.role || "player",
    };
    data.users.set(updated.id, updated);
    return { ...updated };
  },

  async updateUser(id, updates) {
    const data = getMemoryData();
    const existing = data.users.get(id);
    if (!existing) return null;
    const updated: User = {
      ...existing,
      ...updates,
    };
    data.users.set(id, updated);
    return { ...updated };
  },

  // --- OTP Requests ---
  async createOtpRequest(req) {
    const data = getMemoryData();
    const item: OtpRequest = {
      id: req.id,
      phoneNumber: req.phoneNumber,
      codeHash: req.codeHash,
      ipAddress: req.ipAddress,
      expiresAt: req.expiresAt,
      consumedAt: null,
      createdAt: new Date(),
    };
    data.otpRequests.set(req.id, item);
    return { ...item };
  },

  async getOtpRequest(id) {
    const data = getMemoryData();
    const item = data.otpRequests.get(id);
    return item ? { ...item } : null;
  },

  async consumeOtpRequest(id) {
    const data = getMemoryData();
    const item = data.otpRequests.get(id);
    if (!item) return null;
    if (!item.consumedAt) {
      item.consumedAt = new Date();
    }
    data.otpRequests.set(id, item);
    return { ...item };
  },

  async getRecentOtpRequestsByPhone(phoneNumber, since) {
    const data = getMemoryData();
    const sinceTime = since.getTime();
    return Array.from(data.otpRequests.values())
      .filter((r) => r.phoneNumber === phoneNumber && new Date(r.createdAt).getTime() >= sinceTime)
      .map((r) => ({ ...r }));
  },

  async getRecentOtpRequestsByIp(ipAddress, since) {
    const data = getMemoryData();
    const sinceTime = since.getTime();
    return Array.from(data.otpRequests.values())
      .filter((r) => r.ipAddress === ipAddress && new Date(r.createdAt).getTime() >= sinceTime)
      .map((r) => ({ ...r }));
  },

  // --- Organizer Applications ---
  async createOrganizerApplication(app) {
    const data = getMemoryData();
    data.organizerApplications.set(app.id, { ...app });
    return { ...app };
  },

  async getOrganizerApplication(id) {
    const data = getMemoryData();
    const a = data.organizerApplications.get(id);
    return a ? { ...a } : null;
  },

  async getOrganizerApplicationByUserId(userId) {
    const data = getMemoryData();
    for (const a of data.organizerApplications.values()) {
      if (a.userId === userId) return { ...a };
    }
    return null;
  },

  async listOrganizerApplications(status) {
    const data = getMemoryData();
    let list = Array.from(data.organizerApplications.values());
    if (status) {
      list = list.filter((a) => a.status === status);
    }
    return list
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((a) => ({ ...a }));
  },

  async updateOrganizerApplication(id, updates) {
    const data = getMemoryData();
    const existing = data.organizerApplications.get(id);
    if (!existing) return null;
    const updated: OrganizerApplication = {
      ...existing,
      ...updates,
    };
    data.organizerApplications.set(id, updated);
    return { ...updated };
  },

  // --- Seeder ---
  async seedDatabase() {
    const data = getMemoryData();
    const seed = buildSeedDataset();
    for (const p of seed.profiles) {
      data.profiles.set(p.token, { ...p });
    }
    for (const a of seed.adminProfiles) {
      data.adminProfiles.set(a.userId, { ...a });
    }
    for (const o of seed.organizerProfiles) {
      data.organizerProfiles.set(o.userId, { ...o });
    }
    for (const l of seed.leagues) {
      data.leagues.set(l.id, { ...l });
    }
    for (const p of seed.leagueParticipants) {
      data.leagueParticipants.set(p.id, { ...p });
    }
    data.adminSettings = { ...seed.adminSettings };
    data.initialized = true;

    const count = Array.from(data.leagueParticipants.values()).filter(
      (p) => p.leagueId === "league-open-2026" && p.status !== "rejected",
    ).length;
    const l = data.leagues.get("league-open-2026");
    if (l) {
      l.participantCount = count;
      data.leagues.set(l.id, { ...l });
    }

    return memoryStore.getAllProfiles();
  },
};
