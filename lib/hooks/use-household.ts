"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { HouseholdSummary, HouseholdInvitation } from "@/lib/types/household";

export function useHousehold() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<HouseholdSummary>({
    queryKey: ["household"],
    queryFn: async () => {
      const res = await fetch("/api/household");
      if (!res.ok) {
        throw new Error("Failed to fetch household");
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createHousehold = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create household");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household"] });
    },
  });

  const leaveHousehold = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/household", {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to leave household");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household"] });
    },
  });

  const invitePartner = useMutation({
    mutationFn: async ({ email, role }: { email: string; role?: string }) => {
      const res = await fetch("/api/household/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household"] });
    },
  });

  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await fetch(`/api/household/invite?id=${invitationId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to cancel invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household"] });
    },
  });

  return {
    household: data?.household ?? null,
    role: data?.role ?? null,
    members: data?.members ?? [],
    pendingInvitations: data?.pendingInvitations ?? [],
    hasPartner: data?.hasPartner ?? false,
    isLoading,
    error,
    refetch,
    createHousehold,
    leaveHousehold,
    invitePartner,
    cancelInvitation,
  };
}

export function useInvitationDetails(token: string | null) {
  return useQuery({
    queryKey: ["invitation", token],
    queryFn: async () => {
      if (!token) return null;
      const res = await fetch(`/api/household/join?token=${token}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch invitation");
      }
      return res.json();
    },
    enabled: !!token,
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const res = await fetch("/api/household/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to accept invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household"] });
    },
  });
}
