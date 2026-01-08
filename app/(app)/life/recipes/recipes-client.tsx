"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RecipeCard, AddRecipeDialog } from "@/components/recipes";
import { RemyHelpButton } from "@/components/shared/remy-help-button";
import { Plus, Search, Heart, BookOpen, X } from "lucide-react";

const HELP_CONTENT = {
  tips: [
    "Add tags to recipes for easy filtering (e.g., 'quick', 'kid-friendly')",
    "Mark your favourite recipes with a heart for quick access",
    "Import recipes from websites you love",
  ],
  features: [
    "Save recipes from websites, cookbooks, or family traditions",
    "Filter by tags, favourites, or search by name",
    "Link recipes directly to your meal plan",
    "Store prep time, cook time, and servings",
  ],
  faqs: [
    {
      question: "How do I add a recipe from a website?",
      answer: "Click 'Add Recipe' and paste the URL. We'll try to import the recipe details automatically.",
    },
    {
      question: "Can I organise recipes with tags?",
      answer: "Yes! Add tags like 'dinner', 'vegetarian', or 'under-30-min' when creating or editing a recipe.",
    },
    {
      question: "How do I mark a recipe as a favourite?",
      answer: "Click the heart icon on any recipe card to add it to your favourites.",
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
}

interface RecipesClientProps {
  initialRecipes: Recipe[];
  availableTags: string[];
}

export function RecipesClient({
  initialRecipes,
  availableTags,
}: RecipesClientProps) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // All tags including those from current recipes
  const allTags = useMemo(() => {
    const tags = new Set(availableTags);
    recipes.forEach((recipe) => {
      recipe.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [availableTags, recipes]);

  // Filter recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = recipe.title.toLowerCase().includes(query);
        const matchesDescription = recipe.description
          ?.toLowerCase()
          .includes(query);
        if (!matchesTitle && !matchesDescription) return false;
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
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-sage hover:bg-sage-dark"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Recipe
            </Button>
            <RemyHelpButton title="Recipes" content={HELP_CONTENT} />
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-4 mb-6">
          {/* Search and favorites */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-medium" />
              <Input
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
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
              />
            ))}
          </div>
        )}
      </div>

      {/* Add recipe dialog */}
      <AddRecipeDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onRecipeAdded={handleRecipeAdded}
      />
    </div>
  );
}
