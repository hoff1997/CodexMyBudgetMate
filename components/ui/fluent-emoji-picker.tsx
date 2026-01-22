"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover as CustomPopover,
  PopoverContent as CustomPopoverContent,
  PopoverTrigger as CustomPopoverTrigger,
} from "@/components/ui/popover";
import {
  Popover as RadixPopover,
  PopoverContent as RadixPopoverContent,
  PopoverTrigger as RadixPopoverTrigger,
} from "@/components/ui/radix-popover";
import { Search, X } from "lucide-react";
import { FLUENT_CATEGORIES, FLUENT_EMOJIS, type FluentEmoji } from "@/lib/emoji/fluent-emoji-data";

interface FluentEmojiPickerProps {
  selectedEmoji: string;
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
  /** Size of the trigger button: "sm" (20px), "md" (32px), "lg" (48px, default) */
  size?: "sm" | "md" | "lg";
  /** Set to true when picker is inside a Dialog - uses Radix Popover for proper focus handling */
  insideDialog?: boolean;
}

const SIZE_CLASSES = {
  sm: "h-5 w-5 p-0 text-sm border-0 hover:bg-muted/50 rounded",
  md: "h-8 w-8 p-0 text-lg border-0 hover:bg-muted/50 rounded",
  lg: "h-12 w-12 p-0 text-2xl",
};

export function FluentEmojiPicker({
  selectedEmoji,
  onEmojiSelect,
  disabled,
  size = "lg",
  insideDialog = false,
}: FluentEmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("money");

  // Filter emojis by search query or category
  const filteredEmojis = useMemo(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return FLUENT_EMOJIS.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.keywords.some((k) => k.toLowerCase().includes(query))
      );
    }
    return FLUENT_EMOJIS.filter((e) => e.category === activeCategory);
  }, [searchQuery, activeCategory]);

  const handleEmojiSelect = useCallback(
    (emoji: FluentEmoji) => {
      onEmojiSelect(emoji.emoji);
      setOpen(false);
      setSearchQuery("");
    },
    [onEmojiSelect]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  // Shared content for both popover types
  const popoverContent = (
    <>
      {/* Header with search */}
      <div className="p-3 border-b">
        <h4 className="font-semibold text-sm mb-2">Choose an Icon</h4>
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emojis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-8 text-sm"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClearSearch();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs (hidden when searching) */}
      {!searchQuery && (
        <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
          {Object.entries(FLUENT_CATEGORIES).map(([key, { label, icon }]) => (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setActiveCategory(key);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className={`
                px-2 py-1 text-xs rounded-md transition-colors cursor-pointer flex items-center gap-1
                ${activeCategory === key
                  ? "bg-[#7A9E9A] text-white"
                  : "hover:bg-muted"
                }
              `}
            >
              <span>{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search results header */}
      {searchQuery && (
        <div className="px-3 py-2 bg-muted/30 border-b text-xs text-muted-foreground">
          {filteredEmojis.length} results for &ldquo;{searchQuery}&rdquo;
        </div>
      )}

      {/* Emoji grid */}
      <div className="p-3 max-h-60 overflow-y-auto">
        {filteredEmojis.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">
            No emojis found
          </p>
        ) : (
          <div className="grid grid-cols-8 gap-1">
            {filteredEmojis.map((emoji) => (
              <button
                key={emoji.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleEmojiSelect(emoji);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                title={emoji.name}
                className={`
                  h-8 w-8 flex items-center justify-center text-lg rounded transition-colors cursor-pointer
                  ${selectedEmoji === emoji.emoji
                    ? "bg-[#E2EEEC] ring-2 ring-[#7A9E9A]"
                    : "hover:bg-muted"
                  }
                `}
              >
                {emoji.emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t bg-muted/30 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Selected: <span className="text-lg ml-1">{selectedEmoji || "📦"}</span>
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setOpen(false)}
        >
          Done
        </Button>
      </div>
    </>
  );

  const triggerButton = (
    <Button
      type="button"
      variant={size === "lg" ? "outline" : "ghost"}
      className={SIZE_CLASSES[size]}
      disabled={disabled}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {selectedEmoji || "📦"}
    </Button>
  );

  // Use Radix Popover when inside a Dialog for proper focus scope handling
  if (insideDialog) {
    return (
      <RadixPopover open={open} onOpenChange={setOpen} modal>
        <RadixPopoverTrigger asChild>
          {triggerButton}
        </RadixPopoverTrigger>
        <RadixPopoverContent
          className="w-96 p-0"
          align="start"
          side="bottom"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {popoverContent}
        </RadixPopoverContent>
      </RadixPopover>
    );
  }

  // Use custom Popover for normal usage (outside dialogs)
  return (
    <CustomPopover open={open} onOpenChange={setOpen}>
      <CustomPopoverTrigger asChild>
        {triggerButton}
      </CustomPopoverTrigger>
      <CustomPopoverContent
        className="w-96 p-0"
        align="start"
        side="bottom"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {popoverContent}
      </CustomPopoverContent>
    </CustomPopover>
  );
}
