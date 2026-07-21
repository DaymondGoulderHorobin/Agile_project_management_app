import { sql } from "drizzle-orm";
import { boolean, check, foreignKey, index, integer, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { artifactVersions } from "./artifacts.js";
import { createdAt, id, lockVersion, originCheck, updatedAt } from "./common.js";
import { projectMemberships, projects } from "./identity.js";

export const iterations = pgTable(
  "iterations",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    kind: text("kind").default("sprint").notNull(),
    sequence: integer("sequence").notNull(),
    name: text("name").notNull(),
    goal: text("goal").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    state: text("state").default("draft").notNull(),
    approvalSnapshotId: uuid("approval_snapshot_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    lockVersion: lockVersion(),
  },
  (t) => [
    unique("iterations_org_id_uq").on(t.organisationId, t.id),
    unique("iterations_project_id_uq").on(t.organisationId, t.projectId, t.id),
    unique("iterations_project_sequence_uq").on(t.organisationId, t.projectId, t.sequence),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "iterations_project_fk" }),
    index("iterations_project_state_idx").on(t.organisationId, t.projectId, t.state, t.sequence),
    check("iterations_kind_ck", sql`${t.kind} = 'sprint'`),
    check("iterations_state_ck", sql`${t.state} in ('draft','planned','approval_pending','approved','ready','active','completed','cancelled')`),
    check("iterations_time_ck", sql`${t.startsAt} is null or ${t.endsAt} is null or ${t.endsAt} > ${t.startsAt}`),
  ],
);

export const workItems = pgTable(
  "work_items",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    parentWorkItemId: uuid("parent_work_item_id"),
    kind: text("kind").notNull(),
    key: text("key").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: text("status").default("proposed").notNull(),
    priority: text("priority").notNull(),
    orderKey: numeric("order_key", { precision: 24, scale: 12 }).notNull(),
    origin: text("origin").notNull(),
    estimateValue: numeric("estimate_value", { precision: 10, scale: 2 }),
    estimateUnit: text("estimate_unit"),
    createdByActorId: uuid("created_by_actor_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    lockVersion: lockVersion(),
  },
  (t) => [
    unique("work_items_org_id_uq").on(t.organisationId, t.id),
    unique("work_items_project_id_uq").on(t.organisationId, t.projectId, t.id),
    unique("work_items_project_key_uq").on(t.organisationId, t.projectId, t.key),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "work_items_project_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.parentWorkItemId], foreignColumns: [t.organisationId, t.projectId, t.id], name: "work_items_parent_fk" }),
    index("work_items_project_status_order_idx").on(t.organisationId, t.projectId, t.status, t.orderKey),
    originCheck(t.origin, "work_items_origin_ck"),
    check("work_items_kind_ck", sql`${t.kind} in ('epic','story','task','bug')`),
    check("work_items_status_ck", sql`${t.status} in ('proposed','accepted','ready','in_progress','blocked','done','cancelled')`),
  ],
);

export const workItemAssignees = pgTable(
  "work_item_assignees",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    workItemId: uuid("work_item_id").notNull(),
    projectMembershipId: uuid("project_membership_id").notNull(),
    assignedAt: createdAt(),
  },
  (t) => [
    unique("work_item_assignees_org_id_uq").on(t.organisationId, t.id),
    unique("work_item_assignees_work_member_uq").on(t.organisationId, t.workItemId, t.projectMembershipId),
    foreignKey({ columns: [t.organisationId, t.projectId, t.workItemId], foreignColumns: [workItems.organisationId, workItems.projectId, workItems.id], name: "work_item_assignees_work_item_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectMembershipId], foreignColumns: [projectMemberships.organisationId, projectMemberships.id], name: "work_item_assignees_membership_fk" }),
  ],
);

export const workItemDependencies = pgTable(
  "work_item_dependencies",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    predecessorWorkItemId: uuid("predecessor_work_item_id").notNull(),
    successorWorkItemId: uuid("successor_work_item_id").notNull(),
    dependencyType: text("dependency_type").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("work_item_dependencies_org_id_uq").on(t.organisationId, t.id),
    unique("work_item_dependencies_edge_uq").on(t.organisationId, t.predecessorWorkItemId, t.successorWorkItemId, t.dependencyType),
    foreignKey({ columns: [t.organisationId, t.projectId, t.predecessorWorkItemId], foreignColumns: [workItems.organisationId, workItems.projectId, workItems.id], name: "work_item_dependencies_predecessor_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.successorWorkItemId], foreignColumns: [workItems.organisationId, workItems.projectId, workItems.id], name: "work_item_dependencies_successor_fk" }),
    check("work_item_dependencies_no_self_ck", sql`${t.predecessorWorkItemId} <> ${t.successorWorkItemId}`),
  ],
);

export const workItemArtifactVersionLinks = pgTable(
  "work_item_artifact_version_links",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    workItemId: uuid("work_item_id").notNull(),
    artifactVersionId: uuid("artifact_version_id").notNull(),
    relation: text("relation").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("work_item_artifact_version_links_org_id_uq").on(t.organisationId, t.id),
    unique("work_item_artifact_version_links_edge_uq").on(t.organisationId, t.workItemId, t.artifactVersionId, t.relation),
    foreignKey({ columns: [t.organisationId, t.projectId, t.workItemId], foreignColumns: [workItems.organisationId, workItems.projectId, workItems.id], name: "work_item_artifact_version_links_work_item_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.artifactVersionId], foreignColumns: [artifactVersions.organisationId, artifactVersions.projectId, artifactVersions.id], name: "work_item_artifact_version_links_artifact_version_fk" }),
    check("work_item_artifact_version_links_relation_ck", sql`${t.relation} in ('implements','verifies','informed_by','blocked_by')`),
  ],
);

export const iterationWorkItems = pgTable(
  "iteration_work_items",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    iterationId: uuid("iteration_id").notNull(),
    workItemId: uuid("work_item_id").notNull(),
    plannedOrder: integer("planned_order").notNull(),
    committed: boolean("committed").default(false).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("iteration_work_items_org_id_uq").on(t.organisationId, t.id),
    unique("iteration_work_items_iteration_work_uq").on(t.organisationId, t.iterationId, t.workItemId),
    foreignKey({ columns: [t.organisationId, t.projectId, t.iterationId], foreignColumns: [iterations.organisationId, iterations.projectId, iterations.id], name: "iteration_work_items_iteration_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.workItemId], foreignColumns: [workItems.organisationId, workItems.projectId, workItems.id], name: "iteration_work_items_work_item_fk" }),
    index("iteration_work_items_order_idx").on(t.organisationId, t.iterationId, t.plannedOrder),
  ],
);

export const workItemAcceptanceCriteria = pgTable(
  "work_item_acceptance_criteria",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    workItemId: uuid("work_item_id").notNull(),
    acceptanceCriterionArtifactVersionId: uuid("acceptance_criterion_artifact_version_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("work_item_acceptance_criteria_org_id_uq").on(t.organisationId, t.id),
    unique("work_item_acceptance_criteria_pair_uq").on(t.organisationId, t.workItemId, t.acceptanceCriterionArtifactVersionId),
    foreignKey({ columns: [t.organisationId, t.projectId, t.workItemId], foreignColumns: [workItems.organisationId, workItems.projectId, workItems.id], name: "work_item_acceptance_criteria_work_item_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.acceptanceCriterionArtifactVersionId], foreignColumns: [artifactVersions.organisationId, artifactVersions.projectId, artifactVersions.id], name: "work_item_acceptance_criteria_artifact_version_fk" }),
  ],
);
