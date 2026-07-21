import { z } from "zod";

export const executionJobNames = [
  "execution.authorise",
  "runner.provision",
  "runner.start",
  "execution.run-tests",
  "execution.generate-report",
  "execution.cancel",
  "runner.cleanup",
  "execution.request-review",
  "execution.reconcile",
] as const;

export const applicationJobNames = [
  ...executionJobNames,
  "ai.suggest-questions",
  "ai.extract-artifacts",
  "ai.generate-backlog",
  "demo.generate-comparison",
  "notifications.deliver",
  "github.reconcile",
  "outbox.relay",
] as const;

export const JobNameSchema = z.enum(applicationJobNames);
export type JobName = z.infer<typeof JobNameSchema>;

export const QueueEnvelopeSchema = z.object({
  id: z.uuid(),
  name: JobNameSchema,
  version: z.literal(1),
  occurredAt: z.iso.datetime({ offset: true }),
  correlationId: z.uuid(),
  organisationId: z.uuid().nullable(),
  aggregateId: z.uuid().nullable(),
  attempt: z.number().int().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export type QueueEnvelope = z.infer<typeof QueueEnvelopeSchema>;

export function executionCycleIdempotencyKey(executionPlanVersionId: string): string {
  return `execution-cycle:${executionPlanVersionId}`;
}

export function executionJobId(cycleId: string, stage: (typeof executionJobNames)[number], attempt: number): string {
  if (!Number.isSafeInteger(attempt) || attempt < 1) throw new RangeError("attempt must be a positive integer");
  return `cycle:${cycleId}:${stage}:${attempt}`;
}

export function generalJobId(name: JobName, aggregateId: string, operationId: string): string {
  return `${name}:${aggregateId}:${operationId}`;
}
