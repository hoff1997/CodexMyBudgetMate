"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, Check, Upload, X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

interface ChoreCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  assignmentId: string;
  choreName: string;
  choreIcon: string;
  requiresPhoto: boolean;
  onCompleted: () => void;
}

export function ChoreCompletionDialog({
  open,
  onOpenChange,
  childId,
  assignmentId,
  choreName,
  choreIcon,
  requiresPhoto,
  onCompleted,
}: ChoreCompletionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase storage
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "chore-photos");
      formData.append("path", `${childId}/${assignmentId}-${Date.now()}`);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        // If upload API doesn't exist, use data URL as fallback
        setPhotoUrl(reader.result as string);
        toast.info("Photo saved locally");
      } else {
        const data = await res.json();
        setPhotoUrl(data.url);
      }
    } catch (error) {
      // Use data URL as fallback
      setPhotoUrl(photoPreview);
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async () => {
    if (requiresPhoto && !photoUrl) {
      toast.error("Please add a photo before submitting");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/kids/${childId}/chores/${assignmentId}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photo_url: photoUrl,
            notes: notes.trim() || null,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete chore");
      }

      toast.success("Chore submitted for approval!");
      onCompleted();
      onOpenChange(false);

      // Reset form
      setNotes("");
      setPhotoUrl(null);
      setPhotoPreview(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to complete chore");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{choreIcon}</span>
            Complete Chore
          </DialogTitle>
          <DialogDescription>
            Mark &quot;{choreName}&quot; as complete
            {requiresPhoto && " (photo proof required)"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Photo upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Photo Proof {requiresPhoto && <span className="text-red-500">*</span>}
            </Label>

            {photoPreview ? (
              <div className="relative rounded-lg overflow-hidden border border-silver-light h-48">
                <Image
                  src={photoPreview}
                  alt="Proof"
                  fill
                  className="object-cover"
                />
                <button
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-silver-light rounded-lg cursor-pointer hover:border-sage-light transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2 text-text-medium">
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8" />
                      <span className="text-sm">
                        Tap to take or upload a photo
                      </span>
                    </>
                  )}
                </div>
              </label>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about completing this chore..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isUploading || (requiresPhoto && !photoUrl)}
              className="bg-sage hover:bg-sage-dark"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Submit for Approval
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
