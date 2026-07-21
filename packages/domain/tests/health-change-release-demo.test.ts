import { describe, expect, it } from "vitest";

import {
  TRACEWORK_DEMO_FIXTURE,
  assessProhibitedContent,
  classifyChange,
  createReleaseVersion,
  projectStateAfterAppliedChange,
  transitionProhibitedContentIncident,
  transitionRelease,
  validateDemoFixture,
  verifyRelease,
  type ChangeImpactSignals,
  type ProhibitedContentIncident,
} from "../src/index.js";
import { asId, type ProhibitedContentIncidentId } from "../src/ids.js";
import { IDS, NOW } from "./fixtures.js";

const noImpact: ChangeImpactSignals = {
  changesExternalBehaviour: false,
  changesAcceptanceCriteria: false,
  changesScope: false,
  changesSecurityPrivacyOrPermission: false,
  changesDataFlowIntegrationOrWorkflow: false,
  changesRepositoryScopeOrImportantDependency: false,
  changesImportantRiskOrAssumption: false,
  changesProjectObjectiveOrIntendedUser: false,
  changesSuccessDefinitionOrCoreSolution: false,
  changesBusinessModel: false,
  entersRegulatedActivityOrHealthData: false,
};

describe("health-data boundary", () => {
  it("allows generic workflows without claiming detection is complete", () => {
    expect(
      assessProhibitedContent(
        "Describe a generic booking workflow without any identifiable information",
      ),
    ).toMatchObject({
      classification: "general_business",
      requiresQuarantine: false,
      detectorVersion: "general-business-boundary/v1",
    });
  });

  it.each([
    "The patient's name is Sample Person",
    "Include patient email and phone",
    "Upload the patient x-ray",
    "Use their NHI in the example",
  ])(
    "blocks and quarantines a likely prohibited input without returning its content",
    (input) => {
      const assessment = assessProhibitedContent(input);
      expect(assessment).toMatchObject({
        shouldWarn: true,
        shouldBlockProviderForwarding: true,
        requiresQuarantine: true,
      });
      expect(JSON.stringify(assessment)).not.toContain(input);
    },
  );

  it("requires containment before an incident enters quarantine", () => {
    const incident: ProhibitedContentIncident = {
      id: asId<ProhibitedContentIncidentId>(
        "00000000-0000-7000-8000-000000000099",
      ),
      organisationId: IDS.organisation,
      projectId: IDS.project,
      state: "suspected",
      sourceKind: "file_upload",
      sourceRecordId: "attachment-safe-metadata-id",
      suspectedCategories: ["patient_linked_medical_image"],
      contentFingerprint: "a".repeat(64),
      externalProviderExposure: "none",
      accessRestricted: false,
      downstreamProcessingStopped: false,
      detectedAt: NOW,
      resolvedAt: null,
    };
    expect(() =>
      transitionProhibitedContentIncident(incident, "quarantined", NOW),
    ).toThrow("restrict access");
    expect(
      transitionProhibitedContentIncident(
        {
          ...incident,
          accessRestricted: true,
          downstreamProcessingStopped: true,
        },
        "quarantined",
        NOW,
      ).state,
    ).toBe("quarantined");
  });
});

describe("change control", () => {
  it.each([
    [noImpact, "minor"],
    [{ ...noImpact, changesAcceptanceCriteria: true }, "material"],
    [
      {
        ...noImpact,
        changesExternalBehaviour: true,
        entersRegulatedActivityOrHealthData: true,
      },
      "fundamental",
    ],
  ] as const)("classifies the highest matching impact", (signals, expected) => {
    expect(classifyChange(signals).classification).toBe(expected);
  });

  it("returns fundamental work to discovery", () => {
    expect(projectStateAfterAppliedChange("delivery", "fundamental")).toBe(
      "discovery",
    );
    expect(projectStateAfterAppliedChange("delivery", "material")).toBe(
      "delivery",
    );
  });
});

describe("release traceability", () => {
  const manifest = {
    requirementVersionIds: [IDS.artifactVersion],
    workItemIds: [IDS.workItem],
    executionCycleIds: [IDS.executionCycle],
    codeChangeIds: ["code-change-1"],
    testRunIds: ["test-run-1"],
    executionReviewIds: ["technical-review-1", "stakeholder-review-1"],
    approvalSnapshotIds: [IDS.approvalSnapshot],
    knownLimitations: ["Release recording does not deploy software"],
    rollbackNote:
      "Revert the pull request commit if deployment validation fails.",
  } as const;

  it("blocks missing operational evidence", () => {
    const result = verifyRelease({
      requirementsVerified: true,
      testsPassed: false,
      reviewsPassed: true,
      approvalRequestsCurrent: true,
      conditionsResolved: true,
      noOpenProhibitedContentIncident: true,
      linksTargetImmutableRecords: true,
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("Required tests are missing or failed");
  });

  it("records only a verified and snapshot-approved immutable version", () => {
    let release = createReleaseVersion({
      id: IDS.releaseVersion,
      releaseId: IDS.release,
      version: 1,
      evidenceManifest: manifest,
      canonicalSchemaVersion: "release/v1",
    });
    const verified = verifyRelease({
      requirementsVerified: true,
      testsPassed: true,
      reviewsPassed: true,
      approvalRequestsCurrent: true,
      conditionsResolved: true,
      noOpenProhibitedContentIncident: true,
      linksTargetImmutableRecords: true,
    });
    release = transitionRelease(release, "verifying", 0, null, null, NOW);
    release = transitionRelease(
      release,
      "approval_pending",
      1,
      verified,
      null,
      NOW,
    );
    release = transitionRelease(
      release,
      "approved",
      2,
      verified,
      IDS.approvalSnapshot,
      NOW,
    );
    release = transitionRelease(
      release,
      "recorded",
      3,
      verified,
      IDS.approvalSnapshot,
      NOW,
    );
    expect(release).toMatchObject({ state: "recorded", lockVersion: 4 });
    expect(() =>
      transitionRelease(
        release,
        "draft",
        4,
        verified,
        IDS.approvalSnapshot,
        NOW,
      ),
    ).toThrow("cannot transition");
  });
});

describe("canonical demonstration fixture", () => {
  it("covers DJ-01 through DJ-22, all six slices, and only safe project knowledge", () => {
    expect(() => validateDemoFixture(TRACEWORK_DEMO_FIXTURE)).not.toThrow();
    expect(
      new Set(TRACEWORK_DEMO_FIXTURE.steps.map(({ slice }) => slice)),
    ).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    expect(TRACEWORK_DEMO_FIXTURE.steps.at(-1)?.stateTransitions).toContain(
      "release:draft->verifying->approval_pending->approved->recorded",
    );
  });
});
