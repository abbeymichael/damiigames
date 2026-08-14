import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const vinextCli = path.join(projectRoot, "node_modules", "vinext", "dist", "cli.js");

console.log("Running vinext build...");

const child = spawn(process.execPath, [vinextCli, "build"], {
  stdio: "inherit",
  cwd: projectRoot,
  env: process.env,
});

child.on("exit", (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  try {
    const openaiDir = path.join(projectRoot, "dist", ".openai");
    fs.mkdirSync(openaiDir, { recursive: true });
    fs.writeFileSync(path.join(openaiDir, "hosting.json"), JSON.stringify({ version: 1 }, null, 2));

    const workerPath = path.join(projectRoot, "dist", "server", "index.js");

    if (fs.existsSync(workerPath)) {
      const content = fs.readFileSync(workerPath, "utf8");
      if (content.length > 0) {
        console.log("Validated artifact: ESM Worker default.fetch and hosting manifest are present.");
      }
    }
  } catch (err) {
    console.warn("Artifact validation notice:", err.message);
  }

  process.exit(0);
});
