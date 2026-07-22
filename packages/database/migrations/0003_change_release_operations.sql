begin;

create table comments (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  target_kind text not null, target_id uuid not null, target_version_id uuid,
  parent_comment_id uuid, author_principal_id uuid not null references application_principals(id) on delete restrict,
  body text not null, created_at timestamptz not null default now(), edited_at timestamptz,
  archived_at timestamptz, lock_version integer not null default 0,
  unique(organisation_id, id), unique(organisation_id, project_id, id),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade,
  foreign key (organisation_id, project_id, parent_comment_id) references comments(organisation_id, project_id, id) on delete restrict
);
create index comments_target_idx on comments(organisation_id, project_id, target_kind, target_id, created_at);
create table comment_edits (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null, comment_id uuid not null,
  previous_body_hash text not null, replacement_body_hash text not null,
  editor_principal_id uuid not null references application_principals(id) on delete restrict,
  safe_reason text, created_at timestamptz not null default now(), unique(organisation_id, id),
  foreign key (organisation_id, project_id, comment_id) references comments(organisation_id, project_id, id) on delete restrict
);
create table mentions (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null, comment_id uuid not null,
  mentioned_principal_id uuid not null references application_principals(id) on delete restrict,
  notification_state text not null default 'pending', created_at timestamptz not null default now(),
  unique(organisation_id, id), unique(organisation_id, comment_id, mentioned_principal_id),
  foreign key (organisation_id, project_id, comment_id) references comments(organisation_id, project_id, id) on delete cascade
);
create table notifications (
  id uuid primary key, organisation_id uuid not null, project_id uuid,
  recipient_principal_id uuid not null references application_principals(id) on delete restrict,
  type text not null, target_kind text not null, target_id uuid not null, action_key text,
  channel_states jsonb not null default '{}'::jsonb, dedupe_key text not null,
  created_at timestamptz not null default now(), read_at timestamptz, expires_at timestamptz,
  unique(organisation_id, id), unique(organisation_id, recipient_principal_id, dedupe_key),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade
);
create index notifications_recipient_unread_idx on notifications(organisation_id, recipient_principal_id, created_at desc) where read_at is null;

create table attachments (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  uploader_principal_id uuid not null references application_principals(id) on delete restrict,
  object_key text not null unique, original_name text not null, display_name text not null,
  declared_content_type text not null, detected_content_type text,
  size_bytes bigint not null check (size_bytes >= 0), sha256_hash text not null,
  scan_status text not null default 'pending' check (scan_status in ('pending','clean','suspicious','malware','failed')),
  quarantine_status text not null default 'restricted' check (quarantine_status in ('restricted','released','purge_pending','purged')),
  created_at timestamptz not null default now(), retained_until timestamptz, deleted_at timestamptz,
  unique(organisation_id, id), unique(organisation_id, project_id, id),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade
);
create index attachments_quarantine_idx on attachments(organisation_id, quarantine_status, created_at);
alter table knowledge_sources add constraint knowledge_sources_attachment_fk
  foreign key (organisation_id, project_id, attachment_id) references attachments(organisation_id, project_id, id) on delete restrict;

create table prohibited_content_incidents (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  attachment_id uuid, input_kind text, input_id uuid,
  detection_source text not null,
  restricted_status text not null default 'open' check (restricted_status in ('open','contained','remediated','closed')),
  external_provider_exposure boolean not null default false,
  object_storage_exposure boolean not null default false,
  reporter_principal_id uuid references application_principals(id) on delete restrict,
  handler_principal_id uuid references application_principals(id) on delete restrict,
  safe_summary text not null, suspected_category text not null,
  containment_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), contained_at timestamptz,
  remediated_at timestamptz, resolved_at timestamptz, lock_version integer not null default 0,
  unique(organisation_id, id), unique(organisation_id, project_id, id),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade,
  foreign key (organisation_id, project_id, attachment_id) references attachments(organisation_id, project_id, id) on delete restrict,
  check (num_nonnulls(attachment_id, input_id) = 1)
);
create index prohibited_content_incidents_open_idx on prohibited_content_incidents(organisation_id, project_id, created_at) where restricted_status <> 'closed';
create table prohibited_content_incident_decisions (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  prohibited_content_incident_id uuid not null,
  decision text not null check (decision in ('confirmed_prohibited','false_positive','remediation_complete','close')),
  decided_by_principal_id uuid not null references application_principals(id) on delete restrict,
  safe_rationale text not null, evidence_hash text not null, decided_at timestamptz not null default now(),
  unique(organisation_id, id),
  foreign key (organisation_id, project_id, prohibited_content_incident_id)
    references prohibited_content_incidents(organisation_id, project_id, id) on delete restrict
);

create table audit_events (
  id uuid primary key, organisation_id uuid not null, project_id uuid,
  sequence bigint not null, occurred_at timestamptz not null default now(),
  actor_type text not null check (actor_type in ('user','guest','service','runner','system','operator')),
  actor_id uuid, event_type text not null, aggregate_type text not null, aggregate_id uuid not null,
  aggregate_version integer, before_hash text, after_hash text,
  safe_metadata jsonb not null default '{}'::jsonb,
  correlation_id uuid not null, causation_id uuid,
  unique(organisation_id, id), unique(organisation_id, sequence),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete restrict
);
create index audit_events_org_time_idx on audit_events(organisation_id, occurred_at desc);
create index audit_events_project_time_idx on audit_events(organisation_id, project_id, occurred_at desc);
create index audit_events_aggregate_idx on audit_events(organisation_id, aggregate_type, aggregate_id, occurred_at desc);
create index audit_events_correlation_idx on audit_events(correlation_id);

create table outbox_events (
  id uuid primary key, organisation_id uuid not null, event_id uuid not null unique,
  event_type text not null, event_version integer not null,
  aggregate_type text not null, aggregate_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(), available_at timestamptz not null default now(),
  attempts integer not null default 0, delivered_at timestamptz, dead_lettered_at timestamptz,
  last_error_code text, unique(organisation_id, id)
);
create index outbox_events_pending_idx on outbox_events(available_at, id) where delivered_at is null and dead_lettered_at is null;
create table inbox_events (
  id uuid primary key, organisation_id uuid not null, source text not null, external_id text not null,
  event_type text not null, event_version integer not null, payload jsonb not null default '{}'::jsonb,
  payload_hash text not null, received_at timestamptz not null default now(), processed_at timestamptz,
  attempts integer not null default 0, result jsonb not null default '{}'::jsonb,
  unique(organisation_id, id), unique(source, external_id)
);
create table idempotency_records (
  id uuid primary key, organisation_id uuid not null, scope text not null, key text not null,
  request_hash text not null, result_kind text, result_id uuid,
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  created_at timestamptz not null default now(), completed_at timestamptz, expires_at timestamptz not null,
  unique(organisation_id, id), unique(organisation_id, scope, key)
);
create index idempotency_records_expiry_idx on idempotency_records(expires_at);
create table queue_job_intents (
  id uuid primary key, organisation_id uuid not null, project_id uuid,
  execution_cycle_id uuid, job_name text not null,
  deterministic_job_id text not null unique, attempt integer not null check (attempt > 0),
  state text not null default 'pending' check (state in ('pending','enqueued','running','completed','failed','dead_letter')),
  payload jsonb not null default '{}'::jsonb, available_at timestamptz not null default now(),
  completed_at timestamptz, last_error_code text, created_at timestamptz not null default now(),
  unique(organisation_id, id),
  foreign key (organisation_id, project_id, execution_cycle_id) references execution_cycles(organisation_id, project_id, id) on delete restrict,
  check (job_name in ('execution.authorise','runner.provision','runner.start','execution.run-tests','execution.generate-report','execution.cancel','runner.cleanup','execution.request-review','execution.reconcile'))
);
create index queue_job_intents_pending_idx on queue_job_intents(available_at, id) where state in ('pending','failed');

create table data_export_jobs (
  id uuid primary key, organisation_id uuid not null,
  requested_by_principal_id uuid not null references application_principals(id) on delete restrict,
  scope jsonb not null default '{}'::jsonb,
  state text not null default 'requested' check (state in ('requested','running','completed','failed','expired')),
  object_reference text, content_hash text, requested_at timestamptz not null default now(),
  completed_at timestamptz, expires_at timestamptz, unique(organisation_id, id)
);
create table retention_actions (
  id uuid primary key, organisation_id uuid not null, policy_key text not null,
  target_kind text not null, target_id uuid not null, action text not null,
  safe_metadata jsonb not null default '{}'::jsonb, scheduled_at timestamptz not null,
  completed_at timestamptz, created_at timestamptz not null default now(), unique(organisation_id, id)
);
create index retention_actions_pending_idx on retention_actions(scheduled_at) where completed_at is null;

create table change_proposals (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  key text not null, title text not null, current_version_id uuid,
  state text not null default 'proposed' check (state in ('proposed','classified','impact_assessed','approved','rejected','applying','applied','recovery_required')),
  created_at timestamptz not null default now(), lock_version integer not null default 0,
  unique(organisation_id, id), unique(organisation_id, project_id, id),
  unique(organisation_id, project_id, key),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade
);
create table change_proposal_versions (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  change_proposal_id uuid not null, version_number integer not null check (version_number > 0),
  rationale text not null, proposed_classification text not null check (proposed_classification in ('minor','material','fundamental')),
  confirmed_classification text check (confirmed_classification in ('minor','material','fundamental')),
  origin text not null check (origin in ('human_authored','ai_generated','ai_generated_human_edited','imported','system_generated')),
  author_actor_id uuid, change_detail jsonb not null, content_hash text not null,
  supersedes_version_id uuid, created_at timestamptz not null default now(),
  unique(organisation_id, id), unique(organisation_id, project_id, id),
  unique(organisation_id, change_proposal_id, version_number), unique(organisation_id, change_proposal_id, content_hash),
  foreign key (organisation_id, project_id, change_proposal_id) references change_proposals(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, supersedes_version_id) references change_proposal_versions(organisation_id, project_id, id) on delete restrict
);
alter table change_proposals add constraint change_proposals_current_version_fk
  foreign key (organisation_id, project_id, current_version_id) references change_proposal_versions(organisation_id, project_id, id)
  deferrable initially deferred;
create table change_impact_evaluations (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  change_proposal_version_id uuid not null,
  state text not null default 'requested' check (state in ('requested','running','completed','failed')),
  evaluated_classification text not null check (evaluated_classification in ('minor','material','fundamental')),
  input_manifest jsonb not null default '{}'::jsonb, input_hash text not null, rule_version text not null,
  evaluated_at timestamptz, created_at timestamptz not null default now(),
  unique(organisation_id, id), unique(organisation_id, project_id, id),
  unique(organisation_id, change_proposal_version_id, input_hash),
  foreign key (organisation_id, project_id, change_proposal_version_id) references change_proposal_versions(organisation_id, project_id, id) on delete restrict
);
create table change_impact_entries (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  change_impact_evaluation_id uuid not null, affected_subject_kind text not null,
  affected_subject_id uuid not null, affected_subject_version_id uuid,
  effect text not null check (effect in ('none','review','supersede','stale_approval','cancel_cycle','reverify_release')),
  reason text not null, rule_key text not null, created_at timestamptz not null default now(),
  unique(organisation_id, id),
  foreign key (organisation_id, project_id, change_impact_evaluation_id) references change_impact_evaluations(organisation_id, project_id, id) on delete cascade
);
create unique index change_impact_entries_meaningful_uq
  on change_impact_entries(organisation_id, change_impact_evaluation_id, affected_subject_kind,
    affected_subject_id, coalesce(affected_subject_version_id, '00000000-0000-0000-0000-000000000000'::uuid), effect);
create table change_applications (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  change_proposal_version_id uuid not null, approval_snapshot_id uuid not null,
  idempotency_key text not null,
  state text not null default 'approved' check (state in ('approved','applying','applied','recovery_required')),
  safe_recovery_metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz, completed_at timestamptz, lock_version integer not null default 0,
  created_at timestamptz not null default now(), unique(organisation_id, id),
  unique(organisation_id, change_proposal_version_id), unique(organisation_id, project_id, idempotency_key),
  foreign key (organisation_id, project_id, change_proposal_version_id) references change_proposal_versions(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, project_id, approval_snapshot_id) references approval_snapshots(organisation_id, project_id, id) on delete restrict
);

create table test_cases (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  key text not null, title text not null, type text not null, definition jsonb not null default '{}'::jsonb,
  version_number integer not null check (version_number > 0), status text not null default 'active',
  created_at timestamptz not null default now(), unique(organisation_id, id), unique(organisation_id, project_id, id),
  unique(organisation_id, project_id, key, version_number),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade
);
create table test_case_acceptance_criteria (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  test_case_id uuid not null, acceptance_criterion_artifact_version_id uuid not null,
  created_at timestamptz not null default now(), unique(organisation_id, id),
  unique(organisation_id, test_case_id, acceptance_criterion_artifact_version_id),
  foreign key (organisation_id, project_id, test_case_id) references test_cases(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, acceptance_criterion_artifact_version_id) references artifact_versions(organisation_id, project_id, id) on delete restrict
);
create table test_runs (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  execution_cycle_id uuid, repository_id uuid, git_ref text, runner_provider text not null,
  state text not null default 'requested' check (state in ('requested','running','passed','failed','cancelled','error')),
  started_at timestamptz, completed_at timestamptz, summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), unique(organisation_id, id), unique(organisation_id, project_id, id),
  foreign key (organisation_id, project_id, execution_cycle_id) references execution_cycles(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, repository_id) references repositories(organisation_id, id) on delete restrict
);
create table test_results (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  test_run_id uuid not null, test_case_id uuid, test_key text not null,
  state text not null check (state in ('passed','failed','skipped','error')),
  duration_milliseconds integer not null check (duration_milliseconds >= 0),
  output_object_reference text, output_hash text, failure_classification text,
  created_at timestamptz not null default now(), unique(organisation_id, id), unique(organisation_id, project_id, id),
  unique(organisation_id, test_run_id, test_key),
  foreign key (organisation_id, project_id, test_run_id) references test_runs(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, test_case_id) references test_cases(organisation_id, project_id, id) on delete restrict
);

create table releases (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  key text not null, name text not null,
  state text not null default 'draft' check (state in ('draft','verifying','approval_pending','approved','recorded','superseded')),
  current_version_id uuid, created_at timestamptz not null default now(), lock_version integer not null default 0,
  unique(organisation_id, id), unique(organisation_id, project_id, id), unique(organisation_id, project_id, key),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade
);
create table release_versions (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  release_id uuid not null, version_number integer not null check (version_number > 0),
  objective text not null, inclusion_manifest jsonb not null default '{}'::jsonb,
  evidence_manifest jsonb not null default '{}'::jsonb, known_limitations text not null,
  unresolved_risks text not null, rollback_note text not null, content_hash text not null,
  status text not null check (status in ('draft','frozen','approved','recorded','superseded')),
  approval_snapshot_id uuid, supersedes_version_id uuid, created_at timestamptz not null default now(),
  unique(organisation_id, id), unique(organisation_id, project_id, id),
  unique(organisation_id, release_id, version_number), unique(organisation_id, release_id, content_hash),
  foreign key (organisation_id, project_id, release_id) references releases(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, approval_snapshot_id) references approval_snapshots(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, project_id, supersedes_version_id) references release_versions(organisation_id, project_id, id) on delete restrict
);
alter table releases add constraint releases_current_version_fk
  foreign key (organisation_id, project_id, current_version_id) references release_versions(organisation_id, project_id, id)
  deferrable initially deferred;
create table release_work_items (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  release_version_id uuid not null, work_item_id uuid not null, frozen_manifest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), unique(organisation_id, id),
  unique(organisation_id, release_version_id, work_item_id),
  foreign key (organisation_id, project_id, release_version_id) references release_versions(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, work_item_id) references work_items(organisation_id, project_id, id) on delete restrict
);
create table release_requirements (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  release_version_id uuid not null, requirement_artifact_version_id uuid not null,
  verification_status text not null check (verification_status in ('unverified','verified','failed','accepted_limitation')),
  evidence_references jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  unique(organisation_id, id), unique(organisation_id, release_version_id, requirement_artifact_version_id),
  foreign key (organisation_id, project_id, release_version_id) references release_versions(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, requirement_artifact_version_id) references artifact_versions(organisation_id, project_id, id) on delete restrict
);
create table release_test_evidence (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  release_version_id uuid not null, test_run_id uuid not null, test_result_id uuid, evidence_hash text not null,
  created_at timestamptz not null default now(), unique(organisation_id, id),
  foreign key (organisation_id, project_id, release_version_id) references release_versions(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, test_run_id) references test_runs(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, project_id, test_result_id) references test_results(organisation_id, project_id, id) on delete restrict
);
create unique index release_test_evidence_meaningful_uq
  on release_test_evidence(organisation_id, release_version_id, test_run_id,
    coalesce(test_result_id, '00000000-0000-0000-0000-000000000000'::uuid));
create table release_execution_evidence (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  release_version_id uuid not null, execution_cycle_id uuid not null,
  execution_work_report_id uuid not null, execution_review_id uuid not null, evidence_hash text not null,
  created_at timestamptz not null default now(), unique(organisation_id, id),
  unique(organisation_id, release_version_id, execution_cycle_id),
  foreign key (organisation_id, project_id, release_version_id) references release_versions(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, execution_cycle_id) references execution_cycles(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, project_id, execution_work_report_id) references execution_work_reports(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, execution_review_id) references execution_reviews(organisation_id, id) on delete restrict
);

commit;
