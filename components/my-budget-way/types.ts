// Types for The My Budget Way widget

export type WidgetMode = "status" | "onboarding" | "allocation";

// Credit card debt data
export interface CreditCardDebtData {
  currentDebt: number;
  startingDebt: number;
  phase: string;
  hasDebt: boolean;
  activeDebt?: {
    name: string;
    balance: number;
  } | null;
}

// Suggested envelope (Starter Stash, Safety Net, CC Holding)
// Uses flexible types to be compatible with SummaryEnvelope which extends EnvelopeRow
export interface SuggestedEnvelope {
  id: string;
  name: string;
  icon?: string | null;
  target_amount?: number | string | null;
  current_amount?: number | string | null;
  suggestion_type?: string | null;
  is_suggested?: boolean | null;
  is_dismissed?: boolean | null;
  snoozed_until?: string | null;
  description?: string | null;
}

// Milestone progress data
export interface MilestoneProgress {
  overallProgress: number;
  totalTarget: number;
  totalCurrent: number;
  fundingGap: number;
  fundedCount: number;
  totalCount: number;
  needsFunding: number;
  shouldShowEnvelopeRow: boolean;
  essentialsUnderfunded: boolean;
}

// Props for The My Budget Way widget
export interface MyBudgetWayWidgetProps {
  mode: WidgetMode;

  // Data
  suggestedEnvelopes: SuggestedEnvelope[];
  creditCardDebt?: CreditCardDebtData | null;
  milestoneProgress: MilestoneProgress;
  hiddenCount?: number;

  // Callbacks
  onSnooze?: (envelopeId: string, days: number) => void;
  onRestoreHidden?: () => void;
  onEnvelopeClick?: (envelope: SuggestedEnvelope) => void;

  // Display options
  defaultExpanded?: boolean;
  showHeader?: boolean;
  className?: string;
}

// Goal step configuration for each phase
export interface GoalStep {
  id: string;
  icon: string;
  title: string;
  getDescription: (context: GoalContext) => string;
  getTarget: (context: GoalContext) => number;
  getCurrent: (context: GoalContext) => number;
  isLocked: (context: GoalContext) => boolean;
  progressColor?: "sage" | "blue";
  showSnoozeMenu?: boolean;
  showNotificationIcon?: boolean;
}

export interface GoalContext {
  suggestedEnvelopes: SuggestedEnvelope[];
  creditCardDebt?: CreditCardDebtData | null;
  hasDebt: boolean;
}
