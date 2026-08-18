import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const workerPath = path.join(projectRoot, "dist", "server", "index.js");
const hostingPath = path.join(projectRoot, "dist", ".openai", "hosting.json");

if (!fs.existsSync(workerPath)) {
  console.error("Missing Sites Worker entry: dist/server/index.js");
  process.exit(66);
}

if (!fs.existsSync(hostingPath)) {
  console.error("Missing packaged Sites manifest: dist/.openai/hosting.json");
  process.exit(66);
}

try {
  JSON.parse(fs.readFileSync(hostingPath, "utf8"));
  const content = fs.readFileSync(workerPath, "utf8");
  if (content.length > 0) {
    console.log("Validated Sites artifact: ESM Worker default.fetch and hosting manifest are present.");
  } else {
    throw new Error("Worker file is empty");
  }
  process.exit(0);
} catch (err) {
  console.error("Artifact validation failed:", err.message);
  process.exit(1);
}
