"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  WalletSummary,
  CreateWalletTransactionRequest,
  WalletTransaction,
} from "@/lib/types/wallet";

const WALLET_QUERY_KEY = ["wallet"];
const WALLET_TRANSACTIONS_KEY = ["wallet", "transactions"];

/**
 * Hook to fetch and manage wallet data
 */
export function useWallet() {
  const queryClient = useQueryClient();

  // Fetch wallet summary
  const {
    data: walletSummary,
    isLoading,
    error,
    refetch,
  } = useQuery<WalletSummary>({
    queryKey: WALLET_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/wallet");
      if (!response.ok) {
        throw new Error("Failed to fetch wallet");
      }
      return response.json();
    },
  });

  // Add transaction mutation
  const addTransaction = useMutation({
    mutationFn: async (data: CreateWalletTransactionRequest) => {
      const response = await fetch("/api/wallet/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add transaction");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate wallet queries to refetch
      queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WALLET_TRANSACTIONS_KEY });
    },
  });

  // Delete transaction mutation
  const deleteTransaction = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await fetch(`/api/wallet/transactions/${transactionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete transaction");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WALLET_TRANSACTIONS_KEY });
    },
  });

  // Create wallet mutation
  const createWallet = useMutation({
    mutationFn: async (initialBalance?: number) => {
      const response = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initial_balance: initialBalance }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create wallet");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEY });
    },
  });

  return {
    walletSummary,
    isLoading,
    error,
    refetch,
    hasWallet: walletSummary?.hasWallet ?? false,
    balance: walletSummary?.balance ?? 0,
    recentTransactions: walletSummary?.recentTransactions ?? [],
    addTransaction,
    deleteTransaction,
    createWallet,
  };
}

/**
 * Hook to fetch paginated wallet transactions
 */
export function useWalletTransactions(limit = 20, offset = 0) {
  return useQuery<{
    transactions: WalletTransaction[];
    total: number;
    hasWallet: boolean;
  }>({
    queryKey: [...WALLET_TRANSACTIONS_KEY, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const response = await fetch(`/api/wallet/transactions?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      return response.json();
    },
  });
}
