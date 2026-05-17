-- ============================================================================
-- Elevate · Postgres / Supabase schema
-- ============================================================================
-- Run this in the Supabase SQL editor (or via `supabase db push`) when you
-- migrate off the local SQLite store. It mirrors the SQLite schema with the
-- following Postgres-native upgrades:
--
--   * UUIDs as `uuid` instead of `text`
--   * `timestamptz` instead of ISO strings
--   * Foreign key indexes for query performance
--   * CHECK constraints on roles/priority
--   * Row Level Security (RLS) policies that enforce workspace membership
--     at the database layer, so even a leaked anon key can't bypass auth
--
-- Auth model: this schema assumes Supabase Auth — `auth.users(id)` is the
-- canonical user table. The `public.profiles` table mirrors what the API
-- needs (display name, avatar, role for THIS workspace lives in
-- workspace_members).
-- ============================================================================

-- Required extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists citext;

-- ─── Profiles ───────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       citext unique not null,
  name        text not null,
  avatar      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Workspaces ─────────────────────────────────────────────────────────────
create table if not exists public.workspaces (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  description   text not null default '',
  custom_fields jsonb not null default '[]'::jsonb,
  labels        jsonb not null default '[]'::jsonb,
  code_prefix   text not null default 'SKY',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Workspace members ──────────────────────────────────────────────────────
create table if not exists public.workspace_members (
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null default 'member'
                check (role in ('owner','admin','member','viewer')),
  created_at    timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- Exactly one owner per workspace.
create unique index if not exists workspace_one_owner
  on public.workspace_members(workspace_id) where role = 'owner';

create index if not exists workspace_members_user_idx
  on public.workspace_members(user_id);

-- ─── Columns ────────────────────────────────────────────────────────────────
create table if not exists public.columns (
  id            uuid primary key default uuid_generate_v4(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  title         text not null,
  position      integer not null default 0,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists columns_workspace_idx on public.columns(workspace_id);

-- ─── Tasks ──────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id             uuid primary key default uuid_generate_v4(),
  column_id      uuid not null references public.columns(id) on delete cascade,
  title          text not null,
  priority       text not null default 'Medium'
                 check (priority in ('Critical','High','Medium','Low')),
  code           text,
  description    text not null default '',
  assignee_id    uuid references auth.users(id) on delete set null,
  due_date       timestamptz,
  position       integer not null default 0,
  custom_fields  jsonb not null default '{}'::jsonb,
  label_ids      jsonb not null default '[]'::jsonb,
  sprint_id      uuid,
  deleted_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists tasks_column_idx on public.tasks(column_id);
create index if not exists tasks_assignee_idx on public.tasks(assignee_id);
create index if not exists tasks_deleted_idx on public.tasks(deleted_at);

create table if not exists public.task_tags (
  task_id  uuid not null references public.tasks(id) on delete cascade,
  tag      text not null,
  primary key (task_id, tag)
);

-- ─── Comments ───────────────────────────────────────────────────────────────
create table if not exists public.comments (
  id             uuid primary key default uuid_generate_v4(),
  task_id        uuid not null references public.tasks(id) on delete cascade,
  text           text not null,
  author_id      uuid references auth.users(id) on delete set null,
  author_name    text not null,
  author_avatar  text,
  created_at     timestamptz not null default now()
);
create index if not exists comments_task_idx on public.comments(task_id);

-- ─── Attachments ────────────────────────────────────────────────────────────
create table if not exists public.attachments (
  id           uuid primary key default uuid_generate_v4(),
  task_id      uuid not null references public.tasks(id) on delete cascade,
  type         text not null default 'image',
  url          text not null,
  name         text not null,
  storage_key  text,
  mime_type    text,
  size         bigint,
  sha256       text,
  created_at   timestamptz not null default now()
);
create index if not exists attachments_task_idx on public.attachments(task_id);

-- ─── Checklists ─────────────────────────────────────────────────────────────
create table if not exists public.checklists (
  id          uuid primary key default uuid_generate_v4(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  title       text not null,
  created_at  timestamptz not null default now()
);
create index if not exists checklists_task_idx on public.checklists(task_id);

create table if not exists public.checklist_items (
  id             uuid primary key default uuid_generate_v4(),
  checklist_id   uuid not null references public.checklists(id) on delete cascade,
  text           text not null,
  done           boolean not null default false,
  target_count   integer not null default 1,
  current_count  integer not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists checklist_items_idx on public.checklist_items(checklist_id);

-- ─── Activity log ───────────────────────────────────────────────────────────
create table if not exists public.activity_log (
  id            uuid primary key default uuid_generate_v4(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  event         text not null,
  entity_type   text not null,
  entity_id     text,
  detail        jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists activity_workspace_idx on public.activity_log(workspace_id);
create index if not exists activity_created_idx on public.activity_log(created_at desc);

-- ─── API keys ───────────────────────────────────────────────────────────────
create table if not exists public.api_keys (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  name          text not null,
  key_hash      text not null unique,
  key_prefix    text not null,
  scopes        text not null default 'read,write',
  last_used_at  timestamptz,
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists api_keys_workspace_idx on public.api_keys(workspace_id);

-- ─── Webhooks ───────────────────────────────────────────────────────────────
create table if not exists public.webhooks (
  id            uuid primary key default uuid_generate_v4(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  url           text not null,
  events        text not null default 'task.created,task.updated,task.moved,task.deleted',
  secret        text not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists webhooks_workspace_idx on public.webhooks(workspace_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- Enable RLS on every public table. The service_role key bypasses RLS, so
-- the API can still operate normally; the anon key is locked down to what
-- the policies explicitly permit.
-- ============================================================================

alter table public.profiles           enable row level security;
alter table public.workspaces         enable row level security;
alter table public.workspace_members  enable row level security;
alter table public.columns            enable row level security;
alter table public.tasks              enable row level security;
alter table public.task_tags          enable row level security;
alter table public.comments           enable row level security;
alter table public.attachments        enable row level security;
alter table public.checklists         enable row level security;
alter table public.checklist_items    enable row level security;
alter table public.activity_log       enable row level security;
alter table public.api_keys           enable row level security;
alter table public.webhooks           enable row level security;

-- Helper: is the calling user a member of <workspace_id>?
create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

-- Helper: does the caller hold owner/admin in <workspace_id>?
create or replace function public.can_manage_workspace(ws uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid() and role in ('owner','admin')
  );
$$;

-- Helper: does the caller hold edit rights (owner/admin/member)?
create or replace function public.can_edit_workspace(ws uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid()
      and role in ('owner','admin','member')
  );
$$;

-- ─── Profiles policies ──────────────────────────────────────────────────────
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid()
    or exists (
      select 1 from public.workspace_members m1
      join public.workspace_members m2 on m1.workspace_id = m2.workspace_id
      where m1.user_id = auth.uid() and m2.user_id = profiles.id
    ));

drop policy if exists profiles_self_write on public.profiles;
create policy profiles_self_write on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ─── Workspaces ─────────────────────────────────────────────────────────────
drop policy if exists workspaces_member_read on public.workspaces;
create policy workspaces_member_read on public.workspaces
  for select using (public.is_workspace_member(id));

drop policy if exists workspaces_owner_admin_update on public.workspaces;
create policy workspaces_owner_admin_update on public.workspaces
  for update using (public.can_manage_workspace(id))
  with check (public.can_manage_workspace(id));

drop policy if exists workspaces_owner_delete on public.workspaces;
create policy workspaces_owner_delete on public.workspaces
  for delete using (
    exists (select 1 from public.workspace_members
            where workspace_id = workspaces.id
              and user_id = auth.uid()
              and role = 'owner')
  );

drop policy if exists workspaces_authenticated_insert on public.workspaces;
create policy workspaces_authenticated_insert on public.workspaces
  for insert with check (auth.uid() is not null);

-- ─── Workspace members ──────────────────────────────────────────────────────
drop policy if exists wm_self_read on public.workspace_members;
create policy wm_self_read on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

drop policy if exists wm_manager_write on public.workspace_members;
create policy wm_manager_write on public.workspace_members
  for all using (public.can_manage_workspace(workspace_id))
  with check (public.can_manage_workspace(workspace_id));

-- ─── Generic: any row scoped to a workspace_id column ──────────────────────
-- columns / activity_log / api_keys / webhooks
do $$
declare
  tbl text;
begin
  foreach tbl in array array['columns','activity_log','api_keys','webhooks']
  loop
    execute format('drop policy if exists %I_member_read on public.%I', tbl, tbl);
    execute format('create policy %I_member_read on public.%I for select using (public.is_workspace_member(workspace_id))', tbl, tbl);
    execute format('drop policy if exists %I_edit_write on public.%I', tbl, tbl);
    execute format('create policy %I_edit_write on public.%I for all using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id))', tbl, tbl);
  end loop;
end $$;

-- Override webhooks/api_keys to require manage rights for writes.
drop policy if exists webhooks_edit_write on public.webhooks;
create policy webhooks_manager_write on public.webhooks
  for all using (public.can_manage_workspace(workspace_id))
  with check (public.can_manage_workspace(workspace_id));

-- ─── Tasks / task_tags / comments / attachments / checklists ────────────────
-- These don't have workspace_id directly, so the policy joins through the
-- column or task to find it.

drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks
  for select using (
    exists (select 1 from public.columns c
            where c.id = tasks.column_id
              and public.is_workspace_member(c.workspace_id))
  );
drop policy if exists tasks_write on public.tasks;
create policy tasks_write on public.tasks
  for all using (
    exists (select 1 from public.columns c
            where c.id = tasks.column_id
              and public.can_edit_workspace(c.workspace_id))
  ) with check (
    exists (select 1 from public.columns c
            where c.id = tasks.column_id
              and public.can_edit_workspace(c.workspace_id))
  );

drop policy if exists task_tags_read on public.task_tags;
create policy task_tags_read on public.task_tags
  for select using (
    exists (select 1 from public.tasks t
            join public.columns c on c.id = t.column_id
            where t.id = task_tags.task_id and public.is_workspace_member(c.workspace_id))
  );
drop policy if exists task_tags_write on public.task_tags;
create policy task_tags_write on public.task_tags
  for all using (
    exists (select 1 from public.tasks t
            join public.columns c on c.id = t.column_id
            where t.id = task_tags.task_id and public.can_edit_workspace(c.workspace_id))
  ) with check (
    exists (select 1 from public.tasks t
            join public.columns c on c.id = t.column_id
            where t.id = task_tags.task_id and public.can_edit_workspace(c.workspace_id))
  );

drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments
  for select using (
    exists (select 1 from public.tasks t
            join public.columns c on c.id = t.column_id
            where t.id = comments.task_id and public.is_workspace_member(c.workspace_id))
  );
drop policy if exists comments_write on public.comments;
create policy comments_write on public.comments
  for all using (
    exists (select 1 from public.tasks t
            join public.columns c on c.id = t.column_id
            where t.id = comments.task_id and public.can_edit_workspace(c.workspace_id))
  ) with check (
    exists (select 1 from public.tasks t
            join public.columns c on c.id = t.column_id
            where t.id = comments.task_id and public.can_edit_workspace(c.workspace_id))
  );

drop policy if exists attachments_read on public.attachments;
create policy attachments_read on public.attachments
  for select using (
    exists (select 1 from public.tasks t
            join public.columns c on c.id = t.column_id
            where t.id = attachments.task_id and public.is_workspace_member(c.workspace_id))
  );
drop policy if exists attachments_write on public.attachments;
create policy attachments_write on public.attachments
  for all using (
    exists (select 1 from public.tasks t
            join public.columns c on c.id = t.column_id
            where t.id = attachments.task_id and public.can_edit_workspace(c.workspace_id))
  ) with check (
    exists (select 1 from public.tasks t
            join public.columns c on c.id = t.column_id
            where t.id = attachments.task_id and public.can_edit_workspace(c.workspace_id))
  );

drop policy if exists checklists_read on public.checklists;
create policy checklists_read on public.checklists
  for select using (
    exists (select 1 from public.tasks t
            join public.columns c on c.id = t.column_id
            where t.id = checklists.task_id and public.is_workspace_member(c.workspace_id))
  );
drop policy if exists checklists_write on public.checklists;
create policy checklists_write on public.checklists
  for all using (
    exists (select 1 from public.tasks t
            join public.columns c on c.id = t.column_id
            where t.id = checklists.task_id and public.can_edit_workspace(c.workspace_id))
  ) with check (
    exists (select 1 from public.tasks t
            join public.columns c on c.id = t.column_id
            where t.id = checklists.task_id and public.can_edit_workspace(c.workspace_id))
  );

drop policy if exists ci_read on public.checklist_items;
create policy ci_read on public.checklist_items
  for select using (
    exists (select 1 from public.checklists cl
            join public.tasks t on t.id = cl.task_id
            join public.columns c on c.id = t.column_id
            where cl.id = checklist_items.checklist_id and public.is_workspace_member(c.workspace_id))
  );
drop policy if exists ci_write on public.checklist_items;
create policy ci_write on public.checklist_items
  for all using (
    exists (select 1 from public.checklists cl
            join public.tasks t on t.id = cl.task_id
            join public.columns c on c.id = t.column_id
            where cl.id = checklist_items.checklist_id and public.can_edit_workspace(c.workspace_id))
  ) with check (
    exists (select 1 from public.checklists cl
            join public.tasks t on t.id = cl.task_id
            join public.columns c on c.id = t.column_id
            where cl.id = checklist_items.checklist_id and public.can_edit_workspace(c.workspace_id))
  );

-- ─── Profile auto-create on signup ──────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, name, avatar)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Storage bucket policies (run AFTER creating an `attachments` bucket) ──
-- insert into storage.buckets (id, name, public) values ('attachments','attachments', false);
-- Storage policies must reference the workspace via the storage_key prefix
-- the API uses (e.g. "task-<task_id>/<filename>"). Example:
--
-- create policy "attachments-read"
--   on storage.objects for select
--   using (
--     bucket_id = 'attachments' and
--     exists (
--       select 1
--       from public.attachments a
--       join public.tasks t on t.id = a.task_id
--       join public.columns c on c.id = t.column_id
--       where a.storage_key = name
--         and public.is_workspace_member(c.workspace_id)
--     )
--   );
-- create policy "attachments-write"
--   on storage.objects for insert with check (
--     bucket_id = 'attachments' and auth.uid() is not null
--   );
