import { lstat, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import type { RunnerCapabilityScope } from "./capability.js";

export type ScopeDenialReason = "blocked_file" | "unauthorised_network" | "unauthorised_tool" | "unauthorised_secret";

export class ScopeDeniedError extends Error {
  public constructor(public readonly reason: ScopeDenialReason, public readonly safeTarget: string) {
    super(`${reason}: ${safeTarget}`);
    this.name = "ScopeDeniedError";
  }
}

async function nearestRealAncestor(path: string): Promise<{ real: string; remainder: string[] }> {
  const remainder: string[] = [];
  let candidate = resolve(path);
  while (true) {
    try {
      await lstat(candidate);
      return { real: await realpath(candidate), remainder: remainder.toReversed() };
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || (error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const parent = dirname(candidate);
      if (parent === candidate) throw error;
      remainder.push(candidate.slice(parent.length + (parent.endsWith(sep) ? 0 : 1)));
      candidate = parent;
    }
  }
}

function isWithin(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === "" || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path));
}

export async function assertPathAllowed(workspaceRoot: string, requestedPath: string, permittedPaths: readonly string[]): Promise<string> {
  const root = await realpath(workspaceRoot);
  const requested = resolve(root, requestedPath);
  const { real: ancestor, remainder } = await nearestRealAncestor(requested);
  const resolvedTarget = resolve(ancestor, ...remainder);
  const allowedRoots = await Promise.all(permittedPaths.map(async (entry) => {
    const absolute = resolve(root, entry);
    const { real, remainder: missing } = await nearestRealAncestor(absolute);
    return resolve(real, ...missing);
  }));
  if (!allowedRoots.some((allowedRoot) => isWithin(allowedRoot, resolvedTarget))) {
    throw new ScopeDeniedError("blocked_file", relative(root, resolvedTarget) || ".");
  }
  return resolvedTarget;
}

export function assertNetworkAllowed(target: string, destinations: readonly string[]): URL {
  const requested = new URL(target);
  if (requested.protocol !== "https:") throw new ScopeDeniedError("unauthorised_network", requested.hostname);
  const allowed = destinations.some((destination) => {
    const policy = new URL(destination);
    return requested.protocol === policy.protocol && requested.hostname === policy.hostname && requested.port === policy.port && requested.pathname.startsWith(policy.pathname);
  });
  if (!allowed) throw new ScopeDeniedError("unauthorised_network", requested.hostname);
  return requested;
}

export function assertToolAllowed(tool: string, scope: RunnerCapabilityScope): void {
  if (!scope.tools.includes(tool)) throw new ScopeDeniedError("unauthorised_tool", tool);
}

export function selectedSecrets(environment: NodeJS.ProcessEnv, scope: RunnerCapabilityScope): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const name of scope.secretNames) {
    const value = environment[name];
    if (value !== undefined) result[name] = value;
  }
  return result;
}
