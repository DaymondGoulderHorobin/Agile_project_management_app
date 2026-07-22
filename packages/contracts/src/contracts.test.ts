import { describe, expect, it } from "vitest";

import {
  AddWorkItemDependencyCommandSchema,
  AgentActionSchema,
  AiSuggestedQuestionSchema,
  ApprovalDecisionSchema,
  CancelExecutionCycleCommandSchema,
  CreateArtifactVersionCommandSchema,
  CreateChangeProposalCommandSchema,
  CreateExecutionPlanVersionCommandSchema,
  CreateOrganisationCommandSchema,
  CreateProjectCommandSchema,
  CreateReleaseVersionCommandSchema,
  CreateSprintCommandSchema,
  CreateWorkItemCommandSchema,
  DecideApprovalCommandSchema,
  DomainEventEnvelopeSchema,
  ExecutionActivitySseEnvelopeSchema,
  ExecutionCycleIdempotencyKeySchema,
  ExecutionCycleTransitionSchema,
  ExecutionQueueJobSchema,
  ExecutionJobIdSchema,
  ExecutionPlanScopeSchema,
  InviteGuestCommandSchema,
  OrganisationIdSchema,
  ProblemDetailsSchema,
  ProjectWorkflowStateSchema,
  RequestAiGenerationCommandSchema,
  RunnerEnvironmentTransitionSchema,
  SubmitResponseCommandSchema,
  executionCycleIdempotencyKey,
  executionJobId,
} from "./index.js";

const ids = {
  organisation: "019bb9ec-8a01-7000-8000-000000000001",
  project: "019bb9ec-8a01-7000-8000-000000000002",
  membership: "019bb9ec-8a01-7000-8000-000000000003",
  question: "019bb9ec-8a01-7000-8000-000000000004",
  response: "019bb9ec-8a01-7000-8000-000000000005",
  source: "019bb9ec-8a01-7000-8000-000000000006",
  artifact: "019bb9ec-8a01-7000-8000-000000000007",
  artifactVersion: "019bb9ec-8a01-7000-8000-000000000008",
  workItem: "019bb9ec-8a01-7000-8000-000000000009",
  otherWorkItem: "019bb9ec-8a01-7000-8000-00000000000a",
  repository: "019bb9ec-8a01-7000-8000-00000000000b",
  executionPlan: "019bb9ec-8a01-7000-8000-00000000000c",
  executionPlanVersion: "019bb9ec-8a01-7000-8000-00000000000d",
  cycle: "019bb9ec-8a01-7000-8000-00000000000e",
  environment: "019bb9ec-8a01-7000-8000-00000000000f",
  approvalRequest: "019bb9ec-8a01-7000-8000-000000000010",
  approvalRequirement: "019bb9ec-8a01-7000-8000-000000000011",
  approvalSnapshot: "019bb9ec-8a01-7000-8000-000000000012",
  release: "019bb9ec-8a01-7000-8000-000000000013",
  report: "019bb9ec-8a01-7000-8000-000000000014",
  review: "019bb9ec-8a01-7000-8000-000000000015",
  testRun: "019bb9ec-8a01-7000-8000-000000000016",
  codeChange: "019bb9ec-8a01-7000-8000-000000000017",
  aiOutput: "019bb9ec-8a01-7000-8000-000000000018",
  aiJob: "019bb9ec-8a01-7000-8000-000000000019",
  event: "019bb9ec-8a01-7000-8000-00000000001a",
  actor: "019bb9ec-8a01-7000-8000-00000000001b",
  user: "019bb9ec-8a01-7000-8000-00000000001c",
};

const now = "2026-07-22T00:00:00.000Z";
const hash = {
  algorithm: "sha256" as const,
  canonicalSchemaVersion: "v1",
  value: "a".repeat(64),
};
const context = {
  requestId: "019bb9ec-8a01-7000-8000-000000000100",
  correlationId: "019bb9ec-8a01-7000-8000-000000000101",
};
const versionReference = {
  kind: "requirement",
  stableId: ids.artifact,
  versionId: ids.artifactVersion,
  version: 1,
  contentHash: hash,
};

describe("identity, tenancy, and discovery contracts", () => {
  it("accepts UUID identities and rejects unbranded wire garbage", () => {
    expect(OrganisationIdSchema.safeParse(ids.organisation).success).toBe(true);
    expect(OrganisationIdSchema.safeParse("organisation-1").success).toBe(
      false,
    );
  });

  it("keeps the canonical plan review state", () => {
    expect(ProjectWorkflowStateSchema.parse("plan_in_review")).toBe(
      "plan_in_review",
    );
    expect(ProjectWorkflowStateSchema.safeParse("plan_review").success).toBe(
      false,
    );
  });

  it("validates Slice 1 organisation and safe project creation", () => {
    expect(
      CreateOrganisationCommandSchema.parse({
        context,
        name: "Tracework Demo",
        slug: "tracework-demo",
        defaultTimezone: "Pacific/Auckland",
      }).slug,
    ).toBe("tracework-demo");
    expect(
      CreateProjectCommandSchema.safeParse({
        context,
        organisationId: ids.organisation,
        key: "DEMO",
        name: "Practice workflow",
        description: "A synthetic and non-identifiable appointment workflow.",
        mode: "light",
        dataClassification: "general_business",
        timezone: "Pacific/Auckland",
        prohibitedHealthDataAcknowledged: true,
      }).success,
    ).toBe(true);
  });

  it("requires safe acknowledgement and explicit guest grants", () => {
    expect(
      InviteGuestCommandSchema.safeParse({
        context,
        organisationId: ids.organisation,
        projectId: ids.project,
        email: "expert@example.test",
        roles: ["guest", "domain_expert"],
        permissions: ["question.answer", "approval.decide"],
      }).success,
    ).toBe(true);
    expect(
      SubmitResponseCommandSchema.safeParse({
        context,
        projectId: ids.project,
        questionId: ids.question,
        membershipId: ids.membership,
        body: "Practitioners need a generic room allocation view.",
        prohibitedHealthDataAcknowledged: false,
      }).success,
    ).toBe(false);
  });
});

describe("artifact, approval, and Agile contracts", () => {
  it("keeps AI origin and immutable evidence on artifact commands", () => {
    const result = CreateArtifactVersionCommandSchema.safeParse({
      context,
      projectId: ids.project,
      stableKey: "REQ-001",
      origin: "ai_generated_human_edited",
      aiOutputId: ids.aiOutput,
      content: {
        artifactType: "requirement",
        title: "Allocate a treatment room generically",
        narrative:
          "The system shall allocate an available room without patient-identifiable data.",
        requirementClass: "functional",
        priority: "must",
        verificationMethod: "Automated allocation test",
        ownerRole: "developer",
      },
      evidence: [
        {
          sourceFragmentId: ids.source,
          relation: "supports",
          rationale: "Domain expert response",
        },
      ],
      relationships: [],
    });
    expect(result.success).toBe(true);
  });

  it("requires real conditions only for approved_with_conditions", () => {
    const base = {
      context,
      projectId: ids.project,
      approvalRequestId: ids.approvalRequest,
      approvalRequirementId: ids.approvalRequirement,
      approvalSnapshotId: ids.approvalSnapshot,
      reviewerMembershipId: ids.membership,
      expectedSnapshotHash: hash,
      comment: "Reviewed exact version.",
    };
    expect(
      DecideApprovalCommandSchema.safeParse({
        ...base,
        decision: "approved_with_conditions",
        conditions: [],
      }).success,
    ).toBe(false);
    expect(
      DecideApprovalCommandSchema.safeParse({
        ...base,
        decision: "approved_with_conditions",
        conditions: [
          { key: "COND-1", description: "Confirm copy", binding: true },
        ],
      }).success,
    ).toBe(true);
    expect(
      DecideApprovalCommandSchema.safeParse({
        ...base,
        decision: "approved",
        conditions: [
          { key: "COND-1", description: "Not allowed", binding: true },
        ],
      }).success,
    ).toBe(false);
  });

  it("prevents AI actors from being represented as human approval decisions", () => {
    const result = ApprovalDecisionSchema.safeParse({
      id: "019bb9ec-8a01-7000-8000-000000000200",
      projectId: ids.project,
      approvalRequestId: ids.approvalRequest,
      approvalRequirementId: ids.approvalRequirement,
      approvalSnapshotId: ids.approvalSnapshot,
      reviewerMembershipId: ids.membership,
      reviewer: {
        actorType: "ai",
        actorId: ids.actor,
        userId: ids.user,
        displayName: "AI",
      },
      decision: "approved",
      conditions: [],
      comment: "",
      authorityAtDecision: {},
      decidedAt: now,
    });
    expect(result.success).toBe(false);
  });

  it("validates work and sprint commands and forbids self-dependencies", () => {
    expect(
      CreateWorkItemCommandSchema.safeParse({
        context,
        projectId: ids.project,
        kind: "user_story",
        title: "Show appointment availability",
        priority: "high",
        origin: "human_authored",
        requirementVersionIds: [ids.artifactVersion],
        acceptanceCriterionVersionIds: [ids.artifactVersion],
      }).success,
    ).toBe(true);
    expect(
      AddWorkItemDependencyCommandSchema.safeParse({
        context,
        projectId: ids.project,
        predecessorId: ids.workItem,
        successorId: ids.workItem,
        dependencyType: "blocks",
      }).success,
    ).toBe(false);
    expect(
      CreateSprintCommandSchema.safeParse({
        context,
        projectId: ids.project,
        name: "Sprint 1",
        goal: "Deliver a safe generic workflow",
        startsAt: now,
        endsAt: "2026-07-29T00:00:00.000Z",
        orderedWorkItemIds: [ids.workItem, ids.otherWorkItem],
      }).success,
    ).toBe(true);
  });
});

describe("AI provenance and health boundary contracts", () => {
  it("requires AI suggestions to carry an AI origin and rationale", () => {
    expect(
      AiSuggestedQuestionSchema.safeParse({
        prompt: "How should generic room conflicts be resolved?",
        whyItMatters: "The answer controls scheduling behaviour.",
        evidence: [],
        origin: "ai_generated",
      }).success,
    ).toBe(true);
    expect(
      AiSuggestedQuestionSchema.safeParse({
        prompt: "How should conflicts work?",
        whyItMatters: "Required",
        evidence: [],
        origin: "human_authored",
      }).success,
    ).toBe(false);
  });

  it("does not dispatch generation before the prohibited-content check passes", () => {
    expect(
      RequestAiGenerationCommandSchema.safeParse({
        context,
        projectId: ids.project,
        useCase: "suggest_questions",
        inputReferences: [versionReference],
        promptCodeVersion: "questions-v1",
        outputSchemaVersion: "questions-v1",
        modelProfileKey: "balanced",
        inputHash: hash,
        prohibitedContentCheckPassed: false,
      }).success,
    ).toBe(false);
  });
});

describe("execution authority and lifecycle contracts", () => {
  const scope = {
    organisationId: ids.organisation,
    projectId: ids.project,
    repositoryId: ids.repository,
    approvedCommit: "b".repeat(40),
    branchStrategy: "create",
    branchName: "codex/demo",
    workspacePaths: [{ path: "apps/web", access: "read_write" }],
    networkDestinations: [
      { scheme: "https", host: "api.openai.com", port: 443 },
    ],
    tools: ["shell", "apply_patch"],
    secrets: [],
    limits: {
      maxTurns: 10,
      maxTasks: 4,
      maxInputTokens: 100_000,
      maxOutputTokens: 30_000,
      maxCostMinorUnits: 2_000,
      currency: "NZD",
      maxDurationSeconds: 3_600,
    },
  };

  it("rejects absolute paths and path traversal before provisioning", () => {
    expect(ExecutionPlanScopeSchema.safeParse(scope).success).toBe(true);
    expect(
      ExecutionPlanScopeSchema.safeParse({
        ...scope,
        workspacePaths: [{ path: "../secrets", access: "read_write" }],
      }).success,
    ).toBe(false);
    expect(
      ExecutionPlanScopeSchema.safeParse({
        ...scope,
        workspacePaths: [{ path: "C:\\secrets", access: "read_write" }],
      }).success,
    ).toBe(false);
  });

  it("validates a complete immutable execution-plan command", () => {
    expect(
      CreateExecutionPlanVersionCommandSchema.safeParse({
        context,
        projectId: ids.project,
        executionPlanId: ids.executionPlan,
        title: "Implement scheduling view",
        objective: "Implement the reviewed, generic scheduling behaviour.",
        projectPlanVersion: { ...versionReference, kind: "plan" },
        workItemIds: [ids.workItem],
        scope,
        acceptanceCriterionVersionIds: [ids.artifactVersion],
        tests: [
          {
            key: "unit",
            label: "Unit tests",
            command: ["pnpm", "test"],
            workingDirectory: ".",
            required: true,
            timeoutSeconds: 600,
          },
        ],
        stopConditions: [
          {
            kind: "checkpoint",
            key: "behaviour-review",
            description: "Stop for human review",
            required: true,
          },
        ],
        requiredReviewTypes: ["technical", "stakeholder"],
      }).success,
    ).toBe(true);
  });

  it("enforces the canonical cycle graph and completion reason", () => {
    expect(
      ExecutionCycleTransitionSchema.safeParse({
        cycleId: ids.cycle,
        from: "requested",
        to: "authorising",
        expectedLockVersion: 0,
        reason: "Authority job started",
      }).success,
    ).toBe(true);
    expect(
      ExecutionCycleTransitionSchema.safeParse({
        cycleId: ids.cycle,
        from: "requested",
        to: "completed",
        expectedLockVersion: 0,
        stopReason: "completed",
        reason: "Invalid shortcut",
      }).success,
    ).toBe(false);
    expect(
      ExecutionCycleTransitionSchema.safeParse({
        cycleId: ids.cycle,
        from: "awaiting_review",
        to: "completed",
        expectedLockVersion: 9,
        stopReason: "tests_failed",
        reason: "Invalid completion",
      }).success,
    ).toBe(false);
  });

  it("enforces the separate environment lifecycle", () => {
    expect(
      RunnerEnvironmentTransitionSchema.safeParse({
        environmentId: ids.environment,
        from: "ready",
        to: "active",
        expectedLockVersion: 2,
        reason: "Final authority recheck passed",
      }).success,
    ).toBe(true);
    expect(
      RunnerEnvironmentTransitionSchema.safeParse({
        environmentId: ids.environment,
        from: "active",
        to: "destroyed",
        expectedLockVersion: 3,
        reason: "Unsafe cleanup shortcut",
      }).success,
    ).toBe(false);
  });

  it("makes duplicate-cycle and queue identifiers deterministic", () => {
    const cycleKey = executionCycleIdempotencyKey(ids.executionPlanVersion);
    const jobKey = executionJobId(ids.cycle, "runner.provision", 1);
    expect(ExecutionCycleIdempotencyKeySchema.parse(cycleKey)).toBe(cycleKey);
    expect(ExecutionJobIdSchema.parse(jobKey)).toBe(jobKey);
    expect(
      ExecutionQueueJobSchema.safeParse({
        id: jobKey,
        name: "runner.provision",
        organisationId: ids.organisation,
        projectId: ids.project,
        cycleId: ids.cycle,
        attempt: 1,
        correlationId: context.correlationId,
        requestedAt: now,
        safeContext: {},
      }).success,
    ).toBe(true);
    expect(
      ExecutionQueueJobSchema.safeParse({
        id: jobKey,
        name: "runner.start",
        organisationId: ids.organisation,
        projectId: ids.project,
        cycleId: ids.cycle,
        attempt: 1,
        correlationId: context.correlationId,
        requestedAt: now,
        safeContext: {},
      }).success,
    ).toBe(false);
  });

  it("requires denied actions to remain denied and never look successful", () => {
    expect(
      AgentActionSchema.safeParse({
        id: "019bb9ec-8a01-7000-8000-000000000300",
        turnId: "019bb9ec-8a01-7000-8000-000000000301",
        sequence: 1,
        type: "file_write",
        targetSummary: "Denied path outside apps/web",
        policyDecision: "denied",
        status: "denied",
        exitCode: null,
        errorClassification: "scope_violation",
        safeMetadata: { path: "blocked/path" },
        occurredAt: now,
      }).success,
    ).toBe(true);
    expect(
      AgentActionSchema.safeParse({
        id: "019bb9ec-8a01-7000-8000-000000000300",
        turnId: "019bb9ec-8a01-7000-8000-000000000301",
        sequence: 1,
        type: "file_write",
        targetSummary: "Denied path",
        policyDecision: "denied",
        status: "completed",
        exitCode: 0,
        errorClassification: null,
        safeMetadata: {},
        occurredAt: now,
      }).success,
    ).toBe(false);
  });

  it("bounds graceful cancellation at the documented 5-120 seconds", () => {
    const base = {
      context,
      cycleId: ids.cycle,
      reason: "User requested cancellation",
    };
    expect(
      CancelExecutionCycleCommandSchema.parse(base).gracefulShutdownSeconds,
    ).toBe(30);
    expect(
      CancelExecutionCycleCommandSchema.safeParse({
        ...base,
        gracefulShutdownSeconds: 4,
      }).success,
    ).toBe(false);
    expect(
      CancelExecutionCycleCommandSchema.safeParse({
        ...base,
        gracefulShutdownSeconds: 121,
      }).success,
    ).toBe(false);
  });

  it("validates reconnectable safe SSE activity", () => {
    expect(
      ExecutionActivitySseEnvelopeSchema.safeParse({
        event: "execution.activity.v1",
        id: "activity-42",
        data: {
          id: ids.event,
          sequence: 42,
          cycleId: ids.cycle,
          environmentId: ids.environment,
          kind: "checkpoint_changed",
          occurredAt: now,
          summary: "Codex stopped for a product decision.",
          safeMetadata: { decisionRequired: true },
          correlationId: context.correlationId,
        },
      }).success,
    ).toBe(true);
  });
});

describe("change, release, API, and event contracts", () => {
  it("validates material change commands", () => {
    expect(
      CreateChangeProposalCommandSchema.safeParse({
        context,
        projectId: ids.project,
        title: "Change cancellation behaviour",
        rationale: "The domain review identified a changed user outcome.",
        proposedClassification: "material",
        origin: "human_authored",
        affectedVersionIds: [ids.artifactVersion],
      }).success,
    ).toBe(true);
  });

  it("requires an exact release evidence chain", () => {
    expect(
      CreateReleaseVersionCommandSchema.safeParse({
        context,
        projectId: ids.project,
        releaseId: ids.release,
        name: "Demo release",
        objective: "Record the reviewed generic workflow.",
        evidence: {
          requirements: [
            {
              requirementVersion: versionReference,
              status: "verified",
              evidence: [],
              explanation: "Verified",
            },
          ],
          workItemIds: [ids.workItem],
          executionCycles: [
            {
              cycleId: ids.cycle,
              reportId: ids.report,
              reviewIds: [ids.review],
              testRunIds: [ids.testRun],
              codeChangeIds: [ids.codeChange],
            },
          ],
          planApprovalSnapshotId: ids.approvalSnapshot,
          executionApprovalSnapshotIds: [ids.approvalSnapshot],
        },
        knownLimitations: ["Deployment is outside this record."],
        unresolvedRisks: [],
        rollbackNote: "Revert the linked commit.",
      }).success,
    ).toBe(true);
  });

  it("uses versioned, tenant-scoped outbox envelopes", () => {
    expect(
      DomainEventEnvelopeSchema.safeParse({
        id: ids.event,
        type: "execution_cycle.state_changed.v1",
        version: 1,
        organisationId: ids.organisation,
        projectId: ids.project,
        aggregateType: "execution_cycle",
        aggregateId: ids.cycle,
        payload: { from: "queued", to: "provisioning" },
        correlationId: context.correlationId,
        occurredAt: now,
      }).success,
    ).toBe(true);
  });

  it("validates machine-readable problem details", () => {
    expect(
      ProblemDetailsSchema.safeParse({
        type: "https://tracework.example/problems/stale-approval",
        title: "Approval request is stale",
        status: 409,
        detail: "Review the replacement request before continuing.",
        code: "APPROVAL_REQUEST_STALE",
        requestId: context.requestId,
        correlationId: context.correlationId,
      }).success,
    ).toBe(true);
  });
});
