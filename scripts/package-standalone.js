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

  // Read root package.json for dependencies and metadata
  const rootPkgPath = path.join(projectRoot, "package.json");
  let rootPkg = {};
  if (fs.existsSync(rootPkgPath)) {
    try {
      rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
    } catch {
      // fallback
    }
  }

  // Find all possible standalone target locations
  const standaloneBase = path.join(projectRoot, ".next", "standalone");
  const targetDirs = new Set();

  if (fs.existsSync(standaloneBase)) {
    targetDirs.add(standaloneBase);

    // Next.js often creates a subdirectory inside .next/standalone matching the package name or folder name
    for (const item of fs.readdirSync(standaloneBase)) {
      const subPath = path.join(standaloneBase, item);
      if (fs.statSync(subPath).isDirectory() && item !== "node_modules" && item !== ".next" && item !== "public") {
        targetDirs.add(subPath);
      }
    }
  }

  // Also include dist/standalone if created
  const distDir = path.join(projectRoot, "dist", "standalone");
  if (targetDirs.size === 0) {
    fs.mkdirSync(distDir, { recursive: true });
    targetDirs.add(distDir);
  }

  for (const targetDir of targetDirs) {
    console.log(`▸ Preparing deploy target: ${path.relative(projectRoot, targetDir) || "standalone root"}`);

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

    // 4. Copy Build Outputs (dist/client and dist/server)
    const distClientSrc = path.join(projectRoot, "dist", "client");
    const distServerSrc = path.join(projectRoot, "dist", "server");
    const distClientDest = path.join(targetDir, "dist", "client");
    const distServerDest = path.join(targetDir, "dist", "server");

    if (fs.existsSync(distClientSrc) && targetDir !== path.join(projectRoot, "dist")) {
      copyRecursiveSync(distClientSrc, distClientDest);
      console.log("  ✓ Bundled client assets & scripts (dist/client/)");
      
      // Also copy client assets to top-level assets/ so Apache/LiteSpeed/Nginx can serve them directly
      const assetsSrc = path.join(distClientSrc, "assets");
      const assetsDest = path.join(targetDir, "assets");
      if (fs.existsSync(assetsSrc)) {
        copyRecursiveSync(assetsSrc, assetsDest);
        console.log("  ✓ Bundled direct static assets (assets/)");
      }
    }

    if (fs.existsSync(distServerSrc) && targetDir !== path.join(projectRoot, "dist")) {
      copyRecursiveSync(distServerSrc, distServerDest);
      console.log("  ✓ Bundled server bundle (dist/server/)");
    }

    // 5. Copy Next.js Static Assets (if present)
    const staticSrc = path.join(projectRoot, ".next", "static");
    const staticDest = path.join(targetDir, ".next", "static");
    if (fs.existsSync(staticSrc)) {
      copyRecursiveSync(staticSrc, staticDest);
      console.log("  ✓ Bundled Next.js static files (.next/static/)");
    }

    // Also copy static assets to .next/static inside standalone if needed
    const nestedStaticDest = path.join(targetDir, "damii-game", ".next", "static");
    if (fs.existsSync(path.join(targetDir, "damii-game")) && fs.existsSync(staticSrc)) {
      copyRecursiveSync(staticSrc, nestedStaticDest);
    }

    // 6. Copy Shared Hosting Server Entries & Configs
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

    // Ensure .htaccess exists in standalone
    const htaccessDest = path.join(targetDir, ".htaccess");
    if (!fs.existsSync(htaccessDest) && fs.existsSync(path.join(projectRoot, ".htaccess.example"))) {
      fs.copyFileSync(path.join(projectRoot, ".htaccess.example"), htaccessDest);
      console.log("  ✓ Generated default .htaccess for Apache / Phusion Passenger");
    }

    // 6. Generate Complete, Production-Ready package.json
    // Next.js generates a barebones 4-line package.json by default.
    // We enhance it with full production dependencies, engines, and operational scripts.
    const standalonePkg = {
      name: rootPkg.name || "damii-game",
      version: rootPkg.version || "1.0.0",
      description: "DAMII - Ghanaian Checkers Web Application (Production Standalone Bundle)",
      private: true,
      type: "module",
      main: "server.js",
      engines: rootPkg.engines || {
        node: ">=20.0.0",
      },
      scripts: {
        start: "node server.js",
        "start:next": "node .next/standalone/server.js",
        "db:migrate": "node scripts/db-migrate.js",
        seed: "node scripts/seed.js",
        "env:check": "node scripts/check-env.js",
        "db:push": "node scripts/db-generate.js --push",
      },
      dependencies: {
        ...(rootPkg.dependencies || {}),
      },
    };

    const targetPkgPath = path.join(targetDir, "package.json");
    fs.writeFileSync(targetPkgPath, JSON.stringify(standalonePkg, null, 2) + "\n");
    console.log("  ✓ Generated complete standalone package.json with full dependencies and operational scripts");
  }

  console.log("✅ Standalone packaging complete! Everything is ready for shared hosting deployment.");
}

// Run directly if invoked as CLI script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  packageStandalone();
}
