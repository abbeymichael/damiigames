import { spawn } from "node:child_process";
import { loadEnvFiles, projectRoot, resolveDrizzleKitCli } from "./lib/load-env.mjs";

/**
 * Generates (or pushes) the MySQL migration set from db/schema.mysql.ts.
 *
 *   npm run db:generate     -> writes SQL migrations into drizzle/mysql
 *   npm run db:push         -> applies the schema directly (dev convenience)
 */
loadEnvFiles();

const push = process.argv.includes("--push");
const command = push ? "push" : "generate";

if (!process.env.DATABASE_DIALECT) {
  process.env.DATABASE_DIALECT = "mysql";
}

let cli;
try {
  cli = resolveDrizzleKitCli();
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}

console.log(`▸ drizzle-kit ${command} (dialect: mysql)`);

const child = spawn(process.execPath, [cli, command], {
  stdio: "inherit",
  cwd: projectRoot,
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
