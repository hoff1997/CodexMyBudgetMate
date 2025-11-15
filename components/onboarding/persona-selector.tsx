"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  const colorClasses = {
    emerald: {
      border: 'border-emerald-500',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      button: 'bg-emerald-500 hover:bg-emerald-600',
    },
    blue: {
      border: 'border-blue-500',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      button: 'bg-blue-500 hover:bg-blue-600',
    },
    purple: {
      border: 'border-purple-500',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      button: 'bg-purple-500 hover:bg-purple-600',
    },
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Which best describes your situation?</h2>
        <p className="text-muted-foreground">
          This helps us personalize your experience
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {personas.map((persona) => {
          const isSelected = selected === persona.key;
          const colors = colorClasses[persona.color as keyof typeof colorClasses];

          return (
            <Card
              key={persona.key}
              className={`relative cursor-pointer transition-all hover:shadow-lg ${
                isSelected
                  ? `${colors.border} border-2 ${colors.bg}`
                  : 'border-2 border-transparent hover:border-gray-300'
              }`}
              onClick={() => handleSelect(persona.key)}
            >
              {isSelected && (
                <div
                  className={`absolute -top-2 -right-2 w-8 h-8 rounded-full ${colors.button} flex items-center justify-center shadow-lg`}
                >
                  <Check className="h-5 w-5 text-white" />
                </div>
              )}

              <CardContent className="p-6 space-y-4">
                {/* Icon */}
                <div className="text-5xl text-center">{persona.icon}</div>

                {/* Title */}
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{persona.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {persona.description}
                  </p>
                </div>

                {/* Detailed description */}
                <p className="text-xs text-center text-muted-foreground border-t pt-3">
                  {persona.detailedDescription}
                </p>

                {/* Selection button */}
                {isSelected ? (
                  <Button
                    className={`w-full ${colors.button} text-white`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(persona.key);
                    }}
                  >
                    Selected
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(persona.key);
                    }}
                  >
                    Select
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selected && (
        <div className="text-center text-sm text-muted-foreground">
          Don&apos;t worry - you can always customize everything later!
        </div>
      )}
    </div>
  );
}
