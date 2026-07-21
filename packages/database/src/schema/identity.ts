import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { actorId, archivedAt, createdAt, id, lockVersion, requiredJsonObject, updatedAt } from "./common.js";

// Better Auth physical tables. The auth adapter maps its canonical model names
// to these lowercase names and application authorisation never reads them.
export const authUsers = pgTable(
  "auth_users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    status: text("status").default("active").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("auth_users_email_ci_uq").on(sql`lower(${t.email})`),
    check("auth_users_status_ck", sql`${t.status} in ('active','disabled','tombstoned')`),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull(),
    userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: text("revoked_reason"),
  },
  (t) => [
    unique("auth_sessions_token_uq").on(t.token),
    index("auth_sessions_user_expiry_idx").on(t.userId, t.expiresAt),
    index("auth_sessions_active_expiry_idx").on(t.expiresAt).where(sql`${t.revokedAt} is null`),
  ],
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("auth_accounts_provider_account_uq").on(t.providerId, t.accountId),
    index("auth_accounts_user_idx").on(t.userId),
  ],
);

export const authVerifications = pgTable(
  "auth_verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    purpose: text("purpose").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("auth_verifications_identifier_value_uq").on(t.identifier, t.value),
    index("auth_verifications_expiry_idx").on(t.expiresAt),
    check("auth_verifications_purpose_ck", sql`${t.purpose} in ('magic_link','email_verification','recovery')`),
  ],
);

export const authPasskeys = pgTable(
  "auth_passkeys",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    publicKey: text("public_key").notNull(),
    userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    credentialId: text("credential_id").notNull(),
    counter: bigint("counter", { mode: "number" }).default(0).notNull(),
    deviceType: text("device_type").notNull(),
    backedUp: boolean("backed_up").default(false).notNull(),
    transports: text("transports"),
    aaguid: text("aaguid"),
    createdAt: createdAt(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [unique("auth_passkeys_credential_uq").on(t.credentialId), index("auth_passkeys_user_idx").on(t.userId)],
);

export const authTwoFactors = pgTable(
  "auth_two_factors",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    secretCiphertext: text("secret_ciphertext").notNull(),
    backupCodesCiphertext: text("backup_codes_ciphertext").notNull(),
    createdAt: createdAt(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [unique("auth_two_factors_user_uq").on(t.userId)],
);

export const applicationPrincipals = pgTable(
  "application_principals",
  {
    id: id(),
    authUserId: text("auth_user_id").notNull().references(() => authUsers.id, { onDelete: "restrict" }),
    principalType: text("principal_type").default("user").notNull(),
    displayName: text("display_name").notNull(),
    status: text("status").default("active").notNull(),
    createdAt: createdAt(),
    tombstonedAt: timestamp("tombstoned_at", { withTimezone: true }),
  },
  (t) => [
    unique("application_principals_auth_user_uq").on(t.authUserId),
    check("application_principals_type_ck", sql`${t.principalType} in ('user','service')`),
    check("application_principals_status_ck", sql`${t.status} in ('active','disabled','tombstoned')`),
  ],
);

export const retentionProfiles = pgTable("retention_profiles", {
  id: id(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  policy: requiredJsonObject("policy"),
  createdAt: createdAt(),
});

export const organisations = pgTable(
  "organisations",
  {
    id: id(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    status: text("status").default("active").notNull(),
    defaultTimezone: text("default_timezone").default("UTC").notNull(),
    retentionProfileId: uuid("retention_profile_id").references(() => retentionProfiles.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    archivedAt: archivedAt(),
    deletionScheduledAt: timestamp("deletion_scheduled_at", { withTimezone: true }),
    lockVersion: lockVersion(),
  },
  (t) => [
    uniqueIndex("organisations_slug_ci_uq").on(sql`lower(${t.slug})`),
    check("organisations_status_ck", sql`${t.status} in ('active','archived','deletion_pending')`),
  ],
);

export const organisationMemberships = pgTable(
  "organisation_memberships",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
    principalId: uuid("principal_id").notNull().references(() => applicationPrincipals.id, { onDelete: "restrict" }),
    status: text("status").default("active").notNull(),
    joinedAt: createdAt(),
    leftAt: timestamp("left_at", { withTimezone: true }),
    lockVersion: lockVersion(),
  },
  (t) => [
    unique("organisation_memberships_org_id_uq").on(t.organisationId, t.id),
    uniqueIndex("organisation_memberships_active_principal_uq")
      .on(t.organisationId, t.principalId)
      .where(sql`${t.status} = 'active'`),
    index("organisation_memberships_principal_idx").on(t.principalId, t.status),
    check("organisation_memberships_status_ck", sql`${t.status} in ('active','revoked','left')`),
  ],
);

export const organisationRoleAssignments = pgTable(
  "organisation_role_assignments",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    role: text("role").notNull(),
    effectiveAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdByActorId: actorId(),
  },
  (t) => [
    unique("organisation_role_assignments_org_id_uq").on(t.organisationId, t.id),
    foreignKey({
      columns: [t.organisationId, t.membershipId],
      foreignColumns: [organisationMemberships.organisationId, organisationMemberships.id],
      name: "organisation_role_assignments_membership_fk",
    }),
    index("organisation_role_assignments_membership_idx").on(t.organisationId, t.membershipId),
  ],
);

export const teams = pgTable(
  "teams",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").default("active").notNull(),
    createdAt: createdAt(),
    archivedAt: archivedAt(),
  },
  (t) => [unique("teams_org_id_uq").on(t.organisationId, t.id), unique("teams_org_name_uq").on(t.organisationId, t.name)],
);

export const teamMemberships = pgTable(
  "team_memberships",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    teamId: uuid("team_id").notNull(),
    organisationMembershipId: uuid("organisation_membership_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("team_memberships_org_id_uq").on(t.organisationId, t.id),
    unique("team_memberships_team_member_uq").on(t.organisationId, t.teamId, t.organisationMembershipId),
    foreignKey({ columns: [t.organisationId, t.teamId], foreignColumns: [teams.organisationId, teams.id], name: "team_memberships_team_fk" }),
    foreignKey({ columns: [t.organisationId, t.organisationMembershipId], foreignColumns: [organisationMemberships.organisationId, organisationMemberships.id], name: "team_memberships_org_membership_fk" }),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    mode: text("mode").default("light").notNull(),
    dataClassification: text("data_classification").default("general_business").notNull(),
    status: text("status").default("active").notNull(),
    timezone: text("timezone").default("UTC").notNull(),
    workflowInstanceId: uuid("workflow_instance_id"),
    createdByActorId: actorId(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    lockVersion: lockVersion(),
  },
  (t) => [
    unique("projects_org_id_uq").on(t.organisationId, t.id),
    unique("projects_org_key_uq").on(t.organisationId, t.key),
    index("projects_org_status_idx").on(t.organisationId, t.status, t.createdAt),
    check("projects_mode_ck", sql`${t.mode} in ('light','standard','high_assurance')`),
    check("projects_data_classification_ck", sql`${t.dataClassification} = 'general_business'`),
    check("projects_status_ck", sql`${t.status} in ('active','archived','deletion_pending')`),
  ],
);

export const projectMemberships = pgTable(
  "project_memberships",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    principalId: uuid("principal_id").notNull().references(() => applicationPrincipals.id, { onDelete: "restrict" }),
    membershipType: text("membership_type").notNull(),
    status: text("status").default("active").notNull(),
    joinedAt: createdAt(),
    leftAt: timestamp("left_at", { withTimezone: true }),
    lockVersion: lockVersion(),
  },
  (t) => [
    unique("project_memberships_org_id_uq").on(t.organisationId, t.id),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "project_memberships_project_fk" }),
    uniqueIndex("project_memberships_active_principal_uq").on(t.organisationId, t.projectId, t.principalId).where(sql`${t.status} = 'active'`),
    index("project_memberships_principal_idx").on(t.principalId, t.status),
    check("project_memberships_type_ck", sql`${t.membershipType} in ('member','guest')`),
    check("project_memberships_status_ck", sql`${t.status} in ('active','revoked','left')`),
  ],
);

export const projectRoleAssignments = pgTable(
  "project_role_assignments",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    role: text("role").notNull(),
    scope: requiredJsonObject("scope"),
    effectiveAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    unique("project_role_assignments_org_id_uq").on(t.organisationId, t.id),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "project_role_assignments_project_fk" }),
    foreignKey({ columns: [t.organisationId, t.membershipId], foreignColumns: [projectMemberships.organisationId, projectMemberships.id], name: "project_role_assignments_membership_fk" }),
  ],
);

export const projectPermissionGrants = pgTable(
  "project_permission_grants",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull(),
    projectId: uuid("project_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    permission: text("permission").notNull(),
    objectKind: text("object_kind"),
    objectId: uuid("object_id"),
    stage: text("stage"),
    grantedAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    unique("project_permission_grants_org_id_uq").on(t.organisationId, t.id),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "project_permission_grants_project_fk" }),
    foreignKey({ columns: [t.organisationId, t.membershipId], foreignColumns: [projectMemberships.organisationId, projectMemberships.id], name: "project_permission_grants_membership_fk" }),
    index("project_permission_grants_lookup_idx").on(t.organisationId, t.projectId, t.membershipId, t.permission),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id"),
    email: text("email").notNull(),
    membershipType: text("membership_type").default("member").notNull(),
    roleGrants: requiredJsonObject("role_grants"),
    tokenHash: text("token_hash").notNull(),
    invitedByActorId: actorId("invited_by_actor_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    consumedByPrincipalId: uuid("consumed_by_principal_id").references(() => applicationPrincipals.id, { onDelete: "restrict" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique("invitations_org_id_uq").on(t.organisationId, t.id),
    unique("invitations_token_hash_uq").on(t.tokenHash),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "invitations_project_fk" }),
    uniqueIndex("invitations_active_email_scope_uq").on(t.organisationId, t.projectId, sql`lower(${t.email})`).where(sql`${t.consumedAt} is null and ${t.revokedAt} is null`),
    index("invitations_expiry_idx").on(t.expiresAt).where(sql`${t.consumedAt} is null and ${t.revokedAt} is null`),
  ],
);

export const reauthenticationGrants = pgTable(
  "reauthentication_grants",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id"),
    principalId: uuid("principal_id").notNull().references(() => applicationPrincipals.id, { onDelete: "restrict" }),
    authSessionId: text("auth_session_id").notNull().references(() => authSessions.id, { onDelete: "cascade" }),
    actionKey: text("action_key").notNull(),
    subjectKind: text("subject_kind").notNull(),
    subjectId: uuid("subject_id").notNull(),
    snapshotHash: text("snapshot_hash").notNull(),
    method: text("method").default("passkey_uv").notNull(),
    nonceHash: text("nonce_hash").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    unique("reauthentication_grants_org_id_uq").on(t.organisationId, t.id),
    unique("reauthentication_grants_nonce_uq").on(t.nonceHash),
    foreignKey({ columns: [t.organisationId, t.projectId], foreignColumns: [projects.organisationId, projects.id], name: "reauthentication_grants_project_fk" }),
    index("reauthentication_grants_principal_action_idx").on(t.organisationId, t.principalId, t.actionKey, t.expiresAt),
    check("reauthentication_grants_method_ck", sql`${t.method} = 'passkey_uv'`),
    check("reauthentication_grants_expiry_ck", sql`${t.expiresAt} > ${t.issuedAt} and ${t.expiresAt} <= ${t.issuedAt} + interval '15 minutes'`),
  ],
);
