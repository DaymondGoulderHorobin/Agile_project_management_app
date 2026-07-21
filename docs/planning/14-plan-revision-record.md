# Plan Revision Record

## Record status

This dossier began as the **first on-disk materialisation** of the approved conversational plan. At initial materialisation, the repository contained no prior `docs/planning/` files and no commit history from which an earlier written dossier could be reconstructed, so `REV-001`–`REV-017` compare that conversational baseline with files `00` through `14` and do not claim an earlier on-disk revision history. `REV-018` onward records the subsequent implementation-readiness correction pass against that first materialisation.

Materialisation date: 2026-07-22 (Pacific/Auckland).
Implementation-readiness correction date: 2026-07-22 (Pacific/Auckland).

## Authoritative baseline

The baseline consisted of:

1. The approved conversational architecture and implementation plan.
2. The 24 decisions explicitly marked for preservation.
3. The required revisions: Legal electronic signature deferral, single demo spine, exact runner lifecycle, stronger health-data exclusion, measurable stakeholder UX, six vertical slices, company-version success criteria, and a revision record.
4. The instruction that this task changes documentation only and must not create application code, migrations, scaffolding, or dependencies.
5. The mandatory implementation-readiness findings: resolve Better Auth, prevent overlapping execution work, correct approval-request staleness terminology, standardise `plan_in_review`, make cancellation grace configurable, add CI documentation validation, and add a controlled Direct-to-Codex comparison.

## Preserved decisions

All of the following remain active initial-product decisions:

1. TypeScript modular monolith.
2. pnpm monorepo.
3. Next.js web application.
4. NestJS and Fastify API.
5. BullMQ workers.
6. Separate isolated Codex runner trust boundary.
7. PostgreSQL and Drizzle.
8. Redis and BullMQ.
9. S3-compatible object storage with MinIO support.
10. Shared-schema multi-tenancy.
11. `organisation_id` on tenant-controlled records.
12. Tenant-aware foreign keys.
13. Application authorisation and PostgreSQL Row-Level Security.
14. Immutable evidence and superseding corrections.
15. Versioned project artifacts.
16. Immutable approval snapshots linked to exact versions and content hashes.
17. Light, Standard and High-Assurance project modes.
18. Deterministic readiness rules with explanatory criteria.
19. Controlled Codex execution cycles.
20. One execution cycle per approved execution-plan version.
21. Rechecking authority immediately before execution and resumption.
22. Transactional state changes, audit events and outbox events.
23. GitHub App integration.
24. AGPL-3.0 self-hostable core.

No direct technical contradiction was discovered among these decisions. Implementation risk remains concentrated in runner isolation, policy enforcement, RLS completeness, approval graph integrity, and external-effect reconciliation; those risks are addressed with explicit gates rather than architecture replacement.

## Material changes

| Change ID | Change made | Reason | Affected documents | Decisions preserved or deferred | Risk effect | Open questions created or changed | Sequence effect |
|---|---|---|---|---|---|---|---|
| REV-001 | Materialised a complete planning dossier as numbered files `00`–`14`, with a common glossary, requirement IDs, demo IDs, slice IDs and cross-links. | No approved plan existed on disk; implementation needs one coherent source. | All files | Preserves all 24 decisions. | Reduces ambiguity and drift; introduces maintenance burden for traceability. | Consolidated in `11`. | Establishes documentation as the gate before Slice 1. |
| REV-002 | Defined Project approval, High-Assurance project approval, four approval decisions, immutable snapshots, deterministic policies, conditions and staleness as complete core capabilities. | Project approval must remain secure and useful without a Legal electronic signature. | `00`–`05`, `08`–`10`, `12`, `13` | Preserves decisions 16–18; no approval capability deferred. | Reduces authority ambiguity and false non-repudiation claims. | `OQ-ID-02`, `OQ-WF-01`. | Approval work remains in Slice 3 and is reused in Slices 4–6. |
| REV-003 | Deferred Legal electronic signatures to a future optional bounded context and backlog. Removed verified legal name, signature receipts, signature ceremonies/provider abstractions, jurisdictional review, witnessed and notarised flows from the initial schema, roadmap, demo and success criteria. | They are not required for authenticated Project approval and would enlarge legal/security scope before product validation. | `00`–`06`, `08`–`14` | Defers only Legal electronic signature; preserves Project approval and High-Assurance project approval. | Reduces legal, identity, provider, retention and ceremony risk; future module integration remains a risk. | `FUT-ESIGN-OQ-01`–`05`; all explicitly non-blocking. | Removes Legal electronic signature work from all six initial slices. |
| REV-004 | Added `13-demo-journey.md` with `DJ-01`–`DJ-22`, following the developer/chiropractor story from secure project creation to release evidence. | The initial product needs one complete, demonstrable user journey rather than disconnected capabilities. | `00`, `01`, `02`, `04`, `07`–`10`, `12`, `13` | Preserves the production architecture while fixing demonstration scope. | Reduces integration and product-story risk; increases end-to-end verification burden. | `OQ-RUN-03`, `OQ-RUN-04`. | Each slice ends at a demonstrable checkpoint and builds the same journey. |
| REV-005 | Distinguished fully functional demo controls from honest simplifications: one organisation/project/repository/sprint/cycle/provider/policy path, manual triggers, simple notifications and release recording without deployment. | A repeatable demo must be achievable without mocking assurance-critical controls. | `00`, `08`, `09`, `12`, `13` | Preserves runner, tenancy, approval, evidence and release integrity. | Reduces scope risk without hiding limitations. | Demo fixture and limit defaults remain open. | Does not change slice order; constrains each slice’s demo fixture. |
| REV-006 | Established the canonical cycle state machine, separate runner-environment state machine, stop-reason vocabulary, 20-step operational lifecycle and complete failure matrix. | Runner behaviour must be implementable, observable, recoverable and consistent across layers. | `02`–`05`, `07`–`10`, `12`, `13` | Preserves decisions 6 and 19–22. | Reduces unsafe retry, orphaned runner, scope-creep, race and false-completion risks; exposes high isolation/recovery burden. | `OQ-RUN-01`–`04`. | Concentrates runner implementation in Slice 5 after approval and Agile dependencies. |
| REV-007 | Added all runner records, unique cycle-per-plan-version constraint, expected-state/`lock_version` transitions, deterministic jobs, idempotency keys, atomic usage limits, durable external-effect intents, audit/outbox rules and recovery procedures. | The lifecycle required exact persistence and transaction semantics rather than conceptual components. | `02`–`05`, `07`, `09`, `12`, `13` | Preserves decisions 20–22 and GitHub App integration. | Reduces duplicate side effects and irrecoverable ambiguity; adds schema and reconciliation complexity. | GitHub and isolation choices in `11`. | No order change; raises Slice 5 entry and exit gates. |
| REV-008 | Set initial classification to `general_business`; specified supported generic knowledge and prohibited patient-identifiable information across onboarding, templates, entry, uploads, AI, audit, incident response, deletion and retention. | The chiropractor scenario must not make the general platform a health-record system or encourage regulated data storage. | `00`–`06`, `08`, `09`, `12`–`14` | Preserves the general product architecture. | Reduces privacy/regulatory exposure; introduces false-positive/negative and incident-handling risks. | Incident ownership and production retention in `OQ-OPS-02`, `OQ-DATA-01`. | Health controls begin in Slices 1–2 and are verified in every affected later slice. |
| REV-009 | Documented future work required before intentional regulated-health storage: legal/privacy assessments, sector obligations, residency, purpose/consent, clinical roles, break-glass, clinical retention, patient rights, enhanced keys, vendor terms, operations and independent assurance. | Prevent accidental expansion from safe professional discovery into regulated record management. | `01`, `02`, `06`, `10`, `11` | Defers regulated-health capability; does not redesign the product as healthcare software. | Makes future risk visible without burdening the initial system. | Future regulated-health questions arise only after a validated use case. | No initial sequence effect. |
| REV-010 | Added measurable guest-participation, AI-transparency, approval-clarity, Codex-activity, small-team, responsive and accessibility requirements. | Non-technical stakeholders must complete the workflow safely without project-management training. | `01`, `04`–`09`, `12`, `13` | Preserves Light/Standard/High-Assurance modes with progressive disclosure. | Reduces adoption, misunderstanding and false-approval risks; adds usability/accessibility verification burden. | Representative participant recruitment in `OQ-UX-01`. | UX is part of every owning slice rather than a final polish phase. |
| REV-011 | Required desktop and 360px mobile E2E coverage, full keyboard traversal, screen-reader checks, zero serious/critical automated accessibility violations, and four-of-five unassisted guest usability completion. | WCAG 2.2 AA and demonstrable non-technical use require measurable release gates. | `01`, `09`, `12`, `13` | Preserves product modes and web architecture. | Reduces accessibility and usability risk; introduces participant and manual-test dependency. | `OQ-UX-01`. | Slice 2 usability is an explicit exit gate; later slices retain accessibility gates. |
| REV-012 | Reorganised implementation and backlog into exactly six vertical product slices with value, journeys, requirements, modules, schema, API, screens, jobs, AI, security, tests, manual verification, demo, dependencies, risks, human decisions and mechanical work. | Infrastructure-layer sequencing would postpone demonstrable value and cross-layer assurance. | `00`, `08`, `10`, `12`, `13` | Preserves every technology decision; changes delivery order, not architecture. | Reduces integration-late and demo-gap risk; increases discipline needed at slice exits. | Blockers now state the exact slice or launch gate in `11`. | New order: foundation → discovery → requirements/approval → Agile → Codex → change/release. |
| REV-013 | Added 15 company-version success criteria, including two-person discovery, evidence, approvals, stale handling, constrained Codex, checkpoints/review, release traceability, tenant isolation, health-data exclusion, self-hosting and no Legal electronic signature dependency. | A production-oriented dossier requires outcome gates in addition to feature lists. | `00`, `01`, `09`, `12`, `13` | Preserves all core decisions and explicitly validates Legal electronic signature deferral. | Reduces “technically built but unusable/incomplete” risk. | Production SLOs and operational ownership remain in `11`. | Criteria span the six exits and final production acceptance. |
| REV-014 | Separated ordinary AI assistance through the OpenAI Responses API from controlled coding execution through the Codex SDK; added origin, proposal, prompt/version, structured-output, evaluation, filtering, usage and evidence requirements. | Product suggestions and repository-changing agents have different trust boundaries and controls. | `01`–`03`, `05`–`09`, `12`, `13` | Preserves the isolated Codex boundary and provider adaptability. | Reduces AI-authority confusion and unsupported output risk; introduces evaluation/model-change burden. | `OQ-AI-01`. | AI functions enter in Slices 2–4; Codex execution remains Slice 5. |
| REV-015 | Added a consolidated blocker register, moving resolved choices to ADRs and future Legal electronic signature questions to a non-blocking future section. | Open questions must drive decisions rather than duplicate settled architecture. | `10`, `11`, `14` | Preserves settled ADRs; defers future modules explicitly. | Reduces decision duplication and accidental blocking. | `OQ-*` register is authoritative. | Each blocker states its exact slice/launch effect. |
| REV-016 | Added a single-owner ordered backlog under `EPIC-S1`–`EPIC-S6`, with requirement/demo traceability, risk, uncertainty, human decision, verification and bounded Codex-work notes. | Implementation handoff needs mechanical scope without implying that code was authorised in this task. | `08`, `12`, `13`, `14` | Preserves all technical choices and vertical-slice order. | Reduces duplicate ownership and ambiguous handoff risk. | The first handoff requires the Slice 1 decisions in `11`. | Recommends Slice 1 as the next Codex task. |
| REV-017 | Closed materialisation-review gaps with append-only approval revocation, explicit versioned change/impact/application tables, append-only artifact lifecycle events, corrected semantic requirement-to-slice/demo traceability, and a production topology with a separate runner host/provider. | Generic status fields and syntactically valid but semantically wrong ID references were insufficient for implementation; a same-host production default weakened the preserved runner boundary. | `02`–`09`, `12`–`14` | Strengthens decisions 6, 15, 16, 20–22 without changing the product architecture. | Reduces unsupported-demo-transition, authority-revocation, duplicate-ownership and runner-escape risk; a separate production runner boundary adds operator topology burden. | Existing `OQ-RUN-01`, `OQ-DEPLOY-01`; no new product-scope question. | No slice reorder; raises Slice 1 topology documentation and Slice 5 containment gates, while Change Control remains solely Slice 6. |
| REV-018 | Resolved `OQ-ID-01` with `ADR-025`: pin Better Auth `1.6.23` packages to one patch, mount the official handler directly in Fastify, use Drizzle/PostgreSQL database sessions with cookie cache off, hashed magic-link tokens, first-party passkey/TOTP, internal principals and tenant-aware one-use action/snapshot-bound `reauthentication_grants`; do not use community NestJS glue or the Better Auth organisation plugin. Recorded that `updateAge` is renewal rather than rotation and that the DB session lookup token is a narrow sensitive-storage exception. | Authentication could not remain both selected and unresolved, and official capabilities/limitations needed implementation-level treatment. | `00`–`12`, `13`, `14` | Preserves Next.js plus NestJS/Fastify, PostgreSQL/Drizzle, self-hosting, application authorisation and RLS; adds no identity-provider coupling to domain policy. | Reduces provider ambiguity, revocation-latency, unstable-glue and High-Assurance binding risk; introduces Better Auth upgrade/migration, sensitive lookup-token and app-owned grant verification burden. | Closes `OQ-ID-01`; narrows `OQ-ID-02` to whether TOTP may ever be a High-Assurance fallback. | Removes identity-provider selection as a Slice 1 blocker; adds explicit Better Auth/grant/storage tests to Slice 1. |
| REV-019 | Added database-enforced active `execution_work_item_claims`, atomic acquisition during `authorising`, rollback-to-`requested` conflict semantics, separate idempotent denial audit/outbox, claim retention through required review/recovery, and the only release reasons: `required_review_completed`, `safely_cancelled`, `authorised_failure_recovery`, `authorised_change_removed_work`. Added `ADR-026`, `RUN-013`, backlog ownership and race/recovery tests. | One cycle per plan version did not prevent different versions from concurrently acting on the same work item. | `00`–`10`, `12`–`14` | Preserves one-cycle-per-version, exact approval, transactions/audit/outbox and runner isolation. | Reduces overlapping code work and authorisation races; introduces orphaned-claim, long-review and authorised-recovery operational risk. | No new external choice; repository-path overlap remains warning/future extension. | No reorder; adds `S5-T05` as a prerequisite to cycle authorisation and claim-aware Slice 6 change handling. |
| REV-020 | Standardised staleness language: a relevant change marks the approval request `stale` and invalidates the unchanged immutable snapshot's use as current authority; snapshots and decisions remain unchanged historical evidence. | Earlier shorthand implied an immutable snapshot could itself become stale or mutable. | `00`–`14` | Strengthens immutable approval snapshot decision 16 and normal/High-Assurance approvals. | Reduces schema/workflow/test ambiguity and accidental mutation risk. | None. | No sequence change; corrects Slice 3 and Slice 6 acceptance/tests. |
| REV-021 | Standardised the canonical project workflow state as `plan_in_review` and removed the former alias. | One workflow concept had two names, which would create enum, projection and documentation-validation drift. | `01`–`04`, `07`, `09`, `10`, `12`–`14` | Preserves versioned workflow presets and project modes. | Reduces migration/API/event incompatibility risk. | None. | No sequence change. |
| REV-022 | Made graceful runner termination configurable as `runner_graceful_shutdown_seconds`, default 30 and allowed range 5–120 seconds, with capability-first revocation, deadline-aware hard kill and boundary/configuration tests under `RUN-010`. | A hard-coded grace period was not operator-safe or testable across deployment substrates. | `01`, `03`–`10`, `12`–`14` | Preserves cancellation, cleanup and isolated runner lifecycle. | Reduces inflexible shutdown risk; introduces unsafe configuration and signal-race risk controlled by validation/tests. | None; the safe range is decided. | No reorder; strengthens `S5-T04` and `S5-TEST01`. |
| REV-023 | Added `NFR-011`, `S1-T04` and the single blocking local/CI command `pnpm docs:validate` for links, Mermaid where practical, duplicate/missing IDs and references, canonical states/enums, broken file links, accidental mandatory Legal electronic signature language, Markdown formatting and trailing whitespace. | Fifteen interlinked planning files need repeatable drift detection, not only a one-time manual review. | `00`, `01`, `08`, `09`, `12`, `14` plus repository CI when implemented | Preserves the dossier as implementation authority and all deferred boundaries. | Reduces silent traceability/terminology/link drift; introduces validator-maintenance and false-positive risk. | None. | Adds an explicit Slice 1 tooling task and a blocking gate to every later documentation change. |
| REV-024 | Added `DEMO-001`: a controlled immutable Direct-to-Codex baseline versus platform-assisted comparison, canonical `demonstration_comparisons`/`demonstration_comparison_results`, reproducible inputs/rubric, evaluation-only baseline, accessible results screen/report, backlog ownership and end-to-end tests. | The demo must show measurable product value against the unstructured starting approach, not rely on assertion. | `00`–`03`, `05`, `07`–`10`, `12`–`14` | Preserves the single `DJ-01`–`DJ-22` spine, normal authority controls and release traceability; baseline output cannot become approved delivery work. | Reduces product-value ambiguity; introduces experiment-bias, scorer-consistency, cost and messaging risk. | Demo limits/fixture decisions remain `OQ-RUN-03`/`04`; no new architecture blocker. | No reorder; `S5-US06` owns comparison capability and Slice 6 adds the final release-trace projection. |

## Files created

| File | Role |
|---|---|
| [00-executive-summary.md](./00-executive-summary.md) | Product boundary, success criteria, risks, sequence and next tasks. |
| [01-product-requirements.md](./01-product-requirements.md) | Numbered product, security, healthcare, UX and quality requirements plus screen map. |
| [02-domain-model.md](./02-domain-model.md) | Bounded contexts, aggregates, language, ownership and invariants. |
| [03-data-model.md](./03-data-model.md) | Implementation-ready relational model, constraints, RLS, retention and transaction boundaries. |
| [04-workflows-and-approvals.md](./04-workflows-and-approvals.md) | Workflow, readiness, operational approval, change, runner and release state machines. |
| [05-ai-and-codex-architecture.md](./05-ai-and-codex-architecture.md) | AI governance and exact controlled runner lifecycle/failure/recovery model. |
| [06-security-and-privacy.md](./06-security-and-privacy.md) | Trust controls, threat treatment, healthcare exclusion and incident response. |
| [07-system-architecture.md](./07-system-architecture.md) | Runtime, modules, contracts, queues, diagrams, deployment and operations. |
| [08-implementation-roadmap.md](./08-implementation-roadmap.md) | Six complete vertical implementation slices. |
| [09-testing-strategy.md](./09-testing-strategy.md) | Layered, demo, runner, tenancy, UX, accessibility and healthcare test gates. |
| [10-decision-log.md](./10-decision-log.md) | Preserved and new architectural decisions with consequences/reconsideration conditions. |
| [11-open-questions.md](./11-open-questions.md) | Consolidated slice/launch blockers and non-blocking future-module questions. |
| [12-build-backlog.md](./12-build-backlog.md) | Ordered, traceable, single-owner implementation backlog and future backlog. |
| [13-demo-journey.md](./13-demo-journey.md) | `DJ-01`–`DJ-22` canonical two-person demonstration. |
| [14-plan-revision-record.md](./14-plan-revision-record.md) | This first-materialisation change, risk and sequence record. |

## Risks reduced

- A secure but unusable collection of components now has a single measurable user journey.
- Approval evidence cannot be confused with mutable content, AI approval, or a Legal electronic signature.
- Codex lifecycle, revocation, idempotency, cleanup and recovery are explicit at schema, queue, UI and test levels.
- Better Auth selection, direct Fastify boundary, app-owned step-up grants and known session-token limitations are explicit rather than contradictory.
- Database-enforced work-item claims prevent overlapping approved cycles and retain ownership through review/recovery.
- The controlled baseline comparison makes product value measurable without representing unapproved output as delivery work.
- Repeatable documentation validation converts terminology/traceability checks into a CI gate.
- Guests have a narrow project-scoped path and clear recovery for invalid invitations.
- Identifiable health information is outside intended workflows and has preventive, detective and incident controls.
- Slice exits expose integration and tenant-isolation failures early.

## New or more visible risks

- The isolated runner and egress enforcement require a production-quality substrate decision and adversarial proof.
- Full tenant-aware schema/RLS coverage and transitive approval staleness have substantial verification burden.
- AI content filtering cannot guarantee perfect identification of health information; human guidance and incident handling remain necessary.
- External GitHub effects and runner cleanup require durable reconciliation and operational drills.
- Accessibility/usability gates require representative participants and manual validation.
- Fifteen linked planning files can drift unless traceability and terminology checks remain automated.
- Better Auth's database session lookup token is a narrow sensitive-storage exception, and `updateAge` does not rotate its value; access/redaction/revocation controls and version-pinned upgrade review are mandatory.
- Active claims can block work during prolonged review or recovery, so dashboards, alerts and authorised release runbooks are operationally important.
- A baseline comparison can mislead if inputs, limits, rubric or scoring differ; immutable hashes and limitations reduce but do not remove experiment-bias risk.

## Deferred capabilities

Only the following boundaries are explicitly deferred by this materialisation:

1. The optional Legal electronic signature module and its legal-identity, ceremony, receipt, provider, jurisdiction, witnessed and notarised concepts.
2. Intentional storage or management of regulated/identifiable health information and the additional sector architecture/operations it would require.
3. Deployment orchestration after the release record.
4. Multi-provider and enterprise integration breadth not required for the demonstration.

None is required for a complete Project approval, High-Assurance project approval, initial self-hosted product, or the canonical demonstration.

## Open questions created or consolidated

The authoritative open-question list is [11-open-questions.md](./11-open-questions.md). `OQ-ID-01` is resolved by `ADR-025`; implementation verification remains mandatory but provider selection is not open. The earliest remaining product-policy decisions are the permitted High-Assurance fallback factor and default approval/readiness policy (`OQ-ID-02`, `OQ-WF-01`), followed by GitHub/isolation/egress/demo limits before Slice 5 (`OQ-GH-01`, `OQ-RUN-01`–`04`). Operations, incident ownership and retention block production launch, not local vertical-slice learning.

## Implementation-sequence effect

The authoritative order is:

1. `EPIC-S1` — Secure project foundation.
2. `EPIC-S2` — Human knowledge discovery.
3. `EPIC-S3` — Requirements and approval.
4. `EPIC-S4` — Agile delivery.
5. `EPIC-S5` — Controlled Codex execution.
6. `EPIC-S6` — Change control and release.

This replaces infrastructure-layer delivery ordering but does not replace the architecture. Each slice adds the infrastructure it needs and must satisfy its complete user/demo exit before the next slice depends on it.

## Materialisation review checklist

The following checks are required at handoff and their evidence should be regenerated whenever the dossier changes:

- Exactly 15 numbered Markdown files exist and no application code/dependency/scaffolding was added.
- Internal Markdown links resolve and Mermaid fences are balanced/renderable.
- Requirement, success, demo, backlog and slice identifiers resolve to one definition.
- Canonical approval/cycle/environment states and entity/table names are consistent.
- Project workflow uses only `plan_in_review`; no former alias remains.
- Approval staleness applies only to `approval_requests`; immutable snapshots/decisions remain unchanged historical evidence.
- Active work-item claims have atomic acquisition/conflict, exact release reasons, audit/outbox, recovery retention and race tests.
- `runner_graceful_shutdown_seconds` has default 30, range 5–120 and configuration/deadline tests.
- `pnpm docs:validate` is specified as the same blocking local/CI command and covers every mandatory documentation check.
- `DEMO-001` has immutable inputs/results, fair controls, accessible report, no-authority-confusion rules and backlog/test ownership.
- No Legal electronic signature work is assigned to an initial requirement, schema table, slice, demo dependency, acceptance gate or success criterion.
- Every `DJ-*` record and transition maps to the domain/data/workflow model and every step has a permission rule and recovery path.
- Every runner transition has persistence, expected-state transaction, audit/outbox, idempotency/retry, cleanup/recovery and test treatment.
- AI output always has origin/proposal treatment and evidence links target exact immutable fragments/versions.
- Healthcare restrictions appear in onboarding/templates, entry, uploads, AI, audit, incident response, retention/deletion, security, tests, demo and backlog.
- Every feature has one owning slice; every slice provides demonstrable user value and complete exit criteria.
- Light mode supports the two-person journey without enterprise ceremony; Standard and High-Assurance remain stricter operational presets.

## Materialisation validation result

Completed on 2026-07-22 after the final consistency corrections:

- Exactly 15 planning files exist, all Markdown; no application code, migration, scaffold, dependency manifest or generated diagram asset was created.
- All 110 defined requirement IDs and all 52 backlog item IDs resolve; unknown references: zero.
- All 22 demo steps exist and each contains all 13 required contract fields; every backticked stored-record reference resolves to a data-model table (with enum values excluded from that check).
- All 16 canonical runner record/table names are present, and cycle, runner-environment, stop-reason, approval-request and approval-decision vocabularies contain every canonical value in the data/workflow/AI documents.
- Internal Markdown links broken: zero; malformed table pipe counts: zero; unbalanced code fences: zero; Git whitespace-check findings: zero.
- All 20 Mermaid blocks were submitted to a Mermaid renderer after final diagram edits and rendered successfully; failures: zero.
- The 15 success-criterion rows in `00` and `01` are text-identical.
- Manual context review found Legal electronic signature references only as an explicit non-goal, deferral, boundary, test, decision, question or future backlog item; no initial schema/slice/demo dependency requires it.
- Manual semantic review corrected requirement-to-slice/demo meanings, not just identifier existence, and confirmed that invitation, origin, evidence, approval revocation/staleness, change control, runner and release transitions have persistence and permission treatment.

## Recommended next Codex task

Begin the Slice 1 implementation handoff with `ADR-025` already decided: approve the concrete Better Auth `1.6.23` configuration and identity/tenant/RLS threat model, then implement `S1-T01`–`S1-T04`, identity/organisations/projects/audit/outbox and the blocking Better Auth, RLS and `pnpm docs:validate` tests. Provider selection must not be reopened without new contradictory evidence and an ADR update.
