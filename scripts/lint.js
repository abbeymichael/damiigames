import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const eslintCli = path.join(projectRoot, "node_modules", "eslint", "bin", "eslint.js");

const child = spawn(process.execPath, [eslintCli, ".", "--ignore-pattern", "dist", "--ignore-pattern", ".next"], {
  stdio: "inherit",
  cwd: projectRoot,
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
