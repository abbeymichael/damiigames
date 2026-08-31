import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const STATIC_MIME_TYPES = {
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".map": "application/json",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

// Install global HTTP server hook to ensure all /assets/ requests are served with
// authoritative MIME types and never fall through to RSC text/plain error responses.
function installStaticAssetServerInterceptor(outDir) {
  const originalCreateServer = http.createServer;
  http.createServer = function (optionsOrHandler, maybeHandler) {
    const originalHandler = typeof optionsOrHandler === "function" ? optionsOrHandler : maybeHandler;

    const wrappedHandler = async (req, res) => {
      const rawUrl = req.url || "/";
      const pathname = rawUrl.split("?")[0];

      // Intercept /assets/ requests
      if (pathname.startsWith("/assets/")) {
        const assetFileName = path.basename(pathname);
        const ext = path.extname(assetFileName).toLowerCase();
        const contentType = STATIC_MIME_TYPES[ext] || "application/octet-stream";

        const candidateLocations = [
          path.join(outDir, "client", "assets", assetFileName),
          path.join(projectRoot, "dist", "client", "assets", assetFileName),
          path.join(projectRoot, "dist", "standalone", "assets", assetFileName),
          path.join(projectRoot, ".vinext", "asset_cache", assetFileName),
          path.join(projectRoot, "public", "assets", assetFileName),
        ];

        for (const candidate of candidateLocations) {
          if (fs.existsSync(candidate)) {
            try {
              const stat = fs.statSync(candidate);
              if (stat.isFile()) {
                res.writeHead(200, {
                  "Content-Type": contentType,
                  "Content-Length": String(stat.size),
                  "Cache-Control": "public, max-age=31536000, immutable",
                  "X-Content-Type-Options": "nosniff",
                });
                if (req.method === "HEAD") {
                  res.end();
                  return;
                }
                const stream = fs.createReadStream(candidate);
                stream.pipe(res);
                return;
              }
            } catch {
              // Try next candidate if read error
            }
          }
        }

        // If not found on disk, prevent RSC 404 text/plain MIME mismatch by returning safe fallback
        if (ext === ".js" || ext === ".mjs") {
          const fallbackJs = `/* Superseded chunk fallback */ export default {};`;
          res.writeHead(200, {
            "Content-Type": "application/javascript; charset=utf-8",
            "Content-Length": String(Buffer.byteLength(fallbackJs)),
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-Content-Type-Options": "nosniff",
          });
          res.end(fallbackJs);
          return;
        }

        if (ext === ".css") {
          const fallbackCss = `/* Superseded CSS fallback */`;
          res.writeHead(200, {
            "Content-Type": "text/css; charset=utf-8",
            "Content-Length": String(Buffer.byteLength(fallbackCss)),
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-Content-Type-Options": "nosniff",
          });
          res.end(fallbackCss);
          return;
        }

        // Other assets: clean 404 with exact MIME type
        res.writeHead(404, {
          "Content-Type": contentType,
          "X-Content-Type-Options": "nosniff",
        });
        res.end();
        return;
      }

      if (typeof originalHandler === "function") {
        return originalHandler(req, res);
      }
    };

    if (typeof optionsOrHandler === "function") {
      return originalCreateServer.call(this, wrappedHandler);
    }
    return originalCreateServer.call(this, optionsOrHandler, wrappedHandler);
  };
}

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

  // Determine build output directory: check dist/ or projectRoot
  let outDir = path.join(projectRoot, "dist");
  if (!fs.existsSync(path.join(outDir, "server", "index.js")) && !fs.existsSync(path.join(outDir, "server", "entry.js"))) {
    if (fs.existsSync(path.join(projectRoot, "server", "index.js")) || fs.existsSync(path.join(projectRoot, "server", "entry.js"))) {
      outDir = projectRoot;
    }
  }

  // Install authoritative static asset interceptor to guard all static routes
  installStaticAssetServerInterceptor(outDir);

  // 1. Primary: Run in-process via vinext prod server.
  // CRITICAL for Phusion Passenger / cPanel / LiteSpeed: Passenger intercepts the main process's http.createServer().listen()
  const prodServerModulePath = path.join(projectRoot, "node_modules", "vinext", "dist", "server", "prod-server.js");
  if (fs.existsSync(prodServerModulePath)) {
    try {
      const { startProdServer } = await import(pathToFileURL(prodServerModulePath).href);
      await startProdServer({
        port: serverPort,
        host,
        outDir,
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


