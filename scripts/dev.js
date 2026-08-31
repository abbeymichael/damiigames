import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// Auto-load .env files into process.env before starting child dev process
function loadEnvFromFiles() {
  const envFiles = [".env", ".env.local", ".env.development", ".env.development.local"];
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
        if (process.env[key] === undefined || process.env[key] === "") {
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
    console.log("[damii] vinext CLI not found, installing dependencies...");
    spawnSync("npm", ["install"], { cwd: projectRoot, stdio: "inherit" });
    try {
      vinextCli = require.resolve("vinext/dist/cli.js", { paths: [projectRoot] });
    } catch {
      vinextCli = path.join(projectRoot, "node_modules", "vinext", "dist", "cli.js");
    }
  }
}

const args = process.argv.slice(2);
const nextArgs = ["dev"];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--host") {
    nextArgs.push("-H");
    if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
      nextArgs.push(args[++i]);
    }
  } else if (arg.startsWith("--host=")) {
    nextArgs.push("-H", arg.slice(7));
  } else {
    nextArgs.push(arg);
  }
}

if (!nextArgs.includes("-p") && !nextArgs.includes("--port")) {
  nextArgs.push("-p", "3000");
}

if (!nextArgs.includes("-H") && !nextArgs.includes("--host")) {
  nextArgs.push("-H", "0.0.0.0");
}

const child = spawn(process.execPath, [vinextCli, ...nextArgs], {
  stdio: "inherit",
  cwd: projectRoot,
  env: process.env,
});

process.on("SIGINT", () => {
  if (!child.killed) child.kill("SIGINT");
});

process.on("SIGTERM", () => {
  if (!child.killed) child.kill("SIGTERM");
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

