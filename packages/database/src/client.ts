import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

import * as schema from "./schema/index.js";

export type TraceworkDatabase = NodePgDatabase<typeof schema>;

export interface DatabaseClient {
  readonly db: TraceworkDatabase;
  readonly pool: Pool;
  close(): Promise<void>;
}

export function createDatabaseClient(config: PoolConfig | string): DatabaseClient {
  const pool = new Pool(typeof config === "string" ? { connectionString: config } : config);
  const db = drizzle(pool, { schema, casing: "snake_case" });
  return {
    db,
    pool,
    async close() {
      await pool.end();
    },
  };
}
