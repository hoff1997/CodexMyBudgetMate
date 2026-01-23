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
import { FluentEmojiPicker } from "@/components/ui/fluent-emoji-picker";

interface CreateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateList: (data: { name: string; icon: string; color: string }) => Promise<void>;
}

const COLORS = [
  { value: "sage", bg: "bg-sage", label: "Sage" },
  { value: "blue", bg: "bg-blue", label: "Blue" },
  { value: "gold", bg: "bg-gold", label: "Gold" },
  { value: "pink", bg: "bg-pink-500", label: "Pink" },
  { value: "purple", bg: "bg-purple-500", label: "Purple" },
  { value: "orange", bg: "bg-orange-500", label: "Orange" },
];

export function CreateListDialog({
  open,
  onOpenChange,
  onCreateList,
}: CreateListDialogProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📝");
  const [color, setColor] = useState("sage");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await onCreateList({ name: name.trim(), icon, color });
      setName("");
      setIcon("📝");
      setColor("sage");
      onOpenChange(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New List</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">List Name</Label>
            <Input
              id="name"
              placeholder="e.g., Weekend Cleaning"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <FluentEmojiPicker
              selectedEmoji={icon}
              onEmojiSelect={setIcon}
              size="lg"
              insideDialog={true}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    c.bg,
                    color === c.value
                      ? "ring-2 ring-offset-2 ring-text-dark"
                      : "opacity-60 hover:opacity-100"
                  )}
                  title={c.label}
                />
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
