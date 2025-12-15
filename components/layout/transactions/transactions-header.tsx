"use client";

import { RemyHelpPanel } from "@/components/coaching/RemyHelpPanel";

export function TransactionsHeader() {
  return (
    <header className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#3D3D3D]">Transactions</h1>
        <RemyHelpPanel pageId="transactions" />
      </div>
      <p className="text-[#6B6B6B]">
        Browse and manage your approved transactions. New transactions appear in the Reconciliation Centre first.
      </p>
    </header>
  );
}
