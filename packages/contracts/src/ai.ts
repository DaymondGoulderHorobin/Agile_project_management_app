import { z } from "zod";

import {
  CommandContextSchema,
  ContentHashSchema,
  IsoDateTimeSchema,
  OriginSchema,
  SafeMetadataSchema,
  VersionReferenceSchema,
} from "./common.js";
import { EvidenceReferenceSchema } from "./discovery.js";
import {
  AiJobIdSchema,
  AiOutputIdSchema,
  DemonstrationComparisonIdSchema,
  DemonstrationComparisonResultIdSchema,
  ProjectIdSchema,
  SourceFragmentIdSchema,
} from "./ids.js";

export const AiUseCaseSchema = z.enum([
  "suggest_questions",
  "suggest_follow_ups",
  "extract_requirements",
  "detect_assumptions",
  "detect_conflicts",
  "identify_risks",
  "generate_acceptance_criteria",
  "generate_backlog",
  "summarise_plan",
  "explain_readiness",
  "generate_work_report",
  "demonstration_comparison",
]);
export const AiJobStateSchema = z.enum([
  "requested",
  "filtering",
  "queued",
  "running",
  "completed",
  "refused",
  "failed",
  "cancelling",
  "cancelled",
]);
export const AiProposalStateSchema = z.enum([
  "proposed",
  "accepted",
  "edited_and_accepted",
  "dismissed",
  "expired",
]);

export const AiInputReferenceSchema = VersionReferenceSchema.or(
  z.object({
    kind: z.literal("source_fragment"),
    sourceFragmentId: SourceFragmentIdSchema,
  }),
);

export const RequestAiGenerationCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  useCase: AiUseCaseSchema,
  inputReferences: z.array(AiInputReferenceSchema).min(1),
  promptCodeVersion: z.string().min(1).max(120),
  outputSchemaVersion: z.string().min(1).max(120),
  modelProfileKey: z.string().min(1).max(120),
  inputHash: ContentHashSchema,
  prohibitedContentCheckPassed: z.literal(true),
});

export const AiJobSchema = z.object({
  id: AiJobIdSchema,
  projectId: ProjectIdSchema,
  useCase: AiUseCaseSchema,
  state: AiJobStateSchema,
  idempotencyKey: z.string().min(8).max(240),
  inputHash: ContentHashSchema,
  promptCodeVersion: z.string().min(1),
  outputSchemaVersion: z.string().min(1),
  modelProfileKey: z.string().min(1),
  requestedAt: IsoDateTimeSchema,
  completedAt: IsoDateTimeSchema.nullable(),
});

export const EvidenceCitationSchema = EvidenceReferenceSchema.extend({
  quotedExcerpt: z.string().max(1_000).optional(),
});

export const AiSuggestedQuestionSchema = z.object({
  prompt: z.string().min(1).max(12_000),
  whyItMatters: z.string().min(1).max(4_000),
  evidence: z.array(EvidenceCitationSchema),
  origin: z.literal("ai_generated"),
});

export const AiArtifactProposalSchema = z.object({
  artifactType: z.enum([
    "requirement",
    "assumption",
    "risk",
    "acceptance_criterion",
  ]),
  title: z.string().min(1).max(240),
  narrative: z.string().min(1).max(100_000),
  rationale: z.string().min(1).max(8_000),
  evidence: z.array(EvidenceCitationSchema),
  unsupportedClaims: z.array(z.string().min(1).max(4_000)),
  origin: z.literal("ai_generated"),
});

export const AiOutputSchema = z.object({
  id: AiOutputIdSchema,
  jobId: AiJobIdSchema,
  schemaVersion: z.string().min(1).max(120),
  origin: z.literal("ai_generated"),
  proposalState: AiProposalStateSchema,
  payload: z.unknown(),
  refusalCode: z.string().nullable(),
  providerMetadata: SafeMetadataSchema,
  createdAt: IsoDateTimeSchema,
});

export const DispositionAiOutputCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  aiOutputId: AiOutputIdSchema,
  disposition: z.enum(["accepted", "edited_and_accepted", "dismissed"]),
  targetKind: z.string().min(1).max(80).optional(),
  targetId: z.string().uuid().optional(),
});

export const ContentProvenanceSchema = z.object({
  targetKind: z.string().min(1).max(80),
  targetId: z.string().uuid(),
  targetVersionId: z.string().uuid().optional(),
  origin: OriginSchema,
  aiOutputId: AiOutputIdSchema.optional(),
  transformation: z.enum([
    "accepted",
    "edited",
    "extracted",
    "imported",
    "derived",
  ]),
  createdAt: IsoDateTimeSchema,
});

export const AiUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cachedInputTokens: z.number().int().nonnegative().default(0),
  costMinorUnits: z.number().int().nonnegative(),
  currency: z.string().length(3),
  estimated: z.boolean(),
});

export const DemonstrationComparisonStateSchema = z.enum([
  "requested",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export const DemonstrationMetricSchema = z.object({
  key: z.enum([
    "requirements_discovered",
    "unsupported_assumptions",
    "assumptions_prevented",
    "domain_questions",
    "acceptance_criterion_coverage",
    "corrections_required",
    "stakeholder_confidence",
    "traceability",
  ]),
  value: z.number(),
  unit: z.string().min(1).max(80),
  examples: z.array(z.string().max(2_000)),
  limitations: z.array(z.string().max(2_000)),
});
export const DemonstrationComparisonResultSchema = z.object({
  id: DemonstrationComparisonResultIdSchema,
  comparisonId: DemonstrationComparisonIdSchema,
  version: z.number().int().positive(),
  cohort: z.enum(["direct_to_codex", "platform_assisted"]),
  methodSchemaVersion: z.string().min(1).max(120),
  inputHash: ContentHashSchema,
  outputHash: ContentHashSchema,
  metrics: z.array(DemonstrationMetricSchema),
  contentHash: ContentHashSchema,
  supersedesResultId: DemonstrationComparisonResultIdSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});

export type AiJob = z.infer<typeof AiJobSchema>;
export type AiOutput = z.infer<typeof AiOutputSchema>;
export type AiSuggestedQuestion = z.infer<typeof AiSuggestedQuestionSchema>;
