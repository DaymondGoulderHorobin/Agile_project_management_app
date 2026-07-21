import { sql } from "drizzle-orm";
import { bigint, boolean, check, foreignKey, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { createdAt, id, lockVersion, requiredJsonObject } from "./common.js";
import { applicationPrincipals, projectMemberships, projects } from "./identity.js";

export const comments = pgTable(
  "comments",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    targetKind: text("target_kind").notNull(),
    targetId: uuid("target_id").notNull(),
    targetVersionId: uuid("target_version_id"),
    parentCommentId: uuid("parent_comment_id"),
    authorPrincipalId: uuid("author_principal_id").notNull().references(() => applicationPrincipals.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    createdAt: createdAt(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    lockVersion: lockVersion(),
  },
  (t) => [
    unique("comments_org_id_uq").on(t.organisationId, t.id),
    unique("comments_project_id_uq").on(t.organisationId, t.projectId, t.id),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "comments_project_fk" }),
    index("comments_target_idx").on(t.organisationId, t.projectId, t.targetKind, t.targetId, t.createdAt),
  ],
);

export const commentEdits = pgTable(
  "comment_edits",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    commentId: uuid("comment_id").notNull(),
    previousBodyHash: text("previous_body_hash").notNull(),
    replacementBodyHash: text("replacement_body_hash").notNull(),
    editorPrincipalId: uuid("editor_principal_id").notNull().references(() => applicationPrincipals.id, { onDelete: "restrict" }),
    safeReason: text("safe_reason"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("comment_edits_org_id_uq").on(t.organisationId, t.id),
    foreignKey({ columns: [t.organisationId, t.projectId, t.commentId], foreignColumns: [comments.organisationId, comments.projectId, comments.id], name: "comment_edits_comment_fk" }),
  ],
);

export const mentions = pgTable(
  "mentions",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    commentId: uuid("comment_id").notNull(),
    mentionedPrincipalId: uuid("mentioned_principal_id").notNull().references(() => applicationPrincipals.id, { onDelete: "restrict" }),
    notificationState: text("notification_state").default("pending").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("mentions_org_id_uq").on(t.organisationId, t.id),
    unique("mentions_comment_principal_uq").on(t.organisationId, t.commentId, t.mentionedPrincipalId),
    foreignKey({ columns: [t.organisationId, t.projectId, t.commentId], foreignColumns: [comments.organisationId, comments.projectId, comments.id], name: "mentions_comment_fk" }),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id"),
    recipientPrincipalId: uuid("recipient_principal_id").notNull().references(() => applicationPrincipals.id, { onDelete: "restrict" }),
    type: text("type").notNull(),
    targetKind: text("target_kind").notNull(),
    targetId: uuid("target_id").notNull(),
    actionKey: text("action_key"),
    channelStates: requiredJsonObject("channel_states"),
    dedupeKey: text("dedupe_key").notNull(),
    createdAt: createdAt(),
    readAt: timestamp("read_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [
    unique("notifications_org_id_uq").on(t.organisationId, t.id),
    unique("notifications_recipient_dedupe_uq").on(t.organisationId, t.recipientPrincipalId, t.dedupeKey),
    index("notifications_recipient_unread_idx").on(t.organisationId, t.recipientPrincipalId, t.createdAt).where(sql`${t.readAt} is null`),
  ],
);

export const attachments = pgTable(
  "attachments",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    uploaderPrincipalId: uuid("uploader_principal_id").notNull().references(() => applicationPrincipals.id, { onDelete: "restrict" }),
    objectKey: text("object_key").notNull(),
    originalName: text("original_name").notNull(),
    displayName: text("display_name").notNull(),
    declaredContentType: text("declared_content_type").notNull(),
    detectedContentType: text("detected_content_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    sha256Hash: text("sha256_hash").notNull(),
    scanStatus: text("scan_status").default("pending").notNull(),
    quarantineStatus: text("quarantine_status").default("restricted").notNull(),
    createdAt: createdAt(),
    retainedUntil: timestamp("retained_until", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    unique("attachments_org_id_uq").on(t.organisationId, t.id),
    unique("attachments_project_id_uq").on(t.organisationId, t.projectId, t.id),
    unique("attachments_object_key_uq").on(t.objectKey),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "attachments_project_fk" }),
    index("attachments_quarantine_idx").on(t.organisationId, t.quarantineStatus, t.createdAt),
    check("attachments_size_ck", sql`${t.sizeBytes} >= 0`),
    check("attachments_scan_status_ck", sql`${t.scanStatus} in ('pending','clean','suspicious','malware','failed')`),
    check("attachments_quarantine_status_ck", sql`${t.quarantineStatus} in ('restricted','released','purge_pending','purged')`),
  ],
);

export const prohibitedContentIncidents = pgTable(
  "prohibited_content_incidents",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    attachmentId: uuid("attachment_id"),
    inputKind: text("input_kind"),
    inputId: uuid("input_id"),
    detectionSource: text("detection_source").notNull(),
    restrictedStatus: text("restricted_status").default("open").notNull(),
    externalProviderExposure: boolean("external_provider_exposure").default(false).notNull(),
    objectStorageExposure: boolean("object_storage_exposure").default(false).notNull(),
    reporterPrincipalId: uuid("reporter_principal_id").references(() => applicationPrincipals.id, { onDelete: "restrict" }),
    handlerPrincipalId: uuid("handler_principal_id").references(() => applicationPrincipals.id, { onDelete: "restrict" }),
    safeSummary: text("safe_summary").notNull(),
    suspectedCategory: text("suspected_category").notNull(),
    containmentMetadata: requiredJsonObject("containment_metadata"),
    createdAt: createdAt(),
    containedAt: timestamp("contained_at", { withTimezone: true }),
    remediatedAt: timestamp("remediated_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    lockVersion: lockVersion(),
  },
  (t) => [
    unique("prohibited_content_incidents_org_id_uq").on(t.organisationId, t.id),
    unique("prohibited_content_incidents_project_id_uq").on(t.organisationId, t.projectId, t.id),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "prohibited_content_incidents_project_fk" }),
    foreignKey({ columns: [t.organisationId, t.projectId, t.attachmentId], foreignColumns: [attachments.organisationId, attachments.projectId, attachments.id], name: "prohibited_content_incidents_attachment_fk" }),
    index("prohibited_content_incidents_open_idx").on(t.organisationId, t.projectId, t.createdAt).where(sql`${t.restrictedStatus} <> 'closed'`),
    check("prohibited_content_incidents_status_ck", sql`${t.restrictedStatus} in ('open','contained','remediated','closed')`),
    check("prohibited_content_incidents_reference_ck", sql`num_nonnulls(${t.attachmentId}, ${t.inputId}) = 1`),
  ],
);

export const prohibitedContentIncidentDecisions = pgTable(
  "prohibited_content_incident_decisions",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    prohibitedContentIncidentId: uuid("prohibited_content_incident_id").notNull(),
    decision: text("decision").notNull(),
    decidedByPrincipalId: uuid("decided_by_principal_id").notNull().references(() => applicationPrincipals.id, { onDelete: "restrict" }),
    safeRationale: text("safe_rationale").notNull(),
    evidenceHash: text("evidence_hash").notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("prohibited_content_incident_decisions_org_id_uq").on(t.organisationId, t.id),
    foreignKey({ columns: [t.organisationId, t.projectId, t.prohibitedContentIncidentId], foreignColumns: [prohibitedContentIncidents.organisationId, prohibitedContentIncidents.projectId, prohibitedContentIncidents.id], name: "prohibited_content_incident_decisions_incident_fk" }),
    check("prohibited_content_incident_decisions_decision_ck", sql`${t.decision} in ('confirmed_prohibited','false_positive','remediation_complete','close')`),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id"),
    sequence: bigint("sequence", { mode: "number" }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    actorType: text("actor_type").notNull(),
    actorId: uuid("actor_id"),
    eventType: text("event_type").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    aggregateVersion: integer("aggregate_version"),
    beforeHash: text("before_hash"),
    afterHash: text("after_hash"),
    safeMetadata: requiredJsonObject("safe_metadata"),
    correlationId: uuid("correlation_id").notNull(),
    causationId: uuid("causation_id"),
  },
  (t) => [
    unique("audit_events_org_id_uq").on(t.organisationId, t.id),
    unique("audit_events_org_sequence_uq").on(t.organisationId, t.sequence),
    index("audit_events_org_time_idx").on(t.organisationId, t.occurredAt),
    index("audit_events_project_time_idx").on(t.organisationId, t.projectId, t.occurredAt),
    index("audit_events_aggregate_idx").on(t.organisationId, t.aggregateType, t.aggregateId, t.occurredAt),
    index("audit_events_correlation_idx").on(t.correlationId),
    check("audit_events_actor_type_ck", sql`${t.actorType} in ('user','guest','service','runner','system','operator')`),
  ],
);

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    eventId: uuid("event_id").notNull(),
    eventType: text("event_type").notNull(),
    eventVersion: integer("event_version").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    payload: requiredJsonObject("payload"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
    attempts: integer("attempts").default(0).notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    deadLetteredAt: timestamp("dead_lettered_at", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
  },
  (t) => [
    unique("outbox_events_org_id_uq").on(t.organisationId, t.id),
    unique("outbox_events_event_id_uq").on(t.eventId),
    index("outbox_events_pending_idx").on(t.availableAt, t.id).where(sql`${t.deliveredAt} is null and ${t.deadLetteredAt} is null`),
  ],
);

export const inboxEvents = pgTable(
  "inbox_events",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    eventType: text("event_type").notNull(),
    eventVersion: integer("event_version").notNull(),
    payload: requiredJsonObject("payload"),
    payloadHash: text("payload_hash").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    attempts: integer("attempts").default(0).notNull(),
    result: requiredJsonObject("result"),
  },
  (t) => [unique("inbox_events_org_id_uq").on(t.organisationId, t.id), unique("inbox_events_source_external_uq").on(t.source, t.externalId)],
);

export const idempotencyRecords = pgTable(
  "idempotency_records",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    requestHash: text("request_hash").notNull(),
    resultKind: text("result_kind"),
    resultId: uuid("result_id"),
    status: text("status").default("processing").notNull(),
    createdAt: createdAt(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    unique("idempotency_records_org_id_uq").on(t.organisationId, t.id),
    unique("idempotency_records_scope_key_uq").on(t.organisationId, t.scope, t.key),
    index("idempotency_records_expiry_idx").on(t.expiresAt),
    check("idempotency_records_status_ck", sql`${t.status} in ('processing','completed','failed')`),
  ],
);

export const permissionContexts = pgTable(
  "permission_contexts",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    principalId: uuid("principal_id").notNull().references(() => applicationPrincipals.id, { onDelete: "cascade" }),
    authSessionId: text("auth_session_id"),
    permissionHash: text("permission_hash").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    unique("permission_contexts_org_id_uq").on(t.organisationId, t.id),
    index("permission_contexts_principal_expiry_idx").on(t.organisationId, t.principalId, t.expiresAt),
    check("permission_contexts_expiry_ck", sql`${t.expiresAt} > ${t.issuedAt}`),
  ],
);

export const dataExportJobs = pgTable(
  "data_export_jobs",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    requestedByPrincipalId: uuid("requested_by_principal_id").notNull().references(() => applicationPrincipals.id, { onDelete: "restrict" }),
    scope: requiredJsonObject("scope"),
    state: text("state").default("requested").notNull(),
    objectReference: text("object_reference"),
    contentHash: text("content_hash"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [unique("data_export_jobs_org_id_uq").on(t.organisationId, t.id), check("data_export_jobs_state_ck", sql`${t.state} in ('requested','running','completed','failed','expired')`)],
);

export const retentionActions = pgTable(
  "retention_actions",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    policyKey: text("policy_key").notNull(),
    targetKind: text("target_kind").notNull(),
    targetId: uuid("target_id").notNull(),
    action: text("action").notNull(),
    safeMetadata: requiredJsonObject("safe_metadata"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [unique("retention_actions_org_id_uq").on(t.organisationId, t.id), index("retention_actions_pending_idx").on(t.scheduledAt).where(sql`${t.completedAt} is null`)],
);
