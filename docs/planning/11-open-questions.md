# Open Questions

## Purpose

This register contains unresolved decisions that can change an implementation slice or production launch. Resolved architectural choices are recorded in [10-decision-log.md](./10-decision-log.md), not duplicated here. A question is not a blocker until the stated decision point.

## Decision convention

Each question has one accountable owner and a decision deadline. Until then, the recommended default is the planning assumption. Choosing another option requires an ADR update and an impact check against requirements, security controls, tests, the demo journey, and backlog ownership.

## Slice blockers

| ID | Question and why it matters | Recommended default | Alternatives and consequences | Owner | Blocks |
|---|---|---|---|---|---|
| OQ-PROD-01 | What product name and public domain will be used? This affects customer-facing identity, invitation trust, email authentication, and OAuth callback URLs. | Use a temporary internal name locally; decide the public name before external invitations. | A late rename is technically manageable but creates migration, communications, and email-reputation work. | Product owner | External Slice 2 pilot, not Slice 1 engineering |
| OQ-ID-01 | Which authentication implementation will satisfy passwordless/MFA, reauthentication, session revocation, and self-hosting requirements? | Select a standards-based OIDC provider through a short Slice 1 spike and keep identity behind an application adapter. | Building identity increases security burden; a managed-only provider weakens the self-hosted promise. | Architecture and security | `EPIC-S1` identity implementation |
| OQ-ID-02 | What reauthentication age and MFA factors apply to High-Assurance project approval and execution approval? | Reauthenticate within 15 minutes; phishing-resistant MFA where the selected provider supports it. | Shorter periods add friction; weaker factors reduce assurance; longer periods weaken step-up value. | Security owner | `EPIC-S3` High-Assurance acceptance criteria |
| OQ-WF-01 | What exact default readiness criteria and approval policy ship for Light, Standard, and High-Assurance modes? | Use the policy matrix in [04-workflows-and-approvals.md](./04-workflows-and-approvals.md), with Light as the two-person default and no configurable policy builder in the first company version. | A policy builder adds scope and validation burden; hard-coded enterprise rules would harm small-team usability. | Product and security | `EPIC-S3` readiness and approval fixtures |
| OQ-AI-01 | Which model/version and evaluation threshold are accepted for question suggestion and artifact proposal? | One configurable OpenAI model per function; release only when the checked-in evaluation set meets the thresholds in [09-testing-strategy.md](./09-testing-strategy.md). | Multiple providers improve portability but multiply evaluations and failure modes. | AI product owner | Each AI function before release in `EPIC-S2` or `EPIC-S3` |
| OQ-GH-01 | What minimum GitHub App permissions and event subscriptions are acceptable? | Repository contents read/write, pull requests read/write, checks read, and metadata read, scoped to selected repositories; subscribe only to installation/repository/permission events used by reconciliation. | Broader permissions simplify integration but violate least privilege; narrower permissions can prevent commits or pull requests. | Integration and security | `EPIC-S5` GitHub App registration |
| OQ-RUN-01 | Which isolation substrate will create and destroy the separate runner environment in the initial self-hosted topology? | Use a replaceable runner-provider interface and select an ephemeral container or microVM implementation only after an adversarial isolation spike. | Containers are operationally simpler; microVMs provide stronger isolation but increase platform work. This choice does not change the trust boundary. | Platform and security | `EPIC-S5` isolated runner implementation |
| OQ-RUN-02 | Which egress destinations and DNS/proxy enforcement mechanism are allowed in the demo repository? | Deny by default; allow only GitHub endpoints, explicitly approved package registries, and the authorised OpenAI endpoint through an audited egress proxy. | Fully disconnected execution may prevent dependency resolution; unrestricted egress is unacceptable. | Security and platform | `EPIC-S5` execution-policy fixture |
| OQ-RUN-03 | What default token, cost, turn, task, and wall-clock limits apply to the demonstration cycle? | Set deliberately small deterministic limits after measuring the fixed demo task; display all values before approval. | Excessively low limits harm reliability; high limits weaken cost and stop-condition demonstrations. | Product and AI operations | Demo configuration in `EPIC-S5` |
| OQ-RUN-04 | Which repository and deterministic task form the production demonstration fixture? | A dedicated non-sensitive GitHub.com repository with a small tested feature and a checkpoint requiring domain feedback. | A changing real repository makes the demonstration non-repeatable and raises data/supply-chain risk. | Demo owner | `DJ-15` through `DJ-21` rehearsal |
| OQ-OPS-01 | What initial service-level, recovery-point, and recovery-time objectives are contractually required? | Start with documented internal targets, daily restore-tested backups, and no contractual uptime until production measurements exist. | Contractual SLOs require redundancy, paging, capacity, and support commitments before launch. | Company leadership and operations | Production launch topology, not local slices |
| OQ-OPS-02 | Who owns privacy incidents, runner containment, security escalation, and after-hours response? | Name primary and secondary humans and rehearse both prohibited-content and runner-cleanup incidents before the first external pilot. | Unassigned ownership makes otherwise sound controls ineffective. | Company leadership | External pilot and production launch |
| OQ-DATA-01 | What exact retention periods apply to project content, audit events, runner logs, quarantined objects, and deletion tombstones? | Adopt the defaults in [03-data-model.md](./03-data-model.md) for development, then obtain privacy and customer input before production. | Shorter retention reduces exposure but may harm traceability; longer retention increases privacy and storage burden. | Privacy and product | Production launch configuration |
| OQ-OSS-01 | What contribution, CLA/DCO, security disclosure, trademark, and release governance accompanies AGPL-3.0? | AGPL-3.0 core, DCO-based contributions, private vulnerability reporting, documented maintainer policy, and separate trademark guidance. | A CLA adds administrative control and contributor friction; absent governance weakens the self-hosted ecosystem. | Company/legal | Public source release, not product implementation |

## Later slice or launch blockers

| ID | Question | Recommended default | Exact blocker |
|---|---|---|---|
| OQ-UX-01 | Which research participants represent non-technical guests? | Recruit at least five professionals who do not routinely use software-delivery tools; healthcare-sector experience is useful but no real patient data may be used. | `EPIC-S2` usability exit |
| OQ-NOTIFY-01 | Which SMTP service is used in hosted environments? | Keep an SMTP adapter and use a local mail catcher in development. | External Slice 2 pilot and production invitations |
| OQ-STORE-01 | Which production S3-compatible service is supported first? | MinIO for self-hosted acceptance; select a managed S3-compatible service only for hosted operations. | Hosted production launch; MinIO resolves self-host acceptance |
| OQ-OBS-01 | Which OpenTelemetry backend is used? | Emit standard OTLP and keep the backend deployment-specific. | Production operations readiness |
| OQ-DEPLOY-01 | Which ingress, secret store, and workload orchestrator form the reference topology? | Publish one Docker-based self-hosted topology first, while keeping runner isolation deployable on a separate worker host. | `SC-14` and production deployment acceptance |

## Future optional Legal electronic signature module

These questions do not block the initial product, Project approval, High-Assurance project approval, any vertical slice, the demonstration, or `SC-01` through `SC-15`.

| ID | Future question | Why it is deferred | Reconsideration condition |
|---|---|---|---|
| FUT-ESIGN-OQ-01 | Which jurisdictions and laws apply to a Legal electronic signature, including any New Zealand review? | No initial workflow needs a Legal electronic signature. | A validated customer use case expressly requires a Legal electronic signature rather than Project approval. |
| FUT-ESIGN-OQ-02 | Which legal-identity and signature provider abstraction is appropriate? | Provider selection depends on jurisdiction, assurance, residency, and evidence requirements. | Jurisdiction and legal opinion are complete. |
| FUT-ESIGN-OQ-03 | What verified legal-name, step-up ceremony, consent wording, and evidence receipt are required? | These are Legal electronic signature concepts and must not be conflated with Project approval. | Legal counsel supplies written requirements. |
| FUT-ESIGN-OQ-04 | Are witnessed, notarised, or multi-party ceremonies required? | They add a distinct workflow and operational model with no initial product value. | A contract or regulated use case requires them. |
| FUT-ESIGN-OQ-05 | What retention, revocation, validation, and long-term evidence format applies to signature receipts? | Core approval snapshots already preserve operational evidence; legal evidence requires a separate lifecycle. | The optional bounded context is funded and designed. |

## Production-launch gate

Production launch is blocked only if the following remain unresolved or unverified:

1. `OQ-ID-01`, because identity and session controls must be implementation-ready.
2. `OQ-OPS-01`, `OQ-OPS-02`, and `OQ-DATA-01`, because operations, incident ownership, recovery, and retention must be explicit.
3. The decisions and tests under `OQ-GH-01`, `OQ-RUN-01`, and `OQ-RUN-02` if controlled execution is enabled.
4. `OQ-NOTIFY-01`, `OQ-OBS-01`, and `OQ-DEPLOY-01` for external invitations and production operations; `OQ-STORE-01` only for hosted production because MinIO is the self-host default.
5. Required privacy terms, security contacts, backup restoration evidence, and the healthcare-data exclusion controls in [06-security-and-privacy.md](./06-security-and-privacy.md).

No future Legal electronic signature question is a production-launch blocker for the core product.
