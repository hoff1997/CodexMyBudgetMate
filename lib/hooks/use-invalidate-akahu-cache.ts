/**
 * Hook to invalidate Akahu cache when user makes manual changes
 *
 * Usage:
 * - Call invalidateAll() when user adds/edits transactions manually
 * - Call invalidateTransactions() when user categorizes transactions
 * - Call invalidateAccounts() when user updates account settings
 */

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export function useInvalidateAkahuCache() {
  const queryClient = useQueryClient();

  /**
   * Invalidate ALL Akahu cache (accounts + transactions)
   * Use when user adds manual transaction or requests reconciliation
   */
  const invalidateAll = useCallback(async () => {
    // Invalidate React Query cache
    await queryClient.invalidateQueries({ queryKey: ["akahu"] });

    // Invalidate server-side Redis cache
    await fetch("/api/akahu/cache/invalidate", {
      method: "POST",
    });

    console.log("[Cache] Invalidated all Akahu cache");
  }, [queryClient]);

  /**
   * Invalidate only transactions cache (keep accounts cache)
   * Use when user categorizes or edits transactions
   */
  const invalidateTransactions = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["akahu", "transactions"],
    });

    console.log("[Cache] Invalidated transactions cache");
  }, [queryClient]);

  /**
   * Invalidate only accounts cache (keep transactions cache)
   * Use when user updates account settings
   */
  const invalidateAccounts = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["akahu", "accounts"] });

    console.log("[Cache] Invalidated accounts cache");
  }, [queryClient]);

  return {
    invalidateAll,
    invalidateTransactions,
    invalidateAccounts,
  };
}
