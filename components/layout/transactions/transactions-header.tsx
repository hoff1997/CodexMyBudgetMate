"use client";

import HelpTooltip from "@/components/ui/help-tooltip";

export function TransactionsHeader() {
  return (
    <header className="space-y-2">
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-semibold text-secondary">Transactions</h1>
        <HelpTooltip
          title="Transactions"
          content={[
            "View, search, and manage all your financial transactions in one place. Filter by date, amount, merchant, envelope, account, or labels to find specific transactions quickly.",
            "Approve, edit, or split transactions. Assign transactions to envelopes and add labels for better categorization. Swipe left on mobile for quick actions."
          ]}
          tips={[
            "Use date presets (this month, last 3 months, etc.) for quick filtering",
            "Search by merchant name, bank memo, or label text",
            "Click any transaction to view full details and edit",
            "Split transactions to assign portions to different envelopes"
          ]}
        />
      </div>
      <p className="text-base text-muted-foreground">
        Review the 100 most recent transactions across every connected account.
      </p>
    </header>
  );
}
