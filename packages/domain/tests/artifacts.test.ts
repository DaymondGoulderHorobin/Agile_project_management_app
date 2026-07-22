import { describe, expect, it } from "vitest";

import {
  canonicalJson,
  createArtifactVersion,
  hashCanonicalJson,
  transitionArtifactState,
  validateDependencyManifest,
} from "../src/index.js";
import { IDS, NOW } from "./fixtures.js";

describe("canonical hashing", () => {
  it("sorts object keys and normalises line endings", () => {
    expect(canonicalJson({ z: "line1\r\nline2", a: 1 })).toBe(
      '{"a":1,"z":"line1\\nline2"}',
    );
    expect(hashCanonicalJson({ b: 2, a: 1 })).toBe(
      hashCanonicalJson({ a: 1, b: 2 }),
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects non-JSON number %s",
    (value) => expect(() => canonicalJson(value)).toThrow("non-finite"),
  );
});

describe("immutable artifact versions", () => {
  const base = {
    id: IDS.artifactVersion,
    artifactId: IDS.artifact,
    artifactType: "requirement" as const,
    version: 1,
    title: "Generic booking preparation",
    narrative: "The user sees generic preparation steps.",
    payload: { priority: "must", verification: "behaviour_review" } as const,
    attribution: {
      origin: "human_authored" as const,
      actorId: IDS.actor,
      aiProvenance: null,
    },
    state: "draft" as const,
    supersedesVersionId: null,
    createdAt: NOW,
    canonicalSchemaVersion: "artifact/v1",
  };

  it("creates a stable SHA-256 version and allows the general-artifact lifecycle", () => {
    const version = createArtifactVersion(base);
    expect(version.contentHash.value).toMatch(/^[a-f0-9]{64}$/);
    expect(
      transitionArtifactState(
        transitionArtifactState(version, "in_review"),
        "accepted",
      ).state,
    ).toBe("accepted");
  });

  it("does not let general artifacts enter the plan-only frozen state", () => {
    const inReview = transitionArtifactState(
      createArtifactVersion(base),
      "in_review",
    );
    expect(() => transitionArtifactState(inReview, "frozen")).toThrow(
      "Only approvable",
    );
  });

  it("requires AI provenance for both raw and human-edited AI output", () => {
    expect(() =>
      createArtifactVersion({
        ...base,
        attribution: {
          origin: "ai_generated_human_edited",
          actorId: IDS.actor,
          aiProvenance: null,
        },
      }),
    ).toThrow("AI origin must retain");
  });

  it("requires an exact, non-repeating dependency manifest", () => {
    const version = createArtifactVersion(base);
    const entry = {
      artifactVersionId: version.id,
      artifactType: version.artifactType,
      contentHash: version.contentHash,
    };
    expect(() => validateDependencyManifest([])).toThrow("cannot be empty");
    expect(() => validateDependencyManifest([entry, entry])).toThrow(
      "cannot repeat",
    );
    expect(() => validateDependencyManifest([entry])).not.toThrow();
  });
});
