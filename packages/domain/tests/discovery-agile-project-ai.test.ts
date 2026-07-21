import { describe, expect, it } from "vitest";

import {
  asId,
  assertValidResponseCorrection,
  autosaveResponseDraft,
  consumeProjectInvitation,
  createAiOutput,
  createDemonstrationComparisonResult,
  createProject,
  createQuestion,
  createSourceFragment,
  decideAiOutput,
  invitationState,
  issueProjectInvitation,
  openQuestion,
  submitQuestionResponse,
  transitionSprint,
  transitionWorkItem,
  validateWorkItemGraph,
  type ActorId,
  type IterationId,
  type ProjectMembershipId,
  type Sprint,
  type WorkItem,
} from "../src/index.js";
import { IDS, NOW } from "./fixtures.js";

describe("secure project and guest invitation", () => {
  it("creates only a general-business project", () => {
    expect(
      createProject({
        id: IDS.project,
        organisationId: IDS.organisation,
        key: "SAFE-1",
        name: "Generic workflow",
        description: "No identifiable examples",
        mode: "light",
        dataClassification: "general_business",
      }),
    ).toMatchObject({
      status: "active",
      dataClassification: "general_business",
    });
  });

  it("stores a hashed single-use invitation and creates only project-scoped guest access", () => {
    const token = "invite-token-".padEnd(64, "x");
    const invitation = issueProjectInvitation(
      {
        id: "invitation-1",
        organisationId: IDS.organisation,
        projectId: IDS.project,
        email: "Expert@Example.test",
        role: "domain_expert",
        grants: ["question.answer_assigned", "execution.review_behaviour"],
        issuedAt: NOW,
        expiresAt: new Date(NOW.getTime() + 300_000),
      },
      token,
    );
    expect(invitation.tokenHash).not.toContain(token);
    const result = consumeProjectInvitation(
      invitation,
      token,
      "expert@example.test",
      IDS.user,
      IDS.membership,
      NOW,
    );
    expect(result.membership).toMatchObject({
      membershipType: "guest",
      roles: ["domain_expert"],
      status: "active",
    });
    expect(invitationState(result.invitation, NOW)).toBe("consumed");
    expect(() =>
      consumeProjectInvitation(
        result.invitation,
        token,
        "expert@example.test",
        IDS.user,
        IDS.membership,
        NOW,
      ),
    ).toThrow("invalid, expired, consumed, or revoked");
  });
});

describe("discovery and immutable evidence", () => {
  const actor = IDS.actor;

  it("opens safe human questions and blocks likely patient-identifiable prompts", () => {
    const question = createQuestion({
      id: IDS.question,
      organisationId: IDS.organisation,
      projectId: IDS.project,
      prompt: "What generic steps help prepare a new booking?",
      rationale: "Clarifies the workflow.",
      origin: "human_authored",
      authorActorId: actor,
      parentQuestionId: null,
    });
    expect(openQuestion(question, 0).status).toBe("open");
    expect(() =>
      createQuestion({
        ...question,
        prompt: "What is the patient's name and NHI?",
      }),
    ).toThrow("prohibited identifiable health information");
  });

  it("autosaves optimistically and submits corrections as new immutable responses", () => {
    const draft = autosaveResponseDraft(
      {
        questionId: IDS.question,
        membershipId: IDS.membership,
        body: "",
        lockVersion: 0,
        autosavedAt: NOW,
      },
      "A generic answer",
      0,
      NOW,
    );
    expect(draft).toMatchObject({ lockVersion: 1, body: "A generic answer" });
    expect(() => autosaveResponseDraft(draft, "stale edit", 0, NOW)).toThrow(
      "concurrently",
    );

    const prior = submitQuestionResponse({
      id: IDS.response,
      organisationId: IDS.organisation,
      projectId: IDS.project,
      questionId: IDS.question,
      respondentActorId: actor,
      body: "Use a generic service type and time preference.",
      origin: "human_authored",
      submittedAt: NOW,
      supersedesResponseId: null,
    });
    const correction = submitQuestionResponse({
      ...prior,
      id: IDS.otherResponse,
      body: "Use a generic service type, time preference, and preparation guidance.",
      supersedesResponseId: prior.id,
    });
    expect(() =>
      assertValidResponseCorrection(prior, correction),
    ).not.toThrow();
    expect(correction.contentHash.value).not.toBe(prior.contentHash.value);
  });

  it("hashes exact source fragments and links corrections by supersession", () => {
    const fragment = createSourceFragment({
      id: IDS.sourceFragment,
      organisationId: IDS.organisation,
      projectId: IDS.project,
      knowledgeSourceId: IDS.knowledgeSource,
      text: "Generic booking preparation includes clear instructions.",
      origin: "human_authored",
      supersedesSourceFragmentId: null,
      capturedAt: NOW,
    });
    const correction = createSourceFragment({
      ...fragment,
      id: IDS.otherSourceFragment,
      text: "Generic booking preparation includes clear and accessible instructions.",
      supersedesSourceFragmentId: fragment.id,
    });
    expect(correction.supersedesSourceFragmentId).toBe(fragment.id);
    expect(correction.contentHash.value).not.toBe(fragment.contentHash.value);
  });
});

describe("Agile graph and sprint", () => {
  const workItem = (
    id: typeof IDS.workItem | typeof IDS.otherWorkItem,
  ): WorkItem => ({
    id,
    organisationId: IDS.organisation,
    projectId: IDS.project,
    parentWorkItemId: null,
    kind: "user_story",
    key: id === IDS.workItem ? "SAFE-1" : "SAFE-2",
    title: "Show generic preparation guidance",
    origin: "human_authored",
    status: "proposed",
    requirementVersionIds: [IDS.artifactVersion],
    acceptanceCriterionVersionIds: [IDS.priorArtifactVersion],
    lockVersion: 0,
  });

  it("rejects dependency cycles", () => {
    const first = workItem(IDS.workItem);
    const second = workItem(IDS.otherWorkItem);
    expect(() =>
      validateWorkItemGraph(
        [first, second],
        [
          { predecessorId: first.id, successorId: second.id, type: "blocks" },
          { predecessorId: second.id, successorId: first.id, type: "blocks" },
        ],
      ),
    ).toThrow("dependency cycle");
  });

  it("requires exact requirement and acceptance versions before ready", () => {
    const accepted = transitionWorkItem(workItem(IDS.workItem), "accepted", 0);
    expect(transitionWorkItem(accepted, "ready", 1).status).toBe("ready");
    expect(() =>
      transitionWorkItem(
        { ...accepted, requirementVersionIds: [] },
        "ready",
        1,
      ),
    ).toThrow("exact requirement version");
  });

  it("plans a sprint only with a goal and selected work", () => {
    const sprint: Sprint = {
      id: asId<IterationId>("00000000-0000-7000-8000-000000000077"),
      organisationId: IDS.organisation,
      projectId: IDS.project,
      sequence: 1,
      name: "Sprint 1",
      goal: "Demonstrate generic preparation guidance",
      workItemIds: [IDS.workItem],
      state: "draft",
      lockVersion: 0,
    };
    expect(transitionSprint(sprint, "planned", 0).state).toBe("planned");
  });
});

describe("AI proposal and comparison provenance", () => {
  it("keeps AI output a proposal until a human decides it", () => {
    const output = createAiOutput({
      id: "ai-output-1",
      organisationId: IDS.organisation,
      projectId: IDS.project,
      useCase: "question_suggestion",
      provider: "fixture",
      model: "deterministic-v1",
      promptVersion: "question/v1",
      schemaVersion: "ai-output/v1",
      inputManifestHash: "a".repeat(64),
      payload: {
        prompt: "How should generic preparation guidance be presented?",
      },
    });
    expect(output.status).toBe("proposed");
    expect(
      decideAiOutput(output, "edited_and_accepted", IDS.actor),
    ).toMatchObject({
      status: "edited_and_accepted",
      decidedByActorId: IDS.actor,
    });
  });

  it("freezes comparison metrics and rejects impossible coverage", () => {
    const input = {
      id: "comparison-result-1",
      comparisonId: "comparison-1",
      arm: "platform_assisted" as const,
      fixtureHash: "a".repeat(64),
      rubricHash: "b".repeat(64),
      metrics: {
        unsupportedAssumptions: 0,
        missingRequirements: 0,
        domainQuestionsNotAsked: 0,
        missingAcceptanceCriteria: 0,
        correctionsRequested: 1,
        requirementsDiscovered: 4,
        assumptionsPrevented: 2,
        acceptanceCriterionCoverageBasisPoints: 10_000,
        traceabilityCoverageBasisPoints: 10_000,
      },
      recordedAt: NOW,
    };
    expect(createDemonstrationComparisonResult(input).resultHash.value).toMatch(
      /^[a-f0-9]{64}$/,
    );
    expect(() =>
      createDemonstrationComparisonResult({
        ...input,
        metrics: { ...input.metrics, traceabilityCoverageBasisPoints: 10_001 },
      }),
    ).toThrow("Coverage cannot exceed");
  });
});
