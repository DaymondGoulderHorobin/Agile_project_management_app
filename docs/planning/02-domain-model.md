# Domain Model

Status: Proposed
Canonical terminology source for modules, aggregates, state ownership, and business invariants

## Glossary

| Term | Definition |
|---|---|
| Organisation | Security and ownership tenant. Every company-controlled record belongs directly or indirectly to one organisation. |
| Project | Bounded body of discovery, planning, delivery, execution, review, and release work. |
| Guest | Project-scoped external participant who has no implicit organisation administration or discovery rights. |
| Origin | How content was created: `human_authored`, `ai_generated`, `ai_generated_human_edited`, `imported`, or `system_generated`. |
| Knowledge source | Container describing where original information came from. |
| Source fragment | Immutable excerpt or statement from a source; corrections supersede rather than mutate it. |
| Artifact | Stable identity for important project knowledge with immutable numbered versions. |
| Artifact version | Exact immutable content and structured type data at a point in time. |
| Evidence link | Typed relationship from an exact source fragment to an exact artifact version. |
| Project plan | Versioned artifact whose dependency manifest selects exact requirements, assumptions, risks, decisions, acceptance criteria, and designs. |
| Approval snapshot | Immutable canonical representation of an approvable subject version and dependencies, identified by SHA-256 content hash. |
| Project approval | Authenticated operational decision against an approval snapshot. |
| High-Assurance project approval | Operational approval with stronger reauthentication, distinct-person, and separation-of-duty rules; not a Legal electronic signature. |
| Legal electronic signature | Future optional legal ceremony; not an initial product dependency. |
| Readiness result | Deterministic evaluation of named rules; optional numeric completion is descriptive, not authority. |
| Work item | Hierarchical Agile delivery unit linked to exact requirement and acceptance-criterion versions. |
| Execution plan | Stable identity for a versioned proposed unit of Codex work. |
| Execution-plan version | Immutable objective, scope, repository, commit, branch, permissions, limits, tests, stop conditions, and review requirements. |
| Execution cycle | One authorised attempt to perform one approved execution-plan version. |
| Runner capability grant | Revocable, expiring server-side authority record whose raw opaque token is shown only to one runner environment. |
| Runner environment | Isolated compute/workspace instance that checks out and executes the approved repository scope. |
| Agent run | One runner-managed Codex process/thread session within a cycle. |
| Agent turn | One bounded continuation within an agent run. |
| Agent action | Requested or completed tool/command/file/network operation, including denied actions. |
| Checkpoint | Planned or emergent stop that requires recorded human input/review before resumption. |
| Work report | Structured outcome, changes, tests, limitations, usage, stop reason, and next actions from a cycle. |
| Release | Immutable evidence-oriented record of selected requirements/work, validation, limitations, reviews, and approval. |
| Prohibited-content incident | Restricted metadata and response workflow for suspected patient-identifiable health information; it does not reproduce that content. |

## Bounded modules

The application is a modular monolith. Modules communicate through application services, domain interfaces, and committed domain events; they do not query another module’s tables directly.

| Module | Responsibilities | May depend on |
|---|---|---|
| Identity | Users, authenticators, sessions, MFA, revocation | Platform reliability |
| Organisations | Organisations, memberships, teams, invitations | Identity, audit |
| Projects | Projects, project membership, roles, mode, repositories | Organisations, identity |
| Workflow | Definition/version, instances, states, transitions | Projects, approval/readiness interfaces |
| Discovery | Questions, assignments, immutable responses, follow-ups | Projects, collaboration, AI proposals |
| Knowledge & Evidence | Sources, immutable fragments, typed relationships, provenance | Projects, attachments |
| Artifacts | Artifacts, versions, typed extensions, relationships | Evidence, projects |
| Planning | Project plans and dependency manifests | Artifacts, workflow |
| Approvals | Policies, requirements, snapshots, requests, immutable decisions, staleness | Identity, projects; references versioned subjects |
| Readiness | Deterministic criteria and evaluations | Artifacts, approvals, risks, workflow |
| Agile Delivery | Iterations, hierarchical work items, dependencies, assignment | Artifacts, projects |
| AI Assistance | Prompt/model profiles, proposals, generation jobs, evaluations, usage | Discovery, artifacts, Agile through ports |
| Repository Integration | GitHub installations, repositories, webhooks, branches, PR/check data | Projects, platform reliability |
| Execution Control | Execution plans/versions, cycles, policies, capabilities, checkpoints, usage, reports, reviews | Approvals, Agile, repository, testing |
| Runner Control | Isolated environment lifecycle and runner protocol | Execution Control only through explicit contracts |
| Testing | Test cases, runs, results, evidence | Execution Control, repository |
| Change Control | Change proposals, classification, impact graph, application | Artifacts, planning, Agile, execution, approvals |
| Release | Releases, included versions, limitations, verification, approval | Artifacts, Agile, execution, testing, approvals |
| Collaboration | Comments, mentions, notifications, activity | Identity, projects |
| Attachments | Object metadata, signed access, scan/quarantine status | Projects, security |
| Security & Privacy | Prohibited-content incidents, retention, export/deletion controls | Identity, projects, attachments, audit |
| Platform Reliability | Audit, inbox, outbox, idempotency, scheduled jobs, observability metadata | None |

### Initial versus later modules

All modules above are initial except that teams are minimal, workflow authoring is limited to stored presets, AI provider selection is OpenAI-first, repository integration is GitHub.com-only, and release management records evidence without deploying software.

Later optional modules include portfolio management, visual workflow design, Waterfall/hybrid templates, Slack/Teams/calendar/storage connectors, GitHub Enterprise/GitLab adapters, enterprise identity/provisioning, managed multi-region operations, regulated-health support, and the Legal electronic signature module.

## Aggregate ownership

### Organisation and project

- `Organisation` owns membership and policy administration.
- `Project` owns project mode, data classification, lifecycle, project membership, workflow instance, and repository mappings.
- A project’s `organisation_id` cannot change. Migration between organisations is export/import, not an update.
- Guests require explicit project membership and grants.

### Discovery and knowledge

- `Question` owns prompt text, origin, status, assignments, and follow-up relationships.
- `QuestionResponse` is immutable after submission. Drafts are mutable with optimistic concurrency; submission creates the immutable record. A correction uses `supersedes_response_id`.
- `KnowledgeSource` owns descriptive provenance. `SourceFragment` is immutable original evidence.
- A contradiction never edits either statement. It is a typed relationship with rationale and actor.

### Artifacts and plans

- `Artifact` is a stable identity with type and lifecycle.
- `ArtifactVersion` owns immutable common content, origin, author, version number, and hash. One typed extension owns structured fields for that version.
- Relationships are version-to-version when meaning depends on content. Stable artifact relationships are used only for navigation and cannot prove approval/evidence.
- `ProjectPlanVersion` is a typed artifact version with an immutable dependency manifest. It never means “latest requirement”; it lists exact version IDs and hashes.

### Approvals

- `ApprovalPolicyVersion` owns rule definitions.
- `ApprovalSnapshot` owns the canonical approvable payload and dependency manifest.
- `ApprovalRequest` owns evaluated requirements and request state.
- `ApprovalDecision` is immutable and belongs to one evaluated requirement and snapshot.
- `ApprovalRevocation` is an immutable current-authority invalidation; it never rewrites the request result or decision and continuing requires a new request.
- The Approval module can determine current validity but cannot mutate an approved subject.
- A Legal electronic signature, if later added, consumes the same immutable snapshots but remains a separate module; the Approval module has no dependency on it.

### Agile

- `Iteration` owns sprint goal, dates, state, selected work, and optional approval subject.
- `WorkItem` owns kind, parent, status, ordered priority, assignees, version links, and dependencies.
- Work is complete only when linked acceptance criteria and required review/test evidence are satisfied.

### Execution control and runner

- `ExecutionPlan` owns immutable `ExecutionPlanVersion` records.
- An `ExecutionPlanVersion` links exact project-plan/artifact versions, work items, repository, approved commit, branch strategy, scope, limits, tests, and review rules.
- `ExecutionCycle` owns the authoritative lifecycle. A unique invariant allows at most one cycle per execution-plan version.
- `RunnerCapabilityGrant` is the sole runner authority record; its raw token is never persisted.
- `RunnerEnvironment` owns compute/workspace lifecycle but cannot widen policy.
- `AgentRun`, `AgentTurn`, and `AgentAction` record execution hierarchy and outcomes.
- `ExecutionCheckpoint` and `ExecutionReview` own human control points.
- `ExecutionWorkReport` is structured and immutable per revision; corrections add a superseding report.

The canonical persistence names for this aggregate are `execution_plans`, `execution_plan_versions`, `execution_cycles`, `execution_cycle_work_items`, `runner_capability_grants`, `runner_environments`, `agent_runs`, `agent_turns`, `agent_actions`, `execution_checkpoints`, `execution_usage_events`, `execution_test_runs`, `execution_work_reports`, `execution_reviews`, `code_changes`, and `changed_files`. These names are normative across API projections, jobs, audit subjects, tests, and operational runbooks; [03-data-model.md](./03-data-model.md) defines their columns and constraints.

### Change and release

- `ChangeProposal` owns proposed classification, confirmed classification, rationale, impact graph, and decision.
- Applying an accepted change is an application service transaction across new versions and staleness markers, coordinated by events where atomic cross-aggregate work is not practical.
- `Release` owns a versioned release record and exact inclusion/evidence manifest. Release approval targets its immutable snapshot.

## Module relationship diagram

```mermaid
flowchart LR
    ID["Identity"] --> ORG["Organisations"]
    ORG --> PRJ["Projects"]
    PRJ --> DIS["Discovery"]
    DIS --> KE["Knowledge & Evidence"]
    KE --> ART["Artifacts"]
    ART --> PLN["Planning"]
    PLN --> APR["Approvals"]
    ART --> RDY["Readiness"]
    APR --> RDY
    PLN --> AG["Agile Delivery"]
    AG --> EC["Execution Control"]
    APR --> EC
    REPO["Repository Integration"] --> EC
    EC --> RC["Runner Control"]
    RC --> TST["Testing"]
    EC --> CHG["Change Control"]
    ART --> CHG
    TST --> REL["Release"]
    EC --> REL
    ART --> REL
    APR --> REL
    AI["AI Assistance"] -. proposals .-> DIS
    AI -. proposals .-> ART
    AI -. proposals .-> AG
    COL["Collaboration"] -. comments and notices .-> PRJ
    PLAT["Audit / Inbox / Outbox"] -. events .-> PRJ
    PLAT -. events .-> EC
```

## Core relationships

```mermaid
flowchart TD
    Q["Question"] --> QR["Immutable response"]
    QR --> KS["Knowledge source"]
    KS --> SF["Immutable source fragment"]
    SF -->|supports / contradicts / qualifies| AV["Artifact version"]
    AV --> PM["Project plan version manifest"]
    PM --> AS["Approval snapshot + content hash"]
    AS --> AR["Approval request"]
    AR --> AD["Immutable decisions"]
    PM --> WI["Work items"]
    WI --> SP["Sprint"]
    SP --> EPV["Execution-plan version"]
    EPV --> EAS["Execution approval snapshot"]
    EAS --> EC["One execution cycle"]
    EC --> RUN["Agent runs / turns / actions"]
    RUN --> TR["Tests and work report"]
    TR --> RV["Human reviews"]
    RV --> REL["Release evidence manifest"]
```

## State machines

### Artifact lifecycle

```mermaid
stateDiagram-v2
    [*] --> proposed
    [*] --> draft
    proposed --> draft: human accepts or edits proposal
    draft --> in_review
    in_review --> draft: changes requested
    in_review --> accepted: general artifact accepted
    in_review --> frozen: approvable plan subject frozen
    accepted --> superseded: newer effective version
    frozen --> superseded: replacement version
    draft --> archived
    accepted --> archived
    frozen --> archived
    superseded --> archived
```

`accepted` and `frozen` are content-lifecycle states, not Project approval decisions. Project approval is represented only by the separate immutable snapshot/request/decision model.

### Approval request lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> approved: all requirements satisfied
    pending --> changes_requested
    pending --> rejected
    pending --> withdrawn
    pending --> stale: subject/dependency changes
    approved --> stale: approved snapshot superseded
    changes_requested --> stale: replacement snapshot created
```

Approval decisions themselves do not transition. They are immutable facts.

### Execution cycle lifecycle

```mermaid
stateDiagram-v2
    [*] --> requested
    requested --> authorising
    authorising --> queued: authority valid
    authorising --> cancelling: authority invalid
    queued --> provisioning
    provisioning --> running
    running --> checkpoint_waiting
    checkpoint_waiting --> running: review + authority recheck
    running --> human_input_required
    human_input_required --> running: input + authority recheck
    running --> testing
    testing --> reporting
    testing --> reporting: tests failed
    reporting --> awaiting_review
    awaiting_review --> completed: required reviews pass
    awaiting_review --> failed: reviewed outcome did not complete approved work
    requested --> cancelling
    queued --> cancelling
    provisioning --> cancelling
    running --> cancelling
    checkpoint_waiting --> cancelling
    human_input_required --> cancelling
    cancelling --> cancelled
    provisioning --> failed
    running --> failed
    running --> recovery_required: crash after side effects
    cancelling --> recovery_required: cleanup failure
```

### Runner environment lifecycle

```mermaid
stateDiagram-v2
    [*] --> requested
    requested --> creating
    creating --> ready
    ready --> active
    active --> revoking
    ready --> revoking
    revoking --> destroying
    destroying --> destroyed
    destroying --> cleanup_failed
    cleanup_failed --> destroying: retry/manual recovery
```

### Change proposal lifecycle

```mermaid
stateDiagram-v2
    [*] --> proposed
    proposed --> classified
    classified --> impact_assessed
    impact_assessed --> approved
    impact_assessed --> rejected
    approved --> applying
    applying --> applied
    applying --> recovery_required
```

## Business invariants

### Tenancy and authorisation

1. Every tenant-controlled aggregate has immutable `organisation_id`.
2. A tenant-controlled foreign key includes and matches `organisation_id`.
3. Application permission and RLS must both permit tenant access.
4. A guest sees only explicit project resources and assignments.
5. Actor identity, effective role/authority, and tenant context are captured on material audit events.

### Evidence and artifacts

6. Submitted evidence is never edited or ordinarily deleted; corrections supersede it.
7. Evidence relationships point to immutable source fragments and artifact versions.
8. AI output begins as a proposal and cannot silently become a confirmed fact or human-authored record.
9. An artifact version’s canonical content and content hash never change.
10. An approved plan refers to exact versions, never “current” records.

### Approvals and readiness

11. A decision applies to one exact snapshot and evaluated requirement.
12. A newer relevant version marks the earlier request stale; it never deletes or rewrites decisions.
13. A person cannot satisfy distinct-principal requirements twice.
14. AI, system, integration, and operator actors cannot approve project content.
15. Readiness advice cannot override a missing required operational approval.

### Execution

16. `execution_plan_version_id` is unique in `execution_cycles`.
17. A cycle cannot leave `authorising` without current plan approval, current authority, valid repository access, and an unused execution-plan version.
18. A runner cannot widen its capability and cannot receive secrets outside its grant.
19. Starting and resuming require a fresh authority recheck.
20. Denied actions are evidence, not silent retries or automatic scope expansion.
21. A cycle cannot be `completed` while tests/reviews are missing, failed, or pending.
22. Another affected cycle cannot start until the required review of the prior cycle is recorded.
23. Revocation stops future authority immediately while preserving historical actions and decisions.

### Health-data boundary

24. Initial project classification is `general_business`; regulated health information is unsupported.
25. Suspected prohibited content is not copied into audit messages, notifications, AI prompts, or diagnostic logs.
26. Detection warnings do not claim that the system can guarantee absence of health information.

### Change and release

27. Highest matching change class wins; AI can recommend but an authorised human confirms.
28. Fundamental change returns the project to discovery and blocks dependent execution.
29. A release record includes exact evidence versions and cannot claim completion without required tests/reviews/approvals.

## Fixed versus configurable behaviour

Fixed product invariants include tenancy, immutable evidence/versions/decisions, snapshot-bound approval, actor restrictions, runner authority, one-cycle-per-plan-version, audit/outbox atomicity, and completion gates.

Configurable versioned behaviour includes named workflow states presented to users, allowed non-security transitions, approval roles/users, role aggregation, distinct-person requirements, readiness criteria, required review stages, execution limits, notification routing, and retention within safe operator limits. Configuration cannot disable fixed invariants.
