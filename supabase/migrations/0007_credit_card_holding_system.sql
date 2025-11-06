-- Add Credit Card Holding Account System
-- This enables automatic tracking and allocation of credit card spending

-- Add is_credit_card_holding flag to accounts table
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS is_credit_card_holding boolean default false;

-- Add is_credit_card_payment flag to envelopes table
ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS is_credit_card_payment boolean default false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_is_cc_holding
  ON public.accounts(is_credit_card_holding)
  WHERE is_credit_card_holding = true;

CREATE INDEX IF NOT EXISTS idx_envelopes_is_cc_payment
  ON public.envelopes(is_credit_card_payment)
  WHERE is_credit_card_payment = true;

-- Add comments for documentation
COMMENT ON COLUMN public.accounts.is_credit_card_holding IS
  'True if this account is used to hold funds allocated for credit card payments. System uses this to track money set aside for CC bills.';

COMMENT ON COLUMN public.envelopes.is_credit_card_payment IS
  'True if this envelope is used to track credit card payment obligations. Links to credit card holding account.';

-- Create a table to track credit card allocations for audit trail
CREATE TABLE IF NOT EXISTS public.credit_card_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  transaction_id uuid not null references public.transactions on delete cascade,
  envelope_id uuid not null references public.envelopes on delete cascade,
  holding_account_id uuid not null references public.accounts on delete cascade,
  credit_card_account_id uuid not null references public.accounts on delete cascade,
  amount numeric(12,2) not null,
  allocated_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

-- Add index for querying allocations
CREATE INDEX IF NOT EXISTS idx_cc_allocations_transaction
  ON public.credit_card_allocations(transaction_id);

CREATE INDEX IF NOT EXISTS idx_cc_allocations_user
  ON public.credit_card_allocations(user_id);

CREATE INDEX IF NOT EXISTS idx_cc_allocations_holding_account
  ON public.credit_card_allocations(holding_account_id);

-- Add comment
COMMENT ON TABLE public.credit_card_allocations IS
  'Audit trail for credit card holding account allocations. Tracks when money is moved from envelopes to the holding account for CC payments.';

-- Enable RLS on credit_card_allocations
ALTER TABLE public.credit_card_allocations ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for credit_card_allocations
CREATE POLICY "Users can view their own CC allocations"
  ON public.credit_card_allocations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own CC allocations"
  ON public.credit_card_allocations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create a function to automatically allocate credit card transactions
CREATE OR REPLACE FUNCTION public.allocate_credit_card_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_holding_account_id uuid;
  v_envelope_amount numeric(12,2);
BEGIN
  -- Only process if transaction is assigned to a credit card account
  IF NEW.account_id IS NOT NULL THEN
    -- Check if the account is a credit card (type = 'debt')
    IF EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = NEW.account_id
      AND type = 'debt'
      AND user_id = NEW.user_id
    ) THEN
      -- Find the credit card holding account for this user
      SELECT id INTO v_holding_account_id
      FROM public.accounts
      WHERE user_id = NEW.user_id
      AND is_credit_card_holding = true
      LIMIT 1;

      -- If holding account exists and transaction has an envelope assigned
      IF v_holding_account_id IS NOT NULL AND NEW.envelope_id IS NOT NULL THEN
        -- Record the allocation
        INSERT INTO public.credit_card_allocations (
          user_id,
          transaction_id,
          envelope_id,
          holding_account_id,
          credit_card_account_id,
          amount,
          notes
        ) VALUES (
          NEW.user_id,
          NEW.id,
          NEW.envelope_id,
          v_holding_account_id,
          NEW.account_id,
          ABS(NEW.amount),
          'Automatic allocation from credit card transaction'
        );

        -- Update holding account balance (increase)
        UPDATE public.accounts
        SET current_balance = current_balance + ABS(NEW.amount),
            updated_at = now()
        WHERE id = v_holding_account_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic allocation (disabled by default - enable via API when ready)
-- Uncomment to enable automatic allocation:
-- CREATE TRIGGER trigger_allocate_credit_card_transaction
--   AFTER INSERT ON public.transactions
--   FOR EACH ROW
--   WHEN (NEW.status = 'approved')
--   EXECUTE FUNCTION public.allocate_credit_card_transaction();

COMMENT ON FUNCTION public.allocate_credit_card_transaction IS
  'Automatically allocates credit card transactions to the holding account when a transaction is created or approved. Trigger is disabled by default and should be enabled via application logic.';
