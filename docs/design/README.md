# Tracework product design system

Status: implementation baseline for the first working company version.

Tracework is a calm, evidence-led workspace for small product teams. The visual system must make the next human action obvious, distinguish machine proposals from human decisions, and keep technical execution detail available without forcing it on a non-technical guest.

## Reference direction

The design was developed against four generated working concepts: project overview, guest discovery on mobile, Codex checkpoint, and plan approval. The written system below is the durable implementation source; generated working images are intentionally excluded from the repository. Product states, accessible interaction, responsive composition, and the canonical terminology in `docs/planning/` take precedence over decorative fidelity.

## Brand and voice

- Product name: **Tracework**.
- Promise: **From expert knowledge to reviewed software, with the evidence chain intact.**
- Voice: direct, warm, specific, and calm. Prefer “Review the two changes” over “Action required”.
- Never describe AI output as a decision. Use “AI proposal”, “AI suggestion”, or “AI summary”.
- Never describe a cycle as complete while it is active, paused, testing, reporting, or awaiting review.
- Healthcare-oriented projects always show “Do not enter identifiable patient information.”

## Visual tokens

Use semantic CSS variables in OKLCH and expose them through Tailwind v4 tokens. Do not use gradients.

| Token | Light value | Purpose |
| --- | --- | --- |
| `background` | `oklch(0.985 0.008 102)` | Warm canvas |
| `foreground` | `oklch(0.245 0.025 75)` | Primary ink |
| `card` | `oklch(1 0 0)` | Elevated work surfaces |
| `primary` | `oklch(0.47 0.09 166)` | Forest action and active state |
| `primary-foreground` | `oklch(0.985 0.008 102)` | Text on primary |
| `secondary` | `oklch(0.94 0.025 96)` | Sand controls |
| `muted` | `oklch(0.955 0.012 95)` | Quiet fields and panels |
| `muted-foreground` | `oklch(0.51 0.025 75)` | Supporting copy |
| `accent` | `oklch(0.91 0.04 168)` | Selected and highlighted content |
| `border` | `oklch(0.88 0.018 92)` | Hairlines and dividers |
| `ring` | `oklch(0.56 0.13 166)` | Keyboard focus |
| `destructive` | `oklch(0.56 0.19 28)` | Destructive/error state |
| `warning` | `oklch(0.78 0.13 76)` | Conditions and attention |
| `success` | `oklch(0.58 0.12 155)` | Verified/pass state |
| `ai` | `oklch(0.55 0.13 294)` | Persistent AI origin marker |

- Radius: `0.75rem` for cards and controls; `999px` only for status chips and avatars.
- Shadows: subtle warm-black shadows only on floating layers; do not use shadow as the sole boundary.
- Type: Geist Sans for interface copy, Geist Mono for hashes, code, event IDs, and limits.
- Body: 16px minimum on small screens; supporting copy no smaller than 13px.
- Icons: Lucide only, default 18–20px, with a visible text label for unfamiliar actions.

## Layout

- Desktop application shell: 248px collapsible left rail, 64px top bar, and a content column capped at 1440px.
- Primary work pages use an 8/4 grid: work surface plus contextual evidence/action rail.
- Reading and approval panels cap line length at 72 characters.
- Mobile navigation becomes a compact header and bottom navigation; contextual panels stack after the primary action.
- At 360px, no horizontal scrolling is permitted in core stakeholder workflows. Wide technical tables switch to labelled cards.
- Keep the next-action block in the first viewport whenever practical.

## Core compositions

### Status and origin

- Every status has text, not colour alone.
- AI-created or AI-edited content has a persistent “AI proposal” badge with accessible text; imported and human-authored content use their own origin labels.
- Approval decisions use `Approved`, `Approved with conditions`, `Changes requested`, and `Rejected` exactly.
- A stale approval request keeps its historical decision visible but adds a clear `Stale — review version N` state.

### Evidence-backed content

- Requirements show title, stable ID, current artifact version, origin, acceptance criteria, and evidence count.
- Supporting immutable evidence opens in one interaction on desktop and mobile.
- Evidence excerpts show source, author, captured time, immutable fragment ID, and whether the excerpt is human-authored or imported.

### Guest work

- Secure invitation acceptance lands on the next assigned action within three screens.
- Guest pages omit organisation administration and advanced runner settings.
- Draft answers report `Saving…`, then `Saved just now`; server acknowledgement is required before leaving the page.
- Expired/revoked links disclose no project data and offer a safe request-new-link action.

### Approval

- Header shows the exact version, content hash abbreviation, policy/mode, and readiness state.
- The default view surfaces what changed, conditions, blockers, and outstanding reviewers before the decision controls.
- Destructive or rejecting decisions require a reason. High-Assurance approval requires recent passkey reauthentication but is never labelled a legal signature.

### Codex activity

- Default view explains completed work, current stop reason, limits, changed files, and test result in plain language.
- Technical detail is a progressive-disclosure tab containing actions, files, tests, usage, and sanitised logs.
- Checkpoint cards state why Codex stopped and the precise human decision needed next.
- Scope, branch, commit, network, secret, token, cost, turn, task, and time limits are inspectable before authorisation.

### Traceability and release

- Release records present a readable chain: evidence → requirement → approval snapshot → sprint item → execution cycle → code change → test evidence → review → release approval.
- Each link opens the immutable or versioned record represented by that step.

## Interaction and accessibility

- WCAG 2.2 AA is the target. Visible focus must meet contrast requirements and never be removed.
- All core actions work by keyboard; focus returns predictably when dialogs close.
- Use semantic headings, landmarks, tables, lists, field descriptions, live regions for autosave/status, and explicit error summaries.
- Minimum pointer target is 24px with sufficient spacing; primary mobile actions target at least 44px.
- Respect reduced motion. Animations are short state transitions, not decorative movement.
- Confirmation dialogs are reserved for material/destructive actions. Routine progression uses clear inline feedback.
- Skeletons preserve layout; empty states state why the view is empty and offer the next permitted action.

## Fidelity verification

Before release, compare desktop overview, guest mobile, checkpoint, and plan approval routes against the accepted reference direction. Record purposeful differences in a fidelity ledger containing route, viewport, reference, difference, reason, and verification result. Functional state clarity and accessibility override purely decorative resemblance.
