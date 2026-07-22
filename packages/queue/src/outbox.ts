import type { JobPublisher, PublishOptions } from "./queue.js";
import type { QueueEnvelope } from "./jobs.js";

export type PendingOutboxMessage = Readonly<{
  id: string;
  envelope: QueueEnvelope;
  job: PublishOptions;
}>;

export interface OutboxLease {
  take(limit: number, leaseOwner: string, leaseMilliseconds: number): Promise<readonly PendingOutboxMessage[]>;
  markPublished(id: string, leaseOwner: string): Promise<void>;
  markFailed(id: string, leaseOwner: string, error: string): Promise<void>;
}

export type RelayResult = Readonly<{ published: number; failed: number }>;

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n\t]/gu, " ").slice(0, 500);
}

export async function relayOutboxBatch(
  outbox: OutboxLease,
  publisher: JobPublisher,
  leaseOwner: string,
  limit = 100,
): Promise<RelayResult> {
  const messages = await outbox.take(limit, leaseOwner, 30_000);
  let published = 0;
  let failed = 0;
  for (const message of messages) {
    try {
      await publisher.publish(message.envelope, message.job);
      await outbox.markPublished(message.id, leaseOwner);
      published += 1;
    } catch (error) {
      await outbox.markFailed(message.id, leaseOwner, safeError(error));
      failed += 1;
    }
  }
  return { published, failed };
}
