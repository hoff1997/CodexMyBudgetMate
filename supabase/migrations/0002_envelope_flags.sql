alter table if exists public.envelopes
  add column if not exists sort_order integer default 0,
  add column if not exists is_spending boolean default false;

create index if not exists envelopes_sort_order_idx
  on public.envelopes (sort_order, name);

alter table if exists public.transaction_rules
  add column if not exists pattern text,
  add column if not exists match_type text not null default 'contains',
  add column if not exists case_sensitive boolean not null default false,
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

update public.transaction_rules
set pattern = merchant_normalized
where pattern is null;

create index if not exists transaction_rules_user_pattern_idx
  on public.transaction_rules (user_id, merchant_normalized);
