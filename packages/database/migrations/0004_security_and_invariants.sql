begin;

create or replace function tracework.protect_immutable_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  old_value jsonb := to_jsonb(old);
  new_value jsonb := to_jsonb(new);
  allowed_column text;
begin
  foreach allowed_column in array tg_argv loop
    old_value := old_value - allowed_column;
    new_value := new_value - allowed_column;
  end loop;
  if old_value is distinct from new_value then
    raise exception '% immutable content cannot be changed', tg_table_name using errcode = '55000';
  end if;
  return new;
end;
$$;

create or replace function tracework.validate_single_use_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.consumed_at is not null and new.consumed_at is distinct from old.consumed_at then
    raise exception 'consumed_at cannot be changed after consumption' using errcode = '55000';
  end if;
  if old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at then
    raise exception 'revoked_at cannot be changed after revocation' using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger reauthentication_grants_protect_content
before update on reauthentication_grants for each row
execute function tracework.protect_immutable_columns('consumed_at','revoked_at');
create trigger reauthentication_grants_single_use
before update on reauthentication_grants for each row
execute function tracework.validate_single_use_lifecycle();

create or replace function tracework.validate_claim_release()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.released_at is not null then
    raise exception 'execution work-item claim was already released' using errcode = '55000';
  end if;
  if new.released_at is null then
    raise exception 'execution work-item claim updates may only release the claim' using errcode = '55000';
  end if;
  return new;
end;
$$;
create trigger execution_work_item_claims_protect_content
before update on execution_work_item_claims for each row
execute function tracework.protect_immutable_columns('released_at','release_reason','release_authorisation');
create trigger execution_work_item_claims_release_once
before update on execution_work_item_claims for each row
execute function tracework.validate_claim_release();

create or replace function tracework.validate_capability_revocation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.revoked_at is not null then
    raise exception 'runner capability was already revoked' using errcode = '55000';
  end if;
  if new.revoked_at is null or new.revoked_reason is null then
    raise exception 'runner capability updates may only revoke the grant' using errcode = '55000';
  end if;
  return new;
end;
$$;
create trigger runner_capability_grants_protect_content
before update on runner_capability_grants for each row
execute function tracework.protect_immutable_columns('revoked_at','revoked_reason');
create trigger runner_capability_grants_revoke_once
before update on runner_capability_grants for each row
execute function tracework.validate_capability_revocation();

create or replace function tracework.validate_cycle_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  allowed boolean := false;
begin
  if new.state = old.state then
    return new;
  end if;
  allowed := case old.state
    when 'requested' then new.state in ('authorising','cancelling')
    when 'authorising' then new.state in ('queued','cancelling')
    when 'queued' then new.state in ('provisioning','cancelling')
    when 'provisioning' then new.state in ('running','cancelling','failed')
    when 'running' then new.state in ('checkpoint_waiting','human_input_required','testing','cancelling','failed','recovery_required')
    when 'checkpoint_waiting' then new.state in ('running','cancelling')
    when 'human_input_required' then new.state in ('running','cancelling')
    when 'testing' then new.state = 'reporting'
    when 'reporting' then new.state = 'awaiting_review'
    when 'awaiting_review' then new.state in ('completed','failed')
    when 'cancelling' then new.state in ('cancelled','recovery_required')
    else false
  end;
  if not allowed then
    raise exception 'invalid execution cycle transition: % -> %', old.state, new.state using errcode = '23514';
  end if;
  if new.lock_version <> old.lock_version + 1 then
    raise exception 'execution cycle transition requires lock_version increment' using errcode = '40001';
  end if;
  return new;
end;
$$;
create trigger execution_cycles_transition_ck
before update of state on execution_cycles for each row execute function tracework.validate_cycle_transition();

create or replace function tracework.validate_cycle_terminal_invariants()
returns trigger
language plpgsql
set search_path = 'pg_catalog', 'public'
as $$
begin
  if new.state = 'completed' and old.state is distinct from new.state then
    if new.stop_reason <> 'completed' then
      raise exception 'completed cycle requires completed stop reason' using errcode = '23514';
    end if;
    if not exists (select 1 from public.execution_work_reports r where r.organisation_id = new.organisation_id and r.execution_cycle_id = new.id) then
      raise exception 'completed cycle requires an immutable work report' using errcode = '23514';
    end if;
    if not exists (select 1 from public.execution_test_runs t where t.organisation_id = new.organisation_id and t.execution_cycle_id = new.id and t.status = 'passed')
       or exists (select 1 from public.execution_test_runs t where t.organisation_id = new.organisation_id and t.execution_cycle_id = new.id and t.status <> 'passed') then
      raise exception 'completed cycle requires all recorded execution tests to pass' using errcode = '23514';
    end if;
    if not exists (select 1 from public.execution_reviews v where v.organisation_id = new.organisation_id and v.execution_cycle_id = new.id and v.decision in ('approved','approved_with_conditions'))
       or exists (select 1 from public.execution_reviews v where v.organisation_id = new.organisation_id and v.execution_cycle_id = new.id and v.decision in ('changes_requested','rejected')) then
      raise exception 'completed cycle requires satisfied human review' using errcode = '23514';
    end if;
  end if;
  if new.state in ('completed','cancelled') and old.state is distinct from new.state then
    if exists (select 1 from public.runner_capability_grants g where g.organisation_id = new.organisation_id and g.execution_cycle_id = new.id and g.revoked_at is null) then
      raise exception 'terminal cycle has an unrevoked runner capability' using errcode = '23514';
    end if;
    if exists (select 1 from public.runner_secret_leases s where s.organisation_id = new.organisation_id and s.execution_cycle_id = new.id and s.revoked_at is null) then
      raise exception 'terminal cycle has an unrevoked secret lease' using errcode = '23514';
    end if;
    if exists (select 1 from public.runner_environments e where e.organisation_id = new.organisation_id and e.execution_cycle_id = new.id and e.state <> 'destroyed') then
      raise exception 'terminal cycle has an undestroyed runner environment' using errcode = '23514';
    end if;
    if exists (select 1 from public.execution_work_item_claims c where c.organisation_id = new.organisation_id and c.execution_cycle_id = new.id and c.released_at is null) then
      raise exception 'terminal cycle has an active work-item claim' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger execution_cycles_terminal_invariants_ck
before update of state on execution_cycles for each row execute function tracework.validate_cycle_terminal_invariants();

create or replace function tracework.validate_environment_transition()
returns trigger
language plpgsql
set search_path = 'pg_catalog', 'public'
as $$
declare
  allowed boolean := false;
begin
  if new.state = old.state then return new; end if;
  allowed := case old.state
    when 'requested' then new.state in ('creating','destroying')
    when 'creating' then new.state in ('ready','destroying')
    when 'ready' then new.state in ('active','revoking','destroying')
    when 'active' then new.state = 'revoking'
    when 'revoking' then new.state = 'destroying'
    when 'destroying' then new.state in ('destroyed','cleanup_failed')
    when 'cleanup_failed' then new.state = 'destroying'
    else false
  end;
  if not allowed then
    raise exception 'invalid runner environment transition: % -> %', old.state, new.state using errcode = '23514';
  end if;
  if new.lock_version <> old.lock_version + 1 then
    raise exception 'runner environment transition requires lock_version increment' using errcode = '40001';
  end if;
  if new.state = 'cleanup_failed' then
    if exists (select 1 from public.runner_capability_grants g where g.organisation_id = new.organisation_id and g.runner_environment_id = new.id and g.revoked_at is null)
       or exists (select 1 from public.runner_secret_leases s where s.organisation_id = new.organisation_id and s.runner_environment_id = new.id and s.revoked_at is null) then
      raise exception 'cleanup_failed requires capability and secret revocation first' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger runner_environments_transition_ck
before update of state on runner_environments for each row execute function tracework.validate_environment_transition();

do $$
declare
  immutable_table text;
begin
  foreach immutable_table in array array[
    'workflow_transition_events','question_responses','source_fragments','source_fragment_relationships',
    'artifact_versions','artifact_version_state_events','artifact_version_relationships','artifact_version_evidence_links',
    'requirement_versions','assumption_versions','risk_versions','decision_versions','acceptance_criterion_versions',
    'plan_versions','design_versions','release_plan_versions','approval_policy_versions','approval_snapshots',
    'approval_requirements','approval_decisions','approval_revocations','approval_condition_resolutions',
    'readiness_rule_set_versions','readiness_rule_results','ai_usage_events','ai_evaluation_cases','ai_evaluation_runs',
    'demonstration_comparison_results','repository_access_snapshots','runner_environment_events',
    'execution_cycle_work_items','execution_usage_events','execution_work_reports','execution_reviews','changed_files',
    'prohibited_content_incident_decisions','audit_events','comment_edits','change_proposal_versions',
    'change_impact_entries','test_results','release_work_items','release_requirements','release_test_evidence',
    'release_execution_evidence'
  ] loop
    execute format(
      'create trigger %I before update or delete on %I for each row execute function tracework.prevent_mutation()',
      immutable_table || '_immutable', immutable_table
    );
  end loop;
end;
$$;

create trigger execution_plan_versions_protect_content
before update on execution_plan_versions for each row
execute function tracework.protect_immutable_columns('status');
create trigger release_versions_protect_content
before update on release_versions for each row
execute function tracework.protect_immutable_columns('status','approval_snapshot_id');
create trigger outbox_events_protect_payload
before update on outbox_events for each row
execute function tracework.protect_immutable_columns('attempts','delivered_at','dead_lettered_at','last_error_code','available_at');
create trigger inbox_events_protect_payload
before update on inbox_events for each row
execute function tracework.protect_immutable_columns('processed_at','attempts','result');

alter table organisations enable row level security;
alter table organisations force row level security;
create policy organisations_tenant_select on organisations for select
  using (id = tracework.current_organisation_id());
create policy organisations_tenant_write on organisations for all
  using (id = tracework.current_organisation_id())
  with check (id = tracework.current_organisation_id() and tracework.current_permission_context_id() is not null);

alter table workflow_definitions enable row level security;
alter table workflow_definitions force row level security;
create policy workflow_definitions_read on workflow_definitions for select
  using (organisation_id is null or organisation_id = tracework.current_organisation_id());
create policy workflow_definitions_write on workflow_definitions for all
  using (organisation_id = tracework.current_organisation_id())
  with check (organisation_id = tracework.current_organisation_id() and tracework.current_permission_context_id() is not null);

alter table model_profiles enable row level security;
alter table model_profiles force row level security;
create policy model_profiles_read on model_profiles for select
  using (organisation_id is null or organisation_id = tracework.current_organisation_id());
create policy model_profiles_write on model_profiles for all
  using (organisation_id = tracework.current_organisation_id())
  with check (organisation_id = tracework.current_organisation_id() and tracework.current_permission_context_id() is not null);

do $$
declare
  tenant_table record;
begin
  for tenant_table in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attname = 'organisation_id' and not a.attisdropped
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname not in ('organisations','workflow_definitions','model_profiles','permission_contexts')
  loop
    execute format('alter table %I enable row level security', tenant_table.table_name);
    execute format('alter table %I force row level security', tenant_table.table_name);
    execute format(
      'create policy tenant_select on %I for select using (organisation_id = tracework.current_organisation_id())',
      tenant_table.table_name
    );
    execute format(
      'create policy tenant_insert on %I for insert with check (organisation_id = tracework.current_organisation_id() and tracework.current_permission_context_id() is not null)',
      tenant_table.table_name
    );
    execute format(
      'create policy tenant_update on %I for update using (organisation_id = tracework.current_organisation_id()) with check (organisation_id = tracework.current_organisation_id() and tracework.current_permission_context_id() is not null)',
      tenant_table.table_name
    );
    execute format(
      'create policy tenant_delete on %I for delete using (organisation_id = tracework.current_organisation_id() and tracework.current_permission_context_id() is not null)',
      tenant_table.table_name
    );
  end loop;
end;
$$;

alter table permission_contexts enable row level security;
alter table permission_contexts force row level security;
create policy permission_contexts_select on permission_contexts for select
  using (organisation_id = tracework.current_organisation_id());
create policy permission_contexts_insert on permission_contexts for insert
  with check (organisation_id = tracework.current_organisation_id() and tracework.current_actor_id() is not null);
create policy permission_contexts_update on permission_contexts for update
  using (organisation_id = tracework.current_organisation_id())
  with check (organisation_id = tracework.current_organisation_id() and tracework.current_actor_id() is not null);

do $$
declare
  role_name text;
begin
  foreach role_name in array array['tracework_authenticator','tracework_app','tracework_worker','tracework_runner_gateway','tracework_readonly'] loop
    if not exists (select 1 from pg_roles where rolname = role_name) then
      begin
        execute format('create role %I nologin nosuperuser nocreatedb nocreaterole noinherit', role_name);
      exception when insufficient_privilege then
        raise notice 'role % was not created; provision it outside the migration', role_name;
      end;
    end if;
  end loop;
end;
$$;

revoke all on schema public from public;
revoke all on schema tracework from public;
revoke all on all tables in schema public from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'tracework_authenticator') then
    grant usage on schema public, tracework to tracework_authenticator;
    grant select, insert, update on auth_users, auth_sessions, auth_accounts, auth_verifications, auth_passkeys, auth_two_factors, application_principals to tracework_authenticator;
    grant select, insert, update on permission_contexts, reauthentication_grants to tracework_authenticator;
  end if;
  if exists (select 1 from pg_roles where rolname = 'tracework_app') then
    grant usage on schema public, tracework to tracework_app;
    grant select, insert, update, delete on all tables in schema public to tracework_app;
    revoke all on auth_sessions, auth_accounts, auth_verifications, auth_passkeys, auth_two_factors from tracework_app;
    grant select on auth_users, application_principals to tracework_app;
  end if;
  if exists (select 1 from pg_roles where rolname = 'tracework_worker') then
    grant usage on schema public, tracework to tracework_worker;
    grant select, insert, update on all tables in schema public to tracework_worker;
    revoke all on auth_sessions, auth_accounts, auth_verifications, auth_passkeys, auth_two_factors from tracework_worker;
    grant select on auth_users, application_principals to tracework_worker;
  end if;
  if exists (select 1 from pg_roles where rolname = 'tracework_runner_gateway') then
    grant usage on schema public, tracework to tracework_runner_gateway;
    grant select on execution_plans, execution_plan_versions, execution_cycles, execution_cycle_work_items,
      runner_environments, runner_capability_grants, runner_secret_leases to tracework_runner_gateway;
    grant select, insert, update on agent_runs, agent_turns, agent_actions, execution_usage_events,
      execution_usage_totals, execution_checkpoints, execution_test_runs to tracework_runner_gateway;
  end if;
  if exists (select 1 from pg_roles where rolname = 'tracework_readonly') then
    grant usage on schema public, tracework to tracework_readonly;
    grant select on all tables in schema public to tracework_readonly;
    revoke all on auth_sessions, auth_accounts, auth_verifications, auth_passkeys, auth_two_factors from tracework_readonly;
  end if;
end;
$$;

do $$
declare
  immutable_table text;
begin
  if exists (select 1 from pg_roles where rolname = 'tracework_app') then
    foreach immutable_table in array array[
      'workflow_transition_events','question_responses','source_fragments','source_fragment_relationships',
      'artifact_versions','artifact_version_state_events','artifact_version_relationships','artifact_version_evidence_links',
      'approval_snapshots','approval_decisions','approval_revocations','audit_events','execution_work_reports',
      'execution_reviews','changed_files','demonstration_comparison_results','release_execution_evidence'
    ] loop
      execute format('revoke update, delete on %I from tracework_app', immutable_table);
    end loop;
  end if;
end;
$$;

commit;
