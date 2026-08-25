import type {
  AdminAccount,
  AdminLog,
  AdminProfile,
  AdminSettings,
  AppRole,
  ChartOfAccountsReport,
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
  SystemFundsReport,
  SystemSettingEntry,
  SystemSettingsCategory,
  Tournament,
  TournamentActionRequest,
  TournamentEntry,
  TournamentPrize,
  TreasuryFundDetails,
  User,
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
  readonly dialect: "mysql" | "memory" | "file";

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
  findProfileByPhone(phoneNumber: string): Promise<Profile | null>;
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
  getAllRooms?(limit?: number): Promise<Room[]>;

  // --- Wallet ---
  createTransaction(tx: WalletTransaction): Promise<WalletTransaction>;
  getTransaction(id: string): Promise<WalletTransaction | null>;
  updateTransaction(id: string, updates: Partial<WalletTransaction>): Promise<WalletTransaction | null>;
  getUserTransactions(token: string, limit?: number): Promise<WalletTransaction[]>;
  getAllTransactions(limit?: number): Promise<WalletTransaction[]>;

  // --- Escrows ---
  createEscrow(escrow: WagerEscrow): Promise<WagerEscrow>;
  getEscrow(id: string): Promise<WagerEscrow | null>;
  saveEscrow(escrow: WagerEscrow): Promise<WagerEscrow>;

  // --- Leagues ---
  listLeagues(): Promise<League[]>;
  getAllLeagues?(): Promise<League[]>;
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
  getAdminLogs?(limit?: number): Promise<AdminLog[]>;

  // --- Organizer profiles ---
  getOrganizerProfile(userId: string): Promise<OrganizerProfile | null>;
  saveOrganizerProfile(profile: OrganizerProfile): Promise<OrganizerProfile>;
  listOrganizerProfiles(status?: OrganizerStatus): Promise<OrganizerProfile[]>;

  // --- Admin profiles ---
  getAdminProfile(userId: string): Promise<AdminProfile | null>;
  saveAdminProfile(profile: AdminProfile): Promise<AdminProfile>;
  listAdminProfiles(): Promise<AdminProfile[]>;

  // --- Users & Profile Completion ---
  getUserById(id: string): Promise<User | null>;
  getUserByPhone(phoneNumber: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  saveUser(user: Partial<User> & { id: string; phoneNumber: string }): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;

  // --- OTP Requests ---
  createOtpRequest(req: { id: string; phoneNumber: string; codeHash: string; ipAddress: string; expiresAt: Date }): Promise<OtpRequest>;
  getOtpRequest(id: string): Promise<OtpRequest | null>;
  consumeOtpRequest(id: string): Promise<OtpRequest | null>;
  getRecentOtpRequestsByPhone(phoneNumber: string, since: Date): Promise<OtpRequest[]>;
  getRecentOtpRequestsByIp(ipAddress: string, since: Date): Promise<OtpRequest[]>;

  // --- Organizer Applications ---
  createOrganizerApplication(app: OrganizerApplication): Promise<OrganizerApplication>;
  getOrganizerApplication(id: string): Promise<OrganizerApplication | null>;
  getOrganizerApplicationByUserId(userId: string): Promise<OrganizerApplication | null>;
  listOrganizerApplicationsByUserId(userId: string): Promise<OrganizerApplication[]>;
  listOrganizerApplications(status?: OrganizerApplicationStatus): Promise<OrganizerApplication[]>;
  updateOrganizerApplication(id: string, updates: Partial<OrganizerApplication>): Promise<OrganizerApplication | null>;

  // --- Organizer Revocations ---
  createOrganizerRevocation(revocation: OrganizerRevocation): Promise<OrganizerRevocation>;
  getOrganizerRevocationByUserId(userId: string): Promise<OrganizerRevocation | null>;
  listOrganizerRevocations(): Promise<OrganizerRevocation[]>;

  // --- Regions ---
  getRegions(): Promise<Region[]>;
  saveRegion(region: Region): Promise<Region>;

  // --- Matches (Section 6) ---
  createMatch(match: Match): Promise<Match>;
  getMatch(id: string): Promise<Match | null>;
  updateMatch(id: string, updates: Partial<Match>): Promise<Match | null>;
  listMatches(filter?: { status?: string; gameType?: string; playerId?: string; limit?: number }): Promise<Match[]>;

  // --- Tournaments & Prizes (Section 7) ---
  createTournament(tournament: Tournament, prizes?: { placement: number; amount: number | string }[]): Promise<Tournament>;
  getTournament(id: string): Promise<{ tournament: Tournament; prizes: TournamentPrize[]; entries: TournamentEntry[] } | null>;
  listTournaments(filter?: { status?: string; organizerId?: string; gameType?: string; limit?: number }): Promise<Tournament[]>;
  updateTournament(id: string, updates: Partial<Tournament>): Promise<Tournament | null>;
  createTournamentEntry(entry: TournamentEntry): Promise<TournamentEntry>;
  getTournamentEntries(tournamentId: string): Promise<TournamentEntry[]>;
  updateTournamentEntryPlacement(entryId: string, placement: number): Promise<TournamentEntry | null>;
  getTournamentPrizes(tournamentId: string): Promise<TournamentPrize[]>;

  // --- Game Type Limits (Section 8) ---
  getGameTypeLimit(gameType: string): Promise<GameTypeLimit | null>;
  getGameTypeLimits(): Promise<GameTypeLimit[]>;
  saveGameTypeLimit(limit: GameTypeLimit): Promise<GameTypeLimit>;

  // --- Double-Entry Ledger & System Funds ---
  writeLedger(entries: LedgerEntryInput[]): Promise<LedgerEntry[]>;
  getLedgerBalance(userId: string, accountType: LedgerAccountType): Promise<number>;
  getLedgerEntries(filter?: { userId?: string; referenceType?: string; referenceId?: string; limit?: number }): Promise<LedgerEntry[]>;
  getSystemFundsSummary(): Promise<SystemFundsReport>;
  getChartOfAccountsReport?(): Promise<ChartOfAccountsReport>;
  getTreasuryFundDetails?(): Promise<TreasuryFundDetails>;

  // --- Roles & RBAC (Section 1) ---
  listRoles(): Promise<AppRole[]>;
  getRole(id: string): Promise<AppRole | undefined>;
  createRole(role: AppRole, permissionKeys: string[]): Promise<AppRole>;
  updateRole(id: string, updates: Partial<AppRole>, permissionKeys?: string[]): Promise<AppRole>;
  deleteRole(id: string): Promise<void>;
  listPermissions(): Promise<Permission[]>;
  getAdminUserRoleAssignments(userId: string): Promise<string[]>;
  setAdminUserRoleAssignments(userId: string, roleIds: string[], assignedByAdminId: string): Promise<void>;
  listAdminAccounts(): Promise<AdminAccount[]>;

  // --- Games Catalog (Section 2.2) ---
  listGames(): Promise<GameCatalogItem[]>;
  getGame(slugOrId: string): Promise<GameCatalogItem | undefined>;
  saveGame(game: GameCatalogItem): Promise<GameCatalogItem>;
  toggleGameStatus(id: string, status: "enabled" | "disabled"): Promise<GameCatalogItem>;

  // --- Tournament Action Requests Queue (Section 2.3) ---
  listTournamentActionRequests(status?: string): Promise<TournamentActionRequest[]>;
  createTournamentActionRequest(req: TournamentActionRequest): Promise<TournamentActionRequest>;
  reviewTournamentActionRequest(id: string, status: "approved" | "rejected", adminId: string, reviewNote?: string): Promise<TournamentActionRequest>;

  // --- System Settings (Section 2.7) ---
  getSystemSettings(category?: SystemSettingsCategory): Promise<SystemSettingEntry[]>;
  saveSystemSetting(category: SystemSettingsCategory, key: string, value: any, adminId?: string): Promise<SystemSettingEntry>;

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
