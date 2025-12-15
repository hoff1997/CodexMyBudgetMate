-- Migration: Auto-snapshot net worth when account balances change
-- This creates a trigger that captures net worth whenever an account balance is updated

-- Function to calculate and store net worth snapshot for a user
create or replace function public.snapshot_net_worth_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_total_assets numeric(14,2);
  v_total_liabilities numeric(14,2);
  v_net_worth numeric(14,2);
  v_last_snapshot_date date;
begin
  -- Calculate totals from accounts table
  -- Assets: positive balances from transaction, savings, investment, cash accounts
  -- Liabilities: absolute value of negative balances OR debt/liability type accounts
  select
    coalesce(sum(case
      when current_balance >= 0 and type in ('transaction', 'savings', 'investment', 'cash')
      then current_balance
      else 0
    end), 0),
    coalesce(sum(case
      when type in ('debt', 'liability') then abs(current_balance)
      when current_balance < 0 then abs(current_balance)
      else 0
    end), 0)
  into v_total_assets, v_total_liabilities
  from public.accounts
  where user_id = p_user_id;

  -- Also add from assets table if it exists
  begin
    select v_total_assets + coalesce(sum(current_value), 0)
    into v_total_assets
    from public.assets
    where user_id = p_user_id;
  exception when undefined_table then
    -- assets table doesn't exist, skip
    null;
  end;

  -- Also add from liabilities table if it exists
  begin
    select v_total_liabilities + coalesce(sum(current_balance), 0)
    into v_total_liabilities
    from public.liabilities
    where user_id = p_user_id;
  exception when undefined_table then
    -- liabilities table doesn't exist, skip
    null;
  end;

  v_net_worth := v_total_assets - v_total_liabilities;

  -- Check if we already have a snapshot for today
  select snapshot_date into v_last_snapshot_date
  from public.net_worth_snapshots
  where user_id = p_user_id
  order by snapshot_date desc
  limit 1;

  -- Only create one snapshot per day (update if exists for today)
  if v_last_snapshot_date = current_date then
    update public.net_worth_snapshots
    set
      total_assets = v_total_assets,
      total_liabilities = v_total_liabilities,
      net_worth = v_net_worth
    where user_id = p_user_id and snapshot_date = current_date;
  else
    insert into public.net_worth_snapshots (user_id, snapshot_date, total_assets, total_liabilities, net_worth)
    values (p_user_id, current_date, v_total_assets, v_total_liabilities, v_net_worth);
  end if;
end;
$$;

-- Trigger function for accounts table
create or replace function public.trigger_snapshot_net_worth()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only trigger on balance changes
  if TG_OP = 'INSERT' or TG_OP = 'DELETE' or
     (TG_OP = 'UPDATE' and OLD.current_balance is distinct from NEW.current_balance) then
    perform public.snapshot_net_worth_for_user(coalesce(NEW.user_id, OLD.user_id));
  end if;
  return coalesce(NEW, OLD);
end;
$$;

-- Create trigger on accounts table
drop trigger if exists accounts_net_worth_snapshot on public.accounts;
create trigger accounts_net_worth_snapshot
  after insert or update or delete on public.accounts
  for each row
  execute function public.trigger_snapshot_net_worth();

-- Create trigger on assets table (if it exists)
do $$
begin
  drop trigger if exists assets_net_worth_snapshot on public.assets;
  create trigger assets_net_worth_snapshot
    after insert or update or delete on public.assets
    for each row
    execute function public.trigger_snapshot_net_worth();
exception when undefined_table then
  -- assets table doesn't exist, skip
  null;
end $$;

-- Create trigger on liabilities table (if it exists)
do $$
begin
  drop trigger if exists liabilities_net_worth_snapshot on public.liabilities;
  create trigger liabilities_net_worth_snapshot
    after insert or update or delete on public.liabilities
    for each row
    execute function public.trigger_snapshot_net_worth();
exception when undefined_table then
  -- liabilities table doesn't exist, skip
  null;
end $$;

comment on function public.snapshot_net_worth_for_user is 'Calculates and stores a net worth snapshot for the specified user';
comment on function public.trigger_snapshot_net_worth is 'Trigger function that creates net worth snapshots when account/asset/liability balances change';
