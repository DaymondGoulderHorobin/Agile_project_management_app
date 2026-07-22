export const PROJECT_MODES = ["light", "standard", "high_assurance"] as const;
export type ProjectMode = (typeof PROJECT_MODES)[number];

export const DATA_CLASSIFICATIONS = ["general_business"] as const;
export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number];

export const ORIGINS = [
  "human_authored",
  "ai_generated",
  "ai_generated_human_edited",
  "imported",
  "system_generated",
] as const;
export type Origin = (typeof ORIGINS)[number];

export const ACTOR_TYPES = [
  "human",
  "ai",
  "system",
  "integration",
  "operator",
] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export const PROJECT_WORKFLOW_STATES = [
  "discovery",
  "planning",
  "plan_in_review",
  "ready_for_backlog",
  "delivery",
  "release_in_review",
  "released",
  "on_hold",
  "archived",
] as const;
export type ProjectWorkflowState = (typeof PROJECT_WORKFLOW_STATES)[number];

export const ARTIFACT_TYPES = [
  "requirement",
  "assumption",
  "risk",
  "decision",
  "acceptance_criterion",
  "project_plan",
  "design",
  "release_plan",
] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const ARTIFACT_STATES = [
  "proposed",
  "draft",
  "in_review",
  "accepted",
  "frozen",
  "superseded",
  "archived",
] as const;
export type ArtifactState = (typeof ARTIFACT_STATES)[number];

export const EVIDENCE_RELATIONS = [
  "supports",
  "contradicts",
  "qualifies",
  "originates_from",
] as const;
export type EvidenceRelation = (typeof EVIDENCE_RELATIONS)[number];

export const APPROVAL_REQUEST_STATES = [
  "pending",
  "approved",
  "changes_requested",
  "rejected",
  "withdrawn",
  "stale",
] as const;
export type ApprovalRequestState = (typeof APPROVAL_REQUEST_STATES)[number];

export const APPROVAL_DECISIONS = [
  "approved",
  "approved_with_conditions",
  "changes_requested",
  "rejected",
] as const;
export type ApprovalDecision = (typeof APPROVAL_DECISIONS)[number];

export const READINESS_SEVERITIES = [
  "blocking",
  "warning",
  "informational",
] as const;
export type ReadinessSeverity = (typeof READINESS_SEVERITIES)[number];

export const READINESS_OUTCOMES = [
  "satisfied",
  "unsatisfied",
  "not_applicable",
] as const;
export type ReadinessOutcome = (typeof READINESS_OUTCOMES)[number];

export const WORK_ITEM_KINDS = [
  "epic",
  "user_story",
  "task",
  "bug",
  "spike",
  "review",
  "test",
  "documentation",
] as const;
export type WorkItemKind = (typeof WORK_ITEM_KINDS)[number];

export const EXECUTION_CYCLE_STATES = [
  "requested",
  "authorising",
  "queued",
  "provisioning",
  "running",
  "checkpoint_waiting",
  "human_input_required",
  "testing",
  "reporting",
  "awaiting_review",
  "completed",
  "cancelling",
  "cancelled",
  "failed",
  "recovery_required",
] as const;
export type ExecutionCycleState = (typeof EXECUTION_CYCLE_STATES)[number];

export const RUNNER_ENVIRONMENT_STATES = [
  "requested",
  "creating",
  "ready",
  "active",
  "revoking",
  "destroying",
  "destroyed",
  "cleanup_failed",
] as const;
export type RunnerEnvironmentState = (typeof RUNNER_ENVIRONMENT_STATES)[number];

export const EXECUTION_STOP_REASONS = [
  "checkpoint_reached",
  "human_input_required",
  "scope_violation",
  "token_limit",
  "cost_limit",
  "turn_limit",
  "task_limit",
  "time_limit",
  "tests_failed",
  "approval_revoked",
  "membership_revoked",
  "repository_access_lost",
  "material_change",
  "user_cancelled",
  "runner_crash",
  "completed",
] as const;
export type ExecutionStopReason = (typeof EXECUTION_STOP_REASONS)[number];

export const CLAIM_RELEASE_REASONS = [
  "required_review_completed",
  "safely_cancelled",
  "authorised_failure_recovery",
  "authorised_change_removed_work",
] as const;
export type ClaimReleaseReason = (typeof CLAIM_RELEASE_REASONS)[number];

export const CHANGE_CLASSES = ["minor", "material", "fundamental"] as const;
export type ChangeClass = (typeof CHANGE_CLASSES)[number];

export const CHANGE_PROPOSAL_STATES = [
  "proposed",
  "classified",
  "impact_assessed",
  "approved",
  "rejected",
  "applying",
  "applied",
  "recovery_required",
] as const;
export type ChangeProposalState = (typeof CHANGE_PROPOSAL_STATES)[number];

export const RELEASE_STATES = [
  "draft",
  "verifying",
  "approval_pending",
  "approved",
  "recorded",
] as const;
export type ReleaseState = (typeof RELEASE_STATES)[number];

export const INCIDENT_STATES = [
  "suspected",
  "quarantined",
  "assessing",
  "remediating",
  "resolved",
] as const;
export type IncidentState = (typeof INCIDENT_STATES)[number];

export const PROJECT_ROLES = [
  "organisation_owner",
  "organisation_admin",
  "project_owner",
  "developer",
  "domain_expert",
  "stakeholder",
  "reviewer",
  "guest",
  "operator",
] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];
