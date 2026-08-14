import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const vinextCli = path.join(projectRoot, "node_modules", "vinext", "dist", "cli.js");

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
  nextArgs.push("-p", "3000");
}

const child = spawn(process.execPath, [vinextCli, ...nextArgs], {
  stdio: "inherit",
  cwd: projectRoot,
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

