#!/usr/bin/env node
/**
 * Standalone & Shared Hosting Packager for DAMII.
 *
 * Ensures that when Next.js builds the standalone artifact (`.next/standalone`),
 * all operational scripts, Drizzle database migrations, public assets, and
 * Passenger/cPanel startup files are bundled into the deployable artifact.
 *
 * Usage:
 *   node scripts/package-standalone.js
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;

  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const child of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    }
  } else {
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

export function packageStandalone() {
  console.log("📦 Packaging DAMII for Standalone & Shared Hosting Deployment...");

  const standaloneCandidates = [
    path.join(projectRoot, ".next", "standalone"),
    path.join(projectRoot, ".next", "standalone", "damii-game"),
  ];

  let standaloneDir = null;
  for (const candidate of standaloneCandidates) {
    if (fs.existsSync(candidate)) {
      standaloneDir = candidate;
      break;
    }
  }

  // If .next/standalone doesn't exist yet, we can also prepare a dedicated dist/deployable artifact
  const targetDir = standaloneDir || path.join(projectRoot, "dist", "standalone");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log(`▸ Target deploy directory: ${path.relative(projectRoot, targetDir)}`);

  // 1. Copy Drizzle Migrations
  const drizzleSrc = path.join(projectRoot, "drizzle");
  const drizzleDest = path.join(targetDir, "drizzle");
  if (fs.existsSync(drizzleSrc)) {
    copyRecursiveSync(drizzleSrc, drizzleDest);
    console.log("  ✓ Bundled database migrations (drizzle/)");
  }

  // 2. Copy Operational Scripts
  const scriptsSrc = path.join(projectRoot, "scripts");
  const scriptsDest = path.join(targetDir, "scripts");
  if (fs.existsSync(scriptsSrc)) {
    copyRecursiveSync(scriptsSrc, scriptsDest);
    console.log("  ✓ Bundled maintenance & migration scripts (scripts/)");
  }

  // 3. Copy Public Directory
  const publicSrc = path.join(projectRoot, "public");
  const publicDest = path.join(targetDir, "public");
  if (fs.existsSync(publicSrc)) {
    copyRecursiveSync(publicSrc, publicDest);
    console.log("  ✓ Bundled public assets (public/)");
  }

  // 4. Copy Next.js Static Assets if present
  const staticSrc = path.join(projectRoot, ".next", "static");
  const staticDest = path.join(targetDir, ".next", "static");
  if (fs.existsSync(staticSrc)) {
    copyRecursiveSync(staticSrc, staticDest);
    console.log("  ✓ Bundled Next.js static files (.next/static/)");
  }

  // 5. Copy Shared Hosting Server Entries & Configs
  const filesToCopy = [
    "server.js",
    "app.js",
    "ecosystem.config.cjs",
    ".htaccess.example",
    ".env.example",
  ];

  for (const file of filesToCopy) {
    const srcFile = path.join(projectRoot, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, path.join(targetDir, file));
    }
  }

  // Also ensure .htaccess exists in standalone
  const htaccessDest = path.join(targetDir, ".htaccess");
  if (!fs.existsSync(htaccessDest) && fs.existsSync(path.join(projectRoot, ".htaccess.example"))) {
    fs.copyFileSync(path.join(projectRoot, ".htaccess.example"), htaccessDest);
    console.log("  ✓ Generated default .htaccess for Apache / Phusion Passenger");
  }

  // 6. Generate or update package.json inside targetDir
  const targetPkgPath = path.join(targetDir, "package.json");
  let pkgData = {
    name: "damii-game-standalone",
    version: "1.0.0",
    private: true,
    type: "module",
    scripts: {},
  };

  if (fs.existsSync(targetPkgPath)) {
    try {
      pkgData = JSON.parse(fs.readFileSync(targetPkgPath, "utf8"));
    } catch {
      // keep fallback
    }
  }

  pkgData.type = "module";
  pkgData.scripts = {
    ...(pkgData.scripts || {}),
    start: "node server.js",
    "db:migrate": "node scripts/db-migrate.js",
    seed: "node scripts/seed.js",
    "env:check": "node scripts/check-env.js",
  };

  fs.writeFileSync(targetPkgPath, JSON.stringify(pkgData, null, 2));
  console.log("  ✓ Configured standalone package.json with db:migrate, seed, and start scripts");

  console.log("✅ Standalone packaging complete! The folder contains all scripts, migrations, and assets ready for shared hosting.");
}

// Run directly if invoked as CLI script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  packageStandalone();
}
