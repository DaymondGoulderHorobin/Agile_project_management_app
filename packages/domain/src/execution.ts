import { createHash, timingSafeEqual } from "node:crypto";
import path from "node:path";

import { DomainError, invariant } from "./errors.js";
import type {
  ExecutionCycleId,
  ExecutionPlanVersionId,
  ExecutionWorkItemClaimId,
  OrganisationId,
  ProjectId,
  RunnerCapabilityGrantId,
  RunnerEnvironmentId,
  WorkItemId,
} from "./ids.js";
import type {
  ClaimReleaseReason,
  ExecutionCycleState,
  ExecutionStopReason,
  RunnerEnvironmentState,
} from "./types.js";

export interface ExecutionLimits {
  readonly maxTurns: number;
  readonly maxTasks: number;
  readonly maxTokens: number;
  readonly maxCostMinorUnits: number;
  readonly maxDurationSeconds: number;
}

export interface ExecutionUsage {
  readonly turns: number;
  readonly tasks: number;
  readonly tokens: number;
  readonly costMinorUnits: number;
  readonly durationSeconds: number;
}

export interface NetworkDestination {
  readonly protocol: "https";
  readonly hostname: string;
  readonly port: number;
}

export interface ExecutionScope {
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly executionCycleId: ExecutionCycleId;
  readonly repositoryId: string;
  readonly approvedCommit: string;
  readonly branch: string;
  readonly allowedPaths: readonly string[];
  readonly deniedPaths: readonly string[];
  readonly networkDestinations: readonly NetworkDestination[];
  readonly tools: readonly string[];
  readonly secretNames: readonly string[];
  readonly limits: ExecutionLimits;
}

export interface ExecutionPlanVersion {
  readonly id: ExecutionPlanVersionId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly workItemIds: readonly WorkItemId[];
  readonly objective: string;
  readonly scope: Omit<ExecutionScope, "executionCycleId">;
  readonly requiredTests: readonly string[];
  readonly checkpointKeys: readonly string[];
  readonly approvalSnapshotHash: string;
}

export interface ExecutionCycle {
  readonly id: ExecutionCycleId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly executionPlanVersionId: ExecutionPlanVersionId;
  readonly state: ExecutionCycleState;
  readonly stopReason: ExecutionStopReason | null;
  readonly lockVersion: number;
  readonly sideEffectsObserved: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CycleTransitionContext {
  readonly authorityCurrent?: boolean;
  readonly repositoryAccessCurrent?: boolean;
  readonly claimsAcquired?: boolean;
  readonly capabilityValid?: boolean;
  readonly environmentReady?: boolean;
  readonly testsPassed?: boolean;
  readonly reportComplete?: boolean;
  readonly reviewsPassed?: boolean;
  readonly capabilitiesRevoked?: boolean;
  readonly environmentsDestroyed?: boolean;
  readonly stopReason?: ExecutionStopReason;
}

const CYCLE_TRANSITIONS: Readonly<
  Record<ExecutionCycleState, readonly ExecutionCycleState[]>
> = {
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
  cancelling: ["cancelled", "recovery_required"],
  completed: [],
  cancelled: [],
  failed: [],
  recovery_required: [],
};

export function cycleIdempotencyKey(
  executionPlanVersionId: ExecutionPlanVersionId,
): string {
  return `execution-cycle:${executionPlanVersionId}`;
}

export type ExecutionJobStage =
  | "execution.authorise"
  | "runner.provision"
  | "runner.start"
  | "execution.run-tests"
  | "execution.generate-report"
  | "execution.cancel"
  | "runner.cleanup"
  | "execution.request-review"
  | "execution.reconcile";

export function executionJobId(
  cycleId: ExecutionCycleId,
  stage: ExecutionJobStage,
  attempt: number,
): string {
  invariant(
    Number.isSafeInteger(attempt) && attempt >= 1,
    "Job attempt must be positive",
  );
  return `cycle:${cycleId}:${stage}:${attempt}`;
}

function assertCompletionGuard(context: CycleTransitionContext): void {
  invariant(
    context.stopReason === "completed",
    "Completed cycle needs completed stop reason",
  );
  invariant(
    context.testsPassed === true,
    "Completed cycle needs passing required tests",
  );
  invariant(
    context.reportComplete === true,
    "Completed cycle needs a complete work report",
  );
  invariant(
    context.reviewsPassed === true,
    "Completed cycle needs all required reviews",
  );
  invariant(
    context.capabilitiesRevoked === true,
    "Completed cycle needs revoked capabilities",
  );
  invariant(
    context.environmentsDestroyed === true,
    "Completed cycle needs destroyed environments",
  );
}

function assertRunningGuard(context: CycleTransitionContext): void {
  invariant(
    context.authorityCurrent === true,
    "Starting or resuming needs current authority",
  );
  invariant(
    context.repositoryAccessCurrent === true,
    "Repository authority must remain current",
  );
  invariant(
    context.capabilityValid === true,
    "A valid short-lived capability is required",
  );
  invariant(
    context.environmentReady === true,
    "The isolated runner environment must be ready",
  );
}

export function transitionExecutionCycle(
  cycle: ExecutionCycle,
  next: ExecutionCycleState,
  expectedLockVersion: number,
  now: Date,
  context: CycleTransitionContext = {},
): ExecutionCycle {
  if (cycle.lockVersion !== expectedLockVersion) {
    throw new DomainError(
      "STALE_VERSION",
      "Execution cycle was concurrently updated",
    );
  }
  if (!CYCLE_TRANSITIONS[cycle.state].includes(next)) {
    throw new DomainError(
      "INVALID_TRANSITION",
      `${cycle.state} cannot transition to ${next}`,
    );
  }
  if (cycle.state === "authorising" && next === "queued") {
    invariant(
      context.authorityCurrent === true,
      "Queueing needs current approval and membership",
    );
    invariant(
      context.repositoryAccessCurrent === true,
      "Queueing needs current repository access",
    );
    invariant(
      context.claimsAcquired === true,
      "Queueing needs the complete atomic claim set",
    );
  }
  if (next === "running") assertRunningGuard(context);
  if (next === "completed") assertCompletionGuard(context);
  if (next === "checkpoint_waiting") {
    invariant(
      context.stopReason === "checkpoint_reached",
      "Checkpoint state needs exact stop reason",
    );
  }
  if (next === "human_input_required") {
    invariant(
      context.stopReason === "human_input_required" ||
        context.stopReason === "scope_violation",
      "Human-input state needs a human decision or denied-scope reason",
    );
  }
  if (next === "recovery_required") {
    invariant(
      cycle.sideEffectsObserved,
      "Recovery is required only when work must be preserved",
    );
  }

  const stopReason = context.stopReason ?? cycle.stopReason;
  return Object.freeze({
    ...cycle,
    state: next,
    stopReason,
    lockVersion: cycle.lockVersion + 1,
    updatedAt: new Date(now),
  });
}

const ENVIRONMENT_TRANSITIONS: Readonly<
  Record<RunnerEnvironmentState, readonly RunnerEnvironmentState[]>
> = {
  requested: ["creating"],
  creating: ["ready"],
  ready: ["active", "revoking"],
  active: ["revoking"],
  revoking: ["destroying"],
  destroying: ["destroyed", "cleanup_failed"],
  cleanup_failed: ["destroying"],
  destroyed: [],
};

export interface RunnerEnvironment {
  readonly id: RunnerEnvironmentId;
  readonly executionCycleId: ExecutionCycleId;
  readonly state: RunnerEnvironmentState;
  readonly lockVersion: number;
  readonly secretsRevokedAt: Date | null;
  readonly updatedAt: Date;
}

export function transitionRunnerEnvironment(
  environment: RunnerEnvironment,
  next: RunnerEnvironmentState,
  expectedLockVersion: number,
  now: Date,
): RunnerEnvironment {
  if (environment.lockVersion !== expectedLockVersion) {
    throw new DomainError(
      "STALE_VERSION",
      "Runner environment was concurrently updated",
    );
  }
  if (!ENVIRONMENT_TRANSITIONS[environment.state].includes(next)) {
    throw new DomainError(
      "INVALID_TRANSITION",
      `${environment.state} cannot transition to ${next}`,
    );
  }
  if (next === "destroying") {
    invariant(
      environment.secretsRevokedAt !== null,
      "Secrets must be revoked before cleanup",
    );
  }
  return Object.freeze({
    ...environment,
    state: next,
    lockVersion: environment.lockVersion + 1,
    updatedAt: new Date(now),
  });
}

export interface RunnerCapabilityGrant {
  readonly id: RunnerCapabilityGrantId;
  readonly executionCycleId: ExecutionCycleId;
  readonly runnerEnvironmentId: RunnerEnvironmentId;
  readonly tokenHash: string;
  readonly scope: ExecutionScope;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
}

function digestToken(rawToken: string): Buffer {
  return createHash("sha256").update(rawToken).digest();
}

export function issueRunnerCapability(
  input: Omit<RunnerCapabilityGrant, "tokenHash" | "revokedAt">,
  rawOpaqueToken: string,
): RunnerCapabilityGrant {
  invariant(
    rawOpaqueToken.length >= 32,
    "Runner capability token needs at least 256 bits of entropy",
  );
  invariant(
    input.expiresAt.getTime() > input.issuedAt.getTime(),
    "Capability must expire after issue",
  );
  invariant(
    input.expiresAt.getTime() - input.issuedAt.getTime() <= 15 * 60 * 1000,
    "Runner capability lifetime must remain short-lived",
  );
  invariant(
    input.scope.executionCycleId === input.executionCycleId,
    "Capability scope must be bound to its execution cycle",
  );
  return Object.freeze({
    ...input,
    tokenHash: digestToken(rawOpaqueToken).toString("hex"),
    revokedAt: null,
  });
}

export function verifyRunnerCapability(
  grant: RunnerCapabilityGrant,
  rawOpaqueToken: string,
  environmentId: RunnerEnvironmentId,
  now: Date,
): void {
  const expected = Buffer.from(grant.tokenHash, "hex");
  const actual = digestToken(rawOpaqueToken);
  const tokenValid =
    expected.length === actual.length && timingSafeEqual(expected, actual);
  if (
    !tokenValid ||
    grant.revokedAt !== null ||
    grant.runnerEnvironmentId !== environmentId ||
    grant.expiresAt.getTime() <= now.getTime()
  ) {
    throw new DomainError(
      "FORBIDDEN",
      "Runner capability is invalid, expired, or revoked",
    );
  }
}

export function revokeRunnerCapability(
  grant: RunnerCapabilityGrant,
  now: Date,
): RunnerCapabilityGrant {
  return grant.revokedAt === null
    ? Object.freeze({ ...grant, revokedAt: new Date(now) })
    : grant;
}

function normaliseWorkspacePath(value: string): string | null {
  const slashNormalised = value.replaceAll("\\", "/");
  if (slashNormalised.startsWith("/") || /^[a-z]:\//i.test(slashNormalised))
    return null;
  const normalised = path.posix.normalize(slashNormalised);
  if (
    normalised === ".." ||
    normalised.startsWith("../") ||
    normalised.includes("\0")
  )
    return null;
  return normalised.replace(/^\.\//, "");
}

function pathMatchesPrefix(candidate: string, prefix: string): boolean {
  return candidate === prefix || candidate.startsWith(`${prefix}/`);
}

export type ScopeAction =
  | { readonly kind: "file"; readonly path: string }
  | { readonly kind: "network"; readonly url: string }
  | { readonly kind: "tool"; readonly tool: string }
  | { readonly kind: "secret"; readonly name: string };

export interface ScopeDecision {
  readonly allowed: boolean;
  readonly reason:
    | "allowed"
    | "blocked_file"
    | "blocked_network"
    | "blocked_tool"
    | "blocked_secret";
  readonly sanitisedTarget: string;
}

export function evaluateScopeAction(
  scope: ExecutionScope,
  action: ScopeAction,
): ScopeDecision {
  if (action.kind === "file") {
    const candidate = normaliseWorkspacePath(action.path);
    const allowed = scope.allowedPaths
      .map(normaliseWorkspacePath)
      .filter((item): item is string => item !== null)
      .some(
        (prefix) => candidate !== null && pathMatchesPrefix(candidate, prefix),
      );
    const denied = scope.deniedPaths
      .map(normaliseWorkspacePath)
      .filter((item): item is string => item !== null)
      .some(
        (prefix) => candidate !== null && pathMatchesPrefix(candidate, prefix),
      );
    return {
      allowed: allowed && !denied,
      reason: allowed && !denied ? "allowed" : "blocked_file",
      sanitisedTarget: candidate ?? "invalid-relative-path",
    };
  }
  if (action.kind === "network") {
    let parsed: URL;
    try {
      parsed = new URL(action.url);
    } catch {
      return {
        allowed: false,
        reason: "blocked_network",
        sanitisedTarget: "invalid-url",
      };
    }
    const port = parsed.port === "" ? 443 : Number(parsed.port);
    const allowed = scope.networkDestinations.some(
      (destination) =>
        parsed.protocol === `${destination.protocol}:` &&
        parsed.hostname.toLowerCase() === destination.hostname.toLowerCase() &&
        port === destination.port,
    );
    return {
      allowed,
      reason: allowed ? "allowed" : "blocked_network",
      sanitisedTarget: `${parsed.protocol}//${parsed.hostname}:${port}`,
    };
  }
  if (action.kind === "tool") {
    const allowed = scope.tools.includes(action.tool);
    return {
      allowed,
      reason: allowed ? "allowed" : "blocked_tool",
      sanitisedTarget: action.tool,
    };
  }
  const allowed = scope.secretNames.includes(action.name);
  return {
    allowed,
    reason: allowed ? "allowed" : "blocked_secret",
    sanitisedTarget: allowed ? action.name : "redacted-secret-name",
  };
}

export function validateExecutionLimits(limits: ExecutionLimits): void {
  for (const [key, value] of Object.entries(limits)) {
    invariant(
      Number.isSafeInteger(value) && value > 0,
      `${key} must be a positive safe integer`,
    );
  }
}

export function limitStopReason(
  usage: ExecutionUsage,
  limits: ExecutionLimits,
): ExecutionStopReason | null {
  if (usage.tokens >= limits.maxTokens) return "token_limit";
  if (usage.costMinorUnits >= limits.maxCostMinorUnits) return "cost_limit";
  if (usage.turns >= limits.maxTurns) return "turn_limit";
  if (usage.tasks >= limits.maxTasks) return "task_limit";
  if (usage.durationSeconds >= limits.maxDurationSeconds) return "time_limit";
  return null;
}

export interface ExecutionWorkItemClaim {
  readonly id: ExecutionWorkItemClaimId;
  readonly organisationId: OrganisationId;
  readonly workItemId: WorkItemId;
  readonly executionCycleId: ExecutionCycleId;
  readonly acquiredAt: Date;
  readonly releasedAt: Date | null;
  readonly releaseReason: ClaimReleaseReason | null;
}

export function assertClaimsCanBeAcquired(
  requestedWorkItemIds: readonly WorkItemId[],
  activeClaims: readonly ExecutionWorkItemClaim[],
): void {
  invariant(
    requestedWorkItemIds.length > 0,
    "Execution requires at least one work item",
  );
  invariant(
    new Set(requestedWorkItemIds).size === requestedWorkItemIds.length,
    "Execution plan cannot repeat a work item",
  );
  const conflicts = activeClaims.filter(
    ({ workItemId, releasedAt }) =>
      releasedAt === null && requestedWorkItemIds.includes(workItemId),
  );
  if (conflicts.length > 0) {
    throw new DomainError(
      "CONFLICT",
      "A selected work item is already actively claimed",
      {
        workItemIds: conflicts.map(({ workItemId }) => workItemId),
      },
    );
  }
}

export interface ClaimReleaseEvidence {
  readonly requiredReviewsComplete: boolean;
  readonly cancellationSafelyContained: boolean;
  readonly authorisedRecoveryDecision: boolean;
  readonly authorisedChangeRemovedWork: boolean;
}

export function releaseExecutionWorkItemClaim(
  claim: ExecutionWorkItemClaim,
  reason: ClaimReleaseReason,
  evidence: ClaimReleaseEvidence,
  now: Date,
): ExecutionWorkItemClaim {
  invariant(
    claim.releasedAt === null,
    "An execution work-item claim can be released only once",
  );
  const authorised =
    (reason === "required_review_completed" &&
      evidence.requiredReviewsComplete) ||
    (reason === "safely_cancelled" && evidence.cancellationSafelyContained) ||
    (reason === "authorised_failure_recovery" &&
      evidence.authorisedRecoveryDecision) ||
    (reason === "authorised_change_removed_work" &&
      evidence.authorisedChangeRemovedWork);
  invariant(
    authorised,
    `Claim release reason ${reason} lacks required evidence`,
  );
  return Object.freeze({
    ...claim,
    releasedAt: new Date(now),
    releaseReason: reason,
  });
}

export const RUNNER_GRACEFUL_SHUTDOWN_DEFAULT_SECONDS = 30;
export const RUNNER_GRACEFUL_SHUTDOWN_MIN_SECONDS = 5;
export const RUNNER_GRACEFUL_SHUTDOWN_MAX_SECONDS = 120;

export function validateRunnerGracefulShutdownSeconds(value: number): number {
  invariant(
    Number.isSafeInteger(value),
    "Runner graceful shutdown must be an integer",
  );
  invariant(
    value >= RUNNER_GRACEFUL_SHUTDOWN_MIN_SECONDS &&
      value <= RUNNER_GRACEFUL_SHUTDOWN_MAX_SECONDS,
    "Runner graceful shutdown must be between 5 and 120 seconds",
  );
  return value;
}
