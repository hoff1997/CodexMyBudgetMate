/**
 * Onboarding Save Configuration
 *
 * Controls whether onboarding uses the new direct-to-main-tables system
 * or the legacy onboarding_drafts table.
 *
 * NEW SYSTEM (useDirectToMain = true):
 * - Writes directly to main tables (envelopes, recurring_income, accounts, etc.)
 * - Uses is_onboarding_draft=true flag to mark draft records
 * - Step-specific API endpoints for granular saves
 * - Zero data loss risk - data is in real tables from moment entered
 *
 * LEGACY SYSTEM (useDirectToMain = false):
 * - Writes to onboarding_drafts table as JSONB blobs
 * - Migrates to main tables on completion via /api/onboarding/unified
 * - Data can be lost if migration fails
 */

// Feature flag for direct-to-main system
// Data is saved directly to main tables - no draft state needed
// Users can edit their data anytime throughout onboarding and after
export const USE_DIRECT_TO_MAIN = true;

/**
 * Step-specific API endpoints for direct-to-main system
 */
export const STEP_ENDPOINTS = {
  progress: "/api/onboarding/steps/progress",
  profile: "/api/onboarding/steps/profile",
  income: "/api/onboarding/steps/income",
  accounts: "/api/onboarding/steps/accounts",
  envelopes: "/api/onboarding/steps/envelopes",
  allocations: "/api/onboarding/steps/allocations",
  openingBalances: "/api/onboarding/steps/opening-balances",
  complete: "/api/onboarding/complete",
} as const;

/**
 * Map onboarding steps to which endpoint should be called
 */
export const STEP_TO_ENDPOINT_MAP: Record<number, keyof typeof STEP_ENDPOINTS | null> = {
  1: null, // Welcome - no save needed
  2: "profile", // Profile step
  3: "income", // Income step
  4: "accounts", // Bank accounts step
  5: null, // Credit cards - handled separately
  6: "progress", // Budgeting approach - just progress
  7: "progress", // Envelope education - just progress
  8: "envelopes", // Envelope creation
  9: "allocations", // Envelope allocation (also saves envelopes)
  10: "progress", // Budget review - just progress
  11: "openingBalances", // Opening balance step
  12: "complete", // Completion step
};

/**
 * Determines which endpoint(s) to call based on what data changed
 */
export function getEndpointsForChanges(changedFields: string[]): (keyof typeof STEP_ENDPOINTS)[] {
  const endpoints: Set<keyof typeof STEP_ENDPOINTS> = new Set();

  for (const field of changedFields) {
    switch (field) {
      case "currentStep":
      case "highestStepReached":
        endpoints.add("progress");
        break;
      case "fullName":
        endpoints.add("profile");
        break;
      case "incomeSources":
        endpoints.add("income");
        break;
      case "bankAccounts":
        endpoints.add("accounts");
        break;
      case "envelopes":
      case "customCategories":
      case "categoryOrder":
        endpoints.add("envelopes");
        break;
      case "envelopeAllocations":
        endpoints.add("allocations");
        break;
      case "openingBalances":
        endpoints.add("openingBalances");
        break;
    }
  }

  return Array.from(endpoints);
}
