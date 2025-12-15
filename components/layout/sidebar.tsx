"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
// Quick Actions removed for V1 - will be re-added in future version once users are familiar with core app flow
// import { QuickActionsSheet } from "@/components/quick-actions/quick-actions-sheet";
import { GlobalSearch } from "@/components/search/global-search";
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
import { GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "mbm-nav-order";
const NAV_VERSION = "v17"; // Increment this when adding new menu items - v17: merged Accounts into Net Worth
const ADMIN_EMAIL = "hoff1997@gmail.com";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
  separator?: boolean;
  isAdvanced?: boolean;
  isFutureFeature?: boolean;
  isReportsSubmenu?: boolean;
  isOnboardingSubmenu?: boolean;
  isRetired?: boolean; // For items that still exist but are hidden from nav
};

// Onboarding step labels for the submenu
const ONBOARDING_STEPS = [
  { step: 1, label: "Welcome", icon: "👋" },
  { step: 2, label: "About You", icon: "👤" },
  { step: 3, label: "Bank Accounts", icon: "🏦" },
  { step: 4, label: "Income", icon: "💵" },
  { step: 5, label: "Approach", icon: "🎯" },
  { step: 6, label: "Learn", icon: "📚" },
  { step: 7, label: "Envelopes", icon: "📬" },
  { step: 8, label: "Allocate", icon: "💰" },
  { step: 9, label: "Opening Balance", icon: "🏁" },
  { step: 10, label: "Review", icon: "✅" },
  { step: 11, label: "Complete", icon: "🎉" },
];

const DEFAULT_NAV_ITEMS: NavItem[] = [
  // Core Features - New Order
  { id: "onboarding", label: "Getting Started", href: "/onboarding", icon: "🚀" },
  { id: "onboarding-resume", label: "Resume Setup", href: "/onboarding", icon: "▶️", isOnboardingSubmenu: true },
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "📊" },
  { id: "allocation", label: "Allocation", href: "/allocation", icon: "💰" },
  { id: "envelope-summary", label: "Envelope Summary", href: "/envelope-summary", icon: "🧾" },
  { id: "reconcile", label: "Reconcile", href: "/reconcile", icon: "⚖️" },
  { id: "transactions", label: "Transactions", href: "/transactions", icon: "💵" },
  { id: "net-worth", label: "Net Worth", href: "/net-worth", icon: "📈" },
  { id: "reports", label: "Reports", href: "/reports", icon: "📑" },
  { id: "envelope-balances", label: "Envelope Balances", href: "/envelope-balances", icon: "💰", isReportsSubmenu: true },
  { id: "settings", label: "Settings", href: "/settings", icon: "⚙️" },

  // Retired items (pages still exist but hidden from nav)
  { id: "accounts", label: "Accounts", href: "/accounts", icon: "🏦", isRetired: true },
  { id: "recurring-income", label: "Recurring Income", href: "/recurring-income", icon: "🔄", isRetired: true },
  { id: "budget-manager", label: "Old Budget Manager", href: "/budget-manager", icon: "🎯", isRetired: true },

  // Future Features (admin only)
  { id: "separator-future", label: "", href: "", icon: "", separator: true },
  { id: "scenario-planner", label: "Scenario Planner", href: "/scenario-planner", icon: "🔮", isFutureFeature: true },
  { id: "goals", label: "Goals", href: "/goals", icon: "🎯", isFutureFeature: true },
  { id: "timeline", label: "Timeline", href: "/timeline", icon: "📅", isFutureFeature: true },
  { id: "debt-management", label: "Debt Management", href: "/debt-management", icon: "💳", isFutureFeature: true },
];

interface OnboardingDraft {
  currentStep: number;
  lastSavedAt: string;
}

export default function Sidebar({
  children,
  userEmail,
  showOnboardingMenu = true,
}: {
  children: React.ReactNode;
  userEmail?: string | null;
  showOnboardingMenu?: boolean;
}) {
  const pathname = usePathname();
  const [navItems, setNavItems] = useState<NavItem[]>(DEFAULT_NAV_ITEMS);
  const [showReportsSubmenu, setShowReportsSubmenu] = useState(false);
  const [showFutureFeatures, setShowFutureFeatures] = useState(false);
  const [onboardingDraft, setOnboardingDraft] = useState<OnboardingDraft | null>(null);
  const isAdmin = userEmail === ADMIN_EMAIL;

  // Fetch onboarding draft status
  useEffect(() => {
    if (!showOnboardingMenu) return;

    async function checkDraft() {
      try {
        const response = await fetch("/api/onboarding/autosave");
        if (response.ok) {
          const data = await response.json();
          if (data.hasDraft && data.draft) {
            setOnboardingDraft({
              currentStep: data.draft.currentStep,
              lastSavedAt: data.draft.lastSavedAt,
            });
          }
        }
      } catch (error) {
        console.error("Failed to check onboarding draft:", error);
      }
    }

    checkDraft();
  }, [showOnboardingMenu]);

  // Filter out onboarding if user has completed it, and always filter out retired items
  const filteredNavItems = useMemo(() => {
    let items = navItems.filter(item => !item.isRetired); // Always hide retired items
    if (!showOnboardingMenu) {
      items = items.filter(item => item.id !== 'onboarding' && !item.isOnboardingSubmenu);
    }
    return items;
  }, [navItems, showOnboardingMenu]);

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

  const ids = useMemo(() => filteredNavItems.map((item) => item.id), [filteredNavItems]);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col justify-between border-r border-silver-light bg-silver-very-light">
        <div>
          <div className="px-3 py-2 text-base font-bold text-text-dark">My Budget Mate</div>
          <div className="px-2 space-y-2">
            <GlobalSearch />
            {/* Quick Actions removed for V1 - see FUTURE_ENHANCEMENTS.md */}
          </div>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <nav className="px-1 py-2 space-y-0.5">
                {filteredNavItems.map((item) => {
                  // Handle separator for future features section (admin only)
                  if (item.id === "separator-future") {
                    if (!isAdmin) return null;
                    return (
                      <div key={item.id} className="my-1">
                        <button
                          onClick={() => setShowFutureFeatures(!showFutureFeatures)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-light hover:text-text-dark w-full"
                        >
                          {showFutureFeatures ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span>Future Features</span>
                        </button>
                      </div>
                    );
                  }

                  // Hide future features if section is collapsed or user is not admin
                  if (item.isFutureFeature && (!isAdmin || !showFutureFeatures)) {
                    return null;
                  }

                  // Handle Getting Started (Onboarding) - clicking goes directly to onboarding
                  if (item.id === "onboarding") {
                    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                    const currentStepInfo = onboardingDraft
                      ? ONBOARDING_STEPS.find(s => s.step === onboardingDraft.currentStep)
                      : null;

                    return (
                      <div key={item.id}>
                        <Link
                          href="/onboarding"
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition w-full rounded-md",
                            isActive
                              ? "bg-white text-text-dark border-l-3 border-l-sage"
                              : "text-text-medium hover:bg-silver-light hover:text-text-dark"
                          )}
                        >
                          <span>{item.icon}</span>
                          <span className="flex-1 text-left">{item.label}</span>
                          {onboardingDraft && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-[#7A9E9A] text-white rounded-full">
                              {onboardingDraft.currentStep}/11
                            </span>
                          )}
                        </Link>
                        {/* Show current step info if there's a draft */}
                        {onboardingDraft && currentStepInfo && (
                          <div className="pl-8 pr-3 py-1 text-[10px] text-text-light">
                            Currently on: {currentStepInfo.icon} {currentStepInfo.label}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Hide onboarding submenu items (they're rendered inline above)
                  if (item.isOnboardingSubmenu) {
                    return null;
                  }

                  // Handle Reports submenu
                  if (item.id === "reports") {
                    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                    return (
                      <div key={item.id}>
                        <button
                          onClick={() => setShowReportsSubmenu(!showReportsSubmenu)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition w-full rounded-md",
                            isActive
                              ? "bg-white text-text-dark border-l-3 border-l-sage"
                              : "text-text-medium hover:bg-silver-light hover:text-text-dark"
                          )}
                        >
                          <span>{item.icon}</span>
                          <span className="flex-1 text-left">{item.label}</span>
                          {showReportsSubmenu ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    );
                  }

                  // Hide reports submenu items if collapsed
                  if (item.isReportsSubmenu && !showReportsSubmenu) {
                    return null;
                  }

                  // Render submenu items with indentation
                  if (item.isReportsSubmenu) {
                    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-1.5 pl-8 pr-3 py-1.5 text-xs font-medium transition rounded-md",
                          isActive
                            ? "bg-white text-text-dark border-l-3 border-l-sage"
                            : "text-text-medium hover:bg-silver-light hover:text-text-dark"
                        )}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  }

                  return <SortableNavItem key={item.id} item={item} activePath={pathname} />;
                })}
              </nav>
            </SortableContext>
          </DndContext>
        </div>
        <div className="px-3 py-2">
          <Button asChild variant="outline" className="w-full text-xs h-8">
            <Link href="/api/auth/sign-out" prefetch={false}>Sign out</Link>
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

  // Render separator
  if (item.separator) {
    return (
      <div ref={setNodeRef} style={style} className="my-1.5 px-3">
        <div className="border-t border-border" />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-60")}>
      <div
        className={cn(
          "flex items-center gap-1 rounded-lg px-1 py-0.5 transition",
          isActive
            ? "bg-white text-text-dark font-medium border-l-3 border-l-sage"
            : "text-text-medium hover:bg-silver-light",
        )}
      >
        <button
          type="button"
          aria-label={`Reorder ${item.label}`}
          {...attributes}
          {...listeners}
          className="rounded-md p-0.5 text-silver hover:text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <Link
          href={item.href}
          className="flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5"
        >
          <span className="text-base">{item.icon}</span>
          <span className="text-xs">{item.label}</span>
        </Link>
      </div>
    </div>
  );
}
