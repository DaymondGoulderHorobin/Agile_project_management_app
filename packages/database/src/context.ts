import { sql } from "drizzle-orm";

import type { TraceworkDatabase } from "./client.js";

export interface TenantTransactionContext {
  readonly organisationId: string;
  readonly actorId: string;
  readonly permissionContextId: string;
  readonly correlationId?: string;
}

/**
 * RLS settings are deliberately transaction-scoped. Never set tenant context on
 * a pooled session outside this wrapper.
 */
export async function withTenantTransaction<T>(
  db: TraceworkDatabase,
  context: TenantTransactionContext,
  work: (tx: Parameters<Parameters<TraceworkDatabase["transaction"]>[0]>[0]) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.organisation_id', ${context.organisationId}, true)`);
    await tx.execute(sql`select set_config('app.actor_id', ${context.actorId}, true)`);
    await tx.execute(
      sql`select set_config('app.permission_context_id', ${context.permissionContextId}, true)`,
    );
    if (context.correlationId) {
      await tx.execute(sql`select set_config('app.correlation_id', ${context.correlationId}, true)`);
    }
    return work(tx);
  });
}
