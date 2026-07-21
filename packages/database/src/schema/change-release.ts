import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { approvalSnapshots } from "./approvals.js";
import { artifactVersions } from "./artifacts.js";
import { createdAt, id, lockVersion, originCheck, requiredJsonObject } from "./common.js";
import { projects } from "./identity.js";
import { repositories } from "./repositories.js";
import { executionCycles, executionReviews, executionWorkReports } from "./runner.js";
import { workItems } from "./agile.js";

export const changeProposals = pgTable(
  "change_proposals",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    key: text("key").notNull(),
    title: text("title").notNull(),
    currentVersionId: uuid("current_version_id"),
    state: text("state").default("proposed").notNull(),
    createdAt: createdAt(),
    lockVersion: lockVersion(),
  },
  (t) => [
    unique("change_proposals_org_id_uq").on(t.organisationId, t.id),
    unique("change_proposals_project_id_uq").on(t.organisationId, t.projectId, t.id),
    unique("change_proposals_project_key_uq").on(t.organisationId, t.projectId, t.key),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "change_proposals_project_fk" }),
    check("change_proposals_state_ck", sql`${t.state} in ('proposed','classified','impact_assessed','approved','rejected','applying','applied','recovery_required')`),
  ],
);

export const changeProposalVersions = pgTable(
  "change_proposal_versions",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    changeProposalId: uuid("change_proposal_id").notNull(),
    versionNumber: integer("version_number").notNull(),
    rationale: text("rationale").notNull(),
    proposedClassification: text("proposed_classification").notNull(),
    confirmedClassification: text("confirmed_classification"),
    origin: text("origin").notNull(),
    authorActorId: uuid("author_actor_id"),
    changeDetail: jsonb("change_detail").$type<Record<string, unknown>>().notNull(),
    contentHash: text("content_hash").notNull(),
    supersedesVersionId: uuid("supersedes_version_id"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("change_proposal_versions_org_id_uq").on(t.organisationId, t.id),
    unique("change_proposal_versions_project_id_uq").on(t.organisationId, t.projectId, t.id),
    unique("change_proposal_versions_proposal_number_uq").on(t.organisationId, t.changeProposalId, t.versionNumber),
    unique("change_proposal_versions_proposal_hash_uq").on(t.organisationId, t.changeProposalId, t.contentHash),
    foreignKey({ columns: [t.organisationId, t.projectId, t.changeProposalId], foreignColumns: [changeProposals.organisationId, changeProposals.projectId, changeProposals.id], name: "change_proposal_versions_proposal_fk" }),
    originCheck(t.origin, "change_proposal_versions_origin_ck"),
    check("change_proposal_versions_proposed_class_ck", sql`${t.proposedClassification} in ('minor','material','fundamental')`),
    check("change_proposal_versions_confirmed_class_ck", sql`${t.confirmedClassification} is null or ${t.confirmedClassification} in ('minor','material','fundamental')`),
  ],
);

export const changeImpactEvaluations = pgTable(
  "change_impact_evaluations",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    changeProposalVersionId: uuid("change_proposal_version_id").notNull(),
    state: text("state").default("requested").notNull(),
    evaluatedClassification: text("evaluated_classification").notNull(),
    inputManifest: requiredJsonObject("input_manifest"),
    inputHash: text("input_hash").notNull(),
    ruleVersion: text("rule_version").notNull(),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique("change_impact_evaluations_org_id_uq").on(t.organisationId, t.id),
    unique("change_impact_evaluations_project_id_uq").on(t.organisationId, t.projectId, t.id),
    unique("change_impact_evaluations_completed_input_uq").on(t.organisationId, t.changeProposalVersionId, t.inputHash),
    foreignKey({ columns: [t.organisationId, t.projectId, t.changeProposalVersionId], foreignColumns: [changeProposalVersions.organisationId, changeProposalVersions.projectId, changeProposalVersions.id], name: "change_impact_evaluations_version_fk" }),
    check("change_impact_evaluations_state_ck", sql`${t.state} in ('requested','running','completed','failed')`),
    check("change_impact_evaluations_class_ck", sql`${t.evaluatedClassification} in ('minor','material','fundamental')`),
  ],
);

export const changeImpactEntries = pgTable(
  "change_impact_entries",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    changeImpactEvaluationId: uuid("change_impact_evaluation_id").notNull(),
    affectedSubjectKind: text("affected_subject_kind").notNull(),
    affectedSubjectId: uuid("affected_subject_id").notNull(),
    affectedSubjectVersionId: uuid("affected_subject_version_id"),
    effect: text("effect").notNull(),
    reason: text("reason").notNull(),
    ruleKey: text("rule_key").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("change_impact_entries_org_id_uq").on(t.organisationId, t.id),
    unique("change_impact_entries_meaningful_uq").on(t.organisationId, t.changeImpactEvaluationId, t.affectedSubjectKind, t.affectedSubjectId, t.affectedSubjectVersionId, t.effect),
    foreignKey({ columns: [t.organisationId, t.projectId, t.changeImpactEvaluationId], foreignColumns: [changeImpactEvaluations.organisationId, changeImpactEvaluations.projectId, changeImpactEvaluations.id], name: "change_impact_entries_evaluation_fk" }),
    check("change_impact_entries_effect_ck", sql`${t.effect} in ('none','review','supersede','stale_approval','cancel_cycle','reverify_release')`),
  ],
);

export const changeApplications = pgTable(
  "change_applications",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    changeProposalVersionId: uuid("change_proposal_version_id").notNull(),
    approvalSnapshotId: uuid("approval_snapshot_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    state: text("state").default("approved").notNull(),
    safeRecoveryMetadata: requiredJsonObject("safe_recovery_metadata"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lockVersion: lockVersion(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("change_applications_org_id_uq").on(t.organisationId, t.id),
    unique("change_applications_version_uq").on(t.organisationId, t.changeProposalVersionId),
    unique("change_applications_idempotency_uq").on(t.organisationId, t.projectId, t.idempotencyKey),
    foreignKey({ columns: [t.organisationId, t.projectId, t.changeProposalVersionId], foreignColumns: [changeProposalVersions.organisationId, changeProposalVersions.projectId, changeProposalVersions.id], name: "change_applications_version_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.approvalSnapshotId], foreignColumns: [approvalSnapshots.organisationId, approvalSnapshots.projectId, approvalSnapshots.id], name: "change_applications_snapshot_fk" }),
    check("change_applications_state_ck", sql`${t.state} in ('approved','applying','applied','recovery_required')`),
  ],
);

export const testCases = pgTable(
  "test_cases",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    key: text("key").notNull(),
    title: text("title").notNull(),
    type: text("type").notNull(),
    definition: requiredJsonObject("definition"),
    versionNumber: integer("version_number").notNull(),
    status: text("status").default("active").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("test_cases_org_id_uq").on(t.organisationId, t.id),
    unique("test_cases_project_id_uq").on(t.organisationId, t.projectId, t.id),
    unique("test_cases_project_key_version_uq").on(t.organisationId, t.projectId, t.key, t.versionNumber),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "test_cases_project_fk" }),
  ],
);

export const testCaseAcceptanceCriteria = pgTable(
  "test_case_acceptance_criteria",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    testCaseId: uuid("test_case_id").notNull(),
    acceptanceCriterionArtifactVersionId: uuid("acceptance_criterion_artifact_version_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("test_case_acceptance_criteria_org_id_uq").on(t.organisationId, t.id),
    unique("test_case_acceptance_criteria_pair_uq").on(t.organisationId, t.testCaseId, t.acceptanceCriterionArtifactVersionId),
    foreignKey({ columns: [t.organisationId, t.projectId, t.testCaseId], foreignColumns: [testCases.organisationId, testCases.projectId, testCases.id], name: "test_case_acceptance_criteria_test_case_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.acceptanceCriterionArtifactVersionId], foreignColumns: [artifactVersions.organisationId, artifactVersions.projectId, artifactVersions.id], name: "test_case_acceptance_criteria_artifact_version_fk" }),
  ],
);

export const testRuns = pgTable(
  "test_runs",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    executionCycleId: uuid("execution_cycle_id"),
    repositoryId: uuid("repository_id"),
    gitRef: text("git_ref"),
    runnerProvider: text("runner_provider").notNull(),
    state: text("state").default("requested").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    summary: requiredJsonObject("summary"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("test_runs_org_id_uq").on(t.organisationId, t.id),
    unique("test_runs_project_id_uq").on(t.organisationId, t.projectId, t.id),
    foreignKey({ columns: [t.organisationId, t.projectId, t.executionCycleId], foreignColumns: [executionCycles.organisationId, executionCycles.projectId, executionCycles.id], name: "test_runs_cycle_fk" }),
    foreignKey({ columns: [t.organisationId, t.repositoryId], foreignColumns: [repositories.organisationId, repositories.id], name: "test_runs_repository_fk" }),
    check("test_runs_state_ck", sql`${t.state} in ('requested','running','passed','failed','cancelled','error')`),
  ],
);

export const testResults = pgTable(
  "test_results",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    testRunId: uuid("test_run_id").notNull(),
    testCaseId: uuid("test_case_id"),
    testKey: text("test_key").notNull(),
    state: text("state").notNull(),
    durationMilliseconds: integer("duration_milliseconds").notNull(),
    outputObjectReference: text("output_object_reference"),
    outputHash: text("output_hash"),
    failureClassification: text("failure_classification"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("test_results_org_id_uq").on(t.organisationId, t.id),
    unique("test_results_project_id_uq").on(t.organisationId, t.projectId, t.id),
    unique("test_results_run_key_uq").on(t.organisationId, t.testRunId, t.testKey),
    foreignKey({ columns: [t.organisationId, t.projectId, t.testRunId], foreignColumns: [testRuns.organisationId, testRuns.projectId, testRuns.id], name: "test_results_run_fk" }),
    check("test_results_state_ck", sql`${t.state} in ('passed','failed','skipped','error')`),
    check("test_results_duration_ck", sql`${t.durationMilliseconds} >= 0`),
  ],
);

export const releases = pgTable(
  "releases",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    state: text("state").default("draft").notNull(),
    currentVersionId: uuid("current_version_id"),
    createdAt: createdAt(),
    lockVersion: lockVersion(),
  },
  (t) => [
    unique("releases_org_id_uq").on(t.organisationId, t.id),
    unique("releases_project_id_uq").on(t.organisationId, t.projectId, t.id),
    unique("releases_project_key_uq").on(t.organisationId, t.projectId, t.key),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "releases_project_fk" }),
    check("releases_state_ck", sql`${t.state} in ('draft','verifying','approval_pending','approved','recorded','superseded')`),
  ],
);

export const releaseVersions = pgTable(
  "release_versions",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    releaseId: uuid("release_id").notNull(),
    versionNumber: integer("version_number").notNull(),
    objective: text("objective").notNull(),
    inclusionManifest: requiredJsonObject("inclusion_manifest"),
    evidenceManifest: requiredJsonObject("evidence_manifest"),
    knownLimitations: text("known_limitations").notNull(),
    unresolvedRisks: text("unresolved_risks").notNull(),
    rollbackNote: text("rollback_note").notNull(),
    contentHash: text("content_hash").notNull(),
    status: text("status").notNull(),
    approvalSnapshotId: uuid("approval_snapshot_id"),
    supersedesVersionId: uuid("supersedes_version_id"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("release_versions_org_id_uq").on(t.organisationId, t.id),
    unique("release_versions_project_id_uq").on(t.organisationId, t.projectId, t.id),
    unique("release_versions_release_number_uq").on(t.organisationId, t.releaseId, t.versionNumber),
    unique("release_versions_release_hash_uq").on(t.organisationId, t.releaseId, t.contentHash),
    foreignKey({ columns: [t.organisationId, t.projectId, t.releaseId], foreignColumns: [releases.organisationId, releases.projectId, releases.id], name: "release_versions_release_fk" }),
    check("release_versions_status_ck", sql`${t.status} in ('draft','frozen','approved','recorded','superseded')`),
  ],
);

export const releaseWorkItems = pgTable(
  "release_work_items",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    releaseVersionId: uuid("release_version_id").notNull(),
    workItemId: uuid("work_item_id").notNull(),
    frozenManifest: requiredJsonObject("frozen_manifest"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("release_work_items_org_id_uq").on(t.organisationId, t.id),
    unique("release_work_items_pair_uq").on(t.organisationId, t.releaseVersionId, t.workItemId),
    foreignKey({ columns: [t.organisationId, t.projectId, t.releaseVersionId], foreignColumns: [releaseVersions.organisationId, releaseVersions.projectId, releaseVersions.id], name: "release_work_items_release_version_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.workItemId], foreignColumns: [workItems.organisationId, workItems.projectId, workItems.id], name: "release_work_items_work_item_fk" }),
  ],
);

export const releaseRequirements = pgTable(
  "release_requirements",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    releaseVersionId: uuid("release_version_id").notNull(),
    requirementArtifactVersionId: uuid("requirement_artifact_version_id").notNull(),
    verificationStatus: text("verification_status").notNull(),
    evidenceReferences: requiredJsonObject("evidence_references"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("release_requirements_org_id_uq").on(t.organisationId, t.id),
    unique("release_requirements_pair_uq").on(t.organisationId, t.releaseVersionId, t.requirementArtifactVersionId),
    foreignKey({ columns: [t.organisationId, t.projectId, t.releaseVersionId], foreignColumns: [releaseVersions.organisationId, releaseVersions.projectId, releaseVersions.id], name: "release_requirements_release_version_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.requirementArtifactVersionId], foreignColumns: [artifactVersions.organisationId, artifactVersions.projectId, artifactVersions.id], name: "release_requirements_artifact_version_fk" }),
    check("release_requirements_status_ck", sql`${t.verificationStatus} in ('unverified','verified','failed','accepted_limitation')`),
  ],
);

export const releaseTestEvidence = pgTable(
  "release_test_evidence",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    releaseVersionId: uuid("release_version_id").notNull(),
    testRunId: uuid("test_run_id").notNull(),
    testResultId: uuid("test_result_id"),
    evidenceHash: text("evidence_hash").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("release_test_evidence_org_id_uq").on(t.organisationId, t.id),
    unique("release_test_evidence_meaningful_uq").on(t.organisationId, t.releaseVersionId, t.testRunId, t.testResultId),
    foreignKey({ columns: [t.organisationId, t.projectId, t.releaseVersionId], foreignColumns: [releaseVersions.organisationId, releaseVersions.projectId, releaseVersions.id], name: "release_test_evidence_release_version_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.testRunId], foreignColumns: [testRuns.organisationId, testRuns.projectId, testRuns.id], name: "release_test_evidence_test_run_fk" }),
  ],
);

export const releaseExecutionEvidence = pgTable(
  "release_execution_evidence",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    releaseVersionId: uuid("release_version_id").notNull(),
    executionCycleId: uuid("execution_cycle_id").notNull(),
    executionWorkReportId: uuid("execution_work_report_id").notNull(),
    executionReviewId: uuid("execution_review_id").notNull(),
    evidenceHash: text("evidence_hash").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("release_execution_evidence_org_id_uq").on(t.organisationId, t.id),
    unique("release_execution_evidence_cycle_uq").on(t.organisationId, t.releaseVersionId, t.executionCycleId),
    foreignKey({ columns: [t.organisationId, t.projectId, t.releaseVersionId], foreignColumns: [releaseVersions.organisationId, releaseVersions.projectId, releaseVersions.id], name: "release_execution_evidence_release_version_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.executionCycleId], foreignColumns: [executionCycles.organisationId, executionCycles.projectId, executionCycles.id], name: "release_execution_evidence_cycle_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.executionWorkReportId], foreignColumns: [executionWorkReports.organisationId, executionWorkReports.projectId, executionWorkReports.id], name: "release_execution_evidence_report_fk" }),
    foreignKey({ columns: [t.organisationId, t.executionReviewId], foreignColumns: [executionReviews.organisationId, executionReviews.id], name: "release_execution_evidence_review_fk" }),
  ],
);
