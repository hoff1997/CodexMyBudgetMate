-- Fix SECURITY DEFINER views to use SECURITY INVOKER
-- This ensures RLS policies are enforced based on the querying user, not the view creator

-- =====================================================
-- Fix net_worth_snapshots_monthly view
-- =====================================================
DROP VIEW IF EXISTS public.net_worth_snapshots_monthly;

CREATE VIEW public.net_worth_snapshots_monthly
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (user_id, date_trunc('month', snapshot_date))
  user_id,
  date_trunc('month', snapshot_date)::date AS month_date,
  snapshot_date AS source_snapshot_date,
  total_assets,
  total_liabilities,
  net_worth
FROM public.net_worth_snapshots
ORDER BY user_id, date_trunc('month', snapshot_date), snapshot_date DESC;

COMMENT ON VIEW public.net_worth_snapshots_monthly IS 'Latest net worth snapshot per month for each user. Uses SECURITY INVOKER for RLS.';

-- =====================================================
-- Fix account_summary_view
-- =====================================================
DROP VIEW IF EXISTS public.account_summary_view;

CREATE VIEW public.account_summary_view
WITH (security_invoker = true)
AS
SELECT
  a.user_id,
  a.id AS account_id,
  COALESCE(a.nickname, a.name) AS display_name,
  a.name AS account_name,
  a.type AS account_type,
  a.institution,
  a.current_balance,
  (SELECT COUNT(*) FROM public.transactions t WHERE t.account_id = a.id) AS transaction_count,
  (SELECT MAX(t.occurred_at) FROM public.transactions t WHERE t.account_id = a.id) AS last_transaction_date
FROM public.accounts a;

COMMENT ON VIEW public.account_summary_view IS 'Account summary with transaction metadata. Uses SECURITY INVOKER for RLS.';

-- =====================================================
-- Fix transactions_view
-- =====================================================
DROP VIEW IF EXISTS public.transactions_view;

CREATE VIEW public.transactions_view
WITH (security_invoker = true)
AS
SELECT
  t.id,
  t.merchant_name,
  t.description,
  t.amount,
  t.occurred_at,
  t.status,
  e.name AS envelope_name,
  a.name AS account_name,
  t.bank_reference,
  t.bank_memo,
  t.receipt_url,
  t.duplicate_of,
  t.duplicate_status,
  t.duplicate_reviewed_at
FROM public.transactions t
LEFT JOIN public.envelopes e ON e.id = t.envelope_id
LEFT JOIN public.accounts a ON a.id = t.account_id;

COMMENT ON VIEW public.transactions_view IS 'Transactions joined with envelope/account metadata and duplicate resolution flags. Uses SECURITY INVOKER for RLS.';
