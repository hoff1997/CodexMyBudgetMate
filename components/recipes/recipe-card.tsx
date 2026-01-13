"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Users, ExternalLink, Heart, MoreVertical, Tag, Calendar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import Image from "next/image";

interface RecipeCardProps {
  recipe: {
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
  };
  onToggleFavorite?: (id: string, favorite: boolean) => void;
  onEdit?: (recipe: RecipeCardProps["recipe"]) => void;
  onAddToMealPlan?: (recipe: RecipeCardProps["recipe"]) => void;
}

export function RecipeCard({ recipe, onToggleFavorite, onEdit, onAddToMealPlan }: RecipeCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/life/recipes/${recipe.id}`}>
        <div className="aspect-video bg-silver-very-light relative">
          {recipe.image_url ? (
            <Image
              src={recipe.image_url}
              alt={recipe.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-4xl">
              🍽️
            </div>
          )}
          {recipe.source_type === "link" && recipe.source_url && (
            <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5">
              <ExternalLink className="h-4 w-4 text-text-medium" />
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link href={`/life/recipes/${recipe.id}`}>
            <h3 className="font-semibold text-text-dark hover:text-sage line-clamp-2">
              {recipe.title}
            </h3>
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                onToggleFavorite?.(recipe.id, !recipe.is_favorite);
              }}
            >
              <Heart
                className={`h-4 w-4 ${
                  recipe.is_favorite
                    ? "fill-red-500 text-red-500"
                    : "text-text-light"
                }`}
              />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4 text-text-light" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    onAddToMealPlan?.(recipe);
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Add to Meal Plan
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    onEdit?.(recipe);
                  }}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Edit Tags & Categories
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {recipe.description && (
          <p className="text-sm text-text-medium mb-3 line-clamp-2">
            {recipe.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-text-medium mb-3">
          {(recipe.prep_time || recipe.cook_time) && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {recipe.prep_time && recipe.cook_time
                ? `${recipe.prep_time} + ${recipe.cook_time}`
                : recipe.prep_time || recipe.cook_time}
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {recipe.servings}
            </div>
          )}
        </div>

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-sage-very-light text-sage-dark px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="text-xs text-text-medium">
                +{recipe.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
