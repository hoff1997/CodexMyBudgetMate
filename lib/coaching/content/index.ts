// Remy Coaching Content - Index

export { dashboardCoaching } from "./dashboard";
export { allocationCoaching } from "./allocation";
export { envelopeSummaryCoaching } from "./envelope-summary";
export { transactionsCoaching } from "./transactions";
export { reconcileCoaching } from "./reconcile";
export { financialPositionCoaching } from "./financial-position";
export { settingsCoaching } from "./settings";

// Kids module coaching
export {
  kidsParentDashboardCoaching,
  kidDashboardCoaching,
  kidsParentDashboardHelp,
  choresSetupHelp,
  pocketMoneySetupHelp,
  invoiceReviewHelp,
  hubPermissionsHelp,
  kidDashboardHelp,
  kidInvoiceHelp,
  kidChoresHelp,
  kidTransferRequestHelp,
} from "./kids";
export type { KidsHelpContent } from "./kids";

import type { PageCoaching } from "../types";
import { dashboardCoaching } from "./dashboard";
import { allocationCoaching } from "./allocation";
import { envelopeSummaryCoaching } from "./envelope-summary";
import { transactionsCoaching } from "./transactions";
import { reconcileCoaching } from "./reconcile";
import { financialPositionCoaching } from "./financial-position";
import { settingsCoaching } from "./settings";
import { kidsParentDashboardCoaching, kidDashboardCoaching } from "./kids";

export const allCoaching: Record<string, PageCoaching> = {
  dashboard: dashboardCoaching,
  allocation: allocationCoaching,
  "envelope-summary": envelopeSummaryCoaching,
  transactions: transactionsCoaching,
  reconcile: reconcileCoaching,
  "financial-position": financialPositionCoaching,
  settings: settingsCoaching,
  "kids-parent-dashboard": kidsParentDashboardCoaching,
  "kid-dashboard": kidDashboardCoaching,
};
