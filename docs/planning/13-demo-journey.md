# Canonical Demonstration Journey

## Purpose and story

This is the single end-to-end demonstration spine for the first working company version. A software developer and a chiropractor turn a general business problem into evidence-backed requirements, an approved plan, an Agile sprint, controlled Codex work, human review, and an immutable release record.

The project classification is `general_business`. Participants use professional knowledge, generic business processes, generic workflows, product requirements, non-identifiable scenarios, design feedback, and domain constraints. They must not enter patient names, contact information, identifiable treatment histories, clinical records, patient-linked images, identifiable health information, or information that would make the product a regulated health-record system.

The visible narrative is:

> Problem → questions → answers → evidence → requirements → plan approval → sprint → Codex execution → testing → human review → release

## Cast and fixed demonstration scope

- **Developer:** authenticated organisation owner, project lead, repository administrator, technical reviewer, and release approver.
- **Domain expert:** chiropractor using a secure project-scoped guest invitation; discovery contributor, artifact reviewer, project-plan approver, stakeholder reviewer, and release viewer only where assigned.
- **System:** web application, API, worker, PostgreSQL, Redis/BullMQ, S3-compatible storage, GitHub App, AI orchestration, runner control plane, and isolated Codex runner.
- **Project:** a non-clinical appointment and practice-workflow product. Every example is synthetic and non-identifiable.
- **Mode:** Light, with a fixed two-person project-plan and execution policy for the demo. High-Assurance project approval is shown as an available stricter operational preset, not as a Legal electronic signature.

## Controlled baseline comparison (`DEMO-001`)

The demonstration opens with a read-only **Demonstration comparison** screen and returns to it after `DJ-22`. This is a controlled product-evaluation companion to, not a replacement for, `DJ-01`–`DJ-22`.

Before discovery, an evaluation administrator runs a Direct-to-Codex baseline in a disposable isolated fixture with only the original project idea. The baseline receives no human questions, AI-suggested questions, answers, evidence graph, reviewed requirements, acceptance criteria, approvals or platform trace. It has the same synthetic repository/base commit, model/profile, tool/runtime limits and versioned scoring rubric as the platform-assisted fixture, but no merge/release credentials. Its output is evaluation-only: it cannot become an execution cycle, approval, commit to the approved project branch or release record.

After the live platform-assisted journey, the application shows both immutable results. `demonstration_comparisons` stores the shared input hash, fixture/base commit, model/profile, limits, rubric version and result references. Each `demonstration_comparison_results` row stores cohort (`direct_to_codex` or `platform_assisted`), immutable input/output/score hashes, measured values, reviewer/rubric provenance and object references; corrections create another result rather than mutate one. Access is limited to authorised demonstration/project reviewers, is tenant/RLS scoped, and every create/finalise action writes audit/outbox evidence.

| Comparison measure | Direct-to-Codex baseline | Platform-assisted result |
|---|---|---|
| Requirements discovered | Reference-set requirements present without unsupported invention | Human-reviewed requirements linked to exact source fragments |
| Unsupported assumptions / assumptions prevented | Unsupported assumptions introduced and later identified | Assumptions made explicit, challenged or prevented before execution |
| Domain questions | Important rubric questions not asked | Human and labelled AI questions asked, answered or explicitly unresolved |
| Acceptance-criterion coverage | Important requirements with a testable criterion | Accepted important requirements linked to accepted criteria and tests |
| Corrections required | Stakeholder corrections after reviewing baseline behaviour/output | Corrections requested during structured artifact and behaviour review |
| Stakeholder confidence | Developer and chiropractor pre-review 1–5 score with rationale | Same reviewers' post-journey 1–5 score with rationale |
| Traceability | Requirement-to-code-to-test links actually present in baseline output | Evidence → requirement → plan approval → work item → code → test → review → release links |

Success requires a reproducible report with limitations and immutable hashes, not a predetermined claim that the platform wins. Failure conditions include unequal inputs/limits, mutable or missing results, rubric drift, scorer disagreement, inaccessible presentation or language implying the baseline was authorised work. Recovery creates a new versioned comparison/result under the same fixture or explains why the run is incomparable; it never edits a result to improve the story. Requirement: `DEMO-001`. Owning backlog: `S5-US06`; final integration verification: `S5-TEST01` and `S6-TEST01`.

## DJ-01 — Developer creates the secure workspace

| Field | Demonstration contract |
|---|---|
| User | Developer |
| Screen | Sign in → organisation creation → organisation home |
| Action | Uses a Better Auth magic link or passkey, creates the demonstration organisation, and optionally accepts a member invitation test. |
| System response | Better Auth verifies the database-backed session at the direct Fastify boundary; the identity adapter creates an internal application principal, then the application creates the organisation and active owner membership atomically, establishes tenant context, and shows “Create project” as the next action. |
| AI involvement | None. |
| Stored records | `users`, `auth_accounts`, `auth_sessions`, `organisations`, `organisation_memberships`, `organisation_role_assignments`, `audit_events`, `outbox_events`; optional `invitations`. |
| Permission check | Verified, unrevoked Better Auth session mapped to an internal principal; only the authenticated creator can create the organisation; all reads are application-authorised and RLS-scoped independently of Better Auth. |
| Success condition | The developer sees only the new organisation; another organisation fixture is inaccessible at API and database levels. |
| Likely failure conditions | Invalid/expired session; duplicate slug; invitation already consumed; tenant context absent. |
| Recovery path | Reauthenticate, choose another slug, request a new invitation, or fail closed and alert on missing tenant context. No partial organisation is left. |
| Requirement IDs | FR-001, FR-003, FR-004, FR-043, FR-045, SEC-001–SEC-004, SEC-008, SEC-011, NFR-004 |
| Backlog IDs | S1-US01–S1-US03, S1-T02, S1-SEC01, S1-TEST01 |
| Relevant state transitions | Session becomes active; organisation is created active; an optional invitation is `issued → consumed` and atomically creates an active membership; audit/outbox commit with the command. |

## DJ-02 — Developer creates a safe project

| Field | Demonstration contract |
|---|---|
| User | Developer |
| Screen | Create project → project overview/onboarding |
| Action | Enters the generic product problem, selects the chiropractor template, and confirms that no identifiable patient information will be entered. |
| System response | Creates a Light-mode project with `data_classification = general_business`, displays persistent health-data guidance, and opens the discovery next action. |
| AI involvement | None; the warning and classification are deterministic. |
| Stored records | `projects`, `project_memberships`, `project_role_assignments`, `project_workflow_instances`, `audit_events`, `outbox_events`. |
| Permission check | Active organisation owner/member with `project.create`; tenant-aware FK and RLS bind the project to the current organisation. |
| Success condition | The project dashboard clearly says it is not a clinical record system and shows discovery as the next action. |
| Likely failure conditions | Unsupported classification; health-data acknowledgement omitted; duplicate project key; authorisation loss. |
| Recovery path | Keep the draft client-side, explain the required acknowledgement, generate another key, or return to authorised organisation selection. |
| Requirement IDs | FR-002, FR-043, HC-001–HC-004, SEC-001–SEC-003, SEC-011, UX-017, NFR-001 |
| Backlog IDs | S1-US04, S1-US05, S1-SEC01, S2-SEC01 |
| Relevant state transitions | Project commits directly as `active`; its workflow instance enters `discovery`; no partial `creating` record is exposed; audit/outbox are atomic with creation. |

## DJ-03 — Developer invites the chiropractor

| Field | Demonstration contract |
|---|---|
| User | Developer |
| Screen | Project participants → invite guest |
| Action | Enters the chiropractor’s email, assigns discovery, plan-review, approval, product-behaviour-review, and release-view grants, and sends the invitation. |
| System response | Stores only a hashed, single-use token; sends a minimal SMTP/in-app notification without project content; shows expiry, status, and revoke/resend controls. |
| AI involvement | None. |
| Stored records | `invitations`, explicit `project_permission_grants` intent, `notifications`, `audit_events`, `outbox_events`; membership/grants are materialised on acceptance. |
| Permission check | Active project lead with `project.guest.invite`; requested grants must be a subset of grantable project permissions. |
| Success condition | Exactly one active invitation exists and the chiropractor receives a safe invitation link. |
| Likely failure conditions | Duplicate active invitation; invalid email; SMTP delay; inviter loses authority; invitation is revoked before use. |
| Recovery path | Return the existing invitation, retry the deduplicated notification, let an authorised lead resend/revoke, and reveal no project data to the recipient until acceptance. |
| Requirement IDs | FR-004, FR-042, FR-043, SEC-004, SEC-010, SEC-011, UX-001, UX-005 |
| Backlog IDs | S2-US01, S2-US05, S2-TEST01 |
| Relevant state transitions | Invitation is `issued`; notification `queued → {delivered, failed}`; revocation moves the invitation to `revoked`. |

## DJ-04 — Chiropractor joins at the assigned action

| Field | Demonstration contract |
|---|---|
| User | Domain expert |
| Screen | Invitation acceptance → concise safety acknowledgement → assigned questions |
| Action | Opens the secure link, establishes or verifies identity, accepts the project invitation and health-data guidance. |
| System response | Atomically consumes the token, activates the project-scoped membership and explicit grants, and lands on the next assigned action in no more than three screens. No organisation administration is visible. |
| AI involvement | None. |
| Stored records | Updated `invitations`; `project_memberships`, `project_role_assignments`, `project_permission_grants`, `auth_sessions` where applicable, `audit_events`, `outbox_events`. |
| Permission check | Token hash match, unused, unexpired, unrevoked, intended identity/email, project still active; resulting access is project-scoped. |
| Success condition | The guest understands the next action without training and cannot browse unrelated project or organisation data. |
| Likely failure conditions | Expired/revoked/consumed link; wrong identity; project archived; membership later revoked. |
| Recovery path | Show no project data; explain the condition; offer “request a new link” or sign in as the intended identity. A revoked membership immediately removes future access. |
| Requirement IDs | FR-003–FR-006, FR-043, HC-002–HC-004, SEC-001, SEC-004, SEC-008, SEC-010, UX-001–UX-005 |
| Backlog IDs | S2-US01, S2-SEC01, S2-TEST01 |
| Relevant state transitions | Invitation `issued → consumed`; acceptance atomically creates an `active` project membership; invalid paths terminate without membership creation. |

## DJ-05 — Developer contributes initial questions

| Field | Demonstration contract |
|---|---|
| User | Developer |
| Screen | Discovery workspace → questions |
| Action | Adds human-authored questions about scheduling, cancellations, staff roles, reminders, and generic practitioner workflow, then assigns relevant questions. |
| System response | Persists author/origin, assignments, due status and comments; sends safe assignment notifications. |
| AI involvement | None; content is visibly labelled “Human-authored.” |
| Stored records | `questions`, `question_assignments`, `comments`, `notifications`, `audit_events`, `outbox_events`. |
| Permission check | Active project lead with create/assign permission; assignees must be active memberships in the same project. |
| Success condition | Both participants see only relevant questions, their author, rationale, assignment, and next action. |
| Likely failure conditions | Stale edit, revoked assignee, duplicate submission, or prohibited-content warning triggered. |
| Recovery path | Resolve optimistic-concurrency conflict, reassign, return the idempotent result, or remove/rewrite prohibited content before persistence/downstream processing. |
| Requirement IDs | FR-007, FR-042, FR-043, SEC-011, UX-002, UX-007, HC-003 |
| Backlog IDs | S2-US02, S2-US05, S2-SEC01 |
| Relevant state transitions | Question `draft → open`; assignment `assigned → viewed`; notification `queued → delivered`. |

## DJ-06 — Chiropractor contributes domain questions

| Field | Demonstration contract |
|---|---|
| User | Domain expert |
| Screen | Guest discovery workspace |
| Action | Adds questions about generic appointment preparation, consent prompts, room/resource constraints, and usability for practitioners, without patient details. |
| System response | Marks content as guest human-authored, makes permitted questions visible to the developer, and updates discovery progress. |
| AI involvement | None. |
| Stored records | `questions`, `question_assignments`, `comments`, `audit_events`, `outbox_events`. |
| Permission check | Active project-scoped guest with `question.create`/`question.view_relevant`; no organisation-admin or technical-execution permission. |
| Success condition | Domain knowledge enters the shared discovery flow with clear authorship and safe scope. |
| Likely failure conditions | Guest attempts a technical/admin action, session expires, autosave conflict, or enters likely identifiable health information. |
| Recovery path | Deny out-of-scope action, preserve a safe local draft through reauthentication, merge/show concurrency state, or block/quarantine and start the incident workflow. |
| Requirement IDs | FR-007, FR-042, FR-043, SEC-011, UX-002–UX-004, HC-001–HC-006 |
| Backlog IDs | S2-US02, S2-SEC01, S2-TEST01 |
| Relevant state transitions | Question `draft → open`; prohibited-content path `suspected → blocked_or_quarantined` rather than question submission. |

## DJ-07 — AI suggests additional questions

| Field | Demonstration contract |
|---|---|
| User | Developer and domain expert |
| Screen | Discovery workspace → AI suggestions panel |
| Action | Requests suggestions from selected safe project context; reviews why each question matters; accepts, edits, assigns, or dismisses each proposal. |
| System response | Filters the input, invokes the configured model with a versioned structured schema, shows persistent AI labels/reasons, and leaves all results in proposal state until a human acts. |
| AI involvement | Suggests missing non-clinical questions and rationale; it neither approves content nor impersonates a participant. |
| Stored records | `ai_jobs`, `ai_outputs`, `ai_usage_events`, proposed then accepted `questions`, `content_provenance_links`, `question_assignments`, `audit_events`, `outbox_events`. |
| Permission check | Active permitted participant; input records are project-scoped; selected model/use case is enabled; health filter passes; budget remains. |
| Success condition | At least one useful question is accepted, its AI origin persists after editing, and dismissed proposals create no authoritative requirement. |
| Likely failure conditions | Unsafe input, schema failure, provider refusal/outage, low-quality suggestion, duplicate job, or budget limit. |
| Recovery path | Block provider forwarding and open an incident when needed; otherwise retry by idempotency key, show failure/refusal, let users proceed entirely with human questions, or change the proposal manually. |
| Requirement IDs | FR-008, HC-005, UX-006, UX-007, SEC-005, SEC-009, SEC-011, NFR-005 |
| Backlog IDs | S2-US04, S2-SEC01, S2-TEST01 |
| Relevant state transitions | AI job `requested → filtering → running → {completed, refused, failed}`; proposal `proposed → {accepted, edited_and_accepted, dismissed}`. |

## DJ-08 — Chiropractor answers and creates evidence

| Field | Demonstration contract |
|---|---|
| User | Domain expert, then developer |
| Screen | Assigned question → response editor → evidence view |
| Action | Answers using general professional knowledge and generic examples; saves, leaves, returns, submits, and responds to a permitted follow-up. |
| System response | Autosaves within two seconds, submits an immutable response, creates a knowledge source and immutable source fragments, preserves a superseding correction path, and notifies the developer. |
| AI involvement | Optional non-authoritative clarity prompt only if enabled; no AI rewriting is silently attributed to the guest. |
| Stored records | `question_response_drafts`, `question_responses`, `knowledge_sources`, `source_fragments`, `source_fragment_relationships`, follow-up `questions`, `notifications`, `audit_events`, `outbox_events`. |
| Permission check | Active assignee or explicitly authorised contributor; same-project relationships; content and upload health checks; guest may access only assigned/relevant material. |
| Success condition | Submitted knowledge is immutable, traceable to its human respondent, recoverable after session return, and contains no identifiable patient information. |
| Likely failure conditions | Network interruption, stale draft, link/session expiry, suspicious text/upload, attachment scan failure, or accidental prohibited upload. |
| Recovery path | Resume the server draft, show conflict choices, reauthenticate, quarantine before downstream processing, restrict access, notify authorised administrators, remove safely, assess provider exposure, and retain only non-sensitive incident metadata. |
| Requirement IDs | FR-006, FR-007, FR-009–FR-011, FR-042, FR-043, HC-001–HC-008, SEC-005, SEC-006, SEC-008–SEC-011, UX-003–UX-005 |
| Backlog IDs | S2-US02, S2-US03, S2-US05, S2-SEC01, S2-TEST01 |
| Relevant state transitions | Draft `editing → autosaved`; response `draft → submitted`; evidence fragment `created` and immutable; correction creates `new → supersedes(old)`; incident `open → contained → remediated → closed`. |

## DJ-09 — AI proposes evidence-backed artifacts

| Field | Demonstration contract |
|---|---|
| User | Developer and domain expert |
| Screen | Plan workspace → proposed requirements, assumptions, risks, and acceptance criteria |
| Action | Selects evidence and asks AI to propose structured artifacts; opens supporting evidence for each important proposal. |
| System response | Creates versioned proposals with AI origin and exact immutable evidence links; flags weakly supported statements and never treats proposals as approved. |
| AI involvement | Extracts/proposes requirements, assumptions, risks, and acceptance criteria using a versioned prompt/schema and selected immutable fragments. |
| Stored records | `ai_jobs`, `ai_outputs`, `ai_usage_events`, `artifacts`, `artifact_versions`, typed version tables, `content_provenance_links`, `artifact_version_evidence_links`, `artifact_version_relationships`, `audit_events`, `outbox_events`. |
| Permission check | Active permitted project participant; selected fragments and targets are in the same project; health filter and model budget pass. |
| Success condition | Each important proposed requirement shows AI origin and supporting evidence reachable within one interaction. |
| Likely failure conditions | Unsupported claim, missing/contradictory evidence, invalid structured output, provider failure, or stale selected input. |
| Recovery path | Mark support deficiency, request more questions/evidence, let humans author the artifact, retry safely against the current immutable input manifest, or retain the prior proposal for comparison. |
| Requirement IDs | FR-013–FR-016, FR-043, UX-006–UX-008, HC-005, NFR-005 |
| Backlog IDs | S3-T01, S3-US01, S3-TEST01 |
| Relevant state transitions | AI job `requested → running → {completed, failed}`; artifact version `proposed → draft → in_review` as humans accept/review it; source fragments remain immutable. |

## DJ-10 — Humans review, correct, and preserve traceability

| Field | Demonstration contract |
|---|---|
| User | Developer and domain expert |
| Screen | Artifact review workspace with evidence drawer and version diff |
| Action | Verifies evidence, comments, corrects wording, adds a missing assumption, supersedes an inaccurate fragment/requirement, and resolves disagreement. |
| System response | Preserves AI/human/import origins, creates new immutable versions and superseding corrections, recalculates dependency closure, and marks any affected existing approval request `stale`. |
| AI involvement | May summarise differences as a visibly labelled recommendation; humans own all corrections and decisions. |
| Stored records | New `question_responses`/`source_fragments` where corrected; `artifact_versions`, typed extensions, evidence/relationship edges, `comments`, updated `approval_requests` if present, `audit_events`, `outbox_events`. |
| Permission check | Contributor may edit only permitted project artifacts; guest sees relevant artifacts/evidence; version creation uses expected `lock_version`; staleness is system-enforced. |
| Success condition | Reviewers agree the current versions reflect evidence, history remains inspectable, and no evidence link points to mutable content. |
| Likely failure conditions | Concurrent edit, insufficient permission, stale evidence view, unresolved contradiction, or attempted mutation of immutable content. |
| Recovery path | Create a version from the latest base, request a lead decision/additional evidence, refresh the exact version, and reject direct update/delete of immutable records. |
| Requirement IDs | FR-009, FR-011–FR-017, FR-023, UX-007, UX-008, UX-012 |
| Backlog IDs | S2-US03, S3-T01, S3-US02, S3-US06, S3-TEST01 |
| Relevant state transitions | Artifact version `in_review → accepted`; a correction creates a new `draft` version and appends `superseded` to the prior version; affected approval request `{pending, approved} → stale` while decisions remain append-only. |

## DJ-11 — System freezes a ready project-plan version

| Field | Demonstration contract |
|---|---|
| User | Developer |
| Screen | Readiness checklist → project-plan version preview |
| Action | Runs readiness, resolves blockers, and freezes the exact plan/dependency set for approval. |
| System response | Evaluates deterministic versioned rules with explanations, builds an immutable plan version and dependency manifest, canonicalises and hashes it, and offers approval only when blockers pass. |
| AI involvement | May suggest remedies, visibly as AI; it does not decide readiness. |
| Stored records | `readiness_evaluations`, `readiness_rule_results`, project-plan `artifacts`/`artifact_versions`/`plan_versions`, relationship/evidence links, `audit_events`, `outbox_events`. |
| Permission check | Project lead with plan-version permission; all dependencies must be current exact versions in the project; readiness policy matches project mode. |
| Success condition | Reviewers can identify the exact plan version, requirements, evidence, changes, blockers, and hash that will be approved. |
| Likely failure conditions | Missing evidence/acceptance criterion/reviewer, unresolved blocking risk, stale dependency, or concurrent version creation. |
| Recovery path | Navigate directly to each explanatory criterion, repair the source, rerun readiness, or return the already-created identical hash/version. |
| Requirement IDs | FR-017, FR-018, NFR-001, UX-009, UX-010 |
| Backlog IDs | S3-US03, S3-US04, S3-TEST01 |
| Relevant state transitions | Readiness `requested → running → {passed, blocked}`; plan version `draft → in_review → frozen`; project workflow `discovery → plan_in_review` only after deterministic gates. |

## DJ-12 — Required parties approve the exact project plan

| Field | Demonstration contract |
|---|---|
| User | Developer and domain expert |
| Screen | Approval inbox → exact plan snapshot/diff/evidence → decision form |
| Action | Each reviewer inspects what changed and chooses `approved`, `approved_with_conditions`, `changes_requested`, or `rejected`; the demo uses approval by both required people. |
| System response | Authenticates the reviewer, verifies current authority, records an append-only decision against the immutable snapshot, shows conditions/blockers/outstanding reviewers, and marks the request approved only when the configured policy is satisfied. |
| AI involvement | None in the decision. AI content remains labelled and can never appear as a human approval. |
| Stored records | `approval_snapshots`, `approval_requests`, `approval_requirements`, `approval_decisions`, optional `approval_condition_resolutions`, `audit_events`, `outbox_events`. |
| Permission check | Active assigned reviewer with current project authority; exact snapshot/policy; distinct-person and reauthentication rules when High-Assurance mode is selected. |
| Success condition | The exact version/hash is operationally approved by both configured reviewers and usable by downstream planning; it requires no Legal electronic signature. |
| Likely failure conditions | Reviewer no longer authorised, approval request is `stale`, condition unresolved, action/snapshot-bound reauthentication grant expired, policy not met, or concurrent content change. The immutable snapshot itself never becomes stale. |
| Recovery path | Complete the required Better Auth passkey/TOTP step-up and obtain a new action/snapshot-bound reauthentication grant, replace a departed reviewer through policy-authorised administration, resolve conditions, or generate a replacement snapshot/request. Retain the old immutable snapshot/decisions as history without using them as current authority. |
| Requirement IDs | FR-019–FR-025, SEC-001, SEC-004, SEC-011, UX-009–UX-012, SC-04, SC-05, SC-15 |
| Backlog IDs | S3-US04–S3-US06, S3-SEC01, S3-TEST01 |
| Relevant state transitions | Approval request `pending → {approved, changes_requested, rejected}`; dependent change `{pending, approved} → stale`; individual decision is immutable. |

## DJ-13 — Team creates and reviews the Agile backlog

| Field | Demonstration contract |
|---|---|
| User | Developer, with domain-expert review of relevant behaviour |
| Screen | Agile backlog generation → backlog review |
| Action | Converts the approved plan to proposed epics, stories, tasks and bugs; edits/order/splits proposals and confirms requirement/acceptance links. |
| System response | Creates AI-labelled proposed work, preserves human edits/origins, validates dependencies, and displays exact approved source requirements. |
| AI involvement | Proposes decomposition and ordering; humans accept and edit; AI does not approve sprint scope. |
| Stored records | `ai_jobs`, `ai_outputs`, `content_provenance_links`, `work_items`, `work_item_dependencies`, `work_item_artifact_version_links`, `work_item_acceptance_criteria`, `audit_events`, `outbox_events`. |
| Permission check | Developer has backlog-manage authority; guest can review only assigned product-behaviour items; approved plan snapshot is current. |
| Success condition | Every important story is traceable to an approved requirement and acceptance criterion. |
| Likely failure conditions | Missing source link, invalid dependency cycle, stale plan approval, poor decomposition, or guest opens a technical item outside scope. |
| Recovery path | Block readiness, repair links/dependencies, regenerate only proposals, obtain a current plan approval, or deny the guest view without revealing data. |
| Requirement IDs | FR-026, FR-027, FR-029, UX-006, UX-007, SC-03 |
| Backlog IDs | S4-T01, S4-US01, S4-SEC01, S4-TEST01 |
| Relevant state transitions | Work item `proposed → accepted → ready`; invalid proposals remain `proposed` or become `rejected`. |

## DJ-14 — Developer creates the sprint

| Field | Demonstration contract |
|---|---|
| User | Developer |
| Screen | Sprint planning |
| Action | Creates one sprint, selects a small dependency-safe story/task set, checks capacity assumptions, and confirms scope. |
| System response | Persists sprint membership/order and requirement traceability; Light mode does not force a redundant sprint approval, while the optional policy is visible through progressive disclosure. |
| AI involvement | May suggest scope as a labelled recommendation; not authoritative. |
| Stored records | `iterations`, `iteration_work_items`, `work_items`, dependency/artifact/criterion links; optional approval records only when configured; `audit_events`, `outbox_events`. |
| Permission check | Active project lead with sprint-plan authority; only ready same-project work items; configured policy and dependencies pass. |
| Success condition | A reviewed sprint contains the demonstrable unit of work and its approved requirement chain. |
| Likely failure conditions | Dependency outside sprint, over-capacity warning, stale source plan, conflicting edit, or configured approval missing. |
| Recovery path | Add/remove/reorder work, record a conscious capacity decision, refresh source approval, merge current version, or complete configured approval. |
| Requirement IDs | FR-027–FR-029, UX-017 |
| Backlog IDs | S4-US02, S4-US03, S4-TEST01 |
| Relevant state transitions | Sprint `draft → planned → ready`; optionally `approval_pending → approved`; Light demo normally skips the optional transition. |

## DJ-15 — Developer prepares the Codex execution plan

| Field | Demonstration contract |
|---|---|
| User | Developer |
| Screen | Repository connection → execution-plan editor |
| Action | Connects one GitHub.com repository and selects the approved commit, branch rule, permitted paths, tools, egress, secrets, tests, checkpoint, work items, and token/cost/turn/task/time limits. |
| System response | Reconciles GitHub App access, validates every scope field, creates an immutable execution-plan version/hash, and shows a plain-language scope summary plus advanced technical details. |
| AI involvement | May draft the plan from sprint work as a labelled proposal; a human owns the final scope. General AI uses the Responses API; Codex execution has not started. |
| Stored records | `integrations`, `github_installations`, `repositories`, `project_repositories`, `repository_access_snapshots`, `execution_plans`, `execution_plan_versions`, approval snapshot/request records, `audit_events`, `outbox_events`. |
| Permission check | Project/repository admin authority; installation has minimum required permissions; commit exists; paths/network/tools/secrets fit organisational policy; current sprint/source approvals are valid. |
| Success condition | The exact plan version is reviewable and cannot exceed the declared repository, commit, branch, files, network, tools, secrets, tests, checkpoints, or limits. |
| Likely failure conditions | GitHub permission/installation changed, commit unavailable, invalid path traversal, excessive scope, secret not authorised, or stale upstream approval. |
| Recovery path | Reconcile access, choose an approved commit/scope, remove unsafe permission, obtain explicit secret authority, or create a new current upstream version. Never silently broaden scope. |
| Requirement IDs | FR-019–FR-021, FR-030, RUN-004, SEC-005, SEC-007, SEC-011, UX-017 |
| Backlog IDs | S5-T01, S5-US01 |
| Relevant state transitions | Repository mapping `pending → {active, access_lost}`; execution-plan version `draft → frozen → approval_pending`. |

## DJ-16 — Required approvers authorise one execution cycle

| Field | Demonstration contract |
|---|---|
| User | Developer and configured execution approver(s) |
| Screen | Execution approval → cycle status |
| Action | Reviews and approves the exact execution-plan snapshot, then requests execution once. |
| System response | Deduplicates with `execution-cycle:{execution_plan_version_id}`; locks/rechecks plan, snapshot, policy result, memberships, repository mapping and selected work items in deterministic order; inserts every active work-item claim atomically; creates one cycle; atomically queues it and issues a hashed short-lived capability; provisions the isolated environment; rechecks again immediately before start. If any work item is already actively claimed, the authorisation transaction rolls back to `requested`, then a separate idempotent denial transaction writes audit/outbox; no partial claim, capability or environment exists. |
| AI involvement | None in approval or authority decisions. |
| Stored records | `approval_snapshots`, `approval_requests`, `approval_requirements`, `approval_decisions`, `execution_cycles`, `execution_cycle_work_items`, `execution_work_item_claims`, `runner_capability_grants`, `runner_environments`, `runner_environment_events`, `idempotency_records`, `audit_events`, `outbox_events`, queue/inbox records. |
| Permission check | Current configured approval request backed by the unchanged immutable snapshot/hash; active required memberships; current repository access; one cycle per `execution_plan_version_id`; no selected work item has an active claim; capability claims exactly match approved scope. |
| Success condition | One and only one authorised cycle owns every selected work item and reaches a ready isolated environment with an expiring, runner-only capability. |
| Likely failure conditions | Approval request `stale` or authority revoked, stakeholder left, repository access changed, another cycle actively claims a selected work item, duplicate request, provisioning failure, or authority changes during provisioning. |
| Recovery path | Cancel before capability issuance when invalid; show the conflicting work/cycle without leaking another tenant; return existing cycle on duplicate; retry safe pre-side-effect provisioning up to three times; revoke capability and destroy environment on post-provision authority failure. Safely cancelled work releases claims as `safely_cancelled` only after termination/cleanup; `recovery_required` retains claims pending an `authorised_failure_recovery` decision. |
| Requirement IDs | FR-019–FR-025, FR-031–FR-033, RUN-001–RUN-005, RUN-013, SEC-001, SEC-004, SEC-005, SEC-011, SC-06 |
| Backlog IDs | S5-US02, S5-T02, S5-T03, S5-T05, S5-TEST01 |
| Relevant state transitions | Success: cycle `requested → authorising → queued → provisioning`, environment `requested → creating → ready`, then cycle `provisioning → running` and environment `ready → active`. Claim conflict: `requested → authorising → requested` after rollback plus a separate denial audit/outbox transaction. Invalid authority leads to `cancelling → cancelled`. |

## DJ-17 — Codex works inside the approved boundary

| Field | Demonstration contract |
|---|---|
| User | Developer observes; domain expert sees plain-language status only where granted |
| Screen | Execution activity with Summary and Technical tabs |
| Action | Watches Codex work on the approved repository/branch/files while the system streams safe events and monitors limits and authority. |
| System response | Starts Codex via the Codex SDK, records run/turn/action/usage events, denies unauthorised file/network/tool access before execution, rechecks changing authority, and never labels active work complete. |
| AI involvement | Codex performs the approved coding task. The runner, not the model, enforces capabilities, filesystem/network/tool boundaries and limits. |
| Stored records | Active `execution_work_item_claims`, `agent_runs`, `agent_turns`, `agent_actions`, `execution_usage_events`, `runner_environment_events`, `audit_events`, `outbox_events`; raw sensitive logs are encrypted object references with limited retention. |
| Permission check | Valid unexpired capability bound to cycle/environment; every selected work item remains actively claimed by this cycle; every action passes path/network/tool/secret policy; atomic usage/limit check; approval/membership/repository authority remains current. |
| Success condition | Safe activity is understandable in plain language and inspectable technically; all actions remain in scope and usage remains visible. |
| Likely failure conditions | Blocked file/network attempt, token/cost/turn/task/time limit, approval or membership revocation, repository access loss, material change, cancellation, or runner crash. |
| Recovery path | Deny and record sanitised action; stop with exact reason; revoke capability; generate partial report and review for limits; cancel on authority/material change; retry only before side effects, otherwise preserve workspace/patch and enter `recovery_required`. |
| Requirement IDs | FR-033–FR-036, RUN-006–RUN-008, SEC-004, SEC-005, SEC-011, UX-013–UX-015, SC-07, NFR-003–NFR-005 |
| Backlog IDs | S5-US03, S5-SEC01, S5-T04, S5-T05, S5-TEST01 |
| Relevant state transitions | Cycle remains `running`; denial/decision need moves to `human_input_required`; authority/cancel moves `running → cancelling`; unrecoverable crash `running → recovery_required`; limit later proceeds to `reporting`. |

## DJ-18 — Codex reaches a checkpoint and stops

| Field | Demonstration contract |
|---|---|
| User | Codex triggers; developer resolves with optional domain-expert input |
| Screen | Checkpoint decision |
| Action | Codex reports completed work and asks a bounded product-behaviour question; developer/domain expert supplies the requested decision and explicitly authorises resumption if desired. |
| System response | Stops work, records the checkpoint and reason, revokes or suspends active capability, retains every active work-item claim, shows the next required human action, records input, rechecks approvals/memberships/repository/scope, then issues renewed short-lived authority only if valid. |
| AI involvement | Codex explains why it stopped and what decision it needs; it cannot decide or resume itself. |
| Stored records | `execution_checkpoints`, interim `execution_work_reports`, `execution_reviews` of type `checkpoint`, active `execution_work_item_claims`, capability revocation/renewal, `audit_events`, `outbox_events`. |
| Permission check | Viewer sees only granted detail; responder has checkpoint-decision authority; resumption uses the same immutable plan scope and a full authority recheck. |
| Success condition | The application plainly shows why Codex stopped, the decision needed, who can act, and that work is not complete; an authorised choice can resume safely. |
| Likely failure conditions | No authorised responder, stakeholder leaves, approval becomes stale/revoked, repository access changes, requested answer would materially expand scope, or capability renewal fails. |
| Recovery path | Remain stopped; replace reviewer through authorised policy administration; cancel and create/approve a new plan version for material scope change; restore only identical approved access; or request review of partial work. |
| Requirement IDs | FR-032, FR-035, FR-036, FR-038, RUN-007–RUN-009, UX-013, UX-015, UX-016, SC-08 |
| Backlog IDs | S5-US04, S5-T04, S5-T05, S5-TEST01 |
| Relevant state transitions | Cycle `running → {checkpoint_waiting, human_input_required}`; checkpoint `open → resolved`; after recheck `{checkpoint_waiting, human_input_required} → running`, otherwise `cancelling → cancelled` or `recovery_required`. |

## DJ-19 — Tests, report, code preservation, and cleanup complete

| Field | Demonstration contract |
|---|---|
| User | System, observed by developer |
| Screen | Tests and work report |
| Action | At the configured stop, runs required tests, generates structured/plain/technical reports, preserves changes, creates a commit and pull request where allowed, revokes capability, and destroys the runner. |
| System response | Stores exact test outcomes/files changed/commits/PR, reconciles every external intent before retry, reports failed tests without claiming completion, cleans secrets first, requests human review, and retains all work-item claims while review is outstanding. |
| AI involvement | Codex supplies a structured work report; deterministic collectors and tests verify it against observed changes. |
| Stored records | `execution_test_runs`, `test_runs`, `test_results`, `execution_work_reports`, `code_changes`, `changed_files`, active `execution_work_item_claims`, `runner_capability_grants`, `runner_environments`, `runner_environment_events`, the cycle’s configured review requirements, `audit_events`, and review-notification `outbox_events`. No `execution_reviews` row exists until a human decides. |
| Permission check | Only approved test commands; commit/PR allowed by plan and current GitHub authority; report derives from the current cycle; cleanup does not require an active model capability. |
| Success condition | Tests and limitations are explicit, changes are preserved, no duplicate commit/PR exists, capability is revoked, environment is destroyed, and human review is outstanding. |
| Likely failure conditions | Tests fail, report generation fails, GitHub times out after side effect, runner crashes, graceful cancellation exceeds configured `runner_graceful_shutdown_seconds`, configuration is outside 5–120 seconds, or cleanup fails. |
| Recovery path | Preserve failed results/partial report and request review; reconcile branch/commit/PR before retry; revoke capability, then hard-kill after the configured grace (default 30 seconds); revoke secrets first; retry cleanup with backoff; alert operator and use the documented cleanup/reconciliation command. Use `recovery_required` rather than rerunning after side effects and retain claims until an authorised recovery release. |
| Requirement IDs | FR-034–FR-038, RUN-009, RUN-010, RUN-012, RUN-013, SEC-011, UX-013–UX-015, SC-09 |
| Backlog IDs | S5-US05, S5-T04, S5-T05, S5-TEST01 |
| Relevant state transitions | Cycle `running → testing → reporting → awaiting_review`; environment `active → revoking → destroying → destroyed`; cleanup failure environment `cleanup_failed` and cycle `recovery_required`; tests-failed stop reason remains `tests_failed`, never `completed`. |

## DJ-20 — Developer reviews technical work

| Field | Demonstration contract |
|---|---|
| User | Developer |
| Screen | Execution review → technical details/files/tests/logs/PR |
| Action | Inspects the summary, changed-file diffs, allowed actions, tests, usage, stop reason, limitations, commit and pull request; then approves, adds conditions, requests changes, or rejects. |
| System response | Records an immutable technical review, keeps the cycle `awaiting_review` until all configured review gates pass, and leaves every work-item claim active while stakeholder review is outstanding. |
| AI involvement | Plain-language and technical summaries are visibly machine-generated/derived; the human review is never AI-authored. |
| Stored records | `execution_reviews`, active `execution_work_item_claims`, optional `comments`, linked `execution_work_reports`, `code_changes`, `changed_files`, `audit_events`, `outbox_events`. |
| Permission check | Active assigned technical reviewer with access to repository detail and exact cycle/report; stale or revoked authority cannot decide. |
| Success condition | The developer understands what changed, what ran, why it stopped, and chooses an explicit review outcome; the same work remains claimed so another affected cycle cannot begin before required review completes. |
| Likely failure conditions | Missing diff/log/test evidence, report superseded, reviewer authority lost, failed tests, or unsafe/unexplained change. |
| Recovery path | Keep `awaiting_review` and claims active, regenerate a derived report without altering history, request remediation/new execution-plan version, resolve conditions, or reject. Claim release waits for all configured review gates or an authorised terminal recovery decision. |
| Requirement IDs | FR-034, FR-036–FR-038, RUN-013, UX-013–UX-015, SC-09 |
| Backlog IDs | S5-US05, S5-T05, S5-TEST01 |
| Relevant state transitions | A technical review requirement is outstanding; the human appends one immutable `execution_reviews` decision in `{approved, approved_with_conditions, changes_requested, rejected}`. The cycle remains `awaiting_review` until policy resolves, then reaches `completed` only for completed/passing work or `failed` for a reviewed incomplete outcome. |

## DJ-21 — Domain expert reviews behaviour and team chooses next action

| Field | Demonstration contract |
|---|---|
| User | Domain expert and developer |
| Screen | Stakeholder behaviour review → change/next-cycle decision |
| Action | Chiropractor reviews relevant generic product behaviour in plain language, not source-code administration, and approves, adds conditions, requests changes, or rejects. If changes are material, the developer raises a change proposal and new execution-plan version. |
| System response | Records an immutable stakeholder review, completes the cycle only if all review policy gates pass, and then atomically releases the cycle’s work-item claims with release reason, audit and outbox. If changes/conditions remain or the cycle is `recovery_required`, claims stay active. It classifies/analyses change impact, marks dependent approval requests `stale`, and prevents another cycle on the same execution-plan version. |
| AI involvement | May explain behaviour or impact as labelled advice; human reviewers and deterministic policy own outcomes. |
| Stored records | `execution_reviews`, released or still-active `execution_work_item_claims`, `comments`, `change_proposals`, `change_proposal_versions`, `change_impact_evaluations`, `change_impact_entries`, `change_applications`, new `artifact_versions`/approval records where needed, updated prior `approval_requests`, `audit_events`, `outbox_events`; a new cycle only from a newly approved execution-plan version. |
| Permission check | Guest has stakeholder-review permission only for relevant behaviour; change approval follows configured authority; claim release requires all configured reviews or an explicit authorised recovery/change command; one-cycle-per-plan-version uniqueness; authority rechecked for any new cycle. |
| Success condition | Stakeholders explicitly accept the outcome or create a controlled path for corrections; no active/incomplete/review-pending cycle is shown complete. |
| Likely failure conditions | Guest link/membership revoked, requested change exceeds approved scope, review disagreement, conditions unresolved, or failed tests. |
| Recovery path | Request a new authorised guest link/reviewer assignment, keep cycle and claims awaiting review, create and approve superseding artifacts/execution plan, resolve conditions, or reject/replan. After safe cycle treatment, an authorised failure recovery may use `authorised_failure_recovery`; an authorised change that removes work may use `authorised_change_removed_work`. Never resume under materially obsolete authority. |
| Requirement IDs | FR-023, FR-038–FR-040, RUN-013, UX-002, UX-011–UX-015, SC-09 |
| Backlog IDs | S5-US05, S5-T05, S6-US01, S6-US02, S6-TEST01 |
| Relevant state transitions | A stakeholder review requirement is outstanding; the human appends one immutable `execution_reviews` decision in `{approved, approved_with_conditions, changes_requested, rejected}`. The cycle `awaiting_review → completed` only on satisfied policy, then each claim changes from active (`released_at IS NULL`) to released with reason `required_review_completed`; a material change affects another active cycle via `running → cancelling → cancelled`, with claims released only after safe cancellation. |

## DJ-22 — System prepares the release record

| Field | Demonstration contract |
|---|---|
| User | Developer prepares; configured reviewers approve; both participants view relevant evidence |
| Screen | Release readiness → release approval → immutable release record → Demonstration comparison |
| Action | Selects the reviewed work, verifies each requirement, attaches tests and known limitations/rollback note, obtains configured operational approval, issues the record, and opens the comparison report. |
| System response | Deterministically checks the full graph, blocks missing/failed evidence, freezes and hashes the release version/snapshot, records approval, and publishes an immutable record linking evidence, requirements, plan approval, sprint, execution approval/cycle, code changes, tests, reviews, and limitations. It records readiness; it does not orchestrate deployment. It then appends the final immutable platform-assisted comparison result and renders it beside the already-frozen Direct-to-Codex result with method/limitations visible. |
| AI involvement | May draft a visibly labelled release summary; deterministic queries build traceability and humans approve it. |
| Stored records | `releases`, `release_versions`, `release_work_items`, `release_requirements`, `release_test_evidence`, `release_execution_evidence`, `approval_snapshots`, `approval_requests`, `approval_decisions`, `demonstration_comparisons`, immutable `demonstration_comparison_results`, `audit_events`, `outbox_events`. |
| Permission check | Release preparer and configured reviewers have current project authority; all linked records are exact immutable versions/results; tenant scope and RLS apply; failed/unreviewed work blocks release. |
| Success condition | A reviewer can traverse the complete chain from problem and source evidence to requirements, operational approvals, sprint, execution scope, code, tests, human reviews, limitations, and release hash, then inspect a fair immutable comparison with the direct baseline. |
| Likely failure conditions | Unverified requirement, `stale` approval request, failed/missing test, unresolved condition/risk, incomplete review, mutable/missing link, prohibited content in proposed evidence, unequal comparison controls, missing result hash, or rubric mismatch. |
| Recovery path | Show the exact blocker, add safe immutable evidence or superseding version, rerun verification, obtain current approvals, quarantine/remove prohibited content, and issue a new release version rather than mutate a record. If comparison inputs/rubric differ, mark it incomparable and append a newly controlled result; never rewrite a score. |
| Requirement IDs | FR-041, FR-043, HC-007, SEC-001, SEC-004, SEC-011, SC-10, DEMO-001 |
| Backlog IDs | S5-US06, S6-US03, S6-US04, S6-SEC01, S6-TEST01 |
| Relevant state transitions | Release `draft → verifying → approval_pending → approved → recorded`; blocker returns to `draft`; approval request follows canonical states; release record is immutable after `recorded`. |

## Functionality boundary for the demonstration

### Must be fully functional

The demonstration loses its product or assurance story if any of these are mocked:

1. Better Auth through direct Fastify, internal-principal conversion, organisation/project tenancy, application authorisation, tenant-aware FKs, RLS, audit and outbox.
2. Secure, expiring, revocable project-scoped guest invitation and direct next-action guest UX.
3. Human and AI questions, assignments, autosaved/resumable responses, follow-ups, and comments.
4. Persistent human/import/AI origin labels and human control over every proposal.
5. Immutable evidence fragments, superseding corrections, exact evidence links, artifact versions, and content hashes.
6. Deterministic readiness, exact immutable approval snapshots, configured reviewers, four approval decisions, approval-request staleness, and historical snapshot/decision preservation.
7. Backlog and sprint with links to approved requirements and acceptance criteria.
8. Exact execution plan and approval; one execution cycle per approved plan version; atomic active work-item claims preventing overlap; final authority rechecks; claim retention/release rules.
9. Short-lived capability, separate isolated runner, repository/commit/branch/path/network/tool/secret/limit enforcement, denied-action behaviour, checkpoints and cancellation with validated `runner_graceful_shutdown_seconds`.
10. Safe activity streaming, exact stop reasons, automated tests, structured work report, code/file records, idempotent commit/PR reconciliation, cleanup and human reviews.
11. Change-control impact, immutable release evidence, and full requirement-to-release traceability.
12. Persistent no-patient-information guidance, input/upload filtering and quarantine, privacy-incident handling, and tests.
13. Desktop/mobile, keyboard, screen-reader, plain-language, technical-detail and no-false-completion acceptance criteria.
14. The controlled immutable Direct-to-Codex versus platform-assisted comparison, reproducible rubric, read-only results screen/report, accessible limitations, and no baseline authority confusion.

### May be deliberately simplified

These simplifications preserve the product story and must be labelled honestly:

- One organisation, one `general_business` project, one chiropractor guest, one GitHub.com repository and one deterministic fixture task.
- Light mode with one fixed project approval policy and one fixed execution/review policy; Standard and High-Assurance policies remain implemented and tested but need not dominate the live walkthrough.
- One sprint, one execution-plan version/cycle, one planned checkpoint and one pull request in the happy path.
- One configured OpenAI provider/model per AI function, while provider/model/prompt versions and usage are still stored.
- One controlled comparison fixture/model profile and one versioned scoring rubric; immutable inputs/results and real metric collection may not be replaced by hand-authored favourable scores.
- Manually triggered generation and execution; no automatic sprint scheduling.
- SMTP and in-app notifications without SMS or collaboration-suite integrations.
- A single reference self-hosted topology using PostgreSQL, Redis, S3-compatible storage/MinIO, and a separate runner host/provider.
- Release recording without deployment orchestration, production traffic promotion, billing, analytics dashboards, marketplace integrations, or the future Legal electronic signature module.

## Presenter and recovery notes

Before every rehearsal, reset only the dedicated demo tenant, comparison records and fixture repository through approved repeatable tooling; verify the comparison input/base-commit/model/limits/rubric hashes and GitHub App permissions; run the no-cross-tenant suite; confirm the email catcher and model budget; and verify that no fixture contains patient-identifiable information. Pre-create recovery fixtures for expired invitation, stale approval request, active work-item claim conflict, denied file, checkpoint, failed test, cancellation-grace expiry, and duplicate execution request so failure behaviour can be demonstrated without weakening controls.

The presenter must never bypass a gate to preserve timing. If an external provider is unavailable, show the recorded failed/retryable state and continue with the documented human fallback; do not substitute screenshots for controls listed as fully functional.
