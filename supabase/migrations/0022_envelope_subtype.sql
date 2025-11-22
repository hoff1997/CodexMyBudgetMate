-- Migration: Add envelope subtype field for bill/spending/savings classification
-- This allows unified envelope management without income/expense separation

-- Add subtype column to envelopes table
alter table public.envelopes
add column if not exists subtype text
  check (subtype in ('bill', 'spending', 'savings', 'goal'))
  default 'bill';

-- Create index for efficient querying by subtype
create index if not exists idx_envelopes_subtype on public.envelopes(subtype);

-- Add comment explaining the field
comment on column public.envelopes.subtype is
  'Subtype classification: bill (recurring expense), spending (flexible budget), savings (accumulation), goal (targeted savings)';

-- Migrate existing data based on envelope_type and name patterns
-- This is a best-effort migration - users can adjust manually
update public.envelopes
set subtype = case
  -- Savings patterns
  when lower(name) like '%surplus%' or
       lower(name) like '%emergency%' or
       lower(name) like '%savings%' or
       lower(name) like '%investment%' or
       lower(name) like '%property%' or
       lower(name) like '%giving%' or
       lower(name) like '%goal%'
  then 'savings'

  -- Spending patterns
  when lower(name) like '%groceries%' or
       lower(name) like '%takeaway%' or
       lower(name) like '%entertainment%' or
       lower(name) like '%fun%' or
       lower(name) like '%dining%' or
       lower(name) like '%miscellaneous%' or
       lower(name) like '%lifestyle%'
  then 'spending'

  -- Default to bill for everything else
  else 'bill'
end
where subtype is null;
