-- Transaction split support
create table if not exists public.transaction_splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  transaction_id uuid not null references public.transactions on delete cascade,
  envelope_id uuid not null references public.envelopes on delete restrict,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transaction_splits_transaction_idx
  on public.transaction_splits (transaction_id);

create index if not exists transaction_splits_user_transaction_idx
  on public.transaction_splits (user_id, transaction_id);

create or replace function public.update_transaction_splits_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_transaction_splits_updated_at on public.transaction_splits;

create trigger set_transaction_splits_updated_at
  before update on public.transaction_splits
  for each row
  execute function public.update_transaction_splits_updated_at();

alter table public.transaction_splits enable row level security;
alter table public.transaction_splits force row level security;

drop policy if exists "Transaction splits select own" on public.transaction_splits;
drop policy if exists "Transaction splits insert own" on public.transaction_splits;
drop policy if exists "Transaction splits update own" on public.transaction_splits;
drop policy if exists "Transaction splits delete own" on public.transaction_splits;

create policy "Transaction splits select own"
  on public.transaction_splits
  for select
  using (user_id = auth.uid());

create policy "Transaction splits insert own"
  on public.transaction_splits
  for insert
  with check (user_id = auth.uid());

create policy "Transaction splits update own"
  on public.transaction_splits
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Transaction splits delete own"
  on public.transaction_splits
  for delete
  using (user_id = auth.uid());

-- RPC to persist splits atomically
drop function if exists public.save_transaction_splits(uuid, uuid, jsonb);

create or replace function public.save_transaction_splits(
  p_user_id uuid,
  p_transaction_id uuid,
  p_splits jsonb
) returns setof public.transaction_splits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction_amount numeric(12,2);
  v_transaction_status text;
  v_split_count integer := 0;
  v_first_envelope uuid := null;
  v_total numeric(14,4) := 0;
  v_split record;
  v_inserted public.transaction_splits;
begin
  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Invalid auth context for transaction split';
  end if;

  if p_splits is null or jsonb_typeof(p_splits) <> 'array' or jsonb_array_length(p_splits) = 0 then
    raise exception 'At least one split record is required';
  end if;

  select amount, status
    into v_transaction_amount, v_transaction_status
  from public.transactions
  where id = p_transaction_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Transaction not found';
  end if;

  for v_split in
    select
      (value ->> 'envelope_id')::uuid as envelope_id,
      (value ->> 'amount')::numeric as amount
    from jsonb_array_elements(p_splits) as value
  loop
    if v_split.envelope_id is null then
      raise exception 'Envelope id missing in split payload';
    end if;
    if v_split.amount is null then
      raise exception 'Amount missing in split payload';
    end if;

    perform 1
    from public.envelopes
    where id = v_split.envelope_id
      and user_id = p_user_id;

    if not found then
      raise exception 'Envelope % not found for user', v_split.envelope_id;
    end if;

    v_split_count := v_split_count + 1;
    v_total := v_total + v_split.amount;

    if v_first_envelope is null then
      v_first_envelope := v_split.envelope_id;
    end if;
  end loop;

  if abs(coalesce(v_total, 0) - coalesce(v_transaction_amount, 0)) > 0.01 then
    raise exception 'Split totals (%) must equal transaction amount (%)', v_total, v_transaction_amount;
  end if;

  delete from public.transaction_splits
  where transaction_id = p_transaction_id
    and user_id = p_user_id;

  for v_split in
    select
      (value ->> 'envelope_id')::uuid as envelope_id,
      (value ->> 'amount')::numeric as amount
    from jsonb_array_elements(p_splits) as value
  loop
    insert into public.transaction_splits (
      user_id,
      transaction_id,
      envelope_id,
      amount
    )
    values (
      p_user_id,
      p_transaction_id,
      v_split.envelope_id,
      v_split.amount
    )
    returning * into v_inserted;

    return next v_inserted;
  end loop;

  update public.transactions
  set envelope_id = case when v_split_count = 1 then v_first_envelope else null end,
      status = case when v_transaction_status = 'unmatched' then 'pending' else v_transaction_status end,
      updated_at = now()
  where id = p_transaction_id
    and user_id = p_user_id;

  return;
end;
$$;

grant execute on function public.save_transaction_splits(uuid, uuid, jsonb) to authenticated;
grant execute on function public.save_transaction_splits(uuid, uuid, jsonb) to service_role;
