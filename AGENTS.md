# Repository guidance

Tracework is a TypeScript modular monolith with separate web, API, worker, and runner processes. Preserve the domain boundaries in `docs/planning/`.

## Required checks

Run the smallest relevant set while iterating, then before handoff run:

```text
pnpm format:check
pnpm docs:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

Do not bypass tenant context, approval policy, evidence immutability, runner scope, health-data quarantine, or review gates for development convenience. External adapters must have deterministic local counterparts without replacing PostgreSQL as authoritative state.
