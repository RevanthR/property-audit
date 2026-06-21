import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = neon(url);
  return drizzle(sql, { schema });
}

// Lazy singleton — only instantiated on first request
let _db: ReturnType<typeof getDb> | null = null;

export function getDatabase() {
  if (!_db) _db = getDb();
  return _db;
}

// Convenience proxy so existing `import { db }` calls still work
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getDatabase() as any)[prop];
  },
});

export * from "./schema";
