"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonaSelector } from "@/components/onboarding/persona-selector";
import { RemyTip } from "@/components/onboarding/remy-tip";
import type { PersonaType } from "@/lib/onboarding/personas";

interface ProfileStepProps {
  fullName: string;
  persona: PersonaType;
  onFullNameChange: (name: string) => void;
  onPersonaChange: (persona: PersonaType) => void;
}

export function ProfileStep({
  fullName,
  persona,
  onFullNameChange,
  onPersonaChange,
}: ProfileStepProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-dark">Let's get to know each other</h2>
        <p className="text-sm text-muted-foreground">
          Just the basics so I can personalise your experience
        </p>
      </div>

      {/* Remy's tip */}
      <RemyTip pose="encouraging">
        Before we dive into the numbers, let's get to know each other a bit.
        This helps me give you better guidance along the way.
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

      {/* Persona Selection */}
      <PersonaSelector
        onSelect={onPersonaChange}
        selectedPersona={persona}
      />
    </div>
  );
}
