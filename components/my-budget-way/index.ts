// The My Budget Way Widget
// A comprehensive widget for tracking financial goals and progress

export { MyBudgetWayWidget } from "./my-budget-way-widget";
export { StatusMode } from "./status-mode";
export { OnboardingMode } from "./onboarding-mode";
export { AllocationMode } from "./allocation-mode";

// Shared components
export { GoalRow, CompactStatusRow, DividerRow } from "./shared/goal-row";
export { AllocationStep, AllocationStepList } from "./shared/allocation-step";

// Types
export type {
  WidgetMode,
  CreditCardDebtData,
  SuggestedEnvelope,
  MilestoneProgress,
  MyBudgetWayWidgetProps,
  GoalStep,
  GoalContext,
} from "./types";

export type { GoalRowProps, ProgressBarColor } from "./shared/goal-row";
export type { AllocationStepProps, StepStatus } from "./shared/allocation-step";
