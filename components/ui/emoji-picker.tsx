"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const COMMON_BUDGET_EMOJIS = [
  '💰', '🏠', '🚗', '🍔', '⚡', '💡', '🎯', '📱',
  '🏥', '🎓', '✈️', '🎮', '👕', '🎬', '💪', '🎁',
  '🛒', '🍽️', '☕', '🎉', '📊', '💵', '💳', '🛡️',
  '📈', '🏡', '📚', '✨', '🚌', '🏦', '💎', '📦',
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ value, onChange, className }: EmojiPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-center text-2xl h-12 ${className || ""}`}
          type="button"
        >
          {value || '📊'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid grid-cols-8 gap-2">
          {COMMON_BUDGET_EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              onClick={() => onChange(emoji)}
              className="text-2xl h-12 w-12 p-0 hover:bg-accent"
              type="button"
            >
              {emoji}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
