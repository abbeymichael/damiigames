#!/usr/bin/env node
// Cross-platform replacement for sites-env.sh.
// Usage: node scripts/sites-env.mjs -- <command> [args...]
import { setupSitesEnv, projectRoot } from "./lib/env.mjs";
import { run } from "./lib/proc.mjs";

const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;

if (args.length === 0) {
  console.error("usage: node scripts/sites-env.mjs -- command [args...]");
  process.exit(64);
}

const { env } = setupSitesEnv();
const [cmd, ...cmdArgs] = args;

const { code } = await run(cmd, cmdArgs, { cwd: projectRoot, env });
process.exit(code ?? 1);
