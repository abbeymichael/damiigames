import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Smoke test for the plain-Node production artifact.
 *
 * The project no longer ships a Cloudflare Worker entry, so instead of
 * importing `dist/server/index.js` and calling `worker.fetch` we boot the
 * real production server (`npm run start`) and assert over HTTP.
 *
 * DAMII is MySQL-only (no JSON/SQLite fallback), so the test database must
 * exist before this suite runs:
 *
 *   mysql -e "CREATE DATABASE IF NOT EXISTS damii_test"
 *   DATABASE_URL=mysql://root@127.0.0.1:3306/damii_test npm run db:migrate
 *   DATABASE_URL=mysql://root@127.0.0.1:3306/damii_test npm test
 *
 * When no MySQL server is reachable the suite is skipped (not failed), so
 * environments without a database can still lint/typecheck/build.
 */

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.TEST_PORT || 3111);
const BASE_URL = `http://127.0.0.1:${PORT}`;

/** Resolves the MySQL host/port from DATABASE_URL or the MYSQL_* defaults. */
function resolveMysqlTarget() {
  const url = process.env.DATABASE_URL || "";
  if (/^mysql(2)?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      return { host: parsed.hostname || "127.0.0.1", port: Number(parsed.port || 3306) };
    } catch {
      /* fall through to defaults */
    }
  }
  return {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
  };
}

function mysqlReachable({ host, port }, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

let child;
let skipSuite = false;

async function waitForServer(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/`, { headers: { accept: "text/html" } });
      if (res.status > 0) return;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not become ready on ${BASE_URL} within ${timeoutMs}ms`);
}

before(async (t) => {
  const target = resolveMysqlTarget();
  if (!(await mysqlReachable(target))) {
    skipSuite = true;
    t.diagnostic(`MySQL unreachable at ${target.host}:${target.port} — skipping HTTP smoke suite`);
    return;
  }

  child = spawn(process.execPath, [path.join(projectRoot, "scripts", "start.js"), "-p", String(PORT)], {
    cwd: projectRoot,
    stdio: "ignore",
    env: {
      ...process.env,
      NODE_ENV: "production",
      DATABASE_DIALECT: "mysql",
      SESSION_COOKIE_SECURE: "false",
      ADMIN_SECRET_KEY: process.env.ADMIN_SECRET_KEY || "test-admin-secret-key-1234567890",
    },
  });
  await waitForServer();
});

after(() => {
  if (child && !child.killed) child.kill("SIGTERM");
});

function requireServer(t) {
  if (skipSuite) {
    t.skip("MySQL is not reachable — see file header for test database setup");
    return false;
  }
  return true;
}

test("serves the landing page as HTML", async (t) => {
  if (!requireServer(t)) return;
  const res = await fetch(`${BASE_URL}/`, { headers: { accept: "text/html" } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await res.text();
  assert.match(html, /<html/i);
  assert.match(html, /DAMII/i);
});

test("applies baseline security headers", async (t) => {
  if (!requireServer(t)) return;
  const res = await fetch(`${BASE_URL}/`, { headers: { accept: "text/html" } });
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.ok(res.headers.get("referrer-policy"));
});

test("renders the arena route", async (t) => {
  if (!requireServer(t)) return;
  const res = await fetch(`${BASE_URL}/arena`, { headers: { accept: "text/html" } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /^text\/html\b/i);
});

test("auth API rejects invalid credentials without leaking details", async (t) => {
  if (!requireServer(t)) return;
  const res = await fetch(`${BASE_URL}/api/auth`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "login", username: "definitely-not-a-user", passcode: "wrong-pass" }),
  });
  assert.ok(res.status === 400 || res.status === 401 || res.status === 403, `unexpected status ${res.status}`);
  const body = await res.json().catch(() => ({}));
  assert.ok(!("passcode" in body));
  assert.ok(!("passwordSalt" in body));
});
