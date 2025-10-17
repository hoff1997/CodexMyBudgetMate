drop view if exists public.net_worth_snapshots_monthly;

create view public.net_worth_snapshots_monthly as
select distinct on (user_id, date_trunc('month', snapshot_date))
  user_id,
  date_trunc('month', snapshot_date)::date as month_date,
  snapshot_date as source_snapshot_date,
  total_assets,
  total_liabilities,
  net_worth
from public.net_worth_snapshots
order by user_id, date_trunc('month', snapshot_date), snapshot_date desc;

comment on view public.net_worth_snapshots_monthly is 'Latest net worth snapshot per month for each user.';
