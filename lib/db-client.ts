import type { DbRepository } from "./db/repository";
import { mysqlStore } from "./db/mysql-store";

/**
 * DAMII data-access entrypoint.
 *
 * MySQL is the ONLY persistence backend — in development AND in production.
 * The previous `.data/damii_db.json` file store has been removed entirely so
 * there is exactly one code path to reason about, one schema to migrate, and
 * no risk of dev/prod behaviour diverging.
 *
 * Connection details come from the environment (see lib/env.ts):
 *   DATABASE_URL=mysql://user:pass@host:3306/damii
 *   — or — MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE
 *
 * The store lazily verifies connectivity and seeds default accounts on first
 * use (`init()`), so `npm run dev` and `npm run start` behave identically:
 * point them at a MySQL server and go.
 */

let initPromise: Promise<DbRepository> | null = null;

async function boot(): Promise<DbRepository> {
  if (!initPromise) {
    initPromise = (async () => {
      if (mysqlStore.init) await mysqlStore.init();
      return mysqlStore;
    })();
    initPromise.catch(() => {
      // Allow retry on next request if MySQL was momentarily unreachable.
      initPromise = null;
    });
  }
  return initPromise;
}

// Kick off the connection probe immediately at module load so configuration
// errors surface at server boot rather than on the first user request.
const booted = boot();

function withStore<T extends keyof DbRepository>(method: T) {
  return (async (...args: unknown[]) => {
    const store = await booted;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (store[method] as any)(...args);
  }) as DbRepository[T] extends (...a: infer A) => infer R ? (...a: A) => R : never;
}

export const dbRepository: DbRepository = {
  dialect: "mysql",
  lockKey: mysqlStore.lockKey,
  init: () => booted.then(() => undefined),
  close: () => (mysqlStore.close ? mysqlStore.close() : Promise.resolve()),

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

  createTransaction: withStore("createTransaction"),
  getUserTransactions: withStore("getUserTransactions"),
  getAllTransactions: withStore("getAllTransactions"),

  createEscrow: withStore("createEscrow"),
  getEscrow: withStore("getEscrow"),
  saveEscrow: withStore("saveEscrow"),

  listLeagues: withStore("listLeagues"),
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

  getOrganizerProfile: withStore("getOrganizerProfile"),
  saveOrganizerProfile: withStore("saveOrganizerProfile"),
  listOrganizerProfiles: withStore("listOrganizerProfiles"),

  getAdminProfile: withStore("getAdminProfile"),
  saveAdminProfile: withStore("saveAdminProfile"),
  listAdminProfiles: withStore("listAdminProfiles"),

  seedDatabase: withStore("seedDatabase"),
};

/** Kept for API compatibility — DAMII is MySQL-only. */
export function getDatabaseDialect(): "mysql" {
  return "mysql";
}
