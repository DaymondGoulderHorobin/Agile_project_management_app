import { DomainError, invariant } from "./errors.js";
import { createContentHash, type ContentHash, type JsonValue } from "./hash.js";
import type {
  ApprovalSnapshotId,
  ArtifactVersionId,
  ExecutionCycleId,
  ReleaseId,
  ReleaseVersionId,
  WorkItemId,
} from "./ids.js";
import type { ReleaseState } from "./types.js";

export interface ReleaseEvidenceManifest {
  readonly requirementVersionIds: readonly ArtifactVersionId[];
  readonly workItemIds: readonly WorkItemId[];
  readonly executionCycleIds: readonly ExecutionCycleId[];
  readonly codeChangeIds: readonly string[];
  readonly testRunIds: readonly string[];
  readonly executionReviewIds: readonly string[];
  readonly approvalSnapshotIds: readonly ApprovalSnapshotId[];
  readonly knownLimitations: readonly string[];
  readonly rollbackNote: string;
}

export interface ReleaseVerificationInput {
  readonly requirementsVerified: boolean;
  readonly testsPassed: boolean;
  readonly reviewsPassed: boolean;
  readonly approvalRequestsCurrent: boolean;
  readonly conditionsResolved: boolean;
  readonly noOpenProhibitedContentIncident: boolean;
  readonly linksTargetImmutableRecords: boolean;
}

export interface ReleaseVerification {
  readonly ready: boolean;
  readonly blockers: readonly string[];
}

export function verifyRelease(
  input: ReleaseVerificationInput,
): ReleaseVerification {
  const blockers: string[] = [];
  if (!input.requirementsVerified)
    blockers.push("One or more requirements are unverified");
  if (!input.testsPassed) blockers.push("Required tests are missing or failed");
  if (!input.reviewsPassed)
    blockers.push("Required human reviews are incomplete");
  if (!input.approvalRequestsCurrent)
    blockers.push("A required approval is missing or stale");
  if (!input.conditionsResolved)
    blockers.push("A binding condition remains unresolved");
  if (!input.noOpenProhibitedContentIncident)
    blockers.push("A prohibited-content incident is still open");
  if (!input.linksTargetImmutableRecords)
    blockers.push("An evidence link is mutable or missing");
  return Object.freeze({ ready: blockers.length === 0, blockers });
}

export interface ReleaseVersion {
  readonly id: ReleaseVersionId;
  readonly releaseId: ReleaseId;
  readonly version: number;
  readonly state: ReleaseState;
  readonly evidenceManifest: ReleaseEvidenceManifest;
  readonly contentHash: ContentHash;
  readonly lockVersion: number;
  readonly recordedAt: Date | null;
}

export function createReleaseVersion(
  input: Omit<
    ReleaseVersion,
    "contentHash" | "state" | "lockVersion" | "recordedAt"
  > & {
    readonly canonicalSchemaVersion: string;
  },
): ReleaseVersion {
  invariant(
    input.version >= 1 && Number.isSafeInteger(input.version),
    "Release version must be positive",
  );
  invariant(
    input.evidenceManifest.requirementVersionIds.length > 0,
    "Release needs requirements",
  );
  invariant(
    input.evidenceManifest.workItemIds.length > 0,
    "Release needs work items",
  );
  invariant(
    input.evidenceManifest.executionCycleIds.length > 0,
    "Release needs execution evidence",
  );
  invariant(
    input.evidenceManifest.testRunIds.length > 0,
    "Release needs test evidence",
  );
  invariant(
    input.evidenceManifest.executionReviewIds.length > 0,
    "Release needs review evidence",
  );
  const hash = createContentHash(input.canonicalSchemaVersion, {
    evidenceManifest: {
      requirementVersionIds: input.evidenceManifest.requirementVersionIds,
      workItemIds: input.evidenceManifest.workItemIds,
      executionCycleIds: input.evidenceManifest.executionCycleIds,
      codeChangeIds: input.evidenceManifest.codeChangeIds,
      testRunIds: input.evidenceManifest.testRunIds,
      executionReviewIds: input.evidenceManifest.executionReviewIds,
      approvalSnapshotIds: input.evidenceManifest.approvalSnapshotIds,
      knownLimitations: input.evidenceManifest.knownLimitations,
      rollbackNote: input.evidenceManifest.rollbackNote,
    },
    releaseId: input.releaseId,
    version: input.version,
  } satisfies JsonValue);
  return Object.freeze({
    id: input.id,
    releaseId: input.releaseId,
    version: input.version,
    state: "draft",
    evidenceManifest: input.evidenceManifest,
    contentHash: hash,
    lockVersion: 0,
    recordedAt: null,
  });
}

const RELEASE_TRANSITIONS: Readonly<
  Record<ReleaseState, readonly ReleaseState[]>
> = {
  draft: ["verifying"],
  verifying: ["draft", "approval_pending"],
  approval_pending: ["approved", "draft"],
  approved: ["recorded"],
  recorded: [],
};

export function transitionRelease(
  release: ReleaseVersion,
  next: ReleaseState,
  expectedLockVersion: number,
  verification: ReleaseVerification | null,
  approvalSnapshotId: ApprovalSnapshotId | null,
  now: Date,
): ReleaseVersion {
  if (release.lockVersion !== expectedLockVersion) {
    throw new DomainError("STALE_VERSION", "Release was concurrently updated");
  }
  if (!RELEASE_TRANSITIONS[release.state].includes(next)) {
    throw new DomainError(
      "INVALID_TRANSITION",
      `${release.state} cannot transition to ${next}`,
    );
  }
  if (next === "approval_pending")
    invariant(verification?.ready, "Release blockers must be resolved");
  if (next === "approved" || next === "recorded") {
    invariant(
      approvalSnapshotId !== null,
      "Release approval must target an immutable snapshot",
    );
  }
  return Object.freeze({
    ...release,
    state: next,
    lockVersion: release.lockVersion + 1,
    recordedAt: next === "recorded" ? new Date(now) : null,
  });
}
