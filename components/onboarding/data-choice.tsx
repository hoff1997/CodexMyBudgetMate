"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Link2, Upload, Edit3, Shield, Zap, Database, Lock } from "lucide-react";

export type DataChoiceType = 'demo' | 'akahu' | 'csv' | 'manual';

interface DataChoiceProps {
  onSelect: (choice: DataChoiceType) => void;
  isMobile?: boolean;
}

export function DataChoice({ onSelect, isMobile = false }: DataChoiceProps) {
  const choices = [
    {
      type: 'demo' as DataChoiceType,
      icon: Play,
      iconColor: 'text-blue-500',
      title: 'Try with Demo Data',
      description: 'Explore features with sample data',
      features: [
        'See how everything works',
        'No commitment required',
        'Easy to switch to real data later',
      ],
      buttonText: 'Start Demo',
      buttonVariant: 'outline' as const,
      trust: 'No personal data needed',
    },
    {
      type: 'akahu' as DataChoiceType,
      icon: Link2,
      iconColor: 'text-emerald-500',
      title: 'Connect My Bank',
      description: 'Automatic sync with Akahu',
      features: [
        'Secure NZ bank connection',
        'Auto-import transactions',
        'Always up to date',
      ],
      buttonText: 'Connect Bank',
      buttonVariant: 'default' as const,
      trust: 'Bank-level encryption',
    },
    {
      type: 'csv' as DataChoiceType,
      icon: Upload,
      iconColor: 'text-purple-500',
      title: 'Import CSV',
      description: 'Upload from spreadsheet',
      features: [
        'Keep using your spreadsheet',
        'One-time import',
        'Maintain full control',
      ],
      buttonText: 'Import File',
      buttonVariant: 'outline' as const,
      trust: 'Your data stays private',
    },
    {
      type: 'manual' as DataChoiceType,
      icon: Edit3,
      iconColor: 'text-amber-500',
      title: 'Start from Scratch',
      description: 'Enter everything manually',
      features: [
        'Complete control',
        'Add data as you go',
        'Perfect for fresh start',
      ],
      buttonText: 'Manual Setup',
      buttonVariant: 'outline' as const,
      trust: 'Nothing stored until you save',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">How would you like to get started?</h2>
        <p className="text-muted-foreground">
          Choose the option that works best for you. You can always change later.
        </p>
      </div>

      {isMobile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Zap className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-900">Desktop Recommended</p>
            <p className="text-blue-700 mt-1">
              Setting up your budget works best on a larger screen. Continue on mobile or switch to desktop for the best experience.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {choices.map((choice) => {
          const Icon = choice.icon;
          const isPrimary = choice.type === 'akahu';

          return (
            <Card
              key={choice.type}
              className={`relative transition-all hover:shadow-lg ${
                isPrimary ? 'border-2 border-emerald-500' : ''
              }`}
            >
              {isPrimary && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Recommended
                </div>
              )}

              <CardHeader>
                <div className="flex items-start justify-between">
                  <Icon className={`h-8 w-8 ${choice.iconColor}`} />
                  {choice.type === 'akahu' && (
                    <Shield className="h-5 w-5 text-emerald-600" />
                  )}
                </div>
                <CardTitle className="text-xl">{choice.title}</CardTitle>
                <CardDescription>{choice.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Features list */}
                <ul className="space-y-2">
                  {choice.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Trust indicator */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-3">
                  <Lock className="h-3 w-3" />
                  <span>{choice.trust}</span>
                </div>

                {/* Action button */}
                <Button
                  variant={choice.buttonVariant}
                  className={`w-full ${
                    choice.buttonVariant === 'default'
                      ? 'bg-emerald-500 hover:bg-emerald-600'
                      : ''
                  }`}
                  onClick={() => onSelect(choice.type)}
                >
                  {choice.buttonText}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Help text */}
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Not sure? Start with demo data and switch when you&apos;re ready.
        </p>
        <p className="text-xs text-muted-foreground">
          All options are secure and your data is never shared without your permission.
        </p>
      </div>
    </div>
  );
}
