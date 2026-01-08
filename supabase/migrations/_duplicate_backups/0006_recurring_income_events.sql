-- Recurring income allocation event log
create table if not exists public.recurring_income_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  stream_id uuid not null references public.recurring_income on delete cascade,
  transaction_id uuid not null references public.transactions on delete cascade,
  transaction_amount numeric(12,2) not null,
  expected_amount numeric(12,2),
  difference numeric(12,2),
  allocations jsonb,
  applied_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stream_id, transaction_id)
);

create index if not exists recurring_income_events_user_stream_idx
  on public.recurring_income_events (user_id, stream_id, applied_at desc);

create index if not exists recurring_income_events_transaction_idx
  on public.recurring_income_events (transaction_id);

create or replace function public.update_recurring_income_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_recurring_income_events_updated_at on public.recurring_income_events;

create trigger set_recurring_income_events_updated_at
  before update on public.recurring_income_events
  for each row
  execute function public.update_recurring_income_events_updated_at();

alter table public.recurring_income_events enable row level security;
alter table public.recurring_income_events force row level security;

drop policy if exists "Income events select own" on public.recurring_income_events;
drop policy if exists "Income events insert own" on public.recurring_income_events;
drop policy if exists "Income events update own" on public.recurring_income_events;
drop policy if exists "Income events delete own" on public.recurring_income_events;

create policy "Income events select own"
  on public.recurring_income_events
  for select
  using (user_id = auth.uid());

create policy "Income events insert own"
  on public.recurring_income_events
  for insert
  with check (user_id = auth.uid());

create policy "Income events update own"
  on public.recurring_income_events
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Income events delete own"
  on public.recurring_income_events
  for delete
  using (user_id = auth.uid());
