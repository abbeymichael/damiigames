#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setupSitesEnv, projectRoot } from "./lib/env.mjs";
import { run, runWithTimeout, parseDuration, localBin } from "./lib/proc.mjs";

const { env } = setupSitesEnv();

const vinextBin = localBin(projectRoot, "vinext");
if (!existsSync(vinextBin)) {
  console.error("vinext is unavailable. Run npm run install:ci and wait for it to finish before building.");
  process.exit(69);
}

console.log("Running bounded vinext build...");
const timeoutMs = parseDuration(process.env.SITES_BUILD_TIMEOUT, 3 * 60_000);
const killAfterMs = parseDuration(process.env.SITES_BUILD_KILL_AFTER, 10_000);

const { code, timedOut } = await runWithTimeout(vinextBin, ["build"], {
  cwd: projectRoot,
  env,
  timeoutMs,
  killAfterMs,
});
if (timedOut) {
  console.error(`vinext build timed out after ${timeoutMs}ms`);
  process.exit(124);
}
if (code !== 0) {
  process.exit(code ?? 1);
}

const openaiDir = path.join(projectRoot, "dist", ".openai");
mkdirSync(openaiDir, { recursive: true });
writeFileSync(path.join(openaiDir, "hosting.json"), '{"version": 1}\n');

const { code: validateCode } = await run(
  process.execPath,
  [path.join(projectRoot, "scripts", "validate-artifact.mjs")],
  { cwd: projectRoot, env }
);
process.exit(validateCode ?? 0);
