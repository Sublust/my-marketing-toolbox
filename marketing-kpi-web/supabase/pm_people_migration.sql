-- Migration: represent PMs as "people" (person_type='pm') and link projects via pm_person_id.
-- Goal: support historical PMs without auth accounts and make dashboard filters stable.

create extension if not exists "pgcrypto";

-- 1) Projects: add pm_person_id
alter table public.projects
  add column if not exists pm_person_id uuid null references public.people(id) on delete set null;

create index if not exists projects_pm_person_id_idx on public.projects(pm_person_id);

-- 2) Ensure PM people rows exist (from projects.pm_name and from current projects.pm_id -> users.full_name)
insert into public.people (full_name, person_type, is_active)
select distinct trim(p.pm_name) as full_name, 'pm' as person_type, true as is_active
from public.projects p
where p.pm_name is not null
  and length(trim(p.pm_name)) > 0
on conflict (full_name) do update
  set person_type = case
    when public.people.person_type = 'specialist' then public.people.person_type
    else 'pm'
  end;

insert into public.people (full_name, person_type, is_active)
select distinct trim(u.full_name) as full_name, 'pm' as person_type, true as is_active
from public.projects p
join public.users u on u.id = p.pm_id
where u.full_name is not null
  and length(trim(u.full_name)) > 0
on conflict (full_name) do update
  set person_type = case
    when public.people.person_type = 'specialist' then public.people.person_type
    else 'pm'
  end;

-- 3) Backfill projects.pm_person_id by matching name (pm_name has priority, otherwise users.full_name)
update public.projects p
set pm_person_id = ppl.id
from public.people ppl
where p.pm_person_id is null
  and ppl.person_type = 'pm'
  and (
    (p.pm_name is not null and lower(trim(p.pm_name)) = lower(trim(ppl.full_name)))
    or (
      p.pm_name is null
      and exists (
        select 1
        from public.users u
        where u.id = p.pm_id
          and lower(trim(u.full_name)) = lower(trim(ppl.full_name))
      )
    )
  );

