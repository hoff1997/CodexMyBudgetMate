create table if not exists public.zero_budget_celebrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text,
  achieved_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists zero_budget_celebrations_user_idx
  on public.zero_budget_celebrations (user_id, achieved_at desc);

alter table public.zero_budget_celebrations enable row level security;
alter table public.zero_budget_celebrations force row level security;

drop policy if exists "Zero budget celebrations select own" on public.zero_budget_celebrations;
drop policy if exists "Zero budget celebrations insert own" on public.zero_budget_celebrations;
drop policy if exists "Zero budget celebrations update own" on public.zero_budget_celebrations;
drop policy if exists "Zero budget celebrations delete own" on public.zero_budget_celebrations;

create policy "Zero budget celebrations select own"
  on public.zero_budget_celebrations
  for select
  using (user_id = auth.uid());

create policy "Zero budget celebrations insert own"
  on public.zero_budget_celebrations
  for insert
  with check (user_id = auth.uid());

create policy "Zero budget celebrations update own"
  on public.zero_budget_celebrations
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Zero budget celebrations delete own"
  on public.zero_budget_celebrations
  for delete
  using (user_id = auth.uid());
