import { z } from "zod";

import {
  CommandContextSchema,
  IsoDateTimeSchema,
  OriginSchema,
} from "./common.js";
import {
  ArtifactVersionIdSchema,
  IterationIdSchema,
  ProjectIdSchema,
  ProjectMembershipIdSchema,
  WorkItemIdSchema,
} from "./ids.js";

export const WorkItemKindSchema = z.enum([
  "epic",
  "user_story",
  "task",
  "bug",
  "spike",
  "review",
  "test",
  "documentation",
]);
export const WorkItemStatusSchema = z.enum([
  "proposed",
  "accepted",
  "ready",
  "in_progress",
  "blocked",
  "done",
  "cancelled",
]);
export const IterationStateSchema = z.enum([
  "draft",
  "planned",
  "approval_pending",
  "approved",
  "ready",
  "active",
  "completed",
  "cancelled",
]);

export const WorkItemSchema = z.object({
  id: WorkItemIdSchema,
  projectId: ProjectIdSchema,
  parentWorkItemId: WorkItemIdSchema.nullable(),
  key: z.string().min(2).max(40),
  kind: WorkItemKindSchema,
  title: z.string().min(1).max(240),
  description: z.string().max(50_000),
  status: WorkItemStatusSchema,
  priority: z.enum(["critical", "high", "medium", "low"]),
  orderKey: z.string().min(1).max(120),
  origin: OriginSchema,
  assigneeMembershipIds: z.array(ProjectMembershipIdSchema),
  requirementVersionIds: z.array(ArtifactVersionIdSchema),
  acceptanceCriterionVersionIds: z.array(ArtifactVersionIdSchema),
  lockVersion: z.number().int().nonnegative(),
});

export const CreateWorkItemCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  parentWorkItemId: WorkItemIdSchema.optional(),
  kind: WorkItemKindSchema,
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(50_000).default(""),
  priority: z.enum(["critical", "high", "medium", "low"]),
  origin: OriginSchema,
  aiOutputId: z.string().uuid().optional(),
  requirementVersionIds: z.array(ArtifactVersionIdSchema),
  acceptanceCriterionVersionIds: z.array(ArtifactVersionIdSchema),
});

export const WorkItemDependencySchema = z.object({
  predecessorId: WorkItemIdSchema,
  successorId: WorkItemIdSchema,
  dependencyType: z.enum(["blocks", "requires", "related"]),
});

export const AddWorkItemDependencyCommandSchema = z
  .object({
    context: CommandContextSchema,
    projectId: ProjectIdSchema,
    predecessorId: WorkItemIdSchema,
    successorId: WorkItemIdSchema,
    dependencyType: z.enum(["blocks", "requires", "related"]),
  })
  .refine((value) => value.predecessorId !== value.successorId, {
    path: ["successorId"],
    message: "A work item cannot depend on itself",
  });

export const IterationSchema = z.object({
  id: IterationIdSchema,
  projectId: ProjectIdSchema,
  sequence: z.number().int().positive(),
  name: z.string().min(1).max(160),
  goal: z.string().min(1).max(8_000),
  startsAt: IsoDateTimeSchema,
  endsAt: IsoDateTimeSchema,
  state: IterationStateSchema,
  workItemIds: z.array(WorkItemIdSchema),
  lockVersion: z.number().int().nonnegative(),
});

export const CreateSprintCommandSchema = z
  .object({
    context: CommandContextSchema,
    projectId: ProjectIdSchema,
    name: z.string().trim().min(1).max(160),
    goal: z.string().trim().min(1).max(8_000),
    startsAt: IsoDateTimeSchema,
    endsAt: IsoDateTimeSchema,
    orderedWorkItemIds: z.array(WorkItemIdSchema).min(1),
  })
  .refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt), {
    path: ["endsAt"],
    message: "Sprint end must be after start",
  });

export const TransitionSprintCommandSchema = z.object({
  context: CommandContextSchema,
  projectId: ProjectIdSchema,
  iterationId: IterationIdSchema,
  expectedState: IterationStateSchema,
  targetState: IterationStateSchema,
});

export type WorkItem = z.infer<typeof WorkItemSchema>;
export type Iteration = z.infer<typeof IterationSchema>;
