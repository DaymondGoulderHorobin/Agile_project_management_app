import { DomainError, invariant } from "./errors.js";
import { createContentHash, type ContentHash, type JsonValue } from "./hash.js";
import type {
  ActorId,
  ArtifactId,
  ArtifactVersionId,
  SourceFragmentId,
} from "./ids.js";
import type {
  ArtifactState,
  ArtifactType,
  EvidenceRelation,
  Origin,
} from "./types.js";

export interface AiProvenance {
  readonly aiOutputId: string;
  readonly provider: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly schemaVersion: string;
  readonly inputManifestHash: string;
}

export interface OriginAttribution {
  readonly origin: Origin;
  readonly actorId: ActorId | null;
  readonly aiProvenance: AiProvenance | null;
}

export interface SourceFragmentReference {
  readonly id: SourceFragmentId;
  readonly contentHash: ContentHash;
  readonly supersedesSourceFragmentId: SourceFragmentId | null;
}

export interface EvidenceLink {
  readonly sourceFragmentId: SourceFragmentId;
  readonly artifactVersionId: ArtifactVersionId;
  readonly relation: EvidenceRelation;
  readonly rationale: string;
  readonly origin: Origin;
}

export interface VersionManifestEntry {
  readonly artifactVersionId: ArtifactVersionId;
  readonly contentHash: ContentHash;
  readonly artifactType: ArtifactType;
}

export interface ArtifactVersion<Payload extends JsonValue = JsonValue> {
  readonly id: ArtifactVersionId;
  readonly artifactId: ArtifactId;
  readonly artifactType: ArtifactType;
  readonly version: number;
  readonly title: string;
  readonly narrative: string;
  readonly payload: Payload;
  readonly attribution: OriginAttribution;
  readonly state: ArtifactState;
  readonly contentHash: ContentHash;
  readonly supersedesVersionId: ArtifactVersionId | null;
  readonly createdAt: Date;
}

const ARTIFACT_TRANSITIONS: Readonly<
  Record<ArtifactState, readonly ArtifactState[]>
> = {
  proposed: ["draft"],
  draft: ["in_review", "archived"],
  in_review: ["draft", "accepted", "frozen"],
  accepted: ["superseded", "archived"],
  frozen: ["superseded", "archived"],
  superseded: ["archived"],
  archived: [],
};

function validateOrigin(attribution: OriginAttribution): void {
  const aiOrigin =
    attribution.origin === "ai_generated" ||
    attribution.origin === "ai_generated_human_edited";
  invariant(
    aiOrigin === (attribution.aiProvenance !== null),
    "AI origin must retain AI provenance; non-AI origin must not claim it",
    { origin: attribution.origin },
  );
  invariant(
    attribution.origin !== "human_authored" || attribution.actorId !== null,
    "Human-authored content requires an actor",
  );
}

export interface CreateArtifactVersionInput<Payload extends JsonValue> {
  readonly id: ArtifactVersionId;
  readonly artifactId: ArtifactId;
  readonly artifactType: ArtifactType;
  readonly version: number;
  readonly title: string;
  readonly narrative: string;
  readonly payload: Payload;
  readonly attribution: OriginAttribution;
  readonly state: "proposed" | "draft";
  readonly supersedesVersionId: ArtifactVersionId | null;
  readonly createdAt: Date;
  readonly canonicalSchemaVersion: string;
}

export function createArtifactVersion<Payload extends JsonValue>(
  input: CreateArtifactVersionInput<Payload>,
): Readonly<ArtifactVersion<Payload>> {
  validateOrigin(input.attribution);
  invariant(
    Number.isSafeInteger(input.version) && input.version >= 1,
    "Version must be positive",
  );
  invariant(input.title.trim().length > 0, "Artifact title is required");
  invariant(
    (input.version === 1) === (input.supersedesVersionId === null),
    "Only the first version may omit a superseded version",
  );

  const canonicalPayload = {
    artifactId: input.artifactId,
    artifactType: input.artifactType,
    narrative: input.narrative.replace(/\r\n?/g, "\n"),
    payload: input.payload,
    schemaVersion: input.canonicalSchemaVersion,
    supersedesVersionId: input.supersedesVersionId,
    title: input.title,
    version: input.version,
  } satisfies JsonValue;

  return Object.freeze({
    id: input.id,
    artifactId: input.artifactId,
    artifactType: input.artifactType,
    version: input.version,
    title: input.title,
    narrative: input.narrative.replace(/\r\n?/g, "\n"),
    payload: input.payload,
    attribution: Object.freeze(input.attribution),
    state: input.state,
    contentHash: createContentHash(
      input.canonicalSchemaVersion,
      canonicalPayload,
    ),
    supersedesVersionId: input.supersedesVersionId,
    createdAt: new Date(input.createdAt),
  });
}

export function transitionArtifactState(
  version: ArtifactVersion,
  next: ArtifactState,
): Readonly<ArtifactVersion> {
  const allowed = ARTIFACT_TRANSITIONS[version.state];
  if (!allowed.includes(next)) {
    throw new DomainError(
      "INVALID_TRANSITION",
      `${version.state} cannot transition to ${next}`,
    );
  }

  const approvable =
    version.artifactType === "project_plan" ||
    version.artifactType === "release_plan";
  invariant(
    !(next === "frozen" && !approvable),
    "Only approvable plan subjects may be frozen",
  );
  invariant(
    !(next === "accepted" && approvable),
    "Approvable plan subjects freeze instead of using accepted",
  );

  return Object.freeze({ ...version, state: next });
}

export function assertEvidenceLinkTargetsImmutableRecords(
  link: EvidenceLink,
  fragments: readonly SourceFragmentReference[],
  versions: readonly ArtifactVersion[],
): void {
  const fragment = fragments.find(({ id }) => id === link.sourceFragmentId);
  const version = versions.find(({ id }) => id === link.artifactVersionId);
  if (!fragment || !version) {
    throw new DomainError("NOT_FOUND", "Evidence link target was not found", {
      artifactVersionId: link.artifactVersionId,
      sourceFragmentId: link.sourceFragmentId,
    });
  }
}

export function validateDependencyManifest(
  entries: readonly VersionManifestEntry[],
): void {
  invariant(entries.length > 0, "A plan dependency manifest cannot be empty");
  const ids = new Set(
    entries.map(({ artifactVersionId }) => artifactVersionId),
  );
  invariant(
    ids.size === entries.length,
    "A dependency manifest cannot repeat a version",
  );
  for (const entry of entries) {
    invariant(
      entry.contentHash.algorithm === "sha256",
      "Manifest hashes must use SHA-256",
    );
    invariant(
      entry.contentHash.value.length === 64,
      "Manifest hash is malformed",
    );
  }
}
