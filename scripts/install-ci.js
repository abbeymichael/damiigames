import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

console.log("[sites] Running npm install...");

const child = spawn(npmCmd, ["install"], {
  stdio: "inherit",
  cwd: projectRoot,
  env: process.env,
});

child.on("exit", (code) => {
  if (code === 0) {
    console.log("[sites] npm install completed successfully.");
  }
  process.exit(code ?? 0);
});
