import { z } from "zod";

import { AiJobSchema } from "./ai.js";
import { ApprovalRequestSchema } from "./approvals.js";
import {
  ArtifactVersionSchema,
  ReadinessEvaluationSchema,
} from "./artifacts.js";
import {
  ChangeImpactEvaluationSchema,
  ChangeProposalVersionSchema,
  ReleaseVersionSchema,
} from "./change-release.js";
import { createApiResponseSchema } from "./common.js";
import {
  ProhibitedContentIncidentSchema,
  QuestionResponseSchema,
  QuestionSchema,
  SourceFragmentSchema,
} from "./discovery.js";
import {
  ExecutionCycleSchema,
  ExecutionPlanVersionSchema,
  ExecutionWorkReportSchema,
} from "./execution.js";
import {
  InvitationSchema,
  NextActionSchema,
  OrganisationSchema,
  ProjectMembershipSchema,
  ProjectSchema,
} from "./tenancy.js";
import { IterationSchema, WorkItemSchema } from "./agile.js";

export const OrganisationResponseSchema =
  createApiResponseSchema(OrganisationSchema);
export const ProjectResponseSchema = createApiResponseSchema(ProjectSchema);
export const ProjectMembershipResponseSchema = createApiResponseSchema(
  ProjectMembershipSchema,
);
export const InvitationResponseSchema =
  createApiResponseSchema(InvitationSchema);
export const NextActionResponseSchema =
  createApiResponseSchema(NextActionSchema);
export const QuestionResponseEnvelopeSchema =
  createApiResponseSchema(QuestionSchema);
export const SubmittedResponseEnvelopeSchema = createApiResponseSchema(
  z.object({
    response: QuestionResponseSchema,
    sourceFragments: z.array(SourceFragmentSchema).min(1),
  }),
);
export const ProhibitedContentIncidentResponseSchema = createApiResponseSchema(
  ProhibitedContentIncidentSchema,
);
export const ArtifactVersionResponseSchema = createApiResponseSchema(
  ArtifactVersionSchema,
);
export const ReadinessEvaluationResponseSchema = createApiResponseSchema(
  ReadinessEvaluationSchema,
);
export const ApprovalRequestResponseSchema = createApiResponseSchema(
  ApprovalRequestSchema,
);
export const WorkItemResponseSchema = createApiResponseSchema(WorkItemSchema);
export const IterationResponseSchema = createApiResponseSchema(IterationSchema);
export const AiJobResponseSchema = createApiResponseSchema(AiJobSchema);
export const ExecutionPlanVersionResponseSchema = createApiResponseSchema(
  ExecutionPlanVersionSchema,
);
export const ExecutionCycleResponseSchema =
  createApiResponseSchema(ExecutionCycleSchema);
export const ExecutionWorkReportResponseSchema = createApiResponseSchema(
  ExecutionWorkReportSchema,
);
export const ChangeProposalVersionResponseSchema = createApiResponseSchema(
  ChangeProposalVersionSchema,
);
export const ChangeImpactEvaluationResponseSchema = createApiResponseSchema(
  ChangeImpactEvaluationSchema,
);
export const ReleaseVersionResponseSchema =
  createApiResponseSchema(ReleaseVersionSchema);

export const ApiRouteDescriptorSchema = z.object({
  operationId: z.string().min(1).max(120),
  slice: z.enum(["S1", "S2", "S3", "S4", "S5", "S6"]),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().startsWith("/v1/"),
  access: z.enum([
    "authenticated",
    "project_guest",
    "internal_runner",
    "github_webhook",
  ]),
  permission: z.string().nullable(),
  idempotent: z.boolean(),
});

export const API_ROUTE_DESCRIPTORS = [
  {
    operationId: "createOrganisation",
    slice: "S1",
    method: "POST",
    path: "/v1/organisations",
    access: "authenticated",
    permission: null,
    idempotent: true,
  },
  {
    operationId: "createProject",
    slice: "S1",
    method: "POST",
    path: "/v1/organisations/{organisationId}/projects",
    access: "authenticated",
    permission: "project.create",
    idempotent: true,
  },
  {
    operationId: "inviteGuest",
    slice: "S2",
    method: "POST",
    path: "/v1/projects/{projectId}/invitations",
    access: "authenticated",
    permission: "project.guest.invite",
    idempotent: true,
  },
  {
    operationId: "acceptInvitation",
    slice: "S2",
    method: "POST",
    path: "/v1/invitations/accept",
    access: "authenticated",
    permission: null,
    idempotent: true,
  },
  {
    operationId: "createQuestion",
    slice: "S2",
    method: "POST",
    path: "/v1/projects/{projectId}/questions",
    access: "project_guest",
    permission: "question.create",
    idempotent: true,
  },
  {
    operationId: "saveResponseDraft",
    slice: "S2",
    method: "PUT",
    path: "/v1/projects/{projectId}/questions/{questionId}/draft",
    access: "project_guest",
    permission: "question.answer",
    idempotent: true,
  },
  {
    operationId: "submitResponse",
    slice: "S2",
    method: "POST",
    path: "/v1/projects/{projectId}/questions/{questionId}/responses",
    access: "project_guest",
    permission: "question.answer",
    idempotent: true,
  },
  {
    operationId: "requestAiGeneration",
    slice: "S2",
    method: "POST",
    path: "/v1/projects/{projectId}/ai-jobs",
    access: "project_guest",
    permission: "ai.generate",
    idempotent: true,
  },
  {
    operationId: "createArtifactVersion",
    slice: "S3",
    method: "POST",
    path: "/v1/projects/{projectId}/artifact-versions",
    access: "project_guest",
    permission: "artifact.version.create",
    idempotent: true,
  },
  {
    operationId: "evaluateReadiness",
    slice: "S3",
    method: "POST",
    path: "/v1/projects/{projectId}/readiness-evaluations",
    access: "authenticated",
    permission: "plan.readiness.evaluate",
    idempotent: true,
  },
  {
    operationId: "openApprovalRequest",
    slice: "S3",
    method: "POST",
    path: "/v1/projects/{projectId}/approval-requests",
    access: "authenticated",
    permission: "approval.request",
    idempotent: true,
  },
  {
    operationId: "decideApproval",
    slice: "S3",
    method: "POST",
    path: "/v1/projects/{projectId}/approval-requests/{requestId}/decisions",
    access: "project_guest",
    permission: "approval.decide",
    idempotent: true,
  },
  {
    operationId: "createWorkItem",
    slice: "S4",
    method: "POST",
    path: "/v1/projects/{projectId}/work-items",
    access: "authenticated",
    permission: "backlog.manage",
    idempotent: true,
  },
  {
    operationId: "createSprint",
    slice: "S4",
    method: "POST",
    path: "/v1/projects/{projectId}/sprints",
    access: "authenticated",
    permission: "sprint.plan",
    idempotent: true,
  },
  {
    operationId: "createExecutionPlanVersion",
    slice: "S5",
    method: "POST",
    path: "/v1/projects/{projectId}/execution-plan-versions",
    access: "authenticated",
    permission: "execution_plan.create",
    idempotent: true,
  },
  {
    operationId: "requestExecutionCycle",
    slice: "S5",
    method: "POST",
    path: "/v1/projects/{projectId}/execution-cycles",
    access: "authenticated",
    permission: "execution.request",
    idempotent: true,
  },
  {
    operationId: "streamExecutionActivity",
    slice: "S5",
    method: "GET",
    path: "/v1/projects/{projectId}/execution-cycles/{cycleId}/activity",
    access: "project_guest",
    permission: "execution.view",
    idempotent: true,
  },
  {
    operationId: "ingestRunnerActivity",
    slice: "S5",
    method: "POST",
    path: "/v1/internal/runner/execution-cycles/{cycleId}/activity",
    access: "internal_runner",
    permission: null,
    idempotent: true,
  },
  {
    operationId: "resolveCheckpoint",
    slice: "S5",
    method: "POST",
    path: "/v1/projects/{projectId}/execution-cycles/{cycleId}/checkpoints/{checkpointId}/decision",
    access: "project_guest",
    permission: "execution.checkpoint.decide",
    idempotent: true,
  },
  {
    operationId: "cancelExecutionCycle",
    slice: "S5",
    method: "POST",
    path: "/v1/projects/{projectId}/execution-cycles/{cycleId}/cancel",
    access: "authenticated",
    permission: "execution.cancel",
    idempotent: true,
  },
  {
    operationId: "decideExecutionReview",
    slice: "S5",
    method: "POST",
    path: "/v1/projects/{projectId}/execution-cycles/{cycleId}/reviews",
    access: "project_guest",
    permission: "execution.review",
    idempotent: true,
  },
  {
    operationId: "createChangeProposal",
    slice: "S6",
    method: "POST",
    path: "/v1/projects/{projectId}/change-proposals",
    access: "project_guest",
    permission: "change.propose",
    idempotent: true,
  },
  {
    operationId: "applyChange",
    slice: "S6",
    method: "POST",
    path: "/v1/projects/{projectId}/change-applications",
    access: "authenticated",
    permission: "change.apply",
    idempotent: true,
  },
  {
    operationId: "createReleaseVersion",
    slice: "S6",
    method: "POST",
    path: "/v1/projects/{projectId}/release-versions",
    access: "authenticated",
    permission: "release.prepare",
    idempotent: true,
  },
  {
    operationId: "recordRelease",
    slice: "S6",
    method: "POST",
    path: "/v1/projects/{projectId}/release-versions/{releaseVersionId}/record",
    access: "authenticated",
    permission: "release.record",
    idempotent: true,
  },
] as const;

ApiRouteDescriptorSchema.array().parse(API_ROUTE_DESCRIPTORS);

export type ApiRouteDescriptor = z.infer<typeof ApiRouteDescriptorSchema>;
