import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  MemoryJobPublisher,
  executionCycleIdempotencyKey,
  executionJobId,
  relayOutboxBatch,
  type OutboxLease,
  type PendingOutboxMessage,
  type QueueEnvelope,
} from "../src/index.js";

function envelope(): QueueEnvelope {
  return {
    id: randomUUID(),
    name: "execution.authorise",
    version: 1,
    occurredAt: new Date().toISOString(),
    correlationId: randomUUID(),
    organisationId: randomUUID(),
    aggregateId: randomUUID(),
    attempt: 1,
    payload: { cycleId: randomUUID() },
  };
}

describe("deterministic queue identity", () => {
  it("uses the dossier cycle and stage keys", () => {
    expect(executionCycleIdempotencyKey("plan-v1")).toBe("execution-cycle:plan-v1");
    expect(executionJobId("cycle-1", "runner.cleanup", 2)).toBe("cycle:cycle-1:runner.cleanup:2");
    expect(() => executionJobId("cycle-1", "runner.start", 0)).toThrow(RangeError);
  });

  it("deduplicates the same durable job ID", async () => {
    const publisher = new MemoryJobPublisher();
    const first = envelope();
    await publisher.publish(first, { jobId: "stable" });
    await publisher.publish({ ...first, id: randomUUID() }, { jobId: "stable" });
    expect(publisher.published).toHaveLength(1);
  });
});

describe("outbox relay", () => {
  it("marks a leased message only after publish succeeds", async () => {
    const message: PendingOutboxMessage = { id: randomUUID(), envelope: envelope(), job: { jobId: "outbox-1" } };
    const states: string[] = [];
    const outbox: OutboxLease = {
      async take() { states.push("take"); return [message]; },
      async markPublished() { states.push("published"); },
      async markFailed() { states.push("failed"); },
    };
    const result = await relayOutboxBatch(outbox, new MemoryJobPublisher(), "worker-1");
    expect(result).toEqual({ published: 1, failed: 0 });
    expect(states).toEqual(["take", "published"]);
  });
});
