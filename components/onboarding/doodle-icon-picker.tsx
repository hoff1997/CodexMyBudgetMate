"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  PhosphorIcon,
  getIconCategories,
  getPhosphorIcon,
  ICON_COLORS,
} from "@/lib/icons/phosphor-icon-map";

interface DoodleIconPickerProps {
  selectedIcon: string;
  onIconSelect: (icon: string) => void;
  disabled?: boolean;
  /** Size of the trigger button: "sm" (20px), "md" (32px), "lg" (48px, default) */
  size?: "sm" | "md" | "lg";
  /** Color to use for icons */
  color?: string;
}

const SIZE_CONFIG = {
  sm: { button: "h-5 w-5 p-0 border-0 hover:bg-muted/50 rounded", icon: 14 },
  md: { button: "h-8 w-8 p-0 border-0 hover:bg-muted/50 rounded", icon: 20 },
  lg: { button: "h-12 w-12 p-0", icon: 28 },
};

const CATEGORY_ORDER = [
  "Finance",
  "Shopping",
  "Home",
  "Utilities",
  "Health",
  "Food & Drink",
  "Transport",
  "Tech & Entertainment",
  "People & Life",
  "Celebrations",
  "Pets",
  "Education",
  "Insurance & Protection",
  "Nature",
  "Interface",
];

export function DoodleIconPicker({
  selectedIcon,
  onIconSelect,
  disabled,
  size = "lg",
  color = ICON_COLORS.sage,
}: DoodleIconPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("Finance");

  const handleIconSelect = useCallback(
    (iconKey: string) => {
      onIconSelect(iconKey);
      setOpen(false);
    },
    [onIconSelect]
  );

  const iconCategories = getIconCategories();
  const config = SIZE_CONFIG[size];

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant={size === "lg" ? "outline" : "ghost"}
          className={config.button}
          disabled={disabled}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <PhosphorIcon name={selectedIcon || "wallet"} size={config.icon} color={color} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-semibold text-sm">Choose an Icon</h4>
        </div>
        {/* Category tabs */}
        <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30 max-h-24 overflow-y-auto">
          {CATEGORY_ORDER.map((category) => (
            <button
              key={category}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setActiveCategory(category);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className={`
                px-2 py-1 text-xs rounded-md transition-colors cursor-pointer
                ${
                  activeCategory === category
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
        <div className="p-3 max-h-60 overflow-y-auto">
          <div className="grid grid-cols-6 gap-2">
            {Object.entries(iconCategories[activeCategory] || {}).map(
              ([iconKey, IconComponent]) => (
                <button
                  key={iconKey}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleIconSelect(iconKey);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  className={`
                    h-10 w-10 flex items-center justify-center rounded transition-colors cursor-pointer
                    ${
                      selectedIcon === iconKey
                        ? "bg-[#E2EEEC] ring-2 ring-[#7A9E9A]"
                        : "hover:bg-muted"
                    }
                  `}
                  title={iconKey.replace(/-/g, " ")}
                >
                  <IconComponent size={24} color={ICON_COLORS.sage} />
                </button>
              )
            )}
          </div>
        </div>
        {/* Selected indicator */}
        <div className="p-2 border-t bg-muted/30 flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-2">
            Selected:
            <span className="inline-flex items-center justify-center w-8 h-8 bg-white rounded border">
              <PhosphorIcon name={selectedIcon || "wallet"} size={20} color={ICON_COLORS.sage} />
            </span>
            <span className="text-xs">{(selectedIcon || "wallet").replace(/-/g, " ")}</span>
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
