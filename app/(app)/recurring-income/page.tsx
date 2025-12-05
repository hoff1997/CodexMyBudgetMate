import { redirect } from "next/navigation";

/**
 * Recurring Income Page - DEPRECATED
 *
 * This page is deprecated in favor of Budget Manager's income sources.
 * Users are automatically redirected to Budget Manager.
 *
 * The recurring_income table is soft-deprecated and will be removed in a future migration.
 * See: supabase/migrations/0027_deprecate_recurring_income.sql
 *
 * Income management is now handled by:
 * - income_sources table (replaces recurring_income)
 * - envelope_income_allocations table (replaces allocations JSONB)
 * - income_reconciliation_events table (replaces recurring_income_events)
 */
export default async function RecurringIncomePage() {
  // Redirect to budget-manager which now handles all income management
  redirect("/budget-manager");
}
