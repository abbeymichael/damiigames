/**
 * Applies the generated MySQL migrations in drizzle/mysql to the configured
 * database, tracking applied files in a `__drizzle_migrations` table.
 *
 * Deliberately dependency-light (mysql2 only) so it can run on shared hosting
 * where the devDependencies (drizzle-kit) are not installed.
 *
 *   npm run db:migrate
 */
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import {
  loadEnvFiles,
  projectRoot,
  resolveMysqlConfig
} from "./lib/load-env.mjs";
import { EMBEDDED_MIGRATIONS } from "./lib/embedded-migrations.mjs";

loadEnvFiles();

const MIGRATIONS_DIR = path.join(projectRoot, "drizzle", "mysql");
const TRACKING_TABLE = "__drizzle_migrations";

/** Splits a migration file on drizzle's statement-breakpoint marker. */
function splitStatements(sql) {
  return sql
    .split(/--> statement-breakpoint/g)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0 && !/^(--|#)/.test(chunk.replace(/\s/g, "")));
}

async function main() {
  const diskExists = fs.existsSync(MIGRATIONS_DIR);
  let files = [];
  if (diskExists) {
    files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  }

  if (files.length === 0 && (!EMBEDDED_MIGRATIONS || EMBEDDED_MIGRATIONS.length === 0)) {
    console.error("✗ No .sql migration files or embedded migrations found. Run `npm run db:generate` first.");
    process.exit(1);
  }

  const config = resolveMysqlConfig();
  console.log(`▸ Connecting to mysql://${config.user}@${config.host}:${config.port}/${config.database}`);

  let connection;
  try {
    connection = await mysql.createConnection(config);
  } catch (err) {
    console.error(`✗ Could not connect to MySQL: ${err.message}`);
    console.error("  Check DATABASE_URL / MYSQL_* variables and that the server is reachable.");
    process.exit(1);
  }

  try {
    await connection.query(
      `CREATE TABLE IF NOT EXISTS \`${TRACKING_TABLE}\` (
         \`id\` int NOT NULL AUTO_INCREMENT,
         \`name\` varchar(191) NOT NULL,
         \`applied_at\` varchar(32) NOT NULL,
         PRIMARY KEY (\`id\`),
         UNIQUE KEY \`${TRACKING_TABLE}_name_uq\` (\`name\`)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );

    const [rows] = await connection.query(`SELECT name FROM \`${TRACKING_TABLE}\``);
    const applied = new Set(rows.map((r) => r.name));

    let appliedCount = 0;

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  = ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      const statements = splitStatements(sql);

      console.log(`  + ${file} (${statements.length} statement${statements.length === 1 ? "" : "s"})`);

      for (const statement of statements) {
        try {
          await connection.query(statement);
        } catch (err) {
          // Idempotency: tolerate objects that already exist from a partial run.
          const tolerable = [
            "ER_TABLE_EXISTS_ERROR",
            "ER_DUP_KEYNAME",
            "ER_DUP_FIELDNAME",
          ].includes(err.code);
          if (tolerable) {
            console.log(`    ~ skipped (already present): ${err.code}`);
            continue;
          }
          throw new Error(`Migration ${file} failed: ${err.message}\nStatement: ${statement.slice(0, 200)}`);
        }
      }

      await connection.query(`INSERT INTO \`${TRACKING_TABLE}\` (name, applied_at) VALUES (?, ?)`, [
        file,
        new Date().toISOString(),
      ]);
      applied.add(file);
      appliedCount++;
    }

    // Process embedded migrations for any migration missing on disk
    for (const migration of EMBEDDED_MIGRATIONS) {
      if (applied.has(migration.name)) continue;

      console.log(`  + ${migration.name} [embedded] (${migration.statements.length} statements)`);

      for (const statement of migration.statements) {
        try {
          await connection.query(statement);
        } catch (err) {
          const tolerable = [
            "ER_TABLE_EXISTS_ERROR",
            "ER_DUP_KEYNAME",
            "ER_DUP_FIELDNAME",
          ].includes(err.code);
          if (tolerable) {
            console.log(`    ~ skipped (already present): ${err.code}`);
            continue;
          }
          throw new Error(`Migration ${migration.name} failed: ${err.message}\nStatement: ${statement.slice(0, 200)}`);
        }
      }

      await connection.query(`INSERT INTO \`${TRACKING_TABLE}\` (name, applied_at) VALUES (?, ?)`, [
        migration.name,
        new Date().toISOString(),
      ]);
      applied.add(migration.name);
      appliedCount++;
    }

    const [tables] = await connection.query(
      `SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ?`,
      [config.database],
    );

    console.log(
      `✓ Migrations complete — ${appliedCount} newly applied, ${tables[0].c} tables present in \`${config.database}\`.`,
    );
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error(`✗ Unexpected migration error: ${err.message}`);
  process.exit(1);
});
