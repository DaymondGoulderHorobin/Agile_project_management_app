import { z } from "zod";

import { IsoDateTimeSchema, SafeMetadataSchema } from "./common.js";
import {
  AiJobIdSchema,
  DemonstrationComparisonIdSchema,
  ExecutionCycleIdSchema,
  OrganisationIdSchema,
  ProjectIdSchema,
  RunnerEnvironmentIdSchema,
} from "./ids.js";

export const ExecutionJobNameSchema = z.enum([
  "execution.authorise",
  "runner.provision",
  "runner.start",
  "execution.run-tests",
  "execution.generate-report",
  "execution.cancel",
  "runner.cleanup",
  "execution.request-review",
  "execution.reconcile",
]);
export const AiJobNameSchema = z.enum([
  "ai.generate",
  "ai.cancel",
  "ai.reconcile",
  "demo.generate-comparison",
]);
export const QueueJobNameSchema = z.union([
  ExecutionJobNameSchema,
  AiJobNameSchema,
]);

export const ExecutionJobIdSchema = z
  .string()
  .regex(
    /^cycle:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}:[a-z][a-z0-9.-]*:[1-9][0-9]*$/iu,
  );
export const executionJobId = (
  cycleId: string,
  stage: string,
  attempt: number,
) => `cycle:${cycleId}:${stage}:${attempt}` as const;

export const ExecutionQueueJobSchema = z
  .object({
    id: ExecutionJobIdSchema,
    name: ExecutionJobNameSchema,
    organisationId: OrganisationIdSchema,
    projectId: ProjectIdSchema,
    cycleId: ExecutionCycleIdSchema,
    environmentId: RunnerEnvironmentIdSchema.optional(),
    attempt: z.number().int().positive(),
    correlationId: z.string().uuid(),
    requestedAt: IsoDateTimeSchema,
    safeContext: SafeMetadataSchema,
  })
  .refine(
    (value) =>
      value.id === executionJobId(value.cycleId, value.name, value.attempt),
    {
      path: ["id"],
      message: "Execution job ID must match cycle, stage, and attempt",
    },
  );

export const AiQueueJobSchema = z.object({
  id: z.string().min(8).max(300),
  name: AiJobNameSchema,
  organisationId: OrganisationIdSchema,
  projectId: ProjectIdSchema,
  aiJobId: AiJobIdSchema.optional(),
  comparisonId: DemonstrationComparisonIdSchema.optional(),
  attempt: z.number().int().positive(),
  correlationId: z.string().uuid(),
  requestedAt: IsoDateTimeSchema,
  safeContext: SafeMetadataSchema,
});

export const QueueJobSchema = z.union([
  ExecutionQueueJobSchema,
  AiQueueJobSchema,
]);

export type ExecutionQueueJob = z.infer<typeof ExecutionQueueJobSchema>;
export type QueueJob = z.infer<typeof QueueJobSchema>;
