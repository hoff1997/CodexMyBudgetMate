-- Recurring income table with CRUD support
create table if not exists public.recurring_income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  frequency text not null check (frequency in ('weekly', 'fortnightly', 'monthly', 'quarterly', 'annually', 'none')),
  next_date date,
  allocations jsonb not null default '[]'::jsonb check (jsonb_typeof(allocations) = 'array'),
  surplus_envelope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recurring_income_user_idx
  on public.recurring_income (user_id, name);

create or replace function public.update_recurring_income_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_recurring_income_updated_at on public.recurring_income;

create trigger set_recurring_income_updated_at
  before update on public.recurring_income
  for each row
  execute function public.update_recurring_income_updated_at();

alter table public.recurring_income enable row level security;
alter table public.recurring_income force row level security;

drop policy if exists "Recurring income select own" on public.recurring_income;
drop policy if exists "Recurring income insert own" on public.recurring_income;
drop policy if exists "Recurring income update own" on public.recurring_income;
drop policy if exists "Recurring income delete own" on public.recurring_income;

create policy "Recurring income select own"
  on public.recurring_income
  for select
  using (user_id = auth.uid());

create policy "Recurring income insert own"
  on public.recurring_income
  for insert
  with check (user_id = auth.uid());

create policy "Recurring income update own"
  on public.recurring_income
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Recurring income delete own"
  on public.recurring_income
  for delete
  using (user_id = auth.uid());
