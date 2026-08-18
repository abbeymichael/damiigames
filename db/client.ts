import { getDb } from "@/lib/db/mysql-connection";

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop, receiver) {
    const realDb = getDb();
    const val = Reflect.get(realDb, prop, receiver);
    if (typeof val === "function") {
      return val.bind(realDb);
    }
    return val;
  },
});
