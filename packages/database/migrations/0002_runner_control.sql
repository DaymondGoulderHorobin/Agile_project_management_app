begin;

create table integrations (
  id uuid primary key, organisation_id uuid not null references organisations(id) on delete cascade,
  kind text not null, encrypted_configuration_reference text not null,
  status text not null default 'active', last_health_checked_at timestamptz,
  created_at timestamptz not null default now(), lock_version integer not null default 0,
  unique(organisation_id, id)
);
create table github_installations (
  id uuid primary key, organisation_id uuid not null, integration_id uuid not null,
  github_installation_id text not null unique, github_account_id text not null,
  permissions jsonb not null default '{}'::jsonb, status text not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  lock_version integer not null default 0, unique(organisation_id, id),
  foreign key (organisation_id, integration_id) references integrations(organisation_id, id) on delete cascade
);
create table repositories (
  id uuid primary key, organisation_id uuid not null, github_installation_id uuid not null,
  external_repository_id text not null unique, owner text not null, name text not null,
  default_branch text not null, visibility text not null check (visibility in ('private','internal','public')),
  archived boolean not null default false, status text not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  lock_version integer not null default 0, unique(organisation_id, id),
  foreign key (organisation_id, github_installation_id) references github_installations(organisation_id, id) on delete cascade
);
create table project_repositories (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null, repository_id uuid not null,
  purpose text not null default 'delivery', allowed_configuration jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','active','access_lost','revoked')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  lock_version integer not null default 0, unique(organisation_id, id),
  unique(organisation_id, project_id, repository_id),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade,
  foreign key (organisation_id, repository_id) references repositories(organisation_id, id) on delete cascade
);
create table repository_access_snapshots (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null, repository_id uuid not null,
  installation_permissions jsonb not null default '{}'::jsonb,
  branch_policy jsonb not null default '{}'::jsonb, metadata_hash text not null,
  observed_at timestamptz not null default now(), unique(organisation_id, id),
  unique(organisation_id, project_id, id),
  foreign key (organisation_id, repository_id) references repositories(organisation_id, id) on delete cascade
);
create index repository_access_snapshots_repository_time_idx on repository_access_snapshots(organisation_id, repository_id, observed_at desc);
create table webhook_inbox_events (
  id uuid primary key, organisation_id uuid not null, provider text not null,
  delivery_id text not null, event_type text not null,
  signature_status text not null check (signature_status in ('valid','invalid','missing')),
  safe_headers jsonb not null default '{}'::jsonb, body_object_reference text not null,
  body_hash text not null, processing_state text not null default 'received'
    check (processing_state in ('received','processing','processed','failed','dead_letter')),
  attempts integer not null default 0, received_at timestamptz not null default now(), processed_at timestamptz,
  unique(organisation_id, id), unique(provider, delivery_id)
);
create index webhook_inbox_events_processing_idx on webhook_inbox_events(processing_state, received_at);

create table execution_plans (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  key text not null, title text not null, current_version_id uuid,
  created_by_actor_id uuid, created_at timestamptz not null default now(), archived_at timestamptz,
  unique(organisation_id, id), unique(organisation_id, project_id, id),
  unique(organisation_id, project_id, key),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade
);
create table execution_plan_versions (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  execution_plan_id uuid not null, version_number integer not null check (version_number > 0),
  status text not null default 'draft' check (status in ('draft','frozen','approval_pending','approved','superseded','withdrawn')),
  objective text not null, project_plan_artifact_version_id uuid not null,
  repository_id uuid not null, repository_access_snapshot_id uuid not null,
  approved_commit_sha text not null, branch_strategy text not null, branch_name text not null,
  path_policy jsonb not null default '{}'::jsonb, network_policy jsonb not null default '{}'::jsonb,
  tool_policy jsonb not null default '{}'::jsonb, secret_policy jsonb not null default '{}'::jsonb,
  acceptance_policy jsonb not null default '{}'::jsonb, test_policy jsonb not null default '{}'::jsonb,
  stop_policy jsonb not null default '{}'::jsonb, review_policy jsonb not null default '{}'::jsonb,
  policy_schema_version integer not null,
  max_turns integer not null check (max_turns > 0), max_tasks integer not null check (max_tasks > 0),
  max_input_tokens bigint not null check (max_input_tokens > 0),
  max_output_tokens bigint not null check (max_output_tokens > 0),
  max_cost_minor_units bigint not null check (max_cost_minor_units >= 0),
  currency text not null, max_duration_seconds integer not null check (max_duration_seconds > 0),
  canonical_payload jsonb not null, content_hash text not null,
  supersedes_version_id uuid, created_by_actor_id uuid, created_at timestamptz not null default now(),
  unique(organisation_id, id), unique(organisation_id, project_id, id),
  unique(organisation_id, execution_plan_id, version_number),
  unique(organisation_id, execution_plan_id, content_hash),
  foreign key (organisation_id, project_id, execution_plan_id) references execution_plans(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, project_plan_artifact_version_id) references artifact_versions(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, repository_id) references repositories(organisation_id, id) on delete restrict,
  foreign key (organisation_id, project_id, repository_access_snapshot_id) references repository_access_snapshots(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, project_id, supersedes_version_id) references execution_plan_versions(organisation_id, project_id, id) on delete restrict
);
alter table execution_plans add constraint execution_plans_current_version_fk
  foreign key (organisation_id, project_id, current_version_id)
  references execution_plan_versions(organisation_id, project_id, id)
  deferrable initially deferred;

create table execution_cycles (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  execution_plan_version_id uuid not null unique,
  state text not null default 'requested' check (state in ('requested','authorising','queued','provisioning','running','checkpoint_waiting','human_input_required','testing','reporting','awaiting_review','completed','cancelling','cancelled','failed','recovery_required')),
  stop_reason text check (stop_reason is null or stop_reason in ('checkpoint_reached','human_input_required','scope_violation','token_limit','cost_limit','turn_limit','task_limit','time_limit','tests_failed','approval_revoked','membership_revoked','repository_access_lost','material_change','user_cancelled','runner_crash','completed')),
  request_idempotency_key text not null, approval_snapshot_id uuid not null,
  current_runner_environment_id uuid, requested_by_actor_id uuid not null,
  requested_at timestamptz not null default now(), started_at timestamptz, stopped_at timestamptz,
  lock_version integer not null default 0,
  unique(organisation_id, id), unique(organisation_id, project_id, id),
  unique(organisation_id, project_id, request_idempotency_key),
  foreign key (organisation_id, project_id, execution_plan_version_id) references execution_plan_versions(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, project_id, approval_snapshot_id) references approval_snapshots(organisation_id, project_id, id) on delete restrict,
  check (state not in ('completed','cancelled','failed') or stopped_at is not null),
  check (state <> 'completed' or stop_reason = 'completed')
);
create index execution_cycles_state_time_idx on execution_cycles(organisation_id, state, requested_at);

create table execution_cycle_work_items (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  execution_cycle_id uuid not null, work_item_id uuid not null,
  frozen_manifest jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  unique(organisation_id, id), unique(organisation_id, execution_cycle_id, work_item_id),
  foreign key (organisation_id, project_id, execution_cycle_id) references execution_cycles(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, work_item_id) references work_items(organisation_id, project_id, id) on delete restrict
);
create table execution_work_item_claims (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  execution_cycle_id uuid not null, work_item_id uuid not null,
  claimed_at timestamptz not null default now(), released_at timestamptz,
  release_reason text, release_authorisation jsonb, created_at timestamptz not null default now(),
  unique(organisation_id, id), unique(organisation_id, execution_cycle_id, work_item_id),
  foreign key (organisation_id, project_id, execution_cycle_id) references execution_cycles(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, project_id, work_item_id) references work_items(organisation_id, project_id, id) on delete restrict,
  check ((released_at is null and release_reason is null and release_authorisation is null) or
         (released_at is not null and release_reason in ('required_review_completed','safely_cancelled','authorised_failure_recovery','authorised_change_removed_work') and release_authorisation is not null)),
  check (released_at is null or released_at >= claimed_at)
);
create unique index execution_work_item_claims_active_work_uq
  on execution_work_item_claims(organisation_id, work_item_id) where released_at is null;

create table runner_environments (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  execution_cycle_id uuid not null, provider text not null, runtime_identity text,
  state text not null default 'requested' check (state in ('requested','creating','ready','active','revoking','destroying','destroyed','cleanup_failed')),
  workspace_reference text, preserved_patch_object_reference text,
  cleanup_attempts integer not null default 0 check (cleanup_attempts >= 0),
  cleanup_error_code text, cleanup_safe_summary text,
  requested_at timestamptz not null default now(), creating_at timestamptz, ready_at timestamptz,
  active_at timestamptz, revoking_at timestamptz, destroying_at timestamptz, destroyed_at timestamptz,
  lock_version integer not null default 0,
  unique(organisation_id, id), unique(organisation_id, project_id, id),
  foreign key (organisation_id, project_id, execution_cycle_id) references execution_cycles(organisation_id, project_id, id) on delete restrict,
  check ((state = 'destroyed') = (destroyed_at is not null)),
  check (state <> 'cleanup_failed' or (cleanup_error_code is not null and cleanup_safe_summary is not null))
);
create unique index runner_environments_active_cycle_uq
  on runner_environments(organisation_id, execution_cycle_id) where state <> 'destroyed';
create index runner_environments_state_idx on runner_environments(organisation_id, state, requested_at);
alter table execution_cycles add constraint execution_cycles_current_environment_fk
  foreign key (organisation_id, project_id, current_runner_environment_id)
  references runner_environments(organisation_id, project_id, id)
  deferrable initially deferred;

create table runner_capability_grants (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  execution_cycle_id uuid not null, runner_environment_id uuid not null,
  token_hash text not null unique, jti_hash text not null unique,
  scope jsonb not null default '{}'::jsonb, scope_hash text not null,
  issued_at timestamptz not null default now(), expires_at timestamptz not null,
  revoked_at timestamptz, revoked_reason text, renewal_parent_grant_id uuid,
  unique(organisation_id, id), unique(organisation_id, project_id, id),
  foreign key (organisation_id, project_id, execution_cycle_id) references execution_cycles(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, project_id, runner_environment_id) references runner_environments(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, project_id, renewal_parent_grant_id) references runner_capability_grants(organisation_id, project_id, id) on delete restrict,
  check (expires_at > issued_at), check ((revoked_at is null) = (revoked_reason is null))
);
create unique index runner_capability_grants_active_environment_uq
  on runner_capability_grants(organisation_id, runner_environment_id) where revoked_at is null;

create table runner_secret_leases (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  execution_cycle_id uuid not null, runner_environment_id uuid not null,
  secret_key text not null, lease_reference_hash text not null,
  issued_at timestamptz not null default now(), expires_at timestamptz not null,
  revoked_at timestamptz, revoked_reason text,
  unique(organisation_id, id), unique(organisation_id, runner_environment_id, secret_key, issued_at),
  foreign key (organisation_id, project_id, execution_cycle_id) references execution_cycles(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, project_id, runner_environment_id) references runner_environments(organisation_id, project_id, id) on delete restrict,
  check (expires_at > issued_at), check ((revoked_at is null) = (revoked_reason is null))
);
create index runner_secret_leases_active_environment_idx on runner_secret_leases(organisation_id, runner_environment_id) where revoked_at is null;

create table runner_environment_events (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  runner_environment_id uuid not null, sequence integer not null,
  from_state text, to_state text not null, safe_metadata jsonb not null default '{}'::jsonb,
  correlation_id uuid not null, occurred_at timestamptz not null default now(),
  unique(organisation_id, id), unique(organisation_id, runner_environment_id, sequence),
  foreign key (organisation_id, project_id, runner_environment_id) references runner_environments(organisation_id, project_id, id) on delete restrict
);
create table agent_runs (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  execution_cycle_id uuid not null, runner_environment_id uuid not null,
  provider text not null, external_thread_reference text, external_process_reference text,
  state text not null default 'starting' check (state in ('starting','running','stopped','failed')),
  attempt integer not null check (attempt > 0), started_at timestamptz, stopped_at timestamptz, stop_reason text,
  unique(organisation_id, id), unique(organisation_id, project_id, id),
  unique(organisation_id, execution_cycle_id, attempt),
  foreign key (organisation_id, project_id, execution_cycle_id) references execution_cycles(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, project_id, runner_environment_id) references runner_environments(organisation_id, project_id, id) on delete restrict
);
create table agent_turns (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  execution_cycle_id uuid not null, agent_run_id uuid not null, sequence integer not null,
  state text not null default 'requested' check (state in ('requested','running','completed','failed','cancelled')),
  input_manifest_hash text not null, output_manifest_hash text, provider_response_id text,
  usage_summary jsonb not null default '{}'::jsonb, started_at timestamptz, ended_at timestamptz,
  unique(organisation_id, id), unique(organisation_id, project_id, id),
  unique(organisation_id, project_id, execution_cycle_id, id),
  unique(organisation_id, agent_run_id, sequence),
  foreign key (organisation_id, project_id, agent_run_id) references agent_runs(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, project_id, execution_cycle_id) references execution_cycles(organisation_id, project_id, id) on delete restrict
);
create table agent_actions (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  execution_cycle_id uuid not null, agent_turn_id uuid not null, sequence integer not null,
  action_type text not null, target_summary text not null,
  policy_decision text not null check (policy_decision in ('allowed','denied')),
  status text not null check (status in ('planned','started','completed','failed','denied','cancelled')),
  exit_code integer, error_classification text, safe_metadata jsonb not null default '{}'::jsonb,
  raw_object_reference text, raw_object_expires_at timestamptz,
  occurred_at timestamptz not null default now(), unique(organisation_id, id),
  unique(organisation_id, agent_turn_id, sequence),
  foreign key (organisation_id, project_id, execution_cycle_id, agent_turn_id)
    references agent_turns(organisation_id, project_id, execution_cycle_id, id) on delete restrict,
  check (policy_decision <> 'denied' or status = 'denied')
);
create index agent_actions_cycle_time_idx on agent_actions(organisation_id, execution_cycle_id, occurred_at);

create table execution_checkpoints (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  execution_cycle_id uuid not null, sequence integer not null,
  kind text not null check (kind in ('planned','human_input','scope_denial','failure','limit')),
  status text not null default 'open' check (status in ('open','resolved','superseded')),
  requested_decision text, snapshot_reference text, work_report_id uuid,
  created_at timestamptz not null default now(), resolved_at timestamptz,
  resolved_by_principal_id uuid, resolution text,
  unique(organisation_id, id), unique(organisation_id, execution_cycle_id, sequence),
  foreign key (organisation_id, project_id, execution_cycle_id) references execution_cycles(organisation_id, project_id, id) on delete restrict
);
create table execution_usage_events (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  execution_cycle_id uuid not null, agent_run_id uuid, agent_turn_id uuid,
  usage_kind text not null, quantity bigint not null check (quantity >= 0), unit text not null,
  cost_minor_units bigint not null default 0 check (cost_minor_units >= 0), currency text not null,
  provider_event_id text not null unique, occurred_at timestamptz not null,
  unique(organisation_id, id),
  foreign key (organisation_id, project_id, execution_cycle_id) references execution_cycles(organisation_id, project_id, id) on delete restrict
);
create table execution_usage_totals (
  execution_cycle_id uuid primary key,
  organisation_id uuid not null, project_id uuid not null,
  turns bigint not null default 0 check (turns >= 0), tasks bigint not null default 0 check (tasks >= 0),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  cost_minor_units bigint not null default 0 check (cost_minor_units >= 0),
  elapsed_seconds bigint not null default 0 check (elapsed_seconds >= 0),
  updated_at timestamptz not null default now(), lock_version integer not null default 0,
  unique(organisation_id, execution_cycle_id),
  foreign key (organisation_id, project_id, execution_cycle_id) references execution_cycles(organisation_id, project_id, id) on delete restrict
);
create table execution_test_runs (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  execution_cycle_id uuid not null, test_definition_manifest jsonb not null default '{}'::jsonb,
  command_manifest jsonb not null default '{}'::jsonb,
  status text not null default 'requested' check (status in ('requested','running','passed','failed','cancelled','error')),
  started_at timestamptz, completed_at timestamptz, summary jsonb not null default '{}'::jsonb,
  raw_object_reference text, raw_object_expires_at timestamptz,
  unique(organisation_id, id), unique(organisation_id, project_id, id),
  foreign key (organisation_id, project_id, execution_cycle_id) references execution_cycles(organisation_id, project_id, id) on delete restrict
);
create table execution_work_reports (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  execution_cycle_id uuid not null, version_number integer not null check (version_number > 0),
  structured_schema_version text not null, structured_payload jsonb not null,
  plain_language_summary text not null, technical_summary text not null, stop_reason text not null,
  content_hash text not null, supersedes_work_report_id uuid, created_at timestamptz not null default now(),
  unique(organisation_id, id), unique(organisation_id, project_id, id),
  unique(organisation_id, execution_cycle_id, version_number),
  unique(organisation_id, execution_cycle_id, content_hash),
  foreign key (organisation_id, project_id, execution_cycle_id) references execution_cycles(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, project_id, supersedes_work_report_id) references execution_work_reports(organisation_id, project_id, id) on delete restrict
);
alter table execution_checkpoints add constraint execution_checkpoints_work_report_fk
  foreign key (organisation_id, project_id, work_report_id) references execution_work_reports(organisation_id, project_id, id) on delete restrict;
create table execution_reviews (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  execution_cycle_id uuid not null, execution_work_report_id uuid not null,
  reviewer_project_membership_id uuid not null,
  review_type text not null check (review_type in ('technical','stakeholder','checkpoint')),
  decision text not null check (decision in ('approved','approved_with_conditions','changes_requested','rejected')),
  comments text, conditions jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(),
  unique(organisation_id, id),
  foreign key (organisation_id, project_id, execution_cycle_id) references execution_cycles(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, project_id, execution_work_report_id) references execution_work_reports(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, reviewer_project_membership_id) references project_memberships(organisation_id, id) on delete restrict,
  check (jsonb_typeof(conditions) = 'array')
);
create table execution_cancellation_requests (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  execution_cycle_id uuid not null, requested_by_actor_id uuid not null,
  reason text not null, graceful_shutdown_seconds integer not null default 30 check (graceful_shutdown_seconds between 5 and 120),
  requested_at timestamptz not null default now(), acknowledged_at timestamptz, hard_kill_at timestamptz,
  unique(organisation_id, id),
  foreign key (organisation_id, project_id, execution_cycle_id) references execution_cycles(organisation_id, project_id, id) on delete restrict
);

create table code_changes (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  execution_cycle_id uuid not null, repository_id uuid not null, side_effect_key text not null,
  branch text not null, base_commit_sha text not null, head_commit_sha text,
  pull_request_number bigint, pull_request_url text, pull_request_status text,
  intent_state text not null default 'planned', completion_state text not null default 'pending',
  created_at timestamptz not null default now(), completed_at timestamptz, lock_version integer not null default 0,
  unique(organisation_id, id), unique(organisation_id, project_id, id), unique(organisation_id, side_effect_key),
  foreign key (organisation_id, project_id, execution_cycle_id) references execution_cycles(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, repository_id) references repositories(organisation_id, id) on delete restrict
);
create table changed_files (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  code_change_id uuid not null, normalised_path text not null,
  change_type text not null check (change_type in ('added','modified','deleted','renamed')),
  additions integer not null default 0 check (additions >= 0),
  deletions integer not null default 0 check (deletions >= 0),
  before_blob_hash text, after_blob_hash text, created_at timestamptz not null default now(),
  unique(organisation_id, id), unique(organisation_id, code_change_id, normalised_path),
  foreign key (organisation_id, project_id, code_change_id) references code_changes(organisation_id, project_id, id) on delete restrict
);

commit;
