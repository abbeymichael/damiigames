import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export async function sha256File(filePath) {
  const buf = await readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

export function verifyIntegrity(buffer, integrity) {
  const [algorithm, expected] = String(integrity).split("-", 2);
  if (!algorithm || !expected) {
    throw new Error(`unsupported integrity value: ${integrity}`);
  }
  const actual = createHash(algorithm).update(buffer).digest("base64");
  return actual === expected;
}
