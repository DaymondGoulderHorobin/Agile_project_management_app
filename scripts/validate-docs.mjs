import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".pnpm-store",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : walk(path);
    }
    return extname(entry.name).toLowerCase() === ".md" ? [path] : [];
  });
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/u).length;
}

function anchorForHeading(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[`*_~]/gu, "")
    .replace(/<[^>]+>/gu, "")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s/gu, "-")
    .replace(/^-|-$/gu, "");
}

function anchorsFor(text) {
  const counts = new Map();
  const anchors = new Set();
  for (const match of text.matchAll(/^#{1,6}\s+(.+)$/gmu)) {
    const base = anchorForHeading(match[1]);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }
  return anchors;
}

function validateTables(file, text, failures) {
  const lines = text.split(/\r?\n/u);
  let expectedPipes = null;
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed.startsWith("|")) {
      expectedPipes = null;
      continue;
    }
    const pipes = (trimmed.match(/(?<!\\)\|/gu) ?? []).length;
    expectedPipes ??= pipes;
    if (pipes !== expectedPipes) {
      failures.push(`${file}:${index + 1}: table row has ${pipes} columns markers; expected ${expectedPipes}`);
    }
  }
}

function uniqueMatches(text, expression, group = 0) {
  return [...new Set([...text.matchAll(expression)].map((match) => match[group]))];
}

function findDuplicates(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
}

async function validateMermaid(blocks, failures) {
  if (blocks.length === 0) return;
  let mermaid;
  try {
    // Mermaid imports DOMPurify's browser factory directly. In a DOM-free Node
    // process that factory has no sanitizer methods, although parsing does not
    // render or trust HTML. Prime the exact ESM instance Mermaid resolves with
    // inert string helpers so grammar validation can run without a headless
    // browser. Rendered application content still uses Mermaid's strict mode.
    const mermaidRoot = realpathSync(join(process.cwd(), "node_modules", "mermaid"));
    const domPurifyModule = join(dirname(mermaidRoot), "dompurify", "dist", "purify.es.mjs");
    const { default: domPurify } = await import(pathToFileURL(domPurifyModule).href);
    if (typeof domPurify.sanitize !== "function") domPurify.sanitize = (value) => value;
    if (typeof domPurify.addHook !== "function") domPurify.addHook = () => undefined;
    ({ default: mermaid } = await import("mermaid"));
  } catch (error) {
    failures.push(`Mermaid parser unavailable: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  // `strict` rendering expects a browser DOM and DOMPurify. Validation only
  // parses source; `loose` avoids rendering/sanitisation in Node while still
  // exercising Mermaid's grammar.
  mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });
  for (const block of blocks) {
    try {
      await mermaid.parse(block.source, { suppressErrors: false });
    } catch (error) {
      failures.push(
        `${block.file}:${block.line}: invalid Mermaid: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export async function validateRepository(rootDirectory = process.cwd()) {
  const root = resolve(rootDirectory);
  const planningDirectory = join(root, "docs", "planning");
  const failures = [];
  if (!existsSync(planningDirectory)) return ["docs/planning is missing"];

  const markdownFiles = walk(root);
  const textByFile = new Map(markdownFiles.map((file) => [file, readFileSync(file, "utf8")]));
  const anchorCache = new Map();
  const mermaidBlocks = [];

  for (const [file, text] of textByFile) {
    const display = relative(root, file).replaceAll("\\", "/");
    text.split(/\r?\n/u).forEach((line, index) => {
      if (/[\t ]+$/u.test(line)) failures.push(`${display}:${index + 1}: trailing whitespace`);
    });

    const fences = [...text.matchAll(/^```[^\r\n]*$/gmu)];
    if (fences.length % 2 !== 0) failures.push(`${display}: unbalanced fenced code block`);
    validateTables(display, text, failures);

    for (const match of text.matchAll(/```mermaid\s*\r?\n([\s\S]*?)```/gu)) {
      mermaidBlocks.push({ file: display, line: lineNumber(text, match.index), source: match[1] });
    }

    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/gu)) {
      const rawTarget = match[1].trim().replace(/^<|>$/gu, "");
      if (/^(?:https?:|mailto:)/iu.test(rawTarget)) continue;
      const [rawPath, rawAnchor] = rawTarget.split("#", 2);
      const decodedPath = decodeURIComponent(rawPath || "");
      const targetFile = decodedPath ? resolve(dirname(file), decodedPath) : file;
      if (!existsSync(targetFile)) {
        failures.push(`${display}:${lineNumber(text, match.index)}: broken file link ${rawTarget}`);
        continue;
      }
      if (rawAnchor && statSync(targetFile).isFile() && extname(targetFile).toLowerCase() === ".md") {
        let anchors = anchorCache.get(targetFile);
        if (!anchors) {
          anchors = anchorsFor(readFileSync(targetFile, "utf8"));
          anchorCache.set(targetFile, anchors);
        }
        const anchor = decodeURIComponent(rawAnchor).toLowerCase();
        if (!anchors.has(anchor)) {
          failures.push(`${display}:${lineNumber(text, match.index)}: missing anchor #${rawAnchor} in ${relative(root, targetFile)}`);
        }
      }
    }
  }

  const planningFiles = markdownFiles.filter((file) => dirname(file).startsWith(planningDirectory));
  const planningText = planningFiles.map((file) => textByFile.get(file)).join("\n");
  const requirementsFile = join(planningDirectory, "01-product-requirements.md");
  const backlogFile = join(planningDirectory, "12-build-backlog.md");
  const demoFile = join(planningDirectory, "13-demo-journey.md");
  const requirementText = textByFile.get(requirementsFile) ?? "";
  const backlogText = textByFile.get(backlogFile) ?? "";
  const demoText = textByFile.get(demoFile) ?? "";

  const requirementDefinitionMatches = [...requirementText.matchAll(/^\|\s*((?:FR|HC|NFR|SEC|UX|RUN|DEMO|SC)-\d{2,3})\s*\|/gmu)].map(
    (match) => match[1],
  );
  const requirementDefinitions = new Set(requirementDefinitionMatches);
  for (const duplicate of findDuplicates(requirementDefinitionMatches)) failures.push(`Duplicate requirement ID: ${duplicate}`);
  for (const reference of uniqueMatches(planningText, /(?<!OQ-)\b(?:FR|HC|NFR|SEC|UX|RUN|DEMO|SC)-\d{2,3}\b/gmu)) {
    if (!requirementDefinitions.has(reference)) failures.push(`Missing requirement definition: ${reference}`);
  }

  const backlogDefinitionMatches = [...backlogText.matchAll(/^\|\s*(S[1-6]-(?:T|US|SEC|TEST)\d{2})\s*\|/gmu)].map(
    (match) => match[1],
  );
  const backlogDefinitions = new Set(backlogDefinitionMatches);
  for (const duplicate of findDuplicates(backlogDefinitionMatches)) failures.push(`Duplicate backlog ID: ${duplicate}`);
  for (const reference of uniqueMatches(planningText, /\bS[1-6]-(?:T|US|SEC|TEST)\d{2}\b/gmu)) {
    if (!backlogDefinitions.has(reference)) failures.push(`Missing backlog definition: ${reference}`);
  }

  const demoDefinitionMatches = [...demoText.matchAll(/^##\s+(DJ-\d{2})\b/gmu)].map((match) => match[1]);
  const demoDefinitions = new Set(demoDefinitionMatches);
  for (const duplicate of findDuplicates(demoDefinitionMatches)) failures.push(`Duplicate demo ID: ${duplicate}`);
  for (const reference of uniqueMatches(planningText, /\bDJ-\d{2}\b/gmu)) {
    if (!demoDefinitions.has(reference)) failures.push(`Missing demo definition: ${reference}`);
  }

  const forbiddenTerminology = [
    ["plan_review", "Use canonical project state plan_in_review"],
    ["stale snapshot", "Approval requests become stale; immutable snapshots do not"],
    ["stale approval snapshot", "Approval requests become stale; immutable snapshots do not"],
    ["mark snapshot stale", "Approval requests become stale; immutable snapshots do not"],
    ["mark the approval snapshot stale", "Approval requests become stale; immutable snapshots do not"],
  ];
  for (const [term, message] of forbiddenTerminology) {
    if (planningText.toLowerCase().includes(term)) failures.push(`${message}: found '${term}'`);
  }

  const canonicalCycleStates = [
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
  ];
  const canonicalEnvironmentStates = [
    "requested",
    "creating",
    "ready",
    "active",
    "revoking",
    "destroying",
    "destroyed",
    "cleanup_failed",
  ];
  const stateFiles = ["03-data-model.md", "04-workflows-and-approvals.md", "05-ai-and-codex-architecture.md"];
  for (const stateFile of stateFiles) {
    const stateText = textByFile.get(join(planningDirectory, stateFile)) ?? "";
    for (const state of [...canonicalCycleStates, ...canonicalEnvironmentStates]) {
      const statePattern = new RegExp(`(?<![\\p{Letter}\\p{Number}_])${state}(?![\\p{Letter}\\p{Number}_])`, "u");
      if (!statePattern.test(stateText)) failures.push(`${stateFile}: missing canonical state ${state}`);
    }
  }

  const requiredTerms = [
    "plan_in_review",
    "execution_work_item_claims",
    "runner_graceful_shutdown_seconds",
    "demonstration_comparisons",
    "demonstration_comparison_results",
  ];
  for (const term of requiredTerms) {
    if (!planningText.includes(term)) failures.push(`Planning dossier is missing canonical term: ${term}`);
  }

  for (const [file, text] of textByFile) {
    const display = relative(root, file).replaceAll("\\", "/");
    text.split(/\r?\n/u).forEach((line, index) => {
      if (!/Legal electronic signature/iu.test(line)) return;
      const normalized = line.toLowerCase();
      const negativeOrFuture = /future|defer|outside|non-goal|non-blocking|not required|does not require|without|optional|\bno\b|not part|rejected for initial|must wait/iu.test(line);
      const validationContext = /accidental|validator|validation|test|search|wording|alternatives|costs/iu.test(line);
      if (!negativeOrFuture && !validationContext && /initial|must|required|acceptance|slice [1-6]/u.test(normalized)) {
        failures.push(`${display}:${index + 1}: possible initial-release Legal electronic signature dependency`);
      }
    });
  }

  await validateMermaid(mermaidBlocks, failures);
  return failures;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const failures = await validateRepository(process.cwd());
  if (failures.length > 0) {
    console.error(`Documentation validation failed with ${failures.length} issue(s):`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else {
    console.log("Documentation validation passed.");
  }
}

export const validatorModuleUrl = pathToFileURL(fileURLToPath(import.meta.url)).href;
