import { sql } from "drizzle-orm";
import { boolean, check, foreignKey, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { createdAt, id, lockVersion, requiredJsonObject } from "./common.js";
import { organisations, projects } from "./identity.js";

export const workflowDefinitions = pgTable(
  "workflow_definitions",
  {
    id: id(),
    organisationId: uuid("organisation_id").references(() => organisations.id, { onDelete: "cascade" }),
    ownerKind: text("owner_kind").notNull(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    methodology: text("methodology").default("agile").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("workflow_definitions_owner_key_uq").on(t.organisationId, t.ownerKind, t.key),
    check("workflow_definitions_owner_ck", sql`(${t.ownerKind} = 'system' and ${t.organisationId} is null) or (${t.ownerKind} = 'organisation' and ${t.organisationId} is not null)`),
  ],
);

export const workflowVersions = pgTable(
  "workflow_versions",
  {
    id: id(),
    workflowDefinitionId: uuid("workflow_definition_id").notNull().references(() => workflowDefinitions.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    status: text("status").notNull(),
    configuration: requiredJsonObject("configuration"),
    contentHash: text("content_hash").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique("workflow_versions_definition_version_uq").on(t.workflowDefinitionId, t.versionNumber),
    unique("workflow_versions_definition_hash_uq").on(t.workflowDefinitionId, t.contentHash),
    check("workflow_versions_number_ck", sql`${t.versionNumber} > 0`),
    check("workflow_versions_status_ck", sql`${t.status} in ('draft','published','retired')`),
  ],
);

export const workflowStates = pgTable(
  "workflow_states",
  {
    id: id(),
    workflowVersionId: uuid("workflow_version_id").notNull().references(() => workflowVersions.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    category: text("category").notNull(),
    sortOrder: integer("sort_order").notNull(),
    terminal: boolean("terminal").default(false).notNull(),
  },
  (t) => [unique("workflow_states_version_key_uq").on(t.workflowVersionId, t.key)],
);

export const workflowTransitions = pgTable(
  "workflow_transitions",
  {
    id: id(),
    workflowVersionId: uuid("workflow_version_id").notNull().references(() => workflowVersions.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    fromStateId: uuid("from_state_id").notNull().references(() => workflowStates.id, { onDelete: "restrict" }),
    toStateId: uuid("to_state_id").notNull().references(() => workflowStates.id, { onDelete: "restrict" }),
    commandKey: text("command_key").notNull(),
    permissionPolicy: requiredJsonObject("permission_policy"),
  },
  (t) => [unique("workflow_transitions_version_key_uq").on(t.workflowVersionId, t.key)],
);

export const projectWorkflowInstances = pgTable(
  "project_workflow_instances",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    workflowVersionId: uuid("workflow_version_id").notNull().references(() => workflowVersions.id, { onDelete: "restrict" }),
    currentState: text("current_state").default("discovery").notNull(),
    lockVersion: lockVersion(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("project_workflow_instances_org_id_uq").on(t.organisationId, t.id),
    unique("project_workflow_instances_project_uq").on(t.organisationId, t.projectId),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "project_workflow_instances_project_fk" }),
    check("project_workflow_instances_state_ck", sql`${t.currentState} in ('discovery','planning','plan_in_review','ready_for_backlog','delivery','release_in_review','released','on_hold','archived')`),
  ],
);

export const workflowTransitionEvents = pgTable(
  "workflow_transition_events",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    workflowInstanceId: uuid("workflow_instance_id").notNull(),
    transitionId: uuid("transition_id").notNull().references(() => workflowTransitions.id, { onDelete: "restrict" }),
    fromState: text("from_state").notNull(),
    toState: text("to_state").notNull(),
    actorId: uuid("actor_id"),
    reason: text("reason"),
    correlationId: uuid("correlation_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("workflow_transition_events_org_id_uq").on(t.organisationId, t.id),
    foreignKey({ columns: [t.organisationId, t.workflowInstanceId], foreignColumns: [projectWorkflowInstances.organisationId, projectWorkflowInstances.id], name: "workflow_transition_events_instance_fk" }),
    index("workflow_transition_events_instance_time_idx").on(t.organisationId, t.workflowInstanceId, t.createdAt),
  ],
);
