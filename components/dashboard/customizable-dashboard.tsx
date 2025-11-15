"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
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
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SortableWidgetWrapper } from "./sortable-widget-wrapper";
import { DashboardCustomizeDialog } from "./dashboard-customize-dialog";
import {
  DASHBOARD_WIDGETS,
  isWidgetVisible,
  type DashboardWidgetConfig,
} from "@/lib/dashboard/widget-config";
import { getLayoutForPersona } from "@/lib/dashboard/default-layouts";
import type { PersonaType } from "@/lib/onboarding/personas";

// Dynamic imports for all widgets
import dynamic from "next/dynamic";

// Demo widgets
const DemoConversionWrapper = dynamic(() => import("@/components/demo/demo-conversion-wrapper").then(m => ({ default: m.DemoConversionWrapper })));
const DemoSeedCta = dynamic(() => import("@/components/layout/dashboard/demo-seed-cta").then(m => ({ default: m.DemoSeedCta })));

// Top-level widgets
const NextStepsWidget = dynamic(() => import("@/components/dashboard/next-steps-widget").then(m => ({ default: m.NextStepsWidget })));
const QuickActionsPanel = dynamic(() => import("@/components/layout/dashboard/quick-actions-panel").then(m => ({ default: m.QuickActionsPanel })));
const StatsCards = dynamic(() => import("@/components/dashboard/stats-cards").then(m => ({ default: m.default })));
const MonitoredEnvelopesWidget = dynamic(() => import("@/components/dashboard/monitored-envelopes-widget").then(m => ({ default: m.default })));
const GoalsWidget = dynamic(() => import("@/components/dashboard/goals-widget").then(m => ({ default: m.default })));
const PendingApprovalWidget = dynamic(() => import("@/components/dashboard/pending-approval-widget").then(m => ({ default: m.default })));

// BudgetOverview contains its own widget grid
const BudgetOverview = dynamic(() => import("@/components/layout/overview/budget-overview").then(m => ({ default: m.BudgetOverview })));

const STORAGE_KEY = "mbm-dashboard-layout";
const ENVELOPE_STORAGE_KEY = "mbm-monitored-envelopes";
const LAYOUT_VERSION = "v1";

interface CustomizableDashboardProps {
  userId: string;
  demoMode: boolean;
  persona?: PersonaType | null;
  showDemoCta: boolean;
  // Context for visibility conditions
  context: {
    envelopeCount: number;
    transactionCount: number;
    goalCount: number;
    hasRecurringIncome: boolean;
    hasBankConnected: boolean;
    onboardingCompleted: boolean;
  };
}

export function CustomizableDashboard({
  userId,
  demoMode,
  persona,
  showDemoCta,
  context,
}: CustomizableDashboardProps) {
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<string[]>([]);
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
  const [monitoredEnvelopeIds, setMonitoredEnvelopeIds] = useState<string[]>([]);

  // Get default layout based on persona
  const defaultLayout = useMemo(() => getLayoutForPersona(persona), [persona]);

  // Initialize widget order and hidden widgets from localStorage or defaults
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check version to force refresh when layout changes
    const storedVersion = window.localStorage.getItem(`${STORAGE_KEY}-version`);
    if (storedVersion !== LAYOUT_VERSION) {
      window.localStorage.setItem(`${STORAGE_KEY}-version`, LAYOUT_VERSION);
      window.localStorage.removeItem(`${STORAGE_KEY}-order`);
      window.localStorage.removeItem(`${STORAGE_KEY}-hidden`);
      setWidgetOrder(defaultLayout.widgetOrder);
      setHiddenWidgets(defaultLayout.hiddenByDefault);
      return;
    }

    // Load from localStorage
    const storedOrder = window.localStorage.getItem(`${STORAGE_KEY}-order`);
    const storedHidden = window.localStorage.getItem(`${STORAGE_KEY}-hidden`);

    if (storedOrder) {
      try {
        const order = JSON.parse(storedOrder) as string[];
        if (Array.isArray(order) && order.length > 0) {
          setWidgetOrder(order);
        } else {
          setWidgetOrder(defaultLayout.widgetOrder);
        }
      } catch (error) {
        console.warn("Failed to parse stored widget order", error);
        setWidgetOrder(defaultLayout.widgetOrder);
      }
    } else {
      setWidgetOrder(defaultLayout.widgetOrder);
    }

    if (storedHidden) {
      try {
        const hidden = JSON.parse(storedHidden) as string[];
        if (Array.isArray(hidden)) {
          setHiddenWidgets(hidden);
        } else {
          setHiddenWidgets(defaultLayout.hiddenByDefault);
        }
      } catch (error) {
        console.warn("Failed to parse hidden widgets", error);
        setHiddenWidgets(defaultLayout.hiddenByDefault);
      }
    } else {
      setHiddenWidgets(defaultLayout.hiddenByDefault);
    }

    // Load monitored envelopes from localStorage
    const storedEnvelopes = window.localStorage.getItem(ENVELOPE_STORAGE_KEY);
    if (storedEnvelopes) {
      try {
        const envelopes = JSON.parse(storedEnvelopes) as string[];
        if (Array.isArray(envelopes)) {
          setMonitoredEnvelopeIds(envelopes);
        }
      } catch (error) {
        console.warn("Failed to parse monitored envelopes", error);
      }
    }
  }, [defaultLayout]);

  // Save to localStorage when order or hidden widgets change
  useEffect(() => {
    if (typeof window === "undefined" || widgetOrder.length === 0) return;
    window.localStorage.setItem(`${STORAGE_KEY}-order`, JSON.stringify(widgetOrder));
  }, [widgetOrder]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`${STORAGE_KEY}-hidden`, JSON.stringify(hiddenWidgets));
  }, [hiddenWidgets]);

  // Save monitored envelopes to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ENVELOPE_STORAGE_KEY, JSON.stringify(monitoredEnvelopeIds));
  }, [monitoredEnvelopeIds]);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setWidgetOrder((prev) => {
      const oldIndex = prev.findIndex((id) => id === active.id);
      const newIndex = prev.findIndex((id) => id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  // Filter visible widgets based on conditions and user preferences
  const visibleWidgets = useMemo(() => {
    const fullContext = {
      ...context,
      demoMode,
      showDemoCta,
    };

    return widgetOrder
      .map((id) => DASHBOARD_WIDGETS.find((w) => w.id === id))
      .filter((widget): widget is DashboardWidgetConfig => {
        if (!widget) return false;
        if (hiddenWidgets.includes(widget.id)) return false;
        return isWidgetVisible(widget, fullContext);
      });
  }, [widgetOrder, hiddenWidgets, context, demoMode, showDemoCta]);

  const handleResetLayout = () => {
    setWidgetOrder(defaultLayout.widgetOrder);
    setHiddenWidgets(defaultLayout.hiddenByDefault);
    setCustomizeOpen(false);
  };

  const handleToggleWidget = (widgetId: string) => {
    setHiddenWidgets((prev) => {
      if (prev.includes(widgetId)) {
        return prev.filter((id) => id !== widgetId);
      } else {
        return [...prev, widgetId];
      }
    });
  };

  const handleToggleEnvelope = (envelopeId: string) => {
    setMonitoredEnvelopeIds((prev) => {
      if (prev.includes(envelopeId)) {
        return prev.filter((id) => id !== envelopeId);
      } else {
        return [...prev, envelopeId];
      }
    });
  };

  // Render individual widget by ID
  const renderWidget = (widget: DashboardWidgetConfig) => {
    const key = widget.id;

    switch (widget.id) {
      // Demo widgets
      case "demo-conversion":
        return <DemoConversionWrapper key={key} />;

      case "demo-seed-cta":
        return (
          <div key={key} className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Start with Demo Data</h2>
            <p className="text-muted-foreground mb-4">
              Get started instantly with sample transactions and envelopes to explore features.
            </p>
            <Button asChild>
              <a href="/demo">Load Demo Data</a>
            </Button>
          </div>
        );

      // Top-level widgets
      case "next-steps":
        return (
          <NextStepsWidget
            key={key}
            data={{
              envelopeCount: context.envelopeCount,
              transactionCount: context.transactionCount,
              goalCount: context.goalCount,
              hasRecurringIncome: context.hasRecurringIncome,
              hasBankConnected: context.hasBankConnected,
            }}
          />
        );

      case "quick-actions":
        return <QuickActionsPanel key={key} />;

      case "stats-cards":
        return <StatsCards key={key} showReconciliation={true} />;

      case "monitored-envelopes":
        return <MonitoredEnvelopesWidget key={key} monitoredEnvelopeIds={monitoredEnvelopeIds} />;

      case "goals":
        return <GoalsWidget key={key} />;

      case "pending-approval":
        return <PendingApprovalWidget key={key} />;

      // BudgetOverview widgets are handled within BudgetOverview component itself
      // For now, we render BudgetOverview as a single widget
      default:
        return null;
    }
  };

  // Check if we should show BudgetOverview section
  const showBudgetOverview = visibleWidgets.some((w) => w.category === "overview");

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      {/* Customize button */}
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCustomizeOpen(true)}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Customize Dashboard
        </Button>
      </div>

      {/* Customizable widgets with drag-and-drop */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleWidgets.map((w) => w.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            {visibleWidgets.map((widget) => {
              // Skip overview widgets - they're in BudgetOverview
              if (widget.category === "overview" || widget.category === "banking") {
                return null;
              }

              return (
                <SortableWidgetWrapper key={widget.id} widget={widget}>
                  {renderWidget(widget)}
                </SortableWidgetWrapper>
              );
            })}

            {/* BudgetOverview section (contains its own widget grid) */}
            {showBudgetOverview && (
              <div className="mt-6">
                <Suspense fallback={<p>Loading overview…</p>}>
                  <BudgetOverview userId={userId} demoMode={demoMode} />
                </Suspense>
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Customization dialog */}
      <DashboardCustomizeDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        widgets={DASHBOARD_WIDGETS}
        hiddenWidgets={hiddenWidgets}
        onToggleWidget={handleToggleWidget}
        onResetLayout={handleResetLayout}
        currentLayout={defaultLayout}
        monitoredEnvelopeIds={monitoredEnvelopeIds}
        onToggleEnvelope={handleToggleEnvelope}
      />
    </div>
  );
}
