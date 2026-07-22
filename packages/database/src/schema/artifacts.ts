import { sql } from "drizzle-orm";
import { boolean, check, date, foreignKey, index, integer, jsonb, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { archivedAt, contentHash, createdAt, id, originCheck, requiredJsonObject } from "./common.js";
import { sourceFragments } from "./discovery.js";
import { projects } from "./identity.js";

export const artifacts = pgTable(
  "artifacts",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    type: text("type").notNull(),
    key: text("key").notNull(),
    title: text("title").notNull(),
    lifecycle: text("lifecycle").default("active").notNull(),
    currentVersionId: uuid("current_version_id"),
    createdAt: createdAt(),
    archivedAt: archivedAt(),
  },
  (t) => [
    unique("artifacts_org_id_uq").on(t.organisationId, t.id),
    unique("artifacts_project_id_uq").on(t.organisationId, t.projectId, t.id),
    unique("artifacts_project_key_uq").on(t.organisationId, t.projectId, t.key),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "artifacts_project_fk" }),
    index("artifacts_project_type_idx").on(t.organisationId, t.projectId, t.type, t.lifecycle),
    check("artifacts_type_ck", sql`${t.type} in ('requirement','assumption','risk','decision','acceptance_criterion','plan','design','release_plan')`),
  ],
);

export const artifactVersions = pgTable(
  "artifact_versions",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    artifactId: uuid("artifact_id").notNull(),
    versionNumber: integer("version_number").notNull(),
    title: text("title").notNull(),
    narrativeMarkdown: text("narrative_markdown").notNull(),
    origin: text("origin").notNull(),
    authorActorId: uuid("author_actor_id"),
    canonicalSchemaVersion: integer("canonical_schema_version").notNull(),
    canonicalPayload: jsonb("canonical_payload").$type<Record<string, unknown>>().notNull(),
    hashAlgorithm: text("hash_algorithm").default("sha256").notNull(),
    contentHash: contentHash(),
    supersedesVersionId: uuid("supersedes_version_id"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("artifact_versions_org_id_uq").on(t.organisationId, t.id),
    unique("artifact_versions_project_id_uq").on(t.organisationId, t.projectId, t.id),
    unique("artifact_versions_artifact_number_uq").on(t.organisationId, t.artifactId, t.versionNumber),
    unique("artifact_versions_artifact_hash_uq").on(t.organisationId, t.artifactId, t.contentHash),
    foreignKey({ columns: [t.organisationId, t.projectId, t.artifactId], foreignColumns: [artifacts.organisationId, artifacts.projectId, artifacts.id], name: "artifact_versions_artifact_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.supersedesVersionId], foreignColumns: [t.organisationId, t.projectId, t.id], name: "artifact_versions_supersedes_fk" }),
    index("artifact_versions_history_idx").on(t.organisationId, t.artifactId, t.versionNumber),
    originCheck(t.origin, "artifact_versions_origin_ck"),
    check("artifact_versions_number_ck", sql`${t.versionNumber} > 0`),
    check("artifact_versions_hash_algorithm_ck", sql`${t.hashAlgorithm} = 'sha256'`),
  ],
);

export const artifactVersionStateEvents = pgTable(
  "artifact_version_state_events",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    artifactVersionId: uuid("artifact_version_id").notNull(),
    sequence: integer("sequence").notNull(),
    state: text("state").notNull(),
    actorId: uuid("actor_id"),
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("artifact_version_state_events_org_id_uq").on(t.organisationId, t.id),
    unique("artifact_version_state_events_version_sequence_uq").on(t.organisationId, t.artifactVersionId, t.sequence),
    foreignKey({ columns: [t.organisationId, t.projectId, t.artifactVersionId], foreignColumns: [artifactVersions.organisationId, artifactVersions.projectId, artifactVersions.id], name: "artifact_version_state_events_version_fk" }),
    check("artifact_version_state_events_state_ck", sql`${t.state} in ('proposed','draft','in_review','accepted','frozen','superseded','archived')`),
  ],
);

export const artifactVersionRelationships = pgTable(
  "artifact_version_relationships",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    fromArtifactVersionId: uuid("from_artifact_version_id").notNull(),
    toArtifactVersionId: uuid("to_artifact_version_id").notNull(),
    relationType: text("relation_type").notNull(),
    rationale: text("rationale"),
    actorId: uuid("actor_id"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("artifact_version_relationships_org_id_uq").on(t.organisationId, t.id),
    unique("artifact_version_relationships_edge_uq").on(t.organisationId, t.fromArtifactVersionId, t.toArtifactVersionId, t.relationType),
    foreignKey({ columns: [t.organisationId, t.projectId, t.fromArtifactVersionId], foreignColumns: [artifactVersions.organisationId, artifactVersions.projectId, artifactVersions.id], name: "artifact_version_relationships_from_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.toArtifactVersionId], foreignColumns: [artifactVersions.organisationId, artifactVersions.projectId, artifactVersions.id], name: "artifact_version_relationships_to_fk" }),
    check("artifact_version_relationships_no_self_ck", sql`${t.fromArtifactVersionId} <> ${t.toArtifactVersionId}`),
  ],
);

export const artifactVersionEvidenceLinks = pgTable(
  "artifact_version_evidence_links",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    artifactVersionId: uuid("artifact_version_id").notNull(),
    sourceFragmentId: uuid("source_fragment_id").notNull(),
    relation: text("relation").notNull(),
    rationale: text("rationale"),
    linkOrigin: text("link_origin").notNull(),
    confidenceBasisPoints: integer("confidence_basis_points"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("artifact_version_evidence_links_org_id_uq").on(t.organisationId, t.id),
    unique("artifact_version_evidence_links_edge_uq").on(t.organisationId, t.artifactVersionId, t.sourceFragmentId, t.relation),
    foreignKey({ columns: [t.organisationId, t.projectId, t.artifactVersionId], foreignColumns: [artifactVersions.organisationId, artifactVersions.projectId, artifactVersions.id], name: "artifact_version_evidence_links_version_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.sourceFragmentId], foreignColumns: [sourceFragments.organisationId, sourceFragments.projectId, sourceFragments.id], name: "artifact_version_evidence_links_fragment_fk" }),
    index("artifact_version_evidence_links_fragment_idx").on(t.organisationId, t.sourceFragmentId),
    check("artifact_version_evidence_links_relation_ck", sql`${t.relation} in ('supports','contradicts','qualifies','originates_from')`),
    check("artifact_version_evidence_links_confidence_ck", sql`${t.confidenceBasisPoints} is null or ${t.confidenceBasisPoints} between 0 and 10000`),
  ],
);

const typedVersionColumns = () => ({
  artifactVersionId: uuid("artifact_version_id").primaryKey().references(() => artifactVersions.id, { onDelete: "cascade" }),
  organisationId: uuid("organisation_id").notNull(),
  projectId: uuid("project_id").notNull(),
});

export const requirementVersions = pgTable("requirement_versions", {
  ...typedVersionColumns(),
  requirementClass: text("requirement_class").notNull(),
  priority: text("priority").notNull(),
  verificationMethod: text("verification_method").notNull(),
  ownerRole: text("owner_role"),
  status: text("status").notNull(),
});

export const assumptionVersions = pgTable("assumption_versions", {
  ...typedVersionColumns(),
  confidence: text("confidence").notNull(),
  validationMethod: text("validation_method"),
  dueDate: date("due_date"),
  resolutionStatus: text("resolution_status").notNull(),
});

export const riskVersions = pgTable("risk_versions", {
  ...typedVersionColumns(),
  likelihood: integer("likelihood").notNull(),
  impact: integer("impact").notNull(),
  severity: integer("severity").notNull(),
  ownerRole: text("owner_role"),
  responseStrategy: text("response_strategy"),
  residualSeverity: integer("residual_severity"),
});

export const decisionVersions = pgTable("decision_versions", {
  ...typedVersionColumns(),
  decisionStatus: text("decision_status").notNull(),
  decisionDate: date("decision_date"),
  decisionOwner: text("decision_owner"),
  alternativesAndCriteria: requiredJsonObject("alternatives_and_criteria"),
});

export const acceptanceCriterionVersions = pgTable("acceptance_criterion_versions", {
  ...typedVersionColumns(),
  criterionFormat: text("criterion_format").notNull(),
  verificationType: text("verification_type").notNull(),
  automatable: boolean("automatable").default(false).notNull(),
});

export const planVersions = pgTable("plan_versions", {
  ...typedVersionColumns(),
  objective: text("objective").notNull(),
  intendedUsers: text("intended_users").notNull(),
  successDefinition: text("success_definition").notNull(),
  dependencyManifest: requiredJsonObject("dependency_manifest"),
  readinessEvaluationId: uuid("readiness_evaluation_id"),
});

export const designVersions = pgTable("design_versions", {
  ...typedVersionColumns(),
  designType: text("design_type").notNull(),
  structuredReferences: requiredJsonObject("structured_references"),
});

export const releasePlanVersions = pgTable("release_plan_versions", {
  ...typedVersionColumns(),
  releaseObjective: text("release_objective").notNull(),
  targetWindow: text("target_window"),
  inclusionPolicy: requiredJsonObject("inclusion_policy"),
  rollbackSummary: text("rollback_summary"),
  communicationSummary: text("communication_summary"),
});
