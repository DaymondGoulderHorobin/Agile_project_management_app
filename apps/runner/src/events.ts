import { randomUUID } from "node:crypto";

export type RunnerEventType =
  | "runner_started"
  | "agent_turn"
  | "agent_action"
  | "agent_action_denied"
  | "usage_updated"
  | "checkpoint_reached"
  | "tests_completed"
  | "work_report_generated"
  | "runner_stopped";

export type RunnerEvent = Readonly<{
  id: string;
  sequence: number;
  type: RunnerEventType;
  occurredAt: string;
  data: Readonly<Record<string, unknown>>;
}>;

const sensitive = /(token|secret|password|authorization|cookie|api[-_]?key)/iu;

export function sanitiseEventData(data: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, sensitive.test(key) ? "[REDACTED]" : typeof value === "string" ? value.replace(/(?:sk|gh[opsu])_[A-Za-z0-9_-]{12,}/gu, "[REDACTED]").slice(0, 4_000) : value]));
}

export class RunnerEventStream {
  #sequence = 0;

  public constructor(private readonly send: (event: RunnerEvent) => Promise<void>, private readonly now: () => Date = () => new Date()) {}

  public async emit(type: RunnerEventType, data: Readonly<Record<string, unknown>>): Promise<RunnerEvent> {
    const event = { id: randomUUID(), sequence: ++this.#sequence, type, occurredAt: this.now().toISOString(), data: sanitiseEventData(data) } as const;
    await this.send(event);
    return event;
  }
}
