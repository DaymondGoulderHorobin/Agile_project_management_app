# Product Requirements

Status: Proposed
Requirements owner: product owner
Related: [Executive Summary](00-executive-summary.md), [Demo Journey](13-demo-journey.md), [Build Backlog](12-build-backlog.md)

## Problem statement

Teams increasingly use AI agents to plan and implement software, but most project tools record tasks without preserving the knowledge, evidence, approval, and authority needed to trust the work. Important decisions remain in meetings, email, or chat. Requirements lose their provenance. An agent can begin work against incomplete logic, stale approvals, or an ambiguous scope, and a pull request can be mistaken for completion.

The product must make the application the source of truth for both project logic and authorised AI execution.

## Goals

- Guide human participants from discovery to an approved evidence-backed plan.
- Let non-technical stakeholders contribute securely without project-management training.
- Preserve immutable source statements, origin, evidence relationships, versions, decisions, and approvals.
- Provide a polished Agile workflow while keeping a versioned workflow model extensible.
- Prevent Codex from starting or resuming outside a valid execution authorisation.
- Prove completion using acceptance criteria, tests, technical review, stakeholder review, and release evidence.
- Support an AGPL-3.0 self-hosted deployment and a later managed service.

## Non-goals for the first company version

- Finding or selling access to domain experts.
- Patient, clinical, or regulated health-record management.
- A Legal electronic signature ceremony, witnessed signature, notarisation, or identity-proofing service.
- Visual arbitrary workflow programming, BPMN, Waterfall, or hybrid templates.
- Portfolio finance, resource capacity optimisation, timesheets, or marketplace functionality.
- Slack, Teams, calendar, file-storage, GitLab, or GitHub Enterprise Server integration.
- Automatic production deployment. A release record is evidence and approval, not a deployment controller.
- AI approval of plans, execution cycles, reviews, or releases.

## Personas

| Persona | Need | Initial example |
|---|---|---|
| Project owner/developer | Turn domain knowledge into safe, traceable delivery | Company owner and software developer |
| Domain expert/guest | Answer relevant questions and review outcomes without technical administration | Chiropractor |
| Technical reviewer | Inspect code, actions, tests, failures, and scope adherence | Developer or peer engineer |
| Product stakeholder | Validate intended behaviour and request changes | Domain expert or intended user |
| Organisation administrator | Manage members, policies, integrations, retention, and incidents | Company owner |
| Operator | Deploy, secure, back up, observe, and recover the system | Self-host administrator |
| AI agent actor | Suggest or execute only within explicit machine-enforced authority | OpenAI model or Codex runner |

## Roles and authority

Roles are assignments, not hard-coded permission bundles. Permissions are evaluated against organisation, project, object, stage, and project mode.

- `organisation_owner`: organisation lifecycle, billing/configuration, and ultimate policy administration.
- `organisation_admin`: membership, teams, integrations, and policies without ownership transfer.
- `project_owner`: project configuration, membership, workflow, and approval-policy selection.
- `developer`: technical planning, backlog, repository, execution, testing, and review.
- `domain_expert`: questions, answers, requirements/reviews relevant to their expertise.
- `stakeholder`: comments, review, and approvals granted by policy.
- `reviewer`: a scoped review authority for a stage.
- `guest`: project-scoped participant with explicit grants and no organisation administration.
- `operator`: deployment authority; not automatically entitled to tenant content through the application.

Not every role is an approver. Approval authority comes from a versioned approval policy evaluated into exact requirements. One person may satisfy several requirements in Light mode; Standard and High-Assurance default to distinct people where feasible. A policy records any exception.

## Product modes

| Mode | Default use | Operational controls |
|---|---|---|
| Light | Two-person and low-risk projects | Role aggregation allowed, minimal required stages, advanced controls hidden |
| Standard | Normal company delivery | Distinct reviewers for selected stages, sprint/execution/release gates |
| High-Assurance | High-risk projects | Recent MFA/reauthentication, distinct-person rules, separation of duties, stricter evidence/test/release gates |

All three modes use the same underlying workflow and approval engine. High-Assurance project approval is not a Legal electronic signature.

## Canonical user journeys

### Journey A — discovery and plan approval

The developer creates an organisation/project, invites a domain expert, and both contribute questions. AI suggests labelled questions and explanations. The guest answers in a focused interface. AI proposes requirements, assumptions, risks, and acceptance criteria linked to evidence. Humans correct the proposals, create a plan version, and the configured reviewers approve its immutable snapshot.

### Journey B — Agile planning

Approved requirements produce proposed backlog items. Humans edit the hierarchy, create a sprint goal, select work, resolve dependencies, and approve the sprint where policy requires it.

### Journey C — controlled Codex work

An execution plan identifies an exact approved plan, work items, repository, commit, branch, path/network/tool scope, limits, tests, stop conditions, and review requirements. Following approval and final authority checks, a single isolated execution cycle runs, stops at a checkpoint, reports work and tests, and awaits human review.

### Journey D — material change

A stakeholder proposes a change. The system records classification and impact. Affected artifacts receive new versions; dependent approvals become stale; affected queued/running work is prevented or cancelled. New execution uses only current approved versions.

### Journey E — release

The release selects requirements and work items, evaluates acceptance and tests, records limitations/risks, gathers required reviews and approval, and preserves the evidence chain.

The executable demonstration of these journeys is [Demo Journey](13-demo-journey.md).

## Functional requirements

### Identity, tenancy, and projects

| ID | Requirement |
|---|---|
| FR-001 | A user can create an organisation and become its owner. |
| FR-002 | An authorised user can create a project with mode `light`, `standard`, or `high_assurance`; the demo defaults to `light`. |
| FR-003 | Organisation and project membership, roles, and scoped permissions are independently managed and audited. |
| FR-004 | Invitations are single-use, expiring, revocable, stored hashed, and scoped to an organisation or project. |
| FR-005 | A guest enters directly into assigned project work and cannot access organisation administration or unrelated project data. |
| FR-006 | A guest can save drafts, resume later, and request replacement access after expiry without revealing project data. |

### Discovery, knowledge, and evidence

| ID | Requirement |
|---|---|
| FR-007 | Authorised humans can create, assign, answer, comment on, and close questions. |
| FR-008 | AI can propose questions and follow-ups with an explanation and visible `ai_generated` origin. |
| FR-009 | Submitted responses and source fragments are immutable; corrections create records that supersede earlier records. |
| FR-010 | Knowledge sources record source type, origin, author/importer, capture time, and relevant metadata. |
| FR-011 | Source fragments can support, contradict, qualify, or originate another exact source/artifact version. |
| FR-012 | Conflicting evidence remains visible and blocks configured readiness rules until resolved or explicitly accepted. |

### Artifacts, plans, and readiness

| ID | Requirement |
|---|---|
| FR-013 | Requirements, assumptions, risks, decisions, acceptance criteria, plans, designs, and release plans use immutable numbered versions. |
| FR-014 | Each version records origin: `human_authored`, `ai_generated`, `ai_generated_human_edited`, `imported`, or `system_generated`. |
| FR-015 | AI can propose artifacts from selected evidence but cannot publish, confirm, or approve them. |
| FR-016 | Requirements link to exact supporting or contradicting source fragments and show those links to reviewers. |
| FR-017 | A plan version contains an immutable dependency manifest of included artifact versions. |
| FR-018 | Readiness is a deterministic checklist showing satisfied rules, missing inputs, conflicts, assumptions, tests, and approvals; an optional percentage is advisory only. |

### Operational approvals

| ID | Requirement |
|---|---|
| FR-019 | Approval policies combine role, named user, stage, project mode, and risk conditions. |
| FR-020 | An approval request targets one immutable approval snapshot containing an exact version manifest and content hash. |
| FR-021 | A reviewer sees the exact subject, changes from the prior version, dependencies, conditions, blockers, and outstanding reviewers. |
| FR-022 | A reviewer can decide `approved`, `approved_with_conditions`, `changes_requested`, or `rejected`, with comments and conditions as applicable. |
| FR-023 | Approval decisions are immutable; a relevant new version makes the request `stale` without rewriting history. |
| FR-024 | A subject becomes operationally approved only when all current required decisions are valid and all binding conditions are resolved or accepted by policy. |
| FR-025 | High-Assurance policies can require recent MFA/reauthentication, distinct principals, and separation of duties. |

### Agile delivery

| ID | Requirement |
|---|---|
| FR-026 | Hierarchical work items support `epic`, `user_story`, `task`, `bug`, `spike`, `review`, `test`, and `documentation`. |
| FR-027 | Work items link to exact requirement and acceptance-criterion versions and can have assignees and dependencies. |
| FR-028 | Authorised users can create a sprint goal, select ordered work, identify blockers, and request configured sprint approval. |
| FR-029 | AI may propose backlog structure, but humans edit and confirm all work before approval or execution. |

### Codex execution, testing, and review

| ID | Requirement |
|---|---|
| FR-030 | An execution-plan version specifies objective, work items, plan version, repository, commit, branch strategy, allowed paths/network/tools/secrets, acceptance criteria, tests, stop conditions, limits, and review policy. |
| FR-031 | Only one execution cycle can be created for an approved execution-plan version. |
| FR-032 | Authority is rechecked before capability issuance, Codex start, and checkpoint resumption. |
| FR-033 | A revocable short-lived capability and isolated runner enforce the approved scope and limits. |
| FR-034 | Agent runs, turns, actions, denied actions, usage, checkpoints, tests, reports, code changes, and cleanup are auditable. |
| FR-035 | Codex stops for completion, checkpoint, human input, scope denial, limit, failed tests, revocation, material change, cancellation, or runner failure. |
| FR-036 | Technical users can inspect detailed activity; non-technical users receive a plain-language report, stop reason, and next action. |
| FR-037 | A cycle cannot become `completed` until required testing and execution reviews pass. |
| FR-038 | Another execution cycle cannot begin for affected work until required review of the prior cycle is recorded. |

### Change, release, and collaboration

| ID | Requirement |
|---|---|
| FR-039 | Change proposals are classified as `minor`, `material`, or `fundamental`, with recorded rationale, impact, and human confirmation. |
| FR-040 | Material/fundamental changes create affected versions and stale dependent approvals; fundamental changes return the project to discovery. |
| FR-041 | Release records link exact requirements, work items, code changes, tests, reviews, limitations, risks, and approval snapshots. |
| FR-042 | Comments, mentions, activity, in-app notifications, email invitations, email notifications, and attachments are available in the core journeys. |
| FR-043 | Important actions produce append-only audit events for human, AI, system, integration, and operator actors. |
| FR-044 | Tenant data can be exported and organisation deletion follows an auditable grace-and-purge process. |

## Runner requirements

| ID | Requirement |
|---|---|
| RUN-001 | Cycle states use the canonical state machine in [Workflows and Approvals](04-workflows-and-approvals.md). |
| RUN-002 | Cycle creation is idempotent using `execution-cycle:{execution_plan_version_id}`. |
| RUN-003 | The authority transaction locks and validates the cycle, plan version, approval snapshot, policy result, memberships, and repository mapping. |
| RUN-004 | Capability scope includes tenant, cycle, repo, commit, branch, paths, network, tools, secrets, limits, and expiry. Raw capability values are never stored. |
| RUN-005 | The runner checks out the approved commit, creates/selects the approved branch, mounts only permitted paths, and applies network policy before Codex starts. |
| RUN-006 | Secrets are supplied only when authorised, held in ephemeral storage, redacted from events, and revoked before cleanup. |
| RUN-007 | Turn, task, token, cost, time, scope, and stop conditions are evaluated continuously and usage increments are atomic. |
| RUN-008 | Safe events stream to the application while sensitive raw content follows retention and redaction policy. |
| RUN-009 | Tests and a structured work report run even after controlled partial stops where feasible. |
| RUN-010 | Cancellation revokes authority immediately, attempts graceful stop for 30 seconds, hard-kills if needed, and triggers idempotent cleanup. |
| RUN-011 | A crash after side effects enters `recovery_required`; Codex is not automatically rerun against preserved changes. |
| RUN-012 | Branch, commit, pull-request, report, and cleanup side effects use durable intent and reconciliation before retry. |

## Healthcare-data boundary requirements

| ID | Requirement |
|---|---|
| HC-001 | Initial projects use data classification `general_business`; no initial workflow asks for patient-identifiable health information. |
| HC-002 | Onboarding, healthcare-oriented templates, question/response entry, AI submission, and file upload display clear prohibition guidance. |
| HC-003 | Prohibited examples include patient names/contact details, identifiable treatment histories, clinical records, patient-linked medical images, and any identifiable health information. |
| HC-004 | Templates encourage generic workflows, non-identifiable scenarios, general professional knowledge, business processes, design feedback, and domain constraints. |
| HC-005 | Likely prohibited text/files are warned, blocked from AI forwarding where practical, and quarantined with restricted access. Detection is a safety aid, not a compliance guarantee. |
| HC-006 | An accidental submission creates a privacy incident, stops downstream processing, notifies authorised administrators, and preserves audit metadata without duplicating sensitive content. |
| HC-007 | Administrators can safely purge quarantined content and assess object, log, backup, integration, and AI-provider exposure. |
| HC-008 | Intentionally storing regulated health information requires a separate approved programme of legal, privacy, security, operational, and architectural work. |

## Security requirements

| ID | Requirement |
|---|---|
| SEC-001 | Every request is authenticated where required and authorised against tenant, project, object, action, and stage. |
| SEC-002 | Tenant-controlled rows include `organisation_id`; tenant-aware composite foreign keys prevent cross-tenant references. |
| SEC-003 | RLS denies tenant access without valid transaction-local tenant/actor context. |
| SEC-004 | Sessions, invitations, approval access, and capabilities are expiring and revocable; tokens are stored hashed. |
| SEC-005 | Secrets use envelope encryption and are excluded from logs, prompts, events, exports, and error messages. |
| SEC-006 | Uploads use signed access, type/size validation, content-disposition controls, malware-scan hooks, and quarantine. |
| SEC-007 | Webhooks require signature verification, delivery deduplication, safe parsing, and reconciliation. |
| SEC-008 | State-changing browser requests use secure cookies, SameSite policy, origin checks, and CSRF protection where applicable. |
| SEC-009 | Rich text/Markdown is sanitised; CSP, security headers, output encoding, and URL validation limit XSS. |
| SEC-010 | Rate limits cover authentication, invitations, guest access, uploads, AI generation, approvals, and integration endpoints. |
| SEC-011 | Audit and security logs are append-only to the application and exclude raw secrets/prohibited content. |
| SEC-012 | Backup and restore, key rotation, session revocation, tenant export/deletion, and incident procedures are documented and tested. |

## User-experience requirements and acceptance criteria

### Guest participation

| ID | Measurable acceptance criterion |
|---|---|
| UX-001 | Invitation acceptance reaches the guest’s next assigned action in no more than three screens and never exposes organisation administration. |
| UX-002 | At least four of five representative non-technical users complete invitation, answer, review, and operational approval without facilitator intervention. |
| UX-003 | The guest dashboard presents one primary next action plus only their relevant questions, artifacts, reviews, and approvals. |
| UX-004 | Draft text autosaves within two seconds under normal connectivity and can be resumed in a later session. |
| UX-005 | Expired/revoked invitations reveal no project data, explain the failure in plain language, and offer a safe replacement-link action. |

### AI transparency

| ID | Measurable acceptance criterion |
|---|---|
| UX-006 | Every AI-generated or AI-edited item has a persistent visible badge and accessible origin label in lists, detail, diff, approval, and export views. |
| UX-007 | Human-authored, imported, system-generated, and AI-generated content are distinguishable without opening metadata. |
| UX-008 | Supporting evidence for a proposed AI-generated requirement is reachable within one interaction. |
| UX-009 | AI recommendations and readiness advice never use approval styling or count as a reviewer decision. |

### Approval clarity

| ID | Measurable acceptance criterion |
|---|---|
| UX-010 | The review screen shows subject/version, content hash identifier, dependency summary, change diff, conditions, blockers, and outstanding approvers before decision controls. |
| UX-011 | All four operational decisions are keyboard accessible and require a clear confirmation of the exact version. |
| UX-012 | Stale approval requests are visibly disabled, explain what changed, and link to the current review request. |

### Codex activity

| ID | Measurable acceptance criterion |
|---|---|
| UX-013 | Non-technical reviewers see a plain-language objective, outcome, limitations, stop reason, tests, and next action without raw command output. |
| UX-014 | Technical reviewers can inspect chronological actions, denied actions, changed files, diffs, tests, usage, logs, and capability scope. |
| UX-015 | The cycle badge and page title distinguish every non-terminal state; only `completed` displays as completed. |
| UX-016 | A checkpoint or human-input state presents one explicit decision/action needed to continue. |

### Small-team simplicity, accessibility, and responsive use

| ID | Measurable acceptance criterion |
|---|---|
| UX-017 | Light mode is default, has useful preset roles/policies, and hides advanced workflow, separation-of-duty, and runner controls until requested. |
| UX-018 | Core guest discovery, review, approval, and activity flows work at 360 CSS pixels and standard desktop widths without horizontal page scrolling. |
| UX-019 | Core workflows are fully operable by keyboard with visible focus, logical order, skip links, and no keyboard trap. |
| UX-020 | Automated accessibility scans report zero serious or critical violations; screen-reader testing covers headings, landmarks, labels, errors, status changes, tables, diffs, and origin badges. |

## Information architecture and screen map

### Organisation level

- Personal inbox and next actions.
- Organisation dashboard.
- Projects.
- Members, teams, invitations, and roles.
- Approval centre.
- Integration, AI, retention, security, and audit settings.

### Project level

- Overview and readiness.
- Discovery workspace, questions, responses, knowledge, and evidence.
- Requirements, assumptions, risks, decisions, acceptance criteria, and designs.
- Plan review, version history, and approvals.
- Backlog, sprint planning, and sprint board.
- Execution plans, execution-cycle view, technical agent activity, tests, and reviews.
- Change proposals and impact analysis.
- Release record and evidence chain.
- Comments/activity, audit history, members, workflow, repositories, and settings.

### Guest view

- Invitation acceptance.
- Focused next-action dashboard.
- Assigned questions and draft responses.
- Relevant evidence-backed artifacts.
- Requested behaviour review.
- Requested operational approvals.
- Plain-language Codex work report.

## Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-001 | WCAG 2.2 AA is the accessibility target. |
| NFR-002 | Store timestamps in UTC, display in user timezone, and preserve actor timezone on material decisions. |
| NFR-003 | Use optimistic concurrency and actionable conflict resolution for mutable drafts. |
| NFR-004 | Background work is idempotent, cancellable where applicable, observable, and recoverable without silent data loss. |
| NFR-005 | Structured logs, metrics, traces, correlation IDs, health probes, and error reporting cover all runtimes. |
| NFR-006 | The initial topology supports hundreds of organisations and 10–20 participants per project without architectural change. |
| NFR-007 | API and webhook contracts are versioned and backwards-compatible within a documented support window. |
| NFR-008 | Migrations use expand/backfill/switch/contract where zero-downtime compatibility is required. |
| NFR-009 | Operators have documented backup, restore, upgrade, rollback, seed, import, export, and deletion procedures. |
| NFR-010 | The repository has AGPL licensing, contribution, security reporting, architecture, and local-development documentation. |

## Acceptance of the first company version

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

This table intentionally mirrors the success criteria in [Executive Summary](00-executive-summary.md). Release readiness also requires all blocking readiness rules, required operational approvals, the complete `DJ-01`–`DJ-22` demonstration, tenant-isolation tests, runner lifecycle tests, healthcare-boundary controls, accessibility evidence, and a successful self-host backup/restore drill.

## Open product questions

Only questions that block a slice or launch are maintained in [Open Questions](11-open-questions.md). The Legal electronic signature module is explicitly non-blocking for the initial product.
