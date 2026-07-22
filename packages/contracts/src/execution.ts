import { z } from "zod";

import {
  CommandContextSchema,
  ContentHashSchema,
  HumanActorReferenceSchema,
  IsoDateTimeSchema,
  SafeMetadataSchema,
  VersionReferenceSchema,
} from "./common.js";
import { ApprovalDecisionValueSchema } from "./approvals.js";
import {
  AgentActionIdSchema,
  AgentRunIdSchema,
  AgentTurnIdSchema,
  ApprovalRequestIdSchema,
  ApprovalSnapshotIdSchema,
  ChangedFileIdSchema,
  CodeChangeIdSchema,
  ExecutionCheckpointIdSchema,
  ExecutionCycleIdSchema,
  ExecutionPlanIdSchema,
  ExecutionPlanVersionIdSchema,
  ExecutionReviewIdSchema,
  ExecutionTestRunIdSchema,
  ExecutionWorkItemClaimIdSchema,
  ExecutionWorkReportIdSchema,
  OrganisationIdSchema,
  ProjectIdSchema,
  ProjectMembershipIdSchema,
  RepositoryIdSchema,
  RunnerCapabilityGrantIdSchema,
  RunnerEnvironmentIdSchema,
  WorkItemIdSchema,
} from "./ids.js";

export const ExecutionCycleStateSchema = z.enum([
  "requested",
  "authorising",
  "queued",
  "provisioning",
  "running",
  "checkpoint_waiting",
  "human_input_required",
  "testing",
  "reporting",
  "awaiting_review",
  "completed",
  "cancelling",
  "cancelled",
  "failed",
  "recovery_required",
]);
export const RunnerEnvironmentStateSchema = z.enum([
  "requested",
  "creating",
  "ready",
  "active",
  "revoking",
  "destroying",
  "destroyed",
  "cleanup_failed",
]);
export const ExecutionStopReasonSchema = z.enum([
  "checkpoint_reached",
  "human_input_required",
  "scope_violation",
  "token_limit",
  "cost_limit",
  "turn_limit",
  "task_limit",
  "time_limit",
  "tests_failed",
  "approval_revoked",
  "membership_revoked",
  "repository_access_lost",
  "material_change",
  "user_cancelled",
  "runner_crash",
  "completed",
]);
export const WorkItemClaimReleaseReasonSchema = z.enum([
  "required_review_completed",
  "safely_cancelled",
  "authorised_failure_recovery",
  "authorised_change_removed_work",
]);

export type ExecutionCycleState = z.infer<typeof ExecutionCycleStateSchema>;
export type RunnerEnvironmentState = z.infer<
  typeof RunnerEnvironmentStateSchema
>;

export const EXECUTION_CYCLE_TRANSITIONS = {
  requested: ["authorising", "cancelling"],
  authorising: ["queued", "cancelling"],
  queued: ["provisioning", "cancelling"],
  provisioning: ["running", "cancelling", "failed"],
  running: [
    "checkpoint_waiting",
    "human_input_required",
    "testing",
    "cancelling",
    "failed",
    "recovery_required",
  ],
  checkpoint_waiting: ["running", "cancelling"],
  human_input_required: ["running", "cancelling"],
  testing: ["reporting"],
  reporting: ["awaiting_review"],
  awaiting_review: ["completed", "failed"],
  completed: [],
  cancelling: ["cancelled", "recovery_required"],
  cancelled: [],
  failed: [],
  recovery_required: [],
} as const satisfies Record<
  ExecutionCycleState,
  readonly ExecutionCycleState[]
>;

export const RUNNER_ENVIRONMENT_TRANSITIONS = {
  requested: ["creating"],
  creating: ["ready"],
  ready: ["active", "revoking"],
  active: ["revoking"],
  revoking: ["destroying"],
  destroying: ["destroyed", "cleanup_failed"],
  destroyed: [],
  cleanup_failed: ["destroying"],
} as const satisfies Record<
  RunnerEnvironmentState,
  readonly RunnerEnvironmentState[]
>;

export const ExecutionCycleTransitionSchema = z
  .object({
    cycleId: ExecutionCycleIdSchema,
    from: ExecutionCycleStateSchema,
    to: ExecutionCycleStateSchema,
    expectedLockVersion: z.number().int().nonnegative(),
    stopReason: ExecutionStopReasonSchema.optional(),
    reason: z.string().min(1).max(4_000),
  })
  .superRefine((value, context) => {
    if (
      !(EXECUTION_CYCLE_TRANSITIONS[value.from] as readonly string[]).includes(
        value.to,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: `Invalid cycle transition ${value.from} -> ${value.to}`,
      });
    }
    if (value.to === "completed" && value.stopReason !== "completed") {
      context.addIssue({
        code: "custom",
        path: ["stopReason"],
        message: "completed requires stop reason completed",
      });
    }
  });

export const RunnerEnvironmentTransitionSchema = z
  .object({
    environmentId: RunnerEnvironmentIdSchema,
    from: RunnerEnvironmentStateSchema,
    to: RunnerEnvironmentStateSchema,
    expectedLockVersion: z.number().int().nonnegative(),
    reason: z.string().min(1).max(4_000),
  })
  .superRefine((value, context) => {
    if (
      !(
        RUNNER_ENVIRONMENT_TRANSITIONS[value.from] as readonly string[]
      ).includes(value.to)
    ) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: `Invalid environment transition ${value.from} -> ${value.to}`,
      });
    }
  });

export const ExecutionPlanVersionStatusSchema = z.enum([
  "draft",
  "frozen",
  "approval_pending",
  "approved",
  "superseded",
  "withdrawn",
]);

const RelativeWorkspacePathSchema = z
  .string()
  .min(1)
  .max(1_024)
  .refine(
    (path) => !path.includes("\\") && !path.includes("\0"),
    "Use normalised POSIX paths",
  )
  .refine(
    (path) => !path.startsWith("/") && !/^[a-z]:/iu.test(path),
    "Path must be workspace-relative",
  )
  .refine(
    (path) =>
      !path.split("/").some((segment) => segment === ".." || segment === ""),
    "Path traversal is forbidden",
  );

export const WorkspacePathPolicySchema = z.object({
  path: RelativeWorkspacePathSchema,
  access: z.enum(["read_only", "read_write"]),
});
export const NetworkDestinationSchema = z.object({
  scheme: z.enum(["https", "ssh"]),
  host: z.string().min(1).max(253).toLowerCase(),
  port: z.number().int().min(1).max(65_535),
  pathPrefix: z.string().startsWith("/").max(1_024).optional(),
});
export const SecretScopeSchema = z.object({
  secretReference: z.string().min(1).max(240),
  purpose: z.string().min(1).max(1_000),
  allowedTools: z.array(z.string().min(1).max(120)).min(1),
});
export const ExecutionLimitsSchema = z.object({
  maxTurns: z.number().int().positive(),
  maxTasks: z.number().int().positive(),
  maxInputTokens: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive(),
  maxCostMinorUnits: z.number().int().positive(),
  currency: z.string().length(3).toUpperCase(),
  maxDurationSeconds: z.number().int().positive(),
});
export const TestDefinitionSchema = z.object({
  key: z.string().min(1).max(120),
  label: z.string().min(1).max(240),
  command: z.array(z.string().min(1).max(2_000)).min(1),
  workingDirectory: RelativeWorkspacePathSchema,
  required: z.boolean(),
  timeoutSeconds: z.number().int().positive(),
});
export const StopConditionSchema = z.object({
  kind: z.enum([
    "checkpoint",
    "human_input",
    "limit",
    "scope_denial",
    "completion",
    "test_failure",
  ]),
  key: z.string().min(1).max(120),
  description: z.string().min(1).max(2_000),
  required: z.boolean(),
});

export const ExecutionPlanScopeSchema = z.object({
  organisationId: OrganisationIdSchema,
  projectId: ProjectIdSchema,
  repositoryId: RepositoryIdSchema,
  approvedCommit: z.string().regex(/^[a-f0-9]{40}$/u),
  branchStrategy: z.enum(["create", "select"]),
  branchName: z.string().min(1).max(255),
  workspacePaths: z.array(WorkspacePathPolicySchema).min(1),
  networkDestinations: z.array(NetworkDestinationSchema),
  tools: z.array(z.string().min(1).max(120)).min(1),
  secrets: z.array(SecretScopeSchema),
  limits: ExecutionLimitsSchema,
});

export const CreateExecutionPlanVersionCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  executionPlanId: ExecutionPlanIdSchema.optional(),
  title: z.string().trim().min(1).max(240),
  objective: z.string().trim().min(1).max(8_000),
  projectPlanVersion: VersionReferenceSchema,
  workItemIds: z.array(WorkItemIdSchema).min(1),
  scope: ExecutionPlanScopeSchema,
  acceptanceCriterionVersionIds: z.array(z.string().uuid()).min(1),
  tests: z.array(TestDefinitionSchema).min(1),
  stopConditions: z.array(StopConditionSchema).min(1),
  requiredReviewTypes: z.array(z.enum(["technical", "stakeholder"])).min(1),
});

export const ExecutionPlanVersionSchema = z.object({
  id: ExecutionPlanVersionIdSchema,
  executionPlanId: ExecutionPlanIdSchema,
  projectId: ProjectIdSchema,
  version: z.number().int().positive(),
  status: ExecutionPlanVersionStatusSchema,
  objective: z.string().min(1),
  projectPlanVersion: VersionReferenceSchema,
  workItemIds: z.array(WorkItemIdSchema).min(1),
  scope: ExecutionPlanScopeSchema,
  tests: z.array(TestDefinitionSchema).min(1),
  stopConditions: z.array(StopConditionSchema).min(1),
  contentHash: ContentHashSchema,
  createdAt: IsoDateTimeSchema,
});

export const ExecutionCycleIdempotencyKeySchema = z
  .string()
  .regex(
    /^execution-cycle:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
  );
export const executionCycleIdempotencyKey = (executionPlanVersionId: string) =>
  `execution-cycle:${executionPlanVersionId}` as const;

export const RequestExecutionCycleCommandSchema = z
  .object({
    context: CommandContextSchema,
    projectId: ProjectIdSchema,
    executionPlanVersionId: ExecutionPlanVersionIdSchema,
    approvalRequestId: ApprovalRequestIdSchema,
    approvalSnapshotId: ApprovalSnapshotIdSchema,
    idempotencyKey: ExecutionCycleIdempotencyKeySchema,
  })
  .refine(
    (value) =>
      value.idempotencyKey ===
      executionCycleIdempotencyKey(value.executionPlanVersionId),
    {
      path: ["idempotencyKey"],
      message:
        "Cycle idempotency key must be derived from the execution-plan version",
    },
  );

export const ExecutionCycleSchema = z.object({
  id: ExecutionCycleIdSchema,
  organisationId: OrganisationIdSchema,
  projectId: ProjectIdSchema,
  executionPlanVersionId: ExecutionPlanVersionIdSchema,
  state: ExecutionCycleStateSchema,
  stopReason: ExecutionStopReasonSchema.nullable(),
  idempotencyKey: ExecutionCycleIdempotencyKeySchema,
  currentEnvironmentId: RunnerEnvironmentIdSchema.nullable(),
  startedAt: IsoDateTimeSchema.nullable(),
  stoppedAt: IsoDateTimeSchema.nullable(),
  lockVersion: z.number().int().nonnegative(),
});

export const ExecutionWorkItemClaimSchema = z
  .object({
    id: ExecutionWorkItemClaimIdSchema,
    organisationId: OrganisationIdSchema,
    projectId: ProjectIdSchema,
    workItemId: WorkItemIdSchema,
    executionCycleId: ExecutionCycleIdSchema,
    claimedAt: IsoDateTimeSchema,
    releasedAt: IsoDateTimeSchema.nullable(),
    releaseReason: WorkItemClaimReleaseReasonSchema.nullable(),
  })
  .superRefine((value, context) => {
    if ((value.releasedAt === null) !== (value.releaseReason === null)) {
      context.addIssue({
        code: "custom",
        path: ["releaseReason"],
        message: "Release time and release reason must be set together",
      });
    }
    if (
      value.releasedAt !== null &&
      Date.parse(value.releasedAt) < Date.parse(value.claimedAt)
    ) {
      context.addIssue({
        code: "custom",
        path: ["releasedAt"],
        message: "A claim cannot be released before it is acquired",
      });
    }
  });

export const ReleaseWorkItemClaimsCommandSchema = z.object({
  context: CommandContextSchema,
  cycleId: ExecutionCycleIdSchema,
  claimIds: z.array(ExecutionWorkItemClaimIdSchema).min(1),
  releaseReason: WorkItemClaimReleaseReasonSchema,
  containmentEvidence: SafeMetadataSchema.optional(),
});

export const RunnerCapabilityScopeSchema = ExecutionPlanScopeSchema.extend({
  cycleId: ExecutionCycleIdSchema,
  environmentId: RunnerEnvironmentIdSchema,
  executionPlanVersionId: ExecutionPlanVersionIdSchema,
  expiresAt: IsoDateTimeSchema,
});
export const RunnerCapabilityGrantSchema = z
  .object({
    id: RunnerCapabilityGrantIdSchema,
    cycleId: ExecutionCycleIdSchema,
    environmentId: RunnerEnvironmentIdSchema,
    tokenDigest: Sha256DigestSchema(),
    scopeHash: ContentHashSchema,
    issuedAt: IsoDateTimeSchema,
    expiresAt: IsoDateTimeSchema,
    revokedAt: IsoDateTimeSchema.nullable(),
    revokedReason: z.string().nullable(),
    renewalParentId: RunnerCapabilityGrantIdSchema.nullable(),
  })
  .superRefine((value, context) => {
    if (Date.parse(value.expiresAt) <= Date.parse(value.issuedAt)) {
      context.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "Capability expiry must be after issue time",
      });
    }
    if ((value.revokedAt === null) !== (value.revokedReason === null)) {
      context.addIssue({
        code: "custom",
        path: ["revokedReason"],
        message: "Capability revocation time and reason must be set together",
      });
    }
  });

function Sha256DigestSchema() {
  return z.string().regex(/^[a-f0-9]{64}$/u);
}

export const RunnerCapabilityHandoffSchema = z.object({
  environmentId: RunnerEnvironmentIdSchema,
  opaqueCapability: z.string().min(43).max(1_024),
  expiresAt: IsoDateTimeSchema,
});

export const RunnerEnvironmentSchema = z.object({
  id: RunnerEnvironmentIdSchema,
  cycleId: ExecutionCycleIdSchema,
  provider: z.string().min(1).max(120),
  runtimeIdentity: z.string().max(240).nullable(),
  state: RunnerEnvironmentStateSchema,
  policyHash: ContentHashSchema,
  createdAt: IsoDateTimeSchema,
  activeAt: IsoDateTimeSchema.nullable(),
  destroyedAt: IsoDateTimeSchema.nullable(),
  cleanupAttempts: z.number().int().nonnegative(),
  cleanupErrorCode: z.string().max(160).nullable(),
  lockVersion: z.number().int().nonnegative(),
});

export const AgentRunStateSchema = z.enum([
  "starting",
  "running",
  "stopped",
  "failed",
]);
export const AgentTurnStateSchema = z.enum([
  "requested",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export const AgentActionPolicyDecisionSchema = z.enum(["allowed", "denied"]);
export const AgentActionStatusSchema = z.enum([
  "requested",
  "running",
  "completed",
  "failed",
  "denied",
  "cancelled",
]);
export const AgentActionTypeSchema = z.enum([
  "command",
  "file_read",
  "file_write",
  "file_delete",
  "network_request",
  "tool_call",
  "message",
  "checkpoint",
  "test",
]);

export const AgentRunSchema = z.object({
  id: AgentRunIdSchema,
  cycleId: ExecutionCycleIdSchema,
  environmentId: RunnerEnvironmentIdSchema,
  provider: z.string().min(1).max(120),
  state: AgentRunStateSchema,
  attempt: z.number().int().positive(),
  startedAt: IsoDateTimeSchema,
  stoppedAt: IsoDateTimeSchema.nullable(),
  stopReason: ExecutionStopReasonSchema.nullable(),
});
export const AgentTurnSchema = z.object({
  id: AgentTurnIdSchema,
  runId: AgentRunIdSchema,
  sequence: z.number().int().positive(),
  state: AgentTurnStateSchema,
  inputManifestHash: ContentHashSchema,
  outputManifestHash: ContentHashSchema.nullable(),
  startedAt: IsoDateTimeSchema,
  endedAt: IsoDateTimeSchema.nullable(),
});
export const AgentActionSchema = z
  .object({
    id: AgentActionIdSchema,
    turnId: AgentTurnIdSchema,
    sequence: z.number().int().positive(),
    type: AgentActionTypeSchema,
    targetSummary: z.string().min(1).max(2_000),
    policyDecision: AgentActionPolicyDecisionSchema,
    status: AgentActionStatusSchema,
    exitCode: z.number().int().nullable(),
    errorClassification: z.string().max(160).nullable(),
    safeMetadata: SafeMetadataSchema,
    occurredAt: IsoDateTimeSchema,
  })
  .superRefine((value, context) => {
    if (value.policyDecision === "denied" && value.status !== "denied") {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Denied policy decisions must have denied status",
      });
    }
    if (value.policyDecision === "denied" && value.exitCode === 0) {
      context.addIssue({
        code: "custom",
        path: ["exitCode"],
        message: "Denied actions cannot report successful execution",
      });
    }
  });

export const ExecutionCheckpointKindSchema = z.enum([
  "planned",
  "human_input",
  "scope_denial",
  "failure",
  "limit",
]);
export const ExecutionCheckpointSchema = z.object({
  id: ExecutionCheckpointIdSchema,
  cycleId: ExecutionCycleIdSchema,
  sequence: z.number().int().positive(),
  kind: ExecutionCheckpointKindSchema,
  status: z.enum(["open", "resolved", "cancelled"]),
  requestedDecision: z.string().min(1).max(8_000),
  createdAt: IsoDateTimeSchema,
  resolvedAt: IsoDateTimeSchema.nullable(),
});
export const ResolveCheckpointCommandSchema = z.object({
  context: CommandContextSchema,
  cycleId: ExecutionCycleIdSchema,
  checkpointId: ExecutionCheckpointIdSchema,
  decision: z.enum([
    "continue",
    "changes_requested",
    "stop",
    "approved_checkpoint",
  ]),
  response: z.string().trim().min(1).max(16_000),
});
export const ResumeExecutionCycleCommandSchema = z.object({
  context: CommandContextSchema,
  cycleId: ExecutionCycleIdSchema,
  checkpointId: ExecutionCheckpointIdSchema,
  expectedState: z.enum(["checkpoint_waiting", "human_input_required"]),
  authorityRecheckId: z.string().uuid(),
});

export const ExecutionUsageKindSchema = z.enum([
  "turn",
  "task",
  "input_token",
  "output_token",
  "cost_minor_unit",
  "duration_second",
]);
export const ExecutionUsageEventSchema = z.object({
  cycleId: ExecutionCycleIdSchema,
  runId: AgentRunIdSchema.optional(),
  turnId: AgentTurnIdSchema.optional(),
  kind: ExecutionUsageKindSchema,
  quantity: z.number().nonnegative(),
  unit: z.string().min(1).max(80),
  costMinorUnits: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  providerEventId: z.string().min(1).max(240),
  occurredAt: IsoDateTimeSchema,
});

export const ExecutionTestStatusSchema = z.enum([
  "queued",
  "running",
  "passed",
  "failed",
  "cancelled",
  "error",
]);
export const ExecutionTestRunSchema = z.object({
  id: ExecutionTestRunIdSchema,
  cycleId: ExecutionCycleIdSchema,
  definition: TestDefinitionSchema,
  status: ExecutionTestStatusSchema,
  summary: z.string().max(8_000),
  startedAt: IsoDateTimeSchema.nullable(),
  completedAt: IsoDateTimeSchema.nullable(),
});

export const ChangedFileSchema = z.object({
  id: ChangedFileIdSchema,
  codeChangeId: CodeChangeIdSchema,
  path: RelativeWorkspacePathSchema,
  changeType: z.enum(["added", "modified", "deleted", "renamed"]),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  beforeBlobHash: z.string().max(160).nullable(),
  afterBlobHash: z.string().max(160).nullable(),
});
export const CodeChangeSchema = z.object({
  id: CodeChangeIdSchema,
  cycleId: ExecutionCycleIdSchema,
  repositoryId: RepositoryIdSchema,
  branch: z.string().min(1).max(255),
  baseCommit: z.string().regex(/^[a-f0-9]{40}$/u),
  headCommit: z
    .string()
    .regex(/^[a-f0-9]{40}$/u)
    .nullable(),
  pullRequestNumber: z.number().int().positive().nullable(),
  pullRequestUrl: z.string().url().nullable(),
  state: z.enum([
    "intended",
    "creating",
    "preserved",
    "committed",
    "pull_request_created",
    "recovery_required",
  ]),
  changedFiles: z.array(ChangedFileSchema),
});

export const ExecutionWorkReportSchema = z.object({
  id: ExecutionWorkReportIdSchema,
  cycleId: ExecutionCycleIdSchema,
  version: z.number().int().positive(),
  objective: z.string().min(1).max(8_000),
  completedWork: z.array(z.string().min(1).max(4_000)),
  incompleteWork: z.array(z.string().min(1).max(4_000)),
  plainLanguageSummary: z.string().min(1).max(16_000),
  technicalSummary: z.string().min(1).max(40_000),
  stopReason: ExecutionStopReasonSchema,
  limitations: z.array(z.string().min(1).max(4_000)),
  risks: z.array(z.string().min(1).max(4_000)),
  nextDecisions: z.array(z.string().min(1).max(4_000)),
  testRunIds: z.array(ExecutionTestRunIdSchema),
  codeChangeIds: z.array(CodeChangeIdSchema),
  contentHash: ContentHashSchema,
  supersedesReportId: ExecutionWorkReportIdSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});

export const ExecutionReviewTypeSchema = z.enum([
  "technical",
  "stakeholder",
  "checkpoint",
]);
export const ExecutionReviewSchema = z.object({
  id: ExecutionReviewIdSchema,
  cycleId: ExecutionCycleIdSchema,
  reportId: ExecutionWorkReportIdSchema,
  reviewerMembershipId: ProjectMembershipIdSchema,
  reviewer: HumanActorReferenceSchema,
  reviewType: ExecutionReviewTypeSchema,
  decision: ApprovalDecisionValueSchema,
  comments: z.string().max(16_000),
  conditions: z.array(z.string().min(1).max(4_000)),
  createdAt: IsoDateTimeSchema,
});
export const DecideExecutionReviewCommandSchema = z
  .object({
    context: CommandContextSchema,
    cycleId: ExecutionCycleIdSchema,
    reportId: ExecutionWorkReportIdSchema,
    reviewerMembershipId: ProjectMembershipIdSchema,
    reviewType: ExecutionReviewTypeSchema,
    decision: ApprovalDecisionValueSchema,
    comments: z.string().trim().max(16_000).default(""),
    conditions: z.array(z.string().min(1).max(4_000)).default([]),
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

export const CancelExecutionCycleCommandSchema = z.object({
  context: CommandContextSchema,
  cycleId: ExecutionCycleIdSchema,
  reason: z.string().trim().min(1).max(4_000),
  gracefulShutdownSeconds: z.number().int().min(5).max(120).default(30),
});

export const RunnerRecoveryCommandSchema = z.object({
  context: CommandContextSchema,
  cycleId: ExecutionCycleIdSchema,
  environmentId: RunnerEnvironmentIdSchema,
  expectedCycleState: z.literal("recovery_required"),
  action: z.enum(["inspect", "reconcile", "cleanup", "release_claims"]),
  dryRun: z.boolean().default(true),
  confirmationToken: z.string().min(32).optional(),
});

export const ExecutionActivityKindSchema = z.enum([
  "cycle_state_changed",
  "claim_acquired",
  "claim_conflict",
  "claim_released",
  "environment_state_changed",
  "capability_issued",
  "capability_renewed",
  "capability_revoked",
  "agent_run_changed",
  "agent_turn_changed",
  "agent_action_changed",
  "agent_action_denied",
  "limit_warning",
  "limit_reached",
  "checkpoint_changed",
  "test_run_changed",
  "work_report_created",
  "code_change_changed",
  "pull_request_changed",
  "review_changed",
  "cleanup_changed",
]);
export const ExecutionActivityEventSchema = z.object({
  id: z.string().uuid(),
  sequence: z.number().int().positive(),
  cycleId: ExecutionCycleIdSchema,
  environmentId: RunnerEnvironmentIdSchema.optional(),
  kind: ExecutionActivityKindSchema,
  occurredAt: IsoDateTimeSchema,
  summary: z.string().min(1).max(2_000),
  safeMetadata: SafeMetadataSchema,
  correlationId: z.string().uuid(),
});
export const ExecutionActivitySseEnvelopeSchema = z.object({
  event: z.literal("execution.activity.v1"),
  id: z.string().min(1).max(120),
  retry: z.number().int().min(500).max(60_000).optional(),
  data: ExecutionActivityEventSchema,
});

export type ExecutionPlanVersion = z.infer<typeof ExecutionPlanVersionSchema>;
export type ExecutionCycle = z.infer<typeof ExecutionCycleSchema>;
export type RunnerCapabilityScope = z.infer<typeof RunnerCapabilityScopeSchema>;
export type ExecutionActivityEvent = z.infer<
  typeof ExecutionActivityEventSchema
>;
