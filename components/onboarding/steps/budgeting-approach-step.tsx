"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Sparkles, Pencil } from "lucide-react";
import type { PersonaType } from "@/lib/onboarding/personas";
import { getPersona } from "@/lib/onboarding/personas";

interface BudgetingApproachStepProps {
  useTemplate: boolean | undefined;
  onUseTemplateChange: (useTemplate: boolean) => void;
  persona: PersonaType | undefined;
}

export function BudgetingApproachStep({
  useTemplate,
  onUseTemplateChange,
  persona,
}: BudgetingApproachStepProps) {
  const personaData = persona ? getPersona(persona) : null;
  const envelopeCount = personaData?.envelopeTemplates?.length || 8;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-5xl mb-2">🎯</div>
        <h2 className="text-3xl font-bold">Choose Your Budgeting Approach</h2>
        <p className="text-muted-foreground">
          How would you like to set up your envelopes?
        </p>
      </div>

      {/* Options */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Template Option */}
        <Card
          className={`p-6 cursor-pointer transition-all ${
            useTemplate === true
              ? "border-emerald-500 border-2 bg-emerald-50/50"
              : "border-border hover:border-emerald-300"
          }`}
          onClick={() => onUseTemplateChange(true)}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-emerald-600" />
              </div>
              {useTemplate === true && (
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              )}
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">
                Start with a Template
                <span className="ml-2 text-sm font-normal text-emerald-600">(Recommended)</span>
              </h3>
              <p className="text-sm text-muted-foreground">
                We&apos;ll suggest {envelopeCount} envelopes based on your {personaData?.label || "profile"}.
                You can customize them all to match your needs.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Faster setup (~10 min)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Proven budget structure</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Easy to customize</span>
              </div>
            </div>

            {persona && (
              <div className="bg-white/50 border rounded-lg p-3 mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Template preview for {personaData?.label}:
                </p>
                <div className="flex flex-wrap gap-1">
                  {personaData?.envelopeTemplates?.slice(0, 6).map((template, idx) => (
                    <span key={idx} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                      {template.icon} {template.name}
                    </span>
                  ))}
                  {envelopeCount > 6 && (
                    <span className="text-xs text-muted-foreground px-2 py-1">
                      +{envelopeCount - 6} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Build from Scratch Option */}
        <Card
          className={`p-6 cursor-pointer transition-all ${
            useTemplate === false
              ? "border-blue-500 border-2 bg-blue-50/50"
              : "border-border hover:border-blue-300"
          }`}
          onClick={() => onUseTemplateChange(false)}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Pencil className="h-6 w-6 text-blue-600" />
              </div>
              {useTemplate === false && (
                <CheckCircle2 className="h-6 w-6 text-blue-600" />
              )}
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Build from Scratch</h3>
              <p className="text-sm text-muted-foreground">
                Create your own envelope system from the ground up.
                Perfect if you know exactly what you need.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span>Complete control</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span>No pre-filled categories</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span>For experienced budgeters</span>
              </div>
            </div>

            <div className="bg-white/50 border rounded-lg p-3 mt-4">
              <p className="text-xs text-muted-foreground">
                You&apos;ll start with a blank canvas and add each envelope one by one.
                Takes a bit longer but gives you total flexibility.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Helper Text */}
      <div className="bg-muted/50 border rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground">
          💡 Don't worry - {useTemplate ? "you can add, remove, or modify any envelope" : "we'll guide you through creating each envelope"}. This choice just determines your starting point.
        </p>
      </div>
    </div>
  );
}
