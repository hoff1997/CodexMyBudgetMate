"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserPreferences } from "@/lib/types/user-preferences";
import { DEFAULT_PREFERENCES } from "@/lib/types/user-preferences";

export function usePreferences() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<UserPreferences>({
    queryKey: ["user-preferences"],
    queryFn: async () => {
      const res = await fetch("/api/user/preferences");
      if (!res.ok) {
        throw new Error("Failed to fetch preferences");
      }
      const json = await res.json();
      return { ...DEFAULT_PREFERENCES, ...json.preferences };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updatePreference = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update preferences");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
    },
  });

  return {
    preferences: (data ?? DEFAULT_PREFERENCES) as UserPreferences,
    isLoading,
    error,
    updatePreference,
  };
}
