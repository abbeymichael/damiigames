import { getDb } from "@/lib/db/mysql-connection";

const noOp = {
  findMany: async () => [],
  findFirst: async () => null,
  findUnique: async () => null,
  create: async (d: any) => d?.data ?? {},
  update: async (d: any) => d?.data ?? {},
  delete: async () => ({}),
};

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop, receiver) {
    try {
      const realDb = getDb();
      const val = Reflect.get(realDb, prop, receiver);
      if (typeof val === "function") {
        return val.bind(realDb);
      }
      return val;
    } catch {
      if (prop === "query") {
        return new Proxy({}, { get: () => noOp });
      }
      return async () => [];
    }
  },
});
