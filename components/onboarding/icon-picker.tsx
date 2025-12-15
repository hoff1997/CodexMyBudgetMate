"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AVAILABLE_ICONS } from "@/lib/onboarding/master-envelope-list";

interface IconPickerProps {
  selectedIcon: string;
  onIconSelect: (icon: string) => void;
  disabled?: boolean;
}

// Group icons by category for easier browsing
const ICON_CATEGORIES = {
  "Transport": ['🚗', '🚙', '🚕', '🏍️', '🚲', '🛵', '🚌', '🚂', '✈️', '🚁', '⛵', '🛳️'],
  "Tech": ['📱', '💻', '🖥️', '📺', '🎮', '📷', '🎧', '⌚', '💾', '🖨️'],
  "Home": ['🏠', '🏡', '🏢', '🏗️', '🔧', '🔨', '🛠️', '🔌', '💡', '🚿', '🛁'],
  "Money": ['💰', '💵', '💳', '🏦', '💎', '📈', '📉', '💸'],
  "Animals": ['🐕', '🐈', '🐇', '🐠', '🐦', '🐾', '🦜', '🐢', '🐹'],
  "People": ['👶', '👧', '👦', '👨', '👩', '👴', '👵', '👨‍👩‍👧', '👨‍👧', '👩‍👧'],
  "Health": ['🏥', '💊', '🩺', '🦷', '👓', '🏋️', '🧘', '🏃'],
  "Food": ['🛒', '🍕', '🍽️', '☕', '🍷', '🥪', '🍔', '🥗'],
  "Activities": ['🎬', '🎭', '🎨', '🎯', '⚽', '🎾', '🏈', '🎸', '🎹', '📚', '✏️'],
  "Nature": ['🌴', '🏖️', '⛰️', '🏕️', '🌺', '🌳'],
  "Other": ['🎁', '❤️', '⭐', '🔔', '📦', '🗂️', '📁', '🏷️', '🔒', '🎓'],
};

export function IconPicker({ selectedIcon, onIconSelect, disabled }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("Transport");

  const handleIconSelect = useCallback((icon: string) => {
    onIconSelect(icon);
    setOpen(false);
  }, [onIconSelect]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-12 w-12 p-0 text-2xl"
          disabled={disabled}
        >
          {selectedIcon || "📦"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-semibold text-sm">Choose an Icon</h4>
        </div>
        {/* Category tabs */}
        <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
          {Object.keys(ICON_CATEGORIES).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
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
        {/* Icon grid */}
        <div className="p-3 max-h-48 overflow-y-auto">
          <div className="grid grid-cols-8 gap-1">
            {ICON_CATEGORIES[activeCategory as keyof typeof ICON_CATEGORIES]?.map((icon) => (
              <button
                key={icon}
                onClick={() => handleIconSelect(icon)}
                className={`
                  h-8 w-8 flex items-center justify-center text-lg rounded transition-colors
                  ${selectedIcon === icon
                    ? "bg-[#E2EEEC] ring-2 ring-[#7A9E9A]"
                    : "hover:bg-muted"
                  }
                `}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
        {/* Selected indicator */}
        <div className="p-2 border-t bg-muted/30 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Selected: <span className="text-lg ml-1">{selectedIcon || "📦"}</span>
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
