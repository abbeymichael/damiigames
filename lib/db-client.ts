import type { DbRepository } from "./db/repository";
import { mysqlStore } from "./db/mysql-store";
import { memoryStore } from "./db/memory-store";

/**
 * DAMII data-access entrypoint.
 *
 * Connects to MySQL when available and configured. If MySQL is not reachable
 * (e.g. in environments or containers without a local mysqld daemon), it
 * gracefully falls back to the in-memory store so the app remains fully
 * functional and never crashes on startup.
 */

let activeStore: DbRepository = memoryStore;
let initPromise: Promise<DbRepository> | null = null;
let lastAttemptTime = 0;

async function boot(): Promise<DbRepository> {
  if (activeStore === mysqlStore) {
    return mysqlStore;
  }
  const now = Date.now();
  if (!initPromise || (activeStore === memoryStore && now - lastAttemptTime > 3000)) {
    lastAttemptTime = now;
    initPromise = (async () => {
      try {
        if (mysqlStore.init) await mysqlStore.init();
        activeStore = mysqlStore;
        console.log("[damii][db] Connected to MySQL database store.");
        return mysqlStore;
      } catch (err) {
        console.warn(
          `[damii][db] MySQL not available (${err instanceof Error ? err.message : String(err)}). Using fallback store.`,
        );
        if (memoryStore.init) await memoryStore.init();
        activeStore = memoryStore;
        return memoryStore;
      }
    })();
  }
  return initPromise;
}

// Kick off the connection probe immediately at module load
boot();

function withStore<T extends keyof DbRepository>(method: T) {
  return (async (...args: unknown[]) => {
    const store = await boot();
    return (store[method] as any)(...args);
  }) as DbRepository[T] extends (...a: infer A) => infer R ? (...a: A) => R : never;
}

export const dbRepository: DbRepository = {
  get dialect() {
    return activeStore.dialect;
  },
  lockKey: (key, fn) => activeStore.lockKey(key, fn),
  init: () => booted.then(() => undefined),
  close: () => (activeStore.close ? activeStore.close() : Promise.resolve()),

  createSession: withStore("createSession"),
  getSession: withStore("getSession"),
  rotateSession: withStore("rotateSession"),
  deleteSession: withStore("deleteSession"),
  deleteUserSessions: withStore("deleteUserSessions"),
  revokeAllUserSessions: withStore("revokeAllUserSessions"),
  purgeExpiredSessions: withStore("purgeExpiredSessions"),

  saveProfile: withStore("saveProfile"),
  deleteProfile: withStore("deleteProfile"),
  getProfile: withStore("getProfile"),
  getAllProfiles: withStore("getAllProfiles"),
  findProfileByUsername: withStore("findProfileByUsername"),
  findProfileByPhone: withStore("findProfileByPhone"),
  createRegisteredProfile: withStore("createRegisteredProfile"),
  updateUserProfile: withStore("updateUserProfile"),
  upsertProfile: withStore("upsertProfile"),
  banUser: withStore("banUser"),
  unbanUser: withStore("unbanUser"),
  adjustUserPoints: withStore("adjustUserPoints"),
  updateProfileBalance: withStore("updateProfileBalance"),
  updateProfileMarblesBalance: withStore("updateProfileMarblesBalance"),
  updateProfileStats: withStore("updateProfileStats"),
  getLeaderboard: withStore("getLeaderboard"),

  getAdminSettings: withStore("getAdminSettings"),
  updateAdminSettings: withStore("updateAdminSettings"),

  markPaystackRefProcessed: withStore("markPaystackRefProcessed"),
  isPaystackRefProcessed: withStore("isPaystackRefProcessed"),

  getRoom: withStore("getRoom"),
  saveRoom: withStore("saveRoom"),
  listRooms: withStore("listRooms"),
  getAllRooms: withStore("listRooms"),

  createTransaction: withStore("createTransaction"),
  getTransaction: withStore("getTransaction"),
  updateTransaction: withStore("updateTransaction"),
  getUserTransactions: withStore("getUserTransactions"),
  getAllTransactions: withStore("getAllTransactions"),

  createEscrow: withStore("createEscrow"),
  getEscrow: withStore("getEscrow"),
  saveEscrow: withStore("saveEscrow"),

  listLeagues: withStore("listLeagues"),
  getAllLeagues: withStore("listLeagues"),
  getLeague: withStore("getLeague"),
  saveLeague: withStore("saveLeague"),
  deleteLeague: withStore("deleteLeague"),
  getLeagueParticipants: withStore("getLeagueParticipants"),
  addLeagueParticipant: withStore("addLeagueParticipant"),
  updateParticipantStatus: withStore("updateParticipantStatus"),
  getLeagueMatches: withStore("getLeagueMatches"),
  saveLeagueMatch: withStore("saveLeagueMatch"),
  setLeagueMatches: withStore("setLeagueMatches"),

  createAdminLog: withStore("createAdminLog"),
  listAdminLogs: withStore("listAdminLogs"),
  getAdminLogs: withStore("listAdminLogs"),

  getOrganizerProfile: withStore("getOrganizerProfile"),
  saveOrganizerProfile: withStore("saveOrganizerProfile"),
  listOrganizerProfiles: withStore("listOrganizerProfiles"),

  getAdminProfile: withStore("getAdminProfile"),
  saveAdminProfile: withStore("saveAdminProfile"),
  listAdminProfiles: withStore("listAdminProfiles"),

  // Users & Profile Completion
  getUserById: withStore("getUserById"),
  getUserByPhone: withStore("getUserByPhone"),
  getUserByUsername: withStore("getUserByUsername"),
  saveUser: withStore("saveUser"),
  updateUser: withStore("updateUser"),

  // OTP Requests
  createOtpRequest: withStore("createOtpRequest"),
  getOtpRequest: withStore("getOtpRequest"),
  consumeOtpRequest: withStore("consumeOtpRequest"),
  getRecentOtpRequestsByPhone: withStore("getRecentOtpRequestsByPhone"),
  getRecentOtpRequestsByIp: withStore("getRecentOtpRequestsByIp"),

  // Organizer Applications
  createOrganizerApplication: withStore("createOrganizerApplication"),
  getOrganizerApplication: withStore("getOrganizerApplication"),
  getOrganizerApplicationByUserId: withStore("getOrganizerApplicationByUserId"),
  listOrganizerApplicationsByUserId: withStore("listOrganizerApplicationsByUserId"),
  listOrganizerApplications: withStore("listOrganizerApplications"),
  updateOrganizerApplication: withStore("updateOrganizerApplication"),
  deleteOrganizerApplication: withStore("deleteOrganizerApplication"),
  deleteOrganizerProfile: withStore("deleteOrganizerProfile"),

  // Organizer Revocations
  createOrganizerRevocation: withStore("createOrganizerRevocation"),
  getOrganizerRevocationByUserId: withStore("getOrganizerRevocationByUserId"),
  listOrganizerRevocations: withStore("listOrganizerRevocations"),

  // Regions
  getRegions: withStore("getRegions"),
  saveRegion: withStore("saveRegion"),

  // Matches
  createMatch: withStore("createMatch"),
  getMatch: withStore("getMatch"),
  updateMatch: withStore("updateMatch"),
  listMatches: withStore("listMatches"),

  // Tournaments & Prizes
  createTournament: withStore("createTournament"),
  getTournament: withStore("getTournament"),
  listTournaments: withStore("listTournaments"),
  updateTournament: withStore("updateTournament"),
  createTournamentEntry: withStore("createTournamentEntry"),
  getTournamentEntries: withStore("getTournamentEntries"),
  updateTournamentEntryPlacement: withStore("updateTournamentEntryPlacement"),
  getTournamentPrizes: withStore("getTournamentPrizes"),

  // Game Type Limits
  getGameTypeLimit: withStore("getGameTypeLimit"),
  getGameTypeLimits: withStore("getGameTypeLimits"),
  saveGameTypeLimit: withStore("saveGameTypeLimit"),

  // Double-Entry Ledger & System Funds
  writeLedger: withStore("writeLedger"),
  getLedgerBalance: withStore("getLedgerBalance"),
  getLedgerEntries: withStore("getLedgerEntries"),
  getSystemFundsSummary: withStore("getSystemFundsSummary"),
  getChartOfAccountsReport: withStore("getChartOfAccountsReport"),
  getTreasuryFundDetails: withStore("getTreasuryFundDetails"),

  // Roles & RBAC
  listRoles: withStore("listRoles"),
  getRole: withStore("getRole"),
  createRole: withStore("createRole"),
  updateRole: withStore("updateRole"),
  deleteRole: withStore("deleteRole"),
  listPermissions: withStore("listPermissions"),
  getAdminUserRoleAssignments: withStore("getAdminUserRoleAssignments"),
  setAdminUserRoleAssignments: withStore("setAdminUserRoleAssignments"),
  listAdminAccounts: withStore("listAdminAccounts"),

  // Games Catalog
  listGames: withStore("listGames"),
  getGame: withStore("getGame"),
  saveGame: withStore("saveGame"),
  toggleGameStatus: withStore("toggleGameStatus"),

  // Tournament Action Requests Queue
  listTournamentActionRequests: withStore("listTournamentActionRequests"),
  createTournamentActionRequest: withStore("createTournamentActionRequest"),
  reviewTournamentActionRequest: withStore("reviewTournamentActionRequest"),

  // System Settings
  getSystemSettings: withStore("getSystemSettings"),
  saveSystemSetting: withStore("saveSystemSetting"),

  seedDatabase: withStore("seedDatabase"),
};

/** Returns the active database dialect */
export function getDatabaseDialect(): "mysql" | "memory" | "file" {
  return dbRepository.dialect;
}
