"use client";

/**
 * Quick Actions V2
 *
 * Compact row of icon+label action buttons for common tasks.
 * Follows the style guide with calm colors.
 */

import { Button } from "@/components/ui/button";
import {
  Plus,
  ArrowLeftRight,
  Receipt,
  Inbox,
  CreditCard,
  FileText,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

interface QuickAction {
  id: string;
  label: string;
  icon: typeof Plus;
  href: string;
  colorClass: string;
  bgClass: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "add-transaction",
    label: "Add Transaction",
    icon: Plus,
    href: "/reconcile?action=add",
    colorClass: "text-sage",
    bgClass: "hover:bg-sage-light/30",
  },
  {
    id: "transfer",
    label: "Transfer",
    icon: ArrowLeftRight,
    href: "/envelope-summary?action=transfer",
    colorClass: "text-blue",
    bgClass: "hover:bg-blue-light/30",
  },
  {
    id: "reconcile",
    label: "Reconcile",
    icon: Receipt,
    href: "/reconcile",
    colorClass: "text-gold",
    bgClass: "hover:bg-gold-light/30",
  },
  {
    id: "envelopes",
    label: "Envelopes",
    icon: Inbox,
    href: "/envelope-summary",
    colorClass: "text-text-medium",
    bgClass: "hover:bg-silver-light/50",
  },
  {
    id: "credit-cards",
    label: "Cards",
    icon: CreditCard,
    href: "/accounts",
    colorClass: "text-blue",
    bgClass: "hover:bg-blue-light/30",
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileText,
    href: "/envelope-balances",
    colorClass: "text-text-medium",
    bgClass: "hover:bg-silver-light/50",
  },
];

interface QuickActionsV2Props {
  showSettings?: boolean;
}

export function QuickActionsV2({ showSettings = false }: QuickActionsV2Props) {
  const actions = showSettings
    ? [...QUICK_ACTIONS, {
        id: "settings",
        label: "Settings",
        icon: Settings,
        href: "/settings",
        colorClass: "text-text-light",
        bgClass: "hover:bg-silver-light/50",
      }]
    : QUICK_ACTIONS;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <Button
            key={action.id}
            asChild
            variant="ghost"
            size="sm"
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 h-auto",
              "border border-border bg-white/50",
              "transition-all duration-200",
              action.bgClass
            )}
          >
            <Link href={action.href}>
              <Icon className={cn("h-3.5 w-3.5", action.colorClass)} />
              <span className="text-xs font-medium text-text-dark">
                {action.label}
              </span>
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
