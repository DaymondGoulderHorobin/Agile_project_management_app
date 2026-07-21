import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { FixtureAiProvider, ProhibitedContentError, assessContentBoundary } from "../src/index.js";

describe("health-data boundary", () => {
  it.each([
    "Patient name: Jane Example",
    "NHI number ABC1234",
    "DOB: 12/03/1982",
    "Clinical notes for Jane Example",
  ])("blocks suspected identifiable health content before generation: %s", (content) => {
    expect(assessContentBoundary(content)).toMatchObject({ allowed: false, classification: "suspected_prohibited_health_information" });
  });

  it("permits generic business and professional knowledge", () => {
    expect(assessContentBoundary("A practice needs a generic workflow for resolving double-booked appointment times.").allowed).toBe(true);
  });
});

describe("deterministic AI fixture", () => {
  it("labels every output as an AI proposal", async () => {
    const result = await new FixtureAiProvider().suggestQuestions("Improve a generic appointment booking workflow", []);
    expect(result.origin).toMatchObject({ type: "ai_generated", proposalStatus: "proposed", provider: "fixture" });
    expect(result.value.suggestions.every((suggestion) => suggestion.whyItMatters.length > 0)).toBe(true);
  });

  it("links every artifact proposal to immutable evidence identifiers", async () => {
    const evidenceId = randomUUID();
    const result = await new FixtureAiProvider().extractArtifacts([{ id: evidenceId, text: "Two people may choose the same open time before either confirms." }]);
    expect(result.value.proposals.every((proposal) => proposal.evidenceFragmentIds.includes(evidenceId))).toBe(true);
  });

  it("never forwards blocked content through the fixture provider", async () => {
    await expect(new FixtureAiProvider().suggestQuestions("Patient name: Jane Example", [])).rejects.toBeInstanceOf(ProhibitedContentError);
  });
});
