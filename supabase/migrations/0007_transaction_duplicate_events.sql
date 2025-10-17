-- Table to audit duplicate resolution decisions
create table if not exists public.transaction_duplicate_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  primary_transaction_id uuid not null references public.transactions on delete cascade,
  duplicate_transaction_id uuid not null references public.transactions on delete cascade,
  decision text not null check (lower(decision) in ('merge','ignore')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists transaction_duplicate_events_user_idx
  on public.transaction_duplicate_events (user_id, created_at desc);

alter table public.transaction_duplicate_events enable row level security;
alter table public.transaction_duplicate_events force row level security;

drop policy if exists "Duplicate events select own" on public.transaction_duplicate_events;
create policy "Duplicate events select own"
  on public.transaction_duplicate_events
  for select using (auth.uid() = user_id);

drop policy if exists "Duplicate events insert own" on public.transaction_duplicate_events;
create policy "Duplicate events insert own"
  on public.transaction_duplicate_events
  for insert with check (auth.uid() = user_id);

-- Extend transactions table with resolution flags
alter table if exists public.transactions
  add column if not exists duplicate_status text not null default 'pending' check (duplicate_status in ('pending','canonical','merged','ignored')),
  add column if not exists duplicate_reviewed_at timestamptz;

-- Recreate transactions view with duplicate metadata
drop view if exists public.transactions_view;

create view public.transactions_view as
select
  t.id,
  t.merchant_name,
  t.description,
  t.amount,
  t.occurred_at,
  t.status,
  e.name as envelope_name,
  a.name as account_name,
  t.bank_reference,
  t.bank_memo,
  t.receipt_url,
  t.duplicate_of,
  t.duplicate_status,
  t.duplicate_reviewed_at
from public.transactions t
left join public.envelopes e on e.id = t.envelope_id
left join public.accounts a on a.id = t.account_id;

comment on view public.transactions_view is 'Transactions joined with envelope/account metadata and duplicate resolution flags.';

-- Helper function to resolve duplicates atomically
drop function if exists public.resolve_transaction_duplicate(uuid, uuid, uuid, text, text);

create or replace function public.resolve_transaction_duplicate(
  p_user_id uuid,
  p_primary_transaction_id uuid,
  p_duplicate_transaction_id uuid,
  p_decision text,
  p_note text default null
) returns public.transaction_duplicate_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_primary record;
  v_duplicate record;
  v_decision text;
  v_event public.transaction_duplicate_events;
begin
  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Invalid auth context for duplicate resolution';
  end if;

  v_decision := lower(trim(p_decision));
  if v_decision not in ('merge', 'ignore') then
    raise exception 'Unsupported decision %', p_decision;
  end if;

  select id, duplicate_status
    into v_primary
  from public.transactions
  where id = p_primary_transaction_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Primary transaction not found';
  end if;

  select id, duplicate_status
    into v_duplicate
  from public.transactions
  where id = p_duplicate_transaction_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Duplicate transaction not found';
  end if;

  if v_primary.id = v_duplicate.id then
    raise exception 'Cannot resolve a transaction against itself';
  end if;

  if v_decision = 'merge' then
    update public.transactions
    set duplicate_status = 'canonical',
        duplicate_reviewed_at = now()
    where id = v_primary.id;

    update public.transactions
    set duplicate_of = v_primary.id,
        duplicate_status = 'merged',
        duplicate_reviewed_at = now(),
        updated_at = now()
    where id = v_duplicate.id;
  else
    update public.transactions
    set duplicate_status = 'ignored',
        duplicate_reviewed_at = now()
    where id in (v_primary.id, v_duplicate.id);

    update public.transactions
    set duplicate_of = null
    where id = v_duplicate.id;
  end if;

  insert into public.transaction_duplicate_events (
    user_id,
    primary_transaction_id,
    duplicate_transaction_id,
    decision,
    note
  )
  values (
    p_user_id,
    v_primary.id,
    v_duplicate.id,
    v_decision,
    case
      when p_note is null or length(trim(p_note)) = 0 then null
      else trim(p_note)
    end
  )
  returning * into v_event;

  return v_event;
end;
$$;

grant execute on function public.resolve_transaction_duplicate(uuid, uuid, uuid, text, text) to authenticated;
