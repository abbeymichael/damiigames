import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

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
const nextArgs = ["start"];

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
  const port = process.env.PORT || "3000";
  nextArgs.push("-p", String(port));
}

if (!nextArgs.includes("-H") && !nextArgs.includes("--host")) {
  const host = process.env.HOST || "0.0.0.0";
  nextArgs.push("-H", host);
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

