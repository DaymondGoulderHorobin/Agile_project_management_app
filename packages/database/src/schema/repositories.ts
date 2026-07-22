import { sql } from "drizzle-orm";
import { boolean, check, foreignKey, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { createdAt, id, lockVersion, requiredJsonObject } from "./common.js";
import { organisations, projects } from "./identity.js";

export const integrations = pgTable(
  "integrations",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    encryptedConfigurationReference: text("encrypted_configuration_reference").notNull(),
    status: text("status").default("active").notNull(),
    lastHealthCheckedAt: timestamp("last_health_checked_at", { withTimezone: true }),
    createdAt: createdAt(),
    lockVersion: lockVersion(),
  },
  (t) => [unique("integrations_org_id_uq").on(t.organisationId, t.id), index("integrations_org_kind_idx").on(t.organisationId, t.kind, t.status)],
);

export const githubInstallations = pgTable(
  "github_installations",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    integrationId: uuid("integration_id").notNull(),
    githubInstallationId: text("github_installation_id").notNull(),
    githubAccountId: text("github_account_id").notNull(),
    permissions: requiredJsonObject("permissions"),
    status: text("status").default("active").notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    lockVersion: lockVersion(),
  },
  (t) => [
    unique("github_installations_org_id_uq").on(t.organisationId, t.id),
    unique("github_installations_external_uq").on(t.githubInstallationId),
    foreignKey({ columns: [t.organisationId, t.integrationId], foreignColumns: [integrations.organisationId, integrations.id], name: "github_installations_integration_fk" }),
  ],
);

export const repositories = pgTable(
  "repositories",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    githubInstallationId: uuid("github_installation_id").notNull(),
    externalRepositoryId: text("external_repository_id").notNull(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    defaultBranch: text("default_branch").notNull(),
    visibility: text("visibility").notNull(),
    archived: boolean("archived").default(false).notNull(),
    status: text("status").default("active").notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    lockVersion: lockVersion(),
  },
  (t) => [
    unique("repositories_org_id_uq").on(t.organisationId, t.id),
    unique("repositories_external_uq").on(t.externalRepositoryId),
    foreignKey({ columns: [t.organisationId, t.githubInstallationId], foreignColumns: [githubInstallations.organisationId, githubInstallations.id], name: "repositories_installation_fk" }),
    check("repositories_visibility_ck", sql`${t.visibility} in ('private','internal','public')`),
  ],
);

export const projectRepositories = pgTable(
  "project_repositories",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    repositoryId: uuid("repository_id").notNull(),
    purpose: text("purpose").default("delivery").notNull(),
    allowedConfiguration: requiredJsonObject("allowed_configuration"),
    status: text("status").default("pending").notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    lockVersion: lockVersion(),
  },
  (t) => [
    unique("project_repositories_org_id_uq").on(t.organisationId, t.id),
    unique("project_repositories_project_repository_uq").on(t.organisationId, t.projectId, t.repositoryId),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "project_repositories_project_fk" }),
    foreignKey({ columns: [t.organisationId, t.repositoryId], foreignColumns: [repositories.organisationId, repositories.id], name: "project_repositories_repository_fk" }),
    index("project_repositories_state_idx").on(t.organisationId, t.projectId, t.status),
    check("project_repositories_status_ck", sql`${t.status} in ('pending','active','access_lost','revoked')`),
  ],
);

export const repositoryAccessSnapshots = pgTable(
  "repository_access_snapshots",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    repositoryId: uuid("repository_id").notNull(),
    installationPermissions: requiredJsonObject("installation_permissions"),
    branchPolicy: requiredJsonObject("branch_policy"),
    metadataHash: text("metadata_hash").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("repository_access_snapshots_org_id_uq").on(t.organisationId, t.id),
    unique("repository_access_snapshots_project_id_uq").on(t.organisationId, t.projectId, t.id),
    foreignKey({ columns: [t.organisationId, t.repositoryId], foreignColumns: [repositories.organisationId, repositories.id], name: "repository_access_snapshots_repository_fk" }),
    index("repository_access_snapshots_repository_time_idx").on(t.organisationId, t.repositoryId, t.observedAt),
  ],
);

export const webhookInboxEvents = pgTable(
  "webhook_inbox_events",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    provider: text("provider").notNull(),
    deliveryId: text("delivery_id").notNull(),
    eventType: text("event_type").notNull(),
    signatureStatus: text("signature_status").notNull(),
    safeHeaders: requiredJsonObject("safe_headers"),
    bodyObjectReference: text("body_object_reference").notNull(),
    bodyHash: text("body_hash").notNull(),
    processingState: text("processing_state").default("received").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [
    unique("webhook_inbox_events_org_id_uq").on(t.organisationId, t.id),
    unique("webhook_inbox_events_provider_delivery_uq").on(t.provider, t.deliveryId),
    index("webhook_inbox_events_processing_idx").on(t.processingState, t.receivedAt),
    check("webhook_inbox_events_signature_ck", sql`${t.signatureStatus} in ('valid','invalid','missing')`),
    check("webhook_inbox_events_state_ck", sql`${t.processingState} in ('received','processing','processed','failed','dead_letter')`),
  ],
);
