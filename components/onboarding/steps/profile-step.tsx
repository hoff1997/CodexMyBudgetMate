"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonaSelector } from "@/components/onboarding/persona-selector";
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
        <div className="text-4xl mb-1">👋</div>
        <h2 className="text-2xl font-bold">Tell Us About You</h2>
        <p className="text-sm text-muted-foreground">
          We&apos;ll personalise your experience based on your profile
        </p>
      </div>

      {/* Full Name - Inline */}
      <div className="flex items-center gap-3 bg-card border rounded-lg p-4">
        <Label htmlFor="fullName" className="text-sm font-medium whitespace-nowrap">
          Your name:
        </Label>
        <Input
          id="fullName"
          type="text"
          placeholder="Enter your full name"
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
