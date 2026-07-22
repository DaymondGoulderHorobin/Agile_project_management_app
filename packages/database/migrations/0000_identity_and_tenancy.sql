begin;

create schema if not exists tracework;

create or replace function tracework.current_organisation_id()
returns uuid
language plpgsql
stable
as $$
begin
  return nullif(current_setting('app.organisation_id', true), '')::uuid;
exception when others then
  return null;
end;
$$;

create or replace function tracework.current_actor_id()
returns uuid
language plpgsql
stable
as $$
begin
  return nullif(current_setting('app.actor_id', true), '')::uuid;
exception when others then
  return null;
end;
$$;

create or replace function tracework.current_permission_context_id()
returns uuid
language plpgsql
stable
as $$
begin
  return nullif(current_setting('app.permission_context_id', true), '')::uuid;
exception when others then
  return null;
end;
$$;

create or replace function tracework.prevent_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is immutable; create a superseding record instead', tg_table_name
    using errcode = '55000';
end;
$$;

create table auth_users (
  id text primary key,
  name text not null,
  email text not null,
  email_verified boolean not null default false,
  image text,
  status text not null default 'active' check (status in ('active','disabled','tombstoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz
);
create unique index auth_users_email_ci_uq on auth_users (lower(email));

create table auth_sessions (
  id text primary key,
  token text not null unique,
  user_id text not null references auth_users(id) on delete cascade,
  expires_at timestamptz not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text,
  check ((revoked_at is null) = (revoked_reason is null))
);
create index auth_sessions_user_expiry_idx on auth_sessions(user_id, expires_at);
create index auth_sessions_active_expiry_idx on auth_sessions(expires_at) where revoked_at is null;

create table auth_accounts (
  id text primary key,
  account_id text not null,
  provider_id text not null,
  user_id text not null references auth_users(id) on delete cascade,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_id, account_id)
);
create index auth_accounts_user_idx on auth_accounts(user_id);

create table auth_verifications (
  id text primary key,
  identifier text not null,
  value text not null,
  purpose text not null check (purpose in ('magic_link','email_verification','recovery')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(identifier, value)
);
create index auth_verifications_expiry_idx on auth_verifications(expires_at);

create table auth_passkeys (
  id text primary key,
  name text,
  public_key text not null,
  user_id text not null references auth_users(id) on delete cascade,
  credential_id text not null unique,
  counter bigint not null default 0 check (counter >= 0),
  device_type text not null,
  backed_up boolean not null default false,
  transports text,
  aaguid text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index auth_passkeys_user_idx on auth_passkeys(user_id);

create table auth_two_factors (
  id text primary key,
  user_id text not null unique references auth_users(id) on delete cascade,
  secret_ciphertext text not null,
  backup_codes_ciphertext text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create table application_principals (
  id uuid primary key,
  auth_user_id text not null unique references auth_users(id) on delete restrict,
  principal_type text not null default 'user' check (principal_type in ('user','service')),
  display_name text not null,
  status text not null default 'active' check (status in ('active','disabled','tombstoned')),
  created_at timestamptz not null default now(),
  tombstoned_at timestamptz
);

create table retention_profiles (
  id uuid primary key,
  key text not null unique,
  name text not null,
  policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table organisations (
  id uuid primary key,
  slug text not null,
  name text not null,
  status text not null default 'active' check (status in ('active','archived','deletion_pending')),
  default_timezone text not null default 'UTC',
  retention_profile_id uuid references retention_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  deletion_scheduled_at timestamptz,
  lock_version integer not null default 0
);
create unique index organisations_slug_ci_uq on organisations(lower(slug));

create table organisation_memberships (
  id uuid primary key,
  organisation_id uuid not null references organisations(id) on delete cascade,
  principal_id uuid not null references application_principals(id) on delete restrict,
  status text not null default 'active' check (status in ('active','revoked','left')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  lock_version integer not null default 0,
  unique(organisation_id, id)
);
create unique index organisation_memberships_active_principal_uq
  on organisation_memberships(organisation_id, principal_id) where status = 'active';
create index organisation_memberships_principal_idx on organisation_memberships(principal_id, status);

create table organisation_role_assignments (
  id uuid primary key,
  organisation_id uuid not null,
  membership_id uuid not null,
  role text not null,
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by_actor_id uuid,
  unique(organisation_id, id),
  foreign key (organisation_id, membership_id) references organisation_memberships(organisation_id, id) on delete cascade
);
create index organisation_role_assignments_membership_idx on organisation_role_assignments(organisation_id, membership_id);

create table teams (
  id uuid primary key,
  organisation_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique(organisation_id, id),
  unique(organisation_id, name)
);

create table team_memberships (
  id uuid primary key,
  organisation_id uuid not null,
  team_id uuid not null,
  organisation_membership_id uuid not null,
  created_at timestamptz not null default now(),
  unique(organisation_id, id),
  unique(organisation_id, team_id, organisation_membership_id),
  foreign key (organisation_id, team_id) references teams(organisation_id, id) on delete cascade,
  foreign key (organisation_id, organisation_membership_id) references organisation_memberships(organisation_id, id) on delete cascade
);

create table projects (
  id uuid primary key,
  organisation_id uuid not null references organisations(id) on delete cascade,
  key text not null,
  name text not null,
  description text not null,
  mode text not null default 'light' check (mode in ('light','standard','high_assurance')),
  data_classification text not null default 'general_business' check (data_classification = 'general_business'),
  status text not null default 'active' check (status in ('active','archived','deletion_pending')),
  timezone text not null default 'UTC',
  workflow_instance_id uuid,
  created_by_actor_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  lock_version integer not null default 0,
  unique(organisation_id, id),
  unique(organisation_id, key)
);
create index projects_org_status_idx on projects(organisation_id, status, created_at desc);

create table project_memberships (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  principal_id uuid not null references application_principals(id) on delete restrict,
  membership_type text not null check (membership_type in ('member','guest')),
  status text not null default 'active' check (status in ('active','revoked','left')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  lock_version integer not null default 0,
  unique(organisation_id, id),
  unique(organisation_id, project_id, id),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade
);
create unique index project_memberships_active_principal_uq
  on project_memberships(organisation_id, project_id, principal_id) where status = 'active';
create index project_memberships_principal_idx on project_memberships(principal_id, status);

create table project_role_assignments (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  membership_id uuid not null,
  role text not null,
  scope jsonb not null default '{}'::jsonb,
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  unique(organisation_id, id),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade,
  foreign key (organisation_id, membership_id) references project_memberships(organisation_id, id) on delete cascade
);

create table project_permission_grants (
  id uuid primary key,
  organisation_id uuid not null,
  project_id uuid not null,
  membership_id uuid not null,
  permission text not null,
  object_kind text,
  object_id uuid,
  stage text,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  unique(organisation_id, id),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade,
  foreign key (organisation_id, membership_id) references project_memberships(organisation_id, id) on delete cascade
);
create index project_permission_grants_lookup_idx
  on project_permission_grants(organisation_id, project_id, membership_id, permission);

create table invitations (
  id uuid primary key,
  organisation_id uuid not null references organisations(id) on delete cascade,
  project_id uuid,
  email text not null,
  membership_type text not null default 'member' check (membership_type in ('member','guest')),
  role_grants jsonb not null default '{}'::jsonb,
  token_hash text not null unique,
  invited_by_actor_id uuid,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by_principal_id uuid references application_principals(id) on delete restrict,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(organisation_id, id),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade,
  check (consumed_at is null or revoked_at is null)
);
create unique index invitations_active_email_scope_uq
  on invitations(organisation_id, coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(email))
  where consumed_at is null and revoked_at is null;
create index invitations_expiry_idx on invitations(expires_at) where consumed_at is null and revoked_at is null;

create table reauthentication_grants (
  id uuid primary key,
  organisation_id uuid not null references organisations(id) on delete cascade,
  project_id uuid,
  principal_id uuid not null references application_principals(id) on delete restrict,
  auth_session_id text not null references auth_sessions(id) on delete cascade,
  action_key text not null,
  subject_kind text not null,
  subject_id uuid not null,
  snapshot_hash text not null,
  method text not null default 'passkey_uv' check (method = 'passkey_uv'),
  nonce_hash text not null unique,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  unique(organisation_id, id),
  foreign key (organisation_id, project_id) references projects(organisation_id, id) on delete cascade,
  check (expires_at > issued_at and expires_at <= issued_at + interval '15 minutes'),
  check (not (consumed_at is not null and revoked_at is not null))
);
create index reauthentication_grants_principal_action_idx
  on reauthentication_grants(organisation_id, principal_id, action_key, expires_at);

create table permission_contexts (
  id uuid primary key,
  organisation_id uuid not null references organisations(id) on delete cascade,
  principal_id uuid not null references application_principals(id) on delete cascade,
  auth_session_id text,
  permission_hash text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  unique(organisation_id, id),
  check (expires_at > issued_at)
);
create index permission_contexts_principal_expiry_idx on permission_contexts(organisation_id, principal_id, expires_at);

commit;
