alter table public.akahu_tokens
  add column if not exists access_token_expires_at timestamptz,
  add column if not exists refresh_token_expires_at timestamptz,
  add column if not exists scopes text[];

alter table public.bank_connections
  add constraint bank_connections_user_provider_key unique (user_id, provider);

create table if not exists public.akahu_webhook_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

alter table public.akahu_webhook_events enable row level security;

create policy "Users read own webhook events"
  on public.akahu_webhook_events
  for select
  using (auth.uid() = user_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create policy "Users read own audit logs"
  on public.audit_logs
  for select
  using (auth.uid() = user_id);

create policy "Users insert own audit logs"
  on public.audit_logs
  for insert
  with check (auth.uid() = user_id);
