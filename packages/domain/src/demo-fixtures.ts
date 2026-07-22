import { invariant } from "./errors.js";
import { assessProhibitedContent } from "./health.js";
import { asId } from "./ids.js";
import type {
  OrganisationId,
  ProjectId,
  ProjectMembershipId,
  UserId,
} from "./ids.js";

export type DemoStepId =
  | "DJ-01"
  | "DJ-02"
  | "DJ-03"
  | "DJ-04"
  | "DJ-05"
  | "DJ-06"
  | "DJ-07"
  | "DJ-08"
  | "DJ-09"
  | "DJ-10"
  | "DJ-11"
  | "DJ-12"
  | "DJ-13"
  | "DJ-14"
  | "DJ-15"
  | "DJ-16"
  | "DJ-17"
  | "DJ-18"
  | "DJ-19"
  | "DJ-20"
  | "DJ-21"
  | "DJ-22";

export interface DemoStepFixture {
  readonly id: DemoStepId;
  readonly title: string;
  readonly slice: 1 | 2 | 3 | 4 | 5 | 6;
  readonly actor:
    "developer" | "domain_expert" | "ai" | "codex" | "system" | "reviewers";
  readonly action: string;
  readonly recordKinds: readonly string[];
  readonly requirementIds: readonly string[];
  readonly backlogIds: readonly string[];
  readonly stateTransitions: readonly string[];
}

export interface DemoFixture {
  readonly fixtureVersion: "tracework-demo/v1";
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly developer: {
    readonly userId: UserId;
    readonly membershipId: ProjectMembershipId;
    readonly displayName: "Alex Developer";
  };
  readonly domainExpert: {
    readonly userId: UserId;
    readonly membershipId: ProjectMembershipId;
    readonly displayName: "Casey Chiropractor";
  };
  readonly project: {
    readonly key: "SAFE-DEMO";
    readonly name: "Chiropractic practice workflow helper";
    readonly description: string;
    readonly mode: "light";
    readonly dataClassification: "general_business";
  };
  readonly sampleQuestion: string;
  readonly sampleAnswer: string;
  readonly steps: readonly DemoStepFixture[];
}

const step = (
  id: DemoStepId,
  title: string,
  slice: DemoStepFixture["slice"],
  actor: DemoStepFixture["actor"],
  action: string,
  recordKinds: readonly string[],
  requirementIds: readonly string[],
  backlogIds: readonly string[],
  stateTransitions: readonly string[],
): DemoStepFixture =>
  Object.freeze({
    id,
    title,
    slice,
    actor,
    action,
    recordKinds,
    requirementIds,
    backlogIds,
    stateTransitions,
  });

export const DEMO_STEPS: readonly DemoStepFixture[] = [
  step(
    "DJ-01",
    "Developer creates the secure workspace",
    1,
    "developer",
    "Create an authenticated organisation",
    [
      "users",
      "organisations",
      "organisation_memberships",
      "audit_events",
      "outbox_events",
    ],
    ["FR-001", "FR-003", "FR-043", "FR-045", "SEC-001"],
    ["S1-US01", "S1-US02", "S1-US03", "S1-T02", "S1-SEC01", "S1-TEST01"],
    ["organisation:created_active", "membership:created_active"],
  ),
  step(
    "DJ-02",
    "Developer creates a safe project",
    1,
    "developer",
    "Create a Light-mode general-business project",
    ["projects", "project_memberships", "project_workflow_instances"],
    ["FR-002", "HC-001", "HC-002", "HC-004", "UX-017"],
    ["S1-US04", "S1-US05", "S1-SEC01", "S2-SEC01"],
    ["project:created_active", "project_workflow:discovery"],
  ),
  step(
    "DJ-03",
    "Developer invites the chiropractor",
    2,
    "developer",
    "Issue one expiring project-scoped guest invitation",
    ["invitations", "notifications", "audit_events", "outbox_events"],
    ["FR-004", "FR-042", "UX-001", "UX-005"],
    ["S2-US01", "S2-US05", "S2-TEST01"],
    ["invitation:issued", "notification:queued"],
  ),
  step(
    "DJ-04",
    "Chiropractor joins at the assigned action",
    2,
    "domain_expert",
    "Consume the invitation and land on assigned project work",
    ["invitations", "project_memberships", "project_permission_grants"],
    ["FR-004", "FR-005", "FR-006", "UX-001", "UX-002"],
    ["S2-US01", "S2-SEC01", "S2-TEST01"],
    ["invitation:issued->consumed", "project_membership:active"],
  ),
  step(
    "DJ-05",
    "Developer contributes initial questions",
    2,
    "developer",
    "Open and assign human-authored discovery questions",
    ["questions", "question_assignments", "notifications"],
    ["FR-007", "FR-042", "UX-007", "HC-003"],
    ["S2-US02", "S2-US05", "S2-SEC01"],
    ["question:draft->open", "assignment:assigned->viewed"],
  ),
  step(
    "DJ-06",
    "Chiropractor contributes domain questions",
    2,
    "domain_expert",
    "Add generic domain questions without identifiable patient information",
    ["questions", "question_assignments", "audit_events"],
    ["FR-007", "HC-001", "HC-002", "HC-005", "UX-003"],
    ["S2-US02", "S2-SEC01", "S2-TEST01"],
    ["question:draft->open"],
  ),
  step(
    "DJ-07",
    "AI suggests additional questions",
    2,
    "ai",
    "Propose labelled questions with rationale after safe-input filtering",
    ["ai_generation_jobs", "ai_outputs", "questions"],
    ["FR-008", "HC-005", "UX-006", "UX-007"],
    ["S2-US04", "S2-SEC01", "S2-TEST01"],
    [
      "ai_job:requested->filtering->running->completed",
      "proposal:proposed->accepted",
    ],
  ),
  step(
    "DJ-08",
    "Chiropractor answers and creates evidence",
    2,
    "domain_expert",
    "Autosave, submit, and preserve a generic response as immutable evidence",
    [
      "question_response_drafts",
      "question_responses",
      "knowledge_sources",
      "source_fragments",
    ],
    ["FR-006", "FR-007", "FR-009", "FR-010", "FR-011", "HC-006"],
    ["S2-US02", "S2-US03", "S2-US05", "S2-SEC01", "S2-TEST01"],
    [
      "draft:editing->autosaved",
      "response:draft->submitted",
      "source_fragment:created",
    ],
  ),
  step(
    "DJ-09",
    "AI proposes evidence-backed artifacts",
    3,
    "ai",
    "Propose requirements, assumptions, risks, and acceptance criteria with evidence links",
    [
      "ai_generation_jobs",
      "ai_outputs",
      "artifacts",
      "artifact_versions",
      "artifact_version_evidence_links",
    ],
    ["FR-013", "FR-014", "FR-015", "FR-016", "UX-006", "UX-008"],
    ["S3-T01", "S3-US01", "S3-TEST01"],
    ["artifact_version:proposed->draft->in_review"],
  ),
  step(
    "DJ-10",
    "Humans review, correct, and preserve traceability",
    3,
    "reviewers",
    "Accept or supersede proposed versions without mutating evidence",
    [
      "artifact_versions",
      "artifact_version_state_events",
      "artifact_version_evidence_links",
    ],
    ["FR-009", "FR-011", "FR-014", "FR-016", "FR-023"],
    ["S2-US03", "S3-T01", "S3-US02", "S3-US06", "S3-TEST01"],
    [
      "artifact_version:in_review->accepted",
      "prior_artifact_version:superseded",
    ],
  ),
  step(
    "DJ-11",
    "System freezes a ready project-plan version",
    3,
    "system",
    "Evaluate deterministic readiness and freeze an exact plan manifest",
    [
      "readiness_evaluations",
      "readiness_rule_results",
      "plan_versions",
      "artifact_version_state_events",
    ],
    ["FR-017", "FR-018", "UX-009", "UX-010"],
    ["S3-US03", "S3-US04", "S3-TEST01"],
    [
      "readiness:requested->running->passed",
      "plan_version:draft->in_review->frozen",
      "project_workflow:discovery->plan_in_review",
    ],
  ),
  step(
    "DJ-12",
    "Required parties approve the exact project plan",
    3,
    "reviewers",
    "Make authenticated decisions against the immutable snapshot",
    [
      "approval_snapshots",
      "approval_requests",
      "approval_requirements",
      "approval_decisions",
    ],
    ["FR-019", "FR-020", "FR-021", "FR-022", "FR-023", "FR-024", "FR-025"],
    ["S3-US04", "S3-US05", "S3-US06", "S3-SEC01", "S3-TEST01"],
    [
      "approval_request:pending->approved",
      "project_workflow:plan_in_review->ready_for_backlog",
    ],
  ),
  step(
    "DJ-13",
    "Team creates and reviews the Agile backlog",
    4,
    "reviewers",
    "Confirm AI-assisted hierarchy linked to exact requirement versions",
    [
      "work_items",
      "work_item_artifact_version_links",
      "work_item_acceptance_criteria",
    ],
    ["FR-026", "FR-027", "FR-029"],
    ["S4-T01", "S4-US01", "S4-SEC01", "S4-TEST01"],
    ["work_item:proposed->accepted->ready"],
  ),
  step(
    "DJ-14",
    "Developer creates the sprint",
    4,
    "developer",
    "Select ordered work and commit a sprint goal",
    ["iterations", "iteration_work_items", "work_item_dependencies"],
    ["FR-027", "FR-028", "FR-029", "UX-017"],
    ["S4-US02", "S4-US03", "S4-TEST01"],
    [
      "sprint:draft->planned->ready",
      "project_workflow:ready_for_backlog->delivery",
    ],
  ),
  step(
    "DJ-15",
    "Developer prepares the Codex execution plan",
    5,
    "developer",
    "Freeze exact repository, commit, branch, path, network, tool, secret, limit, test, and review scope",
    [
      "repository_connections",
      "execution_plans",
      "execution_plan_versions",
      "execution_cycle_work_items",
    ],
    ["FR-030", "RUN-004", "SEC-005", "SEC-007"],
    ["S5-T01", "S5-US01"],
    ["execution_plan_version:draft->frozen->approval_pending"],
  ),
  step(
    "DJ-16",
    "Required approvers authorise one execution cycle",
    5,
    "reviewers",
    "Approve exact execution scope and atomically acquire work-item claims",
    [
      "approval_snapshots",
      "approval_decisions",
      "execution_cycles",
      "execution_work_item_claims",
      "runner_capability_grants",
      "runner_environments",
    ],
    ["FR-031", "FR-032", "FR-033", "RUN-001", "RUN-002", "RUN-003", "RUN-013"],
    ["S5-US02", "S5-T02", "S5-T03", "S5-T05", "S5-TEST01"],
    [
      "cycle:requested->authorising->queued->provisioning->running",
      "environment:requested->creating->ready->active",
    ],
  ),
  step(
    "DJ-17",
    "Codex works inside the approved boundary",
    5,
    "codex",
    "Perform only capability-authorised actions while usage and authority are monitored",
    ["agent_runs", "agent_turns", "agent_actions", "execution_usage_events"],
    ["FR-033", "FR-034", "FR-035", "FR-036", "RUN-006", "RUN-007", "RUN-008"],
    ["S5-US03", "S5-SEC01", "S5-T04", "S5-T05", "S5-TEST01"],
    ["cycle:running"],
  ),
  step(
    "DJ-18",
    "Codex reaches a checkpoint and stops",
    5,
    "codex",
    "Stop for a bounded human decision and recheck authority before resumption",
    [
      "execution_checkpoints",
      "execution_work_reports",
      "execution_reviews",
      "runner_capability_grants",
    ],
    ["FR-032", "FR-035", "FR-036", "FR-038", "RUN-007", "RUN-008", "RUN-009"],
    ["S5-US04", "S5-T04", "S5-T05", "S5-TEST01"],
    ["cycle:running->checkpoint_waiting->running", "checkpoint:open->resolved"],
  ),
  step(
    "DJ-19",
    "Tests, report, code preservation, and cleanup complete",
    5,
    "system",
    "Run required tests, reconcile code effects, revoke authority, destroy environment, and request review",
    [
      "execution_test_runs",
      "execution_work_reports",
      "code_changes",
      "changed_files",
      "runner_environments",
    ],
    [
      "FR-034",
      "FR-035",
      "FR-036",
      "FR-037",
      "FR-038",
      "RUN-009",
      "RUN-010",
      "RUN-012",
      "RUN-013",
    ],
    ["S5-US05", "S5-T04", "S5-T05", "S5-TEST01"],
    [
      "cycle:running->testing->reporting->awaiting_review",
      "environment:active->revoking->destroying->destroyed",
    ],
  ),
  step(
    "DJ-20",
    "Developer reviews technical work",
    5,
    "developer",
    "Inspect files, actions, tests, logs, usage, and pull request before deciding",
    [
      "execution_reviews",
      "execution_work_reports",
      "code_changes",
      "changed_files",
    ],
    ["FR-034", "FR-036", "FR-037", "FR-038"],
    ["S5-US05", "S5-T05", "S5-TEST01"],
    ["technical_review:outstanding->approved", "cycle:awaiting_review"],
  ),
  step(
    "DJ-21",
    "Domain expert reviews behaviour and team chooses next action",
    5,
    "domain_expert",
    "Review generic behaviour in plain language and make an immutable stakeholder decision",
    [
      "execution_reviews",
      "execution_work_item_claims",
      "change_proposals",
      "change_impact_evaluations",
    ],
    ["FR-023", "FR-038", "FR-039", "FR-040", "RUN-013"],
    ["S5-US05", "S5-T05", "S6-US01", "S6-US02", "S6-TEST01"],
    [
      "stakeholder_review:outstanding->approved",
      "cycle:awaiting_review->completed",
      "claim:active->required_review_completed",
    ],
  ),
  step(
    "DJ-22",
    "System prepares the release record",
    6,
    "system",
    "Verify and record the immutable requirement-to-release evidence chain and comparison",
    [
      "releases",
      "release_versions",
      "release_test_evidence",
      "release_execution_evidence",
      "demonstration_comparisons",
      "demonstration_comparison_results",
    ],
    ["FR-041", "FR-043", "HC-007", "DEMO-001"],
    ["S5-US06", "S6-US03", "S6-US04", "S6-SEC01", "S6-TEST01"],
    ["release:draft->verifying->approval_pending->approved->recorded"],
  ),
] as const;

export const TRACEWORK_DEMO_FIXTURE: DemoFixture = Object.freeze({
  fixtureVersion: "tracework-demo/v1",
  organisationId: asId<OrganisationId>("00000000-0000-7000-8000-000000000001"),
  projectId: asId<ProjectId>("00000000-0000-7000-8000-000000000002"),
  developer: Object.freeze({
    userId: asId<UserId>("00000000-0000-7000-8000-000000000003"),
    membershipId: asId<ProjectMembershipId>(
      "00000000-0000-7000-8000-000000000004",
    ),
    displayName: "Alex Developer",
  }),
  domainExpert: Object.freeze({
    userId: asId<UserId>("00000000-0000-7000-8000-000000000005"),
    membershipId: asId<ProjectMembershipId>(
      "00000000-0000-7000-8000-000000000006",
    ),
    displayName: "Casey Chiropractor",
  }),
  project: Object.freeze({
    key: "SAFE-DEMO",
    name: "Chiropractic practice workflow helper",
    description:
      "A general-business product discovery project using generic practice workflows and non-identifiable examples.",
    mode: "light",
    dataClassification: "general_business",
  }),
  sampleQuestion:
    "What generic steps help a small practice prepare a first-visit booking?",
  sampleAnswer:
    "A generic workflow confirms the service type, suitable time, preparation guidance, and a way to reschedule. Do not include patient details in the project.",
  steps: DEMO_STEPS,
});

export function validateDemoFixture(fixture: DemoFixture): void {
  invariant(
    fixture.steps.length === 22,
    "The demonstration spine must contain DJ-01 through DJ-22",
  );
  fixture.steps.forEach((entry, index) => {
    invariant(
      entry.id === `DJ-${String(index + 1).padStart(2, "0")}`,
      "Demo steps must be ordered",
    );
    invariant(
      entry.requirementIds.length > 0,
      `${entry.id} needs requirement traceability`,
    );
    invariant(
      entry.backlogIds.length > 0,
      `${entry.id} needs backlog traceability`,
    );
    invariant(entry.recordKinds.length > 0, `${entry.id} needs stored records`);
    invariant(
      entry.stateTransitions.length > 0,
      `${entry.id} needs state transitions`,
    );
  });
  invariant(
    fixture.project.dataClassification === "general_business",
    "Demo must remain general business",
  );
  invariant(
    !assessProhibitedContent(
      `${fixture.project.description} ${fixture.sampleQuestion} ${fixture.sampleAnswer}`,
    ).requiresQuarantine,
    "Demo fixture must not contain a prohibited-data signal",
  );
  invariant(
    !JSON.stringify(fixture)
      .toLowerCase()
      .includes("legal electronic signature"),
    "Demo must not depend on the future legal-signature module",
  );
}
