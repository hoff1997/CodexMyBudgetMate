"use client";

import { QuickActionsSheet } from "@/components/quick-actions/quick-actions-sheet";

export function QuickActionsPanel() {
  return (
    <div className="rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-primary">Need to add something fast?</p>
          <h2 className="text-base font-semibold text-secondary">Quick actions</h2>
        </div>
        <div className="w-full sm:w-auto">
          <QuickActionsSheet />
        </div>
      </div>
    </div>
  );
}
