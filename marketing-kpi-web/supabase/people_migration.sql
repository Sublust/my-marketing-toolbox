-- Migration: separate "people" (no-auth) from app logins (public.users)
-- Goal: import historical KPI for people without creating Auth accounts.

create extension if not exists "pgcrypto";

-- 1) People table (no reference to auth.users)
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null unique,
  person_type text not null check (person_type in ('specialist', 'pm', 'admin', 'other')) default 'other',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.people_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists people_set_updated_at on public.people;
create trigger people_set_updated_at
before update on public.people
for each row execute function public.people_set_updated_at();

alter table public.people enable row level security;

drop policy if exists people_read_all on public.people;
create policy people_read_all
on public.people
for select
using (auth.uid() is not null);

drop policy if exists people_admin_write on public.people;
create policy people_admin_write
on public.people
for all
using (public.is_admin())
with check (public.is_admin());

-- 2) Projects: keep pm_id for access control, add pm_name for history
alter table public.projects
  add column if not exists pm_name text;

-- Backfill pm_name from current pm_id (if available)
update public.projects p
set pm_name = u.full_name
from public.users u
where p.pm_id = u.id
  and (p.pm_name is null or length(trim(p.pm_name)) = 0);

-- 3) KPI records: add specialist_person_id (points to people)
alter table public.kpi_records
  add column if not exists specialist_person_id uuid null references public.people(id) on delete restrict;

-- Backfill people from existing specialist_id by matching full_name (best effort)
insert into public.people (full_name, person_type)
select distinct u.full_name, 'specialist'
from public.kpi_records kr
join public.users u on u.id = kr.specialist_id
where u.full_name is not null
on conflict (full_name) do nothing;

update public.kpi_records kr
set specialist_person_id = p.id
from public.users u
join public.people p on lower(p.full_name) = lower(u.full_name)
where kr.specialist_id = u.id
  and kr.specialist_person_id is null;

-- 4) Update uniqueness to use specialist_person_id (per period+project+role)
do $$
declare
  c text;
begin
  -- Find old unique constraint name (if any) and drop it
  select conname into c
  from pg_constraint
  where conrelid = 'public.kpi_records'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) like '%(period_id, project_id, specialist_id, task_role)%'
  limit 1;

  if c is not null then
    execute format('alter table public.kpi_records drop constraint %I', c);
  end if;
end $$;

-- New unique constraint
do $$ begin
  alter table public.kpi_records
    add constraint kpi_records_unique_person unique (period_id, project_id, specialist_person_id, task_role);
exception
  when duplicate_object then null;
end $$;

-- 5) Make specialist_id optional (for history imports)
alter table public.kpi_records
  alter column specialist_id drop not null;

