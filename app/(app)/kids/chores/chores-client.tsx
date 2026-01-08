"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  Calendar,
  Settings,
  ChevronRight as ArrowRight,
} from "lucide-react";
import { WeeklyChoreGrid } from "@/components/chores/weekly-chore-grid";
import { RemyHelpButton } from "@/components/shared/remy-help-button";
import { ChoreSettingsTab } from "@/components/chores/chore-settings-tab";
import { QuickAssignPanel } from "@/components/chores/quick-assign-panel";
import { toast } from "sonner";

const HELP_CONTENT = {
  tips: [
    "Click any cell in the grid to quickly assign a chore",
    "Chores waiting for approval show a gold glow - click to approve",
    "Set up recurring schedules so chores auto-assign weekly",
    "Use rotation to share chores fairly between kids",
  ],
  features: [
    "Weekly grid view - see all chores at a glance",
    "Inline approvals - approve chores without switching tabs",
    "Quick assign - pick a chore and set the schedule in seconds",
    "Rotations - automatically alternate chores between kids",
    "Streak tracking for expected chores",
  ],
  faqs: [
    {
      question: "What's the difference between Expected and Extra chores?",
      answer: "Expected chores are part of pocket money - they build habits and track streaks. Extra chores earn additional money that gets added to the child's invoice.",
    },
    {
      question: "How do I set up a weekly schedule?",
      answer: "Click any [+] cell in the grid, pick a chore, select the days, and click 'Save Schedule'. The chores will automatically appear each week.",
    },
    {
      question: "How does rotation work?",
      answer: "When assigning a chore, choose 'Rotate between kids'. You can rotate weekly (one kid owns it all week) or per-occurrence (alternates each time).",
    },
    {
      question: "How do I approve chores?",
      answer: "Chores waiting for approval have a gold glow. Click them to see details and approve or send back for redo.",
    },
  ],
};

interface ChildProfile {
  id: string;
  name: string;
  first_name?: string;
  avatar_url: string | null;
  avatar_emoji?: string | null;
}

interface ChoreTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string;
  is_expected: boolean;
  recommended_age_min: number | null;
  recommended_age_max: number | null;
  currency_type: string | null;
  currency_amount: number | null;
  estimated_minutes: number | null;
  is_preset: boolean;
  parent_user_id: string | null;
  max_per_week: number | null;
  allowed_days: number[] | null;
  auto_approve: boolean;
  requires_photo?: boolean;
}

interface ChoreAssignment {
  id: string;
  child_profile_id: string;
  chore_template_id: string;
  week_starting: string;
  day_of_week: number | null;
  status: string;
  currency_type: string;
  currency_amount: number;
  marked_done_at: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  proof_photo_url?: string | null;
  completion_notes?: string | null;
  chore_template: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    category: string;
    is_expected: boolean;
    currency_type: string | null;
    currency_amount: number | null;
  } | null;
  child: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
}

interface ChoresClientProps {
  childProfiles: ChildProfile[];
  templates: ChoreTemplate[];
  assignments: unknown[];
  weekStarting: string;
}

export function ChoresClient({
  childProfiles,
  templates,
  assignments: initialAssignments,
  weekStarting: initialWeekStarting,
}: ChoresClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [isQuickAssignOpen, setIsQuickAssignOpen] = useState(false);
  const [quickAssignContext, setQuickAssignContext] = useState<{
    childId?: string;
    dayOfWeek?: number | null;
  } | null>(null);

  const assignments = initialAssignments as ChoreAssignment[];

  // Calculate week starting date based on offset
  const currentWeekStart = useMemo(() => {
    const date = new Date(initialWeekStarting);
    date.setDate(date.getDate() + weekOffset * 7);
    return date.toISOString().split("T")[0];
  }, [initialWeekStarting, weekOffset]);

  // Filter assignments for current week
  const weekAssignments = useMemo(() => {
    return assignments.filter((a) => a.week_starting === currentWeekStart);
  }, [assignments, currentWeekStart]);

  // Get pending approvals
  const pendingApprovals = useMemo(() => {
    return assignments.filter((a) => a.status === "done" || a.status === "pending_approval");
  }, [assignments]);

  const formatWeekRange = (startDate: string) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const formatDate = (d: Date) =>
      d.toLocaleDateString("en-NZ", { day: "numeric", month: "short" });

    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  // Handle approval
  const handleApproval = async (assignmentId: string) => {
    try {
      const res = await fetch(`/api/chores/assignments/${assignmentId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        toast.success("Chore approved!");
        router.refresh();
      } else {
        toast.error("Failed to approve chore");
      }
    } catch (error) {
      toast.error("Failed to approve chore");
    }
  };

  // Handle rejection
  const handleRejection = async (assignmentId: string, reason?: string) => {
    try {
      const res = await fetch(`/api/chores/assignments/${assignmentId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        toast.success("Sent back for redo");
        router.refresh();
      } else {
        toast.error("Failed to reject chore");
      }
    } catch (error) {
      toast.error("Failed to reject chore");
    }
  };

  // Handle assign chore (opens quick assign panel)
  const handleAssignChore = (childId: string, dayOfWeek: number | null) => {
    setQuickAssignContext({ childId, dayOfWeek });
    setIsQuickAssignOpen(true);
  };

  // Handle quick add button
  const handleQuickAdd = () => {
    setQuickAssignContext(null);
    setIsQuickAssignOpen(true);
  };

  // Handle assignment created
  const handleAssignmentCreated = () => {
    setIsQuickAssignOpen(false);
    setQuickAssignContext(null);
    router.refresh();
  };

  if (childProfiles.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-6 md:py-12 text-center">
            <div className="text-6xl mb-4">👶</div>
            <h2 className="text-xl font-bold text-text-dark mb-2">
              No kids set up yet
            </h2>
            <p className="text-text-medium mb-6">
              Add your children first to start assigning chores.
            </p>
            <Button onClick={() => router.push("/kids/setup")}>
              <Plus className="h-4 w-4 mr-2" />
              Set Up Kids
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Chores</h1>
          <p className="text-text-medium">
            Manage your family's weekly chores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleQuickAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Quick Add
          </Button>
          <RemyHelpButton title="Chores" content={HELP_CONTENT} />
        </div>
      </div>

      {/* Approval Banner */}
      {pendingApprovals.length > 0 && (
        <Card className="mb-6 border-gold bg-gold-light">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gold flex items-center justify-center">
                  <Check className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-text-dark">
                    {pendingApprovals.length} chore{pendingApprovals.length > 1 ? "s" : ""} waiting for approval
                  </p>
                  <p className="text-sm text-text-medium">
                    Click on glowing chores in the grid to approve
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-gold text-gold-dark">
                {pendingApprovals.length} pending
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs - Now just 2! */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="week" className="gap-2">
            <Calendar className="h-4 w-4" />
            Week
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Week Tab - The Primary View */}
        <TabsContent value="week">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setWeekOffset(weekOffset - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-lg">
                    {formatWeekRange(currentWeekStart)}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setWeekOffset(weekOffset + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                {weekOffset !== 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWeekOffset(0)}
                  >
                    Today
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <WeeklyChoreGrid
                childProfiles={childProfiles}
                assignments={weekAssignments}
                weekStarting={currentWeekStart}
                onAssignChore={handleAssignChore}
                onApprove={handleApproval}
                onReject={handleRejection}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab - For Power Users */}
        <TabsContent value="settings">
          <ChoreSettingsTab
            templates={templates}
            childProfiles={childProfiles}
            onRefresh={() => router.refresh()}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Assign Panel */}
      <QuickAssignPanel
        open={isQuickAssignOpen}
        onOpenChange={setIsQuickAssignOpen}
        templates={templates}
        childProfiles={childProfiles}
        weekStarting={currentWeekStart}
        preselectedChildId={quickAssignContext?.childId}
        preselectedDayOfWeek={quickAssignContext?.dayOfWeek}
        onCreated={handleAssignmentCreated}
      />
    </div>
  );
}
