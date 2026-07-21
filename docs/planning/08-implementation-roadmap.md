# Implementation Roadmap

Status: Proposed
Delivery model: six vertical, demonstrable product slices

## Roadmap rules

- A slice is complete only when its user journey works through UI, API, domain, database, security, audit, and tests.
- Infrastructure is introduced inside the first slice that needs it, not as disconnected platform work.
- Every tenant feature ships with RLS and negative permission tests.
- AI is never accepted as correct without proposal status, evidence validation, human review, and evaluation coverage.
- The Legal electronic signature module is not part of any initial slice.
- Each slice has one demo checkpoint; [Demo Journey](13-demo-journey.md) accumulates across slices.
- Repository CI runs repeatable documentation validation for links, Mermaid syntax where practical, unique requirement/backlog IDs, referenced requirement/demo IDs, canonical states/enums, accidental initial Legal electronic signature dependencies, Markdown formatting, and trailing whitespace.

## Slice 1 — Secure project foundation (`EPIC-S1`)

### Outcome and user value

A user can securely create an organisation and project, invite a full member, and access only authorised organisation/project data. The product has a usable shell, tenant boundary, audit trail, and reliable event foundation.

### User journeys

- Register/sign in through Better Auth magic link or passkey, create organisation, create Light-mode `general_business` project.
- Invite/accept a member invitation.
- View personal inbox, organisation dashboard, project overview, and members.
- Revoke membership/session and observe immediate access loss.

### Requirements delivered

`FR-001`–`FR-004`, `FR-043`, `FR-045`, `SEC-001`–`SEC-005`, `SEC-008`–`SEC-012`, `NFR-001`–`NFR-005`, `NFR-009`–`NFR-011`, foundation for `SC-12` and `SC-14`.

### Domain modules

Identity, Organisations, Projects, Platform Reliability, initial Collaboration, Security & Privacy.

### Database changes

- Better Auth user/account/database-backed session/verification/passkey/TOTP tables mapped through the reviewed Drizzle/PostgreSQL schema, plus tenant-aware one-use `reauthentication_grants`; application principal and authorisation records remain separate.
- `organisations`, organisation/project memberships and role/grant tables.
- `projects` with project mode and `general_business` classification.
- `invitations`, `audit_events`, `outbox_events`, `inbox_events`, `idempotency_records`.
- Tenant-aware composite keys, RLS policies, transaction-context helpers.

### API contracts

- Better Auth authentication/session/revocation endpoints mounted directly on Fastify; authenticated requests convert the verified Better Auth session into the internal application principal used by NestJS application services. A separate command issues a one-use, action/exact-subject-or-snapshot-bound `reauthentication_grant` after passkey user verification.
- Organisation/project/member/invitation commands and reads.
- `/api/v1` error, idempotency, pagination, optimistic concurrency, audit-event contracts.
- Project event SSE foundation.

### Screens

Sign in, onboarding, organisation dashboard, project create/overview, member invitation/acceptance, personal inbox shell, project/organisation settings shell, audit view.

### Background jobs

Outbox relay, in-app notification creation, SMTP invitation delivery, invitation/session expiry, dead-letter visibility.

### AI functions

None. Define provider ports/config validation only if needed by repository architecture; do not call providers.

### Security checks

- Missing/wrong tenant context, IDOR, cross-tenant FK, membership revocation.
- Token hashing/single-use/expiry, session rotation/revocation, CSRF/origin, rate limit.
- Database-backed Better Auth session freshness, magic-link `storeToken: "hashed"` and single use, passkey/TOTP enrolment/recovery, immediate revocation with cookie caching off, app-owned action/snapshot-bound step-up grants (one use, no more than 15 minutes), and internal-principal conversion. Treat Better Auth `updateAge` as expiry renewal, not token rotation; recovery/privilege changes revoke the old session and require full reauthentication. The database session lookup token is a documented narrow storage exception: restrict DB access, redact logs/exports/backups and apply encryption at rest rather than claiming it is hashed.
- Safe audit metadata and secret/config validation.

### Automated tests

- Domain permission/membership invariants.
- PostgreSQL integration tests with real RLS application role.
- API contract and idempotency tests.
- Better Auth magic-link hashing, passkey/TOTP, action/snapshot-bound recent-reauthentication grants, forced session replacement after recovery/privilege changes, revocation, cookie-cache-off behaviour, CSRF/trusted-origin, Fastify boundary, sensitive session-token redaction, and internal-principal adapter tests. Tests explicitly prove `updateAge` alone is not rotation.
- Playwright organisation/project/invite flows at desktop/mobile.
- Accessibility scans and keyboard path.
- Documentation validation through the same command used in CI.

### Manual verification

Two browser profiles create separate organisations, attempt cross-access, invite/revoke a member, inspect audit/outbox, restart Redis/worker, and verify durable intent recovers.

### Demo checkpoint

Developer signs in, creates organisation and chiropractor project, sees `general_business` health-data warning, and invites a member. Guest-specific participation waits for Slice 2.

### Exit criteria

A user securely creates an organisation/project, invites a member, and accesses only authorised organisation data. Tenant isolation, audit/outbox recovery, mobile/keyboard path, and local Compose startup pass.

### Dependencies

The preserved stack is sufficient for repository/tooling work. Better Auth `1.6.23` is the selected self-hosted authentication implementation under `ADR-025`; all Better Auth packages use that exact patch, its official Fastify handler is mounted directly, and neither the community NestJS integration nor Better Auth organisation plugin is used. SMTP credentials are needed only for production delivery integration tests, and future OIDC/SAML/SCIM providers remain behind the internal identity adapter.

### Human decisions required

Approval of the Better Auth configuration/session policy and the first tenancy/RLS threat model blocks the Slice 1 security exit; the authentication-library selection itself is closed. Product name/domain, initial SMTP production provider, operator backup targets, and final GitHub repository conventions do not block local foundation work.

### Architectural risks

Better Auth schema/version drift, the database-held session lookup token exception, Fastify cookie/origin integration, passwordless-to-MFA/step-up policy gaps, RLS context leakage through pooling, over-broad admin roles, and premature generic module infrastructure.

### Verification burden

High: tenancy/auth form the security base for every later slice.

### Mechanically implementable Codex work

Workspace configuration, typed config, Better Auth/Drizzle mappings after reviewed schema, standard controllers/forms, test fixtures, CI and documentation-validation tasks. Human review is required for auth/RLS/permission/migration logic.

## Slice 2 — Human knowledge discovery (`EPIC-S2`)

### Outcome and user value

A developer and non-technical domain expert contribute questions/answers, and the system preserves their knowledge as traceable immutable evidence.

### User journeys

- Developer invites a project-scoped guest via secure link.
- Guest lands directly on assigned questions, drafts/saves/returns, submits answers.
- Both participants add questions/comments; AI suggests labelled questions/follow-ups.
- Responses become knowledge sources/fragments; corrections supersede originals.

### Requirements delivered

`FR-005`–`FR-012` and `FR-042`; this slice consumes the Slice 1 audit foundation for `FR-043`. It also delivers `HC-001`–`HC-008`, `UX-001`–`UX-009`, `UX-017`–`UX-020`, `SC-01`–`SC-03`, `SC-11`, and `SC-13`.

### Domain modules

Projects, Discovery, Knowledge & Evidence, Collaboration, Attachments, AI Assistance, Security & Privacy.

### Database changes

Guest membership/grants; questions/assignments/drafts/responses; knowledge sources/fragments/relationships; comments/mentions/notifications; attachments and prohibited-content incidents; AI jobs/outputs/usage/model profiles.

### API contracts

Guest invitation/session and next-action APIs; question/assignment/draft/submit/correction commands; source/fragment/evidence reads; comments/mentions; AI suggestion jobs/status/cancel; attachment intent/quarantine.

### Screens

Guest invitation, focused next-action dashboard, discovery workspace, questions, response editor, knowledge/evidence, comments, notifications, health-data guidance/quarantine message.

### Background jobs

Question suggestions/follow-ups, source-fragment creation, attachment validation/scan, prohibited-content incident response, email/in-app notifications, AI reconciliation/usage.

### AI functions

Suggested and follow-up questions only. Use structured output, origin, rationale, source references, input filtering, budgets, and human publication.

### Security checks

Guest project/object scope, expired/revoked link, autosave ownership, immutable submission, source provenance, attachment signed access/quarantine, prompt minimisation/filtering, AI output tenant/source validation.

### Automated tests

- Guest permission matrix and negative enumeration.
- Token replacement/revocation/session return.
- Draft concurrency/autosave and immutable supersession.
- AI schema/origin/source-ID/refusal/retry/cancel/evaluation.
- Upload type/size/malware-hook/quarantine and prohibited-content handling.
- Full responsive/keyboard/screen-reader guest flow.

### Manual verification

Developer and representative non-technical participant complete invite, questions, return-later, answer, correction, comment, AI proposal, evidence view, and health warning/quarantine cases.

### Demo checkpoint

Complete `DJ-01`–`DJ-08`: project entry, guest access, human/AI questions, answers, immutable evidence, and evidence review.

### Exit criteria

A developer and domain expert contribute questions/answers without external PM tools; evidence provenance/supersession works; AI is clearly a proposal; guest UX and healthcare boundary meet acceptance tests.

### Dependencies

Slice 1 tenancy, invitations, audit/outbox, SMTP, and UI shell.

### Human decisions required

Initial question templates and safe chiropractor examples; representative usability-test participants; content-filter warning copy.

### Architectural risks

Guest complexity, accidental health data, origin ambiguity, immutable evidence corrections, provider output/citation quality.

### Verification burden

High: non-technical UX, immutable knowledge, and data-boundary behaviour are central product proof.

### Mechanically implementable Codex work

CRUD/read models, forms, autosave, notification templates, schema validation, origin badges, AI adapters after prompt/eval design. Human judgment is required for UX language, prompt/evidence semantics, and incident policy.

## Slice 3 — Requirements and approval (`EPIC-S3`)

### Outcome and user value

The team generates, reviews, corrects, and operationally approves an evidence-backed exact project-plan version.

### User journeys

- AI proposes requirements, assumptions, risks, and acceptance criteria from selected evidence.
- Humans inspect evidence, edit/confirm proposals, record decisions, and create a plan version.
- Readiness explains missing inputs/conflicts/approvers.
- Required reviewers see exact version/diff and decide; a relevant change marks the approval request `stale` and invalidates the unchanged immutable snapshot's use as current authority.

### Requirements delivered

`FR-013`–`FR-025`, `UX-006`–`UX-012`, `SC-03`–`SC-05`, `SC-15`.

### Domain modules

Artifacts, Planning, Approvals, Readiness, Knowledge & Evidence, AI Assistance, Workflow.

### Database changes

Artifact root/versions/typed extensions/relationships/evidence links; plan versions/manifests; approval policies/versions/snapshots/requests/requirements/decisions/conditions; readiness rules/evaluations/results.

### API contracts

Artifact/version/evidence relationship commands; AI extraction jobs; plan version/create/submit; approval request/decision/condition; readiness evaluation; diff/version history; dependency/staleness reads.

### Screens

Requirements, assumptions/risks, decisions, acceptance criteria, artifact/evidence detail, plan editor/version history, readiness, plan review/diff, approval centre.

### Background jobs

Extraction, conflict/risk/criteria proposals; readiness evaluation; dependency impact/staleness; approval/condition notifications; AI evaluation and usage.

### AI functions

Requirement extraction, assumption/conflict/risk detection, acceptance criteria, plan summary/readiness explanation. All outputs remain proposals and cite exact fragments.

### Security checks

Version immutability/hash/canonicalisation, evidence tenant/version target, reviewer authority, distinct principals, MFA reauthentication for High-Assurance, concurrent decision/staleness race, AI ineligibility.

### Automated tests

Artifact/manifest/hash fixtures; evidence graph; policy evaluation/role overlap/distinct person; decision state calculation; staleness; concurrency; deterministic readiness; AI citation/source validation; approval UX/accessibility.

### Manual verification

Edit generated artifacts, compare versions, trace evidence, resolve conflict, approve with conditions, request changes, supersede a version, confirm the request becomes `stale` while its decision history remains immutable, and compare Light/High-Assurance behaviour.

### Demo checkpoint

Complete `DJ-09`–`DJ-12`: generated/corrected artifacts, evidence links, plan version, exact operational approval.

### Exit criteria

The team produces and approves an evidence-backed plan. No plan can be approved without configured reviewers; content changes stale dependent approval; the core works without a Legal electronic signature.

### Dependencies

Slices 1–2 identity, project, evidence, AI job, collaboration, audit/outbox.

### Human decisions required

Initial Light/Standard/High-Assurance policy and readiness rule content; exact semantic/non-semantic canonical fields.

### Architectural risks

Generic artifact overreach, canonical hash drift, polymorphic subject integrity, policy ambiguity, staleness races, misleading AI certainty.

### Verification burden

Very high: approval/version integrity is a central differentiator and execution prerequisite.

### Mechanically implementable Codex work

Typed version tables/controllers/views, deterministic rule plumbing, diffs, read models, notifications, test data. Human review is required for invariants, canonical payload, policy semantics, and AI evaluation.

## Slice 4 — Agile delivery (`EPIC-S4`)

### Outcome and user value

An approved project plan becomes a reviewed, traceable Agile backlog and sprint.

### User journeys

- AI proposes epics/stories/tasks from approved requirement versions.
- Humans edit hierarchy, dependencies, acceptance links, priority, and assignment.
- Team creates sprint goal, commits work, sees blockers/readiness, and approves sprint where configured.

### Requirements delivered

`FR-026`–`FR-029`, Agile presentation of the readiness information from `FR-018`, and traceability foundation for `SC-10`. This slice consumes, rather than re-owns, Slice 2 collaboration (`FR-042`).

### Domain modules

Agile Delivery, Artifacts, Planning, Approvals/Readiness, AI Assistance, Collaboration.

### Database changes

Iterations, work items, assignees, dependencies, artifact/acceptance links, iteration selection/order, optional sprint approval snapshot.

### API contracts

Backlog/work-item hierarchy, dependency, assignment, ordering, sprint create/commit/review, AI backlog proposal, requirement-to-work trace reads.

### Screens

Backlog tree/list, work-item detail, sprint planning, sprint board, dependency/blocker view, requirement trace panel, optional sprint approval.

### Background jobs

Backlog generation, dependency checks, readiness, sprint/assignment notifications, search projection updates.

### AI functions

Backlog proposals and plan summaries only; humans confirm all structure and estimates.

### Security checks

Project membership/action/stage permissions, tenant-aware hierarchy/dependencies, no cyclic dependency, version links, sprint approval staleness, AI proposal origin.

### Automated tests

Hierarchy/kind/parent constraints, dependency-cycle detection, ordering concurrency, traceability, sprint commitment/readiness/approval, board/keyboard/mobile/a11y.

### Manual verification

Generate and edit backlog, split/merge manually, create dependencies, commit sprint, test Light-mode defaults and Project approval under Standard mode.

### Demo checkpoint

Complete `DJ-13`–`DJ-14`: evidence-backed backlog and one sprint with goal/work/acceptance links.

### Exit criteria

An approved project plan converts into a human-reviewed Agile sprint with exact requirement and acceptance traceability.

### Dependencies

Slice 3 approved plan/artifact versions and proposal/approval infrastructure.

### Human decisions required

Initial work-item field set, sprint policy defaults, and product-specific AI backlog evaluation fixtures.

### Architectural risks

Overbuilding a Jira clone, ambiguous completion semantics, dependency/order concurrency, generated task bloat.

### Verification burden

Medium-high: traceability and usable planning matter more than advanced board features.

### Mechanically implementable Codex work

Work-item/sprint CRUD, drag/order mechanics with tests, trace panels, proposal conversion, board views. Human judgment is required for minimal workflow/UX and completion policy.

## Slice 5 — Controlled Codex execution (`EPIC-S5`)

### Outcome and user value

Codex completes one approved restricted unit of work, stops at a checkpoint, runs tests, preserves/report changes, and requests human review without exceeding authority.

### User journeys

- Connect GitHub.com repository through GitHub App.
- Prepare/version/approve an execution plan from sprint work.
- Start one idempotent cycle, observe safe activity, checkpoint, resume/cancel, tests/report/PR.
- Developer reviews technical evidence; domain expert reviews plain-language behaviour.

### Requirements delivered

`FR-030`–`FR-038`, all `RUN-001`–`RUN-013`, `DEMO-001`, `UX-013`–`UX-016`, `SC-06`–`SC-09`, execution portion of `SC-10`.

### Domain modules

Repository Integration, Execution Control, Runner Control, Testing, Approvals, Agile, Collaboration, Platform Reliability.

### Database changes

GitHub integrations/installations/repositories/access/webhook inbox; all execution-plan/cycle/capability/environment/agent/checkpoint/usage/test/report/review/code-change tables in [Data Model](03-data-model.md), including `execution_work_item_claims` and the partial unique active-claim constraint. Demo-only `demonstration_comparisons` and immutable `demonstration_comparison_results` store non-authoritative evaluation evidence.

### API contracts

GitHub installation/repository mapping; execution plan/version/approval/cycle; atomic work-item claim conflict/authorised release; cancel/pause/checkpoint decision; event SSE; report/activity/test/code/review; demonstration comparison query/report; runner internal capability/event/control contracts. A claim conflict returns the cycle to `requested` after rollback, with denial audit/outbox written idempotently in a separate transaction and no capability/environment.

### Screens

Repository settings, execution-plan editor/review, cycle status/plain summary, technical activity, scope/limits, checkpoint/human input, changed files/diff, tests, work report, technical/stakeholder reviews, and a read-only Direct-to-Codex versus platform-assisted demonstration results screen.

### Background jobs

Exactly: `execution.authorise`, `runner.provision`, `runner.start`, `execution.run-tests`, `execution.generate-report`, `execution.cancel`, `runner.cleanup`, `execution.request-review`, `execution.reconcile`; GitHub webhook/reconciliation and notification jobs.

### AI functions

Codex SDK execution and structured report generation. General AI may summarise but cannot control/approve runner state.

### Security checks

Approval/membership/repository recheck, atomic active work-item claim acquisition, claim retention through checkpoint/input/testing/reporting/required review/recovery, release only as `required_review_completed`, `safely_cancelled`, `authorised_failure_recovery`, or `authorised_change_removed_work`, opaque capability hash/scope/expiry/revocation, rootless isolation, exact commit/branch, real-path/symlink scope, default-deny network, tool/secret policy, atomic limits, event redaction/authentication, and cancellation/hard kill/cleanup. Validated configuration sets `runner_graceful_shutdown_seconds = 30` by default and accepts only 5–120 seconds.

### Automated tests

- Full canonical state-machine and transaction/outbox assertions.
- Duplicate request/job/webhook/branch/commit/PR tests.
- Concurrent overlapping-work authorisations permit exactly one active `execution_work_item_claims` row; duplicate, cancellation, review-completion, explicit work removal, failure/recovery-release, and `recovery_required` retention cases assert audit/outbox atomicity (`RUN-013`).
- Approval/member/repository/material-change revocation before/during run.
- Blocked file/symlink/network/tool/secret and limit tests.
- Crash before/after side effects, test failure, human input, cancellation at the default/configured grace boundary, configuration min/max rejection, cleanup failure/manual reconciliation.
- Controlled comparison fixtures hold the original idea/repository/base commit/model/limits constant and verify unsupported assumptions, missing requirements/questions/criteria, stakeholder corrections, confidence, and evidence-to-code-to-test coverage (`DEMO-001`).
- Plain/technical UX, SSE resume, no false completion, mobile/a11y.

### Manual verification

Run the demo repo through happy path plus each failure in the runner matrix. Inspect database/audit/outbox, external GitHub state, capability/secret revocation, environment inventory, patch preservation, and operator recovery.

### Demo checkpoint

Complete `DJ-15`–`DJ-20`: execution-plan approval, restricted Codex work, checkpoint, tests/report/PR as permitted, developer and stakeholder review. Capture the isolated Direct-to-Codex baseline and render the partial comparison; Slice 6 supplies the final release-trace result.

### Exit criteria

Codex completes an approved restricted unit, cannot exceed scope, cannot overlap an actively claimed work item, stops at checkpoint/limits, handles revocation/cancel/crash safely, destroys its environment, retains claims through required review/recovery, and returns evidence for human review. The controlled baseline comparison is reproducible and cannot be represented as approved or releasable work.

### Dependencies

Slices 1–4 plus GitHub App credentials and an approved runner isolation design/runbook.

### Human decisions required

Initial self-host runner technology/image, operator maximum limits/egress, GitHub App permissions, test demo repository, default stop/checkpoint policy. Managed multi-tenant isolation remains future.

### Architectural risks

Runner escape, cancellation/claim-release race, capability leak, repository side-effect duplication, event/redaction loss, unbounded cost, hostile tests/dependencies, cleanup failure, and biased/non-reproducible baseline comparison.

### Verification burden

Extreme: this is the highest-risk slice and must be adversarially tested before production use.

### Mechanically implementable Codex work

Contracts, adapters, lifecycle plumbing, event projections, read UIs, deterministic job handlers, fixtures. Human security review is mandatory for isolation, capability, paths/network/secrets, transitions, external side effects, and recovery.

## Slice 6 — Change control and release (`EPIC-S6`)

### Outcome and user value

The system safely processes a material change and produces an approved release record with complete requirement-to-release traceability.

### User journeys

- Stakeholder proposes and confirms minor/material/fundamental classification.
- System calculates affected versions, approvals, work, cycles, and release evidence.
- Team creates/reapproves versions and, where needed, performs another cycle.
- Release readiness verifies requirements, tests, reviews, limitations, risks, and approval.
- Team views the final Direct-to-Codex versus platform-assisted comparison with both immutable result sets and the complete platform trace.

### Requirements delivered

`FR-039`–`FR-041` and `FR-044`. This slice closes `SC-05`, `SC-10`, and `SC-14` and regression-verifies all company-version success criteria; it consumes rather than re-owns Slice 2 collaboration (`FR-042`), Slice 1 audit (`FR-043`), and the Slice 5 review capabilities behind `SC-09`.

### Domain modules

Change Control, Release, Artifacts, Planning, Approvals, Readiness, Agile, Execution, Testing, Collaboration, Security/Platform operations.

### Database changes

Change proposal/classification/impact/application records; release/version/inclusion/evidence tables; export/deletion/retention operational records; any final projection/index/partition tuning.

### API contracts

Change propose/classify/impact/approve/apply; release create/version/readiness/submit/approve; full trace/export; operator backup/restore/status contracts where appropriate.

### Screens

Change proposal/impact, affected approvals/work/cycles, release builder/readiness/review, evidence chain, limitations/risks, final demonstration comparison, audit/export/retention views.

### Background jobs

Impact traversal, approval-request staleness/cancellation orchestration, release verification, immutable demonstration-comparison finalisation, notifications, export/deletion, retention purge, backup status/reconciliation.

### AI functions

Advisory change classification/impact explanation and release summary. Human confirms class and approval; deterministic rules own readiness.

### Security checks

Conservative classification/downgrade audit, atomic/durable change application, no bypass of stale approvals, release exact-version proof, export/deletion permission and isolation, backup/restore and retention.

### Automated tests

All three change classes, impact graph, unrelated vs affected active cycle, approval-request invalidation, release evidence completeness, end-to-end trace, immutable/fair baseline comparison, export/purge/backup/restore, full demo regression, performance/accessibility/security suite.

### Manual verification

Perform material demo change, verify cycle stop/new approval, build release, inspect every trace link, export tenant, complete backup/restore drill and self-host upgrade rehearsal.

### Demo checkpoint

Complete `DJ-21`–`DJ-22`: change/review decision where needed, final release record with full evidence chain, and the completed Direct-to-Codex versus platform-assisted report defined by `DEMO-001`.

### Exit criteria

Material change processing and release proof work end-to-end; every `SC-01`–`SC-15` passes; production Compose/runbooks/backups/restore/security/UX release evidence is complete.

### Dependencies

All previous slices.

### Human decisions required

Public-launch privacy/security/legal review, retention/backup objectives, support/incident ownership, release policy, and acceptance of known limitations.

### Architectural risks

Impact graph omissions, partial change saga, false release readiness, retention/export deletion gaps, operational runbook drift.

### Verification burden

Very high: proves the product story and production operability rather than adding isolated features.

### Mechanically implementable Codex work

Graph traversal/projections, release views/reports, export tooling, runbook automation, regression fixtures after rules are decided. Human review is required for classification, retention, launch/security, and release policies.

## Parallel workstreams

Within a slice, bounded work may proceed in parallel after contracts/invariants are agreed:

- Domain/data/migration and security tests.
- API/contracts and web read/presentation components.
- Background adapters/jobs and deterministic fixtures.
- Accessibility/usability content and test preparation.
- Operator documentation/observability.

Do not parallelise independent implementations of the same invariant. Approval snapshots, RLS, capability issuance, cycle states, and change application each require one authoritative design/owner.

## Definition of done for every slice

- User journey demonstrated through the real UI/API/database.
- Requirement/backlog/demo trace links complete.
- Tenant/permission/RLS and audit/outbox tests pass.
- Errors/retries/idempotency/recovery are visible and documented.
- WCAG/mobile/keyboard criteria for introduced screens pass.
- Threat/privacy/health boundary reviewed for changed surfaces.
- Migrations run from empty and previous slice; seed/demo data updated.
- Observability, runbook, and rollback/recovery notes exist.
- No application state claims success before required evidence is committed.
