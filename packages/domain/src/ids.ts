export type Brand<Value, Name extends string> = Value & {
  readonly __brand: Name;
};

export type ActorId = Brand<string, "ActorId">;
export type UserId = Brand<string, "UserId">;
export type OrganisationId = Brand<string, "OrganisationId">;
export type ProjectId = Brand<string, "ProjectId">;
export type ProjectMembershipId = Brand<string, "ProjectMembershipId">;
export type QuestionId = Brand<string, "QuestionId">;
export type QuestionResponseId = Brand<string, "QuestionResponseId">;
export type KnowledgeSourceId = Brand<string, "KnowledgeSourceId">;
export type SourceFragmentId = Brand<string, "SourceFragmentId">;
export type ArtifactId = Brand<string, "ArtifactId">;
export type ArtifactVersionId = Brand<string, "ArtifactVersionId">;
export type ApprovalPolicyVersionId = Brand<string, "ApprovalPolicyVersionId">;
export type ApprovalSnapshotId = Brand<string, "ApprovalSnapshotId">;
export type ApprovalRequestId = Brand<string, "ApprovalRequestId">;
export type ApprovalRequirementId = Brand<string, "ApprovalRequirementId">;
export type ApprovalDecisionId = Brand<string, "ApprovalDecisionId">;
export type ReauthenticationGrantId = Brand<string, "ReauthenticationGrantId">;
export type IterationId = Brand<string, "IterationId">;
export type WorkItemId = Brand<string, "WorkItemId">;
export type ExecutionPlanId = Brand<string, "ExecutionPlanId">;
export type ExecutionPlanVersionId = Brand<string, "ExecutionPlanVersionId">;
export type ExecutionCycleId = Brand<string, "ExecutionCycleId">;
export type ExecutionWorkItemClaimId = Brand<
  string,
  "ExecutionWorkItemClaimId"
>;
export type RunnerCapabilityGrantId = Brand<string, "RunnerCapabilityGrantId">;
export type RunnerEnvironmentId = Brand<string, "RunnerEnvironmentId">;
export type AgentRunId = Brand<string, "AgentRunId">;
export type AgentTurnId = Brand<string, "AgentTurnId">;
export type AgentActionId = Brand<string, "AgentActionId">;
export type ExecutionCheckpointId = Brand<string, "ExecutionCheckpointId">;
export type ExecutionWorkReportId = Brand<string, "ExecutionWorkReportId">;
export type ExecutionReviewId = Brand<string, "ExecutionReviewId">;
export type ChangeProposalId = Brand<string, "ChangeProposalId">;
export type ReleaseId = Brand<string, "ReleaseId">;
export type ReleaseVersionId = Brand<string, "ReleaseVersionId">;
export type ProhibitedContentIncidentId = Brand<
  string,
  "ProhibitedContentIncidentId"
>;
export type DemonstrationComparisonId = Brand<
  string,
  "DemonstrationComparisonId"
>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function asId<Identifier extends Brand<string, string>>(
  value: string,
  label = "identifier",
): Identifier {
  if (!UUID_PATTERN.test(value)) {
    throw new TypeError(`${label} must be a UUID`);
  }

  return value as Identifier;
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
