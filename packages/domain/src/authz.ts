import { DomainError } from "./errors.js";
import type {
  OrganisationId,
  ProjectId,
  ProjectMembershipId,
  UserId,
} from "./ids.js";
import type { ActorType, ProjectMode, ProjectRole } from "./types.js";

export const PERMISSIONS = [
  "organisation.manage",
  "membership.manage",
  "project.create",
  "project.manage",
  "project.view",
  "question.create",
  "question.answer_assigned",
  "question.review_assigned",
  "artifact.propose",
  "artifact.review_assigned",
  "approval.decide_assigned",
  "agile.manage",
  "execution.plan",
  "execution.authorise",
  "execution.review_technical",
  "execution.review_behaviour",
  "release.prepare",
  "release.approve",
  "incident.manage",
  "audit.view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export interface Principal {
  readonly userId: UserId;
  readonly actorType: ActorType;
  readonly organisationId: OrganisationId | null;
  readonly projectId: ProjectId | null;
  readonly projectMembershipId: ProjectMembershipId | null;
  readonly membershipType: "member" | "guest" | null;
  readonly roles: readonly ProjectRole[];
  readonly explicitGrants: readonly Permission[];
  readonly membershipActive: boolean;
  readonly projectMode: ProjectMode | null;
}

export interface AuthorisationResource {
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId | null;
  readonly assignedMembershipIds?: readonly ProjectMembershipId[];
}

export interface AuthorisationDecision {
  readonly allowed: boolean;
  readonly reason:
    | "allowed_by_role"
    | "allowed_by_explicit_grant"
    | "assignment_required"
    | "guest_grant_required"
    | "inactive_membership"
    | "non_human_actor"
    | "tenant_mismatch"
    | "permission_missing";
}

const ROLE_PERMISSIONS: Readonly<Record<ProjectRole, readonly Permission[]>> = {
  organisation_owner: PERMISSIONS,
  organisation_admin: [
    "organisation.manage",
    "membership.manage",
    "project.create",
    "project.view",
    "incident.manage",
    "audit.view",
  ],
  project_owner: [
    "project.manage",
    "project.view",
    "membership.manage",
    "question.create",
    "artifact.propose",
    "artifact.review_assigned",
    "approval.decide_assigned",
    "agile.manage",
    "execution.plan",
    "execution.authorise",
    "execution.review_technical",
    "execution.review_behaviour",
    "release.prepare",
    "release.approve",
    "audit.view",
  ],
  developer: [
    "project.view",
    "question.create",
    "question.answer_assigned",
    "artifact.propose",
    "artifact.review_assigned",
    "approval.decide_assigned",
    "agile.manage",
    "execution.plan",
    "execution.authorise",
    "execution.review_technical",
    "release.prepare",
  ],
  domain_expert: [
    "project.view",
    "question.create",
    "question.answer_assigned",
    "question.review_assigned",
    "artifact.review_assigned",
    "approval.decide_assigned",
    "execution.review_behaviour",
  ],
  stakeholder: [
    "project.view",
    "question.review_assigned",
    "artifact.review_assigned",
    "approval.decide_assigned",
    "execution.review_behaviour",
  ],
  reviewer: [
    "project.view",
    "artifact.review_assigned",
    "approval.decide_assigned",
    "execution.review_technical",
    "execution.review_behaviour",
    "release.approve",
  ],
  guest: [],
  operator: [],
};

const ASSIGNMENT_SCOPED = new Set<Permission>([
  "question.answer_assigned",
  "question.review_assigned",
  "artifact.review_assigned",
  "approval.decide_assigned",
  "execution.review_technical",
  "execution.review_behaviour",
]);

export function authorise(
  principal: Principal,
  permission: Permission,
  resource: AuthorisationResource,
): AuthorisationDecision {
  if (principal.actorType !== "human") {
    return { allowed: false, reason: "non_human_actor" };
  }
  if (!principal.membershipActive) {
    return { allowed: false, reason: "inactive_membership" };
  }
  if (
    principal.organisationId !== resource.organisationId ||
    (resource.projectId !== null && principal.projectId !== resource.projectId)
  ) {
    return { allowed: false, reason: "tenant_mismatch" };
  }

  const isGuest = principal.membershipType === "guest";
  const explicit = principal.explicitGrants.includes(permission);
  if (isGuest && !explicit) {
    return { allowed: false, reason: "guest_grant_required" };
  }

  if (ASSIGNMENT_SCOPED.has(permission) && resource.assignedMembershipIds) {
    if (
      principal.projectMembershipId === null ||
      !resource.assignedMembershipIds.includes(principal.projectMembershipId)
    ) {
      return { allowed: false, reason: "assignment_required" };
    }
  }

  if (explicit) {
    return { allowed: true, reason: "allowed_by_explicit_grant" };
  }

  const roleAllowed = principal.roles.some((role) =>
    ROLE_PERMISSIONS[role].includes(permission),
  );
  return roleAllowed
    ? { allowed: true, reason: "allowed_by_role" }
    : { allowed: false, reason: "permission_missing" };
}

export function requirePermission(
  principal: Principal,
  permission: Permission,
  resource: AuthorisationResource,
): void {
  const decision = authorise(principal, permission, resource);
  if (!decision.allowed) {
    throw new DomainError(
      "FORBIDDEN",
      `Permission ${permission} denied: ${decision.reason}`,
      {
        permission,
        reason: decision.reason,
      },
    );
  }
}
