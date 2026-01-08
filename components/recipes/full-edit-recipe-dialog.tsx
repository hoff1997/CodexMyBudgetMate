"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Plus, X, BookOpen, Tag, Clock, Users, UtensilsCrossed, ImagePlus, Check, ChevronDown, Upload, Link2, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecipeCategories } from "@/lib/hooks/use-recipe-categories";
import { AddCategoryDialog } from "@/components/life/recipes/add-category-dialog";
import Image from "next/image";

// Client-side image compression utility
async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
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

interface RecipeBase {
  id: string;
  title: string;
  description?: string;
  source_type: string;
  source_url?: string;
  ingredients?: (string | { item?: string; amount?: string; name?: string })[];
  instructions?: string[] | string;
  prep_time?: string;
  cook_time?: string;
  servings?: string;
  image_url?: string;
  tags?: string[];
  notes?: string;
  is_favorite: boolean;
}

interface FullEditRecipeDialogProps<T extends RecipeBase> {
  recipe: T;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (recipe: T) => void;
  availableTags?: string[];
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

export function FullEditRecipeDialog<T extends RecipeBase>({
  recipe,
  open,
  onOpenChange,
  onUpdate,
  availableTags = [],
}: FullEditRecipeDialogProps<T>) {
  const { categories, isLoading: categoriesLoading } = useRecipeCategories();
  const [saving, setSaving] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [newTag, setNewTag] = useState("");
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<"url" | "upload">("url");
  const [imagePopoverOpen, setImagePopoverOpen] = useState(false);

  // Refs for dynamic scrolling
  const leftPageRef = useRef<HTMLDivElement>(null);
  const rightPageRef = useRef<HTMLDivElement>(null);
  const ingredientsEndRef = useRef<HTMLDivElement>(null);
  const instructionsEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    prep_time: "",
    cook_time: "",
    servings: "",
    image_url: "",
    ingredients: [""] as string[],
    instructions: [""] as string[],
    tags: [] as string[],
    notes: "",
  });

  // All available tags including current ones
  const allAvailableTags = [...new Set([...availableTags, ...formData.tags])].sort();

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open && recipe) {
      // Convert ingredients to string array
      const ingredientStrings = (recipe.ingredients || []).map((ing) => {
        if (typeof ing === "string") return ing;
        if (typeof ing === "object" && ing !== null) {
          const name = ing.item || ing.name || "";
          const amount = ing.amount || "";
          return amount ? `${amount} ${name}`.trim() : name;
        }
        return String(ing);
      });

      // Convert instructions to string array
      let instructionStrings: string[] = [];
      if (Array.isArray(recipe.instructions)) {
        instructionStrings = recipe.instructions;
      } else if (typeof recipe.instructions === "string" && recipe.instructions.trim()) {
        instructionStrings = recipe.instructions.split("\n").filter((s) => s.trim());
      }

      setFormData({
        title: recipe.title || "",
        description: recipe.description || "",
        prep_time: recipe.prep_time || "",
        cook_time: recipe.cook_time || "",
        servings: recipe.servings || "",
        image_url: recipe.image_url || "",
        ingredients: ingredientStrings.length > 0 ? ingredientStrings : [""],
        instructions: instructionStrings.length > 0 ? instructionStrings : [""],
        tags: recipe.tags || [],
        notes: recipe.notes || "",
      });

      loadRecipeCategories();
    }
  }, [open, recipe]);

  const loadRecipeCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/categories`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCategories(data.categoryIds || []);
      }
    } catch (error) {
      console.error("Failed to load recipe categories:", error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleToggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, ""],
    });
    // Scroll to the new ingredient after state updates
    setTimeout(() => {
      ingredientsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
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
    // Scroll to the new instruction after state updates
    setTimeout(() => {
      instructionsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
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

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, trimmedTag],
      });
    }
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  // Handle image file upload with compression
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Check file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setUploadingImage(true);
    try {
      // Compress the image before upload
      const compressedBlob = await compressImage(file, 1200, 0.8);

      // Create form data for upload
      const uploadFormData = new FormData();
      uploadFormData.append('file', compressedBlob, `recipe-${Date.now()}.jpg`);
      uploadFormData.append('recipeId', recipe.id);

      const response = await fetch('/api/upload/recipe-image', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const { url } = await response.json();
      setFormData({ ...formData, image_url: url });
      setImagePopoverOpen(false);
    } catch (error) {
      console.error('Image upload failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      // Update recipe details
      const recipeRes = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          prep_time: formData.prep_time,
          cook_time: formData.cook_time,
          servings: formData.servings,
          image_url: formData.image_url,
          ingredients: formData.ingredients.filter((i) => i.trim()),
          instructions: formData.instructions.filter((i) => i.trim()),
          tags: formData.tags,
          notes: formData.notes,
        }),
      });

      if (!recipeRes.ok) {
        throw new Error("Failed to update recipe");
      }

      // Update categories
      const categoriesRes = await fetch(`/api/recipes/${recipe.id}/categories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds: selectedCategories }),
      });

      if (!categoriesRes.ok) {
        throw new Error("Failed to update categories");
      }

      // Call onUpdate with updated recipe
      onUpdate({
        ...recipe,
        title: formData.title,
        description: formData.description,
        prep_time: formData.prep_time,
        cook_time: formData.cook_time,
        servings: formData.servings,
        image_url: formData.image_url,
        ingredients: formData.ingredients.filter((i) => i.trim()),
        instructions: formData.instructions.filter((i) => i.trim()),
        tags: formData.tags,
        notes: formData.notes,
      } as T);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  // Get selected category names for display
  const selectedCategoryNames = categories
    .filter(c => selectedCategories.includes(c.id))
    .map(c => c.name);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden max-h-[90vh] [&>button]:hidden">
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 z-50 rounded-full p-2.5 transition-all hover:scale-110 shadow-md"
            style={{
              background: '#FFFFFF',
              border: `2px solid ${colors.sage}`,
              color: colors.sageDark,
            }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Book layout */}
          <div
            className="relative"
            style={{
              background: `linear-gradient(135deg, ${colors.silverVeryLight} 0%, #FFFFFF 50%, ${colors.sageVeryLight} 100%)`,
            }}
          >
            <div className="flex min-h-[600px] max-h-[calc(90vh-60px)]">
              {/* Left page - Image & Ingredients */}
              <div
                ref={leftPageRef}
                className="w-1/2 p-6 overflow-y-auto"
                style={{
                  background: `linear-gradient(135deg, ${colors.silverVeryLight} 0%, ${colors.sageVeryLight} 100%)`,
                  borderRight: `1px solid ${colors.sageLight}`,
                }}
              >
                <div className="space-y-5">
                  {/* Recipe Title */}
                  <div>
                    <Input
                      placeholder="Recipe Name"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="text-xl font-semibold border-0 border-b-2 rounded-none bg-transparent px-0 focus-visible:ring-0"
                      style={{ borderColor: colors.sageLight }}
                    />
                  </div>

                  {/* Image section */}
                  <div
                    className="relative rounded-lg overflow-hidden group/image"
                    style={{
                      background: '#FFFFFF',
                      padding: '8px',
                      boxShadow: `0 2px 8px rgba(0, 0, 0, 0.1)`,
                    }}
                  >
                    <div
                      className="relative aspect-[4/3] rounded overflow-hidden"
                      style={{ border: `1px solid ${colors.silverLight}` }}
                    >
                      {formData.image_url ? (
                        <Image
                          src={formData.image_url}
                          alt={formData.title || "Recipe"}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div
                          className="w-full h-full flex flex-col items-center justify-center"
                          style={{ background: `linear-gradient(135deg, ${colors.silverVeryLight} 0%, ${colors.sageVeryLight} 100%)` }}
                        >
                          <UtensilsCrossed className="w-12 h-12 mb-2" style={{ color: colors.sage, opacity: 0.5 }} />
                          <p className="italic text-sm" style={{ color: colors.textMedium }}>
                            No image yet
                          </p>
                        </div>
                      )}

                      {/* Edit image button */}
                      <Popover open={imagePopoverOpen} onOpenChange={setImagePopoverOpen}>
                        <PopoverTrigger asChild>
                          <button
                            className="absolute bottom-2 right-2 rounded-full p-2 opacity-80 group-hover/image:opacity-100 transition-all hover:scale-110 shadow-md"
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
                                className={cn(
                                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                  imageInputMode === "url"
                                    ? "bg-white shadow-sm text-text-dark"
                                    : "text-text-medium hover:text-text-dark"
                                )}
                              >
                                <Link2 className="w-4 h-4" />
                                URL
                              </button>
                              <button
                                onClick={() => setImageInputMode("upload")}
                                className={cn(
                                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                  imageInputMode === "upload"
                                    ? "bg-white shadow-sm text-text-dark"
                                    : "text-text-medium hover:text-text-dark"
                                )}
                              >
                                <Upload className="w-4 h-4" />
                                Upload
                              </button>
                            </div>

                            {/* URL input mode */}
                            {imageInputMode === "url" && (
                              <div className="space-y-2">
                                <Label className="text-sm text-text-medium">Paste image URL</Label>
                                <Input
                                  type="url"
                                  placeholder="https://example.com/image.jpg"
                                  value={formData.image_url}
                                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                  className="text-sm"
                                />
                                <p className="text-xs text-text-light">
                                  Enter a direct link to an image
                                </p>
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
                                  Images are automatically compressed for faster loading
                                </p>
                              </div>
                            )}

                            {/* Clear image button */}
                            {formData.image_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setFormData({ ...formData, image_url: "" })}
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

                  {/* Time & Servings */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: colors.sageVeryLight }}>
                      <Clock className="w-4 h-4" style={{ color: colors.sage }} />
                      <Input
                        placeholder="Prep"
                        value={formData.prep_time}
                        onChange={(e) => setFormData({ ...formData, prep_time: e.target.value })}
                        className="h-7 text-xs border-0 bg-transparent px-1"
                      />
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: colors.sageVeryLight }}>
                      <Clock className="w-4 h-4" style={{ color: colors.sage }} />
                      <Input
                        placeholder="Cook"
                        value={formData.cook_time}
                        onChange={(e) => setFormData({ ...formData, cook_time: e.target.value })}
                        className="h-7 text-xs border-0 bg-transparent px-1"
                      />
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: colors.sageVeryLight }}>
                      <Users className="w-4 h-4" style={{ color: colors.sage }} />
                      <Input
                        placeholder="Serves"
                        value={formData.servings}
                        onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
                        className="h-7 text-xs border-0 bg-transparent px-1"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <Textarea
                      placeholder="What makes this recipe special?"
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="text-sm resize-none"
                      style={{ background: '#FFFFFF' }}
                    />
                  </div>

                  {/* Ingredients */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="text-sm font-semibold" style={{ color: colors.textDark }}>
                        Ingredients
                      </h4>
                      <div className="flex-1 h-[1px]" style={{ background: colors.sageLight }} />
                    </div>
                    <div className="space-y-2">
                      {formData.ingredients.map((ingredient, index) => (
                        <div key={index} className="flex items-center gap-2 group">
                          <div
                            className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center"
                            style={{ borderColor: colors.sageLight, background: colors.sageVeryLight }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: colors.sageLight }} />
                          </div>
                          <Input
                            placeholder="e.g., 2 cups flour"
                            value={ingredient}
                            onChange={(e) => updateIngredient(index, e.target.value)}
                            className="h-8 text-sm flex-1"
                            style={{ background: '#FFFFFF' }}
                          />
                          {formData.ingredients.length > 1 && (
                            <button
                              onClick={() => removeIngredient(index)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                              style={{ color: colors.textMedium }}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          {/* Add button on the last row */}
                          {index === formData.ingredients.length - 1 && (
                            <button
                              onClick={addIngredient}
                              className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors hover:bg-sage-very-light"
                              style={{ color: colors.sage }}
                              title="Add ingredient"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {/* Scroll marker for new ingredients */}
                      <div ref={ingredientsEndRef} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right page - Instructions, Categories, Tags */}
              <div
                ref={rightPageRef}
                className="w-1/2 p-6 overflow-y-auto"
                style={{
                  background: `linear-gradient(135deg, #FFFFFF 0%, ${colors.sageVeryLight} 100%)`,
                }}
              >
                <div className="space-y-5">
                  {/* Instructions */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="text-sm font-semibold" style={{ color: colors.textDark }}>
                        Instructions
                      </h4>
                      <div className="flex-1 h-[1px]" style={{ background: colors.sageLight }} />
                    </div>
                    <div className="space-y-3">
                      {formData.instructions.map((instruction, index) => (
                        <div key={index} className="flex items-start gap-2 group">
                          <div
                            className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold mt-1"
                            style={{ background: colors.sageVeryLight, color: colors.sageDark, border: `1px solid ${colors.sageLight}` }}
                          >
                            {index + 1}
                          </div>
                          <Textarea
                            placeholder="Describe this step..."
                            rows={2}
                            value={instruction}
                            onChange={(e) => updateInstruction(index, e.target.value)}
                            className="flex-1 text-sm resize-none"
                            style={{ background: '#FFFFFF' }}
                          />
                          {formData.instructions.length > 1 && (
                            <button
                              onClick={() => removeInstruction(index)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 mt-1"
                              style={{ color: colors.textMedium }}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          {/* Add button on the last row */}
                          {index === formData.instructions.length - 1 && (
                            <button
                              onClick={addInstruction}
                              className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors hover:bg-sage-very-light mt-1"
                              style={{ color: colors.sage }}
                              title="Add step"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {/* Scroll marker for new instructions */}
                      <div ref={instructionsEndRef} />
                    </div>
                  </div>

                  {/* Categories dropdown */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-4 h-4" style={{ color: colors.sage }} />
                      <h4 className="text-sm font-semibold" style={{ color: colors.textDark }}>
                        Categories
                      </h4>
                    </div>
                    {categoriesLoading || loadingCategories ? (
                      <div className="flex items-center gap-2 text-sm" style={{ color: colors.textMedium }}>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </div>
                    ) : (
                      <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                        <PopoverTrigger asChild>
                          <button
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left"
                            style={{
                              background: '#FFFFFF',
                              border: `1px solid ${colors.sageLight}`,
                              color: selectedCategoryNames.length > 0 ? colors.textDark : colors.textMedium,
                            }}
                          >
                            <span className="truncate">
                              {selectedCategoryNames.length > 0
                                ? selectedCategoryNames.join(", ")
                                : "Select categories..."}
                            </span>
                            <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" style={{ color: colors.textMedium }} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="start">
                          {/* Add Category option at top */}
                          <button
                            onClick={() => {
                              setCategoryPopoverOpen(false);
                              setShowAddCategoryDialog(true);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium mb-2 transition-colors"
                            style={{ color: colors.sage, background: colors.sageVeryLight }}
                          >
                            <Plus className="w-4 h-4" />
                            Add New Category
                          </button>
                          <div className="border-t my-2" style={{ borderColor: colors.silverLight }} />
                          {categories.length === 0 ? (
                            <p className="text-sm px-3 py-2" style={{ color: colors.textMedium }}>
                              No categories yet
                            </p>
                          ) : (
                            <div className="max-h-48 overflow-y-auto space-y-1">
                              {categories.map((category) => (
                                <button
                                  key={category.id}
                                  onClick={() => handleToggleCategory(category.id)}
                                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-silver-very-light"
                                >
                                  <div
                                    className={cn(
                                      "w-4 h-4 rounded border flex items-center justify-center",
                                      selectedCategories.includes(category.id) ? "border-sage bg-sage" : "border-silver-light"
                                    )}
                                  >
                                    {selectedCategories.includes(category.id) && (
                                      <Check className="w-3 h-3 text-white" />
                                    )}
                                  </div>
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: category.color }}
                                  />
                                  <span className="truncate" style={{ color: colors.textDark }}>
                                    {category.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    )}
                    {/* Show selected categories as badges */}
                    {selectedCategoryNames.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {categories
                          .filter(c => selectedCategories.includes(c.id))
                          .map((cat) => (
                            <Badge
                              key={cat.id}
                              variant="secondary"
                              className="text-xs pr-1"
                              style={{ background: cat.color + '20', color: colors.textDark, border: `1px solid ${cat.color}40` }}
                            >
                              {cat.name}
                              <button
                                onClick={() => handleToggleCategory(cat.id)}
                                className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Tags dropdown */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-4 h-4" style={{ color: colors.sage }} />
                      <h4 className="text-sm font-semibold" style={{ color: colors.textDark }}>
                        Tags
                      </h4>
                    </div>
                    <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                      <PopoverTrigger asChild>
                        <button
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left"
                          style={{
                            background: '#FFFFFF',
                            border: `1px solid ${colors.sageLight}`,
                            color: formData.tags.length > 0 ? colors.textDark : colors.textMedium,
                          }}
                        >
                          <span className="truncate">
                            {formData.tags.length > 0
                              ? formData.tags.join(", ")
                              : "Select or add tags..."}
                          </span>
                          <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" style={{ color: colors.textMedium }} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2" align="start">
                        {/* Add new tag input at top */}
                        <div className="flex gap-2 mb-2">
                          <Input
                            placeholder="New tag..."
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addTag(newTag);
                              }
                            }}
                            className="h-8 text-sm flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={() => addTag(newTag)}
                            disabled={!newTag.trim()}
                            className="h-8 px-2 bg-sage hover:bg-sage-dark"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="border-t my-2" style={{ borderColor: colors.silverLight }} />
                        {allAvailableTags.length === 0 ? (
                          <p className="text-sm px-3 py-2" style={{ color: colors.textMedium }}>
                            No tags yet - create one above
                          </p>
                        ) : (
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {allAvailableTags.map((tag) => (
                              <button
                                key={tag}
                                onClick={() => {
                                  if (formData.tags.includes(tag)) {
                                    removeTag(tag);
                                  } else {
                                    addTag(tag);
                                  }
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-silver-very-light"
                              >
                                <div
                                  className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center",
                                    formData.tags.includes(tag) ? "border-sage bg-sage" : "border-silver-light"
                                  )}
                                >
                                  {formData.tags.includes(tag) && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <span className="truncate" style={{ color: colors.textDark }}>
                                  {tag}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                    {/* Show selected tags as badges */}
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {formData.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs pr-1"
                            style={{ background: colors.sageVeryLight, color: colors.sageDark }}
                          >
                            {tag}
                            <button
                              onClick={() => removeTag(tag)}
                              className="ml-1 hover:bg-sage/20 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <StickyNote className="w-4 h-4" style={{ color: colors.sage }} />
                      <h4 className="text-sm font-semibold" style={{ color: colors.textDark }}>
                        Notes
                      </h4>
                    </div>
                    <Textarea
                      placeholder="Add any personal notes, tips, or modifications..."
                      rows={4}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="text-sm resize-none"
                      style={{ background: '#FFFFFF' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Cancel and Save */}
            <div
              className="flex items-center justify-end gap-3 px-6 py-3"
              style={{
                borderTop: `1px solid ${colors.sageLight}`,
                background: colors.sageVeryLight,
              }}
            >
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.title.trim() || saving}
                className="bg-sage hover:bg-sage-dark px-8"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <AddCategoryDialog
        open={showAddCategoryDialog}
        onOpenChange={setShowAddCategoryDialog}
      />
    </>
  );
}
