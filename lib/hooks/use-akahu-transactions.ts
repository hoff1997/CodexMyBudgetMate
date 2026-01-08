/**
 * React Query hook for Akahu transactions with smart caching
 *
 * Features:
 * - Automatic cache management (15min stale time)
 * - Auto-refetch on mount if stale
 * - Auto-refetch on window focus
 * - Manual refresh capability
 * - Filter by account, date range
 */

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

interface AkahuTransaction {
  _id: string;
  _account: string;
  date: string;
  description: string;
  amount: number;
  balance?: number;
  type: string;
  merchant?: {
    _id: string;
    name: string;
  };
  category?: {
    groups: {
      group_1: string;
      group_2: string;
    };
  };
}

interface AkahuTransactionsResponse {
  items: AkahuTransaction[];
  cached: boolean;
  cacheAge?: number;
  timestamp: number;
}

export function useAkahuTransactions(options?: {
  accountId?: string;
  start?: string;
  end?: string;
  refetchOnMount?: boolean;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();

  const query = useQuery<AkahuTransactionsResponse>({
    queryKey: [
      "akahu",
      "transactions",
      options?.accountId,
      options?.start,
      options?.end,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.accountId) params.append("account", options.accountId);
      if (options?.start) params.append("start", options.start);
      if (options?.end) params.append("end", options.end);

      const response = await fetch(`/api/akahu/transactions?${params}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch transactions");
      }

      return response.json();
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnMount: options?.refetchOnMount ?? true,
    refetchOnWindowFocus: true,
    refetchInterval: false,
    retry: 2,
    enabled: options?.enabled ?? true,
  });

  const forceRefresh = async () => {
    const params = new URLSearchParams({ refresh: "true" });
    if (options?.accountId) params.append("account", options.accountId);
    if (options?.start) params.append("start", options.start);
    if (options?.end) params.append("end", options.end);

    return queryClient.fetchQuery({
      queryKey: [
        "akahu",
        "transactions",
        options?.accountId,
        options?.start,
        options?.end,
      ],
      queryFn: async () => {
        const response = await fetch(`/api/akahu/transactions?${params}`);
        if (!response.ok) throw new Error("Failed to refresh transactions");
        return response.json();
      },
    });
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["akahu", "transactions"] });
  };

  return {
    transactions: query.data?.items || [],
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
