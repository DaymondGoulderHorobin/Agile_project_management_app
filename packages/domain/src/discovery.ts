import { DomainError, invariant } from "./errors.js";
import { createContentHash, type ContentHash } from "./hash.js";
import { assessProhibitedContent } from "./health.js";
import type {
  ActorId,
  KnowledgeSourceId,
  OrganisationId,
  ProjectId,
  ProjectMembershipId,
  QuestionId,
  QuestionResponseId,
  SourceFragmentId,
} from "./ids.js";
import type { Origin } from "./types.js";

export interface Question {
  readonly id: QuestionId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly prompt: string;
  readonly rationale: string;
  readonly origin: Origin;
  readonly authorActorId: ActorId | null;
  readonly parentQuestionId: QuestionId | null;
  readonly status: "draft" | "open" | "closed";
  readonly lockVersion: number;
}

export function createQuestion(
  input: Omit<Question, "status" | "lockVersion">,
): Question {
  invariant(input.prompt.trim().length > 0, "Question prompt is required");
  const safety = assessProhibitedContent(`${input.prompt} ${input.rationale}`);
  if (safety.shouldBlockProviderForwarding) {
    throw new DomainError(
      "FORBIDDEN",
      "Question may contain prohibited identifiable health information",
      {
        suspectedCategories: safety.suspectedCategories,
      },
    );
  }
  invariant(
    input.origin !== "human_authored" || input.authorActorId !== null,
    "Human-authored questions need an actor",
  );
  return Object.freeze({ ...input, status: "draft", lockVersion: 0 });
}

export function openQuestion(
  question: Question,
  expectedLockVersion: number,
): Question {
  if (question.lockVersion !== expectedLockVersion) {
    throw new DomainError("STALE_VERSION", "Question was concurrently changed");
  }
  invariant(question.status === "draft", "Only a draft question can be opened");
  return Object.freeze({
    ...question,
    status: "open",
    lockVersion: question.lockVersion + 1,
  });
}

export interface QuestionResponseDraft {
  readonly questionId: QuestionId;
  readonly membershipId: ProjectMembershipId;
  readonly body: string;
  readonly lockVersion: number;
  readonly autosavedAt: Date;
}

export function autosaveResponseDraft(
  draft: QuestionResponseDraft,
  body: string,
  expectedLockVersion: number,
  now: Date,
): QuestionResponseDraft {
  if (draft.lockVersion !== expectedLockVersion) {
    throw new DomainError(
      "STALE_VERSION",
      "Response draft was concurrently changed",
    );
  }
  return Object.freeze({
    ...draft,
    body,
    lockVersion: draft.lockVersion + 1,
    autosavedAt: new Date(now),
  });
}

export interface QuestionResponse {
  readonly id: QuestionResponseId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly questionId: QuestionId;
  readonly respondentActorId: ActorId;
  readonly body: string;
  readonly origin: Origin;
  readonly contentHash: ContentHash;
  readonly submittedAt: Date;
  readonly supersedesResponseId: QuestionResponseId | null;
}

export function submitQuestionResponse(
  input: Omit<QuestionResponse, "contentHash">,
): QuestionResponse {
  invariant(input.body.trim().length > 0, "Submitted response cannot be empty");
  const safety = assessProhibitedContent(input.body);
  if (safety.requiresQuarantine) {
    throw new DomainError(
      "FORBIDDEN",
      "Response requires prohibited-content incident handling",
      {
        suspectedCategories: safety.suspectedCategories,
      },
    );
  }
  return Object.freeze({
    ...input,
    body: input.body.replace(/\r\n?/g, "\n"),
    contentHash: createContentHash("question-response/v1", {
      body: input.body.replace(/\r\n?/g, "\n"),
      origin: input.origin,
      questionId: input.questionId,
      supersedesResponseId: input.supersedesResponseId,
    }),
  });
}

export function assertValidResponseCorrection(
  prior: QuestionResponse,
  correction: QuestionResponse,
): void {
  invariant(
    correction.id !== prior.id,
    "A correction must create a new response",
  );
  invariant(
    correction.questionId === prior.questionId,
    "A correction must answer the same question",
  );
  invariant(
    correction.supersedesResponseId === prior.id,
    "A correction must point to the exact prior response",
  );
}

export interface SourceFragment {
  readonly id: SourceFragmentId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly knowledgeSourceId: KnowledgeSourceId;
  readonly text: string;
  readonly origin: Origin;
  readonly contentHash: ContentHash;
  readonly supersedesSourceFragmentId: SourceFragmentId | null;
  readonly capturedAt: Date;
}

export function createSourceFragment(
  input: Omit<SourceFragment, "contentHash">,
): SourceFragment {
  invariant(input.text.trim().length > 0, "Evidence fragment cannot be empty");
  return Object.freeze({
    ...input,
    text: input.text.replace(/\r\n?/g, "\n"),
    contentHash: createContentHash("source-fragment/v1", {
      knowledgeSourceId: input.knowledgeSourceId,
      origin: input.origin,
      supersedesSourceFragmentId: input.supersedesSourceFragmentId,
      text: input.text.replace(/\r\n?/g, "\n"),
    }),
  });
}
