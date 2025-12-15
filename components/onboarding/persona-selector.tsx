"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { getAllPersonas, type PersonaType } from "@/lib/onboarding/personas";

interface PersonaSelectorProps {
  onSelect: (persona: PersonaType) => void;
  selectedPersona?: PersonaType;
}

export function PersonaSelector({ onSelect, selectedPersona }: PersonaSelectorProps) {
  const [selected, setSelected] = useState<PersonaType | undefined>(selectedPersona);
  const personas = getAllPersonas();

  const handleSelect = (personaKey: PersonaType) => {
    setSelected(personaKey);
    onSelect(personaKey);
  };

  // All cards use same sage color when selected
  const selectedColors = {
    border: 'border-[#7A9E9A]',
    bg: 'bg-[#E2EEEC]',
    check: 'bg-[#7A9E9A]',
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-center">Which best describes you?</p>

      <div className="grid gap-3 md:grid-cols-3">
        {personas.map((persona) => {
          const isSelected = selected === persona.key;

          return (
            <Card
              key={persona.key}
              className={`relative cursor-pointer transition-all hover:shadow-md p-4 flex flex-col ${
                isSelected
                  ? `${selectedColors.border} border-2 ${selectedColors.bg}`
                  : 'border hover:border-gray-300'
              }`}
              onClick={() => handleSelect(persona.key)}
            >
              {isSelected && (
                <div
                  className={`absolute -top-2 -right-2 w-6 h-6 rounded-full ${selectedColors.check} flex items-center justify-center shadow`}
                >
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}

              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{persona.icon}</span>
                  <h3 className="font-semibold text-sm">{persona.label}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex-1">
                  {persona.description}
                </p>
                <p className="text-xs text-muted-foreground/80 border-t pt-2 mt-2">
                  {persona.detailedDescription}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {selected && (
        <p className="text-center text-xs text-muted-foreground">
          You can always customise everything later!
        </p>
      )}
    </div>
  );
}
