import { DomainError, invariant } from "./errors.js";
import type {
  ArtifactVersionId,
  IterationId,
  OrganisationId,
  ProjectId,
  WorkItemId,
} from "./ids.js";
import type { Origin, WorkItemKind } from "./types.js";

export interface WorkItem {
  readonly id: WorkItemId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly parentWorkItemId: WorkItemId | null;
  readonly kind: WorkItemKind;
  readonly key: string;
  readonly title: string;
  readonly origin: Origin;
  readonly status:
    "proposed" | "accepted" | "ready" | "in_progress" | "done" | "rejected";
  readonly requirementVersionIds: readonly ArtifactVersionId[];
  readonly acceptanceCriterionVersionIds: readonly ArtifactVersionId[];
  readonly lockVersion: number;
}

export interface WorkItemDependency {
  readonly predecessorId: WorkItemId;
  readonly successorId: WorkItemId;
  readonly type: "blocks" | "depends_on" | "relates_to";
}

export function validateWorkItemGraph(
  items: readonly WorkItem[],
  dependencies: readonly WorkItemDependency[],
): void {
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const item of items) {
    if (item.parentWorkItemId !== null) {
      const parent = byId.get(item.parentWorkItemId);
      invariant(parent !== undefined, `Parent for ${item.key} was not found`);
      invariant(
        parent.projectId === item.projectId,
        "Work-item parent must share project",
      );
    }
  }
  const edges = dependencies.filter(({ type }) => type !== "relates_to");
  const outgoing = new Map<WorkItemId, WorkItemId[]>();
  for (const edge of edges) {
    invariant(
      edge.predecessorId !== edge.successorId,
      "Work item cannot depend on itself",
    );
    invariant(
      byId.has(edge.predecessorId) && byId.has(edge.successorId),
      "Dependency target missing",
    );
    const list = outgoing.get(edge.predecessorId) ?? [];
    list.push(edge.successorId);
    outgoing.set(edge.predecessorId, list);
  }
  const visiting = new Set<WorkItemId>();
  const visited = new Set<WorkItemId>();
  const walk = (current: WorkItemId): void => {
    if (visiting.has(current))
      throw new DomainError(
        "INVARIANT_VIOLATION",
        "Work-item dependency cycle",
      );
    if (visited.has(current)) return;
    visiting.add(current);
    for (const next of outgoing.get(current) ?? []) walk(next);
    visiting.delete(current);
    visited.add(current);
  };
  for (const item of items) walk(item.id);
}

export function transitionWorkItem(
  item: WorkItem,
  next: WorkItem["status"],
  expectedLockVersion: number,
): WorkItem {
  if (item.lockVersion !== expectedLockVersion) {
    throw new DomainError(
      "STALE_VERSION",
      "Work item was concurrently changed",
    );
  }
  const transitions: Readonly<
    Record<WorkItem["status"], readonly WorkItem["status"][]>
  > = {
    proposed: ["accepted", "rejected"],
    accepted: ["ready"],
    ready: ["in_progress"],
    in_progress: ["done", "ready"],
    done: [],
    rejected: [],
  };
  if (!transitions[item.status].includes(next)) {
    throw new DomainError(
      "INVALID_TRANSITION",
      `${item.status} cannot transition to ${next}`,
    );
  }
  if (next === "ready") {
    invariant(
      item.requirementVersionIds.length > 0,
      "Ready work needs an exact requirement version",
    );
    invariant(
      item.acceptanceCriterionVersionIds.length > 0,
      "Ready work needs an exact acceptance-criterion version",
    );
  }
  return Object.freeze({
    ...item,
    status: next,
    lockVersion: item.lockVersion + 1,
  });
}

export interface Sprint {
  readonly id: IterationId;
  readonly organisationId: OrganisationId;
  readonly projectId: ProjectId;
  readonly sequence: number;
  readonly name: string;
  readonly goal: string;
  readonly workItemIds: readonly WorkItemId[];
  readonly state:
    "draft" | "planned" | "ready" | "approval_pending" | "approved";
  readonly lockVersion: number;
}

export function transitionSprint(
  sprint: Sprint,
  next: Sprint["state"],
  expectedLockVersion: number,
): Sprint {
  if (sprint.lockVersion !== expectedLockVersion) {
    throw new DomainError("STALE_VERSION", "Sprint was concurrently changed");
  }
  const transitions: Readonly<
    Record<Sprint["state"], readonly Sprint["state"][]>
  > = {
    draft: ["planned"],
    planned: ["ready"],
    ready: ["approval_pending"],
    approval_pending: ["approved"],
    approved: [],
  };
  if (!transitions[sprint.state].includes(next)) {
    throw new DomainError(
      "INVALID_TRANSITION",
      `${sprint.state} cannot transition to ${next}`,
    );
  }
  if (next === "planned") {
    invariant(sprint.goal.trim().length > 0, "Sprint goal is required");
    invariant(sprint.workItemIds.length > 0, "Sprint needs selected work");
  }
  return Object.freeze({
    ...sprint,
    state: next,
    lockVersion: sprint.lockVersion + 1,
  });
}
