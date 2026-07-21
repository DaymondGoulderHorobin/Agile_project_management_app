import { invariant } from "./errors.js";
import { createContentHash, type ContentHash, type JsonValue } from "./hash.js";
import type { ActorId, OrganisationId, ProjectId } from "./ids.js";

export interface AiOutputEnvelope<Payload extends JsonValue> {
  readonly id: string;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly useCase: string;
  readonly provider: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly schemaVersion: string;
  readonly inputManifestHash: string;
  readonly payload: Payload;
  readonly outputHash: ContentHash;
  readonly status:
    "proposed" | "accepted" | "edited_and_accepted" | "dismissed";
}

export function createAiOutput<Payload extends JsonValue>(
  input: Omit<AiOutputEnvelope<Payload>, "outputHash" | "status">,
): AiOutputEnvelope<Payload> {
  return Object.freeze({
    ...input,
    outputHash: createContentHash(input.schemaVersion, {
      inputManifestHash: input.inputManifestHash,
      model: input.model,
      payload: input.payload,
      promptVersion: input.promptVersion,
      provider: input.provider,
      useCase: input.useCase,
    }),
    status: "proposed",
  });
}

export function decideAiOutput<Payload extends JsonValue>(
  output: AiOutputEnvelope<Payload>,
  decision: "accepted" | "edited_and_accepted" | "dismissed",
  humanActorId: ActorId,
): AiOutputEnvelope<Payload> & { readonly decidedByActorId: ActorId } {
  invariant(
    output.status === "proposed",
    "AI proposal can be decided only once",
  );
  invariant(
    humanActorId.length > 0,
    "A human actor must decide an AI proposal",
  );
  return Object.freeze({
    ...output,
    status: decision,
    decidedByActorId: humanActorId,
  });
}

export interface DemonstrationComparisonMetrics {
  readonly unsupportedAssumptions: number;
  readonly missingRequirements: number;
  readonly domainQuestionsNotAsked: number;
  readonly missingAcceptanceCriteria: number;
  readonly correctionsRequested: number;
  readonly requirementsDiscovered: number;
  readonly assumptionsPrevented: number;
  readonly acceptanceCriterionCoverageBasisPoints: number;
  readonly traceabilityCoverageBasisPoints: number;
}

export interface DemonstrationComparisonResult {
  readonly id: string;
  readonly comparisonId: string;
  readonly arm: "direct_to_codex" | "platform_assisted";
  readonly fixtureHash: string;
  readonly rubricHash: string;
  readonly resultHash: ContentHash;
  readonly metrics: DemonstrationComparisonMetrics;
  readonly recordedAt: Date;
}

export function createDemonstrationComparisonResult(
  input: Omit<DemonstrationComparisonResult, "resultHash">,
): DemonstrationComparisonResult {
  for (const [key, value] of Object.entries(input.metrics)) {
    invariant(
      Number.isSafeInteger(value) && value >= 0,
      `${key} must be a non-negative integer`,
    );
  }
  invariant(
    input.metrics.acceptanceCriterionCoverageBasisPoints <= 10_000 &&
      input.metrics.traceabilityCoverageBasisPoints <= 10_000,
    "Coverage cannot exceed 100 percent",
  );
  return Object.freeze({
    ...input,
    resultHash: createContentHash("demonstration-comparison-result/v1", {
      arm: input.arm,
      comparisonId: input.comparisonId,
      fixtureHash: input.fixtureHash,
      metrics: {
        unsupportedAssumptions: input.metrics.unsupportedAssumptions,
        missingRequirements: input.metrics.missingRequirements,
        domainQuestionsNotAsked: input.metrics.domainQuestionsNotAsked,
        missingAcceptanceCriteria: input.metrics.missingAcceptanceCriteria,
        correctionsRequested: input.metrics.correctionsRequested,
        requirementsDiscovered: input.metrics.requirementsDiscovered,
        assumptionsPrevented: input.metrics.assumptionsPrevented,
        acceptanceCriterionCoverageBasisPoints:
          input.metrics.acceptanceCriterionCoverageBasisPoints,
        traceabilityCoverageBasisPoints:
          input.metrics.traceabilityCoverageBasisPoints,
      },
      rubricHash: input.rubricHash,
    }),
  });
}
