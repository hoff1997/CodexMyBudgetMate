"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Edit, Trash2, Loader2, ChevronLeft, ChevronRight, BookOpen, Clock, Users, UtensilsCrossed, X, ShoppingCart, Check, ImagePlus, Upload, Link2, Calendar } from "lucide-react";
import { ShareMenu } from "./share-menu";
import { RecipeCategory, Recipe } from "@/lib/types/recipes";
import { useRecipeCategories } from "@/lib/hooks/use-recipe-categories";
import { FullEditRecipeDialog } from "@/components/recipes/full-edit-recipe-dialog";
import { AddRecipeToMealPlanDialog } from "@/components/meal-planner/add-recipe-to-meal-plan-dialog";
import { useToast } from "@/lib/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Shopping list type
interface ShoppingList {
  id: string;
  name: string;
  icon: string;
}

// Corner flourish SVG component
function CornerFlourish({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={style}
    >
      <path d="M 10,90 Q 10,10 90,10" />
      <path d="M 15,90 Q 15,15 90,15" />
      <circle cx="90" cy="10" r="3" fill="currentColor" />
    </svg>
  );
}

// Style guide colors
const colors = {
  sage: '#7A9E9A',
  sageDark: '#5A7E7A',
  sageLight: '#B8D4D0',
  sageVeryLight: '#E2EEEC',
  textDark: '#1A2E2A',
  textMedium: '#4A5E5A',
  silverLight: '#E5E7EB',
  silverVeryLight: '#F3F4F6',
};

// Client-side image compression utility
async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

interface CategoryDetailDialogProps {
  category: RecipeCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryDetailDialog({
  category,
  open,
  onOpenChange,
}: CategoryDetailDialogProps) {
  const { toast } = useToast();
  const { deleteCategory, isDeleting } = useRecipeCategories();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [addedIngredients, setAddedIngredients] = useState<Set<string>>(new Set());
  const [addingIngredient, setAddingIngredient] = useState<string | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [mealPlanDialogOpen, setMealPlanDialogOpen] = useState(false);
  const [editingImageUrl, setEditingImageUrl] = useState<string>("");
  const [imagePopoverOpen, setImagePopoverOpen] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<"url" | "upload">("url");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch recipes for this category
  const { data, isLoading } = useQuery<{ category: RecipeCategory; recipes: Recipe[] }>({
    queryKey: ["recipe-category", category.id],
    queryFn: async () => {
      const response = await fetch(`/api/recipes/categories/${category.id}`);
      if (!response.ok) throw new Error("Failed to fetch category details");
      return response.json();
    },
    enabled: open,
  });

  // Fetch shopping lists
  const { data: listsData } = useQuery<ShoppingList[]>({
    queryKey: ["shopping-lists"],
    queryFn: async () => {
      const response = await fetch("/api/shopping/lists");
      if (!response.ok) throw new Error("Failed to fetch shopping lists");
      return response.json();
    },
    enabled: open,
  });

  // Update shopping lists when data changes
  useEffect(() => {
    if (listsData) {
      setShoppingLists(listsData);
    }
  }, [listsData]);

  // Reset added ingredients when recipe changes
  useEffect(() => {
    setAddedIngredients(new Set());
  }, [currentPage]);

  const recipes = data?.recipes || [];
  const totalPages = recipes.length;
  const currentRecipe = recipes[currentPage];

  // Add ingredient to shopping list
  const handleAddToShoppingList = async (listId: string, ingredientText: string, ingredientKey: string) => {
    setAddingIngredient(ingredientKey);
    try {
      const response = await fetch("/api/shopping/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          list_id: listId,
          name: ingredientText,
        }),
      });

      if (!response.ok) throw new Error("Failed to add item");

      setAddedIngredients(prev => new Set([...prev, ingredientKey]));
      toast({
        title: "Added to list",
        description: `${ingredientText} added to shopping list`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to add item to shopping list",
        variant: "destructive",
      });
    } finally {
      setAddingIngredient(null);
    }
  };

  // Handle recipe update from edit dialog
  const handleRecipeUpdate = () => {
    // Refresh the category data to show updated recipe
    queryClient.invalidateQueries({ queryKey: ["recipe-category", category.id] });
    // Don't set editingRecipe to null here - let onOpenChange handle it
    // This prevents a race condition where the dialog unmounts before it can close
    toast({
      title: "Recipe updated",
      description: "Your changes have been saved.",
    });
  };

  // Handle quick image URL update
  const handleSaveImageUrl = async () => {
    if (!currentRecipe) return;
    setSavingImage(true);
    try {
      const response = await fetch(`/api/recipes/${currentRecipe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: editingImageUrl }),
      });
      if (!response.ok) throw new Error("Failed to update image");
      queryClient.invalidateQueries({ queryKey: ["recipe-category", category.id] });
      toast({
        title: "Image updated",
        description: "Recipe image has been updated.",
      });
      setImagePopoverOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update image",
        variant: "destructive",
      });
    } finally {
      setSavingImage(false);
    }
  };

  // Handle image file upload with compression
  const handleImageUpload = async (file: File) => {
    if (!currentRecipe) return;
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    try {
      const compressedBlob = await compressImage(file, 1200, 0.8);
      const uploadFormData = new FormData();
      uploadFormData.append('file', compressedBlob, `recipe-${Date.now()}.jpg`);
      uploadFormData.append('recipeId', currentRecipe.id);

      const uploadResponse = await fetch('/api/upload/recipe-image', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Upload failed');
      }

      const { url } = await uploadResponse.json();

      // Update the recipe with the new image URL
      const updateResponse = await fetch(`/api/recipes/${currentRecipe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: url }),
      });

      if (!updateResponse.ok) throw new Error("Failed to update recipe");

      queryClient.invalidateQueries({ queryKey: ["recipe-category", category.id] });
      toast({
        title: "Image uploaded",
        description: "Recipe image has been updated.",
      });
      setImagePopoverOpen(false);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCategory(category.id);
      toast({
        title: "Category deleted",
        description: `${category.name} has been removed from your library.`,
      });
      setDeleteConfirmOpen(false);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Reset page when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setCurrentPage(0);
    }
    onOpenChange(newOpen);
  };

  // Format ingredients for display
  const formatIngredient = (ing: { item: string; amount: string } | string) => {
    if (typeof ing === "string") return ing;
    if (typeof ing === "object" && ing !== null) {
      const name = ing.item || "";
      const amount = ing.amount || "";
      return amount ? `${amount} ${name}`.trim() : name;
    }
    return String(ing);
  };

  // Format instructions for display
  const getInstructions = (instructions?: string | string[]) => {
    if (Array.isArray(instructions)) return instructions;
    if (typeof instructions === "string" && instructions.trim()) {
      return instructions.split("\n").filter((s) => s.trim());
    }
    return [];
  };

  // Generate shareable recipe text
  const getRecipeShareText = (recipe: Recipe) => {
    const ingredients = recipe.ingredients?.map(ing => formatIngredient(ing)).join("\n• ") || "";
    const instructions = getInstructions(recipe.instructions).map((step, i) => `${i + 1}. ${step}`).join("\n") || "";

    return `${recipe.title}

${recipe.prep_time_minutes ? `Prep: ${recipe.prep_time_minutes} mins | ` : ""}${recipe.cook_time_minutes ? `Cook: ${recipe.cook_time_minutes} mins | ` : ""}${recipe.servings ? `Serves: ${recipe.servings}` : ""}

${ingredients ? `Ingredients:\n• ${ingredients}\n\n` : ""}${instructions ? `Instructions:\n${instructions}` : ""}

Shared from My Budget Mate`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden max-h-[90vh] [&>button]:hidden">
          {/* Top right buttons - Share and Close side by side */}
          <div className="absolute right-4 top-4 z-50 flex items-center gap-2">
            {/* Share button */}
            {currentRecipe && (
              <div onClick={(e) => e.stopPropagation()}>
                <ShareMenu
                  title={currentRecipe.title}
                  text={getRecipeShareText(currentRecipe)}
                  buttonClassName="rounded-full p-2.5 shadow-md"
                  iconClassName="w-5 h-5"
                />
              </div>
            )}
            {/* Close button */}
            <button
              onClick={() => handleOpenChange(false)}
              className="rounded-full p-2.5 transition-all hover:scale-110 shadow-md"
              style={{
                background: '#FFFFFF',
                border: `2px solid ${colors.sage}`,
                color: colors.sageDark,
              }}
              aria-label="Close recipe book"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main background */}
          <div
            className="relative"
            style={{
              background: `linear-gradient(135deg, ${colors.silverVeryLight} 0%, #FFFFFF 50%, ${colors.sageVeryLight} 100%)`,
              maxHeight: "calc(90vh - 80px)",
            }}
          >
            {/* Subtle texture overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.02]"
              style={{
                backgroundImage: `
                  repeating-linear-gradient(0deg, transparent, transparent 2px, ${colors.sage}40 2px, ${colors.sage}40 4px),
                  repeating-linear-gradient(90deg, transparent, transparent 2px, ${colors.sage}30 2px, ${colors.sage}30 4px)
                `,
                backgroundSize: '4px 4px',
              }}
            />

            {isLoading ? (
              <div className="flex justify-center items-center h-[700px]">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.sage }} />
              </div>
            ) : recipes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[700px] text-center px-6 relative">
                {/* Corner flourishes for empty state */}
                <CornerFlourish className="absolute top-6 left-6 w-12 h-12 opacity-20" style={{ color: colors.sage }} />
                <CornerFlourish className="absolute top-6 right-6 w-12 h-12 opacity-20" style={{ color: colors.sage, transform: 'scaleX(-1)' }} />
                <CornerFlourish className="absolute bottom-6 left-6 w-12 h-12 opacity-20" style={{ color: colors.sage, transform: 'scaleY(-1)' }} />
                <CornerFlourish className="absolute bottom-6 right-6 w-12 h-12 opacity-20" style={{ color: colors.sage, transform: 'scale(-1)' }} />

                <BookOpen className="w-16 h-16 mb-4" style={{ color: colors.sage, opacity: 0.5 }} />
                <p className="text-lg" style={{ color: colors.textDark }}>
                  No recipes in this category yet.
                </p>
                <p className="text-sm mt-2" style={{ color: colors.textMedium }}>
                  Add recipes to categories from the recipe edit screen.
                </p>
              </div>
            ) : (
              /* Two-page book spread */
              <div className="flex min-h-[700px] relative">
                {/* Corner flourishes */}
                <CornerFlourish className="absolute top-4 left-4 w-10 h-10 opacity-15 z-10" style={{ color: colors.sage }} />
                <CornerFlourish className="absolute top-4 right-4 w-10 h-10 opacity-15 z-10" style={{ color: colors.sage, transform: 'scaleX(-1)' }} />
                <CornerFlourish className="absolute bottom-4 left-4 w-10 h-10 opacity-15 z-10" style={{ color: colors.sage, transform: 'scaleY(-1)' }} />
                <CornerFlourish className="absolute bottom-4 right-4 w-10 h-10 opacity-15 z-10" style={{ color: colors.sage, transform: 'scale(-1)' }} />

                {currentRecipe && (
                  <div className="flex w-full">
                    {/* Left page - Image with polaroid effect */}
                    <div
                      className="w-1/2 relative flex items-center justify-center p-6"
                      style={{
                        background: `linear-gradient(135deg, ${colors.silverVeryLight} 0%, ${colors.sageVeryLight} 100%)`,
                        borderRight: `1px solid ${colors.sageLight}`,
                      }}
                    >
                      {/* Book spine shadow */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-6"
                        style={{
                          background: `linear-gradient(90deg, transparent 0%, ${colors.sage}15 100%)`
                        }}
                      />

                      {/* Polaroid-style photo frame */}
                      <div
                        className="relative w-full max-w-[340px]"
                        style={{
                          background: '#FFFFFF',
                          padding: '12px 12px 40px 12px',
                          boxShadow: `
                            0 4px 12px rgba(0, 0, 0, 0.12),
                            inset 0 0 0 1px ${colors.silverLight}`,
                          borderRadius: '2px',
                          transform: 'rotate(-1deg)',
                        }}
                      >
                        {/* Tape effect - top left */}
                        <div
                          className="absolute -top-2 left-6 w-14 h-5"
                          style={{
                            background: `${colors.sageVeryLight}CC`,
                            border: `1px solid ${colors.sageLight}`,
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
                            transform: 'rotate(-5deg)',
                          }}
                        />
                        {/* Tape effect - top right */}
                        <div
                          className="absolute -top-2 right-6 w-14 h-5"
                          style={{
                            background: `${colors.sageVeryLight}CC`,
                            border: `1px solid ${colors.sageLight}`,
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
                            transform: 'rotate(5deg)',
                          }}
                        />

                        <div
                          className="relative overflow-hidden group/image"
                          style={{ border: `1px solid ${colors.silverLight}` }}
                        >
                          {currentRecipe.image_url ? (
                            <div className="relative aspect-[4/3]">
                              <Image
                                src={currentRecipe.image_url}
                                alt={currentRecipe.title}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div
                              className="aspect-[4/3] flex flex-col items-center justify-center"
                              style={{ background: `linear-gradient(135deg, ${colors.silverVeryLight} 0%, ${colors.sageVeryLight} 100%)` }}
                            >
                              <UtensilsCrossed className="w-12 h-12 mb-2" style={{ color: colors.sage, opacity: 0.5 }} />
                              <p className="italic text-sm" style={{ color: colors.textMedium }}>
                                No image available
                              </p>
                            </div>
                          )}

                          {/* Quick edit image button */}
                          <Popover open={imagePopoverOpen} onOpenChange={(open) => {
                            setImagePopoverOpen(open);
                            if (open) {
                              setEditingImageUrl(currentRecipe.image_url || "");
                              setImageInputMode("url");
                            }
                          }}>
                            <PopoverTrigger asChild>
                              <button
                                className="absolute bottom-2 right-2 rounded-full p-2 opacity-70 group-hover/image:opacity-100 transition-all hover:scale-110 shadow-md"
                                style={{
                                  background: '#FFFFFF',
                                  border: `1.5px solid ${colors.sage}`,
                                  color: colors.sageDark,
                                }}
                                title="Edit image"
                              >
                                <ImagePlus className="w-4 h-4" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="end">
                              <div className="space-y-4">
                                {/* Mode toggle tabs */}
                                <div className="flex rounded-lg p-1" style={{ background: colors.silverVeryLight }}>
                                  <button
                                    onClick={() => setImageInputMode("url")}
                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                      imageInputMode === "url"
                                        ? "bg-white shadow-sm text-text-dark"
                                        : "text-text-medium hover:text-text-dark"
                                    }`}
                                  >
                                    <Link2 className="w-4 h-4" />
                                    URL
                                  </button>
                                  <button
                                    onClick={() => setImageInputMode("upload")}
                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                      imageInputMode === "upload"
                                        ? "bg-white shadow-sm text-text-dark"
                                        : "text-text-medium hover:text-text-dark"
                                    }`}
                                  >
                                    <Upload className="w-4 h-4" />
                                    Upload
                                  </button>
                                </div>

                                {/* URL input mode */}
                                {imageInputMode === "url" && (
                                  <div className="space-y-2">
                                    <p className="text-sm text-text-medium">Paste image URL</p>
                                    <Input
                                      type="url"
                                      placeholder="https://example.com/image.jpg"
                                      value={editingImageUrl}
                                      onChange={(e) => setEditingImageUrl(e.target.value)}
                                      className="text-sm"
                                    />
                                    <div className="flex gap-2 justify-end pt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setImagePopoverOpen(false)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={handleSaveImageUrl}
                                        disabled={savingImage}
                                        className="bg-sage hover:bg-sage-dark"
                                      >
                                        {savingImage ? (
                                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                        ) : null}
                                        Save
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {/* File upload mode */}
                                {imageInputMode === "upload" && (
                                  <div className="space-y-3">
                                    <input
                                      ref={fileInputRef}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleImageUpload(file);
                                      }}
                                    />
                                    <button
                                      onClick={() => fileInputRef.current?.click()}
                                      disabled={uploadingImage}
                                      className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed transition-colors"
                                      style={{
                                        borderColor: colors.sageLight,
                                        background: colors.sageVeryLight,
                                      }}
                                    >
                                      {uploadingImage ? (
                                        <>
                                          <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.sage }} />
                                          <span className="text-sm" style={{ color: colors.textMedium }}>
                                            Compressing & uploading...
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <Upload className="w-8 h-8" style={{ color: colors.sage }} />
                                          <span className="text-sm font-medium" style={{ color: colors.textDark }}>
                                            Click to select image
                                          </span>
                                          <span className="text-xs" style={{ color: colors.textMedium }}>
                                            JPG, PNG up to 10MB
                                          </span>
                                        </>
                                      )}
                                    </button>
                                    <p className="text-xs text-center" style={{ color: colors.textMedium }}>
                                      Images are automatically compressed
                                    </p>
                                  </div>
                                )}

                                {/* Clear image button */}
                                {currentRecipe.image_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      setSavingImage(true);
                                      try {
                                        const response = await fetch(`/api/recipes/${currentRecipe.id}`, {
                                          method: "PATCH",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ image_url: null }),
                                        });
                                        if (response.ok) {
                                          queryClient.invalidateQueries({ queryKey: ["recipe-category", category.id] });
                                          setImagePopoverOpen(false);
                                        }
                                      } finally {
                                        setSavingImage(false);
                                      }
                                    }}
                                    className="w-full text-sm"
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Remove Image
                                  </Button>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>

                    {/* Right page - Recipe details */}
                    <div
                      className="w-1/2 overflow-y-auto p-6 relative"
                      style={{
                        maxHeight: "700px",
                        background: `linear-gradient(135deg, #FFFFFF 0%, ${colors.sageVeryLight} 100%)`,
                      }}
                    >
                      {/* Book spine shadow */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-6"
                        style={{
                          background: `linear-gradient(270deg, transparent 0%, ${colors.sage}08 100%)`
                        }}
                      />

                      <div className="space-y-4 pl-4">
                        {/* Recipe title */}
                        <div className="relative">
                          <h3
                            className="text-2xl font-semibold tracking-wide pr-8"
                            style={{ color: colors.textDark }}
                          >
                            {currentRecipe.title}
                          </h3>

                          {/* Category and Tags - below title */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {/* Category badge */}
                            <span
                              className="text-xs px-2.5 py-1 rounded-full font-medium"
                              style={{
                                background: category.color + '20',
                                color: colors.textDark,
                                border: `1px solid ${category.color}40`,
                              }}
                            >
                              {category.name}
                            </span>
                            {/* Tags */}
                            {currentRecipe.tags && currentRecipe.tags.length > 0 && (
                              currentRecipe.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs px-2 py-1 rounded-full font-medium"
                                  style={{
                                    background: colors.sageVeryLight,
                                    color: colors.sageDark,
                                    border: `1px solid ${colors.sageLight}`,
                                  }}
                                >
                                  {tag}
                                </span>
                              ))
                            )}
                          </div>

                          {/* Decorative divider */}
                          <div className="flex items-center mt-3 gap-2">
                            <div
                              className="h-[1px] w-12"
                              style={{ background: `linear-gradient(90deg, transparent, ${colors.sage}, transparent)` }}
                            />
                            <div
                              className="w-1.5 h-1.5 rotate-45"
                              style={{ border: `1px solid ${colors.sage}` }}
                            />
                            <div
                              className="h-[1px] flex-1"
                              style={{ background: `linear-gradient(90deg, ${colors.sage}, transparent)` }}
                            />
                          </div>
                        </div>

                        {/* Recipe meta - time and servings */}
                        <div className="flex flex-wrap items-center gap-3">
                          {currentRecipe.prep_time_minutes && (
                            <div
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md"
                              style={{
                                background: colors.sageVeryLight,
                                border: `1px solid ${colors.sageLight}`,
                              }}
                            >
                              <Clock className="w-3.5 h-3.5" style={{ color: colors.sage }} />
                              <span className="text-xs font-medium" style={{ color: colors.textDark }}>
                                {currentRecipe.prep_time_minutes}m prep
                              </span>
                            </div>
                          )}
                          {currentRecipe.cook_time_minutes && (
                            <div
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md"
                              style={{
                                background: colors.sageVeryLight,
                                border: `1px solid ${colors.sageLight}`,
                              }}
                            >
                              <Clock className="w-3.5 h-3.5" style={{ color: colors.sage }} />
                              <span className="text-xs font-medium" style={{ color: colors.textDark }}>
                                {currentRecipe.cook_time_minutes}m cook
                              </span>
                            </div>
                          )}
                          {currentRecipe.servings && (
                            <div
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md"
                              style={{
                                background: colors.sageVeryLight,
                                border: `1px solid ${colors.sageLight}`,
                              }}
                            >
                              <Users className="w-3.5 h-3.5" style={{ color: colors.sage }} />
                              <span className="text-xs font-medium" style={{ color: colors.textDark }}>
                                Serves {currentRecipe.servings}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Ingredients section */}
                        {currentRecipe.ingredients && currentRecipe.ingredients.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <h4
                                className="text-base font-semibold"
                                style={{ color: colors.textDark, letterSpacing: '0.02em' }}
                              >
                                Ingredients
                              </h4>
                              <div
                                className="flex-1 h-[1px]"
                                style={{ background: `linear-gradient(90deg, ${colors.sageLight}, transparent)` }}
                              />
                            </div>
                            <ul className="space-y-2">
                              {currentRecipe.ingredients.map((ing, i) => {
                                const ingredientText = formatIngredient(ing);
                                const ingredientKey = `${currentPage}-${i}`;
                                const isAdded = addedIngredients.has(ingredientKey);
                                const isAdding = addingIngredient === ingredientKey;

                                return (
                                  <li key={i} className="flex items-start gap-2 group/ing">
                                    {/* Decorative checkbox bullet */}
                                    <div
                                      className="mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center"
                                      style={{
                                        borderColor: isAdded ? colors.sage : colors.sageLight,
                                        borderWidth: '1.5px',
                                        background: isAdded ? colors.sage : colors.sageVeryLight,
                                      }}
                                    >
                                      {isAdded ? (
                                        <Check className="w-2.5 h-2.5 text-white" />
                                      ) : (
                                        <div
                                          className="w-1.5 h-1.5 rounded-full"
                                          style={{ background: colors.sageLight }}
                                        />
                                      )}
                                    </div>
                                    {/* Ingredient text with inline cart button */}
                                    <span
                                      className="text-sm leading-relaxed inline-flex items-center gap-1 flex-wrap"
                                      style={{ color: colors.textDark }}
                                    >
                                      {ingredientText}
                                      {/* Add to shopping list button - inline after text */}
                                      {shoppingLists.length > 0 && !isAdded && (
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <button
                                              className="inline-flex opacity-40 group-hover/ing:opacity-100 transition-opacity p-0.5 rounded hover:bg-sage-very-light align-middle"
                                              title="Add to shopping list"
                                              disabled={isAdding}
                                            >
                                              {isAdding ? (
                                                <Loader2 className="w-3 h-3 animate-spin" style={{ color: colors.sage }} />
                                              ) : (
                                                <ShoppingCart className="w-3 h-3" style={{ color: colors.sage }} />
                                              )}
                                            </button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-48 p-2" align="start">
                                            <p className="text-xs font-medium text-text-medium px-2 py-1 mb-1">Add to list</p>
                                            {shoppingLists.map((list) => (
                                              <button
                                                key={list.id}
                                                onClick={() => handleAddToShoppingList(list.id, ingredientText, ingredientKey)}
                                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-sage-very-light transition-colors text-left"
                                              >
                                                <span>{list.icon}</span>
                                                <span className="text-text-dark truncate">{list.name}</span>
                                              </button>
                                            ))}
                                          </PopoverContent>
                                        </Popover>
                                      )}
                                      {isAdded && (
                                        <span className="text-xs ml-1" style={{ color: colors.sage }}>Added</span>
                                      )}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {/* Instructions section */}
                        {(() => {
                          const instructions = getInstructions(currentRecipe.instructions);
                          return instructions.length > 0 ? (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <h4
                                  className="text-base font-semibold"
                                  style={{ color: colors.textDark, letterSpacing: '0.02em' }}
                                >
                                  Instructions
                                </h4>
                                <div
                                  className="flex-1 h-[1px]"
                                  style={{ background: `linear-gradient(90deg, ${colors.sageLight}, transparent)` }}
                                />
                              </div>
                              <ol className="space-y-3">
                                {instructions.map((step, i) => (
                                  <li key={i} className="flex items-start gap-3">
                                    {/* Number tag */}
                                    <div
                                      className="relative flex-shrink-0 w-7 h-7 flex items-center justify-center"
                                      style={{
                                        background: colors.sageVeryLight,
                                        border: `1.5px solid ${colors.sageLight}`,
                                        borderRadius: '50%',
                                      }}
                                    >
                                      <span
                                        className="font-semibold text-sm"
                                        style={{ color: colors.sageDark }}
                                      >
                                        {i + 1}
                                      </span>
                                    </div>
                                    <p
                                      className="flex-1 text-sm leading-relaxed pt-1"
                                      style={{ color: colors.textDark }}
                                    >
                                      {step}
                                    </p>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Combined footer - page navigation and actions */}
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{
              borderTop: `1px solid ${colors.sageLight}`,
              background: colors.sageVeryLight,
            }}
          >
            {/* Edit and Add to Meal Plan buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => currentRecipe && setEditingRecipe(currentRecipe)}
                disabled={!currentRecipe}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all hover:scale-105 disabled:opacity-30"
                style={{
                  color: colors.sageDark,
                  border: `1px solid ${colors.sageLight}`,
                  background: '#FFFFFF',
                }}
              >
                <Edit className="w-3 h-3" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => currentRecipe && setMealPlanDialogOpen(true)}
                disabled={!currentRecipe}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all hover:scale-105 disabled:opacity-30"
                style={{
                  color: colors.sageDark,
                  border: `1px solid ${colors.sageLight}`,
                  background: '#FFFFFF',
                }}
              >
                <Calendar className="w-3 h-3" />
                <span>Add to Plan</span>
              </button>
            </div>

            {/* Page navigation - centered */}
            {recipes.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPrevPage}
                  disabled={currentPage === 0}
                  className="p-1.5 rounded-md transition-all disabled:opacity-30"
                  style={{
                    color: colors.sageDark,
                    border: `1px solid ${colors.sageLight}`,
                    background: '#FFFFFF',
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div
                  className="px-3 py-1 rounded-full text-xs"
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid ${colors.sageLight}`,
                    color: colors.textMedium,
                  }}
                >
                  {currentPage + 1} / {totalPages}
                </div>

                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages - 1}
                  className="p-1.5 rounded-md transition-all disabled:opacity-30"
                  style={{
                    color: colors.sageDark,
                    border: `1px solid ${colors.sageLight}`,
                    background: '#FFFFFF',
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Delete button */}
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all hover:scale-105 disabled:opacity-30"
              style={{
                color: '#DC2626',
                border: '1px solid #FECACA',
                background: '#FEF2F2',
              }}
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={category.recipe_count > 0}
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{category.name}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit recipe dialog */}
      {editingRecipe && (
        <FullEditRecipeDialog
          recipe={{
            ...editingRecipe,
            source_type: editingRecipe.source_type || "manual",
            is_favorite: editingRecipe.is_favorite ?? false,
            servings: editingRecipe.servings?.toString(),
          }}
          open={!!editingRecipe}
          onOpenChange={(open) => !open && setEditingRecipe(null)}
          onUpdate={handleRecipeUpdate}
        />
      )}

      {/* Add to meal plan dialog */}
      <AddRecipeToMealPlanDialog
        open={mealPlanDialogOpen}
        onOpenChange={setMealPlanDialogOpen}
        recipe={currentRecipe}
      />
    </>
  );
}
