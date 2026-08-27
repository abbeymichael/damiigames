import mysql from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "../../db/schema.mysql";
import { getEnv } from "../env";

/**
 * Lazily-created, process-wide MySQL connection pool + Drizzle handle.
 *
 * A single pool is reused across hot reloads in development by stashing it on
 * `globalThis`, which prevents the classic "too many connections" failure when
 * the dev server re-evaluates modules.
 */

export type DamiiDb = MySql2Database<typeof schema>;

interface PoolHolder {
  pool: mysql.Pool | null;
  db: DamiiDb | null;
}

const globalForDb = globalThis as unknown as { __damiiMysql?: PoolHolder };

const holder: PoolHolder = globalForDb.__damiiMysql ?? { pool: null, db: null };
globalForDb.__damiiMysql = holder;

function createPool(): mysql.Pool {
  const { mysql: cfg } = getEnv();
  if (!cfg) {
    throw new Error(
      "MySQL is not configured. Set DATABASE_DIALECT=mysql together with DATABASE_URL " +
        "(mysql://user:pass@host:3306/db) or the MYSQL_HOST/MYSQL_USER/MYSQL_PASSWORD/MYSQL_DATABASE variables.",
    );
  }

  return mysql.createPool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    waitForConnections: true,
    connectionLimit: cfg.connectionLimit,
    maxIdle: Math.min(cfg.connectionLimit, 2),
    idleTimeout: 15_000,
    connectTimeout: 10_000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 5_000,
    charset: "UTF8MB4_UNICODE_CI",
    timezone: "Z",
    // Always parameterise; never interpolate user input into SQL.
    namedPlaceholders: false,
    multipleStatements: false,
    ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined,
  });
}

/** Returns the shared pool, creating it on first use. */
export function getPool(): mysql.Pool {
  if (!holder.pool) {
    holder.pool = createPool();
  }
  return holder.pool;
}

/** Returns the shared Drizzle database handle. */
export function getDb(): DamiiDb {
  if (!holder.db) {
    holder.db = drizzle(getPool(), { schema, mode: "default" });
  }
  return holder.db;
}

/** Verifies connectivity; throws a descriptive error when unreachable. */
export async function assertConnection(): Promise<void> {
  const pool = getPool();
  try {
    const conn = await pool.getConnection();
    try {
      await conn.query("SELECT 1");
    } finally {
      conn.release();
    }
  } catch (err) {
    const cfg = getEnv().mysql;
    const target = cfg ? `${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}` : "(unconfigured)";
    throw new Error(
      `Unable to connect to MySQL at ${target}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Runs `fn` inside a transaction with the given isolation level.
 * Used for money movement so balance reads and writes cannot interleave.
 */
export async function withTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    try {
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  } finally {
    conn.release();
  }
}

/** Closes the pool (tests / graceful shutdown). */
export async function closePool(): Promise<void> {
  if (holder.pool) {
    await holder.pool.end();
    holder.pool = null;
    holder.db = null;
  }
}
