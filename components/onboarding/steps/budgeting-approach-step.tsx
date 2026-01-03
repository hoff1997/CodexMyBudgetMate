"use client";

import { Card } from "@/components/ui/card";
import { CheckCircle2, Sparkles, Pencil } from "lucide-react";
import { RemyTip } from "@/components/onboarding/remy-tip";
import { MASTER_ENVELOPE_LIST } from "@/lib/onboarding/master-envelope-list";

interface BudgetingApproachStepProps {
  useTemplate: boolean | undefined;
  onUseTemplateChange: (useTemplate: boolean) => void;
}

export function BudgetingApproachStep({
  useTemplate,
  onUseTemplateChange,
}: BudgetingApproachStepProps) {
  // Get sample envelopes for preview (first 6 popular ones)
  const sampleEnvelopes = MASTER_ENVELOPE_LIST
    .filter(e => e.defaultSelected || ['rent', 'groceries', 'power', 'petrol', 'internet', 'phone'].includes(e.id))
    .slice(0, 6);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-text-dark">Choose Your Starting Point</h2>
        <p className="text-muted-foreground">
          How would you like to set up your envelopes?
        </p>
      </div>

      {/* Remy's Tip */}
      <RemyTip pose="encouraging">
        Two ways to start: pick from our list of common household expenses
        (quick start) or build from scratch (full control). There's no wrong
        choice - pick what feels right for you. You can always adjust later.
      </RemyTip>

      {/* Options */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Template Option */}
        <Card
          className={`relative p-6 cursor-pointer transition-all ${
            useTemplate === true
              ? "border-[#7A9E9A] border-2 bg-[#E2EEEC]/50"
              : "border-border hover:border-[#B8D4D0]"
          }`}
          onClick={() => onUseTemplateChange(true)}
        >
          <div className="absolute -top-3 left-4 bg-[#7A9E9A] text-white text-xs font-medium px-3 py-1 rounded-full">
            Recommended
          </div>
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-[#E2EEEC] rounded-lg flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-[#7A9E9A]" />
              </div>
              {useTemplate === true && (
                <CheckCircle2 className="h-6 w-6 text-[#7A9E9A]" />
              )}
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">
                Pick from Our List
              </h3>
              <p className="text-sm text-muted-foreground">
                Choose from 80+ common household expenses. Just tick the ones
                that apply to you - we've organised them by category.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[#7A9E9A]" />
                <span>Faster setup (~10 min)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[#7A9E9A]" />
                <span>Comprehensive expense categories</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[#7A9E9A]" />
                <span>Easy to customize</span>
              </div>
            </div>

            <div className="bg-white/50 border rounded-lg p-3 mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Sample envelopes you can choose:
              </p>
              <div className="flex flex-wrap gap-1">
                {sampleEnvelopes.map((envelope) => (
                  <span key={envelope.id} className="text-xs bg-[#E2EEEC] text-[#5A7E7A] px-2 py-1 rounded">
                    {envelope.icon} {envelope.name}
                  </span>
                ))}
                <span className="text-xs text-muted-foreground px-2 py-1">
                  +80 more
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Build from Scratch Option */}
        <Card
          className={`p-6 cursor-pointer transition-all ${
            useTemplate === false
              ? "border-[#6B9ECE] border-2 bg-[#DDEAF5]/50"
              : "border-border hover:border-[#6B9ECE]/50"
          }`}
          onClick={() => onUseTemplateChange(false)}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-[#DDEAF5] rounded-lg flex items-center justify-center">
                <Pencil className="h-6 w-6 text-[#6B9ECE]" />
              </div>
              {useTemplate === false && (
                <CheckCircle2 className="h-6 w-6 text-[#6B9ECE]" />
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
                <CheckCircle2 className="h-4 w-4 text-[#6B9ECE]" />
                <span>Complete control</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[#6B9ECE]" />
                <span>No pre-filled categories</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[#6B9ECE]" />
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
