import * as schema from "./schema";

export function getDb() {
  let env: Record<string, unknown> | null = null;
  try {
    // @ts-ignore
    env = require("cloudflare:workers")?.env;
  } catch {}

  if (!env || !env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable."
    );
  }

  // @ts-ignore
  return drizzle(env.DB, { schema });
}
