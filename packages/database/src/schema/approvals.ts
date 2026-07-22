import { sql } from "drizzle-orm";
import { boolean, check, foreignKey, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { createdAt, id, lockVersion, requiredJsonObject } from "./common.js";
import { projectMemberships, projects, reauthenticationGrants } from "./identity.js";

export const approvalPolicies = pgTable(
  "approval_policies",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id"),
    stage: text("stage").notNull(),
    name: text("name").notNull(),
    activeVersionId: uuid("active_version_id"),
    createdAt: createdAt(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    unique("approval_policies_org_id_uq").on(t.organisationId, t.id),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "approval_policies_project_fk" }),
    index("approval_policies_scope_stage_idx").on(t.organisationId, t.projectId, t.stage),
  ],
);

export const approvalPolicyVersions = pgTable(
  "approval_policy_versions",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    approvalPolicyId: uuid("approval_policy_id").notNull(),
    versionNumber: integer("version_number").notNull(),
    rules: requiredJsonObject("rules"),
    applicableMode: text("applicable_mode"),
    riskApplicability: requiredJsonObject("risk_applicability"),
    contentHash: text("content_hash").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique("approval_policy_versions_org_id_uq").on(t.organisationId, t.id),
    unique("approval_policy_versions_policy_number_uq").on(t.organisationId, t.approvalPolicyId, t.versionNumber),
    unique("approval_policy_versions_policy_hash_uq").on(t.organisationId, t.approvalPolicyId, t.contentHash),
    foreignKey({ columns: [t.organisationId, t.approvalPolicyId], foreignColumns: [approvalPolicies.organisationId, approvalPolicies.id], name: "approval_policy_versions_policy_fk" }),
    check("approval_policy_versions_number_ck", sql`${t.versionNumber} > 0`),
    check("approval_policy_versions_mode_ck", sql`${t.applicableMode} is null or ${t.applicableMode} in ('light','standard','high_assurance')`),
  ],
);

export const approvalSnapshots = pgTable(
  "approval_snapshots",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    subjectKind: text("subject_kind").notNull(),
    subjectId: uuid("subject_id").notNull(),
    subjectVersionId: uuid("subject_version_id").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    canonicalPayload: jsonb("canonical_payload").$type<Record<string, unknown>>().notNull(),
    dependencyManifest: jsonb("dependency_manifest").$type<Record<string, unknown>>().notNull(),
    hashAlgorithm: text("hash_algorithm").default("sha256").notNull(),
    contentHash: text("content_hash").notNull(),
    createdByActorId: uuid("created_by_actor_id"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("approval_snapshots_org_id_uq").on(t.organisationId, t.id),
    unique("approval_snapshots_project_id_uq").on(t.organisationId, t.projectId, t.id),
    unique("approval_snapshots_org_hash_uq").on(t.organisationId, t.contentHash),
    unique("approval_snapshots_subject_version_hash_uq").on(t.organisationId, t.subjectKind, t.subjectVersionId, t.contentHash),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "approval_snapshots_project_fk" }),
    index("approval_snapshots_subject_idx").on(t.organisationId, t.subjectKind, t.subjectId, t.createdAt),
    check("approval_snapshots_hash_algorithm_ck", sql`${t.hashAlgorithm} = 'sha256'`),
  ],
);

export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    approvalSnapshotId: uuid("approval_snapshot_id").notNull(),
    approvalPolicyVersionId: uuid("approval_policy_version_id").notNull(),
    state: text("state").default("pending").notNull(),
    requestedByActorId: uuid("requested_by_actor_id"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    staleAt: timestamp("stale_at", { withTimezone: true }),
    staleReason: text("stale_reason"),
    replacementRequestId: uuid("replacement_request_id"),
    lockVersion: lockVersion(),
  },
  (t) => [
    unique("approval_requests_org_id_uq").on(t.organisationId, t.id),
    unique("approval_requests_project_id_uq").on(t.organisationId, t.projectId, t.id),
    foreignKey({ columns: [t.organisationId, t.projectId, t.approvalSnapshotId], foreignColumns: [approvalSnapshots.organisationId, approvalSnapshots.projectId, approvalSnapshots.id], name: "approval_requests_snapshot_fk" }),
    foreignKey({ columns: [t.organisationId, t.approvalPolicyVersionId], foreignColumns: [approvalPolicyVersions.organisationId, approvalPolicyVersions.id], name: "approval_requests_policy_version_fk" }),
    index("approval_requests_state_time_idx").on(t.organisationId, t.state, t.requestedAt),
    check("approval_requests_state_ck", sql`${t.state} in ('pending','approved','changes_requested','rejected','withdrawn','stale')`),
    check("approval_requests_stale_metadata_ck", sql`(${t.state} = 'stale') = (${t.staleAt} is not null and ${t.staleReason} is not null)`),
  ],
);

export const approvalRequirements = pgTable(
  "approval_requirements",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    approvalRequestId: uuid("approval_request_id").notNull(),
    requirementKey: text("requirement_key").notNull(),
    authorityPredicate: requiredJsonObject("authority_predicate"),
    minimumDecisions: integer("minimum_decisions").default(1).notNull(),
    distinctPrincipalGroup: text("distinct_principal_group"),
    roleAggregationAllowed: boolean("role_aggregation_allowed").default(false).notNull(),
    reauthenticationRequired: boolean("reauthentication_required").default(false).notNull(),
    status: text("status").default("outstanding").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("approval_requirements_org_id_uq").on(t.organisationId, t.id),
    unique("approval_requirements_request_key_uq").on(t.organisationId, t.approvalRequestId, t.requirementKey),
    foreignKey({ columns: [t.organisationId, t.projectId, t.approvalRequestId], foreignColumns: [approvalRequests.organisationId, approvalRequests.projectId, approvalRequests.id], name: "approval_requirements_request_fk" }),
    check("approval_requirements_minimum_ck", sql`${t.minimumDecisions} > 0`),
    check("approval_requirements_status_ck", sql`${t.status} in ('outstanding','satisfied','blocked','waived')`),
  ],
);

export const approvalDecisions = pgTable(
  "approval_decisions",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    approvalRequestId: uuid("approval_request_id").notNull(),
    approvalRequirementId: uuid("approval_requirement_id").notNull(),
    approvalSnapshotId: uuid("approval_snapshot_id").notNull(),
    reviewerPrincipalId: uuid("reviewer_principal_id").notNull(),
    reviewerProjectMembershipId: uuid("reviewer_project_membership_id").notNull(),
    authoritySnapshot: requiredJsonObject("authority_snapshot"),
    decision: text("decision").notNull(),
    conditions: jsonb("conditions").$type<readonly Record<string, unknown>[]>().default([]).notNull(),
    comment: text("comment"),
    reauthenticationGrantId: uuid("reauthentication_grant_id").references(() => reauthenticationGrants.id, { onDelete: "restrict" }),
    decidedAt: timestamp("decided_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("approval_decisions_org_id_uq").on(t.organisationId, t.id),
    foreignKey({ columns: [t.organisationId, t.projectId, t.approvalRequestId], foreignColumns: [approvalRequests.organisationId, approvalRequests.projectId, approvalRequests.id], name: "approval_decisions_request_fk" }),
    foreignKey({ columns: [t.organisationId, t.approvalRequirementId], foreignColumns: [approvalRequirements.organisationId, approvalRequirements.id], name: "approval_decisions_requirement_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.approvalSnapshotId], foreignColumns: [approvalSnapshots.organisationId, approvalSnapshots.projectId, approvalSnapshots.id], name: "approval_decisions_snapshot_fk" }),
    foreignKey({ columns: [t.organisationId, t.reviewerProjectMembershipId], foreignColumns: [projectMemberships.organisationId, projectMemberships.id], name: "approval_decisions_membership_fk" }),
    index("approval_decisions_request_requirement_idx").on(t.organisationId, t.approvalRequestId, t.approvalRequirementId, t.decidedAt),
    check("approval_decisions_decision_ck", sql`${t.decision} in ('approved','approved_with_conditions','changes_requested','rejected')`),
  ],
);

export const approvalRevocations = pgTable(
  "approval_revocations",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    approvalRequestId: uuid("approval_request_id").notNull(),
    approvalDecisionId: uuid("approval_decision_id"),
    revokedByActorId: uuid("revoked_by_actor_id").notNull(),
    reason: text("reason").notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).defaultNow().notNull(),
    replacementRequestId: uuid("replacement_request_id"),
  },
  (t) => [
    unique("approval_revocations_org_id_uq").on(t.organisationId, t.id),
    foreignKey({ columns: [t.organisationId, t.projectId, t.approvalRequestId], foreignColumns: [approvalRequests.organisationId, approvalRequests.projectId, approvalRequests.id], name: "approval_revocations_request_fk" }),
    foreignKey({ columns: [t.organisationId, t.approvalDecisionId], foreignColumns: [approvalDecisions.organisationId, approvalDecisions.id], name: "approval_revocations_decision_fk" }),
    index("approval_revocations_request_time_idx").on(t.organisationId, t.approvalRequestId, t.effectiveAt),
  ],
);

export const approvalConditionResolutions = pgTable(
  "approval_condition_resolutions",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    approvalDecisionId: uuid("approval_decision_id").notNull(),
    conditionKey: text("condition_key").notNull(),
    resolverPrincipalId: uuid("resolver_principal_id").notNull(),
    status: text("status").notNull(),
    resolution: text("resolution").notNull(),
    evidenceManifest: requiredJsonObject("evidence_manifest"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("approval_condition_resolutions_org_id_uq").on(t.organisationId, t.id),
    foreignKey({ columns: [t.organisationId, t.approvalDecisionId], foreignColumns: [approvalDecisions.organisationId, approvalDecisions.id], name: "approval_condition_resolutions_decision_fk" }),
    index("approval_condition_resolutions_decision_idx").on(t.organisationId, t.approvalDecisionId, t.conditionKey, t.resolvedAt),
    check("approval_condition_resolutions_status_ck", sql`${t.status} in ('accepted','resolved','rejected')`),
  ],
);

export const readinessRuleSets = pgTable(
  "readiness_rule_sets",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id"),
    stage: text("stage").notNull(),
    mode: text("mode").notNull(),
    key: text("key").notNull(),
    activeVersionId: uuid("active_version_id"),
    createdAt: createdAt(),
  },
  (t) => [unique("readiness_rule_sets_org_id_uq").on(t.organisationId, t.id), unique("readiness_rule_sets_scope_key_uq").on(t.organisationId, t.projectId, t.key)],
);

export const readinessRuleSetVersions = pgTable(
  "readiness_rule_set_versions",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    readinessRuleSetId: uuid("readiness_rule_set_id").notNull(),
    versionNumber: integer("version_number").notNull(),
    definitions: requiredJsonObject("definitions"),
    contentHash: text("content_hash").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("readiness_rule_set_versions_org_id_uq").on(t.organisationId, t.id),
    unique("readiness_rule_set_versions_set_number_uq").on(t.organisationId, t.readinessRuleSetId, t.versionNumber),
    foreignKey({ columns: [t.organisationId, t.readinessRuleSetId], foreignColumns: [readinessRuleSets.organisationId, readinessRuleSets.id], name: "readiness_rule_set_versions_set_fk" }),
  ],
);

export const readinessEvaluations = pgTable(
  "readiness_evaluations",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    subjectKind: text("subject_kind").notNull(),
    subjectVersionId: uuid("subject_version_id").notNull(),
    readinessRuleSetVersionId: uuid("readiness_rule_set_version_id").notNull(),
    state: text("state").default("requested").notNull(),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }),
    inputManifest: requiredJsonObject("input_manifest"),
    inputHash: text("input_hash").notNull(),
    completionBasisPoints: integer("completion_basis_points"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("readiness_evaluations_org_id_uq").on(t.organisationId, t.id),
    unique("readiness_evaluations_project_id_uq").on(t.organisationId, t.projectId, t.id),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "readiness_evaluations_project_fk" }),
    foreignKey({ columns: [t.organisationId, t.readinessRuleSetVersionId], foreignColumns: [readinessRuleSetVersions.organisationId, readinessRuleSetVersions.id], name: "readiness_evaluations_rule_version_fk" }),
    index("readiness_evaluations_subject_idx").on(t.organisationId, t.projectId, t.subjectKind, t.subjectVersionId, t.createdAt),
    check("readiness_evaluations_state_ck", sql`${t.state} in ('requested','running','passed','blocked','failed')`),
    check("readiness_evaluations_completion_ck", sql`${t.completionBasisPoints} is null or ${t.completionBasisPoints} between 0 and 10000`),
  ],
);

export const readinessRuleResults = pgTable(
  "readiness_rule_results",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    readinessEvaluationId: uuid("readiness_evaluation_id").notNull(),
    ruleKey: text("rule_key").notNull(),
    severity: text("severity").notNull(),
    outcome: text("outcome").notNull(),
    explanation: text("explanation").notNull(),
    relatedEntities: jsonb("related_entities").$type<readonly Record<string, unknown>[]>().default([]).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("readiness_rule_results_org_id_uq").on(t.organisationId, t.id),
    unique("readiness_rule_results_evaluation_rule_uq").on(t.organisationId, t.readinessEvaluationId, t.ruleKey),
    foreignKey({ columns: [t.organisationId, t.projectId, t.readinessEvaluationId], foreignColumns: [readinessEvaluations.organisationId, readinessEvaluations.projectId, readinessEvaluations.id], name: "readiness_rule_results_evaluation_fk" }),
    check("readiness_rule_results_severity_ck", sql`${t.severity} in ('blocking','warning','informational')`),
    check("readiness_rule_results_outcome_ck", sql`${t.outcome} in ('satisfied','unsatisfied','not_applicable','error')`),
  ],
);
