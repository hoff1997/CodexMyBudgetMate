/**
 * Types for Income Allocation System
 */

export interface IncomeSource {
  id: string;
  user_id: string;
  name: string;
  pay_cycle: 'weekly' | 'fortnightly' | 'monthly';
  typical_amount: number | null;
  detection_rule_id: string | null;
  auto_allocate: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EnvelopeIncomeAllocation {
  id: string;
  user_id: string;
  envelope_id: string;
  income_source_id: string;
  allocation_amount: number;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface EnvelopeWithAllocations {
  id: string;
  name: string;
  envelope_type: 'income' | 'expense' | 'savings';
  priority: 'essential' | 'important' | 'discretionary';
  current_balance: number;
  target_amount: number;
  allocations: EnvelopeIncomeAllocation[];
}

export interface IncomeSourceWithAllocations extends IncomeSource {
  allocations: Array<EnvelopeIncomeAllocation & {
    envelope_name: string;
    envelope_priority: 'essential' | 'important' | 'discretionary';
  }>;
  total_allocated: number;
  surplus: number;
}

export interface SetupWizardData {
  incomeName: string;
  payCycle: 'weekly' | 'fortnightly' | 'monthly';
  typicalAmount: number;
  detectionPattern: string;
  allocations: Array<{
    envelope_id: string;
    envelope_name: string;
    amount: number;
    priority: 'essential' | 'important' | 'discretionary';
  }>;
}

export interface AllocationPreview {
  income_source: IncomeSource;
  actual_amount: number;
  expected_amount: number;
  variance: number;
  allocations: Array<{
    envelope_id: string;
    envelope_name: string;
    amount: number;
    is_overspent: boolean;
    overspent_amount: number | null;
  }>;
  surplus: number;
}
