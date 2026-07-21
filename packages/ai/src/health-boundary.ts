export const prohibitedHealthPatterns = [
  { code: "patient_name_label", expression: /\b(?:patient|client)\s*(?:full\s*)?name\s*[:=-]/iu },
  { code: "health_identifier", expression: /\b(?:NHI|national health index|medical record|MRN)\s*(?:number|no\.?|#)?\s*[:=-]?\s*[A-Z0-9-]{5,}\b/iu },
  { code: "date_of_birth", expression: /\b(?:date of birth|DOB)\s*[:=-]\s*\d{1,4}[/-]\d{1,2}[/-]\d{1,4}\b/iu },
  { code: "contact_with_clinical_context", expression: /\b(?:patient|clinical record|treatment history)[\s\S]{0,80}\b(?:email|phone|mobile|address)\s*[:=-]/iu },
  { code: "clinical_record", expression: /\b(?:clinical notes?|patient record|treatment history|radiograph|x-?ray|MRI)\s+(?:for|of)\s+[A-Z][a-z]+\s+[A-Z][a-z]+/u },
] as const;

export type ContentBoundaryAssessment = Readonly<{
  allowed: boolean;
  classification: "general_business" | "suspected_prohibited_health_information";
  reasons: readonly string[];
  guidance: string;
}>;

export function assessContentBoundary(text: string): ContentBoundaryAssessment {
  const reasons = prohibitedHealthPatterns.filter(({ expression }) => expression.test(text)).map(({ code }) => code);
  return reasons.length === 0
    ? {
        allowed: true,
        classification: "general_business",
        reasons: [],
        guidance: "Use general professional knowledge, generic workflows, non-identifiable scenarios, and domain constraints only.",
      }
    : {
        allowed: false,
        classification: "suspected_prohibited_health_information",
        reasons,
        guidance: "Do not enter identifiable patient information. Remove identifying details or use a generic scenario.",
      };
}

export class ProhibitedContentError extends Error {
  public constructor(public readonly assessment: ContentBoundaryAssessment) {
    super(assessment.guidance);
    this.name = "ProhibitedContentError";
  }
}
