import { z } from "zod";

import {
  CommandContextSchema,
  DataClassificationSchema,
  IsoDateTimeSchema,
  PermissionKeySchema,
  ProjectModeSchema,
  ProjectWorkflowStateSchema,
} from "./common.js";
import {
  InvitationIdSchema,
  OrganisationIdSchema,
  OrganisationMembershipIdSchema,
  ProjectIdSchema,
  ProjectMembershipIdSchema,
  UserIdSchema,
} from "./ids.js";

export const RoleSchema = z.enum([
  "organisation_owner",
  "organisation_admin",
  "project_owner",
  "developer",
  "domain_expert",
  "stakeholder",
  "reviewer",
  "guest",
  "operator",
]);
export const MembershipStatusSchema = z.enum(["active", "revoked", "left"]);
export const InvitationStateSchema = z.enum([
  "issued",
  "consumed",
  "revoked",
  "expired",
]);

export const OrganisationSchema = z.object({
  id: OrganisationIdSchema,
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  name: z.string().min(1).max(160),
  status: z.enum(["active", "archived", "deletion_pending"]),
  defaultTimezone: z.string().min(1).max(80),
  createdAt: IsoDateTimeSchema,
});

export const OrganisationMembershipSchema = z.object({
  id: OrganisationMembershipIdSchema,
  organisationId: OrganisationIdSchema,
  userId: UserIdSchema,
  status: MembershipStatusSchema,
  roles: z.array(RoleSchema),
  joinedAt: IsoDateTimeSchema,
  leftAt: IsoDateTimeSchema.nullable(),
});

export const CreateOrganisationCommandSchema = z.object({
  context: CommandContextSchema,
  name: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  defaultTimezone: z.string().min(1).max(80),
});

export const ProjectSchema = z.object({
  id: ProjectIdSchema,
  organisationId: OrganisationIdSchema,
  key: z
    .string()
    .min(2)
    .max(16)
    .regex(/^[A-Z][A-Z0-9]*$/u),
  name: z.string().min(1).max(160),
  description: z.string().max(8_000),
  mode: ProjectModeSchema,
  dataClassification: DataClassificationSchema,
  status: z.enum(["active", "archived", "deletion_pending"]),
  workflowState: ProjectWorkflowStateSchema,
  timezone: z.string().min(1).max(80),
  createdAt: IsoDateTimeSchema,
});

export const CreateProjectCommandSchema = z.object({
  context: CommandContextSchema,
  organisationId: OrganisationIdSchema,
  key: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .regex(/^[A-Z][A-Z0-9]*$/u),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(8_000),
  mode: ProjectModeSchema.default("light"),
  dataClassification: DataClassificationSchema,
  timezone: z.string().min(1).max(80),
  prohibitedHealthDataAcknowledged: z.literal(true),
});

export const ProjectMembershipSchema = z.object({
  id: ProjectMembershipIdSchema,
  organisationId: OrganisationIdSchema,
  projectId: ProjectIdSchema,
  userId: UserIdSchema,
  membershipType: z.enum(["member", "guest"]),
  status: MembershipStatusSchema,
  roles: z.array(RoleSchema),
  permissions: z.array(PermissionKeySchema),
  joinedAt: IsoDateTimeSchema,
  leftAt: IsoDateTimeSchema.nullable(),
});

export const InvitationSchema = z.object({
  id: InvitationIdSchema,
  organisationId: OrganisationIdSchema,
  projectId: ProjectIdSchema.optional(),
  email: z.string().email(),
  scope: z.enum(["organisation", "project"]),
  state: InvitationStateSchema,
  roles: z.array(RoleSchema),
  permissions: z.array(PermissionKeySchema),
  expiresAt: IsoDateTimeSchema,
  createdAt: IsoDateTimeSchema,
});

export const InviteGuestCommandSchema = z.object({
  context: CommandContextSchema,
  organisationId: OrganisationIdSchema,
  projectId: ProjectIdSchema,
  email: z.string().trim().toLowerCase().email(),
  roles: z.array(RoleSchema).min(1),
  permissions: z.array(PermissionKeySchema).min(1),
  expiresInHours: z.number().int().min(1).max(168).default(72),
});

export const AcceptInvitationCommandSchema = z.object({
  context: CommandContextSchema,
  token: z.string().min(32).max(512),
  prohibitedHealthDataAcknowledged: z.literal(true),
});

export const RevokeInvitationCommandSchema = z.object({
  context: CommandContextSchema,
  organisationId: OrganisationIdSchema,
  invitationId: InvitationIdSchema,
  reason: z.string().trim().min(1).max(1_000),
});

export const NextActionSchema = z.object({
  key: z.string().min(1).max(120),
  label: z.string().min(1).max(160),
  description: z.string().max(1_000),
  href: z.string().startsWith("/"),
  dueAt: IsoDateTimeSchema.nullable(),
});

export type Organisation = z.infer<typeof OrganisationSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectMembership = z.infer<typeof ProjectMembershipSchema>;
export type InviteGuestCommand = z.infer<typeof InviteGuestCommandSchema>;
