import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, jsonb, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { createdAt, id, lockVersion, originCheck, requiredJsonObject } from "./common.js";
import { organisations, projects } from "./identity.js";

export const aiUseCases = pgTable("ai_use_cases", {
  id: id(),
  key: text("key").notNull().unique(),
  description: text("description").notNull(),
  riskClass: text("risk_class").notNull(),
  interactionMode: text("interaction_mode").notNull(),
  createdAt: createdAt(),
});

export const promptDefinitions = pgTable(
  "prompt_definitions",
  {
    id: id(),
    key: text("key").notNull(),
    codeVersion: text("code_version").notNull(),
    schemaIdentifier: text("schema_identifier").notNull(),
    inputPolicyVersion: text("input_policy_version").notNull(),
    createdAt: createdAt(),
  },
  (t) => [unique("prompt_definitions_key_version_uq").on(t.key, t.codeVersion)],
);

export const modelProfiles = pgTable(
  "model_profiles",
  {
    id: id(),
    organisationId: uuid("organisation_id").references(() => organisations.id, { onDelete: "cascade" }),
    aiUseCaseId: uuid("ai_use_case_id").notNull().references(() => aiUseCases.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    configuration: requiredJsonObject("configuration"),
    budgetDefaults: requiredJsonObject("budget_defaults"),
    enabled: text("enabled").default("enabled").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("model_profiles_use_case_enabled_idx").on(t.aiUseCaseId, t.enabled)],
);

export const aiJobs = pgTable(
  "ai_jobs",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    aiUseCaseId: uuid("ai_use_case_id").notNull().references(() => aiUseCases.id, { onDelete: "restrict" }),
    promptDefinitionId: uuid("prompt_definition_id").notNull().references(() => promptDefinitions.id, { onDelete: "restrict" }),
    modelProfileId: uuid("model_profile_id").notNull().references(() => modelProfiles.id, { onDelete: "restrict" }),
    inputManifest: requiredJsonObject("input_manifest"),
    inputHash: text("input_hash").notNull(),
    state: text("state").default("requested").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    cancellationReason: text("cancellation_reason"),
    requestedByActorId: uuid("requested_by_actor_id"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lockVersion: lockVersion(),
  },
  (t) => [
    unique("ai_jobs_org_id_uq").on(t.organisationId, t.id),
    unique("ai_jobs_project_id_uq").on(t.organisationId, t.projectId, t.id),
    unique("ai_jobs_idempotency_uq").on(t.organisationId, t.projectId, t.idempotencyKey),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "ai_jobs_project_fk" }),
    index("ai_jobs_state_time_idx").on(t.organisationId, t.state, t.requestedAt),
    check("ai_jobs_state_ck", sql`${t.state} in ('requested','filtering','queued','running','completed','refused','failed','cancelling','cancelled')`),
  ],
);

export const aiOutputs = pgTable(
  "ai_outputs",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    aiJobId: uuid("ai_job_id").notNull(),
    outputSchemaVersion: text("output_schema_version").notNull(),
    structuredOutput: jsonb("structured_output").$type<Record<string, unknown>>().notNull(),
    origin: text("origin").default("ai_generated").notNull(),
    proposalState: text("proposal_state").default("proposed").notNull(),
    refusalOrErrorClassification: text("refusal_or_error_classification"),
    humanDispositionActorId: uuid("human_disposition_actor_id"),
    humanDispositionAt: timestamp("human_disposition_at", { withTimezone: true }),
    acceptedTargetKind: text("accepted_target_kind"),
    acceptedTargetId: uuid("accepted_target_id"),
    rawObjectReference: text("raw_object_reference"),
    rawObjectExpiresAt: timestamp("raw_object_expires_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique("ai_outputs_org_id_uq").on(t.organisationId, t.id),
    unique("ai_outputs_project_id_uq").on(t.organisationId, t.projectId, t.id),
    foreignKey({ columns: [t.organisationId, t.projectId, t.aiJobId], foreignColumns: [aiJobs.organisationId, aiJobs.projectId, aiJobs.id], name: "ai_outputs_job_fk" }),
    originCheck(t.origin, "ai_outputs_origin_ck"),
    check("ai_outputs_origin_ai_ck", sql`${t.origin} in ('ai_generated','ai_generated_human_edited')`),
    check("ai_outputs_proposal_state_ck", sql`${t.proposalState} in ('proposed','accepted','edited_and_accepted','dismissed','expired')`),
    check("ai_outputs_human_disposition_ck", sql`(${t.proposalState} in ('accepted','edited_and_accepted','dismissed')) = (${t.humanDispositionActorId} is not null and ${t.humanDispositionAt} is not null)`),
  ],
);

export const contentProvenanceLinks = pgTable(
  "content_provenance_links",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    targetKind: text("target_kind").notNull(),
    targetId: uuid("target_id").notNull(),
    targetVersionId: uuid("target_version_id"),
    origin: text("origin").notNull(),
    humanActorId: uuid("human_actor_id"),
    aiOutputId: uuid("ai_output_id"),
    importedSourceReference: text("imported_source_reference"),
    transformationKind: text("transformation_kind").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("content_provenance_links_org_id_uq").on(t.organisationId, t.id),
    foreignKey({ columns: [t.organisationId, t.projectId, t.aiOutputId], foreignColumns: [aiOutputs.organisationId, aiOutputs.projectId, aiOutputs.id], name: "content_provenance_links_ai_output_fk" }),
    index("content_provenance_links_target_idx").on(t.organisationId, t.projectId, t.targetKind, t.targetId),
    originCheck(t.origin, "content_provenance_links_origin_ck"),
    check("content_provenance_links_source_ck", sql`num_nonnulls(${t.aiOutputId}, ${t.importedSourceReference}, ${t.humanActorId}) >= 1`),
  ],
);

export const aiUsageEvents = pgTable(
  "ai_usage_events",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    aiJobId: uuid("ai_job_id").notNull(),
    providerRequestId: text("provider_request_id").notNull(),
    eventKey: text("event_key").notNull(),
    inputTokens: integer("input_tokens").default(0).notNull(),
    cachedInputTokens: integer("cached_input_tokens").default(0).notNull(),
    outputTokens: integer("output_tokens").default(0).notNull(),
    costMinorUnits: integer("cost_minor_units").default(0).notNull(),
    currency: text("currency").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    unique("ai_usage_events_org_id_uq").on(t.organisationId, t.id),
    unique("ai_usage_events_provider_event_uq").on(t.providerRequestId, t.eventKey),
    foreignKey({ columns: [t.organisationId, t.projectId, t.aiJobId], foreignColumns: [aiJobs.organisationId, aiJobs.projectId, aiJobs.id], name: "ai_usage_events_job_fk" }),
    check("ai_usage_events_nonnegative_ck", sql`${t.inputTokens} >= 0 and ${t.cachedInputTokens} >= 0 and ${t.outputTokens} >= 0 and ${t.costMinorUnits} >= 0`),
  ],
);

export const aiEvaluationCases = pgTable(
  "ai_evaluation_cases",
  {
    id: id(),
    aiUseCaseId: uuid("ai_use_case_id").notNull().references(() => aiUseCases.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    datasetVersion: text("dataset_version").notNull(),
    fixtureData: requiredJsonObject("fixture_data"),
    expectedAssertions: requiredJsonObject("expected_assertions"),
    sensitivityClassification: text("sensitivity_classification").default("synthetic_general_business").notNull(),
    createdAt: createdAt(),
  },
  (t) => [unique("ai_evaluation_cases_use_case_key_version_uq").on(t.aiUseCaseId, t.key, t.datasetVersion)],
);

export const aiEvaluationRuns = pgTable("ai_evaluation_runs", {
  id: id(),
  aiUseCaseId: uuid("ai_use_case_id").notNull().references(() => aiUseCases.id, { onDelete: "restrict" }),
  promptDefinitionId: uuid("prompt_definition_id").notNull().references(() => promptDefinitions.id, { onDelete: "restrict" }),
  modelProfileId: uuid("model_profile_id").notNull().references(() => modelProfiles.id, { onDelete: "restrict" }),
  datasetVersion: text("dataset_version").notNull(),
  scoresAndResults: requiredJsonObject("scores_and_results"),
  releaseGateOutcome: text("release_gate_outcome").notNull(),
  createdAt: createdAt(),
});

export const demonstrationComparisons = pgTable(
  "demonstration_comparisons",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    syntheticScenarioKey: text("synthetic_scenario_key").notNull(),
    fixtureVersion: text("fixture_version").notNull(),
    baselineInputObjectReference: text("baseline_input_object_reference").notNull(),
    baselineInputHash: text("baseline_input_hash").notNull(),
    platformManifest: requiredJsonObject("platform_manifest"),
    state: text("state").default("requested").notNull(),
    currentResultId: uuid("current_result_id"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lockVersion: lockVersion(),
  },
  (t) => [
    unique("demonstration_comparisons_org_id_uq").on(t.organisationId, t.id),
    unique("demonstration_comparisons_project_fixture_uq").on(t.organisationId, t.projectId, t.syntheticScenarioKey, t.fixtureVersion),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "demonstration_comparisons_project_fk" }),
    check("demonstration_comparisons_state_ck", sql`${t.state} in ('requested','running','completed','failed','cancelled')`),
  ],
);

export const demonstrationComparisonResults = pgTable(
  "demonstration_comparison_results",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    demonstrationComparisonId: uuid("demonstration_comparison_id").notNull(),
    resultVersion: integer("result_version").notNull(),
    methodSchemaVersion: text("method_schema_version").notNull(),
    baselineOutputObjectReference: text("baseline_output_object_reference").notNull(),
    baselineOutputHash: text("baseline_output_hash").notNull(),
    platformOutputManifest: requiredJsonObject("platform_output_manifest"),
    platformOutputHash: text("platform_output_hash").notNull(),
    structuredFindings: requiredJsonObject("structured_findings"),
    traceabilityMetrics: requiredJsonObject("traceability_metrics"),
    stakeholderConfidenceEvidence: requiredJsonObject("stakeholder_confidence_evidence"),
    contentHash: text("content_hash").notNull(),
    supersedesResultId: uuid("supersedes_result_id"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("demonstration_comparison_results_org_id_uq").on(t.organisationId, t.id),
    unique("demonstration_comparison_results_comparison_version_uq").on(t.organisationId, t.demonstrationComparisonId, t.resultVersion),
    unique("demonstration_comparison_results_comparison_hash_uq").on(t.organisationId, t.demonstrationComparisonId, t.contentHash),
    foreignKey({ columns: [t.organisationId, t.demonstrationComparisonId], foreignColumns: [demonstrationComparisons.organisationId, demonstrationComparisons.id], name: "demonstration_comparison_results_comparison_fk" }),
    check("demonstration_comparison_results_version_ck", sql`${t.resultVersion} > 0`),
  ],
);
