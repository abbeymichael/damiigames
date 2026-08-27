import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// Auto-load .env files into process.env before starting any child server process
function loadEnvFromFiles() {
  const envFiles = [".env", ".env.local", ".env.production", ".env.production.local"];
  for (const file of envFiles) {
    const fullPath = path.join(projectRoot, file);
    if (!fs.existsSync(fullPath)) continue;
    try {
      const contents = fs.readFileSync(fullPath, "utf8");
      for (const rawLine of contents.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        if (!key) continue;
        let value = line.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
          (value.startsWith("'") && value.endsWith("'") && value.length > 1)
        ) {
          value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    } catch {
      // Ignore read errors
    }
  }
}

loadEnvFromFiles();

let vinextCli = path.join(projectRoot, "node_modules", "vinext", "dist", "cli.js");

if (!fs.existsSync(vinextCli)) {
  try {
    vinextCli = require.resolve("vinext/dist/cli.js", { paths: [projectRoot] });
  } catch {
    // If not found, will check dependencies
  }
}

async function startApplication() {
  const args = process.argv.slice(2);
  let port = process.env.PORT || "3000";
  let host = process.env.HOST || "0.0.0.0";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-p" || arg === "--port") {
      if (i + 1 < args.length) port = args[++i];
    } else if (arg.startsWith("-p=")) {
      port = arg.slice(3);
    } else if (arg.startsWith("--port=")) {
      port = arg.slice(7);
    } else if (arg === "-H" || arg === "--host") {
      if (i + 1 < args.length) host = args[++i];
    } else if (arg.startsWith("-H=")) {
      host = arg.slice(3);
    } else if (arg.startsWith("--host=")) {
      host = arg.slice(7);
    }
  }

  // Handle port: numeric integer OR socket path string (e.g. Passenger socket)
  const isNumericPort = !isNaN(Number(port));
  const serverPort = isNumericPort ? parseInt(port, 10) : port;

  // 1. Primary: Run in-process via vinext prod server.
  // CRITICAL for Phusion Passenger / cPanel / LiteSpeed: Passenger intercepts the main process's http.createServer().listen()
  const prodServerModulePath = path.join(projectRoot, "node_modules", "vinext", "dist", "server", "prod-server.js");
  if (fs.existsSync(prodServerModulePath)) {
    try {
      const { startProdServer } = await import(pathToFileURL(prodServerModulePath).href);
      await startProdServer({
        port: serverPort,
        host,
        outDir: path.join(projectRoot, "dist"),
      });
      return;
    } catch (err) {
      console.warn("[damii] In-process production server launch notice:", err.message);
    }
  }

  // 2. Fallback: Standalone Next.js server (.next/standalone/server.js)
  const standaloneServer = path.join(projectRoot, ".next", "standalone", "server.js");
  if (fs.existsSync(standaloneServer)) {
    console.log("[damii] Launching standalone server (.next/standalone/server.js)...");
    await import(pathToFileURL(standaloneServer).href);
    return;
  }

  // 3. Fallback: Standalone binary spawn
  if (fs.existsSync(vinextCli)) {
    const nextArgs = ["start", "-p", String(port), "-H", host];
    const child = spawn(process.execPath, [vinextCli, ...nextArgs], {
      stdio: "inherit",
      cwd: projectRoot,
      env: process.env,
    });
    process.on("SIGINT", () => { if (!child.killed) child.kill("SIGINT"); });
    process.on("SIGTERM", () => { if (!child.killed) child.kill("SIGTERM"); });
    child.on("exit", (code) => { process.exit(code ?? 0); });
  } else {
    console.error("\n❌ [damii error] Production dependencies are not installed in node_modules.");
    console.error("👉 If you are using cPanel Node.js Application Manager:");
    console.error("   1. Go to 'Setup Node.js App' in cPanel.");
    console.error("   2. Click the 'Run NPM Install' button.");
    console.error("   3. Or open cPanel Terminal and run: npm install\n");
    process.exit(1);
  }
}

startApplication().catch((err) => {
  console.error("❌ [damii error] Server initialization failed:", err);
  process.exit(1);
});


