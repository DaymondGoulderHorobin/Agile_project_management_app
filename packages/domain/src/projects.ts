import { createHash, timingSafeEqual } from "node:crypto";

import { DomainError, invariant } from "./errors.js";
import type {
  OrganisationId,
  ProjectId,
  ProjectMembershipId,
  UserId,
} from "./ids.js";
import type { DataClassification, ProjectMode, ProjectRole } from "./types.js";

export interface Project {
  readonly id: ProjectId;
  readonly organisationId: OrganisationId;
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly mode: ProjectMode;
  readonly dataClassification: DataClassification;
  readonly status: "active" | "archived";
  readonly lockVersion: number;
}

export function createProject(
  input: Omit<Project, "status" | "lockVersion">,
): Project {
  invariant(
    /^[A-Z][A-Z0-9-]{1,19}$/.test(input.key),
    "Project key must be a short uppercase key",
  );
  invariant(input.name.trim().length > 0, "Project name is required");
  invariant(
    input.dataClassification === "general_business",
    "Initial projects must use general_business classification",
  );
  return Object.freeze({ ...input, status: "active", lockVersion: 0 });
}

export type InvitationState = "issued" | "consumed" | "revoked" | "expired";

export interface ProjectInvitation {
  readonly id: string;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly emailCanonical: string;
  readonly role: ProjectRole;
  readonly grants: readonly string[];
  readonly tokenHash: string;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
  readonly revokedAt: Date | null;
}

export interface ProjectMembership {
  readonly id: ProjectMembershipId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly userId: UserId;
  readonly membershipType: "member" | "guest";
  readonly status: "active" | "left" | "revoked";
  readonly roles: readonly ProjectRole[];
  readonly explicitGrants: readonly string[];
  readonly joinedAt: Date;
}

const tokenDigest = (token: string): Buffer =>
  createHash("sha256").update(token).digest();

export function invitationState(
  invitation: ProjectInvitation,
  now: Date,
): InvitationState {
  if (invitation.revokedAt !== null) return "revoked";
  if (invitation.consumedAt !== null) return "consumed";
  if (invitation.expiresAt.getTime() <= now.getTime()) return "expired";
  return "issued";
}

export function issueProjectInvitation(
  input: Omit<
    ProjectInvitation,
    "emailCanonical" | "tokenHash" | "consumedAt" | "revokedAt"
  > & {
    readonly email: string;
  },
  rawToken: string,
): ProjectInvitation {
  invariant(rawToken.length >= 32, "Invitation token must be high entropy");
  invariant(
    input.expiresAt.getTime() > input.issuedAt.getTime(),
    "Invitation must expire after issue",
  );
  const emailCanonical = input.email.trim().toLowerCase();
  invariant(
    /^[^\s@]+@[^\s@]+$/.test(emailCanonical),
    "Invitation email is invalid",
  );
  return Object.freeze({
    id: input.id,
    organisationId: input.organisationId,
    projectId: input.projectId,
    emailCanonical,
    role: input.role,
    grants: input.grants,
    tokenHash: tokenDigest(rawToken).toString("hex"),
    issuedAt: new Date(input.issuedAt),
    expiresAt: new Date(input.expiresAt),
    consumedAt: null,
    revokedAt: null,
  });
}

export function consumeProjectInvitation(
  invitation: ProjectInvitation,
  rawToken: string,
  authenticatedEmail: string,
  userId: UserId,
  membershipId: ProjectMembershipId,
  now: Date,
): {
  readonly invitation: ProjectInvitation;
  readonly membership: ProjectMembership;
} {
  const expected = Buffer.from(invitation.tokenHash, "hex");
  const actual = tokenDigest(rawToken);
  const tokenValid =
    expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!tokenValid || invitationState(invitation, now) !== "issued") {
    throw new DomainError(
      "FORBIDDEN",
      "Invitation is invalid, expired, consumed, or revoked",
    );
  }
  invariant(
    authenticatedEmail.trim().toLowerCase() === invitation.emailCanonical,
    "Authenticated identity does not match the invitation",
  );
  const consumed = Object.freeze({ ...invitation, consumedAt: new Date(now) });
  const membership: ProjectMembership = Object.freeze({
    id: membershipId,
    organisationId: invitation.organisationId,
    projectId: invitation.projectId,
    userId,
    membershipType: "guest",
    status: "active",
    roles: [invitation.role],
    explicitGrants: invitation.grants,
    joinedAt: new Date(now),
  });
  return Object.freeze({ invitation: consumed, membership });
}
