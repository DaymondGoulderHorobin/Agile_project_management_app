import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, jsonb, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { contentHash, createdAt, id, lockVersion, originCheck, requiredJsonObject, updatedAt } from "./common.js";
import { projectMemberships, projects } from "./identity.js";

export const questions = pgTable(
  "questions",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    origin: text("origin").notNull(),
    authorActorId: uuid("author_actor_id"),
    prompt: text("prompt").notNull(),
    rationale: text("rationale"),
    status: text("status").default("draft").notNull(),
    parentQuestionId: uuid("parent_question_id"),
    aiOutputId: uuid("ai_output_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    lockVersion: lockVersion(),
  },
  (t) => [
    unique("questions_org_id_uq").on(t.organisationId, t.id),
    unique("questions_project_id_uq").on(t.organisationId, t.projectId, t.id),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "questions_project_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.parentQuestionId], foreignColumns: [t.organisationId, t.projectId, t.id], name: "questions_parent_fk" }),
    index("questions_project_status_idx").on(t.organisationId, t.projectId, t.status, t.createdAt),
    originCheck(t.origin, "questions_origin_ck"),
    check("questions_status_ck", sql`${t.status} in ('draft','open','closed','archived')`),
  ],
);

export const questionAssignments = pgTable(
  "question_assignments",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    questionId: uuid("question_id").notNull(),
    projectMembershipId: uuid("project_membership_id").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    status: text("status").default("assigned").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    lockVersion: lockVersion(),
  },
  (t) => [
    unique("question_assignments_org_id_uq").on(t.organisationId, t.id),
    uniqueIndex("question_assignments_active_member_uq").on(t.organisationId, t.questionId, t.projectMembershipId).where(sql`${t.status} <> 'revoked'`),
    foreignKey({ columns: [t.organisationId, t.projectId, t.questionId], foreignColumns: [questions.organisationId, questions.projectId, questions.id], name: "question_assignments_question_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectMembershipId], foreignColumns: [projectMemberships.organisationId, projectMemberships.id], name: "question_assignments_membership_fk" }),
    index("question_assignments_member_status_idx").on(t.organisationId, t.projectMembershipId, t.status, t.dueAt),
    check("question_assignments_status_ck", sql`${t.status} in ('assigned','viewed','completed','revoked')`),
  ],
);

export const questionResponseDrafts = pgTable(
  "question_response_drafts",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    questionId: uuid("question_id").notNull(),
    projectMembershipId: uuid("project_membership_id").notNull(),
    body: text("body").notNull(),
    autosavedAt: timestamp("autosaved_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    lockVersion: lockVersion(),
  },
  (t) => [
    unique("question_response_drafts_org_id_uq").on(t.organisationId, t.id),
    unique("question_response_drafts_question_member_uq").on(t.organisationId, t.questionId, t.projectMembershipId),
    foreignKey({ columns: [t.organisationId, t.projectId, t.questionId], foreignColumns: [questions.organisationId, questions.projectId, questions.id], name: "question_response_drafts_question_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectMembershipId], foreignColumns: [projectMemberships.organisationId, projectMemberships.id], name: "question_response_drafts_membership_fk" }),
  ],
);

export const questionResponses = pgTable(
  "question_responses",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    questionId: uuid("question_id").notNull(),
    respondentActorId: uuid("respondent_actor_id").notNull(),
    body: text("body").notNull(),
    origin: text("origin").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    supersedesResponseId: uuid("supersedes_response_id"),
    contentHash: contentHash(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("question_responses_org_id_uq").on(t.organisationId, t.id),
    unique("question_responses_project_id_uq").on(t.organisationId, t.projectId, t.id),
    foreignKey({ columns: [t.organisationId, t.projectId, t.questionId], foreignColumns: [questions.organisationId, questions.projectId, questions.id], name: "question_responses_question_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.supersedesResponseId], foreignColumns: [t.organisationId, t.projectId, t.id], name: "question_responses_supersedes_fk" }),
    index("question_responses_question_time_idx").on(t.organisationId, t.questionId, t.submittedAt),
    originCheck(t.origin, "question_responses_origin_ck"),
  ],
);

export const knowledgeSources = pgTable(
  "knowledge_sources",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    sourceType: text("source_type").notNull(),
    title: text("title").notNull(),
    origin: text("origin").notNull(),
    authorActorId: uuid("author_actor_id"),
    sourceOccurredAt: timestamp("source_occurred_at", { withTimezone: true }),
    questionResponseId: uuid("question_response_id"),
    attachmentId: uuid("attachment_id"),
    externalReference: text("external_reference"),
    captureMetadata: requiredJsonObject("capture_metadata"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("knowledge_sources_org_id_uq").on(t.organisationId, t.id),
    unique("knowledge_sources_project_id_uq").on(t.organisationId, t.projectId, t.id),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "knowledge_sources_project_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.questionResponseId], foreignColumns: [questionResponses.organisationId, questionResponses.projectId, questionResponses.id], name: "knowledge_sources_response_fk" }),
    index("knowledge_sources_project_type_idx").on(t.organisationId, t.projectId, t.sourceType, t.createdAt),
    originCheck(t.origin, "knowledge_sources_origin_ck"),
  ],
);

export const sourceFragments = pgTable(
  "source_fragments",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    knowledgeSourceId: uuid("knowledge_source_id").notNull(),
    fragmentKind: text("fragment_kind").notNull(),
    textContent: text("text_content"),
    objectRange: jsonb("object_range").$type<Record<string, unknown>>(),
    contentHash: contentHash(),
    origin: text("origin").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
    supersedesSourceFragmentId: uuid("supersedes_source_fragment_id"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("source_fragments_org_id_uq").on(t.organisationId, t.id),
    unique("source_fragments_project_id_uq").on(t.organisationId, t.projectId, t.id),
    unique("source_fragments_source_hash_uq").on(t.organisationId, t.knowledgeSourceId, t.contentHash),
    foreignKey({ columns: [t.organisationId, t.projectId, t.knowledgeSourceId], foreignColumns: [knowledgeSources.organisationId, knowledgeSources.projectId, knowledgeSources.id], name: "source_fragments_source_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.supersedesSourceFragmentId], foreignColumns: [t.organisationId, t.projectId, t.id], name: "source_fragments_supersedes_fk" }),
    index("source_fragments_source_idx").on(t.organisationId, t.knowledgeSourceId, t.createdAt),
    originCheck(t.origin, "source_fragments_origin_ck"),
    check("source_fragments_content_ck", sql`num_nonnulls(${t.textContent}, ${t.objectRange}) = 1`),
  ],
);

export const sourceFragmentRelationships = pgTable(
  "source_fragment_relationships",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    fromSourceFragmentId: uuid("from_source_fragment_id").notNull(),
    toSourceFragmentId: uuid("to_source_fragment_id").notNull(),
    relation: text("relation").notNull(),
    rationale: text("rationale"),
    actorId: uuid("actor_id"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("source_fragment_relationships_org_id_uq").on(t.organisationId, t.id),
    unique("source_fragment_relationships_edge_uq").on(t.organisationId, t.fromSourceFragmentId, t.toSourceFragmentId, t.relation),
    foreignKey({ columns: [t.organisationId, t.projectId, t.fromSourceFragmentId], foreignColumns: [sourceFragments.organisationId, sourceFragments.projectId, sourceFragments.id], name: "source_fragment_relationships_from_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.toSourceFragmentId], foreignColumns: [sourceFragments.organisationId, sourceFragments.projectId, sourceFragments.id], name: "source_fragment_relationships_to_fk" }),
    check("source_fragment_relationships_relation_ck", sql`${t.relation} in ('supports','contradicts','qualifies','originates_from')`),
    check("source_fragment_relationships_no_self_ck", sql`${t.fromSourceFragmentId} <> ${t.toSourceFragmentId}`),
  ],
);
