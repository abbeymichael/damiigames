import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Minimal dotenv loader (no runtime dependency).
 *
 * Files are read in ascending priority; values already present in
 * `process.env` are never overwritten so real deployment env vars always win.
 */
export function loadEnvFiles(files = [".env", ".env.local", ".env.production.local"]) {
  const loaded = [];

  for (const file of files) {
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
      // Strip matching surrounding quotes.
      if (
        (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
        (value.startsWith("'") && value.endsWith("'") && value.length > 1)
      ) {
        value = value.slice(1, -1);
      }

      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
    loaded.push(file);
  }

  return loaded;
}

/** Resolves the drizzle-kit CLI entry across versions (bin.cjs / bin.js). */
export function resolveDrizzleKitCli() {
  const candidates = [
    path.join(projectRoot, "node_modules", "drizzle-kit", "bin.cjs"),
    path.join(projectRoot, "node_modules", "drizzle-kit", "bin.js"),
    path.join(projectRoot, "node_modules", ".bin", "drizzle-kit"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(
    "drizzle-kit CLI not found. Run `npm install` before generating or applying migrations.",
  );
}

/**
 * Builds a mysql2 connection config from DATABASE_URL or the MYSQL_* vars.
 * Mirrors lib/env.ts so scripts and the app never disagree.
 */
export function resolveMysqlConfig() {
  const url = process.env.DATABASE_URL;

  let host = process.env.MYSQL_HOST || "127.0.0.1";
  let port = Number(process.env.MYSQL_PORT || 3306);
  let user = process.env.MYSQL_USER || "root";
  let password = process.env.MYSQL_PASSWORD || "";
  let database = process.env.MYSQL_DATABASE || "damii";

  if (url && /^mysql(2)?:\/\//i.test(url)) {
    const parsed = new URL(url);
    host = decodeURIComponent(parsed.hostname) || host;
    port = parsed.port ? Number(parsed.port) : port;
    user = decodeURIComponent(parsed.username) || user;
    password = decodeURIComponent(parsed.password) || password;
    const dbName = parsed.pathname.replace(/^\//, "");
    if (dbName) database = decodeURIComponent(dbName);
  }

  return {
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
    ssl: ["1", "true", "yes", "on"].includes(String(process.env.MYSQL_SSL || "").toLowerCase())
      ? { rejectUnauthorized: false }
      : undefined,
  };
}
