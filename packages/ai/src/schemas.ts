import { z } from "zod";

export const AiOriginSchema = z.object({
  type: z.literal("ai_generated"),
  provider: z.string().min(1),
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  generatedAt: z.iso.datetime({ offset: true }),
  proposalStatus: z.literal("proposed"),
});

export const QuestionSuggestionSchema = z.object({
  text: z.string().min(10).max(500),
  whyItMatters: z.string().min(10).max(1_000),
  category: z.enum(["workflow", "constraint", "risk", "success", "exception"]),
});

export const QuestionSuggestionSetSchema = z.object({
  suggestions: z.array(QuestionSuggestionSchema).min(1).max(8),
});

export const ArtifactProposalSchema = z.object({
  kind: z.enum(["requirement", "assumption", "risk", "decision", "acceptance_criterion"]),
  title: z.string().min(3).max(180),
  statement: z.string().min(10).max(2_000),
  rationale: z.string().min(10).max(2_000),
  evidenceFragmentIds: z.array(z.uuid()).min(1),
  confidence: z.number().min(0).max(1),
});

export const ArtifactProposalSetSchema = z.object({ proposals: z.array(ArtifactProposalSchema).min(1).max(50) });

export type AiOrigin = z.infer<typeof AiOriginSchema>;
export type QuestionSuggestionSet = z.infer<typeof QuestionSuggestionSetSchema>;
export type ArtifactProposalSet = z.infer<typeof ArtifactProposalSetSchema>;
