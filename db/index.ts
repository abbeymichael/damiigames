import { getDb, type DamiiDb } from "@/lib/db/mysql-connection";
import * as schema from "./schema.mysql";

export { getDb, schema };
export type { DamiiDb };
export default getDb;
