import { z } from "zod";

import {
  CommandContextSchema,
  ContentHashSchema,
  IsoDateTimeSchema,
  OriginSchema,
  SafeMetadataSchema,
  VersionReferenceSchema,
} from "./common.js";
import {
  ApprovalSnapshotIdSchema,
  ChangeApplicationIdSchema,
  ChangeImpactEvaluationIdSchema,
  ChangeProposalIdSchema,
  ChangeProposalVersionIdSchema,
  CodeChangeIdSchema,
  ExecutionCycleIdSchema,
  ExecutionReviewIdSchema,
  ExecutionTestRunIdSchema,
  ExecutionWorkReportIdSchema,
  ProjectIdSchema,
  ReleaseIdSchema,
  ReleaseVersionIdSchema,
  WorkItemIdSchema,
} from "./ids.js";

export const ChangeClassificationSchema = z.enum([
  "minor",
  "material",
  "fundamental",
]);
export const ChangeProposalStateSchema = z.enum([
  "proposed",
  "classified",
  "impact_assessed",
  "approved",
  "rejected",
  "applying",
  "applied",
  "recovery_required",
]);
export const ChangeImpactEffectSchema = z.enum([
  "none",
  "review",
  "supersede",
  "stale_approval",
  "cancel_cycle",
  "reverify_release",
]);

export const CreateChangeProposalCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  title: z.string().trim().min(1).max(240),
  rationale: z.string().trim().min(1).max(16_000),
  proposedClassification: ChangeClassificationSchema,
  origin: OriginSchema,
  affectedVersionIds: z.array(z.string().uuid()),
});
export const ConfirmChangeClassificationCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  proposalVersionId: ChangeProposalVersionIdSchema,
  classification: ChangeClassificationSchema,
  rationale: z.string().trim().min(1).max(8_000),
  downgradeFromSuggested: z.boolean(),
});

export const ChangeProposalVersionSchema = z.object({
  id: ChangeProposalVersionIdSchema,
  proposalId: ChangeProposalIdSchema,
  projectId: ProjectIdSchema,
  version: z.number().int().positive(),
  title: z.string().min(1),
  rationale: z.string().min(1),
  proposedClassification: ChangeClassificationSchema,
  confirmedClassification: ChangeClassificationSchema.nullable(),
  origin: OriginSchema,
  contentHash: ContentHashSchema,
  supersedesVersionId: ChangeProposalVersionIdSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});

export const ChangeImpactEntrySchema = z.object({
  subjectKind: z.string().min(1).max(80),
  subjectId: z.string().uuid(),
  subjectVersionId: z.string().uuid().nullable(),
  effect: ChangeImpactEffectSchema,
  reason: z.string().min(1).max(8_000),
  ruleKey: z.string().min(1).max(160),
});
export const ChangeImpactEvaluationSchema = z.object({
  id: ChangeImpactEvaluationIdSchema,
  proposalVersionId: ChangeProposalVersionIdSchema,
  classification: ChangeClassificationSchema,
  inputHash: ContentHashSchema,
  state: z.enum(["requested", "running", "completed", "failed"]),
  entries: z.array(ChangeImpactEntrySchema),
  evaluatedAt: IsoDateTimeSchema.nullable(),
});

export const ApplyChangeCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  proposalVersionId: ChangeProposalVersionIdSchema,
  approvalSnapshotId: ApprovalSnapshotIdSchema,
  expectedImpactEvaluationId: ChangeImpactEvaluationIdSchema,
  idempotencyKey: z.string().min(8).max(240),
});
export const ChangeApplicationSchema = z.object({
  id: ChangeApplicationIdSchema,
  proposalVersionId: ChangeProposalVersionIdSchema,
  state: z.enum(["approved", "applying", "applied", "recovery_required"]),
  idempotencyKey: z.string().min(8).max(240),
  recoveryMetadata: SafeMetadataSchema,
  startedAt: IsoDateTimeSchema.nullable(),
  completedAt: IsoDateTimeSchema.nullable(),
});

export const ReleaseStateSchema = z.enum([
  "draft",
  "verifying",
  "approval_pending",
  "approved",
  "recorded",
  "superseded",
]);
export const RequirementVerificationSchema = z.object({
  requirementVersion: VersionReferenceSchema,
  status: z.enum([
    "verified",
    "partially_verified",
    "not_verified",
    "not_applicable",
  ]),
  evidence: z.array(
    z.object({
      kind: z.enum(["test", "execution_report", "review", "manual_evidence"]),
      id: z.string().uuid(),
      contentHash: ContentHashSchema.optional(),
    }),
  ),
  explanation: z.string().max(8_000),
});
export const ReleaseEvidenceManifestSchema = z.object({
  requirements: z.array(RequirementVerificationSchema).min(1),
  workItemIds: z.array(WorkItemIdSchema).min(1),
  executionCycles: z
    .array(
      z.object({
        cycleId: ExecutionCycleIdSchema,
        reportId: ExecutionWorkReportIdSchema,
        reviewIds: z.array(ExecutionReviewIdSchema).min(1),
        testRunIds: z.array(ExecutionTestRunIdSchema).min(1),
        codeChangeIds: z.array(CodeChangeIdSchema),
      }),
    )
    .min(1),
  planApprovalSnapshotId: ApprovalSnapshotIdSchema,
  executionApprovalSnapshotIds: z.array(ApprovalSnapshotIdSchema).min(1),
});
export const CreateReleaseVersionCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  releaseId: ReleaseIdSchema.optional(),
  name: z.string().trim().min(1).max(240),
  objective: z.string().trim().min(1).max(8_000),
  evidence: ReleaseEvidenceManifestSchema,
  knownLimitations: z.array(z.string().min(1).max(4_000)),
  unresolvedRisks: z.array(VersionReferenceSchema),
  rollbackNote: z.string().trim().min(1).max(8_000),
});
export const ReleaseVersionSchema = z.object({
  id: ReleaseVersionIdSchema,
  releaseId: ReleaseIdSchema,
  projectId: ProjectIdSchema,
  version: z.number().int().positive(),
  name: z.string().min(1),
  objective: z.string().min(1),
  state: ReleaseStateSchema,
  evidence: ReleaseEvidenceManifestSchema,
  knownLimitations: z.array(z.string()),
  rollbackNote: z.string(),
  contentHash: ContentHashSchema,
  createdAt: IsoDateTimeSchema,
});
export const VerifyReleaseCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  releaseVersionId: ReleaseVersionIdSchema,
});
export const RecordReleaseCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  releaseVersionId: ReleaseVersionIdSchema,
  approvalSnapshotId: ApprovalSnapshotIdSchema,
  expectedContentHash: ContentHashSchema,
});

export type ChangeProposalVersion = z.infer<typeof ChangeProposalVersionSchema>;
export type ReleaseVersion = z.infer<typeof ReleaseVersionSchema>;
