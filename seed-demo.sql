-- Demo seed script for My Budget Mate
begin;

-- Ensure rerunning the seed removes any previous demo data.
delete from public.transaction_splits
where user_id = '00000000-0000-0000-0000-000000000001'::uuid;

delete from public.transaction_labels
where user_id = '00000000-0000-0000-0000-000000000001'::uuid;

delete from public.recurring_income
where user_id = '00000000-0000-0000-0000-000000000001'::uuid;

delete from auth.users
where id = '00000000-0000-0000-0000-000000000001'::uuid
   or email = 'demo@example.com';

-- Create or refresh the demo auth user.
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_sent_at,
  last_sign_in_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'demo@example.com',
  crypt('demo123', gen_salt('bf')),
  now(),
  now(),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Demo Budget Mate"}'::jsonb
)
on conflict (id) do update
set email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    confirmation_sent_at = excluded.confirmation_sent_at,
    last_sign_in_at = excluded.last_sign_in_at,
    updated_at = excluded.updated_at,
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data;

-- Profile for the demo user.
insert into public.profiles (
  id,
  full_name,
  avatar_url,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Demo Budget Mate',
  null,
  now(),
  now()
)
on conflict (id) do update
set full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    updated_at = excluded.updated_at;

-- Demo envelopes.
insert into public.envelopes (
  id,
  user_id,
  name,
  category_id,
  target_amount,
  annual_amount,
  pay_cycle_amount,
  opening_balance,
  current_amount,
  due_date,
  frequency,
  next_payment_due,
  notes,
  icon,
  sort_order,
  is_spending,
  created_at,
  updated_at
) values
  (
    '00000000-0000-0000-0000-000000000201'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Rent',
    null,
    2200.00,
    26400.00,
    550.00,
    0.00,
    2200.00,
    '2025-08-01',
    'monthly',
    '2025-08-01',
    'Fixed rent',
    '🏠',
    0,
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000202'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Groceries',
    null,
    600.00,
    7200.00,
    150.00,
    0.00,
    480.00,
    null,
    'weekly',
    null,
    'Family of four',
    '🛒',
    1,
    true,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000203'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Emergency Fund',
    null,
    1000.00,
    0.00,
    250.00,
    0.00,
    820.00,
    null,
    'monthly',
    null,
    'Hold $1k buffer',
    '🛟',
    2,
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000204'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Credit Card Payment',
    null,
    600.00,
    0.00,
    150.00,
    0.00,
    600.00,
    null,
    'fortnightly',
    null,
    'Pay card in full',
    '💳',
    3,
    false,
    now(),
    now()
  )
on conflict (id) do update
set name = excluded.name,
    category_id = excluded.category_id,
    target_amount = excluded.target_amount,
    annual_amount = excluded.annual_amount,
    pay_cycle_amount = excluded.pay_cycle_amount,
    opening_balance = excluded.opening_balance,
    current_amount = excluded.current_amount,
    due_date = excluded.due_date,
    frequency = excluded.frequency,
    next_payment_due = excluded.next_payment_due,
    notes = excluded.notes,
    icon = excluded.icon,
    sort_order = excluded.sort_order,
    is_spending = excluded.is_spending,
    updated_at = excluded.updated_at;

-- Demo liabilities.
insert into public.liabilities (
  id,
  user_id,
  name,
  liability_type,
  current_balance,
  interest_rate,
  notes,
  created_at,
  updated_at
) values
  (
    '00000000-0000-0000-0000-000000000301'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'ANZ Credit Card',
    'credit_card',
    4200.00,
    19.95,
    'Pay off monthly',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000302'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Westpac Personal Loan',
    'personal_loan',
    11800.00,
    12.50,
    'Loan for renovations',
    now(),
    now()
  )
on conflict (id) do update
set name = excluded.name,
    liability_type = excluded.liability_type,
    current_balance = excluded.current_balance,
    interest_rate = excluded.interest_rate,
    notes = excluded.notes,
    updated_at = excluded.updated_at;

-- Demo accounts.
insert into public.accounts (
  id,
  user_id,
  name,
  type,
  institution,
  current_balance,
  reconciled,
  created_at,
  updated_at
) values
  (
    '00000000-0000-0000-0000-000000000401'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Everyday Account',
    'transaction',
    'ANZ',
    2400.00,
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000402'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Credit Card Liability',
    'liability',
    'ANZ',
    -4200.00,
    false,
    now(),
    now()
  )
on conflict (id) do update
set name = excluded.name,
    type = excluded.type,
    institution = excluded.institution,
    current_balance = excluded.current_balance,
    reconciled = excluded.reconciled,
    updated_at = excluded.updated_at;

-- Demo net worth snapshots.
insert into public.net_worth_snapshots (
  id,
  user_id,
  snapshot_date,
  total_assets,
  total_liabilities,
  net_worth,
  created_at
) values
  (
    '00000000-0000-0000-0000-000000000501'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    current_date - interval '60 days',
    41000.00,
    320000.00,
    -279000.00,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000502'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    current_date,
    45000.00,
    318000.00,
    -273000.00,
    now()
  )
on conflict (id) do update
set snapshot_date = excluded.snapshot_date,
    total_assets = excluded.total_assets,
    total_liabilities = excluded.total_liabilities,
    net_worth = excluded.net_worth,
    created_at = excluded.created_at;

-- Demo transactions.
insert into public.transactions (
  id,
  user_id,
  envelope_id,
  account_id,
  merchant_name,
  description,
  amount,
  occurred_at,
  status,
  created_at
) values
  (
    '00000000-0000-0000-0000-000000000601'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000202'::uuid,
    '00000000-0000-0000-0000-000000000401'::uuid,
    'Countdown',
    'Weekly groceries',
    -150.00,
    current_date - interval '2 days',
    'pending',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000602'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    null,
    '00000000-0000-0000-0000-000000000401'::uuid,
    'Westfield Parking',
    null,
    -6.00,
    current_date - interval '7 days',
    'unmatched',
    now()
  )
on conflict (id) do update
set envelope_id = excluded.envelope_id,
    account_id = excluded.account_id,
    merchant_name = excluded.merchant_name,
    description = excluded.description,
    amount = excluded.amount,
    occurred_at = excluded.occurred_at,
    status = excluded.status;

-- Demo transaction rule to auto-tag groceries.
insert into public.transaction_rules (
  id,
  user_id,
  merchant_normalized,
  envelope_id,
  notes,
  pattern,
  match_type,
  case_sensitive,
  is_active,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000701'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'countdown',
  '00000000-0000-0000-0000-000000000202'::uuid,
  'Automatically tag grocery spend',
  'Countdown',
  'contains',
  false,
  true,
  now(),
  now()
)
on conflict (id) do update
set merchant_normalized = excluded.merchant_normalized,
    envelope_id = excluded.envelope_id,
    notes = excluded.notes,
    pattern = excluded.pattern,
    match_type = excluded.match_type,
    case_sensitive = excluded.case_sensitive,
    is_active = excluded.is_active,
    updated_at = excluded.updated_at;

insert into public.recurring_income (
  id,
  user_id,
  name,
  amount,
  frequency,
  next_date,
  allocations,
  surplus_envelope,
  created_at,
  updated_at
) values
  (
    '00000000-0000-0000-0000-000000000801'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Primary salary',
    2200.00,
    'fortnightly',
    current_date + interval '7 days',
    '[{"envelope":"Rent","amount":1200},{"envelope":"Groceries","amount":300},{"envelope":"Savings","amount":200}]'::jsonb,
    'Surplus',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000802'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Side hustle',
    450.00,
    'monthly',
    current_date + interval '20 days',
    '[{"envelope":"Emergency Fund","amount":200},{"envelope":"Fun","amount":100}]'::jsonb,
    null,
    now(),
    now()
  )
on conflict (id) do update
set name = excluded.name,
    amount = excluded.amount,
    frequency = excluded.frequency,
    next_date = excluded.next_date,
    allocations = excluded.allocations,
    surplus_envelope = excluded.surplus_envelope,
    updated_at = excluded.updated_at;

commit;
