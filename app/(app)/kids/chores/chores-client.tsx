"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Star,
  Clock,
  DollarSign,
  Users,
  Calendar,
  ListTodo,
  LayoutGrid,
} from "lucide-react";
import { ChoreTemplateCard } from "@/components/chores/chore-template-card";
import { AssignChoreDialog } from "@/components/chores/assign-chore-dialog";
import { CreateTemplateDialog } from "@/components/chores/create-template-dialog";
import { WeeklyChoreGrid } from "@/components/chores/weekly-chore-grid";
import { ApprovalQueue } from "@/components/chores/approval-queue";

interface ChildProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  star_balance: number;
  screen_time_balance: number;
}

interface ChoreTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string;
  recommended_age_min: number | null;
  recommended_age_max: number | null;
  default_currency_type: string;
  default_currency_amount: number;
  estimated_minutes: number | null;
  is_system: boolean;
  created_by: string | null;
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
  chore_template: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    category: string;
  } | null;
  child: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
}

interface ChoreRotation {
  id: string;
  name: string;
  frequency: string;
  is_active: boolean;
  chore_template: {
    id: string;
    name: string;
    icon: string | null;
  } | null;
  rotation_members: Array<{
    id: string;
    child_profile_id: string;
    order_position: number;
    child: {
      id: string;
      name: string;
      avatar_url: string | null;
    } | null;
  }>;
}

interface ChoresClientProps {
  childProfiles: ChildProfile[];
  templates: ChoreTemplate[];
  assignments: unknown[];
  rotations: ChoreRotation[];
  weekStarting: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  bedroom: "Bedroom",
  bathroom: "Bathroom",
  kitchen: "Kitchen",
  living_areas: "Living Areas",
  outdoor: "Outdoor",
  pets: "Pets",
  self_care: "Self Care",
  helpful: "Helpful Tasks",
  custom: "Custom",
};

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ChoresClient({
  childProfiles,
  templates,
  assignments: initialAssignments,
  rotations,
  weekStarting: initialWeekStarting,
}: ChoresClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("weekly");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ChoreTemplate | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const assignments = initialAssignments as ChoreAssignment[];

  // Calculate week starting date based on offset
  const currentWeekStart = useMemo(() => {
    const date = new Date(initialWeekStarting);
    date.setDate(date.getDate() + weekOffset * 7);
    return date.toISOString().split("T")[0];
  }, [initialWeekStarting, weekOffset]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    return filtered;
  }, [templates, searchQuery, selectedCategory]);

  // Group templates by category
  const templatesByCategory = useMemo(() => {
    const grouped: Record<string, ChoreTemplate[]> = {};
    for (const template of filteredTemplates) {
      const cat = template.category || "custom";
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(template);
    }
    return grouped;
  }, [filteredTemplates]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category || "custom"));
    return Array.from(cats).sort();
  }, [templates]);

  // Filter assignments for current week
  const weekAssignments = useMemo(() => {
    return assignments.filter((a) => a.week_starting === currentWeekStart);
  }, [assignments, currentWeekStart]);

  // Get pending approvals
  const pendingApprovals = useMemo(() => {
    return assignments.filter((a) => a.status === "done");
  }, [assignments]);

  const handleTemplateClick = (template: ChoreTemplate) => {
    setSelectedTemplate(template);
    setIsAssignDialogOpen(true);
  };

  const handleAssignmentCreated = () => {
    setIsAssignDialogOpen(false);
    setSelectedTemplate(null);
    router.refresh();
  };

  const handleApproval = async (assignmentId: string, approved: boolean, reason?: string) => {
    const endpoint = approved
      ? `/api/chores/assignments/${assignmentId}/approve`
      : `/api/chores/assignments/${assignmentId}/reject`;

    await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    router.refresh();
  };

  const formatWeekRange = (startDate: string) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const formatDate = (d: Date) =>
      d.toLocaleDateString("en-NZ", { day: "numeric", month: "short" });

    return `${formatDate(start)} - ${formatDate(end)}`;
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
          <h1 className="text-2xl font-bold text-text-dark">Chores Manager</h1>
          <p className="text-text-medium">
            Assign and track chores for your kids
          </p>
        </div>
        <Button onClick={() => setIsCreateTemplateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Chore
        </Button>
      </div>

      {/* Approval Alert */}
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
                    Review and approve completed chores
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setActiveTab("approvals")}
              >
                Review Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="weekly" className="gap-2">
            <Calendar className="h-4 w-4" />
            Weekly View
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Chore Library
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-2">
            <ListTodo className="h-4 w-4" />
            Approvals
            {pendingApprovals.length > 0 && (
              <Badge variant="secondary" className="ml-1 bg-gold text-white">
                {pendingApprovals.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Weekly View Tab */}
        <TabsContent value="weekly">
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
                onAssignChore={(childId, dayOfWeek) => {
                  setActiveTab("library");
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chore Library Tab */}
        <TabsContent value="library">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-light" />
                  <Input
                    placeholder="Search chores..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                  <Button
                    variant={selectedCategory === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                  >
                    All
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {CATEGORY_LABELS[cat] || cat}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {Object.keys(templatesByCategory).length === 0 ? (
                <div className="text-center py-12 text-text-medium">
                  No chores found matching your search.
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
                    <div key={category}>
                      <h3 className="text-lg font-semibold text-text-dark mb-4">
                        {CATEGORY_LABELS[category] || category}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryTemplates.map((template) => (
                          <ChoreTemplateCard
                            key={template.id}
                            template={template}
                            onClick={() => handleTemplateClick(template)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals">
          <ApprovalQueue
            assignments={pendingApprovals}
            onApprove={(id) => handleApproval(id, true)}
            onReject={(id, reason) => handleApproval(id, false, reason)}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {selectedTemplate && (
        <AssignChoreDialog
          open={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          template={selectedTemplate}
          childProfiles={childProfiles}
          weekStarting={currentWeekStart}
          onCreated={handleAssignmentCreated}
        />
      )}

      <CreateTemplateDialog
        open={isCreateTemplateOpen}
        onOpenChange={setIsCreateTemplateOpen}
        onCreated={() => {
          setIsCreateTemplateOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
