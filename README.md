# Tracework

Tracework is an evidence-backed project-planning and controlled software-delivery platform. It is designed to take a small team from expert discovery through versioned requirements, authenticated approval, constrained Codex execution, human review, and a traceable release record.

This repository currently contains the production planning dossier and the first implementation foundation: shared contracts, domain invariants, PostgreSQL/Drizzle schema and migrations, authentication boundaries, AI safety/proposal adapters, queues and integrations, and the isolated-runner enforcement core.

## Architecture

- TypeScript modular monolith in a pnpm monorepo
- PostgreSQL and Drizzle with shared-schema multi-tenancy and RLS
- Better Auth behind an application-owned identity and authorisation boundary
- BullMQ-compatible deterministic jobs and transactional outbox relay
- S3-compatible storage, SMTP, and GitHub adapters with in-memory fixtures
- OpenAI Responses API adapter plus deterministic AI fixtures
- Separate runner process with capability, path, network, tool, secret, limit, checkpoint, test, report, and revocation controls

The authoritative design is in [`docs/planning/`](docs/planning/00-executive-summary.md). The product design direction and reference concepts are in [`docs/design/`](docs/design/README.md).

## Workspace

| Path | Responsibility |
| --- | --- |
| `packages/domain` | Business invariants, permissions, readiness, lifecycle transitions, and demo fixtures |
| `packages/contracts` | Zod API, event, queue, SSE, and integration contracts |
| `packages/config` | Fail-closed runtime configuration and safe projections |
| `packages/database` | Drizzle schema, reviewed SQL migrations, RLS, constraints, and operational scripts |
| `packages/auth` | Better Auth boundary and one-use High-Assurance reauthentication grants |
| `packages/ai` | Structured AI proposals, origin metadata, evidence requirements, and health-data filtering |
| `packages/queue` | Canonical BullMQ jobs, deterministic IDs, and outbox relay |
| `packages/integrations` | GitHub, SMTP, S3/MinIO, and deterministic fixture adapters |
| `apps/runner` | Independent execution-boundary enforcement and work-report generation |

## Local commands

Node.js 24 and pnpm 11 are the pinned development baseline.

```bash
corepack pnpm install
pnpm docs:validate
pnpm typecheck
pnpm test
pnpm build
```

Copy `.env.example` to `.env` only for local use. Never commit credentials. Fixture providers are the safe default when external services are not configured.

## Data boundary

The first product is classified `general_business`. It supports professional knowledge, business processes, generic workflows, non-identifiable scenarios, requirements, design feedback, and domain constraints. It is not a clinical record system. Do not enter patient names, contact information, identifiable treatment histories, clinical records, patient-linked images, or other identifiable health information.

## Approval boundary

Project approval and High-Assurance project approval are secure operational decisions against immutable, version-bound snapshots. A legally binding electronic-signature ceremony is a separate future optional module and is not required by the core product.

## Status

See [`docs/implementation-status.md`](docs/implementation-status.md) for the exact implemented and deferred boundary. The repository is licensed under AGPL-3.0-only.
