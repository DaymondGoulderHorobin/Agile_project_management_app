# Architecture Decision Log

Status: Accepted planning decisions
The approved dossier and mandatory implementation-readiness corrections make these decisions authoritative for implementation. Reconsideration conditions are explicit and do not permit silent divergence.

## ADR-001 — TypeScript across application runtimes

- **Context:** Shared contracts, domain logic, web, API, workers, and runner control require a coherent contributor model.
- **Decision:** Use TypeScript for Next.js, NestJS, workers, runner control, domain packages, and integrations. Reviewed SQL remains the database migration language.
- **Alternatives:** Mixed TypeScript/Python; Java/Kotlin backend; Go services.
- **Benefits:** Shared schemas/types, smaller contributor surface, code reuse, good OpenAI/GitHub ecosystem.
- **Costs:** CPU-heavy workloads may need another runtime; TypeScript cannot replace runtime validation.
- **Reconsider when:** A measured workload or mature specialist component cannot meet reliability/performance requirements in Node/TypeScript.

## ADR-002 — Modular monolith with separated runtimes

- **Context:** The product has rich transactional invariants but several runtime/trust profiles.
- **Decision:** One modular monolith/monorepo and database, with web, API, worker, and isolated runner processes.
- **Alternatives:** Microservices; single Next.js runtime; separate service per domain.
- **Benefits:** Atomic integrity, simpler operations, clear modules, independent process scaling.
- **Costs:** Requires dependency discipline; database can become a coupling point.
- **Reconsider when:** Stable module contracts plus proven ownership, failure-isolation, scaling, or regulatory needs justify extraction.

## ADR-003 — pnpm workspaces and Turborepo

- **Context:** Four apps and shared packages need reproducible builds and an explicit task graph.
- **Decision:** pnpm workspace/lockfile with Turborepo local task orchestration/cache; no remote cache initially.
- **Alternatives:** npm/yarn; pnpm scripts alone; Nx.
- **Benefits:** Efficient installs, strict dependency declarations, small orchestration surface.
- **Costs:** Additional tool/configuration and cache correctness.
- **Reconsider when:** Task graph remains trivial (remove Turbo) or repository complexity requires stronger Nx-style governance.

## ADR-004 — Separate Next.js web and NestJS/Fastify API

- **Context:** UI rendering and a durable public/integration/domain API have different responsibilities.
- **Decision:** Next.js owns presentation; NestJS/Fastify owns authentication boundary, REST/SSE, application services, transactions, and webhooks.
- **Alternatives:** Next.js full stack; standalone SPA; GraphQL backend.
- **Benefits:** Explicit domain/API boundary, worker/runner integration, independent scaling, OpenAPI.
- **Costs:** Two server runtimes, session delegation, deployment complexity.
- **Reconsider when:** Product remains UI-only with no external/worker needs, or measured operational cost outweighs boundary value.

## ADR-005 — PostgreSQL and Drizzle with reviewed SQL

- **Context:** Tenancy, RLS, relationships, locking, versions, and transactions require relational guarantees.
- **Decision:** PostgreSQL is authoritative; Drizzle maps types/queries; reviewed SQL migrations are executable authority.
- **Alternatives:** Prisma; document DB; event store; serverless proprietary database.
- **Benefits:** Strong constraints/transactions/RLS, SQL transparency, portability.
- **Costs:** Migration/SQL expertise and careful pool/RLS context handling.
- **Reconsider when:** A proven data shape cannot be served relationally; add a specialised projection rather than replace authority first.

## ADR-006 — Shared-schema multi-tenancy with tenant-aware FKs and RLS

- **Context:** Self-host and future cloud need multiple organisations with strict isolation and modest initial scale.
- **Decision:** `organisation_id` on tenant records, composite tenant FKs, application authorisation, transaction-local RLS.
- **Alternatives:** Database/schema per tenant; application filters only.
- **Benefits:** Efficient operations, defence in depth, referential isolation.
- **Costs:** RLS/pooling complexity; migrations affect all tenants.
- **Reconsider when:** Enterprise/regulatory isolation or tenant scale demonstrably requires dedicated databases; preserve same domain IDs/contracts.

## ADR-007 — Common artifact root with typed version extensions

- **Context:** Requirements, risks, decisions, criteria, plans, and designs share version/evidence/relationship behaviour but need typed fields.
- **Decision:** `artifacts`/`artifact_versions` common lifecycle plus one typed extension table per version type.
- **Alternatives:** Fully separate roots/version tables; universal JSON artifact.
- **Benefits:** Consistent version/provenance/relationships without losing constraints/queryability.
- **Costs:** Joins and root/extension type integrity tests.
- **Reconsider when:** A type has incompatible lifecycle/volume/security; split that type while preserving immutable version interfaces.

## ADR-008 — Immutable evidence and superseding corrections

- **Context:** Original stakeholder statements must not be rewritten when conclusions change.
- **Decision:** Submitted responses/source fragments are immutable; corrections create records with supersession links.
- **Alternatives:** Editable source text with audit history only.
- **Benefits:** Reliable provenance, conflict visibility, defensible history.
- **Costs:** More records and UX for current-versus-historical context.
- **Reconsider when:** Never for material evidence; only drafts remain mutable.

## ADR-009 — Immutable approval snapshots and general operational approval engine

- **Context:** Plans, sprints, execution plans, and releases require exact version-bound approval.
- **Decision:** Canonical immutable snapshot/hash plus versioned policy, evaluated requirements and immutable decisions. A relevant change marks the approval request `stale` and invalidates the unchanged snapshot's use as current authority; the snapshot and decisions never acquire a stale state and remain historical evidence.
- **Alternatives:** Status columns; per-domain approval tables; role-only checks.
- **Benefits:** Reusable integrity, auditability, explicit race handling.
- **Costs:** Snapshot canonicalisation, policy/staleness complexity.
- **Reconsider when:** Never replace exact-version binding; specialised ceremonies may reference the same snapshot through separate modules.

## ADR-010 — Project approval is not a Legal electronic signature

- **Context:** Secure Project approval is needed now; Legal electronic signatures add identity, evidence ceremony, provider, and jurisdiction obligations unrelated to core delivery.
- **Decision:** Initial product includes Project approval and High-Assurance project approval. The Legal electronic signature module is a future optional module with no core dependency.
- **Alternatives:** Treat every approval as a Legal electronic signature; include a separate legal ceremony initially.
- **Benefits:** Complete product journey with lower legal/UX/schema scope; avoids misleading claims.
- **Costs:** Customers needing a Legal electronic signature must wait or use an external process.
- **Reconsider when:** Validated customer demand, jurisdiction/legal review, identity/proof requirements, and business case justify a separately bounded module.

## ADR-011 — Versioned workflow presets with code-owned invariants

- **Context:** Agile now, future methodology flexibility, but arbitrary workflow engines can undermine integrity.
- **Decision:** Stored immutable Light/Standard/High-Assurance Agile definitions; configurable display/transitions/policies within fixed code invariants. The canonical project workflow state for a submitted plan is `plan_in_review`. No visual builder initially.
- **Alternatives:** Hard-coded single flow; BPMN/general rules engine; separate methodology systems.
- **Benefits:** Useful defaults and future extension without bypassing security.
- **Costs:** Dual code/config reasoning and version migration.
- **Reconsider when:** Multiple real organisations require custom flows; add validated builder rather than arbitrary scripts.

## ADR-012 — Deterministic readiness rules with advisory AI

- **Context:** Readiness must explain missing logic without false authority.
- **Decision:** Versioned deterministic checklist with blocking/warning/informational results and optional descriptive percentage; AI only explains/recommends.
- **Alternatives:** AI score; opaque number; approval alone.
- **Benefits:** Explainable, testable, organisation-configurable, no authority confusion.
- **Costs:** Rules require product ownership and maintenance.
- **Reconsider when:** Add measured predictive signals only as non-binding evidence beside deterministic criteria.

## ADR-013 — Separate Responses API assistance and Codex SDK execution

- **Context:** Project-content generation and repository coding have different tools, risk, lifecycle, and outputs.
- **Decision:** OpenAI Responses API through `GenerationProvider` for proposals; server-side Codex SDK through `CodingAgentProvider` inside runner.
- **Alternatives:** One generic LLM abstraction; direct model coding loop; run Codex in worker.
- **Benefits:** Capability clarity, appropriate governance, provider-specific features, safe trust boundary.
- **Costs:** Two integrations/event models and evaluation suites.
- **Reconsider when:** Provider capabilities change; retain separate business-versus-coding authority even if adapters converge.

## ADR-014 — Code-versioned prompts and structured outputs

- **Context:** Prompts are product behaviour and outputs feed typed proposals.
- **Decision:** Prompts in reviewed code with typed inputs, Zod/JSON Schema output, prompt/model/eval release metadata.
- **Alternatives:** Provider prompt objects; database-editable production prompts; prose parsing.
- **Benefits:** Git review/rollback, reproducibility, schema validation, eval gates.
- **Costs:** Prompt changes require deployment/config release.
- **Reconsider when:** A governed prompt-management system provides equivalent review/version/eval guarantees without provider lock-in.

## ADR-015 — BullMQ/Redis plus transactional outbox/inbox

- **Context:** AI, notifications, webhooks, runner control, and retention need durable asynchronous work.
- **Decision:** BullMQ for delivery/coordination; PostgreSQL outbox/inbox/idempotency holds authoritative intent/result.
- **Alternatives:** In-process jobs; Redis-only authority; Kafka/RabbitMQ.
- **Benefits:** Simple initial operations, retries/scheduling, no lost DB-to-queue intent.
- **Costs:** At-least-once/idempotency complexity and two data systems.
- **Reconsider when:** Throughput/replay/fanout measurements justify a different broker; keep outbox and idempotency semantics.

## ADR-016 — S3-compatible object storage with MinIO

- **Context:** Attachments, exports, raw AI/runner output, reports, and patches should not live as DB blobs.
- **Decision:** Private S3 contract; MinIO for self-host; metadata/ownership/hash/status in PostgreSQL.
- **Alternatives:** Local filesystem; DB blobs; cloud-vendor-only storage.
- **Benefits:** Portable scalable objects, signed access, lifecycle policies.
- **Costs:** Metadata/object consistency and backup coordination.
- **Reconsider when:** None for production; local filesystem may remain development-only.

## ADR-017 — GitHub App integration

- **Context:** Repository connection needs least privilege, webhooks, short-lived credentials, PR/check traceability.
- **Decision:** GitHub.com App initially, explicit installation/repository mapping and durable side-effect intent.
- **Alternatives:** PATs; OAuth-only; generic Git first.
- **Benefits:** Revocable scoped tokens, organisation installation, webhook identity.
- **Costs:** App setup and GitHub-specific adapter.
- **Reconsider when:** Demand justifies GHES/GitLab adapters behind `RepositoryAdapter`; do not downgrade to shared PATs.

## ADR-018 — Isolated runner trust boundary and canonical lifecycle

- **Context:** Repository code/tests/dependencies/model actions are untrusted and long-running.
- **Decision:** Separate per-cycle runner environment with canonical cycle/environment states, exact checkout, restricted mounts/network/tools/secrets, safe events, cleanup/recovery. Graceful termination uses validated `runner_graceful_shutdown_seconds`, default 30 and allowed range 5–120 seconds, before hard kill.
- **Alternatives:** Execute in worker/API; rely only on Codex prompt/sandbox; remote customer runner initially.
- **Benefits:** Reduced blast radius, enforceable authority, auditable operations.
- **Costs:** Highest operational/security complexity and testing burden.
- **Reconsider when:** Execution topology evolves; never collapse untrusted code into API/worker.

## ADR-019 — One cycle per approved execution-plan version

- **Context:** Replaying one approval could create ambiguous repeated authority and side effects.
- **Decision:** Unique `execution_plan_version_id` on cycle. Additional work/retry after terminal review requires a new version and approval.
- **Alternatives:** Reusable plan authorisation; optional retry count.
- **Benefits:** Exact audit, no approval replay, simple idempotency.
- **Costs:** More versions/approvals for another attempt.
- **Reconsider when:** A future policy explicitly models bounded multi-run authorisation with equivalent non-replay integrity; not initially.

## ADR-020 — Revocable short-lived opaque runner capabilities

- **Context:** Execution authority must be enforceable and revocable while a runner is active.
- **Decision:** Store only hashed grant/JTI/scope; deliver opaque raw token once; short expiry and online renewal after authority recheck.
- **Alternatives:** Long-lived JWT; runner trusts queue message; database credentials.
- **Benefits:** Immediate revocation, environment binding, no bearer secret at rest, fail-closed renewal.
- **Costs:** Online control dependency and renewal handling.
- **Reconsider when:** A capability system offers equal revocation, binding, audit, and offline containment.

## ADR-021 — Single demonstration spine

- **Context:** Broad architecture risks producing disconnected infrastructure without a compelling usable journey.
- **Decision:** Developer + chiropractor `general_business` project is the canonical `DJ-01`–`DJ-22` demonstration and traceability spine. A controlled `DEMO-001` comparison holds the original idea, fixture repository/base commit, model/profile, limits and scoring rubric constant, then contrasts an immutable Direct-to-Codex baseline with the immutable platform-assisted result. Baseline output is evaluation-only and cannot be approved, merged, released or represented as an authorised execution cycle.
- **Alternatives:** Feature demos per module; generic sample data; multiple personas/domains.
- **Benefits:** Clear company story, prioritisation, UX validation, integration proof.
- **Costs:** Scenario may underrepresent larger-team complexity.
- **Reconsider when:** First journey passes and additional validated segments require separate acceptance spines.

## ADR-022 — Prohibit identifiable health information initially

- **Context:** Chiropractor expertise creates a foreseeable risk of entering patient data although the product is general PM software.
- **Decision:** Initial classification `general_business`; warnings/templates/filtering/quarantine/incident process; no intentional regulated-health storage.
- **Alternatives:** Ignore domain risk; build healthcare compliance immediately.
- **Benefits:** Safer focused product, avoids accidental healthcare positioning, clear future gate.
- **Costs:** Detection friction/false positives and restricted use cases.
- **Reconsider when:** A separately funded legal/privacy/security/clinical programme approves regulated-health support.

## ADR-023 — Six vertical product slices

- **Context:** Infrastructure-first phases delay user value and obscure integration risk.
- **Decision:** Deliver Secure Foundation, Human Discovery, Requirements/Approval, Agile, Controlled Codex, Change/Release.
- **Alternatives:** Layer-by-layer backend/frontend/infrastructure; all-at-once build week.
- **Benefits:** Demonstrable exits, earlier feedback, traceable risk reduction.
- **Costs:** Some foundation work repeated/extended as later needs appear.
- **Reconsider when:** Dependency evidence requires moving a task earlier; preserve slice exit value and record justification.

## ADR-024 — AGPL-3.0 self-hostable core

- **Context:** Product must be truly open source/self-hostable while supporting a future company/service.
- **Decision:** All core journeys and initial integrations under AGPL-3.0. Hosted operations, enterprise identity/provisioning, regional isolation, compliance packs, and support may be commercial additions.
- **Alternatives:** Apache-2.0; proprietary/open-core core features; source-available licence.
- **Benefits:** User freedom/self-hosting and protection against closed network-service forks.
- **Costs:** Some enterprise contributors/adopters may avoid AGPL; contributor licence/governance needs care.
- **Reconsider when:** Founder/legal/community review identifies a concrete adoption or business-model failure; never describe a non-open licence as open source.

## ADR-025 — Better Auth at the Fastify authentication boundary

- **Context:** The first implementation needs secure self-hosted passwordless authentication, database-backed revocable sessions, passkeys or TOTP, recent reauthentication, Drizzle/PostgreSQL support and a clean Next.js-to-NestJS/Fastify separation. Authentication was previously both committed and listed as unresolved.
- **Decision:** Pin Better Auth core and every first-party Better Auth package to `1.6.23` (same exact patch) for the initial implementation. Mount its [official Fastify handler](https://better-auth.com/docs/integrations/fastify) directly under the API authentication route; do not depend on the community-maintained NestJS integration or use the Better Auth organisation plugin for tenancy/authorisation. Use the official [Drizzle adapter](https://better-auth.com/docs/adapters/drizzle) with PostgreSQL and database-backed [sessions](https://better-auth.com/docs/concepts/session-management), with cookie caching off so revocation is checked on every request. Default onboarding/sign-in uses the [magic-link plugin](https://better-auth.com/docs/plugins/magic-link) with `storeToken: "hashed"`; support the official [passkey](https://better-auth.com/docs/plugins/passkey) and [TOTP/2FA](https://better-auth.com/docs/plugins/2fa) plugins. Every verified Better Auth session becomes an internal application principal. High-Assurance actions require an app-owned tenant-aware `reauthentication_grants` record produced after passkey user verification and bound to principal, current session, exact action and subject/snapshot hash; it is one-use and expires within 15 minutes. TOTP may be an explicit policy fallback, but passwordless sign-in is not automatically challenged by the TOTP plugin. Better Auth `updateAge` renews expiry and is not token rotation; account recovery or privilege changes revoke the old session and require a new authentication/session. Better Auth stores a session lookup token in its database session row and documents no hashing option at this version, so this is a narrow accepted sensitive-storage exception protected by minimum database access, encryption at rest, redaction/no export and short/revocable sessions. Organisation/project authorisation, approval eligibility and PostgreSQL RLS remain application-owned and independent. Future OIDC, SAML and SCIM integrations sit behind the same identity adapter.
- **Alternatives:** Self-hosted Keycloak/OIDC from the outset; a managed identity vendor; a custom authentication implementation; the community NestJS Better Auth wrapper.
- **Benefits:** Official Fastify, Drizzle/PostgreSQL, magic-link, passkey, TOTP, session-freshness and revocation capabilities satisfy the initial controls while preserving self-hosting and avoiding unstable framework glue; the app-owned grant makes recent reauthentication exact-action/version bound.
- **Costs:** Better Auth schema/plugin upgrades require reviewed migrations; direct Fastify integration needs careful cookie/body/CORS handling; token-value rotation is not supplied by `updateAge`; the database session lookup token needs a documented narrow exception; High-Assurance grants/internal-principal evidence remain application logic; enterprise federation/provisioning is not initial scope.
- **Reconsider when:** A supported upgrade removes a required security control, official adapters cannot meet production reliability, or validated enterprise federation requirements justify another provider behind the existing identity interface. Do not couple application authorisation or RLS to the replacement.

## ADR-026 — Active execution work-item claims prevent overlapping cycles

- **Context:** One-cycle-per-execution-plan-version prevents replay of one approval but does not prevent different approved plan versions from concurrently modifying the same Agile work item.
- **Decision:** Add tenant-owned `execution_work_item_claims` with `work_item_id`, `execution_cycle_id`, `claimed_at`, nullable `released_at` and `release_reason`, plus a partial unique index on `(organisation_id, work_item_id) WHERE released_at IS NULL`. During `authorising`, lock the cycle and selected work items in deterministic order, recheck authority, and insert every claim in the same transition/audit/outbox transaction. Any conflict rolls the authorisation transaction back to `requested`, then a separate idempotent transaction records the denial audit/outbox; it leaves no partial claim, capability or environment. Claims remain active through queued/provisioning/running, checkpoint wait, human input, testing, reporting, awaiting required review and `recovery_required`. Release reasons are exactly `required_review_completed`, `safely_cancelled`, `authorised_failure_recovery`, and `authorised_change_removed_work`; no other reason or direct update is valid. Claim acquisition/release is always audited and emitted through the outbox. Repository-path overlap is a warning/future enforcement extension and never substitutes for the initial work-item constraint.
- **Alternatives:** Application-only preflight query; lock only the execution-plan version; release at checkpoint/report generation; prevent overlap only by repository path.
- **Benefits:** Database-enforced race safety, understandable work ownership, deterministic duplicate behaviour and no overlapping Codex work on the same approved unit.
- **Costs:** Claims can intentionally block new work during long reviews or recovery; operators need explicit recovery/release tooling and monitoring; work-item removal becomes an authorised transition.
- **Reconsider when:** A future scheduler safely models shared/read-only work or repository-path conflicts with equivalent database-enforced authority and historical evidence. Never silently release claims from `recovery_required`.
