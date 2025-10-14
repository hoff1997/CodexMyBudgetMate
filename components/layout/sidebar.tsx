'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";
import { QuickActionsSheet } from "@/components/quick-actions/quick-actions-sheet";

const navItems = [
  { label: "Getting Started", href: "/getting-started", icon: "🏠" },
  { label: "Reconcile", href: "/reconcile", icon: "⚖️" },
  { label: "Dashboard", href: "/dashboard", icon: "⏳" },
  { label: "Envelope Summary", href: "/envelope-summary", icon: "🧾" },
  { label: "Envelope Planning", href: "/envelope-planning", icon: "📋" },
  { label: "Balance Report", href: "/balance-report", icon: "📊" },
  { label: "Transactions", href: "/transactions", icon: "💵" },
  { label: "Net Worth", href: "/net-worth", icon: "📈" },
  { label: "Debt Management", href: "/debt-management", icon: "💳" },
  { label: "Accounts", href: "/accounts", icon: "🏦" },
  { label: "Recurring Income", href: "/recurring-income", icon: "🔄" },
  { label: "Reports", href: "/reports", icon: "📑" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
  { label: "Coming Soon", href: "/coming-soon", icon: "⏳" },
];

export default function Sidebar({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-white border-r flex flex-col justify-between">
        <div>
          <div className="px-6 py-4 font-bold text-lg">My Budget Mate</div>
          <div className="px-4">
            <QuickActionsSheet />
          </div>
          <nav className="px-2 py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-muted/20 text-muted-foreground"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="px-6 py-4">
          <Button asChild variant="outline" className="w-full">
            <Link href="/api/auth/sign-out">Sign out</Link>
          </Button>
        </div>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
