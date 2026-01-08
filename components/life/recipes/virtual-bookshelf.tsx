"use client";

import { useState, useMemo } from "react";
import { BookOpen, Pencil, Plus, UtensilsCrossed, Heart, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookCover } from "./book-cover";
import { AddCategoryDialog } from "./add-category-dialog";
import { EditCategoryDialog } from "./edit-category-dialog";
import { CategoryDetailDialog } from "./category-detail-dialog";
import { ShareMenu } from "./share-menu";
import { useRecipeCategories } from "@/lib/hooks/use-recipe-categories";
import { RecipeCategory } from "@/lib/types/recipes";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

interface Recipe {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  prep_time?: string;
  cook_time?: string;
  servings?: string;
  tags?: string[];
  is_favorite: boolean;
  source_type: string;
  source_url?: string;
  category_ids?: string[];
}

interface VirtualBookshelfProps {
  searchQuery?: string;
  recipes?: Recipe[];
}

export function VirtualBookshelf({ searchQuery = "", recipes = [] }: VirtualBookshelfProps) {
  const { categories, isLoading } = useRecipeCategories();

  // Generate shareable category text
  const getCategoryShareText = (category: RecipeCategory) => {
    return `${category.name}

${category.recipe_count} ${category.recipe_count === 1 ? "recipe" : "recipes"} in this category

Shared from My Budget Mate Recipe Library`;
  };

  // Find categories that match the search query (for category-based recipe search)
  const matchingCategoryIds = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return categories
      .filter((cat) => cat.name.toLowerCase().includes(query))
      .map((cat) => cat.id);
  }, [categories, searchQuery]);

  // Filter recipes based on search query - includes category name matching
  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return recipes.filter((recipe) => {
      // Direct matches: title, description, tags
      const directMatch =
        recipe.title.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query) ||
        recipe.tags?.some(tag => tag.toLowerCase().includes(query));

      // Category match: recipe belongs to a category whose name matches the search
      const categoryMatch =
        matchingCategoryIds.length > 0 &&
        recipe.category_ids?.some(catId => matchingCategoryIds.includes(catId));

      return directMatch || categoryMatch;
    });
  }, [recipes, searchQuery, matchingCategoryIds]);

  // Don't filter categories when searching - we show recipes instead
  const filteredCategories = useMemo(() => {
    // If searching, don't show category books (we show recipes instead)
    if (searchQuery.trim()) return [];
    return categories;
  }, [categories, searchQuery]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RecipeCategory | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  // Empty state - no categories at all
  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <BookOpen className="w-20 h-20 text-sage opacity-50" />
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-text-dark">
            No Recipe Categories Yet
          </h3>
          <p className="text-muted-foreground max-w-md">
            Start organizing your recipes by adding your first category. Choose
            from our preset categories or create your own custom ones.
          </p>
        </div>
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="bg-sage hover:bg-sage-dark"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Your First Category
        </Button>

        <AddCategoryDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
        />
      </div>
    );
  }

  // No results from search - but check if we have recipe matches
  const hasRecipeResults = filteredRecipes.length > 0;
  const hasCategoryResults = filteredCategories.length > 0;

  if (!hasCategoryResults && !hasRecipeResults && searchQuery.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <BookOpen className="w-16 h-16 text-sage opacity-50" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-text-dark">
            No results for &quot;{searchQuery}&quot;
          </h3>
          <p className="text-muted-foreground">
            Try a different search term
          </p>
        </div>
      </div>
    );
  }

  // Calculate shelves - 8 books per shelf to fit standard categories
  const booksPerShelf = 8;
  // Always show at least 2 shelves for future expansion
  const numShelves = Math.max(2, Math.ceil(filteredCategories.length / booksPerShelf));

  return (
    <div className="space-y-6">
      {/* Recipe Search Results - shown when searching and recipes match */}
      {searchQuery.trim() && hasRecipeResults && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text-dark">
              Matching Recipes
            </h2>
            <p className="text-sm text-muted-foreground">
              {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? "s" : ""} found
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRecipes.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/life/recipes/${recipe.id}`}
                className="group block bg-white rounded-lg border border-silver-light overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Recipe image or placeholder */}
                <div className="relative aspect-[4/3] bg-sage-very-light">
                  {recipe.image_url ? (
                    <Image
                      src={recipe.image_url}
                      alt={recipe.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UtensilsCrossed className="w-8 h-8 text-sage opacity-40" />
                    </div>
                  )}
                  {recipe.is_favorite && (
                    <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 shadow-sm">
                      <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                    </div>
                  )}
                </div>
                {/* Recipe details */}
                <div className="p-3">
                  <h3 className="font-medium text-text-dark group-hover:text-sage-dark line-clamp-1">
                    {recipe.title}
                  </h3>
                  {recipe.description && (
                    <p className="text-xs text-text-medium mt-1 line-clamp-2">
                      {recipe.description}
                    </p>
                  )}
                  {/* Meta info */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-light">
                    {recipe.prep_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {recipe.prep_time}
                      </span>
                    )}
                    {recipe.servings && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {recipe.servings}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {/* Divider if we also have category results */}
          {hasCategoryResults && (
            <div className="border-t border-silver-light pt-4" />
          )}
        </div>
      )}

      {/* Header - only show if we have categories to display */}
      {(hasCategoryResults || !searchQuery.trim()) && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text-dark">
              Your Recipe Library
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredCategories.length}{" "}
              {filteredCategories.length === 1 ? "category" : "categories"}
              {searchQuery.trim() && filteredCategories.length !== categories.length && (
                <span className="text-text-light"> (filtered from {categories.length})</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* White bookshelf like the reference image - only show if we have categories */}
      {(hasCategoryResults || !searchQuery.trim()) && (
        <div className="relative">
          {[...Array(numShelves)].map((_, shelfIndex) => {
          const shelfBooks = filteredCategories.slice(
            shelfIndex * booksPerShelf,
            (shelfIndex + 1) * booksPerShelf
          );

          return (
            <div key={shelfIndex} className="relative mb-2">
              {/* Shelf back wall */}
              <div
                className="absolute inset-0 rounded-lg"
                style={{
                  background: `linear-gradient(180deg,
                    #F8F9FA 0%,
                    #F1F3F4 50%,
                    #E8EAED 100%)`,
                  boxShadow: "inset 0 -10px 20px rgba(0,0,0,0.03)",
                }}
              />

              {/* Books container */}
              <div
                className={cn(
                  "relative z-10 px-4 pt-4 pb-2",
                  "flex flex-wrap gap-2 md:gap-3 lg:gap-4 items-end justify-center",
                  "min-h-[130px] md:min-h-[160px] lg:min-h-[190px]"
                )}
              >
                {shelfBooks.map((category, bookIndex) => (
                  <div key={category.id} className="relative group/book">
                    <BookCover
                      name={category.name}
                      color={category.color}
                      recipeCount={category.recipe_count}
                      coverImage={category.cover_image}
                      onClick={() => setSelectedCategoryId(category.id)}
                      index={shelfIndex * booksPerShelf + bookIndex}
                    />
                    {/* Action buttons on hover */}
                    <div className="absolute -top-2 -right-2 z-30 flex gap-1 opacity-0 group-hover/book:opacity-100 transition-opacity">
                      <div onClick={(e) => e.stopPropagation()}>
                        <ShareMenu
                          title={category.name}
                          text={getCategoryShareText(category)}
                          buttonClassName="w-7 h-7 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-sage-very-light border border-silver-light p-0"
                          iconClassName="w-3.5 h-3.5"
                        />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setEditingCategory(category);
                        }}
                        className="w-7 h-7 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-sage-very-light border border-silver-light"
                        title="Edit category"
                      >
                        <Pencil className="w-3.5 h-3.5 text-sage" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Shelf surface */}
              <div
                className="relative h-4 rounded-b-lg"
                style={{
                  background: `linear-gradient(180deg,
                    #FFFFFF 0%,
                    #F5F5F5 30%,
                    #E8E8E8 70%,
                    #DEDEDE 100%)`,
                  boxShadow: `
                    0 4px 12px rgba(0,0,0,0.08),
                    0 2px 4px rgba(0,0,0,0.04),
                    inset 0 1px 0 rgba(255,255,255,0.8)
                  `,
                }}
              >
                {/* Shelf edge highlight */}
                <div
                  className="absolute top-0 left-0 right-0 h-[1px]"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.9) 50%, transparent 95%)",
                  }}
                />
              </div>

              {/* Shelf shadow on wall below */}
              <div
                className="h-6 -mt-1"
                style={{
                  background: `linear-gradient(180deg,
                    rgba(0,0,0,0.06) 0%,
                    rgba(0,0,0,0.02) 50%,
                    transparent 100%)`,
                }}
              />
            </div>
          );
        })}
        </div>
      )}

      {/* Dialogs */}
      <AddCategoryDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      {editingCategory && (
        <EditCategoryDialog
          category={editingCategory}
          open={!!editingCategory}
          onOpenChange={(open) => !open && setEditingCategory(null)}
        />
      )}

      {selectedCategory && (
        <CategoryDetailDialog
          category={selectedCategory}
          open={!!selectedCategoryId}
          onOpenChange={(open) => !open && setSelectedCategoryId(null)}
        />
      )}
    </div>
  );
}
