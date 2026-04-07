-- KPI snapshots: persisted aggregates for dashboards

create table if not exists public.kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.periods(id) on delete cascade,
  scope text not null check (scope in ('department', 'specialist', 'pm')),
  direction text not null check (direction in ('all', 'seo', 'context', 'target', 'tiktok')),
  subject_kind text not null check (subject_kind in ('department', 'person', 'user', 'name')),
  subject_id uuid null,
  subject_name text not null,
  percentage numeric not null,
  success_weight numeric not null,
  total_weight numeric not null,
  computed_by uuid not null references public.users(id) on delete restrict,
  computed_at timestamptz not null default now(),
  unique(period_id, scope, direction, subject_kind, subject_id, subject_name)
);

create index if not exists kpi_snapshots_period_idx on public.kpi_snapshots(period_id);
create index if not exists kpi_snapshots_scope_idx on public.kpi_snapshots(scope);
create index if not exists kpi_snapshots_direction_idx on public.kpi_snapshots(direction);

alter table public.kpi_snapshots enable row level security;

-- Read: anyone logged-in (you only create logins for Head/PM/CEO)
drop policy if exists kpi_snapshots_read_all on public.kpi_snapshots;
create policy kpi_snapshots_read_all
on public.kpi_snapshots
for select
using (auth.uid() is not null);

-- Write: admin only
drop policy if exists kpi_snapshots_admin_write on public.kpi_snapshots;
create policy kpi_snapshots_admin_write
on public.kpi_snapshots
for all
using (public.is_admin())
with check (public.is_admin());

