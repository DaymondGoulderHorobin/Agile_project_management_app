# Plan Revision Record

## Record status

This is the **first on-disk materialisation** of the approved conversational planning dossier. At materialisation time, the repository contained no prior `docs/planning/` files and no commit history from which an earlier written dossier could be reconstructed. Accordingly, this record compares the approved conversational baseline and preserved-decision list with files `00` through `14`; it does not claim a prior on-disk revision history.

Materialisation date: 2026-07-22 (Pacific/Auckland).

## Authoritative baseline

The baseline consisted of:

1. The approved conversational architecture and implementation plan.
2. The 24 decisions explicitly marked for preservation.
3. The required revisions: Legal electronic signature deferral, single demo spine, exact runner lifecycle, stronger health-data exclusion, measurable stakeholder UX, six vertical slices, company-version success criteria, and a revision record.
4. The instruction that this task changes documentation only and must not create application code, migrations, scaffolding, or dependencies.

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

## Deferred capabilities

Only the following boundaries are explicitly deferred by this materialisation:

1. The optional Legal electronic signature module and its legal-identity, ceremony, receipt, provider, jurisdiction, witnessed and notarised concepts.
2. Intentional storage or management of regulated/identifiable health information and the additional sector architecture/operations it would require.
3. Deployment orchestration after the release record.
4. Multi-provider and enterprise integration breadth not required for the demonstration.

None is required for a complete Project approval, High-Assurance project approval, initial self-hosted product, or the canonical demonstration.

## Open questions created or consolidated

The authoritative open-question list is [11-open-questions.md](./11-open-questions.md). The decisions that block earliest work are the identity implementation (`OQ-ID-01`), the default approval policy/reauthentication settings before Slice 3 (`OQ-ID-02`, `OQ-WF-01`), and GitHub/isolation/egress/demo limits before Slice 5 (`OQ-GH-01`, `OQ-RUN-01`–`04`). Operations, incident ownership and retention block production launch, not local vertical-slice learning.

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
- All 106 defined requirement IDs and all 49 backlog item IDs resolve; unknown references: zero.
- All 22 demo steps exist and each contains all 13 required contract fields; every backticked stored-record reference resolves to a data-model table (with enum values excluded from that check).
- All 16 canonical runner record/table names are present, and cycle, runner-environment, stop-reason, approval-request and approval-decision vocabularies contain every canonical value in the data/workflow/AI documents.
- Internal Markdown links broken: zero; malformed table pipe counts: zero; unbalanced code fences: zero; Git whitespace-check findings: zero.
- All 20 Mermaid blocks were submitted to a Mermaid renderer after final diagram edits and rendered successfully; failures: zero.
- The 15 success-criterion rows in `00` and `01` are text-identical.
- Manual context review found Legal electronic signature references only as an explicit non-goal, deferral, boundary, test, decision, question or future backlog item; no initial schema/slice/demo dependency requires it.
- Manual semantic review corrected requirement-to-slice/demo meanings, not just identifier existence, and confirmed that invitation, origin, evidence, approval revocation/staleness, change control, runner and release transitions have persistence and permission treatment.

## Recommended next Codex task

Perform the Slice 1 planning-to-implementation handoff: resolve `OQ-ID-01`, approve the tenant/RLS and identity threat model, then scaffold the repository foundation and implement tenant-safe identity, organisation, project, audit and outbox foundations with RLS tests. That future task is application implementation and was not begun during this planning materialisation.
