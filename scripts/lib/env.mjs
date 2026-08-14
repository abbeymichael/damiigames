import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(__dirname, "..", "..");

/**
 * Sets up the sandboxed runtime environment (HOME, npm cache, wrangler
 * paths, etc.) and returns both the resolved paths and an env object to
 * pass to child processes. Works on Windows, macOS, and Linux.
 */
export function setupSitesEnv() {
  const runtimeRoot = process.env.SITES_RUNTIME_ROOT
    ? path.resolve(process.env.SITES_RUNTIME_ROOT)
    : path.join(projectRoot, ".sites-runtime");

  const home = path.join(runtimeRoot, "home");
  const npmCache = path.join(runtimeRoot, "npm-cache");
  const xdgConfig = path.join(runtimeRoot, "xdg-config");
  const tmp = path.join(runtimeRoot, "tmp");
  const wranglerDir = path.join(runtimeRoot, "wrangler");
  const wranglerLogs = path.join(wranglerDir, "logs");
  const wranglerRegistry = path.join(wranglerDir, "registry");

  for (const dir of [home, npmCache, xdgConfig, tmp, wranglerLogs]) {
    mkdirSync(dir, { recursive: true });
  }

  const env = { ...process.env };
  env.SITES_ENV_READY = "1";
  env.SITES_PROJECT_ROOT = projectRoot;

  env.HOME = home;
  // Windows tooling looks at USERPROFILE (and sometimes HOMEDRIVE/HOMEPATH)
  // rather than HOME. Set both so anything shelling out respects the sandbox.
  env.USERPROFILE = home;

  env.XDG_CONFIG_HOME = xdgConfig;

  env.TMPDIR = tmp;
  env.TEMP = tmp;
  env.TMP = tmp;

  env.WRANGLER_WRITE_LOGS = "false";
  env.WRANGLER_LOG_PATH = wranglerLogs;
  env.MINIFLARE_REGISTRY_PATH = wranglerRegistry;

  // Keep this project's writable cache authoritative over any global/image
  // seed the runtime might otherwise supply.
  delete env.NPM_CONFIG_CACHE;
  delete env.npm_config_cache;
  env.npm_config_cache = npmCache;
  env.npm_config_audit = "false";
  env.npm_config_fund = "false";
  env.npm_config_update_notifier = "false";

  for (const key of [
    "npm_config_proxy",
    "npm_config_http_proxy",
    "npm_config_https_proxy",
    "NPM_CONFIG_PROXY",
    "NPM_CONFIG_HTTP_PROXY",
    "NPM_CONFIG_HTTPS_PROXY",
  ]) {
    delete env[key];
  }

  return { runtimeRoot, home, npmCache, xdgConfig, tmp, wranglerDir, wranglerLogs, wranglerRegistry, env };
}
