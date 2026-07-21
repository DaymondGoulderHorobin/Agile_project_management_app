import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  RunnerEngine,
  RunnerEventStream,
  ScopeDeniedError,
  assertNetworkAllowed,
  assertPathAllowed,
  type AgentAdapter,
  type CapabilityExchange,
  type RunnerCapabilityScope,
  type RunnerEvent,
  type TestRunner,
} from "../src/index.js";

function scope(overrides: Partial<RunnerCapabilityScope> = {}): RunnerCapabilityScope {
  return {
    capabilityGrantId: randomUUID(), organisationId: randomUUID(), executionCycleId: randomUUID(), runnerEnvironmentId: randomUUID(),
    repository: { provider: "github", owner: "tracework", name: "demo", approvedCommit: "a".repeat(40), branch: "codex/demo" },
    permittedPaths: ["src", "tests"], networkDestinations: ["https://api.openai.com/v1/"], tools: ["read", "write", "test"], secretNames: [],
    testCommands: [["pnpm", "test"]], checkpointAfterTasks: 1,
    limits: { turns: 4, tasks: 2, tokens: 2_000, costUsd: 1, timeSeconds: 300 },
    issuedAt: "2026-07-22T00:00:00.000Z", expiresAt: "2026-07-22T01:00:00.000Z", scopeHash: "b".repeat(64), ...overrides,
  };
}

describe("filesystem and network policy", () => {
  it("allows only resolved paths below approved roots and rejects symlink escapes", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "tracework-runner-"));
    await mkdir(join(workspace, "src"));
    await writeFile(join(workspace, "src", "ok.ts"), "export {};");
    expect(await assertPathAllowed(workspace, "src/ok.ts", ["src"])).toContain("ok.ts");
    const outside = await mkdtemp(join(tmpdir(), "tracework-outside-"));
    await symlink(outside, join(workspace, "src", "escape"), "junction");
    await expect(assertPathAllowed(workspace, "src/escape/secret.txt", ["src"])).rejects.toBeInstanceOf(ScopeDeniedError);
  });

  it("denies HTTP, alternate hosts, and prefix-confusion URLs", () => {
    expect(assertNetworkAllowed("https://api.openai.com/v1/responses", ["https://api.openai.com/v1/"]).hostname).toBe("api.openai.com");
    expect(() => assertNetworkAllowed("http://api.openai.com/v1/responses", ["https://api.openai.com/v1/"])).toThrow(ScopeDeniedError);
    expect(() => assertNetworkAllowed("https://api.openai.com.evil.test/v1/", ["https://api.openai.com/v1/"])).toThrow(ScopeDeniedError);
  });
});

describe("controlled execution", () => {
  it("stops at a configured checkpoint, runs tests, revokes authority, and never marks the cycle complete", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "tracework-engine-"));
    await mkdir(join(workspace, "src"));
    const capability = scope();
    const calls: string[] = [];
    const exchange: CapabilityExchange = {
      async exchange() { calls.push("exchange"); return capability; },
      async recheck() { calls.push("recheck"); return "valid"; },
      async revoke() { calls.push("revoke"); },
    };
    const agent: AgentAdapter = {
      async *run() {
        yield { type: "turn", summary: "Implement validation", tokens: 200, costUsd: 0.02 };
        yield { type: "file", path: "src/validation.ts", operation: "write" };
        yield { type: "task_completed", summary: "Validation implemented" };
        yield { type: "complete", summary: "This must not run beyond the checkpoint" };
      },
    };
    const tests: TestRunner = { async run() { return { passed: true, exitCode: 0, summary: "1 test passed" }; } };
    const events: RunnerEvent[] = [];
    const engine = new RunnerEngine(exchange, agent, tests, new RunnerEventStream(async (event) => { events.push(event); }), () => new Date("2026-07-22T00:01:00.000Z"));
    const report = await engine.execute({ rawCapability: "opaque", attestation: "fixture", objective: "Demo", workspace });
    expect(report).toMatchObject({ stopReason: "checkpoint_reached", complete: false, changedFiles: ["src/validation.ts"] });
    expect(report.tests).toHaveLength(1);
    expect(calls.at(-1)).toBe("revoke");
    expect(events.map(({ type }) => type)).toContain("checkpoint_reached");
  });

  it("denies a blocked file before the adapter can treat it as changed", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "tracework-engine-"));
    await mkdir(join(workspace, "src"));
    const capability = scope();
    const exchange: CapabilityExchange = { async exchange() { return capability; }, async recheck() { return "valid"; }, async revoke() {} };
    const agent: AgentAdapter = { async *run() { yield { type: "file", path: ".env", operation: "read" }; } };
    const tests: TestRunner = { async run() { throw new Error("tests must not run after scope violation"); } };
    const report = await new RunnerEngine(exchange, agent, tests, new RunnerEventStream(async () => {}), () => new Date("2026-07-22T00:01:00Z")).execute({ rawCapability: "opaque", attestation: "fixture", objective: "Demo", workspace });
    expect(report).toMatchObject({ stopReason: "scope_violation", complete: false, changedFiles: [] });
  });
});
