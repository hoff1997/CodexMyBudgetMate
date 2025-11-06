-- Add envelope_type field to envelopes table for zero-budget-setup page
-- This allows distinguishing between income and expense envelopes

alter table public.envelopes
  add column if not exists envelope_type text check (envelope_type in ('income', 'expense')) default 'expense';

-- Add index for better query performance
create index if not exists idx_envelopes_envelope_type on public.envelopes(envelope_type);

-- Add comment for documentation
comment on column public.envelopes.envelope_type is 'Type of envelope: income or expense. Used for budget calculations in zero-budget-setup.';
