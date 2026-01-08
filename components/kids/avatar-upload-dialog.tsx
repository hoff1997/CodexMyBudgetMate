"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Upload, Loader2, X, User } from "lucide-react";
import { useToast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/cn";

interface AvatarUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatarUrl: string | null;
  entityType: "child" | "user";
  entityId: string;
  entityName: string;
  onSuccess?: (newAvatarUrl: string) => void;
}

const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=happy",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=cool",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=star",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=love",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=smile",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=joy",
  "https://api.dicebear.com/7.x/thumbs/svg?seed=felix",
  "https://api.dicebear.com/7.x/thumbs/svg?seed=luna",
  "https://api.dicebear.com/7.x/thumbs/svg?seed=max",
  "https://api.dicebear.com/7.x/thumbs/svg?seed=mia",
  "https://api.dicebear.com/7.x/thumbs/svg?seed=leo",
  "https://api.dicebear.com/7.x/thumbs/svg?seed=zoe",
];

export function AvatarUploadDialog({
  open,
  onOpenChange,
  currentAvatarUrl,
  entityType,
  entityId,
  entityName,
  onSuccess,
}: AvatarUploadDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(currentAvatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
      setSelectedAvatar(null);
    };
    reader.readAsDataURL(file);
  };

  const handlePresetSelect = (url: string) => {
    setSelectedAvatar(url);
    setPreviewUrl(null);
  };

  const handleSave = async () => {
    const avatarUrl = previewUrl || selectedAvatar;
    if (!avatarUrl) return;

    setIsUploading(true);

    try {
      // Determine the API endpoint based on entity type
      const endpoint = entityType === "child"
        ? `/api/kids/profiles/${entityId}`
        : `/api/user`;

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: avatarUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update avatar");
      }

      toast({
        title: "Avatar updated",
        description: `${entityName}'s profile picture has been updated`,
      });

      onSuccess?.(avatarUrl);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update avatar",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsUploading(true);

    try {
      const endpoint = entityType === "child"
        ? `/api/kids/profiles/${entityId}`
        : `/api/user`;

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: null }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove avatar");
      }

      toast({
        title: "Avatar removed",
        description: `${entityName}'s profile picture has been removed`,
      });

      onSuccess?.("");
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to remove avatar",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const displayAvatar = previewUrl || selectedAvatar || currentAvatarUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Profile Picture</DialogTitle>
          <DialogDescription>
            Choose an avatar for {entityName} or upload a custom photo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current/Preview Avatar */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-sage-light flex items-center justify-center text-4xl border-4 border-sage overflow-hidden">
                {displayAvatar ? (
                  <Image
                    src={displayAvatar}
                    alt={entityName}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12 text-sage-dark" />
                )}
              </div>
              {displayAvatar && (
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute -bottom-2 -right-2 h-8 w-8 p-0 rounded-full bg-white"
                  onClick={handleRemove}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Upload Button */}
          <div className="flex justify-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Photo
            </Button>
          </div>

          {/* Preset Avatars */}
          <div>
            <p className="text-sm text-text-medium mb-2">Or choose an avatar:</p>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_AVATARS.map((url, i) => (
                <button
                  key={i}
                  onClick={() => handlePresetSelect(url)}
                  className={cn(
                    "w-10 h-10 rounded-full overflow-hidden border-2 transition-all",
                    selectedAvatar === url
                      ? "border-sage scale-110"
                      : "border-transparent hover:border-sage-light"
                  )}
                >
                  <Image
                    src={url}
                    alt={`Avatar ${i + 1}`}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isUploading || (!previewUrl && !selectedAvatar)}
            className="bg-sage hover:bg-sage-dark"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
