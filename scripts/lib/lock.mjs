import { mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Cross-platform substitute for `flock`. Directory creation is atomic on
 * every OS Node supports, so mkdir-if-absent works as a simple advisory
 * lock without needing a POSIX-only syscall. Returns a release() function,
 * or null if the lock is already held by a live process.
 *
 * NOTE: this only protects against overlapping runs of this same script
 * (e.g. two `npm run install:ci` invocations). Unlike the original bash
 * version's /proc scan, it cannot detect an unrelated `npm ci` started by
 * hand in another terminal — there's no cross-platform way to inspect
 * another process's command line and cwd the way /proc allowed on Linux.
 */
export function acquireLock(lockDir, { staleMs = 30 * 60 * 1000 } = {}) {
  const infoPath = path.join(lockDir, "info.json");

  try {
    mkdirSync(lockDir);
  } catch (err) {
    if (err.code !== "EEXIST") throw err;

    let info = null;
    try {
      info = JSON.parse(readFileSync(infoPath, "utf8"));
    } catch {
      // missing/corrupt info file — treat as stale below
    }

    const age = info?.timestamp ? Date.now() - info.timestamp : Infinity;
    if (age <= staleMs) {
      return null; // still held
    }

    // Stale lock (e.g. left behind by a crashed process) — reclaim it.
    rmSync(lockDir, { recursive: true, force: true });
    mkdirSync(lockDir);
  }

  writeFileSync(infoPath, JSON.stringify({ pid: process.pid, timestamp: Date.now() }));

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try {
      rmSync(lockDir, { recursive: true, force: true });
    } catch {
      // best effort
    }
  };

  process.on("exit", release);
  return release;
}
