/**
 * Dashboard Widget Configuration System
 * Defines all available dashboard widgets with metadata, visibility rules, and layout preferences
 */

import type { PersonaType } from "@/lib/onboarding/personas";

export type WidgetCategory =
  | "onboarding"
  | "actions"
  | "stats"
  | "envelopes"
  | "goals"
  | "transactions"
  | "banking"
  | "overview"
  | "demo";

export type WidgetSize = "small" | "medium" | "large" | "full";

export interface WidgetVisibilityCondition {
  envelopeCount?: { min?: number; max?: number };
  transactionCount?: { min?: number; max?: number };
  goalCount?: { min?: number; max?: number };
  hasRecurringIncome?: boolean;
  hasBankConnected?: boolean;
  demoMode?: boolean;
  onboardingCompleted?: boolean;
  showDemoCta?: boolean;
}

export interface DashboardWidgetConfig {
  id: string;
  title: string;
  description: string;
  category: WidgetCategory;
  component: string; // Component import path
  size: WidgetSize; // Default size (maps to grid columns)
  priority: number; // Lower = higher priority in default layout
  visibilityCondition?: WidgetVisibilityCondition;
  personaRelevance: {
    beginner: number; // 1-10, how relevant for beginners
    optimiser: number;
    wealth_builder: number;
  };
  dismissible: boolean; // Can user hide this widget?
  collapsible: boolean; // Can user collapse this widget?
}

/**
 * All available dashboard widgets
 * Priority determines default order (lower = higher priority)
 */
export const DASHBOARD_WIDGETS: DashboardWidgetConfig[] = [
  // === ONBOARDING & NEXT STEPS ===
  {
    id: "next-steps",
    title: "Your Next Steps",
    description: "Personalized guidance to keep building momentum",
    category: "onboarding",
    component: "components/dashboard/next-steps-widget",
    size: "full",
    priority: 1,
    visibilityCondition: {
      onboardingCompleted: true,
    },
    personaRelevance: {
      beginner: 10,
      optimiser: 7,
      wealth_builder: 5,
    },
    dismissible: true,
    collapsible: true,
  },

  // === DEMO MODE ===
  {
    id: "demo-conversion",
    title: "Demo Mode",
    description: "Convert to real data when ready",
    category: "demo",
    component: "components/demo/demo-conversion-wrapper",
    size: "full",
    priority: 0, // Always first if visible
    visibilityCondition: {
      demoMode: false, // Show wrapper in non-demo mode (it handles its own logic)
    },
    personaRelevance: {
      beginner: 10,
      optimiser: 10,
      wealth_builder: 10,
    },
    dismissible: false,
    collapsible: false,
  },
  {
    id: "demo-seed-cta",
    title: "Quick Start with Demo Data",
    description: "Get started instantly with sample data",
    category: "demo",
    component: "components/demo/demo-seed-cta",
    size: "full",
    priority: 1,
    visibilityCondition: {
      showDemoCta: true,
      demoMode: false,
    },
    personaRelevance: {
      beginner: 10,
      optimiser: 8,
      wealth_builder: 6,
    },
    dismissible: true,
    collapsible: false,
  },

  // === QUICK ACTIONS ===
  {
    id: "quick-actions",
    title: "Quick Actions",
    description: "Fast access to common tasks",
    category: "actions",
    component: "components/quick-actions/quick-actions-panel",
    size: "full",
    priority: 2,
    personaRelevance: {
      beginner: 9,
      optimiser: 10,
      wealth_builder: 8,
    },
    dismissible: true,
    collapsible: true,
  },

  // === STATS & OVERVIEW ===
  {
    id: "stats-cards",
    title: "Budget Stats",
    description: "Key metrics at a glance",
    category: "stats",
    component: "components/stats-cards",
    size: "full",
    priority: 3,
    personaRelevance: {
      beginner: 8,
      optimiser: 9,
      wealth_builder: 9,
    },
    dismissible: false, // Core widget
    collapsible: true,
  },

  // === ENVELOPES ===
  {
    id: "monitored-envelopes",
    title: "Watched Envelopes",
    description: "Envelopes you&apos;re tracking closely",
    category: "envelopes",
    component: "components/envelopes/monitored-envelopes-widget",
    size: "full",
    priority: 4,
    personaRelevance: {
      beginner: 8,
      optimiser: 10,
      wealth_builder: 7,
    },
    dismissible: true,
    collapsible: true,
  },

  // === GOALS ===
  {
    id: "goals",
    title: "Goals",
    description: "Track progress toward your financial goals",
    category: "goals",
    component: "components/goals/goals-widget",
    size: "full",
    priority: 5,
    visibilityCondition: {
      envelopeCount: { min: 3 }, // Unlocked after 3 envelopes
    },
    personaRelevance: {
      beginner: 9,
      optimiser: 8,
      wealth_builder: 10,
    },
    dismissible: true,
    collapsible: true,
  },

  // === TRANSACTIONS ===
  {
    id: "pending-approval",
    title: "Pending Approvals",
    description: "Transactions waiting for your review",
    category: "transactions",
    component: "components/transactions/pending-approval-widget",
    size: "full",
    priority: 6,
    personaRelevance: {
      beginner: 6,
      optimiser: 9,
      wealth_builder: 7,
    },
    dismissible: true,
    collapsible: true,
  },

  // === BUDGET OVERVIEW SUB-WIDGETS ===
  // These are rendered within BudgetOverview component's DashboardWidgetGrid
  {
    id: "income-expense-overview",
    title: "Income vs Expenses",
    description: "Monthly income and expense trends",
    category: "overview",
    component: "components/layout/overview/income-expense-overview",
    size: "medium",
    priority: 10,
    personaRelevance: {
      beginner: 7,
      optimiser: 9,
      wealth_builder: 10,
    },
    dismissible: true,
    collapsible: false,
  },
  {
    id: "overdue-envelopes",
    title: "Overdue Envelopes",
    description: "Envelopes needing attention",
    category: "overview",
    component: "components/layout/overview/overdue-envelopes-card",
    size: "small",
    priority: 11,
    personaRelevance: {
      beginner: 9,
      optimiser: 10,
      wealth_builder: 6,
    },
    dismissible: true,
    collapsible: false,
  },
  {
    id: "zero-budget-status",
    title: "Zero Budget Status",
    description: "How close are you to zero?",
    category: "overview",
    component: "components/layout/overview/zero-budget-status-widget",
    size: "small",
    priority: 12,
    personaRelevance: {
      beginner: 8,
      optimiser: 10,
      wealth_builder: 7,
    },
    dismissible: true,
    collapsible: false,
  },
  {
    id: "bank-connection-status",
    title: "Bank Connection",
    description: "Bank sync status and actions",
    category: "banking",
    component: "components/layout/overview/bank-connection-status-widget",
    size: "small",
    priority: 13,
    personaRelevance: {
      beginner: 7,
      optimiser: 9,
      wealth_builder: 8,
    },
    dismissible: true,
    collapsible: false,
  },
  {
    id: "credit-card-holding",
    title: "Credit Card Holding",
    description: "Track credit card balances",
    category: "overview",
    component: "components/layout/overview/credit-card-holding-widget",
    size: "small",
    priority: 14,
    personaRelevance: {
      beginner: 6,
      optimiser: 8,
      wealth_builder: 9,
    },
    dismissible: true,
    collapsible: false,
  },
  {
    id: "akahu-connect",
    title: "Connect Your Bank",
    description: "Link your accounts with Akahu",
    category: "banking",
    component: "components/layout/overview/akahu-connect",
    size: "large",
    priority: 15,
    visibilityCondition: {
      hasBankConnected: false,
    },
    personaRelevance: {
      beginner: 8,
      optimiser: 9,
      wealth_builder: 7,
    },
    dismissible: true,
    collapsible: false,
  },
  {
    id: "budget-summary-cards",
    title: "Budget Summary",
    description: "Overview of your budget health",
    category: "overview",
    component: "components/layout/overview/budget-summary-cards",
    size: "large",
    priority: 16,
    personaRelevance: {
      beginner: 9,
      optimiser: 8,
      wealth_builder: 8,
    },
    dismissible: true,
    collapsible: false,
  },
  {
    id: "recent-transactions",
    title: "Recent Transactions",
    description: "Your latest activity",
    category: "transactions",
    component: "components/layout/overview/recent-transactions",
    size: "medium",
    priority: 17,
    personaRelevance: {
      beginner: 8,
      optimiser: 9,
      wealth_builder: 7,
    },
    dismissible: true,
    collapsible: false,
  },
  {
    id: "celebration-timeline",
    title: "Wins & Achievements",
    description: "Celebrate your progress",
    category: "overview",
    component: "components/layout/overview/celebration-timeline",
    size: "small",
    priority: 18,
    personaRelevance: {
      beginner: 10,
      optimiser: 7,
      wealth_builder: 6,
    },
    dismissible: true,
    collapsible: false,
  },
];

/**
 * Helper to get widgets by category
 */
export function getWidgetsByCategory(category: WidgetCategory): DashboardWidgetConfig[] {
  return DASHBOARD_WIDGETS.filter((w) => w.category === category);
}

/**
 * Helper to get widget by ID
 */
export function getWidgetById(id: string): DashboardWidgetConfig | undefined {
  return DASHBOARD_WIDGETS.find((w) => w.id === id);
}

/**
 * Helper to check if widget should be visible based on conditions
 */
export function isWidgetVisible(
  widget: DashboardWidgetConfig,
  context: {
    envelopeCount: number;
    transactionCount: number;
    goalCount: number;
    hasRecurringIncome: boolean;
    hasBankConnected: boolean;
    demoMode: boolean;
    onboardingCompleted: boolean;
    showDemoCta: boolean;
  }
): boolean {
  const condition = widget.visibilityCondition;
  if (!condition) return true;

  // Check each condition
  if (condition.envelopeCount) {
    if (condition.envelopeCount.min !== undefined && context.envelopeCount < condition.envelopeCount.min) {
      return false;
    }
    if (condition.envelopeCount.max !== undefined && context.envelopeCount > condition.envelopeCount.max) {
      return false;
    }
  }

  if (condition.transactionCount) {
    if (condition.transactionCount.min !== undefined && context.transactionCount < condition.transactionCount.min) {
      return false;
    }
    if (condition.transactionCount.max !== undefined && context.transactionCount > condition.transactionCount.max) {
      return false;
    }
  }

  if (condition.goalCount) {
    if (condition.goalCount.min !== undefined && context.goalCount < condition.goalCount.min) {
      return false;
    }
    if (condition.goalCount.max !== undefined && context.goalCount > condition.goalCount.max) {
      return false;
    }
  }

  if (condition.hasRecurringIncome !== undefined && context.hasRecurringIncome !== condition.hasRecurringIncome) {
    return false;
  }

  if (condition.hasBankConnected !== undefined && context.hasBankConnected !== condition.hasBankConnected) {
    return false;
  }

  if (condition.demoMode !== undefined && context.demoMode !== condition.demoMode) {
    return false;
  }

  if (condition.onboardingCompleted !== undefined && context.onboardingCompleted !== condition.onboardingCompleted) {
    return false;
  }

  if (condition.showDemoCta !== undefined && context.showDemoCta !== condition.showDemoCta) {
    return false;
  }

  return true;
}

/**
 * Map widget size to grid column span
 */
export function getGridColumns(size: WidgetSize): number {
  switch (size) {
    case "small":
      return 1;
    case "medium":
      return 2;
    case "large":
      return 3;
    case "full":
      return 3; // Full width in 3-column grid
    default:
      return 1;
  }
}
