"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HelpCircle, X } from "lucide-react";

interface HelpTooltipProps {
  title: string;
  content: string[];
  tips?: string[];
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export default function HelpTooltip({
  title,
  content,
  tips,
  side = "bottom",
  align = "start",
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          aria-label="Help information"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground">{title}</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsOpen(false)}
              aria-label="Close help"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {content.map((item, index) => (
              <p key={index} className="text-sm text-muted-foreground">
                {item}
              </p>
            ))}
          </div>

          {tips && tips.length > 0 && (
            <div className="border-t pt-3">
              <h5 className="text-sm font-medium text-foreground mb-2">
                Tips:
              </h5>
              <ul className="space-y-1">
                {tips.map((tip, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex">
                    <span className="text-primary mr-1">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
