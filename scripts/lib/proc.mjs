import { spawn } from "node:child_process";
import path from "node:path";

const isWindows = process.platform === "win32";

/**
 * Run a command, streaming stdio to the parent. Resolves with { code, signal }.
 * On Windows this shells out so .cmd/.ps1 shims (eslint.cmd, vinext.cmd, ...)
 * resolve the same way `npm run` would resolve them.
 */
export function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: isWindows,
      ...opts,
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => resolve({ code, signal }));
  });
}

/** Same as run(), but captures stdout/stderr instead of inheriting them. */
export function capture(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: isWindows,
      ...opts,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("exit", (code, signal) => resolve({ code, signal, stdout: stdout.trim(), stderr: stderr.trim() }));
  });
}

/**
 * Run a command with a soft timeout (SIGTERM) followed by a hard kill
 * (SIGKILL) after killAfterMs, mirroring `timeout --signal=TERM --kill-after`.
 * Windows has no signal semantics, so child.kill() there just terminates
 * the process tree as best Node can.
 */
export function runWithTimeout(cmd, args, { timeoutMs, killAfterMs = 10000, ...opts } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: isWindows,
      ...opts,
    });

    let timedOut = false;
    let killTimer = null;
    const softTimer = timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGTERM");
          killTimer = setTimeout(() => {
            try {
              child.kill("SIGKILL");
            } catch {
              // process may already be gone
            }
          }, killAfterMs);
        }, timeoutMs)
      : null;

    child.on("error", (err) => {
      if (softTimer) clearTimeout(softTimer);
      if (killTimer) clearTimeout(killTimer);
      reject(err);
    });
    child.on("exit", (code, signal) => {
      if (softTimer) clearTimeout(softTimer);
      if (killTimer) clearTimeout(killTimer);
      resolve({ code, signal, timedOut });
    });
  });
}

/** Parses durations like "3m", "10s", "500ms", or a bare number of ms. */
export function parseDuration(value, fallbackMs) {
  if (!value) return fallbackMs;
  const match = /^(\d+)\s*(ms|s|m|h)?$/.exec(String(value).trim());
  if (!match) return fallbackMs;
  const num = Number(match[1]);
  const unit = match[2] || "s";
  const multiplier = { ms: 1, s: 1000, m: 60_000, h: 3_600_000 }[unit];
  return num * multiplier;
}

/** Path to a locally-installed bin, with the right extension per platform. */
export function localBin(projectRoot, name) {
  return path.join(projectRoot, "node_modules", ".bin", isWindows ? `${name}.cmd` : name);
}
