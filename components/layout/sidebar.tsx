"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { QuickActionsSheet } from "@/components/quick-actions/quick-actions-sheet";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "mbm-nav-order";
const NAV_VERSION = "v3"; // Increment this when adding new menu items

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
};

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: "getting-started", label: "Getting Started", href: "/getting-started", icon: "🏠" },
  { id: "setup", label: "Setup Wizard", href: "/setup", icon: "🧙" },
  { id: "reconcile", label: "Reconcile", href: "/reconcile", icon: "⚖️" },
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "⏳" },
  { id: "envelope-summary", label: "Envelope Summary", href: "/envelope-summary", icon: "🧾" },
  { id: "zero-budget", label: "Zero Budget Manager", href: "/envelope-summary?tab=zero-budget", icon: "🎯" },
  { id: "zero-budget-setup", label: "Zero Budget Setup", href: "/zero-budget-setup", icon: "🎯" },
  { id: "envelope-planning", label: "Envelope Planning", href: "/envelope-planning", icon: "📋" },
  { id: "income-allocation", label: "Income & Allocation", href: "/income-allocation", icon: "💰" },
  { id: "scenario-planner", label: "Scenario Planner", href: "/scenario-planner", icon: "🔮" },
  { id: "envelope-balances", label: "Envelope Balances", href: "/envelope-balances", icon: "💰" },
  { id: "balance-report", label: "Account Balances", href: "/balance-report", icon: "📊" },
  { id: "transactions", label: "Transactions", href: "/transactions", icon: "💵" },
  { id: "net-worth", label: "Net Worth", href: "/net-worth", icon: "📈" },
  { id: "debt-management", label: "Debt Management", href: "/debt-management", icon: "💳" },
  { id: "accounts", label: "Accounts", href: "/accounts", icon: "🏦" },
  { id: "recurring-income", label: "Recurring Income", href: "/recurring-income", icon: "🔄" },
  { id: "reports", label: "Reports", href: "/reports", icon: "📑" },
  { id: "feature-requests", label: "Feature Requests", href: "/feature-requests", icon: "💡" },
  { id: "settings", label: "Settings", href: "/settings", icon: "⚙️" },
  { id: "coming-soon", label: "Coming Soon", href: "/coming-soon", icon: "⏳" },
];

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [navItems, setNavItems] = useState<NavItem[]>(DEFAULT_NAV_ITEMS);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check version to force refresh when new items are added
    const storedVersion = window.localStorage.getItem(STORAGE_KEY + "-version");
    if (storedVersion !== NAV_VERSION) {
      // Version mismatch - clear old cache and use defaults
      window.localStorage.setItem(STORAGE_KEY + "-version", NAV_VERSION);
      window.localStorage.removeItem(STORAGE_KEY);
      setNavItems(DEFAULT_NAV_ITEMS);
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const order = JSON.parse(stored) as string[];
      if (Array.isArray(order) && order.length) {
        const mapped: NavItem[] = order
          .map((id) => DEFAULT_NAV_ITEMS.find((item) => item.id === id))
          .filter(Boolean) as NavItem[];
        const missing = DEFAULT_NAV_ITEMS.filter((item) => !order.includes(item.id));
        setNavItems([...mapped, ...missing]);
      }
    } catch (error) {
      console.warn("Failed to parse stored navigation order", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const order = navItems.map((item) => item.id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  }, [navItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setNavItems((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id);
      const newIndex = prev.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const ids = useMemo(() => navItems.map((item) => item.id), [navItems]);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col justify-between border-r bg-white">
        <div>
          <div className="px-6 py-4 text-lg font-bold">My Budget Mate</div>
          <div className="px-4">
            <QuickActionsSheet />
          </div>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <nav className="px-2 py-4 space-y-1">
                {navItems.map((item) => (
                  <SortableNavItem key={item.id} item={item} activePath={pathname} />
                ))}
              </nav>
            </SortableContext>
          </DndContext>
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

function SortableNavItem({ item, activePath }: { item: NavItem; activePath: string | null }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isActive =
    typeof activePath === "string" &&
    (activePath === item.href || activePath.startsWith(`${item.href}/`));

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-60")}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-2 py-1 transition",
          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/20",
        )}
      >
        <button
          type="button"
          aria-label={`Reorder ${item.label}`}
          {...attributes}
          {...listeners}
          className="rounded-md p-1 text-muted-foreground hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Link
          href={item.href}
          className="flex flex-1 items-center gap-3 rounded-lg px-3 py-2"
        >
          <span className="text-lg">{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      </div>
    </div>
  );
}
