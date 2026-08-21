/**
 * Centralised, fail-fast environment configuration for DAMII.
 *
 * Rules enforced here:
 *  - MySQL is the ONLY database dialect — in development and production.
 *    `DATABASE_DIALECT` defaults to "mysql" everywhere; the legacy JSON file
 *    store no longer exists.
 *  - MySQL connection details come from `DATABASE_URL` (mysql://…) or the
 *    discrete MYSQL_HOST/MYSQL_PORT/MYSQL_USER/MYSQL_PASSWORD/MYSQL_DATABASE
 *    variables. Sensible local defaults (127.0.0.1:3306, root, damii) keep
 *    `npm run dev` zero-config when a local MySQL is running.
 *  - In production a strong `ADMIN_SECRET_KEY` is mandatory; the server
 *    refuses to boot with dev placeholders.
 *  - Paystack keys are validated when wallet features are enabled.
 *
 * Import this module for any env access so that misconfiguration surfaces as a
 * single, readable error instead of a scattered runtime failure.
 */

export type DatabaseDialect = "mysql";

export interface MysqlConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  ssl: boolean;
}

export interface AppEnv {
  nodeEnv: "development" | "production" | "test";
  isProduction: boolean;
  dialect: DatabaseDialect;
  mysql: MysqlConfig | null;
  adminSecretKey: string;
  paystackSecretKey: string;
  paystackPublicKey: string;
  appUrl: string;
  sessionTtlDays: number;
  cookieSecure: boolean;
  trustProxy: boolean;
  rateLimitEnabled: boolean;
}

const WEAK_ADMIN_SECRETS = new Set([
  "damii-admin-2026",
  "admin",
  "admin123",
  "changeme",
  "secret",
  "password",
  "",
]);

class EnvValidationError extends Error {
  constructor(problems: string[]) {
    super(
      `Invalid environment configuration:\n${problems.map((p) => `  - ${p}`).join("\n")}\n` +
        `See DEPLOYMENT_GUIDE.md for the full list of required variables.`,
    );
    this.name = "EnvValidationError";
  }
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Parses `mysql://user:pass@host:port/database` into discrete parts.
 * Falls back to the MYSQL_* variables for any part not present in the URL.
 */
function parseMysqlConfig(problems: string[]): MysqlConfig | null {
  const url = process.env.DATABASE_URL;

  // Local-friendly defaults so `npm run dev` works against a stock MySQL install.
  let host = process.env.MYSQL_HOST || "127.0.0.1";
  let port = int(process.env.MYSQL_PORT, 3306);
  let user = process.env.MYSQL_USER || "root";
  let password = process.env.MYSQL_PASSWORD || "";
  let database = process.env.MYSQL_DATABASE || "damii";
  let ssl = bool(process.env.MYSQL_SSL, false);

  if (url) {
    if (!/^mysql(2)?:\/\//i.test(url)) {
      problems.push(
        `DATABASE_URL must be a mysql:// connection string when DATABASE_DIALECT=mysql (received "${url.split(":")[0]}://...")`,
      );
      return null;
    }
    try {
      const parsed = new URL(url);
      host = decodeURIComponent(parsed.hostname) || host;
      port = parsed.port ? Number(parsed.port) : port;
      user = decodeURIComponent(parsed.username) || user;
      password = decodeURIComponent(parsed.password) || password;
      const dbName = parsed.pathname.replace(/^\//, "");
      database = dbName ? decodeURIComponent(dbName) : database;

      const sslParam =
        parsed.searchParams.get("ssl") ||
        parsed.searchParams.get("sslmode") ||
        parsed.searchParams.get("ssl-mode");
      if (
        sslParam &&
        sslParam.toLowerCase() !== "false" &&
        sslParam.toLowerCase() !== "disable" &&
        sslParam.toLowerCase() !== "0"
      ) {
        ssl = true;
      }
    } catch {
      problems.push("DATABASE_URL could not be parsed as a URL");
      return null;
    }
  }

  if (!host) problems.push("MySQL host is missing (set DATABASE_URL or MYSQL_HOST)");
  if (!user) problems.push("MySQL user is missing (set DATABASE_URL or MYSQL_USER)");
  if (!database) problems.push("MySQL database name is missing (set DATABASE_URL or MYSQL_DATABASE)");
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    problems.push(`MySQL port "${port}" is not a valid TCP port`);
  }

  if (!host || !user || !database) return null;

  return {
    host,
    port,
    user,
    password,
    database,
    connectionLimit: Math.max(1, int(process.env.MYSQL_POOL_SIZE, 10)),
    ssl,
  };
}

function resolveDialect(problems: string[]): DatabaseDialect {
  const raw = (process.env.DATABASE_DIALECT || "").trim().toLowerCase();

  // Unset or explicitly MySQL — the only supported configuration.
  if (!raw || raw === "mysql" || raw === "mariadb") return "mysql";

  problems.push(
    `DATABASE_DIALECT="${raw}" is no longer supported. DAMII uses MySQL in every environment ` +
      `(development and production). Remove DATABASE_DIALECT or set it to "mysql", then point ` +
      `DATABASE_URL (mysql://user:pass@host:3306/db) or the MYSQL_* variables at your server.`,
  );
  return "mysql";
}

function buildEnv(): AppEnv {
  const problems: string[] = [];
  const rawNodeEnv = (process.env.NODE_ENV || "development").toLowerCase();
  const nodeEnv: AppEnv["nodeEnv"] =
    rawNodeEnv === "production" ? "production" : rawNodeEnv === "test" ? "test" : "development";
  const isProduction = nodeEnv === "production";

  const dialect = resolveDialect(problems);
  const mysql = parseMysqlConfig(problems);

  const adminSecretKey = (process.env.ADMIN_SECRET_KEY || "").trim();
  if (isProduction) {
    if (!adminSecretKey) {
      problems.push("ADMIN_SECRET_KEY is required in production");
    } else if (WEAK_ADMIN_SECRETS.has(adminSecretKey.toLowerCase())) {
      problems.push("ADMIN_SECRET_KEY is a known default/example value — generate a unique secret");
    } else if (adminSecretKey.length < 24) {
      problems.push("ADMIN_SECRET_KEY must be at least 24 characters in production");
    }
  }

  const paystackSecretKey = (process.env.PAYSTACK_SECRET_KEY || "").trim();
  if (paystackSecretKey && !/^sk_(test|live)_/.test(paystackSecretKey)) {
    problems.push('PAYSTACK_SECRET_KEY must start with "sk_test_" or "sk_live_"');
  }
  if (isProduction && paystackSecretKey.startsWith("sk_test_")) {
    // Loud warning rather than a hard failure: staging deploys legitimately use test keys.
    console.warn(
      "[damii][env] WARNING: a Paystack TEST secret key is configured while NODE_ENV=production.",
    );
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "").trim();
  if (isProduction) {
    if (!appUrl) {
      problems.push("NEXT_PUBLIC_APP_URL is required in production (used for Paystack callbacks)");
    } else if (!/^https:\/\//i.test(appUrl)) {
      problems.push("NEXT_PUBLIC_APP_URL must use https:// in production");
    }
  }

  if (problems.length > 0) {
    throw new EnvValidationError(problems);
  }

  return {
    nodeEnv,
    isProduction,
    dialect,
    mysql,
    adminSecretKey,
    paystackSecretKey,
    paystackPublicKey: (process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "").trim(),
    appUrl: appUrl || "http://localhost:3000",
    sessionTtlDays: Math.max(1, int(process.env.SESSION_TTL_DAYS, 7)),
    cookieSecure: bool(process.env.SESSION_COOKIE_SECURE, isProduction),
    trustProxy: bool(process.env.TRUST_PROXY, isProduction),
    rateLimitEnabled: bool(process.env.RATE_LIMIT_ENABLED, true),
  };
}

let cached: AppEnv | null = null;

/** Returns the validated environment, throwing on first access if invalid. */
export function getEnv(): AppEnv {
  if (!cached) cached = buildEnv();
  return cached;
}

/** Test helper — clears the memoised env so a new process env can be read. */
export function resetEnvCache(): void {
  cached = null;
}

/**
 * Validates the environment and returns a report instead of throwing.
 * Used by `npm run env:check` and health endpoints.
 */
export function validateEnv(): { ok: true; env: AppEnv } | { ok: false; error: string } {
  try {
    resetEnvCache();
    return { ok: true, env: getEnv() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
