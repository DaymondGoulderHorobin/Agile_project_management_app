import { z } from "zod";

import {
  CommandContextSchema,
  ContentHashSchema,
  IsoDateTimeSchema,
  OriginSchema,
  VersionReferenceSchema,
} from "./common.js";
import { EvidenceReferenceSchema } from "./discovery.js";
import {
  AiOutputIdSchema,
  ArtifactIdSchema,
  ArtifactVersionIdSchema,
  ProjectIdSchema,
  ReadinessEvaluationIdSchema,
} from "./ids.js";

export const ArtifactTypeSchema = z.enum([
  "requirement",
  "assumption",
  "risk",
  "decision",
  "acceptance_criterion",
  "plan",
  "design",
  "release_plan",
]);
export const ArtifactVersionStateSchema = z.enum([
  "proposed",
  "draft",
  "in_review",
  "accepted",
  "frozen",
  "superseded",
  "archived",
]);
export const ArtifactRelationshipTypeSchema = z.enum([
  "depends_on",
  "implements",
  "verifies",
  "refines",
  "conflicts_with",
  "relates_to",
]);

const ArtifactInputBaseSchema = z.object({
  title: z.string().trim().min(1).max(240),
  narrative: z.string().trim().min(1).max(100_000),
});

export const RequirementInputSchema = ArtifactInputBaseSchema.extend({
  artifactType: z.literal("requirement"),
  requirementClass: z.enum([
    "functional",
    "non_functional",
    "security",
    "ux",
    "constraint",
  ]),
  priority: z.enum(["must", "should", "could", "wont_now"]),
  verificationMethod: z.string().min(1).max(2_000),
  ownerRole: z.string().min(1).max(120),
});
export const AssumptionInputSchema = ArtifactInputBaseSchema.extend({
  artifactType: z.literal("assumption"),
  confidence: z.number().min(0).max(1),
  validationMethod: z.string().min(1).max(2_000),
  dueAt: IsoDateTimeSchema.optional(),
  resolutionStatus: z.enum([
    "unvalidated",
    "validated",
    "invalidated",
    "accepted_risk",
  ]),
});
export const RiskInputSchema = ArtifactInputBaseSchema.extend({
  artifactType: z.literal("risk"),
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  ownerRole: z.string().min(1).max(120),
  responseStrategy: z.string().min(1).max(4_000),
});
export const DecisionInputSchema = ArtifactInputBaseSchema.extend({
  artifactType: z.literal("decision"),
  decisionStatus: z.enum(["proposed", "accepted", "rejected", "superseded"]),
  alternatives: z.array(z.string().min(1).max(2_000)).max(50),
  criteria: z.array(z.string().min(1).max(2_000)).max(50),
});
export const AcceptanceCriterionInputSchema = ArtifactInputBaseSchema.extend({
  artifactType: z.literal("acceptance_criterion"),
  criterionFormat: z.enum(["given_when_then", "rule", "example", "checklist"]),
  verificationType: z.enum(["automated", "manual", "inspection", "analysis"]),
  automatable: z.boolean(),
});
export const PlanInputSchema = ArtifactInputBaseSchema.extend({
  artifactType: z.literal("plan"),
  objective: z.string().min(1).max(8_000),
  intendedUsers: z.array(z.string().min(1).max(240)).min(1).max(50),
  successDefinition: z.string().min(1).max(8_000),
  dependencies: z.array(VersionReferenceSchema).min(1),
});
export const DesignInputSchema = ArtifactInputBaseSchema.extend({
  artifactType: z.literal("design"),
  designType: z.enum([
    "architecture",
    "interaction",
    "data",
    "security",
    "operations",
  ]),
  structuredReferences: z.array(VersionReferenceSchema),
});
export const ReleasePlanInputSchema = ArtifactInputBaseSchema.extend({
  artifactType: z.literal("release_plan"),
  releaseObjective: z.string().min(1).max(8_000),
  targetWindow: z.string().max(240).optional(),
  inclusionPolicy: z.string().min(1).max(8_000),
  rollbackSummary: z.string().min(1).max(8_000),
  communicationSummary: z.string().min(1).max(8_000),
});

export const ArtifactVersionInputSchema = z.discriminatedUnion("artifactType", [
  RequirementInputSchema,
  AssumptionInputSchema,
  RiskInputSchema,
  DecisionInputSchema,
  AcceptanceCriterionInputSchema,
  PlanInputSchema,
  DesignInputSchema,
  ReleasePlanInputSchema,
]);

export const CreateArtifactVersionCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  artifactId: ArtifactIdSchema.optional(),
  stableKey: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[A-Z][A-Z0-9-]*$/u),
  supersedesVersionId: ArtifactVersionIdSchema.optional(),
  origin: OriginSchema,
  aiOutputId: AiOutputIdSchema.optional(),
  content: ArtifactVersionInputSchema,
  evidence: z.array(EvidenceReferenceSchema),
  relationships: z.array(
    z.object({
      toVersionId: ArtifactVersionIdSchema,
      relation: ArtifactRelationshipTypeSchema,
      rationale: z.string().min(1).max(4_000),
    }),
  ),
});

export const ArtifactVersionSchema = z.object({
  id: ArtifactVersionIdSchema,
  artifactId: ArtifactIdSchema,
  projectId: ProjectIdSchema,
  version: z.number().int().positive(),
  state: ArtifactVersionStateSchema,
  origin: OriginSchema,
  content: ArtifactVersionInputSchema,
  contentHash: ContentHashSchema,
  supersedesVersionId: ArtifactVersionIdSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});

export const TransitionArtifactVersionCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  artifactVersionId: ArtifactVersionIdSchema,
  expectedState: ArtifactVersionStateSchema,
  targetState: ArtifactVersionStateSchema,
  reason: z.string().trim().min(1).max(4_000),
});

export const ReadinessStateSchema = z.enum([
  "requested",
  "running",
  "passed",
  "blocked",
  "failed",
]);
export const ReadinessRuleResultSchema = z.object({
  ruleKey: z.string().min(1).max(160),
  severity: z.enum(["blocking", "warning", "informational"]),
  outcome: z.enum(["satisfied", "unsatisfied", "not_applicable", "error"]),
  explanation: z.string().min(1).max(8_000),
  relatedVersions: z.array(VersionReferenceSchema),
});
export const ReadinessEvaluationSchema = z.object({
  id: ReadinessEvaluationIdSchema,
  projectId: ProjectIdSchema,
  subjectKind: z.string().min(1).max(80),
  subjectVersionId: z.string().uuid(),
  state: ReadinessStateSchema,
  inputHash: ContentHashSchema,
  results: z.array(ReadinessRuleResultSchema),
  completionPercentage: z.number().min(0).max(100).nullable(),
  evaluatedAt: IsoDateTimeSchema.nullable(),
});

export const EvaluateReadinessCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  subjectKind: z.string().min(1).max(80),
  subjectVersionId: z.string().uuid(),
  ruleSetVersionId: z.string().uuid(),
});

export const FreezePlanVersionCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  planVersionId: ArtifactVersionIdSchema,
  readinessEvaluationId: ReadinessEvaluationIdSchema,
  expectedContentHash: ContentHashSchema,
});

export type ArtifactVersionInput = z.infer<typeof ArtifactVersionInputSchema>;
export type ArtifactVersion = z.infer<typeof ArtifactVersionSchema>;
