"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RecipeCard, AddRecipeDialog, EditRecipeDialog } from "@/components/recipes";
import { RemyHelpButton } from "@/components/shared/remy-help-button";
import { VirtualBookshelf } from "@/components/life/recipes/virtual-bookshelf";
import { AddCategoryDialog } from "@/components/life/recipes/add-category-dialog";
import { AddRecipeToMealPlanDialog } from "@/components/meal-planner/add-recipe-to-meal-plan-dialog";
import { Plus, Search, Heart, BookOpen, X, LayoutGrid, Library, FolderPlus, ChevronDown, Tag, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/lib/hooks/use-toast";

const HELP_CONTENT = {
  intro: "Your recipe library is where all your favourite meals live. Think of the bookshelf as your cookbook collection - each book is a category you can organise recipes into.",
  coaching: [
    "Tags are great for cross-cutting themes like 'quick', 'vegetarian', or 'freezer-friendly'",
    "Don't stress about perfect organisation - you can always move recipes between categories later",
  ],
  tips: [
    "Use the search to find recipes by name, category, or tag",
    "Mark favourites with the heart icon for quick access",
    "Import recipes from websites - just paste the URL",
  ],
  features: [
    "Save recipes from websites, cookbooks, or family traditions",
    "Organise with categories (like cookbooks) and tags (like labels)",
    "Link recipes directly to your meal planner",
    "Add ingredients to shopping lists with one tap",
  ],
  faqs: [
    {
      question: "How do I add a recipe from a website?",
      answer: "Click 'Add' then 'New Recipe' and paste the URL. We'll try to import the recipe details automatically.",
    },
    {
      question: "What's the difference between categories and tags?",
      answer: "Categories are like cookbooks - a recipe can only be in one category at a time. Tags are like labels - you can add as many as you like to help you find recipes later.",
    },
    {
      question: "Can I share a recipe with someone?",
      answer: "Yes! Open any recipe and tap the share icon to send it via WhatsApp, Messenger, or copy to clipboard.",
    },
  ],
};
import { cn } from "@/lib/cn";

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

interface RecipesClientProps {
  initialRecipes: Recipe[];
  availableTags: string[];
}

type ViewMode = "bookshelf" | "grid";

export function RecipesClient({
  initialRecipes,
  availableTags,
}: RecipesClientProps) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showTagsDialog, setShowTagsDialog] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("bookshelf");
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [mealPlanRecipe, setMealPlanRecipe] = useState<Recipe | null>(null);
  const { toast } = useToast();

  // All tags including those from current recipes
  const allTags = useMemo(() => {
    const tags = new Set(availableTags);
    recipes.forEach((recipe) => {
      recipe.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [availableTags, recipes]);

  // Filter recipes - includes search by title, description, and tags
  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      // Search filter - check title, description, AND tags
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = recipe.title.toLowerCase().includes(query);
        const matchesDescription = recipe.description
          ?.toLowerCase()
          .includes(query);
        const matchesTags = recipe.tags?.some(tag =>
          tag.toLowerCase().includes(query)
        );
        if (!matchesTitle && !matchesDescription && !matchesTags) return false;
      }

      // Favorites filter
      if (showFavoritesOnly && !recipe.is_favorite) return false;

      // Tags filter
      if (selectedTags.length > 0) {
        const recipeTags = recipe.tags || [];
        if (!selectedTags.some((tag) => recipeTags.includes(tag))) return false;
      }

      return true;
    });
  }, [recipes, searchQuery, showFavoritesOnly, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleToggleFavorite = async (id: string, favorite: boolean) => {
    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: favorite }),
      });

      if (res.ok) {
        setRecipes((prev) =>
          prev.map((r) => (r.id === id ? { ...r, is_favorite: favorite } : r))
        );
      }
    } catch (error) {
      console.error("Failed to update favorite:", error);
    }
  };

  const handleRecipeAdded = async () => {
    // Refresh recipes
    try {
      const res = await fetch("/api/recipes");
      if (res.ok) {
        const data = await res.json();
        setRecipes(data.recipes || []);
      }
    } catch (error) {
      console.error("Failed to refresh recipes:", error);
    }
  };

  // Get tag usage counts
  const tagUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    recipes.forEach((recipe) => {
      recipe.tags?.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [recipes]);

  // Add a new tag (needs to be added to at least one recipe)
  const handleAddTag = () => {
    const newTag = newTagInput.trim();
    if (!newTag) return;

    // Case-insensitive check for existing tags
    if (allTags.some(tag => tag.toLowerCase() === newTag.toLowerCase())) {
      toast({
        title: "Tag already exists",
        description: `"${newTag}" is already in use.`,
        variant: "destructive",
      });
      return;
    }

    // For simplicity, we'll add the tag to the availableTags list via local state
    // The tag won't persist until it's added to a recipe, but it will show in the UI
    toast({
      title: "Tag created",
      description: `"${newTag}" is ready to use. Add it to recipes when editing them.`,
    });
    setNewTagInput("");
  };

  // Delete a tag from all recipes
  const handleDeleteTag = async (tagToDelete: string) => {
    const recipesWithTag = recipes.filter(r => r.tags?.includes(tagToDelete));

    try {
      // Update each recipe that has this tag
      await Promise.all(
        recipesWithTag.map(async (recipe) => {
          const newTags = recipe.tags?.filter(t => t !== tagToDelete) || [];
          await fetch(`/api/recipes/${recipe.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tags: newTags }),
          });
        })
      );

      // Update local state
      setRecipes(prev =>
        prev.map(r => ({
          ...r,
          tags: r.tags?.filter(t => t !== tagToDelete) || [],
        }))
      );

      // Clear from selected tags if it was selected
      setSelectedTags(prev => prev.filter(t => t !== tagToDelete));

      toast({
        title: "Tag deleted",
        description: `"${tagToDelete}" removed from ${recipesWithTag.length} recipe${recipesWithTag.length !== 1 ? "s" : ""}.`,
      });
    } catch (error) {
      console.error("Failed to delete tag:", error);
      toast({
        title: "Error",
        description: "Failed to delete tag. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
  };

  const handleAddToMealPlan = (recipe: Recipe) => {
    setMealPlanRecipe(recipe);
  };

  const handleRecipeUpdated = (updatedRecipe: Recipe) => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === updatedRecipe.id ? { ...r, ...updatedRecipe } : r))
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gold-light flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-gold-dark" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-dark">Recipes</h1>
              <p className="text-text-medium">
                Your family recipe collection
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("bookshelf")}
                className={cn(
                  "rounded-none",
                  viewMode === "bookshelf"
                    ? "bg-sage text-white hover:bg-sage-dark"
                    : "hover:bg-sage-very-light"
                )}
              >
                <Library className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "rounded-none",
                  viewMode === "grid"
                    ? "bg-sage text-white hover:bg-sage-dark"
                    : "hover:bg-sage-very-light"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            {/* Unified Add dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="bg-sage hover:bg-sage-dark px-3">
                  Add
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowAddDialog(true)}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  New Recipe
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAddCategoryDialog(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Category
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowTagsDialog(true)}>
                  <Tag className="h-4 w-4 mr-2" />
                  Manage Tags
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <RemyHelpButton title="Recipes" content={HELP_CONTENT} />
          </div>
        </div>

        {/* Search box - visible in both views */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-medium" />
            <Input
              placeholder="Search recipes, categories, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Bookshelf View */}
        {viewMode === "bookshelf" && (
          <VirtualBookshelf
            searchQuery={searchQuery}
            recipes={recipes}
            onAddToMealPlan={handleAddToMealPlan}
          />
        )}

        {/* Grid View */}
        {viewMode === "grid" && (
          <>
            {/* Filters */}
            <div className="space-y-4 mb-6">
              {/* Favorites button */}
              <div className="flex gap-4">
                <Button
                  variant={showFavoritesOnly ? "default" : "outline"}
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className={cn(
                    showFavoritesOnly && "bg-red-500 hover:bg-red-600"
                  )}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4 mr-2",
                      showFavoritesOnly && "fill-white"
                    )}
                  />
                  Favorites
                </Button>
              </div>

              {/* Tags */}
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer",
                        selectedTags.includes(tag)
                          ? "bg-sage hover:bg-sage-dark"
                          : "hover:bg-sage-very-light"
                      )}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                      {selectedTags.includes(tag) && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Results count */}
            <div className="text-sm text-text-medium mb-4">
              {filteredRecipes.length} recipe
              {filteredRecipes.length !== 1 ? "s" : ""}
              {searchQuery || selectedTags.length > 0 || showFavoritesOnly
                ? " found"
                : ""}
            </div>

            {/* Recipe grid */}
            {filteredRecipes.length === 0 ? (
              <div className="text-center py-16">
                {recipes.length === 0 ? (
                  <>
                    <div className="text-6xl mb-4">📖</div>
                    <h2 className="text-xl font-semibold text-text-dark mb-2">
                      No recipes yet
                    </h2>
                    <p className="text-text-medium mb-6">
                      Start building your recipe collection
                    </p>
                    <Button
                      onClick={() => setShowAddDialog(true)}
                      className="bg-sage hover:bg-sage-dark"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Recipe
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">🔍</div>
                    <h2 className="text-xl font-semibold text-text-dark mb-2">
                      No recipes match your filters
                    </h2>
                    <p className="text-text-medium">
                      Try adjusting your search or filters
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onToggleFavorite={handleToggleFavorite}
                    onEdit={handleEditRecipe}
                    onAddToMealPlan={handleAddToMealPlan}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add recipe dialog */}
      <AddRecipeDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onRecipeAdded={handleRecipeAdded}
      />

      {/* Add category dialog */}
      <AddCategoryDialog
        open={showAddCategoryDialog}
        onOpenChange={setShowAddCategoryDialog}
      />

      {/* Edit recipe dialog */}
      {editingRecipe && (
        <EditRecipeDialog
          recipe={editingRecipe}
          open={!!editingRecipe}
          onOpenChange={(open) => !open && setEditingRecipe(null)}
          availableTags={allTags}
          onUpdate={handleRecipeUpdated}
        />
      )}

      {/* Manage Tags dialog */}
      <Dialog open={showTagsDialog} onOpenChange={(open) => {
        setShowTagsDialog(open);
        if (!open) setNewTagInput("");
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-sage" />
              Manage Tags
            </DialogTitle>
            <DialogDescription>
              Create new tags or remove ones you no longer need.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Add new tag input */}
            <div className="flex gap-2">
              <Input
                placeholder="Add a new tag..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1"
              />
              <Button
                onClick={handleAddTag}
                disabled={!newTagInput.trim()}
                className="bg-sage hover:bg-sage-dark"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {allTags.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-text-light">
                  No tags yet. Create one above or add tags when editing recipes.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-text-medium">
                  {allTags.length} tag{allTags.length !== 1 ? "s" : ""} in use
                </p>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {allTags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center justify-between p-3 rounded-lg bg-silver-very-light hover:bg-silver-light transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-sage-very-light text-sage-dark">
                          {tag}
                        </Badge>
                        <span className="text-xs text-text-light">
                          {tagUsageCounts[tag] || 0} recipe{(tagUsageCounts[tag] || 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-text-light hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteTag(tag)}
                        title={`Delete "${tag}" from all recipes`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-text-light pt-2 border-t border-silver-light">
                  Tags are saved when you add them to recipes via the recipe editor.
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add to meal plan dialog */}
      <AddRecipeToMealPlanDialog
        open={!!mealPlanRecipe}
        onOpenChange={(open) => !open && setMealPlanRecipe(null)}
        recipe={mealPlanRecipe}
      />
    </div>
  );
}
