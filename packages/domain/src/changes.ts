import { DomainError, invariant } from "./errors.js";
import type { ChangeProposalId, OrganisationId, ProjectId } from "./ids.js";
import type {
  ChangeClass,
  ChangeProposalState,
  ProjectWorkflowState,
} from "./types.js";

export interface ChangeImpactSignals {
  readonly changesExternalBehaviour: boolean;
  readonly changesAcceptanceCriteria: boolean;
  readonly changesScope: boolean;
  readonly changesSecurityPrivacyOrPermission: boolean;
  readonly changesDataFlowIntegrationOrWorkflow: boolean;
  readonly changesRepositoryScopeOrImportantDependency: boolean;
  readonly changesImportantRiskOrAssumption: boolean;
  readonly changesProjectObjectiveOrIntendedUser: boolean;
  readonly changesSuccessDefinitionOrCoreSolution: boolean;
  readonly changesBusinessModel: boolean;
  readonly entersRegulatedActivityOrHealthData: boolean;
}

export interface ChangeClassification {
  readonly classification: ChangeClass;
  readonly matchedReasons: readonly string[];
}

export function classifyChange(
  signals: ChangeImpactSignals,
): ChangeClassification {
  const fundamentalReasons: string[] = [];
  if (signals.changesProjectObjectiveOrIntendedUser)
    fundamentalReasons.push("project objective or intended user changes");
  if (signals.changesSuccessDefinitionOrCoreSolution)
    fundamentalReasons.push("success definition or core solution changes");
  if (signals.changesBusinessModel)
    fundamentalReasons.push("business model changes");
  if (signals.entersRegulatedActivityOrHealthData)
    fundamentalReasons.push(
      "enters regulated activity or intentional health-data storage",
    );
  if (fundamentalReasons.length > 0) {
    return {
      classification: "fundamental",
      matchedReasons: fundamentalReasons,
    };
  }

  const materialReasons: string[] = [];
  if (signals.changesExternalBehaviour)
    materialReasons.push("external behaviour changes");
  if (signals.changesAcceptanceCriteria)
    materialReasons.push("acceptance criteria change");
  if (signals.changesScope) materialReasons.push("delivery scope changes");
  if (signals.changesSecurityPrivacyOrPermission)
    materialReasons.push("security, privacy, or permission implication");
  if (signals.changesDataFlowIntegrationOrWorkflow)
    materialReasons.push("data flow, integration, or workflow changes");
  if (signals.changesRepositoryScopeOrImportantDependency)
    materialReasons.push("repository scope or important dependency changes");
  if (signals.changesImportantRiskOrAssumption)
    materialReasons.push("important risk or assumption changes");
  return materialReasons.length > 0
    ? { classification: "material", matchedReasons: materialReasons }
    : {
        classification: "minor",
        matchedReasons: ["no material or fundamental signal matched"],
      };
}

export interface ChangeProposal {
  readonly id: ChangeProposalId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly state: ChangeProposalState;
  readonly suggestedClassification: ChangeClass | null;
  readonly confirmedClassification: ChangeClass | null;
  readonly classificationRationale: string | null;
  readonly lockVersion: number;
}

const CHANGE_TRANSITIONS: Readonly<
  Record<ChangeProposalState, readonly ChangeProposalState[]>
> = {
  proposed: ["classified"],
  classified: ["impact_assessed"],
  impact_assessed: ["approved", "rejected"],
  approved: ["applying"],
  rejected: [],
  applying: ["applied", "recovery_required"],
  applied: [],
  recovery_required: [],
};

export function transitionChangeProposal(
  proposal: ChangeProposal,
  next: ChangeProposalState,
  expectedLockVersion: number,
  confirmation?: {
    readonly classification: ChangeClass;
    readonly rationale: string;
  },
): ChangeProposal {
  if (proposal.lockVersion !== expectedLockVersion) {
    throw new DomainError(
      "STALE_VERSION",
      "Change proposal was concurrently updated",
    );
  }
  if (!CHANGE_TRANSITIONS[proposal.state].includes(next)) {
    throw new DomainError(
      "INVALID_TRANSITION",
      `${proposal.state} cannot transition to ${next}`,
    );
  }
  if (next === "classified") {
    invariant(
      confirmation !== undefined,
      "An authorised human must confirm classification",
    );
    invariant(
      confirmation.rationale.trim().length > 0,
      "Classification rationale is required",
    );
  }
  return Object.freeze({
    ...proposal,
    state: next,
    confirmedClassification:
      confirmation?.classification ?? proposal.confirmedClassification,
    classificationRationale:
      confirmation?.rationale ?? proposal.classificationRationale,
    lockVersion: proposal.lockVersion + 1,
  });
}

export function projectStateAfterAppliedChange(
  currentState: ProjectWorkflowState,
  classification: ChangeClass,
): ProjectWorkflowState {
  return classification === "fundamental" ? "discovery" : currentState;
}
