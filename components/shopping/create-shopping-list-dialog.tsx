"use client";

import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface CreateShoppingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateList: (data: {
    name: string;
    icon: string;
  }) => Promise<void>;
}

const ICONS = [
  "🛒", "🛍️", "🥗", "🍎", "🥬", "🧀", "🍞", "🥩",
  "🏪", "💊", "🧹", "🎁", "📦", "🌿", "🍕", "🍜",
];

export function CreateShoppingListDialog({
  open,
  onOpenChange,
  onCreateList,
}: CreateShoppingListDialogProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🛒");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await onCreateList({
        name: name.trim(),
        icon,
      });
      setName("");
      setIcon("🛒");
      onOpenChange(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Shopping List</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">List Name</Label>
            <Input
              id="name"
              placeholder="e.g., Weekly Groceries"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all",
                    icon === emoji
                      ? "bg-sage-light ring-2 ring-sage"
                      : "bg-silver-light hover:bg-silver"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
            className="bg-sage hover:bg-sage-dark"
          >
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create List
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
