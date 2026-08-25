import fs from "node:fs";
import path from "node:path";
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

/**
 * Development-only JSON file store (`.data/damii_db.json`).
 *
 * It keeps `npm run dev` and the smoke tests working with zero infrastructure.
 * It is explicitly rejected in production by lib/env.ts because it has no
 * concurrency guarantees across processes.
 */

const DB_FILE_PATH = path.join(process.cwd(), ".data", "damii_db.json");
const VALID_ROLES: Role[] = ["admin", "super_admin", "facilitator", "treasurer", "organizer", "user", "player"];

class FileStoreData {
  profiles = new Map<string, Profile>();
  sessions = new Map<string, Session>();
  adminProfiles = new Map<string, AdminProfile>();
  organizerProfiles = new Map<string, OrganizerProfile>();
  rooms = new Map<string, Room>();
  transactions = new Map<string, WalletTransaction>();
  leagues = new Map<string, League>();
  leagueParticipants = new Map<string, LeagueParticipant>();
  leagueMatches = new Map<string, LeagueMatch>();
  escrows = new Map<string, WagerEscrow>();
  adminLogs = new Map<string, AdminLog>();
  processedPaystackRefs = new Set<string>();
  adminSettings: AdminSettings = { ...DEFAULT_ADMIN_SETTINGS };

  constructor() {
    if (!this.loadFromDisk()) {
      this.applySeed();
      this.saveToDisk();
    }
  }

  saveToDisk() {
    try {
      const dataDir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

      const dump = {
        profiles: Array.from(this.profiles.entries()),
        sessions: Array.from(this.sessions.entries()),
        adminProfiles: Array.from(this.adminProfiles.entries()),
        organizerProfiles: Array.from(this.organizerProfiles.entries()),
        rooms: Array.from(this.rooms.entries()),
        transactions: Array.from(this.transactions.entries()),
        leagues: Array.from(this.leagues.entries()),
        leagueParticipants: Array.from(this.leagueParticipants.entries()),
        leagueMatches: Array.from(this.leagueMatches.entries()),
        escrows: Array.from(this.escrows.entries()),
        adminLogs: Array.from(this.adminLogs.entries()),
        processedPaystackRefs: Array.from(this.processedPaystackRefs),
        adminSettings: this.adminSettings,
      };

      const tmpPath = `${DB_FILE_PATH}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(dump, null, 2), "utf-8");
      fs.renameSync(tmpPath, DB_FILE_PATH);
    } catch (err) {
      console.warn("[damii][file-store] persistence warning:", err instanceof Error ? err.message : err);
    }
  }

  loadFromDisk(): boolean {
    try {
      if (!fs.existsSync(DB_FILE_PATH)) return false;
      const raw = fs.readFileSync(DB_FILE_PATH, "utf-8");
      if (!raw.trim()) return false;

      const dump = JSON.parse(raw);
      if (Array.isArray(dump.profiles)) this.profiles = new Map(dump.profiles);
      if (Array.isArray(dump.sessions)) this.sessions = new Map(dump.sessions);
      if (Array.isArray(dump.adminProfiles)) this.adminProfiles = new Map(dump.adminProfiles);
      if (Array.isArray(dump.organizerProfiles)) this.organizerProfiles = new Map(dump.organizerProfiles);
      if (Array.isArray(dump.rooms)) this.rooms = new Map(dump.rooms);
      if (Array.isArray(dump.transactions)) this.transactions = new Map(dump.transactions);
      if (Array.isArray(dump.leagues)) this.leagues = new Map(dump.leagues);
      if (Array.isArray(dump.leagueParticipants)) this.leagueParticipants = new Map(dump.leagueParticipants);
      if (Array.isArray(dump.leagueMatches)) this.leagueMatches = new Map(dump.leagueMatches);
      if (Array.isArray(dump.escrows)) this.escrows = new Map(dump.escrows);
      if (Array.isArray(dump.adminLogs)) this.adminLogs = new Map(dump.adminLogs);
      if (Array.isArray(dump.processedPaystackRefs)) {
        this.processedPaystackRefs = new Set(dump.processedPaystackRefs);
      }
      if (dump.adminSettings) this.adminSettings = dump.adminSettings;
      return true;
    } catch (err) {
      console.warn("[damii][file-store] failed to load, re-seeding:", err);
      return false;
    }
  }

  applySeed() {
    const seed = buildSeedDataset();
    for (const p of seed.profiles) this.profiles.set(p.token, p);
    for (const a of seed.adminProfiles) this.adminProfiles.set(a.userId, a);
    for (const o of seed.organizerProfiles) this.organizerProfiles.set(o.userId, o);
    for (const l of seed.leagues) this.leagues.set(l.id, l);
    for (const p of seed.leagueParticipants) this.leagueParticipants.set(p.id, p);
    this.adminSettings = seed.adminSettings;
  }
}

let store: FileStoreData | null = null;
function data(): FileStoreData {
  if (!store) store = new FileStoreData();
  return store;
}

function sessionTtlMs(): number {
  try {
    return getEnv().sessionTtlDays * 24 * 60 * 60 * 1000;
  } catch {
    return 7 * 24 * 60 * 60 * 1000;
  }
}

export const fileStore: any = {
  dialect: "file",
  lockKey,

  // --- Sessions ---
  async createSession(userId, role, ipAddress, userAgent) {
    return lockKey(`sess:${userId}`, async () => {
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
      data().sessions.set(session.token, session);
      data().saveToDisk();
      return { ...session };
    });
  },

  async getSession(token) {
    if (!token) return null;
    const s = data().sessions.get(token);
    if (!s) return null;
    if (new Date(s.expiresAt).getTime() < Date.now()) {
      data().sessions.delete(token);
      data().saveToDisk();
      return null;
    }
    if (!s.csrfToken) {
      s.csrfToken = `csrf_${securityService.generateCsprngToken(32)}`;
      data().sessions.set(token, s);
      data().saveToDisk();
    }
    return { ...s };
  },

  async rotateSession(oldToken, ipAddress, userAgent) {
    const existing = await fileStore.getSession(oldToken);
    if (!existing) return null;

    return lockKey(`sess:${existing.userId}`, async () => {
      data().sessions.delete(oldToken);
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
      data().sessions.set(updated.token, updated);
      data().saveToDisk();
      return { ...updated };
    });
  },

  async deleteSession(token) {
    const res = data().sessions.delete(token);
    if (res) data().saveToDisk();
    return res;
  },

  async deleteUserSessions(userId) {
    let count = 0;
    for (const [t, s] of data().sessions.entries()) {
      if (s.userId === userId) {
        data().sessions.delete(t);
        count++;
      }
    }
    if (count) data().saveToDisk();
    return count;
  },

  async revokeAllUserSessions(userId, exceptSessionToken) {
    return lockKey(`sess:${userId}`, async () => {
      let count = 0;
      for (const [t, s] of data().sessions.entries()) {
        if (s.userId === userId && (!exceptSessionToken || t !== exceptSessionToken)) {
          data().sessions.delete(t);
          count++;
        }
      }
      if (count) data().saveToDisk();
      return count;
    });
  },

  async purgeExpiredSessions() {
    const now = Date.now();
    let count = 0;
    for (const [t, s] of data().sessions.entries()) {
      if (new Date(s.expiresAt).getTime() < now) {
        data().sessions.delete(t);
        count++;
      }
    }
    if (count) data().saveToDisk();
    return count;
  },

  // --- Profiles ---
  async saveProfile(profile) {
    return lockKey(`profile:${profile.token}`, async () => {
      const next = { ...profile, updatedAt: new Date().toISOString() };
      data().profiles.set(next.token, next);
      data().saveToDisk();
      return { ...next };
    });
  },

  async deleteProfile(token) {
    return lockKey(`profile:${token}`, async () => {
      for (const [t, s] of data().sessions.entries()) {
        if (s.userId === token) data().sessions.delete(t);
      }
      data().adminProfiles.delete(token);
      data().organizerProfiles.delete(token);
      const res = data().profiles.delete(token);
      data().saveToDisk();
      return res;
    });
  },

  async getProfile(token) {
    if (!token) return null;
    const p = data().profiles.get(token);
    return p ? { ...p } : null;
  },

  async getAllProfiles() {
    return Array.from(data().profiles.values()).map((p) => ({ ...p }));
  },

  async findProfileByUsername(username) {
    const clean = username.trim().toLowerCase();
    for (const p of data().profiles.values()) {
      if (p.username.toLowerCase() === clean) return { ...p };
    }
    return null;
  },

  async findProfileByPhone(phoneNumber) {
    const clean = phoneNumber.trim();
    if (!clean) return null;
    const digitsOnly = clean.replace(/\D/g, "");
    const last9 = digitsOnly.length >= 9 ? digitsOnly.slice(-9) : digitsOnly;
    for (const p of data().profiles.values()) {
      if (p.phoneNumber) {
        if (p.phoneNumber === clean) return { ...p };
        const pDigits = p.phoneNumber.replace(/\D/g, "");
        if (last9 && pDigits.endsWith(last9)) return { ...p };
      }
    }
    return null;
  },

  async createRegisteredProfile(token, username, passcode, phoneNumber, explicitRole, passwordSalt) {
    return lockKey(`profile:${token}`, async () => {
      const now = new Date().toISOString();
      const role: Role = explicitRole && VALID_ROLES.includes(explicitRole) ? explicitRole : "user";
      
      let finalPasscode = passcode;
      let finalSalt = passwordSalt;
      if (passcode && !passwordSalt) {
        const hashed = securityService.hashPassword(passcode);
        finalPasscode = hashed.hash;
        finalSalt = hashed.salt;
      }

      const p: Profile = {
        token,
        username: username.trim(),
        phoneNumber: phoneNumber?.trim() || undefined,
        passcode: finalPasscode,
        passwordSalt: finalSalt,
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
      data().profiles.set(token, p);
      data().saveToDisk();
      return { ...p };
    });
  },

  async updateUserProfile(token, updates) {
    return lockKey(`profile:${token}`, async () => {
      const p = data().profiles.get(token);
      if (!p) return null;
      if (updates.username?.trim()) p.username = updates.username.trim();
      if (updates.phoneNumber !== undefined) p.phoneNumber = updates.phoneNumber.trim();
      if (updates.passcode?.trim()) {
        if (updates.passwordSalt) {
          p.passcode = updates.passcode.trim();
          p.passwordSalt = updates.passwordSalt;
        } else {
          const hashed = securityService.hashPassword(updates.passcode.trim());
          p.passcode = hashed.hash;
          p.passwordSalt = hashed.salt;
        }
      }
      p.updatedAt = new Date().toISOString();
      data().profiles.set(token, p);
      data().saveToDisk();
      return { ...p };
    });
  },

  async upsertProfile(token, username, explicitRole) {
    return lockKey(`profile:${token}`, async () => {
      const now = new Date().toISOString();
      const cleanUsername = username.trim() || `Player_${token.slice(-4)}`;
      let p = data().profiles.get(token);

      if (!p) {
        // Disambiguate if username is taken by another profile
        const lower = cleanUsername.toLowerCase();
        let uniqueUsername = cleanUsername;
        for (const prof of data().profiles.values()) {
          if (prof.username.trim().toLowerCase() === lower && prof.token !== token) {
            uniqueUsername = `${cleanUsername}_${Math.floor(100 + Math.random() * 900)}`;
            break;
          }
        }

        p = {
          token,
          username: uniqueUsername,
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
      } else {
        p.username = cleanUsername;
        if (explicitRole && VALID_ROLES.includes(explicitRole)) p.role = explicitRole;
        p.updatedAt = now;
      }

      data().profiles.set(p.token, p);
      data().saveToDisk();
      return { ...p };
    });
  },

  async banUser(token, reason) {
    return lockKey(`profile:${token}`, async () => {
      const p = data().profiles.get(token);
      if (!p) return null;
      p.status = "banned";
      p.bannedAt = new Date().toISOString();
      p.bannedReason = reason;
      p.updatedAt = p.bannedAt;
      data().profiles.set(token, p);
      // Banning must immediately invalidate all live sessions.
      for (const [t, s] of data().sessions.entries()) {
        if (s.userId === token) data().sessions.delete(t);
      }
      data().saveToDisk();
      return { ...p };
    });
  },

  async unbanUser(token) {
    return lockKey(`profile:${token}`, async () => {
      const p = data().profiles.get(token);
      if (!p) return null;
      p.status = "active";
      p.bannedAt = undefined;
      p.bannedReason = undefined;
      p.updatedAt = new Date().toISOString();
      data().profiles.set(token, p);
      data().saveToDisk();
      return { ...p };
    });
  },

  async adjustUserPoints(token, delta) {
    return fileStore.updateProfileBalance(token, delta);
  },

  async updateProfileBalance(token, pointsDelta) {
    return lockKey(`balance:${token}`, async () => {
      const p = data().profiles.get(token);
      if (!p) return null;
      p.points = Math.max(0, p.points + pointsDelta);
      p.marbles = p.points;
      p.updatedAt = new Date().toISOString();
      data().profiles.set(token, p);
      data().saveToDisk();
      return { ...p };
    });
  },

  async updateProfileMarblesBalance(token, marblesDelta) {
    return fileStore.updateProfileBalance(token, marblesDelta);
  },

  async updateProfileStats(token, isWin, isDraw = false, opponentToken) {
    return lockKey(`profile:${token}`, async () => {
      const p = data().profiles.get(token);
      if (!p) return null;

      const opponent = opponentToken ? data().profiles.get(opponentToken) || null : null;
      const update = calculateDynamicRatingUpdate(p, opponent, isWin, isDraw);

      p.rating = update.newRating;
      p.wins = update.newWins;
      p.losses = update.newLosses;
      p.draws = update.newDraws;
      p.winStreak = update.newWinStreak;
      p.bestStreak = update.newBestStreak;
      p.matchesLast7Days = update.newMatchesLast7Days;
      p.opponentRatingAvg = update.newOpponentRatingAvg;
      p.totalOpponentsFaced = update.newTotalOpponentsFaced;
      p.lastMatchAt = update.lastMatchAt;

      p.points += isWin ? 100 : isDraw ? 20 : 10;
      p.marbles = p.points;
      p.updatedAt = new Date().toISOString();
      data().profiles.set(token, p);
      data().saveToDisk();
      return { ...p };
    });
  },

  async getLeaderboard(limit = 10) {
    return Array.from(data().profiles.values())
      .sort((a, b) => getProfileRank(b).dpi - getProfileRank(a).dpi || b.wins - a.wins)
      .slice(0, limit)
      .map((p) => ({ ...p }));
  },

  // --- Admin settings ---
  async getAdminSettings() {
    return { ...data().adminSettings };
  },

  async updateAdminSettings(updates, adminName) {
    return lockKey("admin_settings", async () => {
      const s = data().adminSettings;
      const positive = (v?: number) => v !== undefined && v > 0;
      const nonNegative = (v?: number) => v !== undefined && v >= 0;

      if (nonNegative(updates.wagerFeePercent)) s.wagerFeePercent = updates.wagerFeePercent!;
      if (nonNegative(updates.tournamentFeePercent)) s.tournamentFeePercent = updates.tournamentFeePercent!;
      if (positive(updates.pointsPerGhsBuy)) s.pointsPerGhsBuy = Math.round(updates.pointsPerGhsBuy!);
      if (positive(updates.pointsPerGhsWithdraw)) {
        s.pointsPerGhsWithdraw = Math.round(updates.pointsPerGhsWithdraw!);
      }
      if (nonNegative(updates.minDepositGhs)) s.minDepositGhs = updates.minDepositGhs!;
      if (positive(updates.maxDepositGhs)) s.maxDepositGhs = updates.maxDepositGhs!;
      if (nonNegative(updates.minWithdrawalGhs)) s.minWithdrawalGhs = updates.minWithdrawalGhs!;
      if (positive(updates.maxWithdrawalGhs)) s.maxWithdrawalGhs = updates.maxWithdrawalGhs!;
      if (positive(updates.maxDailyWithdrawalGhs)) {
        s.maxDailyWithdrawalGhs = updates.maxDailyWithdrawalGhs!;
      }

      s.updatedAt = new Date().toISOString();
      if (adminName) s.updatedBy = adminName;
      data().saveToDisk();
      return { ...s };
    });
  },

  // --- Paystack idempotency ---
  async markPaystackRefProcessed(reference) {
    return lockKey(`paystack:${reference}`, async () => {
      if (data().processedPaystackRefs.has(reference)) return false;
      data().processedPaystackRefs.add(reference);
      data().saveToDisk();
      return true;
    });
  },

  async isPaystackRefProcessed(reference) {
    return data().processedPaystackRefs.has(reference);
  },

  // --- Rooms ---
  async getRoom(code) {
    const r = data().rooms.get(code);
    return r ? { ...r } : null;
  },

  async saveRoom(room) {
    return lockKey(`room:${room.code}`, async () => {
      const next = { ...room, updatedAt: new Date().toISOString() };
      data().rooms.set(next.code, next);
      data().saveToDisk();
      return { ...next };
    });
  },

  async listRooms(limit = 20) {
    return Array.from(data().rooms.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit)
      .map((r) => ({ ...r }));
  },

  // --- Wallet ---
  async createTransaction(tx) {
    return lockKey(`tx:${tx.id}`, async () => {
      data().transactions.set(tx.id, { ...tx });
      data().saveToDisk();
      return { ...tx };
    });
  },

  async getTransaction(id: string) {
    const found = data().transactions.get(id);
    return found ? { ...found } : null;
  },

  async updateTransaction(id: string, updates: Partial<WalletTransaction>) {
    return lockKey(`tx:${id}`, async () => {
      const existing = data().transactions.get(id);
      if (!existing) return null;
      const merged = { ...existing, ...updates };
      data().transactions.set(id, merged);
      data().saveToDisk();
      return merged;
    });
  },

  async getUserTransactions(token, limit = 20) {
    return Array.from(data().transactions.values())
      .filter((t) => t.userToken === token)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map((t) => ({ ...t }));
  },

  async getAllTransactions(limit = 50) {
    return Array.from(data().transactions.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map((t) => ({ ...t }));
  },

  // --- Escrows ---
  async createEscrow(escrow) {
    return lockKey(`escrow:${escrow.id}`, async () => {
      data().escrows.set(escrow.id, { ...escrow });
      data().saveToDisk();
      return { ...escrow };
    });
  },

  async getEscrow(id) {
    const e = data().escrows.get(id);
    return e ? { ...e } : null;
  },

  async saveEscrow(escrow) {
    return lockKey(`escrow:${escrow.id}`, async () => {
      data().escrows.set(escrow.id, { ...escrow });
      data().saveToDisk();
      return { ...escrow };
    });
  },

  // --- Leagues ---
  async listLeagues() {
    return Array.from(data().leagues.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((l) => ({ ...l }));
  },

  async getLeague(id) {
    const l = data().leagues.get(id);
    return l ? { ...l } : null;
  },

  async saveLeague(league) {
    return lockKey(`league:${league.id}`, async () => {
      const next = { ...league, updatedAt: new Date().toISOString() };
      data().leagues.set(next.id, next);
      data().saveToDisk();
      return { ...next };
    });
  },

  async deleteLeague(id) {
    return lockKey(`league:${id}`, async () => {
      data().leagues.delete(id);
      for (const [pId, part] of data().leagueParticipants.entries()) {
        if (part.leagueId === id) data().leagueParticipants.delete(pId);
      }
      for (const [mId, match] of data().leagueMatches.entries()) {
        if (match.leagueId === id) data().leagueMatches.delete(mId);
      }
      data().saveToDisk();
      return true;
    });
  },

  async getLeagueParticipants(leagueId) {
    return Array.from(data().leagueParticipants.values())
      .filter((p) => p.leagueId === leagueId)
      .map((p) => ({ ...p }));
  },

  async addLeagueParticipant(participant) {
    return lockKey(`league:${participant.leagueId}`, async () => {
      data().leagueParticipants.set(participant.id, { ...participant });
      const l = data().leagues.get(participant.leagueId);
      if (l) {
        l.participantCount = Array.from(data().leagueParticipants.values()).filter(
          (p) => p.leagueId === l.id && p.status !== "rejected",
        ).length;
      }
      data().saveToDisk();
      return { ...participant };
    });
  },

  async updateParticipantStatus(participantId, status) {
    const part = data().leagueParticipants.get(participantId);
    if (!part) return null;
    return lockKey(`league:${part.leagueId}`, async () => {
      part.status = status;
      data().leagueParticipants.set(participantId, { ...part });
      const l = data().leagues.get(part.leagueId);
      if (l) {
        l.participantCount = Array.from(data().leagueParticipants.values()).filter(
          (p) => p.leagueId === part.leagueId && p.status === "approved",
        ).length;
      }
      data().saveToDisk();
      return { ...part };
    });
  },

  async getLeagueMatches(leagueId) {
    return Array.from(data().leagueMatches.values())
      .filter((m) => !leagueId || m.leagueId === leagueId)
      .sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber)
      .map((m) => ({ ...m }));
  },

  async saveLeagueMatch(match) {
    return lockKey(`match:${match.id}`, async () => {
      data().leagueMatches.set(match.id, { ...match });
      data().saveToDisk();
      return { ...match };
    });
  },

  async setLeagueMatches(matches) {
    if (!matches.length) return;
    return lockKey(`league:${matches[0].leagueId}`, async () => {
      for (const m of matches) data().leagueMatches.set(m.id, { ...m });
      data().saveToDisk();
    });
  },

  // --- Audit log ---
  async createAdminLog(log) {
    data().adminLogs.set(log.id, { ...log });
    data().saveToDisk();
    return { ...log };
  },

  async listAdminLogs(limit = 30) {
    return Array.from(data().adminLogs.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map((l) => ({ ...l }));
  },

  // --- Organizer profiles ---
  async getOrganizerProfile(userId) {
    const o = data().organizerProfiles.get(userId);
    return o ? { ...o } : null;
  },

  async saveOrganizerProfile(profile) {
    return lockKey(`org:${profile.userId}`, async () => {
      data().organizerProfiles.set(profile.userId, { ...profile });
      data().saveToDisk();
      return { ...profile };
    });
  },

  async listOrganizerProfiles(status?: OrganizerStatus) {
    let list = Array.from(data().organizerProfiles.values());
    if (status) list = list.filter((o) => o.status === status);
    return list
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
      .map((o) => ({ ...o }));
  },

  // --- Admin profiles ---
  async getAdminProfile(userId) {
    const a = data().adminProfiles.get(userId);
    return a ? { ...a } : null;
  },

  async saveAdminProfile(profile) {
    return lockKey(`admin_prof:${profile.userId}`, async () => {
      data().adminProfiles.set(profile.userId, { ...profile });
      data().saveToDisk();
      return { ...profile };
    });
  },

  async listAdminProfiles() {
    return Array.from(data().adminProfiles.values())
      .sort((a, b) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime())
      .map((a) => ({ ...a }));
  },

  // --- Seeder ---
  async seedDatabase() {
    data().applySeed();
    data().saveToDisk();
    return Array.from(data().profiles.values()).map((p) => ({ ...p }));
  },
};
