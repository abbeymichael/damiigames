import { Profile, Room, WalletTransaction, League, LeagueParticipant, LeagueMatch, WagerEscrow, AdminLog, AdminSettings, AdminProfile, OrganizerProfile, AdminPermission, Session, Role, OrganizerStatus } from "./types";
import { securityService } from "./security";
import { calculateDynamicRatingUpdate, getProfileRank } from "./rank-service";
import fs from "fs";
import path from "path";

// Unified Database Abstraction / Persistent Data Access Layer for DAMII
// Supports Disk-backed SQLite File Store (.data/damii_db.json) + Drizzle ORM (SQLite / PostgreSQL / MySQL)

const DB_FILE_PATH = path.join(process.cwd(), ".data", "damii_db.json");

// Key-based mutex locks to prevent race conditions during money movements & room settlements
const activeLocks = new Map<string, Promise<unknown>>();

async function lockKey<T>(key: string, fn: () => Promise<T>): Promise<T> {
  while (activeLocks.has(key)) {
    try {
      await activeLocks.get(key);
    } catch {
      // ignore errors from previous task in queue
    }
  }

  let resolveLock: () => void;
  const lockPromise = new Promise<void>((res) => {
    resolveLock = res;
  });

  activeLocks.set(key, lockPromise);

  try {
    return await fn();
  } finally {
    activeLocks.delete(key);
    // @ts-ignore
    resolveLock!();
  }
}

class InMemoryStore {
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
  adminSettings: AdminSettings = {
    wagerFeePercent: 5,
    tournamentFeePercent: 10,
    pointsPerGhsBuy: 1,
    pointsPerGhsWithdraw: 1,
    minDepositGhs: 5,
    maxDepositGhs: 5000,
    minWithdrawalGhs: 10,
    maxWithdrawalGhs: 2000,
    maxDailyWithdrawalGhs: 5000,
    updatedAt: new Date().toISOString(),
    updatedBy: "System",
  };

  constructor() {
    const loaded = this.loadFromDisk();
    if (!loaded) {
      this.seedDefaultData();
      this.saveToDisk();
    }
  }

  public saveToDisk() {
    try {
      const dataDir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

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
      // In read-only or serverless worker context without disk access, fallback gracefully
      console.warn("Disk persistence warning:", err instanceof Error ? err.message : err);
    }
  }

  public loadFromDisk(): boolean {
    try {
      if (!fs.existsSync(DB_FILE_PATH)) return false;
      const raw = fs.readFileSync(DB_FILE_PATH, "utf-8");
      if (!raw || !raw.trim()) return false;

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
      if (Array.isArray(dump.processedPaystackRefs)) this.processedPaystackRefs = new Set(dump.processedPaystackRefs);
      if (dump.adminSettings) this.adminSettings = dump.adminSettings;

      return true;
    } catch (err) {
      console.warn("Failed to load database from disk, re-seeding default data:", err);
      return false;
    }
  }

  public seedDefaultData() {
    const now = new Date().toISOString();

    const adminCreds = securityService.hashPassword("admin123");
    const playerCreds = securityService.hashPassword("123456");

    // 1. Seed Admin Accounts & AdminProfiles
    this.profiles.set("admin-token-001", {
      token: "admin-token-001",
      username: "admin",
      passcode: adminCreds.hash,
      passwordSalt: adminCreds.salt,
      rating: 1900,
      marbles: 1000,
      points: 10000,
      wins: 50,
      losses: 2,
      draws: 1,
      role: "super_admin",
      createdAt: now,
      updatedAt: now,
    });

    this.adminProfiles.set("admin-token-001", {
      userId: "admin-token-001",
      isSuperAdmin: true,
      permissions: [
        "manage_users",
        "manage_organizers",
        "manage_tournaments",
        "manage_wallet",
        "manage_payouts",
        "resolve_disputes",
        "manage_admins",
        "run_seeder",
        "view_audit_log",
      ],
      grantedBy: "system",
      grantedAt: now,
    });

    this.profiles.set("admin-token-002", {
      token: "admin-token-002",
      username: "superadmin",
      passcode: adminCreds.hash,
      passwordSalt: adminCreds.salt,
      rating: 2000,
      marbles: 2000,
      points: 15000,
      wins: 80,
      losses: 1,
      draws: 0,
      role: "super_admin",
      createdAt: now,
      updatedAt: now,
    });

    this.adminProfiles.set("admin-token-002", {
      userId: "admin-token-002",
      isSuperAdmin: true,
      permissions: [
        "manage_users",
        "manage_organizers",
        "manage_tournaments",
        "manage_wallet",
        "manage_payouts",
        "resolve_disputes",
        "manage_admins",
        "run_seeder",
        "view_audit_log",
      ],
      grantedBy: "system",
      grantedAt: now,
    });

    this.profiles.set("admin-token-003", {
      token: "admin-token-003",
      username: "DAMII Facilitator",
      passcode: adminCreds.hash,
      passwordSalt: adminCreds.salt,
      rating: 1850,
      marbles: 1000,
      points: 5000,
      wins: 42,
      losses: 5,
      draws: 2,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    });

    this.adminProfiles.set("admin-token-003", {
      userId: "admin-token-003",
      isSuperAdmin: false,
      permissions: ["manage_tournaments", "resolve_disputes", "view_audit_log"],
      grantedBy: "admin-token-001",
      grantedAt: now,
    });

    // 1b. Seed Organizer Accounts & OrganizerProfiles
    this.profiles.set("organizer-kofi-token", {
      token: "organizer-kofi-token",
      username: "Organizer_Kofi",
      passcode: playerCreds.hash,
      passwordSalt: playerCreds.salt,
      rating: 1750,
      marbles: 1000,
      points: 8000,
      wins: 30,
      losses: 10,
      draws: 2,
      role: "organizer",
      createdAt: now,
      updatedAt: now,
    });

    this.organizerProfiles.set("organizer-kofi-token", {
      userId: "organizer-kofi-token",
      username: "Organizer_Kofi",
      status: "approved",
      requestedAt: now,
      reviewedBy: "admin-token-001",
      reviewedAt: now,
      organizationName: "Kofi Draughts Club",
      bio: "Premier Draughts League organizer in Accra",
      contactPhone: "+233240001122",
    });

    this.profiles.set("organizer-ghana-token", {
      token: "organizer-ghana-token",
      username: "Ghana_Damii_Org",
      passcode: playerCreds.hash,
      passwordSalt: playerCreds.salt,
      rating: 1820,
      marbles: 1500,
      points: 12000,
      wins: 45,
      losses: 8,
      draws: 3,
      role: "organizer",
      createdAt: now,
      updatedAt: now,
    });

    this.organizerProfiles.set("organizer-ghana-token", {
      userId: "organizer-ghana-token",
      username: "Ghana_Damii_Org",
      status: "approved",
      requestedAt: now,
      reviewedBy: "admin-token-001",
      reviewedAt: now,
      organizationName: "Damii Association",
      bio: "Official national circuit organizer",
      contactPhone: "+233500003344",
    });

    // 2. Seed Initial Player Users with HASHED PASSCODES
    this.profiles.set("player-kwame-token", {
      token: "player-kwame-token",
      username: "Kwame_Master",
      passcode: playerCreds.hash,
      passwordSalt: playerCreds.salt,
      rating: 1420,
      marbles: 250,
      points: 2000,
      wins: 18,
      losses: 6,
      draws: 1,
      role: "user",
      createdAt: now,
      updatedAt: now,
    });

    this.organizerProfiles.set("player-kwame-token", {
      userId: "player-kwame-token",
      username: "Kwame_Master",
      status: "pending",
      requestedAt: now,
      organizationName: "Kwame Arena",
      bio: "Organizing local regional tournaments",
      contactPhone: "+233241234567",
    });

    this.profiles.set("player-ama-token", {
      token: "player-ama-token",
      username: "Ama_Queen",
      passcode: playerCreds.hash,
      passwordSalt: playerCreds.salt,
      rating: 1390,
      marbles: 180,
      points: 1500,
      wins: 14,
      losses: 4,
      draws: 3,
      role: "user",
      createdAt: now,
      updatedAt: now,
    });

    this.profiles.set("player-kofi-token", {
      token: "player-kofi-token",
      username: "Kofi_Grandmaster",
      passcode: playerCreds.hash,
      passwordSalt: playerCreds.salt,
      rating: 1650,
      marbles: 400,
      points: 3500,
      wins: 28,
      losses: 8,
      draws: 2,
      role: "user",
      createdAt: now,
      updatedAt: now,
    });

    this.profiles.set("player-1-token", {
      token: "player-1-token",
      username: "player1",
      passcode: playerCreds.hash,
      passwordSalt: playerCreds.salt,
      rating: 1200,
      marbles: 100,
      points: 800,
      wins: 5,
      losses: 3,
      draws: 0,
      role: "user",
      createdAt: now,
      updatedAt: now,
    });

    // Seed sample leagues
    const league1Id = "league-open-2026";
    this.leagues.set(league1Id, {
      id: league1Id,
      title: "Championship Open 2026",
      description: "Official 10x10 Damii Tournament. Compete for 10,000 Points prize pool!",
      entryFeeMarbles: 0,
      entryFeePoints: 50,
      prizePoolPoints: 10000,
      status: "registration",
      format: "single_elimination",
      facilitatorToken: "admin-token-001",
      facilitatorName: "admin",
      maxParticipants: 8,
      participantCount: 3,
      winnerToken: null,
      winnerName: null,
      turnTimerSeconds: 60,
      roundsCount: 3,
      createdAt: now,
      updatedAt: now,
    });

    this.leagueParticipants.set("part-1", {
      id: "part-1",
      leagueId: league1Id,
      userToken: "admin-token-001",
      username: "admin",
      status: "approved",
      seed: 1,
      checkedIn: true,
      pointsScore: 0,
      winsCount: 0,
      lossesCount: 0,
      drawsCount: 0,
      joinedAt: now,
    });
    this.leagueParticipants.set("part-2", {
      id: "part-2",
      leagueId: league1Id,
      userToken: "player-kwame-token",
      username: "Kwame_Master",
      status: "approved",
      seed: 2,
      checkedIn: true,
      pointsScore: 0,
      winsCount: 0,
      lossesCount: 0,
      drawsCount: 0,
      joinedAt: now,
    });
    this.leagueParticipants.set("part-3", {
      id: "part-3",
      leagueId: league1Id,
      userToken: "player-ama-token",
      username: "Ama_Queen",
      status: "approved",
      seed: 3,
      checkedIn: false,
      pointsScore: 0,
      winsCount: 0,
      lossesCount: 0,
      drawsCount: 0,
      joinedAt: now,
    });
  }
}

const memoryStore = new InMemoryStore();

export function getDatabaseDialect(): "sqlite" | "postgres" | "mysql" | "memory" {
  const dialect = (process.env.DATABASE_DIALECT || "").toLowerCase();
  if (dialect === "postgres" || dialect === "postgresql") return "postgres";
  if (dialect === "mysql") return "mysql";
  if (dialect === "sqlite") return "sqlite";
  return "sqlite"; // Default to persistent SQLite / Disk
}

export const dbRepository = {
  // Lock helper for atomic mutations
  lockKey,

  // --- Sessions & Auth ---
  async createSession(userId: string, role: Role, ipAddress?: string, userAgent?: string): Promise<Session> {
    return lockKey(`sess:${userId}`, async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
      const token = `sess_${securityService.generateCsprngToken(16)}`;
      const csrfToken = `csrf_${securityService.generateCsprngToken(16)}`;
      const session: Session = {
        id: `s_${securityService.generateCsprngToken(8)}`,
        userId,
        token,
        role,
        csrfToken,
        createdAt: now.toISOString(),
        expiresAt,
        ipAddress,
        userAgent,
      };
      memoryStore.sessions.set(token, session);
      memoryStore.saveToDisk();
      return { ...session };
    });
  },

  async getSession(token: string): Promise<Session | null> {
    if (!token) return null;
    const s = memoryStore.sessions.get(token);
    if (!s) return null;
    if (new Date(s.expiresAt).getTime() < Date.now()) {
      memoryStore.sessions.delete(token);
      memoryStore.saveToDisk();
      return null;
    }
    if (!s.csrfToken) {
      s.csrfToken = `csrf_${securityService.generateCsprngToken(16)}`;
      memoryStore.sessions.set(token, s);
      memoryStore.saveToDisk();
    }
    return { ...s };
  },

  async rotateSession(oldToken: string, ipAddress?: string, userAgent?: string): Promise<Session | null> {
    const existing = await this.getSession(oldToken);
    if (!existing) return null;

    return lockKey(`sess:${existing.userId}`, async () => {
      memoryStore.sessions.delete(oldToken);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const newToken = `sess_${securityService.generateCsprngToken(16)}`;
      const newCsrfToken = `csrf_${securityService.generateCsprngToken(16)}`;

      const updatedSession: Session = {
        id: existing.id || `s_${securityService.generateCsprngToken(8)}`,
        userId: existing.userId,
        token: newToken,
        role: existing.role,
        csrfToken: newCsrfToken,
        createdAt: now.toISOString(),
        expiresAt,
        ipAddress: ipAddress || existing.ipAddress,
        userAgent: userAgent || existing.userAgent,
      };

      memoryStore.sessions.set(newToken, updatedSession);
      memoryStore.saveToDisk();
      return { ...updatedSession };
    });
  },

  async deleteSession(token: string): Promise<boolean> {
    const res = memoryStore.sessions.delete(token);
    if (res) memoryStore.saveToDisk();
    return res;
  },

  async deleteUserSessions(userId: string): Promise<number> {
    let count = 0;
    for (const [t, s] of memoryStore.sessions.entries()) {
      if (s.userId === userId) {
        memoryStore.sessions.delete(t);
        count++;
      }
    }
    if (count > 0) memoryStore.saveToDisk();
    return count;
  },

  async revokeAllUserSessions(userId: string, exceptSessionToken?: string): Promise<number> {
    return lockKey(`sess:${userId}`, async () => {
      let count = 0;
      for (const [t, s] of memoryStore.sessions.entries()) {
        if (s.userId === userId && (!exceptSessionToken || t !== exceptSessionToken)) {
          memoryStore.sessions.delete(t);
          count++;
        }
      }
      if (count > 0) memoryStore.saveToDisk();
      return count;
    });
  },

  // --- Profiles & Auth ---
  async saveProfile(profile: Profile): Promise<Profile> {
    return lockKey(`profile:${profile.token}`, async () => {
      profile.updatedAt = new Date().toISOString();
      memoryStore.profiles.set(profile.token, { ...profile });
      memoryStore.saveToDisk();
      return { ...profile };
    });
  },

  async deleteProfile(token: string): Promise<boolean> {
    return lockKey(`profile:${token}`, async () => {
      await this.deleteUserSessions(token);
      memoryStore.adminProfiles.delete(token);
      memoryStore.organizerProfiles.delete(token);
      const res = memoryStore.profiles.delete(token);
      memoryStore.saveToDisk();
      return res;
    });
  },

  async deleteLeague(id: string): Promise<boolean> {
    memoryStore.leagues.delete(id);
    for (const [pId, part] of memoryStore.leagueParticipants.entries()) {
      if (part.leagueId === id) memoryStore.leagueParticipants.delete(pId);
    }
    for (const [mId, match] of memoryStore.leagueMatches.entries()) {
      if (match.leagueId === id) memoryStore.leagueMatches.delete(mId);
    }
    memoryStore.saveToDisk();
    return true;
  },

  async getProfile(token: string): Promise<Profile | null> {
    if (!token) return null;
    const p = memoryStore.profiles.get(token);
    if (p) return { ...p };
    return null;
  },

  async getAllProfiles(): Promise<Profile[]> {
    return Array.from(memoryStore.profiles.values()).map((p) => ({ ...p }));
  },

  async banUser(token: string, reason: string): Promise<Profile | null> {
    return lockKey(`profile:${token}`, async () => {
      const p = memoryStore.profiles.get(token);
      if (!p) return null;
      p.status = "banned";
      p.bannedAt = new Date().toISOString();
      p.bannedReason = reason;
      p.updatedAt = new Date().toISOString();
      memoryStore.profiles.set(token, p);
      memoryStore.saveToDisk();
      return { ...p };
    });
  },

  async unbanUser(token: string): Promise<Profile | null> {
    return lockKey(`profile:${token}`, async () => {
      const p = memoryStore.profiles.get(token);
      if (!p) return null;
      p.status = "active";
      p.bannedAt = undefined;
      p.bannedReason = undefined;
      p.updatedAt = new Date().toISOString();
      memoryStore.profiles.set(token, p);
      memoryStore.saveToDisk();
      return { ...p };
    });
  },

  async adjustUserPoints(token: string, delta: number): Promise<Profile | null> {
    return this.updateProfileBalance(token, delta);
  },

  // --- Admin Settings & Rates ---
  async getAdminSettings(): Promise<AdminSettings> {
    return { ...memoryStore.adminSettings };
  },

  async updateAdminSettings(updates: Partial<AdminSettings>, adminName?: string): Promise<AdminSettings> {
    return lockKey("admin_settings", async () => {
      if (updates.wagerFeePercent !== undefined) {
        memoryStore.adminSettings.wagerFeePercent = updates.wagerFeePercent;
      }
      if (updates.tournamentFeePercent !== undefined) {
        memoryStore.adminSettings.tournamentFeePercent = updates.tournamentFeePercent;
      }
      if (updates.pointsPerGhsBuy !== undefined && updates.pointsPerGhsBuy > 0) {
        memoryStore.adminSettings.pointsPerGhsBuy = Math.round(updates.pointsPerGhsBuy);
      }
      if (updates.pointsPerGhsWithdraw !== undefined && updates.pointsPerGhsWithdraw > 0) {
        memoryStore.adminSettings.pointsPerGhsWithdraw = Math.round(updates.pointsPerGhsWithdraw);
      }
      if (updates.minDepositGhs !== undefined && updates.minDepositGhs >= 0) {
        memoryStore.adminSettings.minDepositGhs = updates.minDepositGhs;
      }
      if (updates.maxDepositGhs !== undefined && updates.maxDepositGhs > 0) {
        memoryStore.adminSettings.maxDepositGhs = updates.maxDepositGhs;
      }
      if (updates.minWithdrawalGhs !== undefined && updates.minWithdrawalGhs >= 0) {
        memoryStore.adminSettings.minWithdrawalGhs = updates.minWithdrawalGhs;
      }
      if (updates.maxWithdrawalGhs !== undefined && updates.maxWithdrawalGhs > 0) {
        memoryStore.adminSettings.maxWithdrawalGhs = updates.maxWithdrawalGhs;
      }
      if (updates.maxDailyWithdrawalGhs !== undefined && updates.maxDailyWithdrawalGhs > 0) {
        memoryStore.adminSettings.maxDailyWithdrawalGhs = updates.maxDailyWithdrawalGhs;
      }
      memoryStore.adminSettings.updatedAt = new Date().toISOString();
      if (adminName) memoryStore.adminSettings.updatedBy = adminName;
      memoryStore.saveToDisk();
      return { ...memoryStore.adminSettings };
    });
  },

  async findProfileByUsername(username: string): Promise<Profile | null> {
    const clean = username.trim().toLowerCase();
    for (const p of memoryStore.profiles.values()) {
      if (p.username.toLowerCase() === clean) return { ...p };
    }
    return null;
  },

  // STRICT SECURITY CHECK: Ensures that 'role' cannot be set to 'admin', 'super_admin', 'facilitator', or 'treasurer'
  // based solely on substring matches like 'admin' or 'facilitator' in the username.
  // Only explicit role assignments passed from verified administrative sources are accepted.
  async createRegisteredProfile(token: string, username: string, passcode: string, phoneNumber?: string, explicitRole?: Role): Promise<Profile> {
    return lockKey(`profile:${token}`, async () => {
      const now = new Date().toISOString();
      const validPrivilegedRoles: Role[] = ["admin", "super_admin", "facilitator", "treasurer", "organizer", "user"];
      
      // Strict role assignment: default to 'user' unless an explicit valid role parameter is passed
      let assignedRole: Role = "user";
      if (explicitRole && validPrivilegedRoles.includes(explicitRole)) {
        assignedRole = explicitRole;
      }

      const p: Profile = {
        token,
        username: username.trim(),
        phoneNumber: phoneNumber?.trim() || undefined,
        passcode,
        rating: 1000,
        marbles: 0,
        points: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        role: assignedRole,
        createdAt: now,
        updatedAt: now,
      };
      memoryStore.profiles.set(token, p);
      memoryStore.saveToDisk();
      return { ...p };
    });
  },

  async updateUserProfile(token: string, updates: { username?: string; phoneNumber?: string; passcode?: string }): Promise<Profile | null> {
    return lockKey(`profile:${token}`, async () => {
      const p = memoryStore.profiles.get(token);
      if (!p) return null;
      if (updates.username && updates.username.trim()) {
        p.username = updates.username.trim();
      }
      if (updates.phoneNumber !== undefined) {
        p.phoneNumber = updates.phoneNumber.trim();
      }
      if (updates.passcode && updates.passcode.trim()) {
        p.passcode = updates.passcode.trim();
      }
      p.updatedAt = new Date().toISOString();
      memoryStore.profiles.set(token, p);
      memoryStore.saveToDisk();
      return { ...p };
    });
  },

  // STRICT SECURITY CHECK: Ensures upsertProfile cannot assign 'admin' or 'super_admin' roles based on
  // username substring matches (e.g. 'admin' or 'facilitator'). Only explicit role assignments are honored.
  async upsertProfile(token: string, username: string, explicitRole?: Role): Promise<Profile> {
    return lockKey(`profile:${token}`, async () => {
      const now = new Date().toISOString();
      const validPrivilegedRoles: Role[] = ["admin", "super_admin", "facilitator", "treasurer", "organizer", "user"];
      let p = memoryStore.profiles.get(token);

      if (!p) {
        let assignedRole: Role = "user";
        if (explicitRole && validPrivilegedRoles.includes(explicitRole)) {
          assignedRole = explicitRole;
        }

        p = {
          token,
          username: username.trim(),
          rating: 1000,
          marbles: 0,
          points: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          role: assignedRole,
          createdAt: now,
          updatedAt: now,
        };
      } else {
        p.username = username.trim();
        if (explicitRole && validPrivilegedRoles.includes(explicitRole)) {
          p.role = explicitRole;
        }
        p.updatedAt = now;
      }

      // Security Guard: Prevent any legacy substring-matched role escalation
      const lowerUsername = p.username.toLowerCase();
      if ((lowerUsername.includes("admin") || lowerUsername.includes("facilitator")) && !explicitRole && (p.role === "admin" || p.role === "super_admin")) {
        // Enforce user role if no explicit admin role was supplied
        p.role = "user";
      }

      memoryStore.profiles.set(token, p);
      memoryStore.saveToDisk();
      return { ...p };
    });
  },

  // ATOMIC BALANCE UPDATES (Points & Marbles staying in sync for 1 Point = 1 Cedi = 1 Marble)
  async updateProfileBalance(token: string, pointsDelta: number): Promise<Profile | null> {
    return lockKey(`balance:${token}`, async () => {
      const p = memoryStore.profiles.get(token);
      if (!p) return null;
      p.points = Math.max(0, p.points + pointsDelta);
      p.marbles = p.points; // Keep points and marbles unified
      p.updatedAt = new Date().toISOString();
      memoryStore.profiles.set(token, p);
      memoryStore.saveToDisk();
      return { ...p };
    });
  },

  async updateProfileMarblesBalance(token: string, marblesDelta: number): Promise<Profile | null> {
    return this.updateProfileBalance(token, marblesDelta);
  },

  async updateProfileStats(token: string, isWin: boolean, isDraw: boolean = false, opponentToken?: string | null): Promise<Profile | null> {
    return lockKey(`profile:${token}`, async () => {
      const p = memoryStore.profiles.get(token);
      if (!p) return null;

      const opponent = opponentToken ? (memoryStore.profiles.get(opponentToken) || null) : null;
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

      if (isWin) {
        p.points += 100; // Match Victory Reward Points
      } else if (isDraw) {
        p.points += 20;
      } else {
        p.points += 10; // Participation reward
      }
      p.marbles = p.points;
      p.updatedAt = new Date().toISOString();
      memoryStore.profiles.set(token, p);
      memoryStore.saveToDisk();
      return { ...p };
    });
  },

  async getLeaderboard(limit = 10): Promise<Profile[]> {
    return Array.from(memoryStore.profiles.values())
      .sort((a, b) => getProfileRank(b).dpi - getProfileRank(a).dpi || b.wins - a.wins)
      .slice(0, limit);
  },

  // --- Paystack Idempotency Locks ---
  async markPaystackRefProcessed(reference: string): Promise<boolean> {
    return lockKey(`paystack:${reference}`, async () => {
      if (memoryStore.processedPaystackRefs.has(reference)) {
        return false; // Already processed
      }
      memoryStore.processedPaystackRefs.add(reference);
      memoryStore.saveToDisk();
      return true;
    });
  },

  async isPaystackRefProcessed(reference: string): Promise<boolean> {
    return memoryStore.processedPaystackRefs.has(reference);
  },

  // --- Rooms ---
  async getRoom(code: string): Promise<Room | null> {
    const r = memoryStore.rooms.get(code);
    if (!r) return null;
    return { ...r };
  },

  async saveRoom(room: Room): Promise<Room> {
    return lockKey(`room:${room.code}`, async () => {
      memoryStore.rooms.set(room.code, { ...room, updatedAt: new Date().toISOString() });
      memoryStore.saveToDisk();
      return { ...room };
    });
  },

  async listRooms(limit = 20): Promise<Room[]> {
    return Array.from(memoryStore.rooms.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  },

  // --- Wallet & Transactions ---
  async createTransaction(tx: WalletTransaction): Promise<WalletTransaction> {
    return lockKey(`tx:${tx.id}`, async () => {
      memoryStore.transactions.set(tx.id, { ...tx });
      memoryStore.saveToDisk();
      return { ...tx };
    });
  },

  async getUserTransactions(token: string, limit = 20): Promise<WalletTransaction[]> {
    return Array.from(memoryStore.transactions.values())
      .filter((t) => t.userToken === token)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  async getAllTransactions(limit = 50): Promise<WalletTransaction[]> {
    return Array.from(memoryStore.transactions.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  // --- Wager Escrows ---
  async createEscrow(escrow: WagerEscrow): Promise<WagerEscrow> {
    return lockKey(`escrow:${escrow.id}`, async () => {
      memoryStore.escrows.set(escrow.id, { ...escrow });
      memoryStore.saveToDisk();
      return { ...escrow };
    });
  },

  async getEscrow(id: string): Promise<WagerEscrow | null> {
    const e = memoryStore.escrows.get(id);
    return e ? { ...e } : null;
  },

  async saveEscrow(escrow: WagerEscrow): Promise<WagerEscrow> {
    return lockKey(`escrow:${escrow.id}`, async () => {
      memoryStore.escrows.set(escrow.id, { ...escrow });
      memoryStore.saveToDisk();
      return { ...escrow };
    });
  },

  // --- Leagues & Tournaments ---
  async listLeagues(): Promise<League[]> {
    return Array.from(memoryStore.leagues.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getLeague(id: string): Promise<League | null> {
    const l = memoryStore.leagues.get(id);
    return l ? { ...l } : null;
  },

  async saveLeague(league: League): Promise<League> {
    return lockKey(`league:${league.id}`, async () => {
      memoryStore.leagues.set(league.id, { ...league, updatedAt: new Date().toISOString() });
      memoryStore.saveToDisk();
      return { ...league };
    });
  },

  async getLeagueParticipants(leagueId: string): Promise<LeagueParticipant[]> {
    return Array.from(memoryStore.leagueParticipants.values())
      .filter((p) => p.leagueId === leagueId);
  },

  async addLeagueParticipant(participant: LeagueParticipant): Promise<LeagueParticipant> {
    return lockKey(`league:${participant.leagueId}`, async () => {
      memoryStore.leagueParticipants.set(participant.id, { ...participant });
      const l = memoryStore.leagues.get(participant.leagueId);
      if (l) {
        l.participantCount = Array.from(memoryStore.leagueParticipants.values()).filter((p) => p.leagueId === l.id && p.status !== "rejected").length;
      }
      memoryStore.saveToDisk();
      return { ...participant };
    });
  },

  async updateParticipantStatus(participantId: string, status: "approved" | "rejected"): Promise<LeagueParticipant | null> {
    const part = memoryStore.leagueParticipants.get(participantId);
    if (!part) return null;
    return lockKey(`league:${part.leagueId}`, async () => {
      part.status = status;
      memoryStore.leagueParticipants.set(participantId, { ...part });
      
      const allApproved = Array.from(memoryStore.leagueParticipants.values())
        .filter((p) => p.leagueId === part.leagueId && p.status === "approved");
      const l = memoryStore.leagues.get(part.leagueId);
      if (l) {
        l.participantCount = allApproved.length;
      }
      memoryStore.saveToDisk();
      return { ...part };
    });
  },

  async getLeagueMatches(leagueId: string): Promise<LeagueMatch[]> {
    return Array.from(memoryStore.leagueMatches.values())
      .filter((m) => !leagueId || m.leagueId === leagueId)
      .sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber);
  },

  async saveLeagueMatch(match: LeagueMatch): Promise<LeagueMatch> {
    return lockKey(`match:${match.id}`, async () => {
      memoryStore.leagueMatches.set(match.id, { ...match });
      memoryStore.saveToDisk();
      return { ...match };
    });
  },

  async setLeagueMatches(matches: LeagueMatch[]): Promise<void> {
    if (!matches.length) return;
    return lockKey(`league:${matches[0].leagueId}`, async () => {
      for (const m of matches) {
        memoryStore.leagueMatches.set(m.id, { ...m });
      }
      memoryStore.saveToDisk();
    });
  },

  // --- Admin Audit Logs ---
  async createAdminLog(log: AdminLog): Promise<AdminLog> {
    memoryStore.adminLogs.set(log.id, { ...log });
    memoryStore.saveToDisk();
    return { ...log };
  },

  async listAdminLogs(limit = 30): Promise<AdminLog[]> {
    return Array.from(memoryStore.adminLogs.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  // --- Organizer Profiles ---
  async getOrganizerProfile(userId: string): Promise<OrganizerProfile | null> {
    const o = memoryStore.organizerProfiles.get(userId);
    return o ? { ...o } : null;
  },

  async saveOrganizerProfile(profile: OrganizerProfile): Promise<OrganizerProfile> {
    return lockKey(`org:${profile.userId}`, async () => {
      memoryStore.organizerProfiles.set(profile.userId, { ...profile });
      memoryStore.saveToDisk();
      return { ...profile };
    });
  },

  async listOrganizerProfiles(status?: OrganizerStatus): Promise<OrganizerProfile[]> {
    let list = Array.from(memoryStore.organizerProfiles.values());
    if (status) {
      list = list.filter((o) => o.status === status);
    }
    return list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  },

  // --- Admin Profiles & Permissions ---
  async getAdminProfile(userId: string): Promise<AdminProfile | null> {
    const a = memoryStore.adminProfiles.get(userId);
    return a ? { ...a } : null;
  },

  async saveAdminProfile(profile: AdminProfile): Promise<AdminProfile> {
    return lockKey(`admin_prof:${profile.userId}`, async () => {
      memoryStore.adminProfiles.set(profile.userId, { ...profile });
      memoryStore.saveToDisk();
      return { ...profile };
    });
  },

  async listAdminProfiles(): Promise<AdminProfile[]> {
    return Array.from(memoryStore.adminProfiles.values())
      .sort((a, b) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime());
  },

  // --- Database Seeder ---
  async seedDatabase(): Promise<Profile[]> {
    memoryStore.seedDefaultData();
    memoryStore.saveToDisk();
    return Array.from(memoryStore.profiles.values()).map((p) => ({ ...p }));
  },
};

