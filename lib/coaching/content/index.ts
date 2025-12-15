// Remy Coaching Content - Index

export { dashboardCoaching } from "./dashboard";
export { allocationCoaching } from "./allocation";
export { envelopeSummaryCoaching } from "./envelope-summary";
export { transactionsCoaching } from "./transactions";
export { reconcileCoaching } from "./reconcile";
export { netWorthCoaching } from "./net-worth";
export { settingsCoaching } from "./settings";

import type { PageCoaching } from "../types";
import { dashboardCoaching } from "./dashboard";
import { allocationCoaching } from "./allocation";
import { envelopeSummaryCoaching } from "./envelope-summary";
import { transactionsCoaching } from "./transactions";
import { reconcileCoaching } from "./reconcile";
import { netWorthCoaching } from "./net-worth";
import { settingsCoaching } from "./settings";

export const allCoaching: Record<string, PageCoaching> = {
  dashboard: dashboardCoaching,
  allocation: allocationCoaching,
  "envelope-summary": envelopeSummaryCoaching,
  transactions: transactionsCoaching,
  reconcile: reconcileCoaching,
  "net-worth": netWorthCoaching,
  settings: settingsCoaching,
};
