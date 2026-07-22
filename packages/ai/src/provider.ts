import OpenAI from "openai";
import { z, type ZodType } from "zod";
import { assessContentBoundary, ProhibitedContentError } from "./health-boundary.js";
import {
  ArtifactProposalSetSchema,
  QuestionSuggestionSetSchema,
  type AiOrigin,
  type ArtifactProposalSet,
  type QuestionSuggestionSet,
} from "./schemas.js";
import { artifactExtractionPrompt, promptVersions, questionSuggestionPrompt } from "./prompts.js";

export type Generated<T> = Readonly<{ value: T; origin: AiOrigin; providerResponseId: string | null }>;

export interface AiProvider {
  suggestQuestions(problem: string, existingQuestions: readonly string[]): Promise<Generated<QuestionSuggestionSet>>;
  extractArtifacts(evidence: readonly { id: string; text: string }[]): Promise<Generated<ArtifactProposalSet>>;
}

export class OpenAiResponsesProvider implements AiProvider {
  readonly #client: OpenAI;

  public constructor(private readonly model: string, apiKey?: string) {
    this.#client = new OpenAI({ apiKey });
  }

  async #generate<T>(schema: ZodType<T>, schemaName: string, promptVersion: string, prompt: string): Promise<Generated<T>> {
    const assessment = assessContentBoundary(prompt);
    if (!assessment.allowed) throw new ProhibitedContentError(assessment);
    const response = await this.#client.responses.create({
      model: this.model,
      input: prompt,
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema: z.toJSONSchema(schema),
        },
      },
    });
    const value = schema.parse(JSON.parse(response.output_text));
    return {
      value,
      providerResponseId: response.id,
      origin: {
        type: "ai_generated",
        provider: "openai",
        model: this.model,
        promptVersion,
        generatedAt: new Date().toISOString(),
        proposalStatus: "proposed",
      },
    };
  }

  public suggestQuestions(problem: string, existingQuestions: readonly string[]): Promise<Generated<QuestionSuggestionSet>> {
    return this.#generate(QuestionSuggestionSetSchema, "question_suggestions", promptVersions.questionSuggestions, questionSuggestionPrompt(problem, existingQuestions));
  }

  public extractArtifacts(evidence: readonly { id: string; text: string }[]): Promise<Generated<ArtifactProposalSet>> {
    return this.#generate(ArtifactProposalSetSchema, "artifact_proposals", promptVersions.artifactExtraction, artifactExtractionPrompt(evidence));
  }
}

export class FixtureAiProvider implements AiProvider {
  readonly #now: () => Date;

  public constructor(now: () => Date = () => new Date("2026-07-22T00:00:00.000Z")) {
    this.#now = now;
  }

  #origin(promptVersion: string): AiOrigin {
    return { type: "ai_generated", provider: "fixture", model: "deterministic-v1", promptVersion, generatedAt: this.#now().toISOString(), proposalStatus: "proposed" };
  }

  public async suggestQuestions(problem: string, existingQuestions: readonly string[]): Promise<Generated<QuestionSuggestionSet>> {
    const assessment = assessContentBoundary([problem, ...existingQuestions].join("\n"));
    if (!assessment.allowed) throw new ProhibitedContentError(assessment);
    return {
      providerResponseId: null,
      origin: this.#origin(promptVersions.questionSuggestions),
      value: {
        suggestions: [
          { text: "What should happen when an appointment time becomes unavailable while someone is booking?", whyItMatters: "This defines a common conflict path and prevents two people being promised the same time.", category: "exception" },
          { text: "Which details are genuinely needed to confirm a booking without collecting clinical information?", whyItMatters: "This keeps the workflow useful while preserving the product's no-identifiable-health-information boundary.", category: "constraint" },
          { text: "How will the practice know the first version has improved the booking process?", whyItMatters: "A measurable outcome lets the team verify that the product solved the original business problem.", category: "success" },
        ],
      },
    };
  }

  public async extractArtifacts(evidence: readonly { id: string; text: string }[]): Promise<Generated<ArtifactProposalSet>> {
    const assessment = assessContentBoundary(evidence.map(({ text }) => text).join("\n"));
    if (!assessment.allowed) throw new ProhibitedContentError(assessment);
    const first = evidence[0];
    if (!first) throw new Error("At least one evidence fragment is required");
    return {
      providerResponseId: null,
      origin: this.#origin(promptVersions.artifactExtraction),
      value: {
        proposals: [
          { kind: "requirement", title: "Prevent double booking", statement: "The system must confirm that a selected appointment remains available before finalising the booking.", rationale: "The expert identified concurrent booking as a costly exception.", evidenceFragmentIds: [first.id], confidence: 0.91 },
          { kind: "acceptance_criterion", title: "Unavailable slot response", statement: "Given a slot was taken after selection, when confirmation is attempted, then the user sees a plain-language conflict and can choose another slot.", rationale: "Makes the concurrency requirement testable.", evidenceFragmentIds: [first.id], confidence: 0.88 },
        ],
      },
    };
  }
}
