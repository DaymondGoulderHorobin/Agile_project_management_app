# Testing Strategy

Status: Proposed
Quality model: invariants and complete user journeys over shallow coverage percentages

## Objectives

- Prove tenant, permission, evidence, version, approval, execution, and release integrity.
- Detect concurrency and at-least-once delivery defects before production.
- Verify AI proposals are structured, attributable, evidence-aware, and human-governed.
- Verify the runner fails closed across every authority, scope, limit, crash, and cleanup path.
- Demonstrate usability for a non-technical guest on desktop/mobile with assistive technology.
- Prove self-host install, migration, backup, restore, upgrade, export, and deletion.
- Prove the planning specification remains internally consistent through one repeatable local/CI documentation-validation command (`NFR-011`).
- Reproduce a fair, immutable Direct-to-Codex versus platform-assisted comparison (`DEMO-001`).

## Test stack

- Vitest for TypeScript unit/domain/component tests.
- Testing Library for accessible React behaviour.
- Testcontainers for the supported PostgreSQL, Redis, and MinIO/S3-compatible services.
- Nest/Fastify injection plus real database for API integration.
- Better Auth `1.6.23` official Fastify-handler contract tests with real Drizzle/PostgreSQL session storage; keep every Better Auth package on the same patch and do not use the community NestJS adapter or Better Auth organisation plugin as an application boundary.
- Playwright for browser journeys, mobile viewports, keyboard, downloads, SSE, and multi-user sessions.
- axe-core for automated accessibility; NVDA/VoiceOver or equivalent manual screen-reader scripts.
- MSW or contract fixtures for frontend-only provider states; provider adapters have real sandbox smoke tests separately.
- k6 or equivalent for HTTP/SSE/load scenarios.
- OWASP ZAP baseline/targeted DAST, dependency/secret/container/IaC scanning, and static analysis.

SQLite/PGlite do not replace PostgreSQL tests because RLS, locking, constraints, transaction semantics, and SQL behaviour are product-critical.

## Test pyramid and ownership

### Unit tests

Fast, deterministic tests for:

- permission predicates and project-mode defaults;
- canonical JSON/hashing and schema versions;
- artifact/evidence relationship validation;
- approval policy evaluation, role aggregation, distinct principals, conditions, staleness;
- readiness rules and explanations;
- change classification precedence and impact graph units;
- runner transition guards, capability scope, path/network rules, limit calculations;
- active execution work-item claim acquisition/release eligibility and graceful-shutdown configuration bounds;
- idempotency key derivation, retry classification, event redaction;
- AI output/source validation and origin conversion;
- release evidence completeness.

### Domain invariant tests

Use table-driven and property-based cases where useful:

- immutable submitted evidence/version/decision cannot be updated;
- superseding records remain in same tenant/project/type relationship;
- artifact version hashes are stable for equivalent canonical payloads;
- no request is approved without all valid requirements;
- AI/system/integration/operator actor cannot approve;
- one execution-plan version maps to at most one cycle;
- at most one active `execution_work_item_claims` row exists per `(organisation_id, work_item_id)` and a `recovery_required` cycle cannot silently release it;
- no illegal cycle/environment transition;
- no `completed` cycle without required test/review results;
- highest matching change class wins;
- release includes exact immutable evidence.

### Database and migration tests

- Apply migrations from empty and each supported prior release.
- Drizzle schema/migration drift detection.
- All PK/FK/unique/check/partial-index constraints.
- Cross-tenant composite FK rejection.
- RLS under the actual application database role.
- `SELECT FOR UPDATE`, optimistic `lock_version`, unique cycle/idempotency races, and simultaneous overlapping-work authorisation against the active-claim partial unique index.
- Outbox claim with `SKIP LOCKED`, retry/dead-letter, and inbox dedupe.
- Canonical hash fixtures across code and persisted payload.
- Expand/backfill/switch/contract compatibility and interrupted backfill resume.

### API contract tests

- Generated OpenAPI matches Zod routes and versioned error/event schemas.
- Better Auth magic-link `storeToken: "hashed"`, passkey and TOTP sign-in/enrolment/recovery; database-backed session renewal/freshness, immediate revocation with cookie cache off, CSRF/trusted-origin handling, direct Fastify routing, internal-principal conversion, and application authorisation on every operation. Prove `updateAge` does not rotate the lookup token; recovery/privilege change revokes the old session and requires a new authentication. Treat the database session lookup token as a narrow sensitive-storage exception and assert it never appears in logs, exports, audit, telemetry or ordinary backups without encryption/access controls.
- `Idempotency-Key` same request returns same result; changed body with same key rejects.
- `ETag`/`If-Match` conflicts return `409` and preserve data.
- Pagination/order/filter tenant safety.
- SSE event type/version/resume and guest filtering.
- Webhook raw signature, replay, out-of-order, malformed payload, unknown tenant/repo/provider.
- Backwards-compatible fixtures for supported API/webhook versions.

## Tenant-isolation test suite

Create Organisation A/B, multiple projects, members, guests, artifacts, attachments, approvals, jobs, cycles, audit, and integration records. For every tenant-owned repository/API/query/job:

1. correct tenant/permission succeeds;
2. wrong tenant returns not-found/denied without existence leak;
3. missing RLS context returns no tenant rows;
4. forged tenant ID fails composite FK/RLS;
5. shared user with different memberships sees only permitted records;
6. guest cannot enumerate members/settings/unassigned data;
7. revoked membership/session/link loses access immediately;
8. worker job with stale/forged context rehydrates and rejects;
9. search/export/notification/SSE/object URLs remain tenant scoped;
10. application runs as non-owner/no-`BYPASSRLS` role.

These tests block every slice release and satisfy `SC-12`.

## Approval and concurrency test matrix

- Light role aggregation satisfies multiple eligible requirements exactly once.
- Standard/High-Assurance distinct-principal group rejects the same reviewer twice.
- High-Assurance creates a tenant-aware, one-use `reauthentication_grants` row only after passkey user verification; it is bound to principal, current session, action and exact subject/snapshot hash, expires within 15 minutes, rejects replay/wrong action/hash/session/tenant, and is consumed atomically with the protected decision. TOTP is tested only where the selected policy explicitly permits that fallback; passwordless sign-in is never assumed to have triggered it.
- A decision on the exact snapshot referenced by a current approval request succeeds; a `stale` approval request fails atomically. The immutable snapshot and prior decisions remain unchanged historical evidence.
- Concurrent final decisions produce one correct request state.
- New relevant artifact version racing a decision leaves request stale, never falsely approved.
- Conditions required/optional/resolved and approval-with-conditions calculation.
- Membership/role loss before execution invalidates future use but preserves historical decision.
- AI/system/integration/operator actor structurally rejected.
- Reviewer UI displays exact version, diff, dependencies, blockers, outstanding parties, and four decisions.
- Absence of the Legal electronic signature module does not block any Project approval journey (`SC-15`).

## Queue, retry, and event tests

- Redis unavailable before/after commit: outbox intent remains and republishes.
- Duplicate BullMQ delivery: inbox/idempotency prevents duplicate domain/external effect.
- Worker crash after external call before result commit: reconciliation finds and records result.
- Exponential backoff/jitter and permanent/transient classification.
- Dead-letter creates visible recovery state/alert.
- Outbox ordering by aggregate where required; unrelated aggregates may parallelise.
- Notification/email dedupe; webhook event delivery dedupe.
- Cancellation wins safely against queued/running jobs.

## AI evaluation and prompt regression

### Required assertions

- Output conforms to selected structured schema or reports explicit refusal/failure.
- Every returned source ID exists, belongs to authorised project, and was in input manifest.
- AI content uses `ai_generated`; edited accepted content uses `ai_generated_human_edited`.
- Human, imported, and system-created fixtures remain visibly and accessibly distinguishable as `human_authored`, `imported`, and `system_generated` throughout lists, diffs, approvals, exports, and provenance queries.
- Unsupported certainty, invented facts, and evidence contradictions are flagged.
- Human content is not relabelled as AI and vice versa.
- No AI output creates approval, authority, membership, runner capability, or release decision.
- Prompt/provider logs do not contain configured secrets or quarantined patient-identifiable content.

### Evaluation datasets

- Clear chiropractor business/process responses with expected requirements.
- Ambiguous, incomplete, conflicting, and corrected responses.
- Generic health-domain examples with no identifiable person.
- Inputs containing obvious and subtle patient identifiers, which must warn/withhold/quarantine.
- Prompt-injection text embedded in sources.
- Multi-language/time-zone and long evidence cases.
- Refusal, rate-limit, timeout, malformed output, cancellation, and duplicate webhook cases.

### Release gate

Prompt/model/schema changes run fixed fixtures and human-rated samples. Gate on schema/source validity and no authority/origin/health-boundary regression. Quality, edit burden, latency, and cost thresholds are versioned per use case rather than one universal score.

## Complete runner lifecycle tests

### Happy path

1. Approved execution-plan version creates one `requested` cycle.
2. `authorising` locks/rechecks and atomically acquires every selected active work-item claim before committing queued/grant/audit/outbox. One conflicting active claim rolls the authorisation transaction back to `requested`; a separate idempotent denial transaction writes audit/outbox and proves there is no partial claim, capability or environment.
3. Environment provisions exact repository/commit/branch/mount/network/tool/secret policy.
4. Codex activity streams with ordered safe events and atomic usage.
5. Planned checkpoint stops and revokes/suspends authority.
6. Human continuation plus authority recheck resumes same cycle.
7. Required tests run, report generated, commit/PR where permitted.
8. Capability/secrets revoke, environment destroys, reviews requested.
9. Required reviews allow `completed`, release all active claims with audit/outbox in the review-completion transaction, and no earlier state displays complete.

### Authority and scope failures

- Approval revoked or made stale before authorisation: cancel/no capability.
- Revocation appends invalidation evidence without rewriting the original decision/request result; a new approval request is required to regain authority.
- Approval revoked after capability issuance but before `runner.start`: revoke, never start Codex, cancel, and clean up.
- Approval/member authority lost after queue/provision/start/checkpoint: stop/cancel and preserve evidence.
- Active claims remain held through `checkpoint_waiting`, `human_input_required`, `testing`, `reporting`, `awaiting_review`, and `recovery_required`; `released_at` may be set only with `required_review_completed`, `safely_cancelled`, `authorised_failure_recovery`, or `authorised_change_removed_work`.
- Repository installation/access/base commit/branch protection change before/during run.
- Affected material/fundamental change; unrelated change continues with audited impact result.
- Normal path traversal, absolute path, symlink/junction escape, case/Unicode/alternate separator edge cases.
- Blocked network host/IP/port, DNS rebinding/redirect, local metadata/private ranges.
- Tool absent/denied and secret request absent/wrong purpose/expired/revoked.
- Capability wrong environment/cycle/tenant/scope, expired/replayed/renewed after revocation.

### Limits, stop, and recovery

- Turn, task, input/output token, cost, time, and concurrent scope counters at boundary/race.
- Checkpoint and human-decision stop.
- Test failure produces `awaiting_review` and may become `failed` only after review; it never becomes `completed`.
- Crash during provisioning/start retries up to three before side effects.
- Crash after file/commit side effect preserves workspace/patch and enters `recovery_required`; no auto-rerun.
- Cancellation at every active/suspended state; capability revoke precedes signal.
- Graceful cancellation completes; timeout hard-kills after validated `runner_graceful_shutdown_seconds` (default 30). Configuration accepts 5 and 120, rejects values outside 5–120, and tests both just-before and at/after-deadline signal races.
- Cleanup repeated when environment exists/already absent/partially removed.
- Cleanup failure revokes secrets, raises alert, enters recovery; manual runbook returns to valid state.
- Safe cancellation releases claims only after runner termination and cleanup reach the authorised cancellation terminal condition; cleanup/recovery ambiguity retains claims.

### Idempotency/external effects

- Duplicate cycle request returns same cycle due unique execution-plan version.
- Competing cycle versions selecting the same work item produce one authorisation winner and one safe claim conflict returned to `requested`; the denial has exactly one audit/outbox pair and no capability, runner, partial claim, audit gap, or duplicate effect.
- Duplicate stage jobs do not provision twice.
- Branch/commit/push/PR intent reconciles before retry; one PR maximum.
- Duplicate/out-of-order runner events rejected or reconciled by sequence.
- Duplicate provider usage event does not double-charge.

### Audit/outbox assertions

Every transition/failure produces expected state, stop reason, safe audit event, versioned outbox event, correlation/causation, and no secret/raw prohibited content. Tests assert the transition and audit/outbox commit or roll back together.

## End-to-end browser journeys

### Canonical demo

Automate `DJ-01`–`DJ-22` from [Demo Journey](13-demo-journey.md) using two browser contexts and real PostgreSQL/Redis/MinIO, stubbed/evaluated OpenAI where appropriate, GitHub test installation or faithful contract sandbox, and isolated demo runner.

Verify problem → question → answer → evidence → requirement → plan approval → sprint → execution approval → Codex/checkpoint → tests → developer/stakeholder review → release trace.

Run the controlled `DEMO-001` comparison from the same clean seed. Hold the original idea, synthetic fixture repository/base commit, model/profile, task limits and scoring rubric constant; persist an immutable Direct-to-Codex result before discovery and an immutable platform-assisted result after `DJ-22`. Assert the results screen/report exposes unsupported assumptions, missing requirements, unasked domain questions, missing acceptance criteria, stakeholder corrections, requirements discovered, assumptions prevented, acceptance-criterion coverage, correction count, stakeholder-confidence scores, and requirement-to-code-to-test traceability. The baseline is visibly an evaluation result, cannot be approved/released/merged, and cannot be mistaken for an authorised execution cycle.

### Additional journeys

- Expired/revoked guest invitation and safe replacement request.
- AI output correction and source contradiction.
- Stale project-plan approval after material edit.
- High-Assurance distinct reviewer/reauthentication.
- Material change during active cycle and new execution plan.
- Failed tests/request changes/next cycle.
- Tenant export/deletion and archived history.
- Self-host install/upgrade/backup/restore.

## UX, accessibility, and responsive testing

### Automated

- Playwright at desktop and 360 CSS px for core stakeholder flows.
- No horizontal page scroll except intentionally scrollable data components with accessible alternatives.
- axe-core: zero serious/critical violations.
- Keyboard: logical focus order, visible focus, skip links, no trap, all decisions/forms/diffs/events operable.
- Status/live regions announce autosave, validation, AI generation, state/stop changes without excessive repetition.
- Screen-reader accessible origin badges, evidence links, tables, diffs, errors, approval state, and cycle state.

### Representative usability

At least five representative non-technical participants attempt secure invite, next action, question answer/draft return, evidence-backed requirement review, operational approval, and plain-language Codex review. At least four complete without facilitator intervention. Record completion, errors, hesitation, time, misunderstanding, and accessibility needs; blocking misunderstandings are fixed and retested.

### Specific acceptance

- Invite to assigned action in no more than three screens.
- Autosave acknowledgement within two seconds under normal test conditions.
- Evidence for AI requirement within one interaction.
- Stale approval visibly disabled with current-request link.
- Only `completed` cycle uses completed language/styling.
- Light mode hides advanced controls but never hides required evidence/decisions.
- Demonstration comparison labels both cohorts, method, immutable input/result hashes and limitations; tables/charts have accessible text equivalents and never imply the baseline was approved work.

## Healthcare boundary tests

- Onboarding/template/data-entry/upload/AI warning presence and accessible wording.
- Safe general knowledge and generic scenarios proceed normally.
- Patient name/contact/treatment-history/clinical-document/patient-linked-image fixtures warn and block/quarantine as configured.
- Quarantined content never reaches AI provider stub, search index, email, notification text, audit payload, or normal object URL.
- Incident access restricted; URL revoked; pending jobs cancelled; safe metadata audited.
- Purge removes active object/content and records backup/provider residual status.
- False-positive override, if allowed, requires authorised privacy administrator and rationale.
- Tests state filtering is not a compliance guarantee.

## Security testing

- SAST, dependency licence/vulnerability, secret, container, and IaC scans in CI.
- Authentication/authorisation/RLS/CSRF/XSS/SSRF/rate-limit/upload/webhook tests.
- Fuzz external Zod/webhook/Markdown/file metadata boundaries.
- Runner threat-focused penetration testing before production use.
- Independent review before any managed hostile multi-tenant runner.
- Security regression test for every validated finding.

## Performance and resilience

Initial targets are validated under representative hundreds-of-organisations data:

- Common authorised reads/writes meet product-agreed p95 targets without unbounded queries.
- Project overview/next action avoids N+1 and remains usable with 10–20 participants and realistic artifact/activity counts.
- SSE reconnect/fanout remains tenant safe.
- Outbox/queue backlog recovers after dependency outage without duplicate effects.
- AI/runner work does not starve API/notification queues.
- PostgreSQL connection pool remains bounded across API/workers.
- Object uploads respect quotas/timeouts and do not buffer unbounded files in API memory.

Exact latency/throughput SLOs are a Slice 1 launch-blocking product/operations decision in [Open Questions](11-open-questions.md).

## Backup, restore, export, and deletion tests

- Scheduled encrypted DB/object backup freshness and integrity.
- Restore into isolated environment, migrate if required, reconcile object hashes, and run tenant/RLS/demo smoke suite.
- Quarterly documented restore drill before public launch.
- Tenant export completeness, manifest/hash verification, and cross-tenant exclusion.
- 30-day organisation quarantine, revocation, purge, object/key deletion, and backup-expiry record.
- Prohibited-content expedited purge separately verified.

## Self-hosted topology tests

- Install the documented application Compose topology on a clean supported Linux host and the runner provisioner on a separately authenticated host/provider boundary.
- Prove that the application host cannot directly enter a runner workspace and the runner cannot reach PostgreSQL, Redis, MinIO administration, or application secrets except through its exact capability/API paths.
- Validate TLS/mutual control authentication, firewall/egress rules, secret bootstrap/rotation, health probes, upgrade/rollback and complete runner destruction.
- Run the full demonstration and backup/restore smoke after a clean install and supported-version upgrade.
- A single-host development/reduced-isolation layout does not satisfy production controlled-execution acceptance under `SC-14`.

## Documentation validation gate

`pnpm docs:validate` is the single repeatable local and CI entry point required by `NFR-011`. It must exit non-zero, identify the file/identifier/state involved, and have positive/negative fixture tests for:

1. broken Markdown and local file links;
2. Mermaid parse/render syntax where the CI renderer supports it, with balanced-fence validation always required;
3. duplicate requirement IDs and duplicate backlog IDs;
4. missing requirement references and missing demo-step references;
5. non-canonical project-workflow, execution-cycle and runner-environment state names;
6. non-canonical approval decisions, approval-request states, stop reasons, origin labels and other dossier-owned enum values;
7. accidental wording that makes a Legal electronic signature an initial-release requirement, schema dependency, slice deliverable, demo gate or success condition;
8. Markdown formatting errors and trailing whitespace.

The command scans the whole repository for documentation links while treating `docs/planning/` as the authority for dossier identifiers and canonical vocabularies. The CI workflow runs it on every pull request and protected-branch update; bypass requires the same documented exception process as another blocking integrity test. CI configuration calls the repository command rather than embedding a divergent checker.

## Definition of test completion

- All introduced requirement IDs have automated or documented manual evidence.
- All runner failure-matrix rows are automated where technically possible and manually rehearsed otherwise.
- Full demo passes from clean seed and supported upgrade state.
- The immutable `DEMO-001` baseline comparison passes fairness, completeness, accessible-presentation and no-authority-confusion assertions.
- Tenant isolation, approval integrity, healthcare boundary, and no-false-completion suites are blocking.
- `pnpm docs:validate` passes locally and in CI, including its deliberate failure fixtures.
- Flaky tests are quarantined only with owner/issue/deadline and cannot cover a blocking invariant.
- Test evidence links into slice/release records and is understandable to technical and stakeholder reviewers.
