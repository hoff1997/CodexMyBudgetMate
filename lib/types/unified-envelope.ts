/**
 * Unified Envelope Types
 * Shared types for envelope configuration across onboarding and maintenance pages
 */

export type EnvelopeSubtype = 'bill' | 'spending' | 'savings' | 'goal' | 'tracking';
export type FrequencyType = 'none' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annual' | 'annually';
export type PriorityType = 'essential' | 'important' | 'discretionary';

/**
 * Income source for multi-income allocation
 */
export interface IncomeSource {
  id: string;
  name: string;
  amount: number;           // Normalized to user's pay cycle
  rawAmount?: number;       // Original amount per source's frequency
  frequency: 'weekly' | 'fortnightly' | 'twice_monthly' | 'monthly';
  nextPayDate?: string;     // ISO date string - when next payment expected
  startDate?: string;       // ISO date string - when income stream started
  endDate?: string;         // ISO date string - when income stream ends (null = ongoing)
  replacedById?: string;    // UUID - links to successor income source
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

  // Envelope flags
  is_goal?: boolean; // Goal envelope (doesn't need budget)
  is_spending?: boolean; // Spending envelope (doesn't need budget)
  is_tracking_only?: boolean; // Tracking-only envelope (e.g., reimbursements - doesn't need budget)

  // Validation
  validationWarnings?: ValidationWarning[];

  // Metadata
  categoryId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Category option for envelope categorization
 */
export interface CategoryOption {
  id: string;
  name: string;
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
  payCycle?: 'weekly' | 'fortnightly' | 'twice_monthly' | 'monthly';

  // Bank balance for opening balance validation (onboarding only)
  bankBalance?: number;

  // Categories for envelope organization
  categories?: CategoryOption[];

  // Feature flags
  showIncomeColumns?: boolean; // Default true
  showOpeningBalance?: boolean; // True for onboarding, false for maintenance
  showCurrentBalance?: boolean; // False for onboarding, true for maintenance
  showNotes?: boolean; // Default true
  showCategories?: boolean; // Default true in maintenance mode
  enableDragAndDrop?: boolean; // True for maintenance mode
  isDragDisabled?: boolean; // Disable drag when filtering or sorting
  hideHeader?: boolean; // Hide table header (for shared sticky header)

  // Gap analysis data (maintenance mode only)
  gapAnalysisData?: GapAnalysisData[];

  // Callbacks
  onEnvelopeUpdate: (id: string, updates: Partial<UnifiedEnvelopeData>) => void | Promise<void>;
  onEnvelopeDelete: (id: string) => void | Promise<void>;
  onAllocationUpdate?: (envelopeId: string, incomeSourceId: string, amount: number) => void | Promise<void>;
  onReorder?: (fromIndex: number, toIndex: number) => void | Promise<void>;
}

/**
 * Gap analysis data for an envelope
 */
export interface GapAnalysisData {
  envelope_id: string;
  envelope_name: string;
  ideal_per_pay: number;
  expected_balance: number;
  actual_balance: number;
  gap: number;
  payCyclesElapsed: number;
  status: "on_track" | "slight_deviation" | "needs_attention";
  is_locked: boolean;
}

/**
 * Opening balance calculator input
 */
export interface OpeningBalanceCalculatorInput {
  targetAmount: number;
  frequency: FrequencyType;
  dueDate?: number | Date;
  totalPerCycleAllocation: number;
  payCycle: 'weekly' | 'fortnightly' | 'twice_monthly' | 'monthly';
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
