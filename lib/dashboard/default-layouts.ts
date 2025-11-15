/**
 * Default Dashboard Layouts by Persona
 * Provides optimized widget ordering and visibility for each user persona
 */

import type { PersonaType } from "@/lib/onboarding/personas";

export interface PersonaDashboardLayout {
  persona: PersonaType;
  name: string;
  description: string;
  widgetOrder: string[]; // Ordered list of widget IDs
  hiddenByDefault: string[]; // Widgets hidden by default for this persona
}

/**
 * Beginner Persona Layout
 * Focus: Guidance, simple stats, next steps, building habits
 * Hide: Advanced features, complex analytics
 */
export const BEGINNER_LAYOUT: PersonaDashboardLayout = {
  persona: "beginner",
  name: "Getting Started",
  description: "Simplified view focused on learning and building good habits",
  widgetOrder: [
    // Always show critical onboarding/demo
    "demo-conversion",
    "demo-seed-cta",

    // High priority: Next steps and guidance
    "next-steps",

    // Quick access to actions
    "quick-actions",

    // Simple stats
    "stats-cards",

    // Core features for beginners
    "monitored-envelopes",
    "goals",

    // Overview widgets (simplified selection)
    "budget-summary-cards", // Easy to understand overview
    "recent-transactions", // See what's happening
    "celebration-timeline", // Positive reinforcement!
    "overdue-envelopes", // What needs attention
    "zero-budget-status", // Simple goal
    "akahu-connect", // Easy bank connection

    // Lower priority
    "pending-approval",
    "income-expense-overview",
    "bank-connection-status",
    "credit-card-holding",
  ],
  hiddenByDefault: [
    // Hide these until user is more advanced
    "pending-approval", // Too complex initially
    "credit-card-holding", // Advanced feature
  ],
};

/**
 * Optimiser Persona Layout
 * Focus: Efficiency, reconciliation, zero-budget, automation
 * Hide: Nothing - they want to see everything
 */
export const OPTIMISER_LAYOUT: PersonaDashboardLayout = {
  persona: "optimiser",
  name: "Efficiency Mode",
  description: "Full view optimized for quick reviews and staying on top of everything",
  widgetOrder: [
    "demo-conversion",
    "demo-seed-cta",

    // Quick actions first - they want to act fast
    "quick-actions",

    // Stats and status
    "stats-cards",

    // Key metrics for staying on track
    "zero-budget-status",
    "monitored-envelopes",
    "pending-approval", // Important for reconciliation workflow

    // Goals and planning
    "goals",
    "next-steps",

    // Detailed overview
    "income-expense-overview",
    "overdue-envelopes",
    "bank-connection-status",
    "recent-transactions",
    "budget-summary-cards",
    "akahu-connect",
    "credit-card-holding",
    "celebration-timeline",
  ],
  hiddenByDefault: [
    // Optimisers want to see everything
  ],
};

/**
 * Wealth Builder Persona Layout
 * Focus: Net worth, goals, investments, long-term planning, advanced features
 * Hide: Basic tutorials, demo prompts
 */
export const WEALTH_BUILDER_LAYOUT: PersonaDashboardLayout = {
  persona: "wealth_builder",
  name: "Wealth Building",
  description: "Advanced view focused on growth, goals, and strategic planning",
  widgetOrder: [
    "demo-conversion",

    // Stats and overview first
    "stats-cards",

    // Goals are primary focus
    "goals",

    // Financial overview
    "income-expense-overview",
    "budget-summary-cards",

    // Banking and credit
    "bank-connection-status",
    "credit-card-holding",
    "akahu-connect",

    // Quick actions
    "quick-actions",

    // Monitoring and optimization
    "monitored-envelopes",
    "zero-budget-status",
    "recent-transactions",
    "overdue-envelopes",
    "pending-approval",

    // Nice to have
    "celebration-timeline",
    "next-steps",
    "demo-seed-cta",
  ],
  hiddenByDefault: [
    // Hide beginner-focused items
    "demo-seed-cta", // Don't need demo data
    "next-steps", // They know what to do
  ],
};

/**
 * Default layout for users without a persona (fallback)
 */
export const DEFAULT_LAYOUT: PersonaDashboardLayout = {
  persona: "beginner", // Default to beginner if no persona
  name: "Standard View",
  description: "Balanced view suitable for all users",
  widgetOrder: [
    "demo-conversion",
    "demo-seed-cta",
    "next-steps",
    "quick-actions",
    "stats-cards",
    "monitored-envelopes",
    "goals",
    "pending-approval",
    "income-expense-overview",
    "overdue-envelopes",
    "zero-budget-status",
    "bank-connection-status",
    "credit-card-holding",
    "akahu-connect",
    "budget-summary-cards",
    "recent-transactions",
    "celebration-timeline",
  ],
  hiddenByDefault: [],
};

/**
 * Get layout for a specific persona
 */
export function getLayoutForPersona(persona?: PersonaType | null): PersonaDashboardLayout {
  switch (persona) {
    case "beginner":
      return BEGINNER_LAYOUT;
    case "optimiser":
      return OPTIMISER_LAYOUT;
    case "wealth_builder":
      return WEALTH_BUILDER_LAYOUT;
    default:
      return DEFAULT_LAYOUT;
  }
}

/**
 * Get all available layouts
 */
export function getAllLayouts(): PersonaDashboardLayout[] {
  return [BEGINNER_LAYOUT, OPTIMISER_LAYOUT, WEALTH_BUILDER_LAYOUT];
}
