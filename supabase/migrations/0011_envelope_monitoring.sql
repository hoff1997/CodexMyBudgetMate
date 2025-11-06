-- Add is_monitored field to envelopes table
-- This allows users to mark specific envelopes for monitoring in the dashboard widget

alter table if exists public.envelopes
  add column if not exists is_monitored boolean default false;

-- Add index for faster filtering of monitored envelopes
create index if not exists idx_envelopes_monitored on public.envelopes(is_monitored) where is_monitored = true;

-- Add comment for documentation
comment on column public.envelopes.is_monitored is 'Flag to indicate if this envelope should be displayed in the Monitored Envelopes dashboard widget';
