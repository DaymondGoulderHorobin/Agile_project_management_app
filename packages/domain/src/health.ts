import { DomainError, invariant } from "./errors.js";
import { sha256 } from "./hash.js";
import type {
  OrganisationId,
  ProhibitedContentIncidentId,
  ProjectId,
} from "./ids.js";
import type { DataClassification, IncidentState } from "./types.js";

export const SUPPORTED_INFORMATION_CATEGORIES = [
  "general_professional_knowledge",
  "business_process",
  "generic_workflow",
  "product_requirement",
  "generic_example",
  "non_identifiable_scenario",
  "design_feedback",
  "domain_constraint",
] as const;

export const PROHIBITED_INFORMATION_CATEGORIES = [
  "patient_name",
  "patient_contact_information",
  "identifiable_treatment_history",
  "clinical_record",
  "patient_linked_medical_image",
  "identifiable_health_information",
] as const;
export type ProhibitedInformationCategory =
  (typeof PROHIBITED_INFORMATION_CATEGORIES)[number];

export interface ContentSafetyAssessment {
  readonly classification: DataClassification;
  readonly suspectedCategories: readonly ProhibitedInformationCategory[];
  readonly shouldWarn: boolean;
  readonly shouldBlockProviderForwarding: boolean;
  readonly requiresQuarantine: boolean;
  readonly detectorVersion: string;
}

const SIGNALS: readonly {
  readonly category: ProhibitedInformationCategory;
  readonly pattern: RegExp;
}[] = [
  { category: "patient_name", pattern: /\bpatient(?:'s)?\s+(?:name|named)\b/i },
  {
    category: "patient_contact_information",
    pattern: /\bpatient(?:'s)?\s+(?:email|phone|address|contact)\b/i,
  },
  {
    category: "identifiable_treatment_history",
    pattern: /\b(?:treatment|appointment|diagnosis)\s+(?:history|record)\b/i,
  },
  {
    category: "clinical_record",
    pattern: /\b(?:clinical|medical|health)\s+record\b/i,
  },
  {
    category: "patient_linked_medical_image",
    pattern: /\b(?:patient|client)[-_ ]?(?:x-?ray|scan|image|mri)\b/i,
  },
  {
    category: "identifiable_health_information",
    pattern: /\b(?:nhi|national health index|date of birth|dob)\b/i,
  },
] as const;

/**
 * A conservative safety aid, not a guarantee that content is non-identifiable.
 * The input is evaluated in memory and never included in the returned value.
 */
export function assessProhibitedContent(text: string): ContentSafetyAssessment {
  const suspectedCategories = SIGNALS.filter(({ pattern }) =>
    pattern.test(text),
  ).map(({ category }) => category);
  const suspected = suspectedCategories.length > 0;
  return Object.freeze({
    classification: "general_business",
    suspectedCategories,
    shouldWarn: suspected,
    shouldBlockProviderForwarding: suspected,
    requiresQuarantine: suspected,
    detectorVersion: "general-business-boundary/v1",
  });
}

export interface ProhibitedContentIncident {
  readonly id: ProhibitedContentIncidentId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly state: IncidentState;
  readonly sourceKind: "text_input" | "file_upload" | "import" | "integration";
  readonly sourceRecordId: string;
  readonly suspectedCategories: readonly ProhibitedInformationCategory[];
  readonly contentFingerprint: string;
  readonly externalProviderExposure:
    "none" | "possible" | "confirmed" | "unknown";
  readonly accessRestricted: boolean;
  readonly downstreamProcessingStopped: boolean;
  readonly detectedAt: Date;
  readonly resolvedAt: Date | null;
}

export function contentFingerprint(content: Uint8Array | string): string {
  return sha256(content);
}

const INCIDENT_TRANSITIONS: Readonly<
  Record<IncidentState, readonly IncidentState[]>
> = {
  suspected: ["quarantined"],
  quarantined: ["assessing"],
  assessing: ["remediating", "resolved"],
  remediating: ["resolved"],
  resolved: [],
};

export function transitionProhibitedContentIncident(
  incident: ProhibitedContentIncident,
  next: IncidentState,
  now: Date,
): ProhibitedContentIncident {
  if (!INCIDENT_TRANSITIONS[incident.state].includes(next)) {
    throw new DomainError(
      "INVALID_TRANSITION",
      `${incident.state} cannot transition to ${next}`,
    );
  }
  if (next === "quarantined") {
    invariant(incident.accessRestricted, "Quarantine must restrict access");
    invariant(
      incident.downstreamProcessingStopped,
      "Quarantine must stop downstream processing",
    );
  }
  return Object.freeze({
    ...incident,
    state: next,
    resolvedAt: next === "resolved" ? new Date(now) : null,
  });
}

export const HEALTHCARE_BOUNDARY_NOTICE =
  "Do not enter patient names, contact details, clinical records, treatment histories, patient-linked images, or other identifiable health information. Use generic, non-identifiable examples only.";
