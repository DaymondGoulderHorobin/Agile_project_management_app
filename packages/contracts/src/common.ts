import { z } from "zod";

import {
  ActorIdSchema,
  OrganisationIdSchema,
  ProjectIdSchema,
  UserIdSchema,
} from "./ids.js";

export const IsoDateTimeSchema = z.string().datetime({ offset: true });
export const Sha256Schema = z
  .string()
  .regex(/^[a-f0-9]{64}$/u, "Expected lowercase SHA-256 hex");
export const ContentHashSchema = z.object({
  algorithm: z.literal("sha256"),
  canonicalSchemaVersion: z.string().min(1).max(64),
  value: Sha256Schema,
});

export const OriginSchema = z.enum([
  "human_authored",
  "ai_generated",
  "ai_generated_human_edited",
  "imported",
  "system_generated",
]);
export type Origin = z.infer<typeof OriginSchema>;

export const ProjectModeSchema = z.enum([
  "light",
  "standard",
  "high_assurance",
]);
export const DataClassificationSchema = z.literal("general_business");
export const ProjectWorkflowStateSchema = z.enum([
  "discovery",
  "planning",
  "plan_in_review",
  "ready_for_backlog",
  "delivery",
  "release_in_review",
  "released",
  "on_hold",
  "archived",
]);

export const ActorTypeSchema = z.enum([
  "human",
  "ai",
  "system",
  "integration",
  "operator",
]);
export const ActorReferenceSchema = z.object({
  actorType: ActorTypeSchema,
  actorId: ActorIdSchema.nullable(),
  userId: UserIdSchema.optional(),
  displayName: z.string().min(1).max(160),
});
export const HumanActorReferenceSchema = ActorReferenceSchema.extend({
  actorType: z.enum(["human", "operator"]),
  userId: UserIdSchema,
});

export const TenantReferenceSchema = z.object({
  organisationId: OrganisationIdSchema,
  projectId: ProjectIdSchema.optional(),
});

export const PermissionKeySchema = z
  .string()
  .min(3)
  .max(120)
  .regex(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/u);

export const CommandContextSchema = z.object({
  requestId: z.string().uuid(),
  correlationId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(240).optional(),
  expectedLockVersion: z.number().int().nonnegative().optional(),
  actorTimezone: z.string().min(1).max(80).optional(),
});

export const CursorPageRequestSchema = z.object({
  cursor: z.string().min(1).max(2048).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export const CursorPageMetaSchema = z.object({
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  count: z.number().int().nonnegative(),
});

export const ApiMetaSchema = z.object({
  requestId: z.string().uuid(),
  correlationId: z.string().uuid(),
  generatedAt: IsoDateTimeSchema,
});

export const ValidationIssueSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  code: z.string().min(1),
  message: z.string().min(1),
});

export const ProblemDetailsSchema = z.object({
  type: z.string().url(),
  title: z.string().min(1),
  status: z.number().int().min(400).max(599),
  detail: z.string().min(1),
  instance: z.string().min(1).optional(),
  code: z.string().min(1).max(120),
  requestId: z.string().uuid(),
  correlationId: z.string().uuid(),
  issues: z.array(ValidationIssueSchema).optional(),
  retryable: z.boolean().default(false),
});

export const createApiResponseSchema = <Output extends z.ZodType>(
  data: Output,
) => z.object({ data, meta: ApiMetaSchema });

export const createCursorPageSchema = <Item extends z.ZodType>(item: Item) =>
  z.object({
    data: z.array(item),
    page: CursorPageMetaSchema,
    meta: ApiMetaSchema,
  });

export const VersionReferenceSchema = z.object({
  kind: z.string().min(1).max(80),
  stableId: z.string().uuid(),
  versionId: z.string().uuid(),
  version: z.number().int().positive(),
  contentHash: ContentHashSchema,
});

export const OptimisticConcurrencySchema = z.object({
  lockVersion: z.number().int().nonnegative(),
  updatedAt: IsoDateTimeSchema,
});

export const SafeMetadataSchema = z.record(z.string(), z.unknown());

export type ProjectMode = z.infer<typeof ProjectModeSchema>;
export type ProjectWorkflowState = z.infer<typeof ProjectWorkflowStateSchema>;
export type CommandContext = z.infer<typeof CommandContextSchema>;
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
