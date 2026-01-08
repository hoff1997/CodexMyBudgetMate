"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ImageIcon } from "lucide-react";
import type { WishlistItem } from "@/lib/types/wishlist";

interface AddWishlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    name: string;
    description: string | null;
    estimated_cost: number | null;
    image_url: string | null;
    link_url: string | null;
  }) => Promise<void>;
  editItem?: WishlistItem | null;
}

export function AddWishlistDialog({
  open,
  onOpenChange,
  onSave,
  editItem,
}: AddWishlistDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageError, setImageError] = useState(false);

  const isEditing = Boolean(editItem);

  // Reset form when dialog opens/closes or editItem changes
  useEffect(() => {
    if (open) {
      if (editItem) {
        setName(editItem.name);
        setDescription(editItem.description || "");
        setEstimatedCost(editItem.estimated_cost?.toString() || "");
        setImageUrl(editItem.image_url || "");
        setLinkUrl(editItem.link_url || "");
      } else {
        resetForm();
      }
      setImageError(false);
    }
  }, [open, editItem]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setEstimatedCost("");
    setImageUrl("");
    setLinkUrl("");
    setImageError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    setIsSubmitting(true);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
        image_url: imageUrl.trim() || null,
        link_url: linkUrl.trim() || null,
      });

      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUrlChange = (url: string) => {
    setImageUrl(url);
    setImageError(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Wishlist Item" : "Add to Wishlist"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What do you want?"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why do you want this? Any specific details?"
              rows={2}
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Estimated Price ($)</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Image URL with Preview */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => handleImageUrlChange(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
            {imageUrl && (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-silver-very-light border border-silver-light">
                {!imageError ? (
                  <Image
                    src={imageUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                    onError={() => setImageError(true)}
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-text-light">
                    <ImageIcon className="h-6 w-6 mb-1" />
                    <span className="text-xs">Invalid URL</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Link URL */}
          <div className="space-y-2">
            <Label htmlFor="linkUrl">Product Link</Label>
            <Input
              id="linkUrl"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://shop.example.com/product"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="bg-sage hover:bg-sage-dark"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? "Saving..." : "Adding..."}
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Add to Wishlist"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
