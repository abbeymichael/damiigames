#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, cpSync } from "node:fs";
import path from "node:path";
import { setupSitesEnv, projectRoot } from "./lib/env.mjs";
import { capture, runWithTimeout, parseDuration, localBin } from "./lib/proc.mjs";
import { sha256File, verifyIntegrity } from "./lib/hash.mjs";
import { acquireLock } from "./lib/lock.mjs";

const { runtimeRoot, home, npmCache, env } = setupSitesEnv();

console.log("[sites] validating writable install environment");

const { code: cacheCode, stdout: actualCache } = await capture("npm", ["config", "get", "cache"], {
  cwd: projectRoot,
  env,
});
if (cacheCode !== 0) {
  console.error("Failed to read the npm cache config.");
  process.exit(78);
}
if (path.resolve(actualCache) !== path.resolve(npmCache)) {
  console.error(`Expected npm cache ${npmCache}, got ${actualCache}.`);
  process.exit(78);
}

const homeWriteTest = path.join(home, ".sites-write-test");
const cacheWriteTest = path.join(npmCache, ".sites-write-test");
writeFileSync(homeWriteTest, "");
writeFileSync(cacheWriteTest, "");
unlinkSync(homeWriteTest);
unlinkSync(cacheWriteTest);
console.log(`[sites] environment passed: HOME=${home}, cache=${npmCache}`);

const lockDir = path.join(runtimeRoot, "install.lock.d");
const release = acquireLock(lockDir);
if (!release) {
  console.error(`Another dependency install is already running for ${projectRoot}.`);
  process.exit(75);
}

try {
  const lockfilePath = path.join(projectRoot, "package-lock.json");
  const lockfileSha256 = await sha256File(lockfilePath);

  let useSeededCache = false;
  const seedCache = process.env.SITES_NPM_CACHE_SEED;
  if (seedCache && existsSync(seedCache)) {
    const seedShaPath = path.join(seedCache, ".sites-lockfile-sha256");
    let seedSha = "";
    try {
      seedSha = readFileSync(seedShaPath, "utf8").trim();
    } catch {
      // no seed hash recorded — treat as a miss
    }
    if (seedSha === lockfileSha256) {
      console.log("[sites] restoring image-seeded npm cache");
      cpSync(seedCache, npmCache, { recursive: true });
      useSeededCache = true;
      console.log("[sites] image cache seed matched; registry fallback remains available");
    } else {
      console.log("[sites] image cache seed does not match this lockfile; using the network path");
    }
  }

  const lockJson = JSON.parse(readFileSync(lockfilePath, "utf8"));
  const vinextPkg = lockJson.packages?.["node_modules/vinext"];
  if (!vinextPkg?.resolved || !vinextPkg?.integrity) {
    console.error("package-lock.json does not contain a resolved, integrity-pinned vinext tarball");
    process.exit(65);
  }
  const lockedTarball = vinextPkg.resolved;
  const lockedIntegrity = vinextPkg.integrity;

  if (!useSeededCache) {
    const { stdout: registry } = await capture("npm", ["config", "get", "registry"], {
      cwd: projectRoot,
      env,
    });

    let preflightUrl;
    try {
      const locked = new URL(lockedTarball);
      const reg = new URL(registry);
      if (locked.hostname === "registry.npmjs.org") {
        locked.protocol = reg.protocol;
        locked.host = reg.host;
        locked.pathname = `${reg.pathname.replace(/\/$/, "")}${locked.pathname}`;
      }
      preflightUrl = locked.href;
    } catch {
      console.error("Could not construct the locked-tarball preflight URL.");
      process.exit(65);
    }

    const preflightDir = path.join(runtimeRoot, "preflight");
    mkdirSync(preflightDir, { recursive: true });
    const preflightTarball = path.join(preflightDir, "vinext.tgz");

    console.log("[sites] downloading the complete locked vinext tarball");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);
    let tarballBuffer;
    try {
      const res = await fetch(preflightUrl, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      tarballBuffer = Buffer.from(await res.arrayBuffer());
      writeFileSync(preflightTarball, tarballBuffer);
    } catch (err) {
      console.error(`Failed to download the locked vinext tarball: ${err.message}`);
      process.exit(1);
    } finally {
      clearTimeout(timeoutId);
    }

    console.log("[sites] verifying locked vinext tarball integrity");
    if (!verifyIntegrity(tarballBuffer, lockedIntegrity)) {
      console.error(`vinext tarball integrity mismatch for ${lockedIntegrity.split("-")[0]}`);
      process.exit(1);
    }
    console.log("[sites] network and integrity preflight passed");
  }

  console.log("[sites] running exactly one bounded npm ci");
  env.NPM_CONFIG_MAXSOCKETS = "1";
  env.NPM_CONFIG_FETCH_RETRIES = "0";
  env.NPM_CONFIG_FETCH_TIMEOUT = "30000";

  const npmCiArgs = ["ci", "--cache", npmCache];
  if (useSeededCache) npmCiArgs.push("--prefer-offline");

  const timeoutMs = parseDuration(process.env.SITES_INSTALL_TIMEOUT, 8 * 60_000);
  const killAfterMs = parseDuration(process.env.SITES_INSTALL_KILL_AFTER, 15_000);

  const { code, timedOut } = await runWithTimeout("npm", npmCiArgs, {
    cwd: projectRoot,
    env,
    timeoutMs,
    killAfterMs,
  });
  if (timedOut) {
    console.error(`npm ci timed out after ${timeoutMs}ms`);
    process.exit(124);
  }
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  const vinextBin = localBin(projectRoot, "vinext");
  if (!existsSync(vinextBin)) {
    console.error("npm ci exited successfully but node_modules/.bin/vinext is unavailable.");
    process.exit(69);
  }

  const installMetaPath = path.join(projectRoot, "node_modules", ".sites-install.json");
  writeFileSync(
    installMetaPath,
    `${JSON.stringify(
      {
        lockfile_sha256: lockfileSha256,
        node: process.version,
        platform: `${process.platform}-${process.arch}`,
      },
      null,
      2
    )}\n`
  );

  console.log("[sites] npm ci passed and vinext is available");
} finally {
  release();
}
