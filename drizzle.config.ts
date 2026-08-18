import { defineConfig } from "drizzle-kit";

/**
 * DAMII uses MySQL (MySQL 8 / MariaDB 10.4+) as its only production dialect.
 * The `file` dialect used for local development is a JSON-backed store and has
 * no migrations, so drizzle-kit is always pointed at the MySQL schema.
 *
 * Connection details come from either DATABASE_URL:
 *   mysql://user:password@host:3306/damii
 * or the discrete MYSQL_* variables (handy on shared hosting cPanel setups).
 */
function resolveCredentials() {
  const url = process.env.DATABASE_URL;
  if (url && url.startsWith("mysql")) {
    return { url };
  }

  return {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "damii",
  };
}

export default defineConfig({
  out: "./drizzle/mysql",
  schema: "./db/schema.mysql.ts",
  dialect: "mysql",
  dbCredentials: resolveCredentials(),
  strict: true,
  verbose: true,
});
