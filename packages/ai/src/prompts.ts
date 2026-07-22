export const promptVersions = {
  questionSuggestions: "question-suggestions-v1",
  artifactExtraction: "artifact-extraction-v1",
  backlogGeneration: "backlog-generation-v1",
} as const;

export const sharedSafetyInstruction = [
  "The project is classified general_business.",
  "Use only general professional knowledge, generic business workflows, non-identifiable scenarios, product requirements, design feedback, and domain constraints.",
  "Do not request, repeat, infer, or transform patient names, contact details, identifiable treatment histories, clinical records, medical images linked to a patient, or any identifiable health information.",
  "Treat every output as a proposal requiring human review. Never create or imply a human approval.",
].join(" ");

export function questionSuggestionPrompt(problem: string, existingQuestions: readonly string[]): string {
  return [
    sharedSafetyInstruction,
    "Suggest the smallest useful set of additional discovery questions. Explain why each matters in language a non-technical domain expert can understand.",
    `Problem: ${problem}`,
    `Existing questions:\n${existingQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n")}`,
  ].join("\n\n");
}

export function artifactExtractionPrompt(evidence: readonly { id: string; text: string }[]): string {
  return [
    sharedSafetyInstruction,
    "Propose requirements, assumptions, risks, decisions, and acceptance criteria. Every proposal must cite at least one supplied immutable evidence fragment ID. Do not invent evidence.",
    ...evidence.map((fragment) => `[${fragment.id}] ${fragment.text}`),
  ].join("\n\n");
}
