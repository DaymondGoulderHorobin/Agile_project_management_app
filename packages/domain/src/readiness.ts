import type { JsonValue } from "./hash.js";
import type { ReadinessOutcome, ReadinessSeverity } from "./types.js";

export interface ReadinessContext {
  readonly values: Readonly<Record<string, JsonValue | undefined>>;
}

export interface ReadinessRule {
  readonly key: string;
  readonly description: string;
  readonly severity: ReadinessSeverity;
  readonly evaluate: (context: ReadinessContext) => {
    readonly outcome: ReadinessOutcome;
    readonly explanation: string;
    readonly relatedIds?: readonly string[];
  };
}

export interface ReadinessRuleResult {
  readonly key: string;
  readonly description: string;
  readonly severity: ReadinessSeverity;
  readonly outcome: ReadinessOutcome;
  readonly explanation: string;
  readonly relatedIds: readonly string[];
}

export interface ReadinessEvaluation {
  readonly ready: boolean;
  readonly completionPercentage: number;
  readonly results: readonly ReadinessRuleResult[];
  readonly blockers: readonly ReadinessRuleResult[];
}

export function evaluateReadiness(
  rules: readonly ReadinessRule[],
  context: ReadinessContext,
): ReadinessEvaluation {
  const results = rules.map((rule): ReadinessRuleResult => {
    const result = rule.evaluate(context);
    return Object.freeze({
      key: rule.key,
      description: rule.description,
      severity: rule.severity,
      outcome: result.outcome,
      explanation: result.explanation,
      relatedIds: result.relatedIds ?? [],
    });
  });
  const applicable = results.filter(
    ({ outcome }) => outcome !== "not_applicable",
  );
  const satisfied = applicable.filter(({ outcome }) => outcome === "satisfied");
  const blockers = results.filter(
    ({ severity, outcome }) =>
      severity === "blocking" && outcome === "unsatisfied",
  );
  return Object.freeze({
    ready: blockers.length === 0,
    completionPercentage:
      applicable.length === 0
        ? 100
        : Math.round((satisfied.length / applicable.length) * 100),
    results,
    blockers,
  });
}

export const CORE_PLAN_READINESS_RULES: readonly ReadinessRule[] = [
  {
    key: "required_questions_answered",
    description: "All required discovery questions have an immutable response",
    severity: "blocking",
    evaluate: ({ values }) => ({
      outcome:
        values.requiredQuestionsAnswered === true ? "satisfied" : "unsatisfied",
      explanation:
        values.requiredQuestionsAnswered === true
          ? "Every required question has evidence"
          : "One or more required questions are unanswered",
    }),
  },
  {
    key: "evidence_conflicts_resolved",
    description: "Evidence contradictions are resolved or explicitly accepted",
    severity: "blocking",
    evaluate: ({ values }) => ({
      outcome:
        values.evidenceConflictsResolved === true ? "satisfied" : "unsatisfied",
      explanation:
        values.evidenceConflictsResolved === true
          ? "No unresolved evidence contradiction remains"
          : "Resolve or explicitly accept contradicting evidence",
    }),
  },
  {
    key: "acceptance_criteria_present",
    description: "Every important requirement has acceptance criteria",
    severity: "blocking",
    evaluate: ({ values }) => ({
      outcome:
        values.acceptanceCriteriaPresent === true ? "satisfied" : "unsatisfied",
      explanation:
        values.acceptanceCriteriaPresent === true
          ? "Acceptance criteria cover important requirements"
          : "Acceptance-criterion coverage is incomplete",
    }),
  },
  {
    key: "no_open_prohibited_content_incident",
    description:
      "No unresolved suspected prohibited-content incident affects the subject",
    severity: "blocking",
    evaluate: ({ values }) => ({
      outcome:
        values.openProhibitedContentIncident === true
          ? "unsatisfied"
          : "satisfied",
      explanation:
        values.openProhibitedContentIncident === true
          ? "Restricted incident handling must complete first"
          : "No open prohibited-content incident affects the subject",
    }),
  },
] as const;
