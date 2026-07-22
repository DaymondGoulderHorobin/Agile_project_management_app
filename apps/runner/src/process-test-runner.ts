import { spawn } from "node:child_process";
import type { TestRunner } from "./engine.js";

export class ProcessTestRunner implements TestRunner {
  public async run(command: readonly string[], workspace: string, signal: AbortSignal): Promise<{ passed: boolean; exitCode: number; summary: string }> {
    const executable = command[0];
    if (!executable) throw new Error("Test command is empty");
    return new Promise((resolve, reject) => {
      const child = spawn(executable, command.slice(1), { cwd: workspace, shell: false, signal, windowsHide: true, env: { PATH: process.env.PATH, CI: "true" } });
      let output = "";
      child.stdout.on("data", (chunk: Buffer) => { output = `${output}${chunk.toString("utf8")}`.slice(-20_000); });
      child.stderr.on("data", (chunk: Buffer) => { output = `${output}${chunk.toString("utf8")}`.slice(-20_000); });
      child.once("error", reject);
      child.once("close", (code) => resolve({ passed: code === 0, exitCode: code ?? -1, summary: output.replace(/[\r\n]+/gu, " ").slice(0, 2_000) }));
    });
  }
}
