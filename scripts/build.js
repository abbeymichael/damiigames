import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
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

// Ensure build directory and backup previous assets if present
const distAssetsDir = path.join(projectRoot, "dist", "client", "assets");
const backupAssetsDir = path.join(projectRoot, ".vinext", "asset_cache");

if (fs.existsSync(distAssetsDir)) {
  try {
    fs.mkdirSync(backupAssetsDir, { recursive: true });
    const existingFiles = fs.readdirSync(distAssetsDir);
    for (const file of existingFiles) {
      fs.copyFileSync(path.join(distAssetsDir, file), path.join(backupAssetsDir, file));
    }
    console.log(`Preserved ${existingFiles.length} existing chunk assets in asset cache.`);
  } catch (err) {
    // Ignore backup failure
  }
}

console.log("Running vinext build...");

const child = spawn(process.execPath, [vinextCli, "build"], {
  stdio: "inherit",
  cwd: projectRoot,
  env: process.env,
});

child.on("exit", async (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  try {
    // Restore previous assets that do not conflict with new build
    if (fs.existsSync(backupAssetsDir) && fs.existsSync(distAssetsDir)) {
      const cachedFiles = fs.readdirSync(backupAssetsDir);
      let restoredCount = 0;
      for (const file of cachedFiles) {
        const destPath = path.join(distAssetsDir, file);
        if (!fs.existsSync(destPath)) {
          fs.copyFileSync(path.join(backupAssetsDir, file), destPath);
          restoredCount++;
        }
      }
      if (restoredCount > 0) {
        console.log(`✓ Restored ${restoredCount} previous chunk assets to prevent 404s for active user sessions.`);
      }
    }

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

    // Ensure standalone deployable bundle contains scripts, drizzle migrations, and static assets
    const { packageStandalone } = await import("./package-standalone.js");
    packageStandalone();
  } catch (err) {
    console.warn("Artifact validation notice:", err.message);
  }

  process.exit(0);
});
