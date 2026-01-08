"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Camera } from "lucide-react";
import { useToast } from "@/lib/hooks/use-toast";
import { AvatarUploadDialog } from "./avatar-upload-dialog";
import Image from "next/image";

interface ChildProfile {
  id: string;
  name: string;
  date_of_birth: string | null;
  avatar_url: string | null;
  family_access_code: string;
}

interface EditChildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: ChildProfile | null;
  onSuccess?: () => void;
}

export function EditChildDialog({
  open,
  onOpenChange,
  child,
  onSuccess,
}: EditChildDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);

  // Reset form when child changes
  useEffect(() => {
    if (child) {
      setName(child.name);
      setDateOfBirth(child.date_of_birth || "");
      setCurrentAvatarUrl(child.avatar_url);
      setNewPin("");
      setConfirmNewPin("");
      setError("");
    }
  }, [child]);

  const handleClose = () => {
    setError("");
    setNewPin("");
    setConfirmNewPin("");
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!child) return;
    setError("");

    // Validation
    if (!name.trim()) {
      setError("Please enter your child's name");
      return;
    }

    // If changing PIN, validate it
    if (newPin) {
      if (!/^\d{4}$/.test(newPin)) {
        setError("PIN must be exactly 4 digits");
        return;
      }
      if (newPin !== confirmNewPin) {
        setError("PINs don't match");
        return;
      }
    }

    setIsLoading(true);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        date_of_birth: dateOfBirth || null,
      };

      // Only include PIN if it's being changed
      if (newPin) {
        payload.pin = newPin;
      }

      const res = await fetch(`/api/kids/profiles/${child.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update");
        return;
      }

      toast({
        title: "Updated",
        description: `${name}'s details have been saved`,
      });

      onSuccess?.();
      handleClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!child) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/kids/profiles/${child.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      toast({
        title: "Deleted",
        description: `${child.name}'s profile has been removed`,
      });

      setDeleteDialogOpen(false);
      onSuccess?.();
      handleClose();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!child) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {child.name}&apos;s Details</DialogTitle>
            <DialogDescription>
              Update your child&apos;s profile information. Leave PIN fields empty to keep the current PIN.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-gold-light text-gold-dark rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Avatar Section */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setAvatarDialogOpen(true)}
                className="relative group"
              >
                <div className="w-20 h-20 rounded-full bg-sage-light flex items-center justify-center text-3xl border-2 border-sage overflow-hidden">
                  {currentAvatarUrl ? (
                    <Image
                      src={currentAvatarUrl}
                      alt={child.name}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    "👤"
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </button>
            </div>
            <p className="text-xs text-text-light text-center">
              Click to change photo
            </p>

            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-dob">Date of Birth</Label>
              <Input
                id="edit-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-text-medium mb-3">
                Change PIN (optional)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-pin">New PIN</Label>
                  <Input
                    id="edit-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="••••"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    disabled={isLoading}
                    className="text-center text-xl tracking-widest"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-confirm-pin">Confirm</Label>
                  <Input
                    id="edit-confirm-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="••••"
                    value={confirmNewPin}
                    onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ""))}
                    disabled={isLoading}
                    className="text-center text-xl tracking-widest"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-text-light">Family Code</Label>
              <div className="p-2 bg-gray-100 rounded text-sm font-mono text-center">
                {child.family_access_code}
              </div>
              <p className="text-xs text-text-light">
                Family codes cannot be changed
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <div className="flex gap-2 sm:ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !name.trim()}
                  className="bg-sage hover:bg-sage-dark"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {child.name}&apos;s Profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {child.name}&apos;s profile including all their:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Bank account connections</li>
                <li>Chore history and streaks</li>
                <li>Invoice records</li>
                <li>Goals and savings progress</li>
              </ul>
              <p className="mt-3 font-medium text-red-600">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Profile"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Avatar Upload Dialog */}
      <AvatarUploadDialog
        open={avatarDialogOpen}
        onOpenChange={setAvatarDialogOpen}
        currentAvatarUrl={currentAvatarUrl}
        entityType="child"
        entityId={child.id}
        entityName={child.name}
        onSuccess={(newUrl) => {
          setCurrentAvatarUrl(newUrl || null);
          onSuccess?.();
        }}
      />
    </>
  );
}
