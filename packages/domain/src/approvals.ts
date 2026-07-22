import { DomainError, invariant } from "./errors.js";
import { createContentHash, type ContentHash, type JsonValue } from "./hash.js";
import type {
  ApprovalDecisionId,
  ApprovalPolicyVersionId,
  ApprovalRequestId,
  ApprovalRequirementId,
  ApprovalSnapshotId,
  ArtifactVersionId,
  OrganisationId,
  ProjectId,
  ProjectMembershipId,
  ReauthenticationGrantId,
  UserId,
} from "./ids.js";
import type {
  ActorType,
  ApprovalDecision,
  ApprovalRequestState,
  ProjectMode,
  ProjectRole,
} from "./types.js";

export interface ApprovalSnapshot {
  readonly id: ApprovalSnapshotId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly subjectKind: string;
  readonly subjectId: string;
  readonly subjectVersionId: ArtifactVersionId | string;
  readonly canonicalPayload: JsonValue;
  readonly dependencyManifest: JsonValue;
  readonly contentHash: ContentHash;
  readonly createdAt: Date;
}

export interface ApprovalRequirement {
  readonly id: ApprovalRequirementId;
  readonly key: string;
  readonly eligibleRoles: readonly ProjectRole[];
  readonly eligibleUserIds: readonly UserId[];
  readonly minimumDecisions: number;
  readonly distinctPrincipalGroup: string | null;
  readonly allowRoleAggregation: boolean;
  readonly requireRecentReauthentication: boolean;
}

export interface ApprovalPolicyVersion {
  readonly id: ApprovalPolicyVersionId;
  readonly mode: ProjectMode;
  readonly requirements: readonly ApprovalRequirement[];
  readonly contentHash: ContentHash;
}

export interface ApprovalCondition {
  readonly key: string;
  readonly description: string;
  readonly binding: boolean;
}

export interface ReauthenticationContext {
  readonly grantId: ReauthenticationGrantId;
  readonly action: string;
  readonly snapshotHash: string;
  readonly verifiedAt: Date;
  readonly expiresAt: Date;
  readonly consumedAt: Date;
}

export interface ApprovalDecisionRecord {
  readonly id: ApprovalDecisionId;
  readonly requestId: ApprovalRequestId;
  readonly requirementId: ApprovalRequirementId;
  readonly snapshotId: ApprovalSnapshotId;
  readonly reviewerUserId: UserId;
  readonly reviewerMembershipId: ProjectMembershipId;
  readonly actorType: ActorType;
  readonly authorityRoles: readonly ProjectRole[];
  readonly decision: ApprovalDecision;
  readonly conditions: readonly ApprovalCondition[];
  readonly resolvedConditionKeys: readonly string[];
  readonly comment: string;
  readonly decidedAt: Date;
  readonly reauthentication: ReauthenticationContext | null;
}

export interface ApprovalRequest {
  readonly id: ApprovalRequestId;
  readonly snapshotId: ApprovalSnapshotId;
  readonly policyVersionId: ApprovalPolicyVersionId;
  readonly state: ApprovalRequestState;
  readonly lockVersion: number;
  readonly requestedAt: Date;
  readonly completedAt: Date | null;
  readonly staleAt: Date | null;
  readonly staleReason: string | null;
}

export interface ApprovalEvaluation {
  readonly state: Extract<
    ApprovalRequestState,
    "approved" | "changes_requested" | "pending" | "rejected"
  >;
  readonly satisfiedRequirementKeys: readonly string[];
  readonly outstandingRequirementKeys: readonly string[];
  readonly blockers: readonly string[];
}

export function createApprovalSnapshot(
  input: Omit<ApprovalSnapshot, "contentHash"> & {
    readonly canonicalSchemaVersion: string;
  },
): ApprovalSnapshot {
  const hashPayload = {
    dependencies: input.dependencyManifest,
    payload: input.canonicalPayload,
    schemaVersion: input.canonicalSchemaVersion,
    subjectId: input.subjectId,
    subjectKind: input.subjectKind,
    subjectVersionId: input.subjectVersionId,
  } satisfies JsonValue;

  return Object.freeze({
    id: input.id,
    organisationId: input.organisationId,
    projectId: input.projectId,
    subjectKind: input.subjectKind,
    subjectId: input.subjectId,
    subjectVersionId: input.subjectVersionId,
    canonicalPayload: input.canonicalPayload,
    dependencyManifest: input.dependencyManifest,
    contentHash: createContentHash(input.canonicalSchemaVersion, hashPayload),
    createdAt: new Date(input.createdAt),
  });
}

function validateDecision(
  request: ApprovalRequest,
  snapshot: ApprovalSnapshot,
  requirement: ApprovalRequirement,
  decision: ApprovalDecisionRecord,
  now: Date,
): string | null {
  if (decision.actorType !== "human") return "Only a human actor may approve";
  if (
    decision.requestId !== request.id ||
    decision.snapshotId !== snapshot.id
  ) {
    return "Decision does not target this request and snapshot";
  }
  if (decision.requirementId !== requirement.id)
    return "Decision targets another requirement";
  const named = requirement.eligibleUserIds.includes(decision.reviewerUserId);
  const role = decision.authorityRoles.some((value) =>
    requirement.eligibleRoles.includes(value),
  );
  if (!named && !role) return "Reviewer lacks evaluated authority";
  if (requirement.requireRecentReauthentication) {
    const reauthentication = decision.reauthentication;
    if (!reauthentication) return "Recent reauthentication is required";
    if (
      reauthentication.action !== "approval.decide" ||
      reauthentication.snapshotHash !== snapshot.contentHash.value ||
      reauthentication.expiresAt.getTime() <= now.getTime() ||
      reauthentication.consumedAt.getTime() > decision.decidedAt.getTime() ||
      reauthentication.consumedAt.getTime() >
        reauthentication.expiresAt.getTime() ||
      now.getTime() - reauthentication.verifiedAt.getTime() > 15 * 60 * 1000
    ) {
      return "Reauthentication grant is invalid, stale, or not snapshot-bound";
    }
  }
  const unresolvedBinding = decision.conditions.some(
    ({ binding, key }) =>
      binding && !decision.resolvedConditionKeys.includes(key),
  );
  if (decision.decision === "approved_with_conditions" && unresolvedBinding) {
    return "Binding approval conditions remain unresolved";
  }
  return null;
}

export function evaluateApproval(
  request: ApprovalRequest,
  snapshot: ApprovalSnapshot,
  policy: ApprovalPolicyVersion,
  decisions: readonly ApprovalDecisionRecord[],
  now: Date,
): ApprovalEvaluation {
  if (request.state === "stale" || request.state === "withdrawn") {
    return {
      state: "pending",
      satisfiedRequirementKeys: [],
      outstandingRequirementKeys: policy.requirements.map(({ key }) => key),
      blockers: [
        `Approval request is ${request.state} and cannot grant authority`,
      ],
    };
  }
  invariant(request.snapshotId === snapshot.id, "Request/snapshot mismatch");
  invariant(request.policyVersionId === policy.id, "Request/policy mismatch");

  const relevantDecisions = decisions.filter(
    ({ requestId }) => requestId === request.id,
  );
  if (relevantDecisions.some(({ decision }) => decision === "rejected")) {
    return {
      state: "rejected",
      satisfiedRequirementKeys: [],
      outstandingRequirementKeys: policy.requirements.map(({ key }) => key),
      blockers: ["A required reviewer rejected the snapshot"],
    };
  }
  if (
    relevantDecisions.some(({ decision }) => decision === "changes_requested")
  ) {
    return {
      state: "changes_requested",
      satisfiedRequirementKeys: [],
      outstandingRequirementKeys: policy.requirements.map(({ key }) => key),
      blockers: ["A required reviewer requested changes"],
    };
  }

  const satisfied: string[] = [];
  const outstanding: string[] = [];
  const blockers: string[] = [];
  const usersByDistinctGroup = new Map<string, Set<UserId>>();

  for (const requirement of policy.requirements) {
    const requirementDecisions = relevantDecisions.filter(
      ({ requirementId, decision }) =>
        requirementId === requirement.id &&
        (decision === "approved" || decision === "approved_with_conditions"),
    );
    const uniqueReviewers = new Map<UserId, ApprovalDecisionRecord>();
    for (const decision of requirementDecisions) {
      const reason = validateDecision(
        request,
        snapshot,
        requirement,
        decision,
        now,
      );
      if (reason) {
        blockers.push(`${requirement.key}: ${reason}`);
        continue;
      }
      uniqueReviewers.set(decision.reviewerUserId, decision);
    }

    if (requirement.distinctPrincipalGroup !== null) {
      const used =
        usersByDistinctGroup.get(requirement.distinctPrincipalGroup) ??
        new Set<UserId>();
      for (const reviewerId of uniqueReviewers.keys()) {
        if (used.has(reviewerId) && !requirement.allowRoleAggregation) {
          uniqueReviewers.delete(reviewerId);
          blockers.push(`${requirement.key}: a distinct reviewer is required`);
        }
      }
      for (const reviewerId of uniqueReviewers.keys()) used.add(reviewerId);
      usersByDistinctGroup.set(requirement.distinctPrincipalGroup, used);
    }

    if (uniqueReviewers.size >= requirement.minimumDecisions)
      satisfied.push(requirement.key);
    else outstanding.push(requirement.key);
  }

  return {
    state: outstanding.length === 0 ? "approved" : "pending",
    satisfiedRequirementKeys: satisfied,
    outstandingRequirementKeys: outstanding,
    blockers,
  };
}

export function applyApprovalEvaluation(
  request: ApprovalRequest,
  evaluation: ApprovalEvaluation,
  expectedLockVersion: number,
  now: Date,
): ApprovalRequest {
  if (request.lockVersion !== expectedLockVersion) {
    throw new DomainError(
      "STALE_VERSION",
      "Approval request was concurrently updated",
    );
  }
  invariant(
    request.state === "pending",
    "Only a pending request can be evaluated",
  );
  return Object.freeze({
    ...request,
    state: evaluation.state,
    completedAt: evaluation.state === "pending" ? null : new Date(now),
    lockVersion: request.lockVersion + 1,
  });
}

export function markApprovalRequestStale(
  request: ApprovalRequest,
  reason: string,
  expectedLockVersion: number,
  now: Date,
): ApprovalRequest {
  if (request.lockVersion !== expectedLockVersion) {
    throw new DomainError(
      "STALE_VERSION",
      "Approval request was concurrently updated",
    );
  }
  invariant(
    request.state === "pending" ||
      request.state === "approved" ||
      request.state === "changes_requested",
    `Approval request in ${request.state} cannot become stale`,
  );
  invariant(reason.trim().length > 0, "A staleness reason is required");
  return Object.freeze({
    ...request,
    state: "stale",
    staleAt: new Date(now),
    staleReason: reason,
    lockVersion: request.lockVersion + 1,
  });
}

export function assertApprovalIsCurrentAuthority(
  request: ApprovalRequest,
  revocationEffectiveAt: Date | null,
): void {
  if (request.state !== "approved") {
    throw new DomainError(
      "FORBIDDEN",
      "Approval request is not currently approved",
      {
        state: request.state,
      },
    );
  }
  if (revocationEffectiveAt !== null) {
    throw new DomainError("FORBIDDEN", "Approval authority has been revoked", {
      revocationEffectiveAt,
    });
  }
}
