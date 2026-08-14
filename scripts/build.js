import {
  spawn
} from "node:child_process";
import path from "node:path";
import {
  fileURLToPath
} from "node:url";

const __dirname = path.dirname(fileURLToPath(
  import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const vinextCli = path.join(projectRoot, "node_modules", "vinext", "dist", "cli.js");

console.log("Running vinext build (standalone Node target)...");

const child = spawn(process.execPath, [vinextCli, "build"], {
  stdio: "inherit",
  cwd: projectRoot,
  env: process.env,
});

child.on("exit", (code) => {
  const exitCode = code === null ? 1 : code;
  process.exit(exitCode);
});
