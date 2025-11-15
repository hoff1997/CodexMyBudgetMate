"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { PersonaSelector } from "@/components/onboarding/persona-selector";
import { DataChoice, type DataChoiceType } from "@/components/onboarding/data-choice";
import type { PersonaType } from "@/lib/onboarding/personas";
import { getPersona } from "@/lib/onboarding/personas";
import { toast } from "sonner";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  { id: 1, title: 'Welcome', description: 'Get started with My Budget Mate' },
  { id: 2, title: 'About You', description: 'Choose your experience level' },
  { id: 3, title: 'Your Data', description: 'How to set up your budget' },
  { id: 4, title: 'Quick Setup', description: 'Basic configuration' },
  { id: 5, title: 'First Win', description: 'Celebrate your start!' },
];

interface OnboardingClientProps {
  isMobile: boolean;
}

export function OnboardingClient({ isMobile }: OnboardingClientProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [persona, setPersona] = useState<PersonaType | undefined>();
  const [dataChoice, setDataChoice] = useState<DataChoiceType | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = async () => {
    // Validation
    if (currentStep === 2 && !persona) {
      toast.error("Please select an option that describes you best");
      return;
    }

    if (currentStep === 3 && !dataChoice) {
      toast.error("Please choose how you'd like to get started");
      return;
    }

    // Handle final step
    if (currentStep === STEPS.length) {
      await completeOnboarding();
      return;
    }

    setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };

  const completeOnboarding = async () => {
    setIsLoading(true);

    try {
      // Save onboarding state
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona,
          dataChoice,
          completedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Onboarding API error:', errorData);
        // Continue anyway - database migration may not be applied yet
        toast.info('Onboarding saved locally. Continue to dashboard!');
      }

      // Try to award achievement (may fail if migration not applied)
      try {
        await fetch('/api/achievements/award', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            achievementKey: 'onboarding_complete',
          }),
        });
      } catch (achievementError) {
        console.log('Achievement award skipped (migration not yet applied)');
      }

      // Redirect based on data choice
      if (dataChoice === 'demo') {
        router.push('/dashboard?demo=1');
      } else if (dataChoice === 'akahu') {
        router.push('/akahu/callback');
      } else if (dataChoice === 'csv') {
        router.push('/dashboard?import=csv');
      } else {
        router.push('/envelope-planning');
      }
    } catch (error) {
      console.error('Onboarding completion error:', error);
      toast.error('Redirecting to dashboard...');
      setTimeout(() => router.push('/dashboard'), 1000);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-6 max-w-2xl mx-auto">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-4xl font-bold">Kia ora! Welcome to My Budget Mate</h1>
            <p className="text-xl text-muted-foreground">
              You&apos;re about to take control of your money. Let&apos;s get you set up in just a few minutes.
            </p>

            {isMobile && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <p className="text-sm text-blue-900">
                  <span className="font-medium">Heads up!</span> Setup works best on desktop, but you can continue on mobile if you prefer.
                </p>
              </div>
            )}

            <div className="flex gap-4 justify-center mt-8">
              <Button onClick={handleNext} size="lg" className="bg-emerald-500 hover:bg-emerald-600">
                Let&apos;s Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" onClick={handleSkip}>
                Skip Setup
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              This will only take 3-5 minutes
            </p>
          </div>
        );

      case 2:
        return (
          <PersonaSelector
            onSelect={(selectedPersona) => {
              setPersona(selectedPersona);
              // Auto-advance after a short delay for visual feedback
              setTimeout(() => {
                setCurrentStep(3);
              }, 500);
            }}
            selectedPersona={persona}
          />
        );

      case 3:
        return (
          <DataChoice
            onSelect={(selectedChoice) => {
              setDataChoice(selectedChoice);
              // Auto-advance after a short delay for visual feedback
              setTimeout(() => {
                setCurrentStep(4);
              }, 500);
            }}
            isMobile={isMobile}
          />
        );

      case 4:
        return (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Quick Setup</h2>
              <p className="text-muted-foreground">
                We&apos;ll help you create your first budget based on your choices
              </p>
            </div>

            {persona && (
              <div className="bg-card border rounded-lg p-6 space-y-4">
                <h3 className="font-semibold">Your Profile</h3>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getPersona(persona).icon}</span>
                  <div>
                    <p className="font-medium">{getPersona(persona).label}</p>
                    <p className="text-sm text-muted-foreground">
                      {getPersona(persona).description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {dataChoice && (
              <div className="bg-card border rounded-lg p-6 space-y-4">
                <h3 className="font-semibold">Getting Started With</h3>
                <p className="text-sm text-muted-foreground">
                  {dataChoice === 'demo' && '📊 Demo data - explore features risk-free'}
                  {dataChoice === 'akahu' && '🔗 Bank sync - automatic transaction import'}
                  {dataChoice === 'csv' && '📄 CSV import - bring your spreadsheet data'}
                  {dataChoice === 'manual' && '✏️ Manual entry - full control from scratch'}
                </p>
              </div>
            )}

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
              <h3 className="font-semibold text-emerald-900 mb-2">What happens next?</h3>
              <ul className="space-y-2 text-sm text-emerald-700">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span>We&apos;ll create suggested budget envelopes based on your persona</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span>You can customize everything to match your needs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span>You&apos;ll earn your first achievement badge! 🎉</span>
                </li>
              </ul>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="text-center space-y-6 max-w-2xl mx-auto">
            <div className="text-6xl mb-4 animate-bounce">🎯</div>
            <h1 className="text-4xl font-bold">You&apos;re All Set!</h1>
            <p className="text-xl text-muted-foreground">
              Congratulations! You&apos;ve completed setup and earned your first achievement.
            </p>

            <div className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-lg p-6 my-8">
              <div className="flex items-center justify-center gap-3 mb-3">
                <span className="text-4xl">🏆</span>
                <div className="text-left">
                  <h3 className="font-bold text-lg">Journey Begins</h3>
                  <p className="text-sm text-white/90">+10 points</p>
                </div>
              </div>
              <p className="text-sm text-white/90">
                You&apos;ve completed setup! You&apos;re building strong money habits.
              </p>
            </div>

            <div className="space-y-3">
              <p className="font-medium">Ready for your next win?</p>
              <div className="grid gap-3 md:grid-cols-3 text-sm">
                <div className="border rounded-lg p-3">
                  <span className="text-2xl mb-2 block">📬</span>
                  <p className="font-medium">Create Envelopes</p>
                  <p className="text-muted-foreground text-xs">Organize your budget</p>
                </div>
                <div className="border rounded-lg p-3">
                  <span className="text-2xl mb-2 block">💰</span>
                  <p className="font-medium">Track Transactions</p>
                  <p className="text-muted-foreground text-xs">Build awareness</p>
                </div>
                <div className="border rounded-lg p-3">
                  <span className="text-2xl mb-2 block">🌟</span>
                  <p className="font-medium">Set a Goal</p>
                  <p className="text-muted-foreground text-xs">Plan your future</p>
                </div>
              </div>
            </div>

            {isLoading ? (
              <Button size="lg" disabled className="bg-emerald-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Setting up...
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">My Budget Mate</h1>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip Setup
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {currentStep > 1 && (
        <div className="border-b bg-muted/30">
          <div className="container max-w-5xl mx-auto px-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Step {currentStep} of {STEPS.length}
                </span>
                <span className="font-medium">{STEPS[currentStep - 1].title}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <div className="mb-8">{renderStep()}</div>

        {/* Navigation */}
        {currentStep === 4 && (
          <div className="flex items-center justify-between max-w-2xl mx-auto mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              Finish
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
