create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.envelope_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  type text not null check (type in ('transaction', 'savings', 'debt', 'investment', 'cash', 'liability')),
  institution text,
  current_balance numeric(14,2) default 0,
  last_statement_at date,
  reconciled boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.envelopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  category_id uuid references public.envelope_categories on delete set null,
  target_amount numeric(12,2) default 0,
  annual_amount numeric(12,2) default 0,
  pay_cycle_amount numeric(12,2) default 0,
  opening_balance numeric(12,2) default 0,
  current_amount numeric(12,2) default 0,
  due_date date,
  frequency text,
  next_payment_due date,
  notes text,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  envelope_id uuid references public.envelopes on delete set null,
  account_id uuid references public.accounts on delete set null,
  merchant_name text not null,
  description text,
  amount numeric(12,2) not null,
  occurred_at date not null,
  status text not null default 'pending',
  raw_payload jsonb,
  bank_reference text,
  bank_memo text,
  receipt_url text,
  duplicate_of uuid references public.transactions on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  colour text,
  created_at timestamptz not null default now()
);

create table if not exists public.transaction_labels (
  transaction_id uuid references public.transactions on delete cascade,
  label_id uuid references public.labels on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (transaction_id, label_id)
);

create table if not exists public.transaction_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  merchant_normalized text not null,
  envelope_id uuid references public.envelopes on delete cascade,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  provider text not null,
  status text not null default 'connected',
  last_synced_at timestamptz,
  sync_frequency text default '15m',
  settings jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  asset_type text not null,
  current_value numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.liabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  liability_type text not null,
  current_balance numeric(14,2) not null default 0,
  interest_rate numeric(6,3) default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  snapshot_date date not null default current_date,
  total_assets numeric(14,2) not null,
  total_liabilities numeric(14,2) not null,
  net_worth numeric(14,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.akahu_tokens (
  user_id uuid primary key references auth.users on delete cascade,
  access_token text not null,
  refresh_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  t.receipt_url
from public.transactions t
left join public.envelopes e on e.id = t.envelope_id
left join public.accounts a on a.id = t.account_id;

alter table public.profiles enable row level security;
alter table public.envelope_categories enable row level security;
alter table public.accounts enable row level security;
alter table public.envelopes enable row level security;
alter table public.transactions enable row level security;
alter table public.akahu_tokens enable row level security;
alter table public.labels enable row level security;
alter table public.transaction_labels enable row level security;
alter table public.transaction_rules enable row level security;
alter table public.bank_connections enable row level security;
alter table public.assets enable row level security;
alter table public.liabilities enable row level security;
alter table public.net_worth_snapshots enable row level security;

create policy "Profiles are viewable by owners"
  on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles are inserted by owners"
  on public.profiles
  for insert with check (auth.uid() = id);

create policy "Profiles are updated by owners"
  on public.profiles
  for update using (auth.uid() = id);

create policy "Envelopes are viewable by owner"
  on public.envelopes
  for select using (auth.uid() = user_id);

create policy "Envelopes are insertable by owner"
  on public.envelopes
  for insert with check (auth.uid() = user_id);

create policy "Envelopes are updateable by owner"
  on public.envelopes
  for update using (auth.uid() = user_id);

create policy "Envelopes are deletable by owner"
  on public.envelopes
  for delete using (auth.uid() = user_id);

create policy "Envelope categories accessible by owner"
  on public.envelope_categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Accounts are viewable by owner"
  on public.accounts
  for select using (auth.uid() = user_id);

create policy "Accounts are insertable by owner"
  on public.accounts
  for insert with check (auth.uid() = user_id);

create policy "Accounts are updateable by owner"
  on public.accounts
  for update using (auth.uid() = user_id);

create policy "Accounts are deletable by owner"
  on public.accounts
  for delete using (auth.uid() = user_id);

create policy "Transactions visible to owner"
  on public.transactions
  for select using (auth.uid() = user_id);

create policy "Transactions insertable by owner"
  on public.transactions
  for insert with check (auth.uid() = user_id);

create policy "Transactions updatable by owner"
  on public.transactions
  for update using (auth.uid() = user_id);

create policy "Transactions deletable by owner"
  on public.transactions
  for delete using (auth.uid() = user_id);

create policy "Akahu tokens accessible by owner"
  on public.akahu_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Labels accessible by owner"
  on public.labels
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Transaction labels accessible by owner"
  on public.transaction_labels
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Transaction rules accessible by owner"
  on public.transaction_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Bank connections accessible by owner"
  on public.bank_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Assets accessible by owner"
  on public.assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Liabilities accessible by owner"
  on public.liabilities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Net worth snapshots accessible by owner"
  on public.net_worth_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
