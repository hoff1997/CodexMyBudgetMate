"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RotateCcw, Info, LayoutDashboard, Eye } from "lucide-react";
import { EnvelopeMonitorSelector } from "./envelope-monitor-selector";
import type { DashboardWidgetConfig } from "@/lib/dashboard/widget-config";
import type { PersonaDashboardLayout } from "@/lib/dashboard/default-layouts";

interface DashboardCustomizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: DashboardWidgetConfig[];
  hiddenWidgets: string[];
  onToggleWidget: (widgetId: string) => void;
  onResetLayout: () => void;
  currentLayout: PersonaDashboardLayout;
  monitoredEnvelopeIds: string[];
  onToggleEnvelope: (envelopeId: string) => void;
}

type TabType = "widgets" | "envelopes";

export function DashboardCustomizeDialog({
  open,
  onOpenChange,
  widgets,
  hiddenWidgets,
  onToggleWidget,
  onResetLayout,
  currentLayout,
  monitoredEnvelopeIds,
  onToggleEnvelope,
}: DashboardCustomizeDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>("widgets");

  // Group widgets by category
  const widgetsByCategory = widgets.reduce((acc, widget) => {
    if (!acc[widget.category]) {
      acc[widget.category] = [];
    }
    acc[widget.category].push(widget);
    return acc;
  }, {} as Record<string, DashboardWidgetConfig[]>);

  // Category display names
  const categoryNames: Record<string, string> = {
    onboarding: "Getting Started",
    demo: "Demo Mode",
    actions: "Quick Actions",
    stats: "Statistics",
    envelopes: "Envelopes",
    goals: "Goals",
    transactions: "Transactions",
    banking: "Banking",
    overview: "Overview",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Customize Your Dashboard</DialogTitle>
          <DialogDescription>
            Manage your dashboard layout and choose which envelopes to monitor
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab("widgets")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === "widgets"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard Widgets
          </button>
          <button
            onClick={() => setActiveTab("envelopes")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === "envelopes"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="h-4 w-4" />
            Monitored Envelopes
          </button>
        </div>

        {/* Widgets Tab */}
        {activeTab === "widgets" && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Current Layout: {currentLayout.name}</p>
                <p className="text-blue-700">{currentLayout.description}</p>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto pr-4">
              <div className="space-y-6">
                {Object.entries(widgetsByCategory).map(([category, categoryWidgets]) => (
                  <div key={category}>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                      {categoryNames[category] || category}
                    </h3>
                    <div className="space-y-2">
                      {categoryWidgets.map((widget) => {
                        const isHidden = hiddenWidgets.includes(widget.id);
                        const isVisible = !isHidden;

                        return (
                          <div
                            key={widget.id}
                            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <Checkbox
                              id={`widget-${widget.id}`}
                              checked={isVisible}
                              onCheckedChange={() => onToggleWidget(widget.id)}
                              disabled={!widget.dismissible}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor={`widget-${widget.id}`}
                                className={cn(
                                  "font-medium cursor-pointer",
                                  !widget.dismissible && "opacity-60"
                                )}
                              >
                                {widget.title}
                                {!widget.dismissible && (
                                  <span className="ml-2 text-xs text-muted-foreground">(Required)</span>
                                )}
                              </Label>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {widget.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <Button
                variant="outline"
                onClick={onResetLayout}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to {currentLayout.name}
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}

        {/* Envelopes Tab */}
        {activeTab === "envelopes" && (
          <>
            <div className="max-h-[450px] overflow-y-auto pr-2">
              <EnvelopeMonitorSelector
                monitoredEnvelopeIds={monitoredEnvelopeIds}
                onToggle={onToggleEnvelope}
              />
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
