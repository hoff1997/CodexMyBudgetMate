"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RecipeCategory } from "@/lib/types/recipes";

interface CategoriesResponse {
  categories: RecipeCategory[];
}

export function useRecipeCategories() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<CategoriesResponse>({
    queryKey: ["recipe-categories"],
    queryFn: async () => {
      const response = await fetch("/api/recipes/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newCategory: {
      name: string;
      color: string;
      slug?: string;
    }) => {
      const response = await fetch("/api/recipes/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create category");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-categories"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      color?: string;
      cover_image?: string | null;
    }) => {
      const response = await fetch(`/api/recipes/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update category");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-categories"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/recipes/categories/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete category");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-categories"] });
    },
  });

  // Wrapper for updateCategory to match expected signature
  const updateCategory = async (
    id: string,
    updates: { name?: string; color?: string; cover_image?: string | null }
  ) => {
    return updateMutation.mutateAsync({ id, ...updates });
  };

  return {
    categories: data?.categories || [],
    isLoading,
    error,
    createCategory: createMutation.mutateAsync,
    updateCategory,
    deleteCategory: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
