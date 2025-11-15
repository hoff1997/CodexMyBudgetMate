"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonaSelector } from "@/components/onboarding/persona-selector";
import type { PersonaType } from "@/lib/onboarding/personas";

interface ProfileStepProps {
  fullName: string;
  persona: PersonaType | undefined;
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
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Tell Us About You</h2>
        <p className="text-muted-foreground">
          We&apos;ll personalise your experience based on your profile
        </p>
      </div>

      {/* Full Name */}
      <div className="space-y-3">
        <Label htmlFor="fullName" className="text-base">What's your name?</Label>
        <Input
          id="fullName"
          type="text"
          placeholder="Enter your full name"
          value={fullName}
          onChange={(e) => onFullNameChange(e.target.value)}
          className="text-lg py-6"
          autoFocus
        />
        <p className="text-sm text-muted-foreground">
          We&apos;ll use this to personalise your dashboard
        </p>
      </div>

      {/* Persona Selection */}
      <div className="space-y-3">
        <Label className="text-base">Which best describes you?</Label>
        <PersonaSelector
          onSelect={onPersonaChange}
          selectedPersona={persona}
        />
      </div>
    </div>
  );
}
