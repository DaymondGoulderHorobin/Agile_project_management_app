import type { RunnerCapabilityScope } from "./capability.js";
import { assertCapabilityCurrent, type CapabilityExchange } from "./capability.js";
import { RunnerEventStream } from "./events.js";
import { LimitReachedError, UsageMonitor, type Usage } from "./limits.js";
import { ScopeDeniedError, assertNetworkAllowed, assertPathAllowed, assertToolAllowed } from "./policy.js";

export type AgentAction =
  | Readonly<{ type: "turn"; summary: string; tokens: number; costUsd: number }>
  | Readonly<{ type: "file"; path: string; operation: "read" | "write" | "delete" }>
  | Readonly<{ type: "network"; url: string }>
  | Readonly<{ type: "tool"; tool: string; summary: string }>
  | Readonly<{ type: "task_completed"; summary: string }>
  | Readonly<{ type: "human_input"; question: string }>
  | Readonly<{ type: "complete"; summary: string }>;

export interface AgentAdapter {
  run(input: { objective: string; workspace: string; scope: RunnerCapabilityScope; signal: AbortSignal }): AsyncIterable<AgentAction>;
}

export interface TestRunner {
  run(command: readonly string[], workspace: string, signal: AbortSignal): Promise<{ passed: boolean; exitCode: number; summary: string }>;
}

export type RunnerStopReason = "checkpoint_reached" | "human_input_required" | "scope_violation" | "token_limit" | "cost_limit" | "turn_limit" | "task_limit" | "time_limit" | "tests_failed" | "approval_revoked" | "completed" | "runner_crash";

export type WorkReport = Readonly<{
  stopReason: RunnerStopReason;
  plainLanguageSummary: string;
  technicalSummary: string;
  changedFiles: readonly string[];
  deniedActions: readonly string[];
  tests: readonly { command: readonly string[]; passed: boolean; exitCode: number; summary: string }[];
  usage: Usage;
  complete: boolean;
}>;

export class RunnerEngine {
  public constructor(
    private readonly exchange: CapabilityExchange,
    private readonly agent: AgentAdapter,
    private readonly tests: TestRunner,
    private readonly events: RunnerEventStream,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public async execute(input: { rawCapability: string; attestation: string; objective: string; workspace: string; signal?: AbortSignal }): Promise<WorkReport> {
    const scope = await this.exchange.exchange(input.rawCapability, input.attestation);
    assertCapabilityCurrent(scope, this.now());
    if (await this.exchange.recheck(scope) !== "valid") throw new Error("Authority was revoked before execution");
    const abort = new AbortController();
    input.signal?.addEventListener("abort", () => abort.abort(input.signal?.reason), { once: true });
    const usage = new UsageMonitor(scope, this.now().getTime());
    const changedFiles = new Set<string>();
    const deniedActions: string[] = [];
    const testResults: WorkReport["tests"][number][] = [];
    let stopReason: RunnerStopReason = "completed";
    let summary = "Codex completed the approved objective.";
    await this.events.emit("runner_started", { cycleId: scope.executionCycleId, branch: scope.repository.branch, scopeHash: scope.scopeHash });
    try {
      for await (const action of this.agent.run({ objective: input.objective, workspace: input.workspace, scope, signal: abort.signal })) {
        if (await this.exchange.recheck(scope) !== "valid") {
          stopReason = "approval_revoked";
          summary = "Authority changed while Codex was working, so the runner stopped new actions.";
          break;
        }
        if (action.type === "turn") {
          const current = usage.add({ turns: 1, tokens: action.tokens, costUsd: action.costUsd }, this.now().getTime());
          await this.events.emit("agent_turn", { summary: action.summary });
          await this.events.emit("usage_updated", current);
        } else if (action.type === "file") {
          const path = await assertPathAllowed(input.workspace, action.path, scope.permittedPaths);
          if (action.operation !== "read") changedFiles.add(action.path);
          await this.events.emit("agent_action", { kind: "file", path: action.path, operation: action.operation, resolvedWithinWorkspace: path.startsWith(input.workspace) });
        } else if (action.type === "network") {
          assertNetworkAllowed(action.url, scope.networkDestinations);
          await this.events.emit("agent_action", { kind: "network", host: new URL(action.url).host });
        } else if (action.type === "tool") {
          assertToolAllowed(action.tool, scope);
          await this.events.emit("agent_action", { kind: "tool", tool: action.tool, summary: action.summary });
        } else if (action.type === "task_completed") {
          const current = usage.add({ tasks: 1 }, this.now().getTime());
          await this.events.emit("usage_updated", current);
          if (current.tasks >= scope.checkpointAfterTasks) {
            stopReason = "checkpoint_reached";
            summary = "Codex reached the approved checkpoint and stopped for human review.";
            await this.events.emit("checkpoint_reached", { completedTasks: current.tasks });
            break;
          }
        } else if (action.type === "human_input") {
          stopReason = "human_input_required";
          summary = action.question;
          await this.events.emit("checkpoint_reached", { reason: "human_input_required", question: action.question });
          break;
        } else if (action.type === "complete") {
          summary = action.summary;
        }
      }
    } catch (error) {
      if (error instanceof ScopeDeniedError) {
        stopReason = "scope_violation";
        deniedActions.push(`${error.reason}:${error.safeTarget}`);
        summary = "Codex attempted an action outside the approved scope. The action was denied and work stopped for review.";
        await this.events.emit("agent_action_denied", { reason: error.reason, target: error.safeTarget });
      } else if (error instanceof LimitReachedError) {
        stopReason = error.limit;
        summary = `Codex reached the approved ${error.limit.replace("_", " ")} and stopped cleanly.`;
      } else {
        stopReason = "runner_crash";
        summary = "The runner stopped unexpectedly. Its workspace must be reconciled before Codex can run again.";
      }
    }

    if (!["approval_revoked", "scope_violation", "runner_crash"].includes(stopReason)) {
      for (const command of scope.testCommands) {
        const result = await this.tests.run(command, input.workspace, abort.signal);
        testResults.push({ command, ...result });
      }
      await this.events.emit("tests_completed", { passed: testResults.every(({ passed }) => passed), count: testResults.length });
      if (testResults.some(({ passed }) => !passed)) {
        stopReason = "tests_failed";
        summary = "Codex preserved its changes, but one or more required tests failed. Human review is required.";
      }
    }
    const report: WorkReport = {
      stopReason,
      plainLanguageSummary: summary,
      technicalSummary: `${changedFiles.size} changed file(s), ${testResults.length} test command(s), ${deniedActions.length} denied action(s).`,
      changedFiles: [...changedFiles].toSorted(),
      deniedActions,
      tests: testResults,
      usage: usage.current(this.now().getTime()),
      complete: stopReason === "completed" && testResults.every(({ passed }) => passed),
    };
    await this.events.emit("work_report_generated", { stopReason: report.stopReason, complete: report.complete, changedFileCount: report.changedFiles.length });
    await this.exchange.revoke(scope);
    await this.events.emit("runner_stopped", { stopReason: report.stopReason });
    return report;
  }
}
