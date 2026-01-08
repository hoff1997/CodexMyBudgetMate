/**
 * React Query hook for Akahu accounts with smart caching
 *
 * Features:
 * - Automatic cache management (5min stale time)
 * - Auto-refetch on mount if stale
 * - Auto-refetch on window focus if >5min inactive
 * - Manual refresh capability
 * - Cache age tracking
 */

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

interface AkahuAccount {
  _id: string;
  name: string;
  balance: {
    current: number;
    available?: number;
  };
  type: string;
  attributes: string[];
  connection?: {
    _id: string;
    name: string;
  };
}

interface AkahuAccountsResponse {
  items: AkahuAccount[];
  cached: boolean;
  cacheAge?: number;
  timestamp: number;
}

export function useAkahuAccounts(options?: {
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();

  const query = useQuery<AkahuAccountsResponse>({
    queryKey: ["akahu", "accounts"],
    queryFn: async () => {
      const response = await fetch("/api/akahu/accounts");

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch accounts");
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
    refetchOnMount: options?.refetchOnMount ?? true,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? true,
    refetchInterval: false, // Don't poll continuously
    retry: 2,
    enabled: options?.enabled ?? true,
  });

  /**
   * Force refresh accounts from Akahu API
   * Bypasses cache and fetches fresh data
   */
  const forceRefresh = async () => {
    return queryClient.fetchQuery({
      queryKey: ["akahu", "accounts"],
      queryFn: async () => {
        const response = await fetch("/api/akahu/accounts?refresh=true");

        if (!response.ok) {
          throw new Error("Failed to refresh accounts");
        }

        return response.json();
      },
    });
  };

  /**
   * Invalidate cache (forces refetch on next access)
   */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["akahu", "accounts"] });
  };

  return {
    accounts: query.data?.items || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isCached: query.data?.cached ?? false,
    cacheAge: query.data?.cacheAge,
    lastUpdated: query.data?.timestamp,
    refetch: query.refetch,
    forceRefresh,
    invalidate,
  };
}
