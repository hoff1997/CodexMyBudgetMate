"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RemyTip } from "@/components/onboarding/remy-tip";

interface ProfileStepProps {
  fullName: string;
  onFullNameChange: (name: string) => void;
}

export function ProfileStep({
  fullName,
  onFullNameChange,
}: ProfileStepProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-dark">Let's get to know each other</h2>
        <p className="text-sm text-muted-foreground">
          Just a quick intro so I can personalise your experience
        </p>
      </div>

      {/* Remy's tip */}
      <RemyTip pose="encouraging">
        Before we dive into the numbers, let me know what to call you.
        This helps me give you a more personal experience along the way.
      </RemyTip>

      {/* Full Name - Inline */}
      <div className="flex items-center gap-3 bg-card border rounded-lg p-4">
        <Label htmlFor="fullName" className="text-sm font-medium whitespace-nowrap">
          What should I call you?
        </Label>
        <Input
          id="fullName"
          type="text"
          placeholder="Your name"
          value={fullName}
          onChange={(e) => onFullNameChange(e.target.value)}
          className="flex-1"
          autoFocus
        />
      </div>
    </div>
  );
}
