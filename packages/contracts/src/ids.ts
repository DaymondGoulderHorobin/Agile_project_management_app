import { z } from "zod";

const entityId = <Brand extends string>() => z.string().uuid().brand<Brand>();

export const UserIdSchema = entityId<"UserId">();
export const ActorIdSchema = entityId<"ActorId">();
export const OrganisationIdSchema = entityId<"OrganisationId">();
export const OrganisationMembershipIdSchema =
  entityId<"OrganisationMembershipId">();
export const ProjectIdSchema = entityId<"ProjectId">();
export const ProjectMembershipIdSchema = entityId<"ProjectMembershipId">();
export const InvitationIdSchema = entityId<"InvitationId">();
export const ReauthenticationGrantIdSchema =
  entityId<"ReauthenticationGrantId">();
export const WorkflowInstanceIdSchema = entityId<"WorkflowInstanceId">();
export const QuestionIdSchema = entityId<"QuestionId">();
export const QuestionAssignmentIdSchema = entityId<"QuestionAssignmentId">();
export const QuestionResponseIdSchema = entityId<"QuestionResponseId">();
export const KnowledgeSourceIdSchema = entityId<"KnowledgeSourceId">();
export const SourceFragmentIdSchema = entityId<"SourceFragmentId">();
export const ArtifactIdSchema = entityId<"ArtifactId">();
export const ArtifactVersionIdSchema = entityId<"ArtifactVersionId">();
export const ApprovalPolicyVersionIdSchema =
  entityId<"ApprovalPolicyVersionId">();
export const ApprovalSnapshotIdSchema = entityId<"ApprovalSnapshotId">();
export const ApprovalRequestIdSchema = entityId<"ApprovalRequestId">();
export const ApprovalRequirementIdSchema = entityId<"ApprovalRequirementId">();
export const ApprovalDecisionIdSchema = entityId<"ApprovalDecisionId">();
export const ReadinessEvaluationIdSchema = entityId<"ReadinessEvaluationId">();
export const WorkItemIdSchema = entityId<"WorkItemId">();
export const IterationIdSchema = entityId<"IterationId">();
export const AiJobIdSchema = entityId<"AiJobId">();
export const AiOutputIdSchema = entityId<"AiOutputId">();
export const IntegrationIdSchema = entityId<"IntegrationId">();
export const RepositoryIdSchema = entityId<"RepositoryId">();
export const ProjectRepositoryIdSchema = entityId<"ProjectRepositoryId">();
export const ExecutionPlanIdSchema = entityId<"ExecutionPlanId">();
export const ExecutionPlanVersionIdSchema =
  entityId<"ExecutionPlanVersionId">();
export const ExecutionCycleIdSchema = entityId<"ExecutionCycleId">();
export const ExecutionWorkItemClaimIdSchema =
  entityId<"ExecutionWorkItemClaimId">();
export const RunnerCapabilityGrantIdSchema =
  entityId<"RunnerCapabilityGrantId">();
export const RunnerEnvironmentIdSchema = entityId<"RunnerEnvironmentId">();
export const AgentRunIdSchema = entityId<"AgentRunId">();
export const AgentTurnIdSchema = entityId<"AgentTurnId">();
export const AgentActionIdSchema = entityId<"AgentActionId">();
export const ExecutionCheckpointIdSchema = entityId<"ExecutionCheckpointId">();
export const ExecutionTestRunIdSchema = entityId<"ExecutionTestRunId">();
export const ExecutionWorkReportIdSchema = entityId<"ExecutionWorkReportId">();
export const ExecutionReviewIdSchema = entityId<"ExecutionReviewId">();
export const CodeChangeIdSchema = entityId<"CodeChangeId">();
export const ChangedFileIdSchema = entityId<"ChangedFileId">();
export const ChangeProposalIdSchema = entityId<"ChangeProposalId">();
export const ChangeProposalVersionIdSchema =
  entityId<"ChangeProposalVersionId">();
export const ChangeImpactEvaluationIdSchema =
  entityId<"ChangeImpactEvaluationId">();
export const ChangeApplicationIdSchema = entityId<"ChangeApplicationId">();
export const TestRunIdSchema = entityId<"TestRunId">();
export const ReleaseIdSchema = entityId<"ReleaseId">();
export const ReleaseVersionIdSchema = entityId<"ReleaseVersionId">();
export const CommentIdSchema = entityId<"CommentId">();
export const NotificationIdSchema = entityId<"NotificationId">();
export const AttachmentIdSchema = entityId<"AttachmentId">();
export const ProhibitedContentIncidentIdSchema =
  entityId<"ProhibitedContentIncidentId">();
export const AuditEventIdSchema = entityId<"AuditEventId">();
export const OutboxEventIdSchema = entityId<"OutboxEventId">();
export const DemonstrationComparisonIdSchema =
  entityId<"DemonstrationComparisonId">();
export const DemonstrationComparisonResultIdSchema =
  entityId<"DemonstrationComparisonResultId">();

export type UserId = z.infer<typeof UserIdSchema>;
export type ActorId = z.infer<typeof ActorIdSchema>;
export type OrganisationId = z.infer<typeof OrganisationIdSchema>;
export type OrganisationMembershipId = z.infer<
  typeof OrganisationMembershipIdSchema
>;
export type ProjectId = z.infer<typeof ProjectIdSchema>;
export type ProjectMembershipId = z.infer<typeof ProjectMembershipIdSchema>;
export type InvitationId = z.infer<typeof InvitationIdSchema>;
export type ReauthenticationGrantId = z.infer<
  typeof ReauthenticationGrantIdSchema
>;
export type QuestionId = z.infer<typeof QuestionIdSchema>;
export type QuestionResponseId = z.infer<typeof QuestionResponseIdSchema>;
export type SourceFragmentId = z.infer<typeof SourceFragmentIdSchema>;
export type ArtifactId = z.infer<typeof ArtifactIdSchema>;
export type ArtifactVersionId = z.infer<typeof ArtifactVersionIdSchema>;
export type ApprovalSnapshotId = z.infer<typeof ApprovalSnapshotIdSchema>;
export type ApprovalRequestId = z.infer<typeof ApprovalRequestIdSchema>;
export type WorkItemId = z.infer<typeof WorkItemIdSchema>;
export type ExecutionPlanVersionId = z.infer<
  typeof ExecutionPlanVersionIdSchema
>;
export type ExecutionCycleId = z.infer<typeof ExecutionCycleIdSchema>;
export type RunnerEnvironmentId = z.infer<typeof RunnerEnvironmentIdSchema>;
