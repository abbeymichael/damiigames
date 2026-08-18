/**
 * Validates the DAMII environment configuration and verifies that the MySQL
 * database is reachable. Exits non-zero with a readable report on failure.
 *
 *   npm run env:check
 */
import { loadEnvFiles } from "./lib/load-env.mjs";

loadEnvFiles();

// Default to MySQL when unset — it is the only dialect.
if (!process.env.DATABASE_DIALECT) process.env.DATABASE_DIALECT = "mysql";

async function main() {
  console.log("▸ Validating DAMII environment...");

  const { validateEnv } = await import("../lib/env.ts").catch(() => ({}));

  // lib/env.ts is TypeScript; run it through the compiled-less path using a
  // lightweight inline evaluation via tsx-like loader if available, else fall
  // back to manual checks. Simplest robust approach: replicate the checks via
  // the mysql2 driver directly.
  // Node 22 can't import the TypeScript lib/env.ts directly, so this script
  // performs the same checks natively (dialect, MySQL coordinates, production
  // secrets) and then verifies real connectivity via mysql2.
  const problems = [];

  const url = process.env.DATABASE_URL || "";
  let host = process.env.MYSQL_HOST || "127.0.0.1";
  let port = Number(process.env.MYSQL_PORT || 3306);
  let user = process.env.MYSQL_USER || "root";
  let password = process.env.MYSQL_PASSWORD || "";
  let database = process.env.MYSQL_DATABASE || "damii";

  if (url) {
    if (!/^mysql(2)?:\/\//i.test(url)) {
      problems.push(`DATABASE_URL must start with mysql:// (received "${url.split(":")[0]}://...")`);
    } else {
      try {
        const parsed = new URL(url);
        host = decodeURIComponent(parsed.hostname) || host;
        port = parsed.port ? Number(parsed.port) : port;
        user = decodeURIComponent(parsed.username) || user;
        password = decodeURIComponent(parsed.password) || password;
        database = decodeURIComponent(parsed.pathname.replace(/^\//, "")) || database;
      } catch {
        problems.push("DATABASE_URL could not be parsed as a URL");
      }
    }
  }

  if (!host) problems.push("MySQL host is missing (set DATABASE_URL or MYSQL_HOST)");
  if (!user) problems.push("MySQL user is missing (set DATABASE_URL or MYSQL_USER)");
  if (!database) problems.push("MySQL database name is missing (set DATABASE_URL or MYSQL_DATABASE)");

  const isProduction = (process.env.NODE_ENV || "").toLowerCase() === "production";
  if (isProduction && !(process.env.ADMIN_SECRET_KEY || "").trim()) {
    problems.push("ADMIN_SECRET_KEY is required in production");
  }

  if (problems.length) {
    console.error("✗ Environment validation failed:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  console.log(`▸ MySQL target: mysql://${user}@${host}:${port}/${database}`);

  const mysql = await import("mysql2/promise");
  try {
    const conn = await mysql.createConnection({ host, port, user, password, database });
    await conn.query("SELECT 1");
    await conn.end();
    console.log("✓ MySQL connection OK");
  } catch (err) {
    console.error(`✗ Could not connect to MySQL: ${err.message}`);
    console.error("  Check that the server is running and the database exists:");
    console.error(
      "    mysql -u " + user + " -p -e " +
        '"CREATE DATABASE IF NOT EXISTS ' + database +
        ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"',
    );
    process.exit(1);
  }

  console.log("✓ Environment configuration is valid");
}

main().catch((err) => {
  console.error(`✗ env:check failed: ${err.message}`);
  process.exit(1);
});
