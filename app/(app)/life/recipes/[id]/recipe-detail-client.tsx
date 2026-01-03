"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Clock,
  Users,
  Heart,
  ExternalLink,
  MoreVertical,
  Trash2,
  Edit,
  Calendar,
} from "lucide-react";

interface Recipe {
  id: string;
  title: string;
  description?: string;
  source_type: string;
  source_url?: string;
  ingredients?: string[];
  instructions?: string[];
  prep_time?: string;
  cook_time?: string;
  servings?: string;
  image_url?: string;
  tags?: string[];
  is_favorite: boolean;
  created_at: string;
}

interface RecipeDetailClientProps {
  recipe: Recipe;
}

export function RecipeDetailClient({ recipe }: RecipeDetailClientProps) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(recipe.is_favorite);
  const [deleting, setDeleting] = useState(false);

  const handleToggleFavorite = async () => {
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: !isFavorite }),
      });

      if (res.ok) {
        setIsFavorite(!isFavorite);
      }
    } catch (error) {
      console.error("Failed to update favorite:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this recipe?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/life/recipes");
      }
    } catch (error) {
      console.error("Failed to delete recipe:", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-4xl mx-auto px-4 py-6">
        {/* Back button */}
        <Link
          href="/life/recipes"
          className="inline-flex items-center gap-2 text-text-medium hover:text-text-dark mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Recipes
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-text-dark mb-2">
              {recipe.title}
            </h1>
            {recipe.description && (
              <p className="text-text-medium">{recipe.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleFavorite}
            >
              <Heart
                className={`h-5 w-5 ${
                  isFavorite ? "fill-red-500 text-red-500" : "text-text-light"
                }`}
              />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Calendar className="h-4 w-4 mr-2" />
                  Add to Meal Plan
                </DropdownMenuItem>
                {recipe.source_url && (
                  <DropdownMenuItem asChild>
                    <a
                      href={recipe.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Original
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Recipe
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Image */}
        {recipe.image_url && (
          <div className="aspect-video rounded-xl overflow-hidden mb-6 relative">
            <Image
              src={recipe.image_url}
              alt={recipe.title}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap gap-4 mb-6">
          {recipe.prep_time && (
            <div className="flex items-center gap-2 text-text-medium">
              <Clock className="h-4 w-4" />
              <span>Prep: {recipe.prep_time}</span>
            </div>
          )}
          {recipe.cook_time && (
            <div className="flex items-center gap-2 text-text-medium">
              <Clock className="h-4 w-4" />
              <span>Cook: {recipe.cook_time}</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-2 text-text-medium">
              <Users className="h-4 w-4" />
              <span>Serves {recipe.servings}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {recipe.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-sage-very-light text-sage-dark"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Ingredients */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Ingredients</CardTitle>
            </CardHeader>
            <CardContent>
              {recipe.ingredients && recipe.ingredients.length > 0 ? (
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-sage mt-1">•</span>
                      <span className="text-sm">{ingredient}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-text-medium text-sm">
                  No ingredients listed
                </p>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              {recipe.instructions && recipe.instructions.length > 0 ? (
                <ol className="space-y-4">
                  {recipe.instructions.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sage text-white text-sm font-medium shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-sm pt-0.5">{step}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-text-medium text-sm">
                  No instructions listed
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Source */}
        {recipe.source_url && (
          <div className="mt-6 text-center">
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              View original recipe
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
