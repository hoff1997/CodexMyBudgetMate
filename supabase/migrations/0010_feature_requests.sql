-- Feature request tracking for per-user ticketing
do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'feature_request_status'
  ) then
    create type public.feature_request_status as enum ('new', 'pending', 'approved', 'completed');
  end if;
end
$$;

create table if not exists public.feature_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  description text,
  status public.feature_request_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feature_requests_user_status_idx
  on public.feature_requests (user_id, status);

create index if not exists feature_requests_created_at_idx
  on public.feature_requests (created_at desc);

create or replace function public.update_feature_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_feature_requests_updated_at on public.feature_requests;

create trigger set_feature_requests_updated_at
  before update on public.feature_requests
  for each row
  execute function public.update_feature_requests_updated_at();

alter table public.feature_requests enable row level security;
alter table public.feature_requests force row level security;

drop policy if exists "Feature requests select own" on public.feature_requests;
drop policy if exists "Feature requests insert own" on public.feature_requests;
drop policy if exists "Feature requests update own" on public.feature_requests;
drop policy if exists "Feature requests delete own" on public.feature_requests;

create policy "Feature requests select own"
  on public.feature_requests
  for select
  using (user_id = auth.uid());

create policy "Feature requests insert own"
  on public.feature_requests
  for insert
  with check (user_id = auth.uid());

create policy "Feature requests update own"
  on public.feature_requests
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Feature requests delete own"
  on public.feature_requests
  for delete
  using (user_id = auth.uid());
