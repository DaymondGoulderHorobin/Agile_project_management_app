# Executive Summary

Status: Proposed production architecture
Baseline date: 2026-07-22
Audience: founders, product owners, engineers, security reviewers, open-source contributors, and AI agents implementing the plan

## Product definition

This product is an open-source, AI-native project management and software-delivery platform. It preserves the reasoning that connects a problem to shipped software and prevents an AI coding agent from acting before people have completed and approved the relevant project logic.

The product is the source of truth for this chain:

> Problem → questions → answers → evidence → requirements → approved plan → Agile delivery → authorised Codex execution → testing → human review → release

Traditional project tools primarily record work status. This platform also records why work exists, who supplied knowledge, what evidence supports a requirement, which exact version was approved, what Codex was allowed to do, what happened during execution, and what proves a release is ready.

## Intended users

- Project owners and organisation administrators.
- Developers and technical reviewers.
- Non-technical domain experts, intended users, and external stakeholders.
- Approval authorities whose responsibility varies by project stage and risk.
- AI agents acting only within explicit, reviewable authority.

The first real journey is a two-person project: a developer and a chiropractor serving as a non-technical domain expert. The project contains general professional and business knowledge only. It must not contain patient-identifiable health information.

## Main value and differentiators

1. Evidence-backed requirements rather than disconnected task lists.
2. Immutable versions and approvals bound to exact content hashes.
3. Clear separation of human knowledge, imported information, AI proposals, confirmed facts, and assumptions.
4. Deterministic readiness rules that explain blockers without pretending AI advice is authority.
5. Controlled Codex execution cycles with repository, branch, path, network, tool, time, token, cost, and checkpoint limits.
6. End-to-end traceability from a source statement to requirements, work items, code, tests, reviews, and releases.
7. A guest experience that lets a non-technical expert contribute without learning enterprise project administration.
8. An AGPL-3.0 self-hostable core suitable for continued company development.

## Recommended architecture

- TypeScript modular monolith in a pnpm workspace, with Turborepo for task orchestration and local caching.
- `apps/web`: Next.js App Router user interface.
- `apps/api`: NestJS with Fastify, REST/OpenAPI commands and resources, and Server-Sent Events (SSE).
- `apps/worker`: BullMQ consumers for AI, notifications, integrations, outbox delivery, and reconciliation.
- `apps/runner`: isolated Codex runner trust boundary; it is operationally separate from the general worker.
- PostgreSQL with Drizzle and reviewed SQL migrations.
- Shared-schema multi-tenancy with `organisation_id`, tenant-aware foreign keys, application authorisation, and PostgreSQL Row-Level Security (RLS).
- Redis and BullMQ for disposable coordination, not authoritative state.
- S3-compatible object storage with MinIO support.
- OpenAI Responses API for governed project-assistance use cases and the server-side Codex SDK inside the isolated runner.
- GitHub App integration, SMTP email, transactional outbox/inbox processing, and Docker Compose as the first supported self-hosted topology.

See [System Architecture](07-system-architecture.md) and [AI and Codex Architecture](05-ai-and-codex-architecture.md).

## Preserved major decisions

1. Use a TypeScript modular monolith rather than microservices.
2. Separate Next.js web, NestJS/Fastify API, BullMQ worker, and isolated Codex runner runtimes.
3. Use PostgreSQL/Drizzle with reviewed SQL migrations.
4. Use shared-schema tenancy with `organisation_id`, tenant-aware foreign keys, application authorisation, and RLS.
5. Keep original evidence immutable; corrections supersede rather than overwrite it.
6. Use a common versioned artifact root with typed version extensions, not an untyped universal JSON document.
7. Bind project approvals to immutable approval snapshots with canonical payloads and SHA-256 hashes.
8. Ship Light, Standard, and High-Assurance project modes as versioned presets.
9. Calculate readiness from deterministic, explainable rules; AI assessment is advisory.
10. Allow one execution cycle per approved execution-plan version and recheck authority immediately before starting or resuming it.
11. Write domain state, audit events, and outbox events atomically.
12. Use a GitHub App rather than personal access tokens.
13. Keep the complete first product in the AGPL-3.0 self-hostable core.

## Approval boundary

**Project approval** is an authenticated operational decision against an immutable approval snapshot. **High-Assurance project approval** adds stronger reauthentication, distinct-person rules, separation of duties, and stricter gates; it is still an operational approval.

The Legal electronic signature capability is not required for the initial product. Its legal identity verification, signature evidence receipts, witnessed or notarised signing, provider adapters, and jurisdictional legal review belong to a future optional module. Project approval and High-Assurance project approval are complete without it.

## First production boundary

The first company version supports all five core journeys:

1. Two-person discovery and evidence capture.
2. Evidence-backed requirements, plan versioning, and project approval.
3. Agile backlog and sprint planning.
4. A restricted, approval-gated Codex cycle through checkpoint, testing, and human review.
5. Material change control and a release record with full traceability.

The single demonstration spine is specified in [Demo Journey](13-demo-journey.md). Slack, Teams, calendars, storage connectors, GitHub Enterprise Server, visual workflow design, Waterfall/hybrid templates, enterprise provisioning, managed multi-region hosting, and the Legal electronic signature module are later extensions.

## First-company-version success criteria

| ID | Success criterion |
|---|---|
| SC-01 | A developer and non-technical domain expert complete discovery without an external project-management tool. |
| SC-02 | Both people create questions and AI can propose clearly labelled additional questions with explanations. |
| SC-03 | Important requirements link to immutable supporting evidence. |
| SC-04 | A plan cannot become approved without every currently valid required reviewer decision. |
| SC-05 | A relevant content change creates a new version and correctly stales dependent approval requests. |
| SC-06 | Codex cannot start or resume without a valid approved execution-plan version and current authority. |
| SC-07 | Codex cannot exceed its approved repository, commit, branch, path, network, tool, secret, or system scope. |
| SC-08 | Codex stops at configured checkpoints and continuous stop conditions. |
| SC-09 | Required stakeholders review the outcome before another execution cycle begins. |
| SC-10 | A release traces to requirements, approvals, work items, code changes, tests, and reviews. |
| SC-11 | The complete two-person journey is understandable without formal project-management training. |
| SC-12 | Automated tenant-isolation tests prevent cross-organisation reads, writes, and references. |
| SC-13 | Patient-identifiable health information is explicitly outside the intended workflow and is handled safely if submitted accidentally. |
| SC-14 | Operators can deploy, back up, restore, upgrade, and observe the documented self-hosted production topology. |
| SC-15 | The core product remains fully usable without the future Legal electronic signature module. |

## Six implementation slices

1. **Secure project foundation** — identity, organisations, projects, isolation, audit, outbox.
2. **Human knowledge discovery** — guests, questions, answers, evidence, comments, notifications.
3. **Requirements and approval** — artifacts, evidence links, plans, approvals, readiness, AI extraction.
4. **Agile delivery** — backlog, hierarchical work items, sprints, dependencies, traceability.
5. **Controlled Codex execution** — GitHub, execution plans, isolated runner, checkpoints, tests, reports, review.
6. **Change control and release** — impact analysis, approval invalidation, release evidence and approval.

Each slice ends in demonstrable user value; details are in [Implementation Roadmap](08-implementation-roadmap.md).

## Ten principal risks

| Risk | Consequence | Primary response |
|---|---|---|
| Cross-tenant data access | Confidential organisation data disclosure | Composite tenant keys, deny-by-default RLS, application checks, isolation tests |
| Runner escape or unsafe repository code | Host or adjacent workload compromise | Dedicated runner boundary, least privilege, restricted mounts/network/secrets, stronger isolation before managed multi-tenant runners |
| Approval race or stale authority | Unauthorised AI work | Immutable snapshots, row-locked rechecks, revocable short-lived capabilities, cancellation |
| Accidental identifiable health data | Privacy and regulatory exposure | Persistent warnings, `general_business` classification, prompt/upload controls, quarantine and incident procedure |
| AI hallucination or evidence mislink | Incorrect requirements presented as fact | Proposal status, origin labels, source citations, human correction, evaluations |
| Over-general artifact/workflow abstractions | Slow development and opaque invariants | Typed extensions and code-owned integrity rules; limited preset configuration |
| Guest account takeover | Unauthorised answers or approvals | Hashed expiring tokens, secure sessions, project scope, revocation, reauthentication for configured approvals |
| Duplicate jobs or webhooks | Repeated cycles, PRs, emails, or state transitions | Idempotency keys, unique constraints, inbox/outbox, reconciliation |
| Self-host operational failure | Data loss or prolonged outage | Documented backups, restore drills, health checks, expand/contract migrations, observability |
| Scope growth across product stages | Delayed usable product | Six vertical slices and one fixed demo spine; defer secondary integrations and the Legal electronic signature module |

## Recommended next five Codex tasks

1. Materialise repository/tooling foundations and the local Docker Compose development topology.
2. Implement identity, organisations, projects, tenant-aware database access, RLS, audit, and outbox foundations.
3. Implement guest invitations, questions, responses, knowledge sources, and immutable evidence.
4. Implement typed artifact versions, plans, approval snapshots, staleness, readiness, and AI-assisted proposals.
5. Implement Agile planning and then the first approved isolated Codex cycle as the Slice 5 vertical path.

## Documentation map

- Product: [Product Requirements](01-product-requirements.md)
- Domain and data: [Domain Model](02-domain-model.md), [Data Model](03-data-model.md)
- Behaviour: [Workflows and Approvals](04-workflows-and-approvals.md)
- AI and execution: [AI and Codex Architecture](05-ai-and-codex-architecture.md)
- Security: [Security and Privacy](06-security-and-privacy.md)
- Runtime: [System Architecture](07-system-architecture.md)
- Delivery: [Implementation Roadmap](08-implementation-roadmap.md), [Testing Strategy](09-testing-strategy.md), [Build Backlog](12-build-backlog.md)
- Decisions and uncertainty: [Decision Log](10-decision-log.md), [Open Questions](11-open-questions.md)
- Demonstration and revision: [Demo Journey](13-demo-journey.md), [Plan Revision Record](14-plan-revision-record.md)
