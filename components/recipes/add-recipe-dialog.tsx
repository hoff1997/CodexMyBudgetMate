"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2, PenLine, Loader2, Plus, X, Check, StickyNote } from "lucide-react";
import { cn } from "@/lib/cn";
import Image from "next/image";

interface AddRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecipeAdded: () => void;
}

interface ScrapedData {
  title: string;
  description?: string;
  ingredients?: string[];
  instructions?: string[];
  prep_time?: string;
  cook_time?: string;
  servings?: string;
  images: string[];
  method: string;
  success: boolean;
}

export function AddRecipeDialog({
  open,
  onOpenChange,
  onRecipeAdded,
}: AddRecipeDialogProps) {
  const [activeTab, setActiveTab] = useState<"link" | "typed">("link");
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Form state for typed recipe
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    prep_time: "",
    cook_time: "",
    servings: "",
    image_url: "",
    ingredients: [""],
    instructions: [""],
    tags: [] as string[],
    notes: "",
  });
  const [newTag, setNewTag] = useState("");

  const handleScrape = async () => {
    if (!url.trim()) return;

    setScraping(true);
    try {
      const res = await fetch("/api/recipes/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (data.scraped_data) {
        setScrapedData(data.scraped_data);
        if (data.scraped_data.images?.length > 0) {
          setSelectedImage(data.scraped_data.images[0]);
        }
      }
    } catch (error) {
      console.error("Scraping failed:", error);
    } finally {
      setScraping(false);
    }
  };

  const handleSaveScraped = async () => {
    if (!scrapedData) return;

    setSaving(true);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: scrapedData.title,
          description: scrapedData.description,
          source_type: "link",
          source_url: url,
          ingredients: scrapedData.ingredients,
          instructions: scrapedData.instructions,
          prep_time: scrapedData.prep_time,
          cook_time: scrapedData.cook_time,
          servings: scrapedData.servings,
          image_url: selectedImage,
          scraped_data: scrapedData,
          tags: [],
        }),
      });

      if (res.ok) {
        onRecipeAdded();
        resetForm();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTyped = async () => {
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          source_type: "typed",
          ingredients: formData.ingredients.filter((i) => i.trim()),
          instructions: formData.instructions.filter((i) => i.trim()),
          prep_time: formData.prep_time,
          cook_time: formData.cook_time,
          servings: formData.servings,
          image_url: formData.image_url,
          tags: formData.tags,
          notes: formData.notes,
        }),
      });

      if (res.ok) {
        onRecipeAdded();
        resetForm();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setUrl("");
    setScrapedData(null);
    setSelectedImage("");
    setFormData({
      title: "",
      description: "",
      prep_time: "",
      cook_time: "",
      servings: "",
      image_url: "",
      ingredients: [""],
      instructions: [""],
      tags: [],
      notes: "",
    });
    setNewTag("");
  };

  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, ""],
    });
  };

  const removeIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index),
    });
  };

  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = value;
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const addInstruction = () => {
    setFormData({
      ...formData,
      instructions: [...formData.instructions, ""],
    });
  };

  const removeInstruction = (index: number) => {
    setFormData({
      ...formData,
      instructions: formData.instructions.filter((_, i) => i !== index),
    });
  };

  const updateInstruction = (index: number, value: string) => {
    const newInstructions = [...formData.instructions];
    newInstructions[index] = value;
    setFormData({ ...formData, instructions: newInstructions });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Recipe</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "link" | "typed")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              From Link
            </TabsTrigger>
            <TabsTrigger value="typed" className="flex items-center gap-2">
              <PenLine className="h-4 w-4" />
              Type It In
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="url">Recipe URL</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com/recipe..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={scraping}
                />
                <Button
                  onClick={handleScrape}
                  disabled={!url.trim() || scraping}
                  className="bg-sage hover:bg-sage-dark"
                >
                  {scraping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Fetch"
                  )}
                </Button>
              </div>
            </div>

            {scrapedData && scrapedData.success && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2 text-sage">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Recipe found!</span>
                </div>

                <div className="bg-silver-very-light p-4 rounded-lg space-y-3">
                  <h3 className="font-semibold text-lg">{scrapedData.title}</h3>
                  {scrapedData.description && (
                    <p className="text-sm text-text-medium">
                      {scrapedData.description}
                    </p>
                  )}

                  <div className="flex gap-4 text-sm text-text-medium">
                    {scrapedData.prep_time && (
                      <span>Prep: {scrapedData.prep_time}</span>
                    )}
                    {scrapedData.cook_time && (
                      <span>Cook: {scrapedData.cook_time}</span>
                    )}
                    {scrapedData.servings && (
                      <span>Serves: {scrapedData.servings}</span>
                    )}
                  </div>

                  {scrapedData.ingredients &&
                    scrapedData.ingredients.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">
                          Ingredients ({scrapedData.ingredients.length})
                        </h4>
                        <ul className="text-sm text-text-medium list-disc list-inside max-h-32 overflow-y-auto">
                          {scrapedData.ingredients
                            .slice(0, 5)
                            .map((ing, i) => (
                              <li key={i}>{ing}</li>
                            ))}
                          {scrapedData.ingredients.length > 5 && (
                            <li className="text-text-light">
                              +{scrapedData.ingredients.length - 5} more...
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                </div>

                {scrapedData.images && scrapedData.images.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select an image</Label>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {scrapedData.images.slice(0, 6).map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedImage(img)}
                          className={cn(
                            "shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition",
                            selectedImage === img
                              ? "border-sage"
                              : "border-transparent hover:border-silver"
                          )}
                        >
                          <Image
                            src={img}
                            alt=""
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={saving}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveScraped}
                    disabled={saving}
                    className="flex-1 bg-sage hover:bg-sage-dark"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Save Recipe
                  </Button>
                </div>
              </div>
            )}

            {scrapedData && !scrapedData.success && (
              <div className="text-center py-6 text-text-medium">
                <p>
                  Couldn&apos;t automatically extract recipe data from this
                  site.
                </p>
                <p className="text-sm mt-1">
                  Try switching to &quot;Type It In&quot; to add it manually.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="typed" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Recipe Name *</Label>
              <Input
                id="title"
                placeholder="e.g., Grandma's Chocolate Chip Cookies"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What makes this recipe special?"
                rows={2}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="prep_time">Prep Time</Label>
                <Input
                  id="prep_time"
                  placeholder="15 min"
                  value={formData.prep_time}
                  onChange={(e) =>
                    setFormData({ ...formData, prep_time: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cook_time">Cook Time</Label>
                <Input
                  id="cook_time"
                  placeholder="30 min"
                  value={formData.cook_time}
                  onChange={(e) =>
                    setFormData({ ...formData, cook_time: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="servings">Servings</Label>
                <Input
                  id="servings"
                  placeholder="4"
                  value={formData.servings}
                  onChange={(e) =>
                    setFormData({ ...formData, servings: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                type="url"
                placeholder="https://..."
                value={formData.image_url}
                onChange={(e) =>
                  setFormData({ ...formData, image_url: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Ingredients</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {formData.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="e.g., 2 cups flour"
                      value={ingredient}
                      onChange={(e) => updateIngredient(index, e.target.value)}
                    />
                    {formData.ingredients.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeIngredient(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Add button on the last row */}
                    {index === formData.ingredients.length - 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addIngredient}
                        className="text-sage hover:text-sage-dark hover:bg-sage-very-light"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Instructions</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {formData.instructions.map((instruction, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-sm text-text-medium pt-2 shrink-0">
                      {index + 1}.
                    </span>
                    <Textarea
                      placeholder="Describe this step..."
                      rows={2}
                      value={instruction}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      className="flex-1"
                    />
                    {formData.instructions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInstruction(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Add button on the last row */}
                    {index === formData.instructions.length - 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addInstruction}
                        className="text-sage hover:text-sage-dark hover:bg-sage-very-light"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Add
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-sage-very-light text-sage-dark px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Add any personal notes, tips, or modifications..."
                rows={3}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTyped}
                disabled={!formData.title.trim() || saving}
                className="flex-1 bg-sage hover:bg-sage-dark"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Save Recipe
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
