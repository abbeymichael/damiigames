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
  OrganizerStatus,
  OtpRequest,
  Permission,
  Profile,
  Region,
  Role,
  Room,
  Session,
  SystemFundsReport,
  SystemFundSummary,
  SystemFundType,
  SystemSettingEntry,
  SystemSettingsCategory,
  Tournament,
  TournamentActionRequest,
  TournamentEntry,
  TournamentPrize,
  User,
  WagerEscrow,
  WalletTransaction,
  Deposit,
  DepositAction,
  Withdrawal,
  WithdrawalAction,
  ChartOfAccount,
  ChartOfAccountsReport,
  TreasuryFundDetails,
  MechanicsFundDetails,
} from "../types";
import {
  CANONICAL_CHART_OF_ACCOUNTS,
  mapLedgerEntryToAccount,
  determineFundType,
  isMechanicOrBotUser,
  PLATFORM_ACCOUNT_ID,
  MECHANICS_FUND_ACCOUNT_ID,
} from "../ledger";
import { SYSTEM_PERMISSIONS, SEED_ROLES_CONFIG } from "../permissions-constants";
import { securityService } from "../security";
import { calculateDynamicRatingUpdate, getProfileRank } from "../rank-service";
import { getEnv } from "../env";
import { buildSeedDataset, DEFAULT_ADMIN_SETTINGS, DEFAULT_REGIONS } from "./seed-data";
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
  organizerRevocations: Map<string, OrganizerRevocation>;
  adminProfiles: Map<string, AdminProfile>;
  organizerProfiles: Map<string, OrganizerProfile>;
  adminSettings: AdminSettings;
  paystackEvents: Set<string>;
  rooms: Map<string, Room>;
  walletTransactions: WalletTransaction[];
  deposits: Map<string, Deposit>;
  depositActions: DepositAction[];
  withdrawals: Map<string, Withdrawal>;
  withdrawalActions: WithdrawalAction[];
  escrows: Map<string, WagerEscrow>;
  leagues: Map<string, League>;
  leagueParticipants: Map<string, LeagueParticipant>;
  leagueMatches: Map<string, LeagueMatch>;
  adminLogs: AdminLog[];
  regions: Map<string, Region>;
  matches: Map<string, Match>;
  tournaments: Map<string, Tournament>;
  tournamentPrizes: Map<string, TournamentPrize[]>;
  tournamentEntries: Map<string, TournamentEntry[]>;
  gameTypeLimits: Map<string, GameTypeLimit>;
  ledgerEntries: LedgerEntry[];
  roles: Map<string, AppRole>;
  permissions: Map<string, Permission>;
  rolePermissions: Map<string, Set<string>>;
  userRoles: Map<string, Set<string>>;
  games: Map<string, GameCatalogItem>;
  tournamentActionRequests: Map<string, TournamentActionRequest>;
  systemSettings: Map<string, SystemSettingEntry>;
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
      organizerRevocations: new Map(),
      adminProfiles: new Map(),
      organizerProfiles: new Map(),
      adminSettings: { ...DEFAULT_ADMIN_SETTINGS },
      paystackEvents: new Set(),
      rooms: new Map(),
      walletTransactions: [],
      deposits: new Map(),
      depositActions: [],
      withdrawals: new Map(),
      withdrawalActions: [],
      escrows: new Map(),
      leagues: new Map(),
      leagueParticipants: new Map(),
      leagueMatches: new Map(),
      adminLogs: [],
      regions: new Map(),
      matches: new Map(),
      tournaments: new Map(),
      tournamentPrizes: new Map(),
      tournamentEntries: new Map(),
      gameTypeLimits: new Map(),
      ledgerEntries: [],
      roles: new Map(),
      permissions: new Map(),
      rolePermissions: new Map(),
      userRoles: new Map(),
      games: new Map(),
      tournamentActionRequests: new Map(),
      systemSettings: new Map(),
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
      for (const app of seed.organizerApplications) {
        data.organizerApplications.set(app.id, { ...app });
      }
      for (const r of seed.regions) {
        data.regions.set(r.id, { ...r });
      }
      for (const g of seed.gameTypeLimits) {
        data.gameTypeLimits.set(g.id, { ...g });
      }
      data.adminSettings = { ...seed.adminSettings };

      // Ensure super admin role assignment
      const superAdminRoleId = "role-super-admin";
      data.userRoles.set("admin-token-001", new Set([superAdminRoleId]));

      data.initialized = true;
      console.log("[damii][db] Memory store initialized with admin account");
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

  async findProfileByPhone(phoneNumber) {
    const clean = phoneNumber.trim();
    if (!clean) return null;
    const data = getMemoryData();
    const digitsOnly = clean.replace(/\D/g, "");
    const last9 = digitsOnly.length >= 9 ? digitsOnly.slice(-9) : digitsOnly;
    for (const p of data.profiles.values()) {
      if (p.phoneNumber) {
        if (p.phoneNumber === clean) return { ...p };
        const pDigits = p.phoneNumber.replace(/\D/g, "");
        if (last9 && pDigits.endsWith(last9)) return { ...p };
      }
    }
    return null;
  },

  async createRegisteredProfile(token, username, passcode, phoneNumber, explicitRole, passwordSalt) {
    const data = getMemoryData();
    const now = new Date().toISOString();
    const role: Role = explicitRole && VALID_ROLES.includes(explicitRole) ? explicitRole : "user";
    
    // Automatically hash plaintext passcodes if not already hashed
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
    data.profiles.set(token, { ...p });
    return { ...p };
  },

  async updateUserProfile(token, updates) {
    const data = getMemoryData();
    const p = data.profiles.get(token);
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
    data.profiles.set(token, { ...p });
    return { ...p };
  },

  async upsertProfile(token, username, explicitRole) {
    const data = getMemoryData();
    const cleanUsername = username.trim() || `Player_${token.slice(-4)}`;
    const existing = data.profiles.get(token);
    const now = new Date().toISOString();

    if (!existing) {
      // Check if username is already taken by another account
      const lower = cleanUsername.toLowerCase();
      let uniqueUsername = cleanUsername;
      for (const p of data.profiles.values()) {
        if (p.username.trim().toLowerCase() === lower && p.token !== token) {
          uniqueUsername = `${cleanUsername}_${Math.floor(100 + Math.random() * 900)}`;
          break;
        }
      }

      const p: Profile = {
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
      data.profiles.set(token, { ...p });
      return { ...p };
    }

    existing.username = cleanUsername;
    if (explicitRole && VALID_ROLES.includes(explicitRole)) {
      existing.role = explicitRole;
    }
    existing.updatedAt = now;
    data.profiles.set(existing.token, { ...existing });
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
    const newMarbles = Math.max(0, (p.marbles || 0) + pointsDelta);
    p.points = newPoints;
    p.marbles = newMarbles;
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
    p.updatedAt = new Date().toISOString();

    data.profiles.set(token, { ...p });
    return { ...p };
  },

  async getLeaderboard(limit = 10) {
    const data = getMemoryData();
    const profiles = Array.from(data.profiles.values()).map((p) => ({ ...p }));
    const nonPlayerRoles = new Set(["admin", "super_admin", "organizer", "facilitator", "treasurer"]);
    return profiles
      .filter((p) => !nonPlayerRoles.has(p.role) && p.status !== "banned")
      .sort((a, b) => getProfileRank(b).dpi - getProfileRank(a).dpi || b.wins - a.wins)
      .slice(0, limit);
  },

  // --- Admin settings ---
  async getAdminSettings() {
    const data = getMemoryData();
    return { ...data.adminSettings };
  },

  async getPlatformSettings() {
    const data = getMemoryData();
    return { ...data.adminSettings };
  },

  async updatePlatformSettings(updates: Partial<AdminSettings>, adminName?: string) {
    return memoryStore.updateAdminSettings(updates, adminName);
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
    if (updates.paystackSecretKey !== undefined) next.paystackSecretKey = String(updates.paystackSecretKey).trim();
    if (updates.paystackPublicKey !== undefined) next.paystackPublicKey = String(updates.paystackPublicKey).trim();
    if (updates.paystackMode !== undefined) next.paystackMode = updates.paystackMode;
    if (updates.paystackWebhookSecret !== undefined) next.paystackWebhookSecret = String(updates.paystackWebhookSecret).trim();
    if (updates.paystackCurrency !== undefined) next.paystackCurrency = String(updates.paystackCurrency).trim().toUpperCase();
    if ((updates as any).autoPayoutEnabled !== undefined) (next as any).autoPayoutEnabled = Boolean((updates as any).autoPayoutEnabled);
    if (updates.activePayoutProvider !== undefined) next.activePayoutProvider = updates.activePayoutProvider;
    if (updates.palmpayMerchantId !== undefined) next.palmpayMerchantId = String(updates.palmpayMerchantId).trim();
    if (updates.palmpayBearerToken !== undefined) next.palmpayBearerToken = String(updates.palmpayBearerToken).trim();
    if (updates.palmpayAppSecret !== undefined) next.palmpayAppSecret = String(updates.palmpayAppSecret).trim();
    if (updates.palmpaySignature !== undefined) next.palmpaySignature = String(updates.palmpaySignature).trim();
    if (updates.palmpayMode !== undefined) next.palmpayMode = updates.palmpayMode;
    if (updates.palmpayCountryCode !== undefined) next.palmpayCountryCode = String(updates.palmpayCountryCode).trim().toUpperCase();
    if (updates.palmpayCurrency !== undefined) next.palmpayCurrency = String(updates.palmpayCurrency).trim().toUpperCase();
    if (updates.palmpayBaseUrl !== undefined) next.palmpayBaseUrl = String(updates.palmpayBaseUrl).trim();
    if (updates.payoutProvidersEnabled !== undefined) next.payoutProvidersEnabled = updates.payoutProvidersEnabled;
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

  async getAllRooms(limit = 20) {
    return memoryStore.listRooms(limit);
  },

  // --- Wallet ---
  async createTransaction(tx) {
    const data = getMemoryData();
    const existingIdx = data.walletTransactions.findIndex((t) => t.id === tx.id);
    if (existingIdx >= 0) {
      data.walletTransactions[existingIdx] = { ...data.walletTransactions[existingIdx], ...tx };
    } else {
      data.walletTransactions.unshift({ ...tx });
    }
    return { ...tx };
  },

  async getTransaction(id: string) {
    const data = getMemoryData();
    const found = data.walletTransactions.find((t) => t.id === id);
    return found ? { ...found } : null;
  },

  async getTransactionByReference(reference: string) {
    const data = getMemoryData();
    const found = data.walletTransactions.find((t) => t.reference === reference);
    return found ? { ...found } : null;
  },

  async updateTransaction(id: string, updates: Partial<WalletTransaction>) {
    const data = getMemoryData();
    const idx = data.walletTransactions.findIndex((t) => t.id === id);
    if (idx >= 0) {
      data.walletTransactions[idx] = { ...data.walletTransactions[idx], ...updates };
      return { ...data.walletTransactions[idx] };
    }
    return null;
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

  // --- Dedicated Deposits Table ---
  async createDeposit(deposit: Deposit) {
    const data = getMemoryData();
    data.deposits.set(deposit.id, { ...deposit });
    return { ...deposit };
  },

  async getDeposit(idOrRef: string) {
    const data = getMemoryData();
    for (const d of data.deposits.values()) {
      if (d.id === idOrRef || d.reference === idOrRef || (d as any).gatewayReference === idOrRef) {
        return { ...d };
      }
    }
    return null;
  },

  async getDepositByReference(reference: string) {
    const data = getMemoryData();
    for (const d of data.deposits.values()) {
      if (d.reference === reference || (d as any).gatewayReference === reference) {
        return { ...d };
      }
    }
    return null;
  },

  async updateDeposit(id: string, updates: Partial<Deposit>) {
    const data = getMemoryData();
    const existing = data.deposits.get(id);
    if (!existing) return null;
    const merged: Deposit = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    data.deposits.set(id, merged);
    return { ...merged };
  },

  async listDeposits(filter?: { userId?: string; status?: string; limit?: number }) {
    const data = getMemoryData();
    let list = Array.from(data.deposits.values());
    if (filter?.userId) {
      list = list.filter((d) => d.userId === filter.userId || (d as any).userToken === filter.userId);
    }
    if (filter?.status) {
      list = list.filter((d) => d.status === filter.status);
    }
    return list
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, filter?.limit ?? 50)
      .map((d) => ({ ...d }));
  },

  async recordDepositAction(action: DepositAction) {
    const data = getMemoryData();
    data.depositActions.push({ ...action });
    return { ...action };
  },

  async listDepositActions(depositId: string) {
    const data = getMemoryData();
    return data.depositActions
      .filter((a) => a.depositId === depositId)
      .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
      .map((a) => ({ ...a }));
  },

  // --- Dedicated Withdrawals Table ---
  async createWithdrawal(withdrawal: Withdrawal) {
    const data = getMemoryData();
    data.withdrawals.set(withdrawal.id, { ...withdrawal });
    return { ...withdrawal };
  },

  async getWithdrawal(idOrRef: string) {
    const data = getMemoryData();
    for (const w of data.withdrawals.values()) {
      if (w.id === idOrRef || (w as any).reference === idOrRef || (w as any).transferReference === idOrRef) {
        return { ...w };
      }
    }
    return null;
  },

  async getWithdrawalByReference(reference: string) {
    const data = getMemoryData();
    for (const w of data.withdrawals.values()) {
      if ((w as any).reference === reference || (w as any).transferReference === reference) {
        return { ...w };
      }
    }
    return null;
  },

  async updateWithdrawal(id: string, updates: Partial<Withdrawal>) {
    const data = getMemoryData();
    const existing = data.withdrawals.get(id);
    if (!existing) return null;
    const merged: Withdrawal = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    data.withdrawals.set(id, merged);
    return { ...merged };
  },

  async listWithdrawals(filter?: { userId?: string; status?: string; limit?: number }) {
    const data = getMemoryData();
    let list = Array.from(data.withdrawals.values());
    if (filter?.userId) {
      list = list.filter((w) => w.userId === filter.userId || (w as any).userToken === filter.userId);
    }
    if (filter?.status) {
      list = list.filter((w) => w.status === filter.status);
    }
    return list
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, filter?.limit ?? 50)
      .map((w) => ({ ...w }));
  },

  async recordWithdrawalAction(action: WithdrawalAction) {
    const data = getMemoryData();
    data.withdrawalActions.push({ ...action });
    return { ...action };
  },

  async listWithdrawalActions(withdrawalId: string) {
    const data = getMemoryData();
    return data.withdrawalActions
      .filter((a) => a.withdrawalId === withdrawalId)
      .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
      .map((a) => ({ ...a }));
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

  async getAllLeagues() {
    return memoryStore.listLeagues();
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
    const parts = Array.from(data.leagueParticipants.values());
    const filtered = leagueId ? parts.filter((p) => p.leagueId === leagueId) : parts;
    return filtered.map((p) => ({ ...p }));
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

  async getAdminLogs(limit = 30) {
    return memoryStore.listAdminLogs(limit);
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

  async listOrganizerApplicationsByUserId(userId) {
    const data = getMemoryData();
    return Array.from(data.organizerApplications.values())
      .filter((a) => a.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((a) => ({ ...a }));
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

  async deleteOrganizerApplication(id) {
    const data = getMemoryData();
    return data.organizerApplications.delete(id);
  },

  async deleteOrganizerProfile(userId) {
    const data = getMemoryData();
    return data.organizerProfiles.delete(userId);
  },

  // --- Organizer Revocations ---
  async createOrganizerRevocation(revocation) {
    const data = getMemoryData();
    data.organizerRevocations.set(revocation.id, { ...revocation });
    return { ...revocation };
  },

  async getOrganizerRevocationByUserId(userId) {
    const data = getMemoryData();
    const list = Array.from(data.organizerRevocations.values())
      .filter((r) => r.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list[0] ? { ...list[0] } : null;
  },

  async listOrganizerRevocations() {
    const data = getMemoryData();
    return Array.from(data.organizerRevocations.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((r) => ({ ...r }));
  },

  // --- Regions ---
  async getRegions() {
    const data = getMemoryData();
    if (data.regions.size === 0) {
      for (const r of DEFAULT_REGIONS) {
        data.regions.set(r.id, { ...r });
      }
    }
    return Array.from(data.regions.values()).map((r) => ({ ...r }));
  },

  async saveRegion(region) {
    const data = getMemoryData();
    data.regions.set(region.id, { ...region });
    return { ...region };
  },

  // --- Matches ---
  async createMatch(match) {
    const data = getMemoryData();
    data.matches.set(match.id, { ...match });
    return { ...match };
  },

  async getMatch(id) {
    const data = getMemoryData();
    const m = data.matches.get(id);
    return m ? { ...m } : null;
  },

  async updateMatch(id, updates) {
    const data = getMemoryData();
    const existing = data.matches.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    data.matches.set(id, updated);
    return { ...updated };
  },

  async listMatches(filter) {
    const data = getMemoryData();
    let list = Array.from(data.matches.values());
    if (filter?.status) list = list.filter((m) => m.status === filter.status);
    if (filter?.gameType) list = list.filter((m) => m.gameType === filter.gameType);
    if (filter?.playerId) {
      list = list.filter((m) => m.playerAId === filter.playerId || m.playerBId === filter.playerId);
    }
    if (filter?.limit) list = list.slice(0, filter.limit);
    return list.map((m) => ({ ...m }));
  },

  // --- Tournaments & Prizes ---
  async createTournament(tournament, prizes) {
    const data = getMemoryData();
    data.tournaments.set(tournament.id, { ...tournament });
    if (prizes && prizes.length > 0) {
      const prizeObjs: TournamentPrize[] = prizes.map((p, idx) => ({
        id: `prize-${tournament.id}-${idx}`,
        tournamentId: tournament.id,
        placement: p.placement,
        amount: String(p.amount),
        percentage: null,
      }));
      data.tournamentPrizes.set(tournament.id, prizeObjs);
    }
    return { ...tournament };
  },

  async getTournament(id) {
    const data = getMemoryData();
    const t = data.tournaments.get(id);
    if (!t) return null;
    const prizes = data.tournamentPrizes.get(id) || [];
    const entries = data.tournamentEntries.get(id) || [];
    return {
      tournament: { ...t },
      prizes: prizes.map((p) => ({ ...p })),
      entries: entries.map((e) => ({ ...e })),
    };
  },

  async listTournaments(filter) {
    const data = getMemoryData();
    let list = Array.from(data.tournaments.values());
    if (filter?.status) list = list.filter((t) => t.status === filter.status);
    if (filter?.organizerId) list = list.filter((t) => t.organizerId === filter.organizerId);
    if (filter?.gameType) list = list.filter((t) => t.gameType === filter.gameType);
    if (filter?.limit) list = list.slice(0, filter.limit);
    return list.map((t) => ({ ...t }));
  },

  async updateTournament(id, updates) {
    const data = getMemoryData();
    const existing = data.tournaments.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    data.tournaments.set(id, updated);
    return { ...updated };
  },

  async createTournamentEntry(entry) {
    const data = getMemoryData();
    const entries = data.tournamentEntries.get(entry.tournamentId) || [];
    entries.push({ ...entry });
    data.tournamentEntries.set(entry.tournamentId, entries);
    return { ...entry };
  },

  async getTournamentEntries(tournamentId) {
    const data = getMemoryData();
    const entries = data.tournamentEntries.get(tournamentId) || [];
    return entries.map((e) => ({ ...e }));
  },

  async updateTournamentEntryPlacement(entryId, placement) {
    const data = getMemoryData();
    for (const [tId, entries] of data.tournamentEntries.entries()) {
      const idx = entries.findIndex((e) => e.id === entryId);
      if (idx !== -1) {
        entries[idx].placement = placement;
        entries[idx].finalPlacement = placement;
        data.tournamentEntries.set(tId, entries);
        return { ...entries[idx] };
      }
    }
    return null;
  },

  async getTournamentPrizes(tournamentId) {
    const data = getMemoryData();
    const prizes = data.tournamentPrizes.get(tournamentId) || [];
    return prizes.map((p) => ({ ...p }));
  },

  // --- Game Type Limits ---
  async getGameTypeLimit(gameType) {
    const data = getMemoryData();
    const l = data.gameTypeLimits.get(gameType);
    return l ? { ...l } : null;
  },

  async getGameTypeLimits() {
    const data = getMemoryData();
    return Array.from(data.gameTypeLimits.values()).map((l) => ({ ...l }));
  },

  async saveGameTypeLimit(limit) {
    const data = getMemoryData();
    data.gameTypeLimits.set(limit.gameType, { ...limit });
    return { ...limit };
  },

  // --- Double-Entry Ledger ---
  async writeLedger(entries) {
    const data = getMemoryData();
    const created: LedgerEntry[] = [];
    const transactionGroupId = `tx-group-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    for (const item of entries) {
      const userEntries = data.ledgerEntries.filter(
        (e) => e.userId === item.userId && e.accountType === item.accountType
      );
      const lastEntry = userEntries[userEntries.length - 1];
      let previousBalance = 0;
      if (lastEntry) {
        previousBalance = Number(lastEntry.balanceAfter || 0);
      } else if (item.accountType === "available" && item.userId !== "platform-treasury" && item.userId !== "system-house") {
        const prof = data.profiles.get(item.userId);
        if (prof) {
          const currentPoints = Math.max(Number(prof.points ?? 0), Number(prof.marbles ?? 0));
          if (Number(item.amount) < 0) {
            previousBalance = Math.max(0, currentPoints - Number(item.amount));
          } else {
            previousBalance = currentPoints;
          }
        }
      }

      const rawNewBalance = previousBalance + Number(item.amount);
      const newBalance = (item.accountType === "available" && item.userId !== "platform-treasury" && item.userId !== "system-house")
        ? Math.max(0, rawNewBalance)
        : rawNewBalance;

      const entry: LedgerEntry = {
        id: `ledger-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: item.userId,
        accountType: item.accountType,
        entryType: item.entryType || "deposit",
        currency: item.currency || "GHS",
        amount: String(item.amount),
        direction: Number(item.amount) >= 0 ? "credit" : "debit",
        balanceBefore: previousBalance.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        referenceType: item.referenceType,
        referenceId: item.referenceId,
        transactionGroupId,
        metadataJson: item.metadataJson || "{}",
        recordedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      data.ledgerEntries.push(entry);
      created.push(entry);
    }
    return created;
  },

  async getLedgerBalance(userId, accountType) {
    const data = getMemoryData();
    let balance = 0;
    for (const e of data.ledgerEntries) {
      if (e.userId === userId && e.accountType === accountType) {
        const amt = parseFloat(String(e.amount)) || 0;
        if (e.direction === "credit") balance += amt;
        else if (e.direction === "debit") balance -= amt;
      }
    }
    return balance;
  },

  async getLedgerEntries(filter) {
    const data = getMemoryData();
    let list = [...data.ledgerEntries];
    if (filter?.userId) list = list.filter((e) => e.userId === filter.userId);
    if (filter?.referenceType) list = list.filter((e) => e.referenceType === filter.referenceType);
    if (filter?.referenceId) list = list.filter((e) => e.referenceId === filter.referenceId);
    if (filter?.limit) list = list.slice(-filter.limit);
    return list.map((e) => ({ ...e }));
  },

  async getSystemFundsSummary(): Promise<SystemFundsReport> {
    const data = getMemoryData();
    const allEntries = [...data.ledgerEntries].reverse();
    const allProfiles = Array.from(data.profiles.values());
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

    let mechanicsInflow = 0;
    let mechanicsOutflow = 0;
    let mechanicsCount = 0;
    let mechanicsProfits = 0;
    let mechanicsLosses = 0;

    let totalDeposits = 0;
    let totalWithdrawals = 0;

    const latestBalances = new Map<string, number>();

    for (const entry of allEntries) {
      const key = `${entry.userId}:${entry.accountType}`;
      if (!latestBalances.has(key)) {
        latestBalances.set(key, Number(entry.balanceAfter || 0));
      }

      const amt = Number(entry.amount || 0);
      const fund = determineFundType(
        entry.userId,
        entry.accountType as any,
        (entry as any).entryType,
        entry.referenceType,
        entry.referenceId
      );

      if ((entry as any).entryType === "deposit" && amt > 0) totalDeposits += amt;
      else if ((entry as any).entryType === "withdrawal" && amt < 0) totalWithdrawals += Math.abs(amt);

      if (fund === "platform_fee") {
        platformFeeCount++;
        if (amt >= 0) platformFeeInflow += amt;
        else platformFeeOutflow += Math.abs(amt);
      } else if (fund === "mechanics_fund") {
        mechanicsCount++;
        if (amt >= 0) {
          mechanicsInflow += amt;
          if ((entry as any).entryType === "wager_payout" || (entry as any).entryType === "mechanics_profit") {
            mechanicsProfits += amt;
          }
        } else {
          mechanicsOutflow += Math.abs(amt);
          if ((entry as any).entryType === "wager_payout" || (entry as any).entryType === "mechanics_loss") {
            mechanicsLosses += Math.abs(amt);
          }
        }
      } else if (fund === "escrow") {
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
    let mechanicsFundTotal = 0;
    let activeUsersCount = 0;
    let activeBotsCount = 0;

    for (const [key, bal] of latestBalances.entries()) {
      const [userId, accType] = key.split(":");
      const isBot = isMechanicOrBotUser(userId);

      if (userId === PLATFORM_ACCOUNT_ID || userId === "platform" || userId === "system-house" || userId === "system") {
        platformFeeFundTotal += bal;
      } else if (userId === MECHANICS_FUND_ACCOUNT_ID) {
        mechanicsFundTotal += bal;
      } else if (accType === "escrow") {
        escrowFundTotal += bal;
      } else if (accType === "available") {
        if (isBot) {
          mechanicsFundTotal += bal;
          if (bal > 0) activeBotsCount++;
        } else {
          accountBalancesFundTotal += bal;
          if (bal > 0) activeUsersCount++;
        }
      }
    }

    if (latestBalances.size === 0 && totalProfilesPoints > 0) {
      accountBalancesFundTotal = totalProfilesPoints;
      activeUsersCount = allProfiles.filter((p) => p.points > 0 && !isMechanicOrBotUser(p.id)).length;
    }

    const totalPlatformAssets = Number(
      (accountBalancesFundTotal + escrowFundTotal + platformFeeFundTotal + mechanicsFundTotal).toFixed(2)
    );
    const expectedAssets = Number((totalDeposits - totalWithdrawals).toFixed(2));
    const discrepancyAmount = Math.abs(
      Number((totalPlatformAssets - (totalDeposits > 0 ? expectedAssets : totalPlatformAssets)).toFixed(2))
    );
    const isBalanced = discrepancyAmount < 0.01;

    const now = new Date().toISOString();

    const accountBalancesSummary: SystemFundSummary = {
      fundType: "account_balances",
      name: "Account Balances Fund",
      description: "Total liquid funds available across registered human player wallets for gameplay, tournaments, and withdrawals.",
      balance: Number(accountBalancesFundTotal.toFixed(2)),
      entryCount: accBalanceCount,
      totalInflow: Number(accBalanceInflow.toFixed(2)),
      totalOutflow: Number(accBalanceOutflow.toFixed(2)),
      netFlow: Number((accBalanceInflow - accBalanceOutflow).toFixed(2)),
      activeHoldersCount: activeUsersCount,
      lastActivityAt: allEntries[0]?.recordedAt ? new Date(allEntries[0].recordedAt).toISOString() : now,
    };

    const escrowEntry = allEntries.find((e) => e.accountType === "escrow");
    const escrowActivityDate = escrowEntry?.recordedAt || escrowEntry?.createdAt;
    const escrowSummary: SystemFundSummary = {
      fundType: "escrow",
      name: "Escrow Fund",
      description: "Total funds actively locked in trust for ongoing wager matches, tournament prize pools, and participant entry fees.",
      balance: Number(escrowFundTotal.toFixed(2)),
      entryCount: escrowCount,
      totalInflow: Number(escrowInflow.toFixed(2)),
      totalOutflow: Number(escrowOutflow.toFixed(2)),
      netFlow: Number((escrowInflow - escrowOutflow).toFixed(2)),
      lastActivityAt: escrowActivityDate ? new Date(escrowActivityDate).toISOString() : now,
    };

    const feeEntry = allEntries.find((e) => e.userId === PLATFORM_ACCOUNT_ID || (e as any).entryType === "platform_fee");
    const feeActivityDate = feeEntry?.recordedAt || feeEntry?.createdAt;
    const platformFeeSummary: SystemFundSummary = {
      fundType: "platform_fee",
      name: "Platform Fee Fund",
      description: "Accumulated platform commissions (5% match fees, 10% tournament fees, and cancellation surcharges) retained as platform revenue.",
      balance: Number(platformFeeFundTotal.toFixed(2)),
      entryCount: platformFeeCount,
      totalInflow: Number(platformFeeInflow.toFixed(2)),
      totalOutflow: Number(platformFeeOutflow.toFixed(2)),
      netFlow: Number((platformFeeInflow - platformFeeOutflow).toFixed(2)),
      lastActivityAt: feeActivityDate ? new Date(feeActivityDate).toISOString() : now,
    };

    const mechanicsSummary: SystemFundSummary = {
      fundType: "mechanics_fund",
      name: "Mechanics Fund",
      description: "Dedicated capital bankrolls, operating floats, gameplay profits, and player payout losses for the AI mechanics fleet.",
      balance: Number(mechanicsFundTotal.toFixed(2)),
      entryCount: mechanicsCount,
      totalInflow: Number(mechanicsInflow.toFixed(2)),
      totalOutflow: Number(mechanicsOutflow.toFixed(2)),
      netFlow: Number((mechanicsInflow - mechanicsOutflow).toFixed(2)),
      activeHoldersCount: activeBotsCount,
      lastActivityAt: allEntries.find(
        (e) => isMechanicOrBotUser(e.userId, e.referenceType) || e.userId === MECHANICS_FUND_ACCOUNT_ID
      )?.recordedAt
        ? new Date(
            allEntries.find(
              (e) => isMechanicOrBotUser(e.userId, e.referenceType) || e.userId === MECHANICS_FUND_ACCOUNT_ID
            )!.recordedAt
          ).toISOString()
        : now,
    };

    const totalMechanicsNetPnL = Number((mechanicsProfits - mechanicsLosses).toFixed(2));

    return {
      accountBalancesFund: accountBalancesSummary,
      escrowFund: escrowSummary,
      platformFeeFund: platformFeeSummary,
      mechanicsFund: mechanicsSummary,
      totalPlatformAssets,
      totalUserAvailable: Number(accountBalancesFundTotal.toFixed(2)),
      totalEscrowLocked: Number(escrowFundTotal.toFixed(2)),
      totalPlatformFeesEarned: Number(platformFeeFundTotal.toFixed(2)),
      totalMechanicsCapital: Number(mechanicsFundTotal.toFixed(2)),
      totalMechanicsProfits: Number(mechanicsProfits.toFixed(2)),
      totalMechanicsLosses: Number(mechanicsLosses.toFixed(2)),
      totalMechanicsNetPnL,
      totalDeposits: Number(totalDeposits.toFixed(2)),
      totalWithdrawals: Number(totalWithdrawals.toFixed(2)),
      reconciliationStatus: isBalanced ? "balanced" : "discrepancy",
      discrepancyAmount,
      generatedAt: now,
    };
  },

  async getChartOfAccountsReport(): Promise<ChartOfAccountsReport> {
    const data = getMemoryData();
    const allEntries = [...data.ledgerEntries].reverse();
    const fundsReport = await memoryStore.getSystemFundsSummary();

    const accountStats = new Map<string, { totalDebits: number; totalCredits: number; entryCount: number; lastActivityAt?: string }>();
    for (const account of CANONICAL_CHART_OF_ACCOUNTS) {
      accountStats.set(account.code, {
        totalDebits: 0,
        totalCredits: 0,
        entryCount: 0,
        lastActivityAt: undefined,
      });
    }

    for (const entry of allEntries) {
      const { code } = mapLedgerEntryToAccount({
        userId: entry.userId,
        accountType: entry.accountType,
        entryType: entry.entryType,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
      });

      const stats = accountStats.get(code) || {
        totalDebits: 0,
        totalCredits: 0,
        entryCount: 0,
        lastActivityAt: undefined,
      };

      const amt = Number(entry.amount || 0);
      stats.entryCount += 1;
      if (amt >= 0) {
        stats.totalCredits += amt;
      } else {
        stats.totalDebits += Math.abs(amt);
      }

      if (!stats.lastActivityAt && entry.createdAt) {
        stats.lastActivityAt = new Date(entry.createdAt).toISOString();
      }

      accountStats.set(code, stats);
    }

    // Compute actual match vs tournament escrow balances from latest entry snapshot
    let matchEscrowBalance = 0;
    let tournamentEscrowBalance = 0;

    for (const entry of allEntries) {
      if (entry.accountType === "escrow") {
        const isTourn =
          entry.referenceType === "league" ||
          entry.referenceType === "tournament" ||
          entry.referenceId?.startsWith("league-") ||
          entry.entryType.includes("prize") ||
          entry.entryType.includes("entry_fee");
        const amt = Number(entry.amount || 0);
        if (isTourn) {
          tournamentEscrowBalance += amt;
        } else {
          matchEscrowBalance += amt;
        }
      }
    }

    matchEscrowBalance = Math.max(0, Number(matchEscrowBalance.toFixed(2)));
    tournamentEscrowBalance = Math.max(0, Number(tournamentEscrowBalance.toFixed(2)));
    if (matchEscrowBalance + tournamentEscrowBalance === 0 && fundsReport.totalEscrowLocked > 0) {
      matchEscrowBalance = fundsReport.totalEscrowLocked;
    }

    const accounts: ChartOfAccount[] = CANONICAL_CHART_OF_ACCOUNTS.map((canonical) => {
      const stats = accountStats.get(canonical.code) || {
        totalDebits: 0,
        totalCredits: 0,
        entryCount: 0,
        lastActivityAt: undefined,
      };

      let liveBalance = 0;
      if (canonical.code === "1010") {
        liveBalance = fundsReport.totalDeposits - fundsReport.totalWithdrawals;
      } else if (canonical.code === "1020" || canonical.code === "2010") {
        liveBalance = fundsReport.totalUserAvailable;
      } else if (canonical.code === "1030") {
        liveBalance = fundsReport.totalEscrowLocked;
      } else if (canonical.code === "1040" || canonical.code === "2040") {
        liveBalance = fundsReport.totalMechanicsCapital;
      } else if (canonical.code === "1045") {
        liveBalance = Math.max(0, stats.totalDebits - stats.totalCredits);
      } else if (canonical.code === "2020") {
        liveBalance = matchEscrowBalance;
      } else if (canonical.code === "2030") {
        liveBalance = tournamentEscrowBalance;
      } else if (canonical.code === "3010") {
        liveBalance = fundsReport.totalPlatformFeesEarned;
      } else if (canonical.code === "3020") {
        liveBalance = Math.max(0, stats.totalCredits - stats.totalDebits);
      } else if (canonical.code === "3030") {
        liveBalance = Math.max(0, fundsReport.totalMechanicsNetPnL);
      } else if (canonical.code === "4010") {
        liveBalance = Math.max(0, stats.totalCredits - stats.totalDebits);
        if (liveBalance === 0 && fundsReport.platformFeeFund.totalInflow > 0 && stats.entryCount === 0) {
          liveBalance = fundsReport.platformFeeFund.totalInflow;
        }
      } else if (canonical.code === "4020") {
        liveBalance = Math.max(0, stats.totalCredits - stats.totalDebits);
      } else if (canonical.code === "4030") {
        liveBalance = Math.max(0, stats.totalCredits - stats.totalDebits);
      } else if (canonical.code === "4040") {
        liveBalance = fundsReport.totalMechanicsProfits || Math.max(0, stats.totalCredits - stats.totalDebits);
      } else if (canonical.code === "5010") {
        liveBalance = Math.max(0, stats.totalDebits - stats.totalCredits);
      } else if (canonical.code === "5020") {
        liveBalance = Math.max(0, stats.totalDebits - stats.totalCredits);
      } else if (canonical.code === "5030") {
        liveBalance = fundsReport.totalMechanicsLosses || Math.max(0, stats.totalDebits - stats.totalCredits);
      } else if (canonical.code === "5040") {
        liveBalance = Math.max(0, stats.totalDebits - stats.totalCredits);
      } else {
        liveBalance =
          canonical.normalBalance === "debit"
            ? stats.totalDebits - stats.totalCredits
            : stats.totalCredits - stats.totalDebits;
      }

      return {
        code: canonical.code,
        name: canonical.name,
        accountClass: canonical.accountClass,
        fundType: canonical.fundType,
        normalBalance: canonical.normalBalance,
        description: canonical.description,
        balance: Number(Math.max(0, liveBalance).toFixed(2)),
        totalDebits: Number(stats.totalDebits.toFixed(2)),
        totalCredits: Number(stats.totalCredits.toFixed(2)),
        entryCount: stats.entryCount,
        lastActivityAt: stats.lastActivityAt || fundsReport.generatedAt,
      };
    });

    const totalAssets = Number(
      accounts
        .filter((a) => a.accountClass === "asset")
        .reduce((sum, a) => sum + a.balance, 0)
        .toFixed(2)
    );

    const totalLiabilities = Number(
      accounts
        .filter((a) => a.accountClass === "liability")
        .reduce((sum, a) => sum + a.balance, 0)
        .toFixed(2)
    );

    const totalEquity = Number(
      accounts
        .filter((a) => a.accountClass === "equity")
        .reduce((sum, a) => sum + a.balance, 0)
        .toFixed(2)
    );

    const totalRevenue = Number(
      accounts
        .filter((a) => a.accountClass === "revenue")
        .reduce((sum, a) => sum + a.balance, 0)
        .toFixed(2)
    );

    const totalExpenses = Number(
      accounts
        .filter((a) => a.accountClass === "expense")
        .reduce((sum, a) => sum + a.balance, 0)
        .toFixed(2)
    );

    const netIncome = Number((totalRevenue - totalExpenses).toFixed(2));
    const discrepancyAmount = Math.abs(Number((totalAssets - (totalLiabilities + totalEquity)).toFixed(2)));
    const isBalanced = discrepancyAmount < 1.0;

    return {
      accounts,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalRevenue,
      totalExpenses,
      netIncome,
      accountingEquationBalanced: isBalanced,
      discrepancyAmount,
      generatedAt: new Date().toISOString(),
    };
  },

  async getTreasuryFundDetails(): Promise<TreasuryFundDetails> {
    const data = getMemoryData();
    const fundsReport = await memoryStore.getSystemFundsSummary();
    const coaReport = await memoryStore.getChartOfAccountsReport();

    const allEntries = [...data.ledgerEntries].reverse();
    const treasuryEntries = allEntries
      .filter((e) => e.userId === PLATFORM_ACCOUNT_ID || e.entryType === "platform_fee")
      .slice(0, 50)
      .map((e) => {
        const { code, name, fundType } = mapLedgerEntryToAccount(e);
        return {
          ...e,
          accountCode: code,
          accountName: name,
          fundType,
        };
      });

    const rake1v1 = coaReport.accounts.find((a) => a.code === "4010")?.balance || 0;
    const tournamentComm = coaReport.accounts.find((a) => a.code === "4020")?.balance || 0;
    const penalty = coaReport.accounts.find((a) => a.code === "4030")?.balance || 0;
    const gatewayFee = coaReport.accounts.find((a) => a.code === "5010")?.balance || 0;
    const promo = coaReport.accounts.find((a) => a.code === "5020")?.balance || 0;
    const reserve = coaReport.accounts.find((a) => a.code === "3020")?.balance || 0;

    return {
      treasuryBalance: fundsReport.totalPlatformFeesEarned,
      lifetimeRevenue: fundsReport.platformFeeFund.totalInflow,
      lifetimeExpenses: fundsReport.platformFeeFund.totalOutflow,
      netTreasuryFlow: fundsReport.platformFeeFund.netFlow,
      rake1v1Revenue: rake1v1,
      tournamentCommissionRevenue: tournamentComm,
      penaltyRevenue: penalty,
      gatewayExpenses: gatewayFee,
      promotionalExpenses: promo,
      disputeReserveBalance: reserve,
      recentTreasuryEntries: treasuryEntries as any,
      lastUpdated: new Date().toISOString(),
    };
  },

  async getMechanicsFundDetails(): Promise<MechanicsFundDetails> {
    const data = getMemoryData();
    const fundsReport = await memoryStore.getSystemFundsSummary();
    const coaReport = await memoryStore.getChartOfAccountsReport();

    const allEntries = [...data.ledgerEntries].reverse();
    const mechanicsEntries = allEntries
      .filter((e) => {
        const fund = determineFundType(
          e.userId,
          e.accountType as any,
          e.entryType,
          e.referenceType,
          e.referenceId
        );
        return fund === "mechanics_fund" || isMechanicOrBotUser(e.userId, e.referenceType);
      })
      .slice(0, 50)
      .map((e) => {
        const { code, name, fundType } = mapLedgerEntryToAccount(e);
        return {
          ...e,
          accountCode: code,
          accountName: name,
          fundType,
        };
      });

    const profits = coaReport.accounts.find((a) => a.code === "4040")?.balance || fundsReport.totalMechanicsProfits || 0;
    const losses = coaReport.accounts.find((a) => a.code === "5030")?.balance || fundsReport.totalMechanicsLosses || 0;
    const operatingFloat = coaReport.accounts.find((a) => a.code === "1040")?.balance || fundsReport.mechanicsFund.balance || 0;
    const reserveVault = coaReport.accounts.find((a) => a.code === "1045")?.balance || 0;

    return {
      mechanicsFundBalance: fundsReport.mechanicsFund.balance,
      totalOperatingFloat: operatingFloat,
      totalReserveVault: reserveVault,
      lifetimeFunded: fundsReport.mechanicsFund.totalInflow,
      lifetimeWithdrawn: fundsReport.mechanicsFund.totalOutflow,
      netMechanicsCapital: fundsReport.mechanicsFund.netFlow,
      mechanicsGameplayProfits: profits,
      mechanicsGameplayLosses: losses,
      netGameplayPnL: Number((profits - losses).toFixed(2)),
      activeBotsCount: fundsReport.mechanicsFund.activeHoldersCount || 0,
      recentMechanicsEntries: mechanicsEntries as any,
      lastUpdated: new Date().toISOString(),
    };
  },

  // --- Roles & RBAC ---
  async listRoles() {
    const data = getMemoryData();
    if (data.roles.size === 0) {
      for (const r of SEED_ROLES_CONFIG) {
        const roleObj: AppRole = {
          id: `role-${r.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          name: r.name,
          description: r.description,
          isSystemRole: r.isSystemRole,
          permissionKeys: r.permissionKeys,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        data.roles.set(roleObj.id, roleObj);
        data.rolePermissions.set(roleObj.id, new Set(r.permissionKeys));
      }
    }
    return Array.from(data.roles.values()).map((r) => {
      const perms = data.rolePermissions.get(r.id);
      return {
        ...r,
        permissionKeys: perms ? Array.from(perms) : r.permissionKeys || [],
      };
    });
  },

  async getRole(id) {
    const roles = await memoryStore.listRoles();
    return roles.find((r) => r.id === id || r.name.toLowerCase() === id.toLowerCase());
  },

  async createRole(role, permissionKeys) {
    const data = getMemoryData();
    await memoryStore.listRoles(); // ensure seeded
    const newRole: AppRole = {
      ...role,
      id: role.id || `role-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      permissionKeys,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.roles.set(newRole.id, newRole);
    data.rolePermissions.set(newRole.id, new Set(permissionKeys));
    return { ...newRole };
  },

  async updateRole(id, updates, permissionKeys) {
    const data = getMemoryData();
    await memoryStore.listRoles();
    const existing = data.roles.get(id);
    if (!existing) throw new Error("Role not found");
    const updated: AppRole = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (permissionKeys !== undefined) {
      updated.permissionKeys = permissionKeys;
      data.rolePermissions.set(id, new Set(permissionKeys));
    }
    data.roles.set(id, updated);
    return { ...updated };
  },

  async deleteRole(id) {
    const data = getMemoryData();
    data.roles.delete(id);
    data.rolePermissions.delete(id);
  },

  async listPermissions() {
    const data = getMemoryData();
    SYSTEM_PERMISSIONS.forEach((p, idx) => {
      const existing = data.permissions.get(p.key);
      const perm: Permission = {
        id: existing?.id || `perm-${idx + 1}`,
        key: p.key,
        category: p.category,
        description: p.description,
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      data.permissions.set(perm.key, perm);
    });
    return Array.from(data.permissions.values()).map((p) => ({ ...p }));
  },

  async getAdminUserRoleAssignments(userId) {
    const data = getMemoryData();
    const roles = data.userRoles.get(userId);
    return roles ? Array.from(roles) : [];
  },

  async setAdminUserRoleAssignments(userId, roleIds) {
    const data = getMemoryData();
    data.userRoles.set(userId, new Set(roleIds));
  },

  async listAdminAccounts() {
    const profiles = await memoryStore.getAllProfiles();
    const admins = profiles.filter((p) => p.role === "admin" || p.role === "super_admin");
    const result: AdminAccount[] = [];
    for (const a of admins) {
      const roleIds = await memoryStore.getAdminUserRoleAssignments(a.token);
      const allRoles = await memoryStore.listRoles();
      const userRoles = allRoles.filter((r) => roleIds.includes(r.id));
      result.push({
        id: a.token,
        userId: a.token,
        username: a.username,
        phoneNumber: a.phoneNumber || "",
        role: a.role || "admin",
        status: a.status || "active",
        createdAt: a.createdAt || new Date().toISOString(),
        updatedAt: a.updatedAt || new Date().toISOString(),
        roles: userRoles,
        isSuperAdmin: a.role === "super_admin" || userRoles.some((r) => r.isSystemRole),
      });
    }
    return result;
  },

  // --- Games Catalog ---
  async listGames() {
    const data = getMemoryData();
    if (data.games.size === 0) {
      const defaultGames: GameCatalogItem[] = [
        {
          id: "game-damii-10x10",
          name: "10x10 Damii",
          slug: "damii-10x10",
          boardSize: 10,
          description: "Traditional Draughts with flying kings and compulsory multi-hop captures.",
          status: "enabled",
          minTimerSeconds: 30,
          maxTimerSeconds: 180,
          defaultTimerSeconds: 60,
          wagerAllowed: true,
          rulesJson: JSON.stringify({ flyingKings: true, multiJumpCompulsory: true }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "game-damii-8x8",
          name: "8x8 Blitz Draughts",
          slug: "damii-8x8",
          boardSize: 8,
          description: "Fast-paced compact 8x8 draughts format for quick blitz matches.",
          status: "enabled",
          minTimerSeconds: 15,
          maxTimerSeconds: 90,
          defaultTimerSeconds: 45,
          wagerAllowed: true,
          rulesJson: JSON.stringify({ flyingKings: true }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      for (const g of defaultGames) {
        data.games.set(g.id, { ...g });
      }
    }
    return Array.from(data.games.values()).map((g) => ({ ...g }));
  },

  async getGame(slugOrId) {
    const games = await memoryStore.listGames();
    return games.find((g) => g.id === slugOrId || g.slug === slugOrId);
  },

  async saveGame(game) {
    const data = getMemoryData();
    await memoryStore.listGames();
    data.games.set(game.id, { ...game, updatedAt: new Date().toISOString() });
    return { ...game };
  },

  async toggleGameStatus(id, status) {
    const data = getMemoryData();
    await memoryStore.listGames();
    const existing = data.games.get(id);
    if (!existing) throw new Error("Game not found");
    const updated = { ...existing, status, updatedAt: new Date().toISOString() };
    data.games.set(id, updated);
    return { ...updated };
  },

  async deleteGame(id) {
    const data = getMemoryData();
    await memoryStore.listGames();
    const deleted = data.games.delete(id);
    return deleted;
  },

  // --- Tournament Action Requests Queue ---
  async listTournamentActionRequests(status) {
    const data = getMemoryData();
    let list = Array.from(data.tournamentActionRequests.values());
    if (status) list = list.filter((r) => r.status === status);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createTournamentActionRequest(req) {
    const data = getMemoryData();
    data.tournamentActionRequests.set(req.id, { ...req });
    return { ...req };
  },

  async reviewTournamentActionRequest(id, status, adminId, reviewNote) {
    const data = getMemoryData();
    const existing = data.tournamentActionRequests.get(id);
    if (!existing) throw new Error("Request not found");
    const updated: TournamentActionRequest = {
      ...existing,
      status,
      reviewedByAdminId: adminId,
      reviewedAt: new Date().toISOString(),
      reviewNote: reviewNote || existing.reviewNote,
      updatedAt: new Date().toISOString(),
    };
    data.tournamentActionRequests.set(id, updated);
    return { ...updated };
  },

  async deleteTournamentActionRequest(id) {
    const data = getMemoryData();
    const deleted = data.tournamentActionRequests.delete(id);
    return deleted;
  },

  // --- System Settings ---
  async getSystemSettings(category) {
    const data = getMemoryData();
    let list = Array.from(data.systemSettings.values());
    if (category) list = list.filter((s) => s.category === category);
    return list.map((s) => ({ ...s }));
  },

  async saveSystemSetting(category, key, value, adminId) {
    const data = getMemoryData();
    const id = `setting-${category}-${key}`;
    const entry: SystemSettingEntry = {
      id,
      category,
      key,
      value,
      valueJson: JSON.stringify(value),
      updatedByAdminId: adminId,
      updatedAt: new Date().toISOString(),
    };
    data.systemSettings.set(id, entry);
    return { ...entry };
  },

  async deleteSystemSetting(category, key) {
    const data = getMemoryData();
    const id = `setting-${category}-${key}`;
    const deleted = data.systemSettings.delete(id);
    return deleted;
  },

  async purgeAuditLogs(olderThanDays = 90) {
    const data = getMemoryData();
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).getTime();
    const initialLen = data.adminLogs.length;
    data.adminLogs = data.adminLogs.filter((log) => new Date(log.createdAt).getTime() >= cutoff);
    return initialLen - data.adminLogs.length;
  },

  // --- Seeder ---
  async seedDatabase() {
    const data = getMemoryData();

    // Completely clear all runtime maps & arrays
    data.sessions.clear();
    data.profiles.clear();
    data.users.clear();
    data.otpRequests.clear();
    data.organizerApplications.clear();
    data.organizerRevocations.clear();
    data.adminProfiles.clear();
    data.organizerProfiles.clear();
    data.paystackEvents.clear();
    data.rooms.clear();
    data.walletTransactions = [];
    data.deposits.clear();
    data.depositActions = [];
    data.withdrawals.clear();
    data.withdrawalActions = [];
    data.escrows.clear();
    data.leagues.clear();
    data.leagueParticipants.clear();
    data.leagueMatches.clear();
    data.adminLogs = [];
    data.matches.clear();
    data.tournaments.clear();
    data.tournamentPrizes.clear();
    data.tournamentEntries.clear();
    data.ledgerEntries = [];
    data.tournamentActionRequests.clear();
    data.systemSettings.clear();
    data.userRoles.clear();

    const seed = buildSeedDataset();
    for (const p of seed.profiles) {
      data.profiles.set(p.token, { ...p });
    }
    for (const a of seed.adminProfiles) {
      data.adminProfiles.set(a.userId, { ...a });
    }
    for (const r of seed.regions) {
      data.regions.set(r.id, { ...r });
    }
    for (const g of seed.gameTypeLimits) {
      data.gameTypeLimits.set(g.id, { ...g });
    }
    data.adminSettings = { ...seed.adminSettings };

    // Assign Super Admin role to the admin profile
    const superAdminRoleId = "role-super-admin";
    data.userRoles.set("admin-token-001", new Set([superAdminRoleId]));

    data.initialized = true;

    return memoryStore.getAllProfiles();
  },
};
