import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
export const updatedAt = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();
export const lockVersion = () => integer("lock_version").default(0).notNull();
export const organisationId = () => uuid("organisation_id").notNull();
export const projectId = () => uuid("project_id").notNull();
export const id = () => uuid("id").primaryKey();
export const actorId = (name = "created_by_actor_id") => uuid(name);
export const jsonObject = (name: string) => jsonb(name).$type<Record<string, unknown>>();
export const requiredJsonObject = (name: string) =>
  jsonb(name).$type<Record<string, unknown>>().default({}).notNull();
export const origin = () => text("origin").notNull();
export const contentHash = () => text("content_hash").notNull();
export const archivedAt = () => timestamp("archived_at", { withTimezone: true });

export const ORIGINS = [
  "human_authored",
  "ai_generated",
  "ai_generated_human_edited",
  "imported",
  "system_generated",
] as const;

export function originCheck(column: AnyPgColumn, name: string) {
  return check(
    name,
    sql`${column} in ('human_authored','ai_generated','ai_generated_human_edited','imported','system_generated')`,
  );
}

export const ACTIVE_MEMBERSHIP_STATUSES = ["active", "revoked", "left"] as const;
export const APPROVAL_DECISIONS = [
  "approved",
  "approved_with_conditions",
  "changes_requested",
  "rejected",
] as const;
export const APPROVAL_REQUEST_STATES = [
  "pending",
  "approved",
  "changes_requested",
  "rejected",
  "withdrawn",
  "stale",
] as const;
export const EXECUTION_CYCLE_STATES = [
  "requested",
  "authorising",
  "queued",
  "provisioning",
  "running",
  "checkpoint_waiting",
  "human_input_required",
  "testing",
  "reporting",
  "awaiting_review",
  "completed",
  "cancelling",
  "cancelled",
  "failed",
  "recovery_required",
] as const;
export const RUNNER_ENVIRONMENT_STATES = [
  "requested",
  "creating",
  "ready",
  "active",
  "revoking",
  "destroying",
  "destroyed",
  "cleanup_failed",
] as const;
export const EXECUTION_STOP_REASONS = [
  "checkpoint_reached",
  "human_input_required",
  "scope_violation",
  "token_limit",
  "cost_limit",
  "turn_limit",
  "task_limit",
  "time_limit",
  "tests_failed",
  "approval_revoked",
  "membership_revoked",
  "repository_access_lost",
  "material_change",
  "user_cancelled",
  "runner_crash",
  "completed",
] as const;

export const immutableTimestamps = {
  createdAt: createdAt(),
} as const;

export { boolean, check, integer, jsonb, sql, text, timestamp, uuid };
