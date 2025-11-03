"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  FEATURE_REQUEST_STATUS_COLORS,
  FEATURE_REQUEST_STATUS_LABELS,
  FEATURE_REQUEST_STATUSES,
  type FeatureRequest,
  type FeatureRequestStatus,
} from "@/lib/types/feature-request";
import { cn } from "@/lib/cn";
import { format } from "date-fns";
import {
  Edit,
  Filter,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

type FormState = {
  title: string;
  description: string;
  status: FeatureRequestStatus;
};

const defaultFormState: FormState = {
  title: "",
  description: "",
  status: "new",
};

export function FeatureRequestsClient() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedStatuses, setSelectedStatuses] = useState<FeatureRequestStatus[]>([]);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formOpen, setFormOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<FeatureRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeatureRequest | null>(null);

  const statusesKey = selectedStatuses.length
    ? [...selectedStatuses].sort().join(",")
    : "all";

  const queryKey = useMemo(
    () => ["/api/feature-requests", { search: deferredSearch.trim(), statuses: statusesKey }],
    [deferredSearch, statusesKey],
  );

  const {
    data: requests = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      const trimmedSearch = deferredSearch.trim();
      if (trimmedSearch) {
        params.set("search", trimmedSearch);
      }
      if (selectedStatuses.length) {
        params.set("status", selectedStatuses.join(","));
      }
      const queryString = params.toString();
      const response = await fetch(
        `/api/feature-requests${queryString ? `?${queryString}` : ""}`,
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload) {
        throw new Error(payload?.error ?? "Failed to load feature requests");
      }
      return (payload.requests ?? []) as FeatureRequest[];
    },
  });

  useEffect(() => {
    if (!formOpen) {
      setFormMode("create");
      setActiveRequest(null);
      setFormState(defaultFormState);
    }
  }, [formOpen]);

  useEffect(() => {
    if (formMode === "edit" && activeRequest) {
      setFormState({
        title: activeRequest.title,
        description: activeRequest.description ?? "",
        status: activeRequest.status,
      });
    }
  }, [formMode, activeRequest]);

  const invalidateRequests = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/feature-requests"] });

  const createMutation = useMutation({
    mutationFn: async (payload: FormState) => {
      const response = await fetch("/api/feature-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json) {
        throw new Error(json?.error ?? "Failed to create feature request");
      }
      return json.request as FeatureRequest;
    },
    onSuccess: () => {
      invalidateRequests();
      toast.success("Feature request created");
      setFormOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to create feature request");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: FeatureRequest & FormState) => {
      const response = await fetch(`/api/feature-requests/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
          status: payload.status,
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json) {
        throw new Error(json?.error ?? "Failed to update feature request");
      }
      return json.request as FeatureRequest;
    },
    onSuccess: () => {
      invalidateRequests();
      toast.success("Feature request updated");
      setFormOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update feature request");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/feature-requests/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(json?.error ?? "Failed to delete feature request");
      }
      return true;
    },
    onSuccess: () => {
      invalidateRequests();
      toast.success("Feature request deleted");
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete feature request");
    },
  });

  const formDisabled =
    createMutation.isPending || updateMutation.isPending || !formState.title.trim();

  const openCreateDialog = () => {
    setFormMode("create");
    setFormState(defaultFormState);
    setActiveRequest(null);
    setFormOpen(true);
  };

  const openEditDialog = (request: FeatureRequest) => {
    setFormMode("edit");
    setActiveRequest(request);
    setFormState({
      title: request.title,
      description: request.description ?? "",
      status: request.status,
    });
    setFormOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: FormState = {
      title: formState.title.trim(),
      description: formState.description.trim(),
      status: formState.status,
    };

    try {
      if (formMode === "create") {
        await createMutation.mutateAsync(payload);
      } else if (formMode === "edit" && activeRequest) {
        await updateMutation.mutateAsync({ ...activeRequest, ...payload });
      }
    } catch (error) {
      // handled in mutation onError
    }
  };

  const toggleStatus = (status: FeatureRequestStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status],
    );
  };

  const renderRequests = () => {
    if (isLoading) {
      return (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading feature requests...</span>
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Card className="border-red-200 bg-red-50/60">
          <CardContent className="flex flex-col gap-3 py-8 text-sm text-red-700">
            <span>{error instanceof Error ? error.message : "Unable to load feature requests"}</span>
            <div>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!requests.length) {
      return (
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
            <Filter className="h-8 w-8 opacity-60" />
            <div>
              <p className="font-medium text-secondary">No feature requests yet</p>
              <p className="text-sm">
                Use the “New request” button to capture roadmap ideas and prioritise upcoming work.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {requests.map((request) => {
          const statusLabel = FEATURE_REQUEST_STATUS_LABELS[request.status];
          const statusColor = FEATURE_REQUEST_STATUS_COLORS[request.status];
          const createdAt = safeFormat(request.createdAt);
          const updatedAt = safeFormat(request.updatedAt);
          return (
            <Card key={request.id} className="border-muted-foreground/20">
              <CardContent className="space-y-4 py-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-secondary">{request.title}</h2>
                      <Badge
                        variant="secondary"
                        className={cn("border px-2 py-0.5 text-xs font-medium", statusColor)}
                      >
                        {statusLabel}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {createdAt} · Updated {updatedAt}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => openEditDialog(request)}
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => setDeleteTarget(request)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="rounded-md border border-muted-foreground/20 bg-muted/10 p-4 text-sm leading-relaxed">
                  {request.description ? (
                    <p className="whitespace-pre-wrap text-secondary">{request.description}</p>
                  ) : (
                    <p className="italic text-muted-foreground">No description provided.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-secondary">Feature Requests</h1>
            <p className="text-sm text-muted-foreground">
              Capture product ideas, track approvals, and keep stakeholders aligned on delivery.
            </p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2 self-start md:self-auto">
            <Plus className="h-4 w-4" />
            New request
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative w-full">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by title or description"
                    className="pl-9"
                  />
                  {search ? (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-secondary"
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                Status
              </span>
              <Button
                size="sm"
                variant={selectedStatuses.length === 0 ? "secondary" : "outline"}
                onClick={() => setSelectedStatuses([])}
              >
                All
              </Button>
              {FEATURE_REQUEST_STATUSES.map((status) => {
                const isActive = selectedStatuses.includes(status);
                return (
                  <Button
                    key={status}
                    size="sm"
                    variant={isActive ? "secondary" : "outline"}
                    onClick={() => toggleStatus(status)}
                    className="capitalize"
                  >
                    {FEATURE_REQUEST_STATUS_LABELS[status]}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {renderRequests()}
      </div>

      <Dialog.Root open={formOpen} onOpenChange={setFormOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-background p-6 shadow-2xl focus:outline-none">
            <div className="space-y-1">
              <Dialog.Title className="text-xl font-semibold text-secondary">
                {formMode === "create" ? "New feature request" : "Edit feature request"}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                Provide a clear title, context, and choose the current status so the team knows what to action next.
              </Dialog.Description>
            </div>
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="feature-title">Title</Label>
                <Input
                  id="feature-title"
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Short summary of the requested feature"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feature-description">Description</Label>
                <Textarea
                  id="feature-description"
                  rows={5}
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="What problem does this solve? Any context or acceptance criteria?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feature-status">Status</Label>
                <select
                  id="feature-status"
                  className="h-10 w-full rounded-md border px-3 text-sm capitalize"
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      status: event.target.value as FeatureRequestStatus,
                    }))
                  }
                >
                  {FEATURE_REQUEST_STATUSES.map((status) => (
                    <option key={status} value={status} className="capitalize">
                      {FEATURE_REQUEST_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setFormOpen(false)}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={formDisabled} className="gap-2">
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {formMode === "create" ? "Create request" : "Save changes"}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={Boolean(deleteTarget)} onOpenChange={(open) => (!open ? setDeleteTarget(null) : null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-background p-6 shadow-2xl focus:outline-none">
            <div className="space-y-1">
              <Dialog.Title className="text-lg font-semibold text-secondary">Delete request?</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                This will remove “{deleteTarget?.title ?? "the selected feature"}” and its history.
                You can always re-create it later if needed.
              </Dialog.Description>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="gap-2"
                onClick={() => {
                  if (!deleteTarget) return;
                  deleteMutation.mutate(deleteTarget.id);
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function safeFormat(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "unknown";
  try {
    return format(parsed, "d MMM yyyy");
  } catch {
    return "unknown";
  }
}
