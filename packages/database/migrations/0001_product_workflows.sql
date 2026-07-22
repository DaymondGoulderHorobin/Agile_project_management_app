begin;

create table workflow_definitions (
  id uuid primary key,
  organisation_id uuid references organisations(id) on delete cascade,
  owner_kind text not null check (owner_kind in ('system','organisation')),
  key text not null,
  name text not null,
  methodology text not null default 'agile',
  created_at timestamptz not null default now(),
  unique nulls not distinct (organisation_id, owner_kind, key),
  check ((owner_kind = 'system' and organisation_id is null) or (owner_kind = 'organisation' and organisation_id is not null))
);

create table workflow_versions (
  id uuid primary key,
  workflow_definition_id uuid not null references workflow_definitions(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status text not null check (status in ('draft','published','retired')),
  configuration jsonb not null default '{}'::jsonb,
  content_hash text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique(workflow_definition_id, version_number),
  unique(workflow_definition_id, content_hash)
);

create table workflow_states (
  id uuid primary key,
  workflow_version_id uuid not null references workflow_versions(id) on delete cascade,
  key text not null,
  label text not null,
  category text not null,
  sort_order integer not null,
  terminal boolean not null default false,
  unique(workflow_version_id, key)
);

create table workflow_transitions (
  id uuid primary key,
  workflow_version_id uuid not null references workflow_versions(id) on delete cascade,
  key text not null,
  from_state_id uuid not null references workflow_states(id) on delete restrict,
  to_state_id uuid not null references workflow_states(id) on delete restrict,
  command_key text not null,
  permission_policy jsonb not null default '{}'::jsonb,
  unique(workflow_version_id, key),
  check (from_state_id <> to_state_id)
);

create table project_workflow_instances (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  workflow_version_id uuid not null references workflow_versions(id) on delete restrict,
  current_state text not null default 'discovery' check (current_state in ('discovery','planning','plan_in_review','ready_for_backlog','delivery','release_in_review','released','on_hold','archived')),
  lock_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organisation_id, id),
  unique(organisation_id, project_id),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade
);

alter table projects add constraint projects_workflow_instance_fk
  foreign key (organisation_id, workflow_instance_id)
  references project_workflow_instances(organisation_id, id)
  deferrable initially deferred;

create table workflow_transition_events (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  workflow_instance_id uuid not null,
  transition_id uuid not null references workflow_transitions(id) on delete restrict,
  from_state text not null,
  to_state text not null,
  actor_id uuid,
  reason text,
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  unique(organisation_id, id),
  foreign key (organisation_id, workflow_instance_id) references project_workflow_instances(organisation_id, id) on delete cascade
);
create index workflow_transition_events_instance_time_idx on workflow_transition_events(organisation_id, workflow_instance_id, created_at);

create table questions (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  origin text not null check (origin in ('human_authored','ai_generated','ai_generated_human_edited','imported','system_generated')),
  author_actor_id uuid,
  prompt text not null,
  rationale text,
  status text not null default 'draft' check (status in ('draft','open','closed','archived')),
  parent_question_id uuid,
  ai_output_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lock_version integer not null default 0,
  unique(organisation_id, id),
  unique(organisation_id, project_id, id),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade,
  foreign key (organisation_id, project_id, parent_question_id) references questions(organisation_id, project_id, id) on delete restrict
);
create index questions_project_status_idx on questions(organisation_id, project_id, status, created_at);

create table question_assignments (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  question_id uuid not null,
  project_membership_id uuid not null,
  due_at timestamptz,
  status text not null default 'assigned' check (status in ('assigned','viewed','completed','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lock_version integer not null default 0,
  unique(organisation_id, id),
  foreign key (organisation_id, project_id, question_id) references questions(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_membership_id) references project_memberships(organisation_id, id) on delete cascade
);
create unique index question_assignments_active_member_uq
  on question_assignments(organisation_id, question_id, project_membership_id) where status <> 'revoked';
create index question_assignments_member_status_idx on question_assignments(organisation_id, project_membership_id, status, due_at);

create table question_response_drafts (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  question_id uuid not null,
  project_membership_id uuid not null,
  body text not null,
  autosaved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lock_version integer not null default 0,
  unique(organisation_id, id),
  unique(organisation_id, question_id, project_membership_id),
  foreign key (organisation_id, project_id, question_id) references questions(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_membership_id) references project_memberships(organisation_id, id) on delete cascade
);

create table question_responses (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  question_id uuid not null,
  respondent_actor_id uuid not null,
  body text not null,
  origin text not null check (origin in ('human_authored','ai_generated','ai_generated_human_edited','imported','system_generated')),
  submitted_at timestamptz not null default now(),
  supersedes_response_id uuid,
  content_hash text not null,
  created_at timestamptz not null default now(),
  unique(organisation_id, id),
  unique(organisation_id, project_id, id),
  foreign key (organisation_id, project_id, question_id) references questions(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, supersedes_response_id) references question_responses(organisation_id, project_id, id) on delete restrict
);
create index question_responses_question_time_idx on question_responses(organisation_id, question_id, submitted_at);

create table knowledge_sources (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  source_type text not null,
  title text not null,
  origin text not null check (origin in ('human_authored','ai_generated','ai_generated_human_edited','imported','system_generated')),
  author_actor_id uuid,
  source_occurred_at timestamptz,
  question_response_id uuid,
  attachment_id uuid,
  external_reference text,
  capture_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(organisation_id, id),
  unique(organisation_id, project_id, id),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade,
  foreign key (organisation_id, project_id, question_response_id) references question_responses(organisation_id, project_id, id) on delete restrict
);

create table source_fragments (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  knowledge_source_id uuid not null,
  fragment_kind text not null,
  text_content text,
  object_range jsonb,
  content_hash text not null,
  origin text not null check (origin in ('human_authored','ai_generated','ai_generated_human_edited','imported','system_generated')),
  captured_at timestamptz not null default now(),
  supersedes_source_fragment_id uuid,
  created_at timestamptz not null default now(),
  unique(organisation_id, id),
  unique(organisation_id, project_id, id),
  unique(organisation_id, knowledge_source_id, content_hash),
  foreign key (organisation_id, project_id, knowledge_source_id) references knowledge_sources(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, supersedes_source_fragment_id) references source_fragments(organisation_id, project_id, id) on delete restrict,
  check (num_nonnulls(text_content, object_range) = 1)
);

create table source_fragment_relationships (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  from_source_fragment_id uuid not null,
  to_source_fragment_id uuid not null,
  relation text not null check (relation in ('supports','contradicts','qualifies','originates_from')),
  rationale text,
  actor_id uuid,
  created_at timestamptz not null default now(),
  unique(organisation_id, id),
  unique(organisation_id, from_source_fragment_id, to_source_fragment_id, relation),
  foreign key (organisation_id, project_id, from_source_fragment_id) references source_fragments(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, to_source_fragment_id) references source_fragments(organisation_id, project_id, id) on delete cascade,
  check (from_source_fragment_id <> to_source_fragment_id)
);

create table artifacts (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  type text not null check (type in ('requirement','assumption','risk','decision','acceptance_criterion','plan','design','release_plan')),
  key text not null,
  title text not null,
  lifecycle text not null default 'active',
  current_version_id uuid,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique(organisation_id, id),
  unique(organisation_id, project_id, id),
  unique(organisation_id, project_id, key),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade
);
create index artifacts_project_type_idx on artifacts(organisation_id, project_id, type, lifecycle);

create table artifact_versions (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  artifact_id uuid not null,
  version_number integer not null check (version_number > 0),
  title text not null,
  narrative_markdown text not null,
  origin text not null check (origin in ('human_authored','ai_generated','ai_generated_human_edited','imported','system_generated')),
  author_actor_id uuid,
  canonical_schema_version integer not null,
  canonical_payload jsonb not null,
  hash_algorithm text not null default 'sha256' check (hash_algorithm = 'sha256'),
  content_hash text not null,
  supersedes_version_id uuid,
  created_at timestamptz not null default now(),
  unique(organisation_id, id),
  unique(organisation_id, project_id, id),
  unique(organisation_id, artifact_id, version_number),
  unique(organisation_id, artifact_id, content_hash),
  foreign key (organisation_id, project_id, artifact_id) references artifacts(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, supersedes_version_id) references artifact_versions(organisation_id, project_id, id) on delete restrict
);
create index artifact_versions_history_idx on artifact_versions(organisation_id, artifact_id, version_number desc);
alter table artifacts add constraint artifacts_current_version_fk
  foreign key (organisation_id, project_id, current_version_id)
  references artifact_versions(organisation_id, project_id, id)
  deferrable initially deferred;

create table artifact_version_state_events (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  artifact_version_id uuid not null,
  sequence integer not null,
  state text not null check (state in ('proposed','draft','in_review','accepted','frozen','superseded','archived')),
  actor_id uuid,
  reason text,
  created_at timestamptz not null default now(),
  unique(organisation_id, id),
  unique(organisation_id, artifact_version_id, sequence),
  foreign key (organisation_id, project_id, artifact_version_id) references artifact_versions(organisation_id, project_id, id) on delete cascade
);

create table artifact_version_relationships (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  from_artifact_version_id uuid not null,
  to_artifact_version_id uuid not null,
  relation_type text not null,
  rationale text,
  actor_id uuid,
  created_at timestamptz not null default now(),
  unique(organisation_id, id),
  unique(organisation_id, from_artifact_version_id, to_artifact_version_id, relation_type),
  foreign key (organisation_id, project_id, from_artifact_version_id) references artifact_versions(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, to_artifact_version_id) references artifact_versions(organisation_id, project_id, id) on delete cascade,
  check (from_artifact_version_id <> to_artifact_version_id)
);

create table artifact_version_evidence_links (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  artifact_version_id uuid not null,
  source_fragment_id uuid not null,
  relation text not null check (relation in ('supports','contradicts','qualifies','originates_from')),
  rationale text,
  link_origin text not null,
  confidence_basis_points integer check (confidence_basis_points between 0 and 10000),
  created_at timestamptz not null default now(),
  unique(organisation_id, id),
  unique(organisation_id, artifact_version_id, source_fragment_id, relation),
  foreign key (organisation_id, project_id, artifact_version_id) references artifact_versions(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, source_fragment_id) references source_fragments(organisation_id, project_id, id) on delete restrict
);
create index artifact_version_evidence_links_fragment_idx on artifact_version_evidence_links(organisation_id, source_fragment_id);

create table requirement_versions (
  artifact_version_id uuid primary key references artifact_versions(id) on delete cascade,
  organisation_id uuid not null,
  project_id uuid not null,
  requirement_class text not null,
  priority text not null,
  verification_method text not null,
  owner_role text,
  status text not null,
  foreign key (organisation_id, project_id, artifact_version_id) references artifact_versions(organisation_id, project_id, id) on delete cascade
);
create table assumption_versions (
  artifact_version_id uuid primary key references artifact_versions(id) on delete cascade,
  organisation_id uuid not null, project_id uuid not null,
  confidence text not null, validation_method text, due_date date, resolution_status text not null,
  foreign key (organisation_id, project_id, artifact_version_id) references artifact_versions(organisation_id, project_id, id) on delete cascade
);
create table risk_versions (
  artifact_version_id uuid primary key references artifact_versions(id) on delete cascade,
  organisation_id uuid not null, project_id uuid not null,
  likelihood integer not null, impact integer not null, severity integer not null,
  owner_role text, response_strategy text, residual_severity integer,
  foreign key (organisation_id, project_id, artifact_version_id) references artifact_versions(organisation_id, project_id, id) on delete cascade
);
create table decision_versions (
  artifact_version_id uuid primary key references artifact_versions(id) on delete cascade,
  organisation_id uuid not null, project_id uuid not null,
  decision_status text not null, decision_date date, decision_owner text,
  alternatives_and_criteria jsonb not null default '{}'::jsonb,
  foreign key (organisation_id, project_id, artifact_version_id) references artifact_versions(organisation_id, project_id, id) on delete cascade
);
create table acceptance_criterion_versions (
  artifact_version_id uuid primary key references artifact_versions(id) on delete cascade,
  organisation_id uuid not null, project_id uuid not null,
  criterion_format text not null, verification_type text not null, automatable boolean not null default false,
  foreign key (organisation_id, project_id, artifact_version_id) references artifact_versions(organisation_id, project_id, id) on delete cascade
);
create table plan_versions (
  artifact_version_id uuid primary key references artifact_versions(id) on delete cascade,
  organisation_id uuid not null, project_id uuid not null,
  objective text not null, intended_users text not null, success_definition text not null,
  dependency_manifest jsonb not null default '{}'::jsonb, readiness_evaluation_id uuid,
  foreign key (organisation_id, project_id, artifact_version_id) references artifact_versions(organisation_id, project_id, id) on delete cascade
);
create table design_versions (
  artifact_version_id uuid primary key references artifact_versions(id) on delete cascade,
  organisation_id uuid not null, project_id uuid not null,
  design_type text not null, structured_references jsonb not null default '{}'::jsonb,
  foreign key (organisation_id, project_id, artifact_version_id) references artifact_versions(organisation_id, project_id, id) on delete cascade
);
create table release_plan_versions (
  artifact_version_id uuid primary key references artifact_versions(id) on delete cascade,
  organisation_id uuid not null, project_id uuid not null,
  release_objective text not null, target_window text, inclusion_policy jsonb not null default '{}'::jsonb,
  rollback_summary text, communication_summary text,
  foreign key (organisation_id, project_id, artifact_version_id) references artifact_versions(organisation_id, project_id, id) on delete cascade
);

create table approval_policies (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid,
  stage text not null,
  name text not null,
  active_version_id uuid,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique(organisation_id, id),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade
);

create table approval_policy_versions (
  id uuid primary key,
  organisation_id uuid not null,
  approval_policy_id uuid not null,
  version_number integer not null check (version_number > 0),
  rules jsonb not null default '{}'::jsonb,
  applicable_mode text check (applicable_mode in ('light','standard','high_assurance')),
  risk_applicability jsonb not null default '{}'::jsonb,
  content_hash text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique(organisation_id, id),
  unique(organisation_id, approval_policy_id, version_number),
  unique(organisation_id, approval_policy_id, content_hash),
  foreign key (organisation_id, approval_policy_id) references approval_policies(organisation_id, id) on delete cascade
);
alter table approval_policies add constraint approval_policies_active_version_fk
  foreign key (organisation_id, active_version_id) references approval_policy_versions(organisation_id, id)
  deferrable initially deferred;

create table approval_snapshots (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  subject_kind text not null,
  subject_id uuid not null,
  subject_version_id uuid not null,
  schema_version integer not null,
  canonical_payload jsonb not null,
  dependency_manifest jsonb not null,
  hash_algorithm text not null default 'sha256' check (hash_algorithm = 'sha256'),
  content_hash text not null,
  created_by_actor_id uuid,
  created_at timestamptz not null default now(),
  unique(organisation_id, id),
  unique(organisation_id, project_id, id),
  unique(organisation_id, content_hash),
  unique(organisation_id, subject_kind, subject_version_id, content_hash),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade
);
create index approval_snapshots_subject_idx on approval_snapshots(organisation_id, subject_kind, subject_id, created_at);

create table approval_requests (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  approval_snapshot_id uuid not null,
  approval_policy_version_id uuid not null,
  state text not null default 'pending' check (state in ('pending','approved','changes_requested','rejected','withdrawn','stale')),
  requested_by_actor_id uuid,
  requested_at timestamptz not null default now(),
  due_at timestamptz,
  completed_at timestamptz,
  stale_at timestamptz,
  stale_reason text,
  replacement_request_id uuid,
  lock_version integer not null default 0,
  unique(organisation_id, id),
  unique(organisation_id, project_id, id),
  unique(organisation_id, project_id, id, approval_snapshot_id),
  foreign key (organisation_id, project_id, approval_snapshot_id) references approval_snapshots(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, approval_policy_version_id) references approval_policy_versions(organisation_id, id) on delete restrict,
  foreign key (organisation_id, project_id, replacement_request_id) references approval_requests(organisation_id, project_id, id) on delete restrict,
  check ((state = 'stale') = (stale_at is not null and stale_reason is not null))
);
create index approval_requests_state_time_idx on approval_requests(organisation_id, state, requested_at);

create table approval_requirements (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  approval_request_id uuid not null,
  requirement_key text not null,
  authority_predicate jsonb not null default '{}'::jsonb,
  minimum_decisions integer not null default 1 check (minimum_decisions > 0),
  distinct_principal_group text,
  role_aggregation_allowed boolean not null default false,
  reauthentication_required boolean not null default false,
  status text not null default 'outstanding' check (status in ('outstanding','satisfied','blocked','waived')),
  created_at timestamptz not null default now(),
  unique(organisation_id, id),
  unique(organisation_id, project_id, id, approval_request_id),
  unique(organisation_id, approval_request_id, requirement_key),
  foreign key (organisation_id, project_id, approval_request_id) references approval_requests(organisation_id, project_id, id) on delete cascade
);

create table approval_decisions (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  approval_request_id uuid not null,
  approval_requirement_id uuid not null,
  approval_snapshot_id uuid not null,
  reviewer_principal_id uuid not null references application_principals(id) on delete restrict,
  reviewer_project_membership_id uuid not null,
  authority_snapshot jsonb not null default '{}'::jsonb,
  decision text not null check (decision in ('approved','approved_with_conditions','changes_requested','rejected')),
  conditions jsonb not null default '[]'::jsonb,
  comment text,
  reauthentication_grant_id uuid,
  decided_at timestamptz not null default now(),
  unique(organisation_id, id),
  foreign key (organisation_id, project_id, approval_request_id, approval_snapshot_id)
    references approval_requests(organisation_id, project_id, id, approval_snapshot_id) on delete restrict,
  foreign key (organisation_id, project_id, approval_requirement_id, approval_request_id)
    references approval_requirements(organisation_id, project_id, id, approval_request_id) on delete restrict,
  foreign key (organisation_id, reviewer_project_membership_id) references project_memberships(organisation_id, id) on delete restrict,
  foreign key (organisation_id, reauthentication_grant_id) references reauthentication_grants(organisation_id, id) on delete restrict,
  check (jsonb_typeof(conditions) = 'array')
);
create index approval_decisions_request_requirement_idx on approval_decisions(organisation_id, approval_request_id, approval_requirement_id, decided_at);

create table approval_revocations (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  approval_request_id uuid not null,
  approval_decision_id uuid,
  revoked_by_actor_id uuid not null,
  reason text not null,
  effective_at timestamptz not null default now(),
  replacement_request_id uuid,
  unique(organisation_id, id),
  foreign key (organisation_id, project_id, approval_request_id) references approval_requests(organisation_id, project_id, id) on delete restrict,
  foreign key (organisation_id, approval_decision_id) references approval_decisions(organisation_id, id) on delete restrict
);
create index approval_revocations_request_time_idx on approval_revocations(organisation_id, approval_request_id, effective_at);

create table approval_condition_resolutions (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  approval_decision_id uuid not null,
  condition_key text not null,
  resolver_principal_id uuid not null references application_principals(id) on delete restrict,
  status text not null check (status in ('accepted','resolved','rejected')),
  resolution text not null,
  evidence_manifest jsonb not null default '{}'::jsonb,
  resolved_at timestamptz not null default now(),
  unique(organisation_id, id),
  foreign key (organisation_id, approval_decision_id) references approval_decisions(organisation_id, id) on delete restrict
);

create table readiness_rule_sets (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid,
  stage text not null,
  mode text not null check (mode in ('light','standard','high_assurance')),
  key text not null,
  active_version_id uuid,
  created_at timestamptz not null default now(),
  unique(organisation_id, id),
  unique nulls not distinct (organisation_id, project_id, key),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade
);

create table readiness_rule_set_versions (
  id uuid primary key,
  organisation_id uuid not null,
  readiness_rule_set_id uuid not null,
  version_number integer not null check (version_number > 0),
  definitions jsonb not null default '{}'::jsonb,
  content_hash text not null,
  created_at timestamptz not null default now(),
  unique(organisation_id, id),
  unique(organisation_id, readiness_rule_set_id, version_number),
  foreign key (organisation_id, readiness_rule_set_id) references readiness_rule_sets(organisation_id, id) on delete cascade
);
alter table readiness_rule_sets add constraint readiness_rule_sets_active_version_fk
  foreign key (organisation_id, active_version_id) references readiness_rule_set_versions(organisation_id, id)
  deferrable initially deferred;

create table readiness_evaluations (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  subject_kind text not null,
  subject_version_id uuid not null,
  readiness_rule_set_version_id uuid not null,
  state text not null default 'requested' check (state in ('requested','running','passed','blocked','failed')),
  evaluated_at timestamptz,
  input_manifest jsonb not null default '{}'::jsonb,
  input_hash text not null,
  completion_basis_points integer check (completion_basis_points between 0 and 10000),
  created_at timestamptz not null default now(),
  unique(organisation_id, id),
  unique(organisation_id, project_id, id),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade,
  foreign key (organisation_id, readiness_rule_set_version_id) references readiness_rule_set_versions(organisation_id, id) on delete restrict
);

create table readiness_rule_results (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  readiness_evaluation_id uuid not null,
  rule_key text not null,
  severity text not null check (severity in ('blocking','warning','informational')),
  outcome text not null check (outcome in ('satisfied','unsatisfied','not_applicable','error')),
  explanation text not null,
  related_entities jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(organisation_id, id),
  unique(organisation_id, readiness_evaluation_id, rule_key),
  foreign key (organisation_id, project_id, readiness_evaluation_id) references readiness_evaluations(organisation_id, project_id, id) on delete cascade
);

alter table plan_versions add constraint plan_versions_readiness_evaluation_fk
  foreign key (organisation_id, project_id, readiness_evaluation_id)
  references readiness_evaluations(organisation_id, project_id, id) on delete restrict;

create table iterations (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  kind text not null default 'sprint' check (kind = 'sprint'),
  sequence integer not null,
  name text not null,
  goal text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  state text not null default 'draft' check (state in ('draft','planned','approval_pending','approved','ready','active','completed','cancelled')),
  approval_snapshot_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lock_version integer not null default 0,
  unique(organisation_id, id),
  unique(organisation_id, project_id, id),
  unique(organisation_id, project_id, sequence),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade,
  foreign key (organisation_id, project_id, approval_snapshot_id) references approval_snapshots(organisation_id, project_id, id) on delete restrict,
  check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create table work_items (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  parent_work_item_id uuid,
  kind text not null check (kind in ('epic','story','task','bug')),
  key text not null,
  title text not null,
  description text not null,
  status text not null default 'proposed' check (status in ('proposed','accepted','ready','in_progress','blocked','done','cancelled')),
  priority text not null,
  order_key numeric(24,12) not null,
  origin text not null check (origin in ('human_authored','ai_generated','ai_generated_human_edited','imported','system_generated')),
  estimate_value numeric(10,2),
  estimate_unit text,
  created_by_actor_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  lock_version integer not null default 0,
  unique(organisation_id, id),
  unique(organisation_id, project_id, id),
  unique(organisation_id, project_id, key),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade,
  foreign key (organisation_id, project_id, parent_work_item_id) references work_items(organisation_id, project_id, id) on delete restrict
);
create index work_items_project_status_order_idx on work_items(organisation_id, project_id, status, order_key);

create table work_item_assignees (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  work_item_id uuid not null, project_membership_id uuid not null, assigned_at timestamptz not null default now(),
  unique(organisation_id, id), unique(organisation_id, work_item_id, project_membership_id),
  foreign key (organisation_id, project_id, work_item_id) references work_items(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_membership_id) references project_memberships(organisation_id, id) on delete cascade
);
create table work_item_dependencies (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  predecessor_work_item_id uuid not null, successor_work_item_id uuid not null, dependency_type text not null,
  created_at timestamptz not null default now(), unique(organisation_id, id),
  unique(organisation_id, predecessor_work_item_id, successor_work_item_id, dependency_type),
  foreign key (organisation_id, project_id, predecessor_work_item_id) references work_items(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, successor_work_item_id) references work_items(organisation_id, project_id, id) on delete cascade,
  check (predecessor_work_item_id <> successor_work_item_id)
);
create table work_item_artifact_version_links (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  work_item_id uuid not null, artifact_version_id uuid not null,
  relation text not null check (relation in ('implements','verifies','informed_by','blocked_by')),
  created_at timestamptz not null default now(), unique(organisation_id, id),
  unique(organisation_id, work_item_id, artifact_version_id, relation),
  foreign key (organisation_id, project_id, work_item_id) references work_items(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, artifact_version_id) references artifact_versions(organisation_id, project_id, id) on delete restrict
);
create table iteration_work_items (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  iteration_id uuid not null, work_item_id uuid not null, planned_order integer not null,
  committed boolean not null default false, created_at timestamptz not null default now(),
  unique(organisation_id, id), unique(organisation_id, iteration_id, work_item_id),
  foreign key (organisation_id, project_id, iteration_id) references iterations(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, work_item_id) references work_items(organisation_id, project_id, id) on delete cascade
);
create table work_item_acceptance_criteria (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  work_item_id uuid not null, acceptance_criterion_artifact_version_id uuid not null,
  created_at timestamptz not null default now(), unique(organisation_id, id),
  unique(organisation_id, work_item_id, acceptance_criterion_artifact_version_id),
  foreign key (organisation_id, project_id, work_item_id) references work_items(organisation_id, project_id, id) on delete cascade,
  foreign key (organisation_id, project_id, acceptance_criterion_artifact_version_id) references artifact_versions(organisation_id, project_id, id) on delete restrict
);

create table ai_use_cases (
  id uuid primary key, key text not null unique, description text not null,
  risk_class text not null, interaction_mode text not null, created_at timestamptz not null default now()
);
create table prompt_definitions (
  id uuid primary key, key text not null, code_version text not null,
  schema_identifier text not null, input_policy_version text not null,
  created_at timestamptz not null default now(), unique(key, code_version)
);
create table model_profiles (
  id uuid primary key, organisation_id uuid references organisations(id) on delete cascade,
  ai_use_case_id uuid not null references ai_use_cases(id) on delete restrict,
  provider text not null, model text not null, configuration jsonb not null default '{}'::jsonb,
  budget_defaults jsonb not null default '{}'::jsonb, enabled text not null default 'enabled',
  created_at timestamptz not null default now()
);
create table ai_jobs (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  ai_use_case_id uuid not null references ai_use_cases(id) on delete restrict,
  prompt_definition_id uuid not null references prompt_definitions(id) on delete restrict,
  model_profile_id uuid not null references model_profiles(id) on delete restrict,
  input_manifest jsonb not null default '{}'::jsonb, input_hash text not null,
  state text not null default 'requested' check (state in ('requested','filtering','queued','running','completed','refused','failed','cancelling','cancelled')),
  idempotency_key text not null, cancellation_reason text, requested_by_actor_id uuid,
  requested_at timestamptz not null default now(), started_at timestamptz, completed_at timestamptz,
  lock_version integer not null default 0,
  unique(organisation_id, id), unique(organisation_id, project_id, id),
  unique(organisation_id, project_id, idempotency_key),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade
);
create index ai_jobs_state_time_idx on ai_jobs(organisation_id, state, requested_at);
create table ai_outputs (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null, ai_job_id uuid not null,
  output_schema_version text not null, structured_output jsonb not null,
  origin text not null default 'ai_generated' check (origin in ('ai_generated','ai_generated_human_edited')),
  proposal_state text not null default 'proposed' check (proposal_state in ('proposed','accepted','edited_and_accepted','dismissed','expired')),
  refusal_or_error_classification text, human_disposition_actor_id uuid, human_disposition_at timestamptz,
  accepted_target_kind text, accepted_target_id uuid, raw_object_reference text, raw_object_expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique(organisation_id, id), unique(organisation_id, project_id, id),
  foreign key (organisation_id, project_id, ai_job_id) references ai_jobs(organisation_id, project_id, id) on delete cascade,
  check ((proposal_state in ('accepted','edited_and_accepted','dismissed')) = (human_disposition_actor_id is not null and human_disposition_at is not null))
);
alter table questions add constraint questions_ai_output_fk
  foreign key (organisation_id, project_id, ai_output_id) references ai_outputs(organisation_id, project_id, id) on delete restrict;
create table content_provenance_links (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  target_kind text not null, target_id uuid not null, target_version_id uuid,
  origin text not null check (origin in ('human_authored','ai_generated','ai_generated_human_edited','imported','system_generated')),
  human_actor_id uuid, ai_output_id uuid, imported_source_reference text, transformation_kind text not null,
  created_at timestamptz not null default now(), unique(organisation_id, id),
  foreign key (organisation_id, project_id, ai_output_id) references ai_outputs(organisation_id, project_id, id) on delete restrict,
  check (num_nonnulls(ai_output_id, imported_source_reference, human_actor_id) >= 1)
);
create index content_provenance_links_target_idx on content_provenance_links(organisation_id, project_id, target_kind, target_id);
create table ai_usage_events (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null, ai_job_id uuid not null,
  provider_request_id text not null, event_key text not null, input_tokens integer not null default 0,
  cached_input_tokens integer not null default 0, output_tokens integer not null default 0,
  cost_minor_units integer not null default 0, currency text not null, occurred_at timestamptz not null,
  unique(organisation_id, id), unique(provider_request_id, event_key),
  foreign key (organisation_id, project_id, ai_job_id) references ai_jobs(organisation_id, project_id, id) on delete cascade,
  check (input_tokens >= 0 and cached_input_tokens >= 0 and output_tokens >= 0 and cost_minor_units >= 0)
);
create table ai_evaluation_cases (
  id uuid primary key, ai_use_case_id uuid not null references ai_use_cases(id) on delete cascade,
  key text not null, dataset_version text not null, fixture_data jsonb not null default '{}'::jsonb,
  expected_assertions jsonb not null default '{}'::jsonb,
  sensitivity_classification text not null default 'synthetic_general_business',
  created_at timestamptz not null default now(), unique(ai_use_case_id, key, dataset_version)
);
create table ai_evaluation_runs (
  id uuid primary key, ai_use_case_id uuid not null references ai_use_cases(id) on delete restrict,
  prompt_definition_id uuid not null references prompt_definitions(id) on delete restrict,
  model_profile_id uuid not null references model_profiles(id) on delete restrict,
  dataset_version text not null, scores_and_results jsonb not null default '{}'::jsonb,
  release_gate_outcome text not null, created_at timestamptz not null default now()
);
create table demonstration_comparisons (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  synthetic_scenario_key text not null, fixture_version text not null,
  baseline_input_object_reference text not null, baseline_input_hash text not null,
  platform_manifest jsonb not null default '{}'::jsonb,
  state text not null default 'requested' check (state in ('requested','running','completed','failed','cancelled')),
  current_result_id uuid, requested_at timestamptz not null default now(), completed_at timestamptz,
  lock_version integer not null default 0, unique(organisation_id, id),
  unique(organisation_id, project_id, synthetic_scenario_key, fixture_version),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade
);
create table demonstration_comparison_results (
  id uuid primary key, organisation_id uuid not null, project_id uuid not null,
  demonstration_comparison_id uuid not null, result_version integer not null check (result_version > 0),
  method_schema_version text not null, baseline_output_object_reference text not null,
  baseline_output_hash text not null, platform_output_manifest jsonb not null default '{}'::jsonb,
  platform_output_hash text not null, structured_findings jsonb not null default '{}'::jsonb,
  traceability_metrics jsonb not null default '{}'::jsonb,
  stakeholder_confidence_evidence jsonb not null default '{}'::jsonb,
  content_hash text not null, supersedes_result_id uuid, created_at timestamptz not null default now(),
  unique(organisation_id, id), unique(organisation_id, demonstration_comparison_id, result_version),
  unique(organisation_id, demonstration_comparison_id, content_hash),
  foreign key (organisation_id, demonstration_comparison_id) references demonstration_comparisons(organisation_id, id) on delete cascade
);
alter table demonstration_comparisons add constraint demonstration_comparisons_current_result_fk
  foreign key (organisation_id, current_result_id) references demonstration_comparison_results(organisation_id, id)
  deferrable initially deferred;

commit;
