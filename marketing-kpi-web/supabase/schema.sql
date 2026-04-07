-- Marketing KPI Calculator (Supabase / Postgres)
-- Мінімальна схема + RLS під ролі: admin / pm / specialist
--
-- Запуск: Supabase Dashboard → SQL Editor → New query → вставити цей файл → Run.

-- 1) Extensions
create extension if not exists "pgcrypto";

-- 2) Enums
do $$ begin
  create type public.app_role as enum ('admin', 'pm', 'specialist');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.kpi_score as enum ('1', '0', 'ж', '-');
exception
  when duplicate_object then null;
end $$;

-- 3) Helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 4) Tables

-- Users profile table (maps to auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

-- 5) Helper functions (depend on public.users)
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
  );
$$;

create or replace function public.is_pm()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'pm'
  );
$$;

create or replace function public.is_specialist()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'specialist'
  );
$$;

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
as $$
  select u.role
  from public.users u
  where u.id = auth.uid()
$$;

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('VIP', 'A', 'B', 'C')),
  pm_id uuid null references public.users(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(name)
);

create index if not exists projects_pm_id_idx on public.projects(pm_id);
create index if not exists projects_is_active_idx on public.projects(is_active);

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- Periods
create table if not exists public.periods (
  id uuid primary key default gen_random_uuid(),
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 1 and 12),
  is_closed boolean not null default false,
  closed_at timestamptz null,
  closed_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(year, month)
);

create index if not exists periods_is_closed_idx on public.periods(is_closed);

create trigger periods_set_updated_at
before update on public.periods
for each row execute function public.set_updated_at();

-- KPI records (one row per project+specialist+task_role+period)
create table if not exists public.kpi_records (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.periods(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  specialist_id uuid not null references public.users(id) on delete cascade,
  task_role text not null check (task_role in ('seo', 'context', 'target', 'tiktok')),
  score public.kpi_score not null default '-',
  comment text null,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(period_id, project_id, specialist_id, task_role)
);

create index if not exists kpi_records_period_idx on public.kpi_records(period_id);
create index if not exists kpi_records_project_idx on public.kpi_records(project_id);
create index if not exists kpi_records_specialist_idx on public.kpi_records(specialist_id);
create index if not exists kpi_records_task_role_idx on public.kpi_records(task_role);

create trigger kpi_records_set_updated_at
before update on public.kpi_records
for each row execute function public.set_updated_at();

-- 5) RLS enable
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.periods enable row level security;
alter table public.kpi_records enable row level security;

-- 6) RLS policies

-- users:
-- admin can see and manage all
drop policy if exists users_admin_all on public.users;
create policy users_admin_all
on public.users
for all
using (public.is_admin())
with check (public.is_admin());

-- users can read their own profile
drop policy if exists users_read_own on public.users;
create policy users_read_own
on public.users
for select
using (id = auth.uid());

-- projects:
-- everyone logged-in can read projects (dashboards need it)
drop policy if exists projects_read_all on public.projects;
create policy projects_read_all
on public.projects
for select
using (auth.uid() is not null);

-- only admin can insert/update/delete projects
drop policy if exists projects_admin_write on public.projects;
create policy projects_admin_write
on public.projects
for all
using (public.is_admin())
with check (public.is_admin());

-- periods:
-- everyone logged-in can read periods
drop policy if exists periods_read_all on public.periods;
create policy periods_read_all
on public.periods
for select
using (auth.uid() is not null);

-- only admin can manage periods (create/close)
drop policy if exists periods_admin_write on public.periods;
create policy periods_admin_write
on public.periods
for all
using (public.is_admin())
with check (public.is_admin());

-- kpi_records:
-- read rules:
-- admin: everything
drop policy if exists kpi_admin_read on public.kpi_records;
create policy kpi_admin_read
on public.kpi_records
for select
using (public.is_admin());

-- pm: can read everything (dashboards + review), but only when authenticated
drop policy if exists kpi_pm_read_all on public.kpi_records;
create policy kpi_pm_read_all
on public.kpi_records
for select
using (public.is_pm());

-- specialist: can read only own records
drop policy if exists kpi_specialist_read_own on public.kpi_records;
create policy kpi_specialist_read_own
on public.kpi_records
for select
using (public.is_specialist() and specialist_id = auth.uid());

-- write rules:
-- admin can write anything
drop policy if exists kpi_admin_write on public.kpi_records;
create policy kpi_admin_write
on public.kpi_records
for all
using (public.is_admin())
with check (public.is_admin());

-- pm can insert/update/delete only for own projects AND only in open periods.
-- Note: delete дозволений в MVP (можна прибрати пізніше).
drop policy if exists kpi_pm_write_own_projects_open_period on public.kpi_records;
create policy kpi_pm_write_own_projects_open_period
on public.kpi_records
for all
using (
  public.is_pm()
  and exists (
    select 1
    from public.projects p
    where p.id = kpi_records.project_id
      and p.pm_id = auth.uid()
  )
  and exists (
    select 1
    from public.periods per
    where per.id = kpi_records.period_id
      and per.is_closed = false
  )
)
with check (
  public.is_pm()
  and created_by = auth.uid()
  and exists (
    select 1
    from public.projects p
    where p.id = kpi_records.project_id
      and p.pm_id = auth.uid()
  )
  and exists (
    select 1
    from public.periods per
    where per.id = kpi_records.period_id
      and per.is_closed = false
  )
);

-- 7) Optional: basic guard — require comment for 0/ж (enforced in DB)
-- If you want this strict rule, uncomment:
-- alter table public.kpi_records
--   add constraint kpi_comment_required_when_not_success
--   check (
--     (score in ('1', '-')) or (comment is not null and length(trim(comment)) > 0)
--   );

