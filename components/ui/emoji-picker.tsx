"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Categorized emoji collection for budget-related use
const EMOJI_CATEGORIES: Record<string, string[]> = {
  "Home": ['🏠', '🏡', '🏢', '🔧', '🔨', '🛠️', '🔌', '💡', '🚿', '🛁', '🪑', '🛋️', '🛏️', '🚪', '🧹', '🧺'],
  "Transport": ['🚗', '🚙', '🚕', '🏍️', '🚲', '🛵', '🚌', '🚂', '✈️', '⛽', '🅿️', '🛞', '🚁', '⛵'],
  "Tech": ['📱', '💻', '🖥️', '📺', '🎮', '📷', '🎧', '⌚', '🔋', '📡', '🎙️', '📻', '🖱️', '⌨️'],
  "Money": ['💰', '💵', '💳', '🏦', '💎', '📈', '📉', '💸', '🪙', '💲', '🧾', '📊', '🏧'],
  "Health": ['🏥', '💊', '🩺', '🦷', '👓', '🏋️', '🧘', '🏃', '💉', '🩹', '💆', '🧖', '🏊'],
  "Food": ['🛒', '🍕', '🍽️', '☕', '🍷', '🥪', '🍔', '🥗', '🍳', '🥛', '🍞', '🧁', '🍰', '🍜'],
  "Activities": ['🎬', '🎭', '🎨', '🎯', '⚽', '🎾', '🎸', '🎹', '📚', '✏️', '🎤', '🎲', '🎳', '⛳'],
  "Shopping": ['👕', '👗', '👠', '👟', '👜', '🎒', '💄', '✂️', '💅', '👔', '🧥', '👒', '🧢'],
  "Education": ['🎓', '📚', '📖', '📝', '✏️', '🖊️', '📐', '📏', '🏫', '📓', '🔬', '🔭'],
  "Celebrations": ['🎁', '🎂', '🎉', '🎊', '🎈', '🎄', '🎃', '💐', '💝', '🥳', '🎇', '🎆', '🍾'],
  "Pets": ['🐕', '🐈', '🐇', '🐠', '🐦', '🐾', '🦜', '🐢', '🐹', '🦮', '🐩', '🦴', '🐟'],
  "Other": ['❤️', '⭐', '🔔', '📦', '🗂️', '📁', '🏷️', '🔒', '🌱', '♻️', '📬', '🔑', '⏰', '📅', '✅'],
};

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ value, onChange, className }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("Money");

  const handleEmojiSelect = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-center text-2xl h-12 ${className || ""}`}
          type="button"
        >
          {value || '📊'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-semibold text-sm">Choose an Emoji</h4>
        </div>
        {/* Category tabs */}
        <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <button
              key={category}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveCategory(category);
              }}
              className={`
                px-2 py-1 text-xs rounded-md transition-colors
                ${activeCategory === category
                  ? "bg-[#7A9E9A] text-white"
                  : "hover:bg-muted"
                }
              `}
            >
              {category}
            </button>
          ))}
        </div>
        {/* Emoji grid */}
        <div className="p-3 max-h-48 overflow-y-auto">
          <div className="grid grid-cols-8 gap-1">
            {(EMOJI_CATEGORIES[activeCategory] || []).map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEmojiSelect(emoji);
                }}
                className={`
                  h-8 w-8 flex items-center justify-center text-lg rounded transition-colors
                  ${value === emoji
                    ? "bg-[#E2EEEC] ring-2 ring-[#7A9E9A]"
                    : "hover:bg-muted"
                  }
                `}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
        {/* Selected indicator */}
        <div className="p-2 border-t bg-muted/30 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Selected: <span className="text-lg ml-1">{value || "📊"}</span>
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
      </PopoverContent>
    </Popover>
  );
}
