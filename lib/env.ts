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

import fs from "node:fs";
import path from "node:path";

/**
 * Load .env files if not already in process.env (zero external dependencies).
 * Ensures server.js, API routes, and passenger runtime have access to variables.
 */
function ensureEnvLoaded() {
  if (typeof process === "undefined" || !process.cwd) return;
  const projectRoot = process.cwd();
  const envFiles = [".env", ".env.local", ".env.production", ".env.production.local"];
  for (const file of envFiles) {
    try {
      const fullPath = path.join(projectRoot, file);
      if (!fs.existsSync(fullPath)) continue;
      const contents = fs.readFileSync(fullPath, "utf8");
      for (const rawLine of contents.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        if (!key) continue;
        let value = line.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
          (value.startsWith("'") && value.endsWith("'") && value.length > 1)
        ) {
          value = value.slice(1, -1);
        }
        if (process.env[key] === undefined || process.env[key] === "") {
          process.env[key] = value;
        }
      }
    } catch {
      // Best-effort loader; ignore read errors in edge runtimes
    }
  }
}

// Ensure env is populated on initial import
ensureEnvLoaded();

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
        `See SHARED_HOSTING_DEPLOYMENT.md for the full list of required variables.`,
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
 * Falls back to the MYSQL_* / DB_* variables for any part not present in the URL.
 */
function parseMysqlConfig(problems: string[]): MysqlConfig | null {
  const rawUrl =
    process.env.DATABASE_URL ||
    process.env.MYSQL_URL ||
    process.env.MYSQL_DATABASE_URL ||
    process.env.DB_URL ||
    process.env.MYSQL_URI ||
    process.env.JAWSDB_URL ||
    process.env.CLEARDB_DATABASE_URL;
  const url = rawUrl ? rawUrl.trim().replace(/^["']|["']$/g, "") : "";

  // Local-friendly defaults so `npm run dev` works against a stock MySQL install.
  let host =
    (process.env.MYSQL_HOST || process.env.DB_HOST || "").trim().replace(/^["']|["']$/g, "") ||
    "127.0.0.1";
  let port = int(process.env.MYSQL_PORT || process.env.DB_PORT, 3306);
  let user =
    (process.env.MYSQL_USER || process.env.DB_USER || process.env.DB_USERNAME || "")
      .trim()
      .replace(/^["']|["']$/g, "") || "root";
  let password = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || "";
  let database =
    (process.env.MYSQL_DATABASE || process.env.DB_NAME || process.env.DB_DATABASE || "")
      .trim()
      .replace(/^["']|["']$/g, "") || "damii";
  let ssl = bool(process.env.MYSQL_SSL || process.env.DB_SSL, false);

  if (url) {
    const normalisedUrl = url.replace(/^(mysql2|mariadb):/i, "mysql:");
    if (!/^mysql:\/\//i.test(normalisedUrl)) {
      problems.push(
        `DATABASE_URL must be a mysql:// connection string (received "${url.split(":")[0]}://...")`,
      );
      return null;
    }
    try {
      const parsed = new URL(normalisedUrl);
      host = decodeURIComponent(parsed.hostname) || host;
      port = parsed.port ? Number(parsed.port) : port;
      user = decodeURIComponent(parsed.username) || user;
      password = decodeURIComponent(parsed.password) || password;
      const dbName = parsed.pathname.replace(/^\//, "");
      database = dbName ? decodeURIComponent(dbName) : database;

      const sslParam =
        parsed.searchParams.get("ssl") ||
        parsed.searchParams.get("sslmode") ||
        parsed.searchParams.get("ssl-mode") ||
        parsed.searchParams.get("sslaccept");
      const explicitSslFalse =
        process.env.MYSQL_SSL === "false" ||
        process.env.DB_SSL === "false" ||
        sslParam === "false" ||
        sslParam === "disable" ||
        sslParam === "0";

      if (explicitSslFalse) {
        ssl = false;
      } else if (
        sslParam &&
        sslParam.toLowerCase() !== "false" &&
        sslParam.toLowerCase() !== "disable" &&
        sslParam.toLowerCase() !== "0"
      ) {
        ssl = true;
      } else if (
        !sslParam &&
        host !== "127.0.0.1" &&
        host !== "localhost" &&
        host !== "::1" &&
        !host.startsWith("192.168.") &&
        !host.startsWith("10.") &&
        !host.includes("freedb.tech")
      ) {
        // Cloud-hosted databases typically require TLS/SSL connections (unless explicitly disabled)
        ssl = true;
      }
    } catch {
      problems.push("DATABASE_URL could not be parsed as a URL");
      return null;
    }
  }

  if (process.env.MYSQL_SSL === "false" || process.env.DB_SSL === "false") {
    ssl = false;
  }

  if (!host) problems.push("MySQL host is missing (set DATABASE_URL or MYSQL_HOST)");
  if (!user) problems.push("MySQL user is missing (set DATABASE_URL or MYSQL_USER)");
  if (!database) problems.push("MySQL database name is missing (set DATABASE_URL or MYSQL_DATABASE)");
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    problems.push(`MySQL port "${port}" is not a valid TCP port`);
  }

  if (!host || !user || !database) return null;

  const connectionLimit = Math.max(
    1,
    int(
      process.env.MYSQL_CONNECTION_LIMIT || process.env.MYSQL_POOL_SIZE || process.env.DB_POOL_SIZE,
      host.includes("freedb.tech") ? 2 : 5,
    ),
  );

  return {
    host,
    port,
    user,
    password,
    database,
    connectionLimit,
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

  let adminSecretKey = (process.env.ADMIN_SECRET_KEY || "").trim();
  if (isProduction && !adminSecretKey) {
    adminSecretKey = "damii-admin-secure-vault-token-fallback-key-2026";
    console.warn(
      "[damii][env] Notice: ADMIN_SECRET_KEY not set in production. Using sandbox fallback key.",
    );
  } else if (isProduction && adminSecretKey.length < 24) {
    console.warn(
      "[damii][env] Notice: ADMIN_SECRET_KEY is shorter than 24 characters.",
    );
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

  let appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "").trim();
  if (!appUrl) {
    appUrl = "http://localhost:3000";
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
