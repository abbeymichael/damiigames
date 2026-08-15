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

/**
 * The storage contract every DAMII backend must satisfy.
 *
 * One implementation exists:
 *   - `lib/db/mysql-store.ts` — MySQL (Drizzle ORM + mysql2), used in BOTH
 *     local development and production. The old JSON file store was removed;
 *     there is exactly one persistence path.
 *
 * Application code only ever talks to this interface via `lib/db-client.ts`,
 * so routes and services never touch SQL directly.
 */
export interface DbRepository {
  /** Serialises mutations that must not interleave (money movement, settlement). */
  lockKey<T>(key: string, fn: () => Promise<T>): Promise<T>;

  /** Optional lifecycle hook — verifies connectivity, applies the schema check and seeds defaults. */
  init?(): Promise<void>;
  /** Optional teardown hook used by tests/graceful shutdown. */
  close?(): Promise<void>;
  /** Backend identifier, surfaced in health checks. */
  readonly dialect: "mysql";

  // --- Sessions & Auth ---
  createSession(userId: string, role: Role, ipAddress?: string, userAgent?: string): Promise<Session>;
  getSession(token: string): Promise<Session | null>;
  rotateSession(oldToken: string, ipAddress?: string, userAgent?: string): Promise<Session | null>;
  deleteSession(token: string): Promise<boolean>;
  deleteUserSessions(userId: string): Promise<number>;
  revokeAllUserSessions(userId: string, exceptSessionToken?: string): Promise<number>;
  /** Housekeeping: removes rows whose expiry has passed. */
  purgeExpiredSessions?(): Promise<number>;

  // --- Profiles ---
  saveProfile(profile: Profile): Promise<Profile>;
  deleteProfile(token: string): Promise<boolean>;
  getProfile(token: string): Promise<Profile | null>;
  getAllProfiles(): Promise<Profile[]>;
  findProfileByUsername(username: string): Promise<Profile | null>;
  createRegisteredProfile(
    token: string,
    username: string,
    passcode: string,
    phoneNumber?: string,
    explicitRole?: Role,
    passwordSalt?: string,
  ): Promise<Profile>;
  updateUserProfile(
    token: string,
    updates: { username?: string; phoneNumber?: string; passcode?: string; passwordSalt?: string },
  ): Promise<Profile | null>;
  upsertProfile(token: string, username: string, explicitRole?: Role): Promise<Profile>;
  banUser(token: string, reason: string): Promise<Profile | null>;
  unbanUser(token: string): Promise<Profile | null>;
  adjustUserPoints(token: string, delta: number): Promise<Profile | null>;
  updateProfileBalance(token: string, pointsDelta: number): Promise<Profile | null>;
  updateProfileMarblesBalance(token: string, marblesDelta: number): Promise<Profile | null>;
  updateProfileStats(
    token: string,
    isWin: boolean,
    isDraw?: boolean,
    opponentToken?: string | null,
  ): Promise<Profile | null>;
  getLeaderboard(limit?: number): Promise<Profile[]>;

  // --- Admin settings ---
  getAdminSettings(): Promise<AdminSettings>;
  updateAdminSettings(updates: Partial<AdminSettings>, adminName?: string): Promise<AdminSettings>;

  // --- Paystack idempotency ---
  markPaystackRefProcessed(reference: string): Promise<boolean>;
  isPaystackRefProcessed(reference: string): Promise<boolean>;

  // --- Rooms ---
  getRoom(code: string): Promise<Room | null>;
  saveRoom(room: Room): Promise<Room>;
  listRooms(limit?: number): Promise<Room[]>;

  // --- Wallet ---
  createTransaction(tx: WalletTransaction): Promise<WalletTransaction>;
  getUserTransactions(token: string, limit?: number): Promise<WalletTransaction[]>;
  getAllTransactions(limit?: number): Promise<WalletTransaction[]>;

  // --- Escrows ---
  createEscrow(escrow: WagerEscrow): Promise<WagerEscrow>;
  getEscrow(id: string): Promise<WagerEscrow | null>;
  saveEscrow(escrow: WagerEscrow): Promise<WagerEscrow>;

  // --- Leagues ---
  listLeagues(): Promise<League[]>;
  getLeague(id: string): Promise<League | null>;
  saveLeague(league: League): Promise<League>;
  deleteLeague(id: string): Promise<boolean>;
  getLeagueParticipants(leagueId: string): Promise<LeagueParticipant[]>;
  addLeagueParticipant(participant: LeagueParticipant): Promise<LeagueParticipant>;
  updateParticipantStatus(
    participantId: string,
    status: "approved" | "rejected",
  ): Promise<LeagueParticipant | null>;
  getLeagueMatches(leagueId: string): Promise<LeagueMatch[]>;
  saveLeagueMatch(match: LeagueMatch): Promise<LeagueMatch>;
  setLeagueMatches(matches: LeagueMatch[]): Promise<void>;

  // --- Audit log ---
  createAdminLog(log: AdminLog): Promise<AdminLog>;
  listAdminLogs(limit?: number): Promise<AdminLog[]>;

  // --- Organizer profiles ---
  getOrganizerProfile(userId: string): Promise<OrganizerProfile | null>;
  saveOrganizerProfile(profile: OrganizerProfile): Promise<OrganizerProfile>;
  listOrganizerProfiles(status?: OrganizerStatus): Promise<OrganizerProfile[]>;

  // --- Admin profiles ---
  getAdminProfile(userId: string): Promise<AdminProfile | null>;
  saveAdminProfile(profile: AdminProfile): Promise<AdminProfile>;
  listAdminProfiles(): Promise<AdminProfile[]>;

  // --- Seeder ---
  seedDatabase(): Promise<Profile[]>;
}

/**
 * Process-local key mutex. Used by both stores.
 *
 * NOTE: this only serialises within a single Node process. The MySQL store
 * additionally relies on SQL-level atomic updates (`points = points + ?`) and
 * transactions so correctness does not depend on this lock when running
 * multiple app instances against one database.
 */
const activeLocks = new Map<string, Promise<unknown>>();

export async function lockKey<T>(key: string, fn: () => Promise<T>): Promise<T> {
  while (activeLocks.has(key)) {
    try {
      await activeLocks.get(key);
    } catch {
      // Ignore failures from the previous holder of this lock.
    }
  }

  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  activeLocks.set(key, gate);

  try {
    return await fn();
  } finally {
    activeLocks.delete(key);
    release();
  }
}
