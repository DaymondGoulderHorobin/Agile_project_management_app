import { describe, expect, it } from "vitest";

import {
  applyApprovalEvaluation,
  authorise,
  createApprovalSnapshot,
  createContentHash,
  evaluateApproval,
  evaluateReadiness,
  markApprovalRequestStale,
  type ApprovalDecisionRecord,
  type ApprovalPolicyVersion,
  type ApprovalRequest,
  type Principal,
  type ReadinessRule,
} from "../src/index.js";
import { IDS, NOW } from "./fixtures.js";

const snapshot = createApprovalSnapshot({
  id: IDS.approvalSnapshot,
  organisationId: IDS.organisation,
  projectId: IDS.project,
  subjectKind: "project_plan",
  subjectId: IDS.artifact,
  subjectVersionId: IDS.artifactVersion,
  canonicalPayload: { objective: "Generic practice workflow" },
  dependencyManifest: { versions: [IDS.artifactVersion] },
  createdAt: NOW,
  canonicalSchemaVersion: "approval-snapshot/v1",
});

const request: ApprovalRequest = {
  id: IDS.approvalRequest,
  snapshotId: IDS.approvalSnapshot,
  policyVersionId: IDS.approvalPolicyVersion,
  state: "pending",
  lockVersion: 0,
  requestedAt: NOW,
  completedAt: null,
  staleAt: null,
  staleReason: null,
};

const policy: ApprovalPolicyVersion = {
  id: IDS.approvalPolicyVersion,
  mode: "high_assurance",
  requirements: [
    {
      id: IDS.approvalRequirement,
      key: "technical",
      eligibleRoles: ["developer"],
      eligibleUserIds: [],
      minimumDecisions: 1,
      distinctPrincipalGroup: "plan-reviewers",
      allowRoleAggregation: false,
      requireRecentReauthentication: true,
    },
    {
      id: IDS.otherApprovalRequirement,
      key: "domain",
      eligibleRoles: ["domain_expert"],
      eligibleUserIds: [],
      minimumDecisions: 1,
      distinctPrincipalGroup: "plan-reviewers",
      allowRoleAggregation: false,
      requireRecentReauthentication: true,
    },
  ],
  contentHash: createContentHash("approval-policy/v1", {
    mode: "high_assurance",
  }),
};

const decision = (
  requirementId:
    typeof IDS.approvalRequirement | typeof IDS.otherApprovalRequirement,
  userId: typeof IDS.user | typeof IDS.otherUser,
  roles: readonly ("developer" | "domain_expert")[],
): ApprovalDecisionRecord => ({
  id: IDS.approvalDecision,
  requestId: IDS.approvalRequest,
  requirementId,
  snapshotId: IDS.approvalSnapshot,
  reviewerUserId: userId,
  reviewerMembershipId: IDS.membership,
  actorType: "human",
  authorityRoles: roles,
  decision: "approved",
  conditions: [],
  resolvedConditionKeys: [],
  comment: "I reviewed this exact version.",
  decidedAt: NOW,
  reauthentication: {
    grantId: IDS.reauthenticationGrant,
    action: "approval.decide",
    snapshotHash: snapshot.contentHash.value,
    verifiedAt: new Date(NOW.getTime() - 60_000),
    expiresAt: new Date(NOW.getTime() + 60_000),
    consumedAt: NOW,
  },
});

describe("project authorisation", () => {
  const guest: Principal = {
    userId: IDS.user,
    actorType: "human",
    organisationId: IDS.organisation,
    projectId: IDS.project,
    projectMembershipId: IDS.membership,
    membershipType: "guest",
    roles: ["guest", "domain_expert"],
    explicitGrants: ["question.answer_assigned"],
    membershipActive: true,
    projectMode: "light",
  };

  it("requires both a guest grant and assignment", () => {
    expect(
      authorise(guest, "question.answer_assigned", {
        organisationId: IDS.organisation,
        projectId: IDS.project,
        assignedMembershipIds: [IDS.membership],
      }),
    ).toEqual({ allowed: true, reason: "allowed_by_explicit_grant" });
    expect(
      authorise(guest, "question.answer_assigned", {
        organisationId: IDS.organisation,
        projectId: IDS.project,
        assignedMembershipIds: [IDS.otherMembership],
      }).reason,
    ).toBe("assignment_required");
    expect(
      authorise(guest, "project.manage", {
        organisationId: IDS.organisation,
        projectId: IDS.project,
      }).reason,
    ).toBe("guest_grant_required");
  });

  it("fails a cross-tenant request before considering roles", () => {
    expect(
      authorise(guest, "project.view", {
        organisationId: IDS.otherOrganisation,
        projectId: IDS.project,
      }).reason,
    ).toBe("tenant_mismatch");
  });
});

describe("approval policy", () => {
  it("requires distinct, currently authorised, freshly reauthenticated humans", () => {
    const technical = decision(IDS.approvalRequirement, IDS.user, [
      "developer",
    ]);
    const sameHumanDomain = decision(IDS.otherApprovalRequirement, IDS.user, [
      "domain_expert",
    ]);
    const distinctDomain = decision(
      IDS.otherApprovalRequirement,
      IDS.otherUser,
      ["domain_expert"],
    );

    expect(
      evaluateApproval(
        request,
        snapshot,
        policy,
        [technical, sameHumanDomain],
        NOW,
      ),
    ).toMatchObject({
      state: "pending",
      outstandingRequirementKeys: ["domain"],
    });
    const evaluation = evaluateApproval(
      request,
      snapshot,
      policy,
      [technical, distinctDomain],
      NOW,
    );
    expect(evaluation.state).toBe("approved");
    expect(applyApprovalEvaluation(request, evaluation, 0, NOW).state).toBe(
      "approved",
    );
  });

  it("does not treat AI as an approver", () => {
    const ai = {
      ...decision(IDS.approvalRequirement, IDS.user, ["developer"]),
      actorType: "ai" as const,
    };
    expect(
      evaluateApproval(request, snapshot, policy, [ai], NOW).blockers,
    ).toContain("technical: Only a human actor may approve");
  });

  it("marks only the request stale and preserves snapshot identity", () => {
    const stale = markApprovalRequestStale(
      request,
      "A requirement version changed",
      0,
      NOW,
    );
    expect(stale).toMatchObject({ state: "stale", snapshotId: snapshot.id });
    expect(snapshot.contentHash.value).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("readiness", () => {
  const rules: readonly ReadinessRule[] = [
    {
      key: "approval",
      description: "Current approval exists",
      severity: "blocking",
      evaluate: ({ values }) => ({
        outcome: values.approved === true ? "satisfied" : "unsatisfied",
        explanation: "Approval is deterministic",
      }),
    },
    {
      key: "advice",
      description: "Optional advice",
      severity: "warning",
      evaluate: () => ({
        outcome: "unsatisfied",
        explanation: "Advisory only",
      }),
    },
  ];

  it("does not let a percentage override a blocking rule", () => {
    const evaluation = evaluateReadiness(rules, {
      values: { approved: false },
    });
    expect(evaluation).toMatchObject({ ready: false, completionPercentage: 0 });
    expect(evaluation.blockers.map(({ key }) => key)).toEqual(["approval"]);
  });
});
