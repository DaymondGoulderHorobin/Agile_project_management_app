import { describe, expect, it } from "vitest";

import {
  assertClaimsCanBeAcquired,
  cycleIdempotencyKey,
  evaluateScopeAction,
  executionJobId,
  issueRunnerCapability,
  limitStopReason,
  releaseExecutionWorkItemClaim,
  revokeRunnerCapability,
  transitionExecutionCycle,
  transitionRunnerEnvironment,
  validateExecutionLimits,
  validateRunnerGracefulShutdownSeconds,
  verifyRunnerCapability,
  type ExecutionCycle,
  type ExecutionScope,
  type ExecutionWorkItemClaim,
  type RunnerEnvironment,
} from "../src/index.js";
import { IDS, NOW } from "./fixtures.js";

const scope: ExecutionScope = {
  organisationId: IDS.organisation,
  projectId: IDS.project,
  executionCycleId: IDS.executionCycle,
  repositoryId: "github:example/fixture",
  approvedCommit: "0123456789abcdef0123456789abcdef01234567",
  branch: "codex/demo",
  allowedPaths: ["src", "tests/safe.test.ts"],
  deniedPaths: ["src/secrets"],
  networkDestinations: [
    { protocol: "https", hostname: "api.github.com", port: 443 },
  ],
  tools: ["read_file", "apply_patch", "test"],
  secretNames: ["github_installation_token"],
  limits: {
    maxTurns: 4,
    maxTasks: 2,
    maxTokens: 10_000,
    maxCostMinorUnits: 500,
    maxDurationSeconds: 600,
  },
};

const requestedCycle = (): ExecutionCycle => ({
  id: IDS.executionCycle,
  organisationId: IDS.organisation,
  projectId: IDS.project,
  executionPlanVersionId: IDS.executionPlanVersion,
  state: "requested",
  stopReason: null,
  lockVersion: 0,
  sideEffectsObserved: false,
  createdAt: NOW,
  updatedAt: NOW,
});

describe("execution lifecycle", () => {
  it("follows the authorised happy path and enforces completion gates", () => {
    let cycle = requestedCycle();
    cycle = transitionExecutionCycle(cycle, "authorising", 0, NOW);
    cycle = transitionExecutionCycle(cycle, "queued", 1, NOW, {
      authorityCurrent: true,
      repositoryAccessCurrent: true,
      claimsAcquired: true,
    });
    cycle = transitionExecutionCycle(cycle, "provisioning", 2, NOW);
    cycle = transitionExecutionCycle(cycle, "running", 3, NOW, {
      authorityCurrent: true,
      repositoryAccessCurrent: true,
      capabilityValid: true,
      environmentReady: true,
    });
    cycle = transitionExecutionCycle(cycle, "testing", 4, NOW, {
      stopReason: "completed",
    });
    cycle = transitionExecutionCycle(cycle, "reporting", 5, NOW);
    cycle = transitionExecutionCycle(cycle, "awaiting_review", 6, NOW);

    expect(() => transitionExecutionCycle(cycle, "completed", 7, NOW)).toThrow(
      "Completed cycle needs completed stop reason",
    );
    cycle = transitionExecutionCycle(cycle, "completed", 7, NOW, {
      stopReason: "completed",
      testsPassed: true,
      reportComplete: true,
      reviewsPassed: true,
      capabilitiesRevoked: true,
      environmentsDestroyed: true,
    });
    expect(cycle.state).toBe("completed");
  });

  it("requires exact checkpoint and authority recheck semantics", () => {
    const running: ExecutionCycle = {
      ...requestedCycle(),
      state: "running",
      lockVersion: 4,
    };
    expect(() =>
      transitionExecutionCycle(running, "checkpoint_waiting", 4, NOW),
    ).toThrow("exact stop reason");
    const waiting = transitionExecutionCycle(
      running,
      "checkpoint_waiting",
      4,
      NOW,
      {
        stopReason: "checkpoint_reached",
      },
    );
    expect(() => transitionExecutionCycle(waiting, "running", 5, NOW)).toThrow(
      "current authority",
    );
  });

  it("keeps the environment lifecycle separate and revokes secrets before destruction", () => {
    let environment: RunnerEnvironment = {
      id: IDS.runnerEnvironment,
      executionCycleId: IDS.executionCycle,
      state: "active",
      lockVersion: 0,
      secretsRevokedAt: null,
      updatedAt: NOW,
    };
    environment = transitionRunnerEnvironment(environment, "revoking", 0, NOW);
    expect(() =>
      transitionRunnerEnvironment(environment, "destroying", 1, NOW),
    ).toThrow("Secrets must be revoked");
    environment = { ...environment, secretsRevokedAt: NOW };
    environment = transitionRunnerEnvironment(
      environment,
      "destroying",
      1,
      NOW,
    );
    environment = transitionRunnerEnvironment(
      environment,
      "cleanup_failed",
      2,
      NOW,
    );
    environment = transitionRunnerEnvironment(
      environment,
      "destroying",
      3,
      NOW,
    );
    environment = transitionRunnerEnvironment(environment, "destroyed", 4, NOW);
    expect(environment.state).toBe("destroyed");
  });
});

describe("capability and machine-enforced scope", () => {
  const rawToken = "a".repeat(64);
  const grant = issueRunnerCapability(
    {
      id: IDS.runnerCapability,
      executionCycleId: IDS.executionCycle,
      runnerEnvironmentId: IDS.runnerEnvironment,
      scope,
      issuedAt: NOW,
      expiresAt: new Date(NOW.getTime() + 120_000),
    },
    rawToken,
  );

  it("persists only a digest and binds use to environment and expiry", () => {
    expect(grant.tokenHash).not.toContain(rawToken);
    expect(() =>
      verifyRunnerCapability(grant, rawToken, IDS.runnerEnvironment, NOW),
    ).not.toThrow();
    expect(() =>
      verifyRunnerCapability(grant, "b".repeat(64), IDS.runnerEnvironment, NOW),
    ).toThrow();
    expect(() =>
      verifyRunnerCapability(
        revokeRunnerCapability(grant, NOW),
        rawToken,
        IDS.runnerEnvironment,
        NOW,
      ),
    ).toThrow("revoked");
  });

  it.each([
    [{ kind: "file", path: "src/index.ts" } as const, true, "allowed"],
    [
      { kind: "file", path: "src/secrets/token.ts" } as const,
      false,
      "blocked_file",
    ],
    [{ kind: "file", path: "../outside.txt" } as const, false, "blocked_file"],
    [
      { kind: "network", url: "https://api.github.com/repos" } as const,
      true,
      "allowed",
    ],
    [
      { kind: "network", url: "https://example.com" } as const,
      false,
      "blocked_network",
    ],
    [{ kind: "tool", tool: "apply_patch" } as const, true, "allowed"],
    [{ kind: "tool", tool: "shell_admin" } as const, false, "blocked_tool"],
    [{ kind: "secret", name: "unknown" } as const, false, "blocked_secret"],
  ])("evaluates %# without auto-expanding scope", (action, allowed, reason) => {
    expect(evaluateScopeAction(scope, action)).toMatchObject({
      allowed,
      reason,
    });
  });
});

describe("usage, idempotency, cancellation, and active claims", () => {
  it("identifies the first deterministic stop threshold", () => {
    expect(
      limitStopReason(
        {
          turns: 4,
          tasks: 0,
          tokens: 0,
          costMinorUnits: 0,
          durationSeconds: 0,
        },
        scope.limits,
      ),
    ).toBe("turn_limit");
    expect(() =>
      validateExecutionLimits({ ...scope.limits, maxTurns: 0 }),
    ).toThrow("positive");
  });

  it("uses deterministic keys and validated cancellation grace", () => {
    expect(cycleIdempotencyKey(IDS.executionPlanVersion)).toContain(
      IDS.executionPlanVersion,
    );
    expect(executionJobId(IDS.executionCycle, "runner.provision", 2)).toBe(
      `cycle:${IDS.executionCycle}:runner.provision:2`,
    );
    expect([5, 30, 120].map(validateRunnerGracefulShutdownSeconds)).toEqual([
      5, 30, 120,
    ]);
    expect(() => validateRunnerGracefulShutdownSeconds(121)).toThrow(
      "between 5 and 120",
    );
  });

  it("rejects any overlapping active work-item claim", () => {
    const claim: ExecutionWorkItemClaim = {
      id: IDS.workItemClaim,
      organisationId: IDS.organisation,
      workItemId: IDS.workItem,
      executionCycleId: IDS.executionCycle,
      acquiredAt: NOW,
      releasedAt: null,
      releaseReason: null,
    };
    expect(() =>
      assertClaimsCanBeAcquired([IDS.workItem, IDS.otherWorkItem], [claim]),
    ).toThrow("already actively claimed");
    expect(() =>
      assertClaimsCanBeAcquired([IDS.otherWorkItem], [claim]),
    ).not.toThrow();
  });

  it.each([
    ["required_review_completed", "requiredReviewsComplete"],
    ["safely_cancelled", "cancellationSafelyContained"],
    ["authorised_failure_recovery", "authorisedRecoveryDecision"],
    ["authorised_change_removed_work", "authorisedChangeRemovedWork"],
  ] as const)(
    "releases a claim for %s only with its evidence",
    (reason, evidenceKey) => {
      const claim: ExecutionWorkItemClaim = {
        id: IDS.workItemClaim,
        organisationId: IDS.organisation,
        workItemId: IDS.workItem,
        executionCycleId: IDS.executionCycle,
        acquiredAt: NOW,
        releasedAt: null,
        releaseReason: null,
      };
      const emptyEvidence = {
        requiredReviewsComplete: false,
        cancellationSafelyContained: false,
        authorisedRecoveryDecision: false,
        authorisedChangeRemovedWork: false,
      };
      expect(() =>
        releaseExecutionWorkItemClaim(claim, reason, emptyEvidence, NOW),
      ).toThrow("lacks required evidence");
      expect(
        releaseExecutionWorkItemClaim(
          claim,
          reason,
          { ...emptyEvidence, [evidenceKey]: true },
          NOW,
        ).releaseReason,
      ).toBe(reason);
    },
  );
});
