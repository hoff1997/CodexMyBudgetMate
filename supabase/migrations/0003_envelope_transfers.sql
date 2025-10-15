-- Create envelope transfer history table
create table if not exists public.envelope_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  from_envelope_id uuid not null references public.envelopes on delete restrict,
  to_envelope_id uuid not null references public.envelopes on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  from_balance_before numeric(12,2) not null,
  from_balance_after numeric(12,2) not null,
  to_balance_before numeric(12,2) not null,
  to_balance_after numeric(12,2) not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists envelope_transfers_user_created_idx
  on public.envelope_transfers (user_id, created_at desc);

alter table public.envelope_transfers enable row level security;
alter table public.envelope_transfers force row level security;

drop policy if exists "Envelope transfers select own" on public.envelope_transfers;
drop policy if exists "Envelope transfers insert own" on public.envelope_transfers;
drop policy if exists "Envelope transfers update own" on public.envelope_transfers;
drop policy if exists "Envelope transfers delete own" on public.envelope_transfers;

create policy "Envelope transfers select own"
  on public.envelope_transfers
  for select
  using (user_id = auth.uid());

create policy "Envelope transfers insert own"
  on public.envelope_transfers
  for insert
  with check (user_id = auth.uid());

create policy "Envelope transfers update own"
  on public.envelope_transfers
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Envelope transfers delete own"
  on public.envelope_transfers
  for delete
  using (user_id = auth.uid());

-- Helper function to transfer funds atomically and record history
drop function if exists public.transfer_between_envelopes(uuid, uuid, uuid, numeric, text);

create or replace function public.transfer_between_envelopes(
  p_user_id uuid,
  p_from_envelope_id uuid,
  p_to_envelope_id uuid,
  p_amount numeric,
  p_note text default null
) returns public.envelope_transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_balance numeric(12,2);
  v_to_balance numeric(12,2);
  v_transfer public.envelope_transfers;
begin
  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Invalid user context for transfer';
  end if;

  if p_from_envelope_id = p_to_envelope_id then
    raise exception 'Cannot transfer between the same envelope';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Transfer amount must be greater than zero';
  end if;

  select coalesce(current_amount, 0)::numeric(12,2)
    into v_from_balance
  from public.envelopes
  where id = p_from_envelope_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Source envelope not found';
  end if;

  if v_from_balance < p_amount then
    raise exception 'Insufficient funds in source envelope';
  end if;

  select coalesce(current_amount, 0)::numeric(12,2)
    into v_to_balance
  from public.envelopes
  where id = p_to_envelope_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Destination envelope not found';
  end if;

  update public.envelopes
  set current_amount = (v_from_balance - p_amount),
      updated_at = now()
  where id = p_from_envelope_id
    and user_id = p_user_id;

  update public.envelopes
  set current_amount = (v_to_balance + p_amount),
      updated_at = now()
  where id = p_to_envelope_id
    and user_id = p_user_id;

  insert into public.envelope_transfers (
    user_id,
    from_envelope_id,
    to_envelope_id,
    amount,
    from_balance_before,
    from_balance_after,
    to_balance_before,
    to_balance_after,
    note
  )
  values (
    p_user_id,
    p_from_envelope_id,
    p_to_envelope_id,
    p_amount,
    v_from_balance,
    v_from_balance - p_amount,
    v_to_balance,
    v_to_balance + p_amount,
    nullif(trim(p_note), '')
  )
  returning * into v_transfer;

  return v_transfer;
end;
$$;

grant execute on function public.transfer_between_envelopes(uuid, uuid, uuid, numeric, text) to authenticated;
grant execute on function public.transfer_between_envelopes(uuid, uuid, uuid, numeric, text) to service_role;
