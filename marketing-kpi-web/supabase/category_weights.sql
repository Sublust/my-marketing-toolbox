-- Add category weights table (editable in UI)

create table if not exists public.category_weights (
  category text primary key check (category in ('VIP', 'A', 'B', 'C')),
  weight numeric not null check (weight >= 0),
  updated_at timestamptz not null default now()
);

create or replace function public.category_weights_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists category_weights_set_updated_at on public.category_weights;
create trigger category_weights_set_updated_at
before update on public.category_weights
for each row execute function public.category_weights_set_updated_at();

alter table public.category_weights enable row level security;

drop policy if exists category_weights_read_all on public.category_weights;
create policy category_weights_read_all
on public.category_weights
for select
using (auth.uid() is not null);

drop policy if exists category_weights_admin_write on public.category_weights;
create policy category_weights_admin_write
on public.category_weights
for all
using (public.is_admin())
with check (public.is_admin());

insert into public.category_weights (category, weight)
values
  ('VIP', 1.5),
  ('A', 1.0),
  ('B', 0.75),
  ('C', 0.5)
on conflict (category) do nothing;

