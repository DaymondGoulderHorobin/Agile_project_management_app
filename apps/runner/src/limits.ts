import type { RunnerCapabilityScope } from "./capability.js";

export type LimitName = "turn_limit" | "task_limit" | "token_limit" | "cost_limit" | "time_limit";

export type Usage = Readonly<{ turns: number; tasks: number; tokens: number; costUsd: number; elapsedSeconds: number }>;

export class LimitReachedError extends Error {
  public constructor(public readonly limit: LimitName, public readonly usage: Usage) {
    super(limit);
    this.name = "LimitReachedError";
  }
}

export class UsageMonitor {
  #turns = 0;
  #tasks = 0;
  #tokens = 0;
  #costUsd = 0;

  public constructor(private readonly scope: RunnerCapabilityScope, private readonly startedAt: number) {}

  public add(input: Partial<Omit<Usage, "elapsedSeconds">>, now = Date.now()): Usage {
    const next = {
      turns: this.#turns + (input.turns ?? 0),
      tasks: this.#tasks + (input.tasks ?? 0),
      tokens: this.#tokens + (input.tokens ?? 0),
      costUsd: this.#costUsd + (input.costUsd ?? 0),
      elapsedSeconds: Math.max(0, (now - this.startedAt) / 1_000),
    };
    if (next.turns > this.scope.limits.turns) throw new LimitReachedError("turn_limit", next);
    if (next.tasks > this.scope.limits.tasks) throw new LimitReachedError("task_limit", next);
    if (next.tokens > this.scope.limits.tokens) throw new LimitReachedError("token_limit", next);
    if (next.costUsd > this.scope.limits.costUsd) throw new LimitReachedError("cost_limit", next);
    if (next.elapsedSeconds > this.scope.limits.timeSeconds) throw new LimitReachedError("time_limit", next);
    this.#turns = next.turns;
    this.#tasks = next.tasks;
    this.#tokens = next.tokens;
    this.#costUsd = next.costUsd;
    return next;
  }

  public current(now = Date.now()): Usage {
    return this.add({}, now);
  }
}
