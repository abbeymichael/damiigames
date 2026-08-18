#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setupSitesEnv, projectRoot } from "./lib/env.mjs";

setupSitesEnv();

const worker = path.join(projectRoot, "dist", "server", "index.js");
const hosting = path.join(projectRoot, "dist", ".openai", "hosting.json");

if (!existsSync(worker)) {
  console.error("Missing Sites Worker entry: dist/server/index.js");
  process.exit(66);
}
if (!existsSync(hosting)) {
  console.error("Missing packaged Sites manifest: dist/.openai/hosting.json");
  process.exit(66);
}

JSON.parse(readFileSync(hosting, "utf8"));

const workerUrl = pathToFileURL(worker);
workerUrl.searchParams.set("sites-validation", `${process.pid}-${Date.now()}`);
const workerModule = await import(workerUrl.href);
if (!workerModule.default || typeof workerModule.default.fetch !== "function") {
  throw new Error("dist/server/index.js must have an ESM default export with fetch(request, env, ctx)");
}

console.log("Validated Sites artifact: ESM Worker default.fetch and hosting manifest are present.");
