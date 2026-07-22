import { z } from "zod";

export const RunnerLimitsSchema = z.object({
  turns: z.number().int().positive(),
  tasks: z.number().int().positive(),
  tokens: z.number().int().positive(),
  costUsd: z.number().positive(),
  timeSeconds: z.number().int().positive(),
});

export const RunnerCapabilityScopeSchema = z.object({
  capabilityGrantId: z.uuid(),
  organisationId: z.uuid(),
  executionCycleId: z.uuid(),
  runnerEnvironmentId: z.uuid(),
  repository: z.object({
    provider: z.literal("github"),
    owner: z.string().regex(/^[A-Za-z0-9_.-]+$/u),
    name: z.string().regex(/^[A-Za-z0-9_.-]+$/u),
    approvedCommit: z.string().regex(/^[a-f0-9]{40}$/u),
    branch: z.string().min(1).max(255),
  }),
  permittedPaths: z.array(z.string().min(1)).min(1),
  networkDestinations: z.array(z.string().url()),
  tools: z.array(z.string().regex(/^[a-zA-Z0-9_.:-]+$/u)),
  secretNames: z.array(z.string().regex(/^[A-Z][A-Z0-9_]*$/u)),
  testCommands: z.array(z.array(z.string()).min(1)).min(1),
  checkpointAfterTasks: z.number().int().positive(),
  limits: RunnerLimitsSchema,
  issuedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
  scopeHash: z.string().regex(/^[a-f0-9]{64}$/u),
});

export type RunnerCapabilityScope = z.infer<typeof RunnerCapabilityScopeSchema>;

export function assertCapabilityCurrent(scope: RunnerCapabilityScope, now: Date): void {
  const parsed = RunnerCapabilityScopeSchema.parse(scope);
  if (new Date(parsed.issuedAt) > now) throw new Error("Runner capability is not active yet");
  if (new Date(parsed.expiresAt) <= now) throw new Error("Runner capability has expired");
}

export interface CapabilityExchange {
  exchange(rawOpaqueCapability: string, environmentAttestation: string): Promise<RunnerCapabilityScope>;
  recheck(scope: RunnerCapabilityScope): Promise<"valid" | "revoked">;
  revoke(scope: RunnerCapabilityScope): Promise<void>;
}
