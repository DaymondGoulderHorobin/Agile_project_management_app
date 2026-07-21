import { z } from "zod";

import {
  CommandContextSchema,
  ContentHashSchema,
  IsoDateTimeSchema,
  OriginSchema,
} from "./common.js";
import {
  ActorIdSchema,
  AttachmentIdSchema,
  CommentIdSchema,
  KnowledgeSourceIdSchema,
  ProjectIdSchema,
  ProjectMembershipIdSchema,
  ProhibitedContentIncidentIdSchema,
  QuestionAssignmentIdSchema,
  QuestionIdSchema,
  QuestionResponseIdSchema,
  SourceFragmentIdSchema,
} from "./ids.js";

export const QuestionStatusSchema = z.enum([
  "draft",
  "open",
  "closed",
  "archived",
]);
export const QuestionAssignmentStatusSchema = z.enum([
  "assigned",
  "viewed",
  "completed",
  "revoked",
]);
export const EvidenceRelationSchema = z.enum([
  "supports",
  "contradicts",
  "qualifies",
  "originates_from",
]);

export const QuestionSchema = z.object({
  id: QuestionIdSchema,
  projectId: ProjectIdSchema,
  parentQuestionId: QuestionIdSchema.nullable(),
  prompt: z.string().min(1).max(12_000),
  rationale: z.string().max(4_000),
  origin: OriginSchema,
  authorActorId: ActorIdSchema,
  status: QuestionStatusSchema,
  lockVersion: z.number().int().nonnegative(),
  createdAt: IsoDateTimeSchema,
});

export const CreateQuestionCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  parentQuestionId: QuestionIdSchema.optional(),
  prompt: z.string().trim().min(1).max(12_000),
  rationale: z.string().trim().max(4_000).default(""),
  origin: OriginSchema,
  aiOutputId: z.string().uuid().optional(),
});

export const AssignQuestionCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  questionId: QuestionIdSchema,
  assigneeMembershipIds: z.array(ProjectMembershipIdSchema).min(1),
  dueAt: IsoDateTimeSchema.optional(),
});

export const QuestionAssignmentSchema = z.object({
  id: QuestionAssignmentIdSchema,
  questionId: QuestionIdSchema,
  membershipId: ProjectMembershipIdSchema,
  status: QuestionAssignmentStatusSchema,
  dueAt: IsoDateTimeSchema.nullable(),
});

export const SaveResponseDraftCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  questionId: QuestionIdSchema,
  membershipId: ProjectMembershipIdSchema,
  body: z.string().max(50_000),
  expectedLockVersion: z.number().int().nonnegative(),
});

export const SubmitResponseCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  questionId: QuestionIdSchema,
  membershipId: ProjectMembershipIdSchema,
  body: z.string().trim().min(1).max(50_000),
  supersedesResponseId: QuestionResponseIdSchema.optional(),
  prohibitedHealthDataAcknowledged: z.literal(true),
});

export const QuestionResponseSchema = z.object({
  id: QuestionResponseIdSchema,
  projectId: ProjectIdSchema,
  questionId: QuestionIdSchema,
  respondentActorId: ActorIdSchema,
  body: z.string().min(1),
  origin: OriginSchema,
  supersedesResponseId: QuestionResponseIdSchema.nullable(),
  submittedAt: IsoDateTimeSchema,
});

export const KnowledgeSourceTypeSchema = z.enum([
  "question_response",
  "uploaded_document",
  "imported_text",
  "meeting_note",
  "external_reference",
]);

export const SourceFragmentSchema = z.object({
  id: SourceFragmentIdSchema,
  knowledgeSourceId: KnowledgeSourceIdSchema,
  projectId: ProjectIdSchema,
  fragmentKind: z.enum(["text", "object_range", "file_range"]),
  text: z.string().min(1).max(100_000),
  contentHash: ContentHashSchema,
  origin: OriginSchema,
  supersedesSourceFragmentId: SourceFragmentIdSchema.nullable(),
  capturedAt: IsoDateTimeSchema,
});

export const SourceFragmentRelationshipSchema = z.object({
  fromFragmentId: SourceFragmentIdSchema,
  toFragmentId: SourceFragmentIdSchema,
  relation: EvidenceRelationSchema,
  rationale: z.string().min(1).max(4_000),
});

export const EvidenceReferenceSchema = z.object({
  sourceFragmentId: SourceFragmentIdSchema,
  relation: EvidenceRelationSchema,
  rationale: z.string().min(1).max(4_000),
});

export const CreateCommentCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  targetKind: z.string().min(1).max(80),
  targetId: z.string().uuid(),
  targetVersionId: z.string().uuid().optional(),
  parentCommentId: CommentIdSchema.optional(),
  body: z.string().trim().min(1).max(20_000),
});

export const AttachmentStatusSchema = z.enum([
  "pending_scan",
  "clean",
  "quarantined",
  "rejected",
  "purged",
]);
export const AttachmentSchema = z.object({
  id: AttachmentIdSchema,
  projectId: ProjectIdSchema,
  displayName: z.string().min(1).max(255),
  declaredMediaType: z.string().min(1).max(200),
  detectedMediaType: z.string().max(200).nullable(),
  byteSize: z.number().int().nonnegative(),
  hash: ContentHashSchema,
  status: AttachmentStatusSchema,
  createdAt: IsoDateTimeSchema,
});

export const ProhibitedContentIncidentStatusSchema = z.enum([
  "open",
  "contained",
  "remediated",
  "closed",
]);
export const ProhibitedContentIncidentSchema = z.object({
  id: ProhibitedContentIncidentIdSchema,
  projectId: ProjectIdSchema,
  attachmentId: AttachmentIdSchema.nullable(),
  detectionSource: z.enum([
    "user_report",
    "text_filter",
    "file_filter",
    "ai_filter",
    "operator",
  ]),
  status: ProhibitedContentIncidentStatusSchema,
  exposureFlags: z.array(
    z.enum(["object_storage", "logs", "backup", "integration", "ai_provider"]),
  ),
  safeSummary: z.string().min(1).max(2_000),
  createdAt: IsoDateTimeSchema,
  resolvedAt: IsoDateTimeSchema.nullable(),
});

export type Question = z.infer<typeof QuestionSchema>;
export type SourceFragment = z.infer<typeof SourceFragmentSchema>;
export type SubmitResponseCommand = z.infer<typeof SubmitResponseCommandSchema>;
