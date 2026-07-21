import { z } from "zod";

import {
  CommandContextSchema,
  ContentHashSchema,
  HumanActorReferenceSchema,
  IsoDateTimeSchema,
  SafeMetadataSchema,
  VersionReferenceSchema,
} from "./common.js";
import {
  ApprovalDecisionIdSchema,
  ApprovalPolicyVersionIdSchema,
  ApprovalRequestIdSchema,
  ApprovalRequirementIdSchema,
  ApprovalSnapshotIdSchema,
  ProjectIdSchema,
  ProjectMembershipIdSchema,
  ReauthenticationGrantIdSchema,
} from "./ids.js";

export const ApprovalStageSchema = z.enum([
  "project_plan",
  "sprint",
  "execution_plan",
  "release",
]);
export const ApprovalRequestStateSchema = z.enum([
  "pending",
  "approved",
  "changes_requested",
  "rejected",
  "withdrawn",
  "stale",
]);
export const ApprovalDecisionValueSchema = z.enum([
  "approved",
  "approved_with_conditions",
  "changes_requested",
  "rejected",
]);

export const ApprovalSubjectSchema = z.object({
  kind: z.enum(["project_plan", "sprint", "execution_plan", "release"]),
  stableId: z.string().uuid(),
  versionId: z.string().uuid(),
  version: z.number().int().positive(),
});

export const ApprovalSnapshotSchema = z.object({
  id: ApprovalSnapshotIdSchema,
  projectId: ProjectIdSchema,
  subject: ApprovalSubjectSchema,
  canonicalSchemaVersion: z.string().min(1).max(64),
  contentHash: ContentHashSchema,
  dependencies: z.array(VersionReferenceSchema),
  createdAt: IsoDateTimeSchema,
});

export const ApprovalRequirementSchema = z.object({
  id: ApprovalRequirementIdSchema,
  key: z.string().min(1).max(120),
  minimumDecisions: z.number().int().positive(),
  roleAggregationAllowed: z.boolean(),
  distinctPrincipalGroup: z.string().max(120).nullable(),
  requiresRecentReauthentication: z.boolean(),
  authorityPredicate: SafeMetadataSchema,
  status: z.enum(["outstanding", "satisfied", "blocked"]),
});

export const ApprovalRequestSchema = z.object({
  id: ApprovalRequestIdSchema,
  projectId: ProjectIdSchema,
  snapshot: ApprovalSnapshotSchema,
  policyVersionId: ApprovalPolicyVersionIdSchema,
  stage: ApprovalStageSchema,
  state: ApprovalRequestStateSchema,
  requirements: z.array(ApprovalRequirementSchema).min(1),
  requestedAt: IsoDateTimeSchema,
  completedAt: IsoDateTimeSchema.nullable(),
  staleAt: IsoDateTimeSchema.nullable(),
  staleReason: z.string().nullable(),
  replacementRequestId: ApprovalRequestIdSchema.nullable(),
  lockVersion: z.number().int().nonnegative(),
});

export const OpenApprovalRequestCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  stage: ApprovalStageSchema,
  subject: ApprovalSubjectSchema,
  expectedContentHash: ContentHashSchema,
  dependencyManifest: z.array(VersionReferenceSchema),
  policyVersionId: ApprovalPolicyVersionIdSchema,
});

export const ApprovalConditionSchema = z.object({
  key: z.string().min(1).max(120),
  description: z.string().min(1).max(4_000),
  binding: z.boolean().default(true),
  dueAt: IsoDateTimeSchema.optional(),
});

export const DecideApprovalCommandSchema = z
  .object({
    context: CommandContextSchema,
    projectId: ProjectIdSchema,
    approvalRequestId: ApprovalRequestIdSchema,
    approvalRequirementId: ApprovalRequirementIdSchema,
    approvalSnapshotId: ApprovalSnapshotIdSchema,
    reviewerMembershipId: ProjectMembershipIdSchema,
    expectedSnapshotHash: ContentHashSchema,
    decision: ApprovalDecisionValueSchema,
    comment: z.string().trim().max(8_000).default(""),
    conditions: z.array(ApprovalConditionSchema).default([]),
    reauthenticationGrantId: ReauthenticationGrantIdSchema.optional(),
  })
  .superRefine((value, context) => {
    if (
      value.decision === "approved_with_conditions" &&
      value.conditions.length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["conditions"],
        message: "approved_with_conditions requires at least one condition",
      });
    }
    if (
      value.decision !== "approved_with_conditions" &&
      value.conditions.length > 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["conditions"],
        message: "Conditions are only valid with approved_with_conditions",
      });
    }
  });

export const ApprovalDecisionSchema = z.object({
  id: ApprovalDecisionIdSchema,
  projectId: ProjectIdSchema,
  approvalRequestId: ApprovalRequestIdSchema,
  approvalRequirementId: ApprovalRequirementIdSchema,
  approvalSnapshotId: ApprovalSnapshotIdSchema,
  reviewerMembershipId: ProjectMembershipIdSchema,
  reviewer: HumanActorReferenceSchema,
  decision: ApprovalDecisionValueSchema,
  conditions: z.array(ApprovalConditionSchema),
  comment: z.string(),
  authorityAtDecision: SafeMetadataSchema,
  decidedAt: IsoDateTimeSchema,
});

export const MarkApprovalRequestStaleCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  approvalRequestId: ApprovalRequestIdSchema,
  reason: z.string().trim().min(1).max(4_000),
  replacementRequestId: ApprovalRequestIdSchema.optional(),
  changedVersionIds: z.array(z.string().uuid()).min(1),
});

export const RevokeApprovalCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  approvalRequestId: ApprovalRequestIdSchema,
  approvalDecisionId: ApprovalDecisionIdSchema.optional(),
  reason: z.string().trim().min(1).max(4_000),
});

export const ResolveApprovalConditionCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  approvalDecisionId: ApprovalDecisionIdSchema,
  conditionKey: z.string().min(1).max(120),
  resolution: z.string().trim().min(1).max(8_000),
  evidenceVersionIds: z.array(z.string().uuid()),
  status: z.enum(["resolved", "accepted", "rejected"]),
});

export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;
export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;
export type DecideApprovalCommand = z.infer<typeof DecideApprovalCommandSchema>;
