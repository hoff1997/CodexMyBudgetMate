/**
 * Unified Envelope Types
 * Shared types for envelope configuration across onboarding and maintenance pages
 */

export type EnvelopeSubtype = 'bill' | 'spending' | 'savings' | 'goal';
export type FrequencyType = 'none' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annual' | 'annually';
export type PriorityType = 'essential' | 'important' | 'discretionary';

/**
 * Income source for multi-income allocation
 */
export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'fortnightly' | 'monthly';
  isActive?: boolean;
}

/**
 * Income allocation for a specific envelope
 */
export interface IncomeAllocation {
  incomeSourceId: string;
  amount: number;
}

/**
 * Validation warning for an envelope
 */
export interface ValidationWarning {
  type: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

/**
 * Unified envelope data structure
 * Used in both onboarding (Configure Envelopes) and maintenance (Zero Budget Manager)
 */
export interface UnifiedEnvelopeData {
  id: string;

  // Core fields
  icon: string;
  name: string;
  subtype: EnvelopeSubtype;
  targetAmount: number;

  // Bill-specific fields
  frequency?: FrequencyType;
  dueDate?: number | Date; // Day of month (1-31) or full date for savings goals

  // Priority (for bills and spending)
  priority?: PriorityType;

  // Notes
  notes?: string;

  // Multi-income allocations
  incomeAllocations: { [incomeSourceId: string]: number };

  // Calculated fields
  payCycleAmount?: number; // Total per pay cycle
  annualAmount?: number; // Total per year
  openingBalanceNeeded?: number; // Auto-calculated for onboarding
  currentAmount?: number; // Current balance (maintenance mode only)
  openingBalance?: number; // User-set opening balance (onboarding mode)

  // Validation
  validationWarnings?: ValidationWarning[];

  // Metadata
  categoryId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Props for UnifiedEnvelopeTable component
 */
export interface UnifiedEnvelopeTableProps {
  envelopes: UnifiedEnvelopeData[];
  incomeSources: IncomeSource[];

  // Mode determines which columns to show
  mode: 'onboarding' | 'maintenance';

  // Pay cycle for the user (affects calculations)
  payCycle?: 'weekly' | 'fortnightly' | 'monthly';

  // Bank balance for opening balance validation (onboarding only)
  bankBalance?: number;

  // Feature flags
  showIncomeColumns?: boolean; // Default true
  showOpeningBalance?: boolean; // True for onboarding, false for maintenance
  showCurrentBalance?: boolean; // False for onboarding, true for maintenance
  showNotes?: boolean; // Default true
  enableDragAndDrop?: boolean; // True for maintenance mode

  // Callbacks
  onEnvelopeUpdate: (id: string, updates: Partial<UnifiedEnvelopeData>) => void | Promise<void>;
  onEnvelopeDelete: (id: string) => void | Promise<void>;
  onAllocationUpdate?: (envelopeId: string, incomeSourceId: string, amount: number) => void | Promise<void>;
  onReorder?: (fromIndex: number, toIndex: number) => void | Promise<void>;
}

/**
 * Opening balance calculator input
 */
export interface OpeningBalanceCalculatorInput {
  targetAmount: number;
  frequency: FrequencyType;
  dueDate?: number | Date;
  totalPerCycleAllocation: number;
  payCycle: 'weekly' | 'fortnightly' | 'monthly';
}

/**
 * Opening balance calculator result
 */
export interface OpeningBalanceCalculatorResult {
  openingBalanceNeeded: number;
  cyclesUntilDue: number;
  projectedAccumulation: number;
  isFullyFunded: boolean;
  warning?: string;
}
