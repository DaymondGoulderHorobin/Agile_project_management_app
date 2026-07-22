#!/usr/bin/env node
import { readFile } from "node:fs/promises";

async function main(): Promise<void> {
  const command = process.argv[2] ?? "help";
  if (command === "recovery") {
    console.log(JSON.stringify({ status: "manual_recovery_required", message: "Use the runner provider inventory and cycle ID to reconcile capability revocation, preserved workspace, GitHub intents, and environment destruction." }));
    return;
  }
  if (command === "validate-capability") {
    const file = process.argv[3];
    if (!file) throw new Error("Usage: tracework-runner validate-capability <scope.json>");
    const { RunnerCapabilityScopeSchema } = await import("./capability.js");
    const parsed = RunnerCapabilityScopeSchema.parse(JSON.parse(await readFile(file, "utf8")));
    console.log(JSON.stringify({ valid: true, cycleId: parsed.executionCycleId, expiresAt: parsed.expiresAt }));
    return;
  }
  console.log("Tracework isolated runner\n\nCommands:\n  validate-capability <scope.json>\n  recovery");
}

await main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
