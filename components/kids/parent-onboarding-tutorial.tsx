"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Landmark,
  Receipt,
  Flame,
  ListChecks,
  Wallet,
} from "lucide-react";
import { RemyAvatar } from "@/components/onboarding/remy-tip";
import { cn } from "@/lib/cn";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tip: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Kids Mode",
    description:
      "This is where you'll help your teen learn real money management. They'll earn money through chores, track their accounts, and learn to budget - preparing them to become full My Budget Mate users when they get a job.",
    icon: <Wallet className="h-8 w-8 text-sage" />,
    tip: "You're doing something meaningful here. Teaching kids about money early helps them build habits that serve them for life.",
  },
  {
    id: "accounts",
    title: "Set Up Bank Accounts",
    description:
      "We recommend setting up 4 accounts at your child's bank: Everyday (with debit card), Save, Invest, and Give. Set up automatic splits from Everyday to the other three on pocket money day.",
    icon: <Landmark className="h-8 w-8 text-blue" />,
    tip: "This is set up at the bank, not in the app. We track what happens - the real transfers teach banking skills!",
  },
  {
    id: "chores",
    title: "Expected vs Extra Chores",
    description:
      "Here's how we see it: being part of a family means pitching in. Expected chores are about 'helping' the household - not 'doing work for pay'. This teaches your kids that contributing to where you live matters, and not everything in life comes with a price tag. That's what pocket money covers. Extra chores? That's where they learn the real connection between effort and earning. Complete the work, get paid. Simple as that.",
    icon: <Flame className="h-8 w-8 text-gold" />,
    tip: "You're teaching two powerful lessons here: responsibility comes first (expected chores), and hard work pays off (extra chores). Both matter.",
  },
  {
    id: "invoices",
    title: "The Invoice System",
    description:
      "When you approve extra chores, they're added to your child's draft invoice. They can submit it weekly/fortnightly and you pay via bank transfer. The system auto-matches the payment!",
    icon: <Receipt className="h-8 w-8 text-sage" />,
    tip: "This teaches the real-world connection between work, invoicing, and getting paid.",
  },
  {
    id: "household",
    title: "Household Hub Access",
    description:
      "Your kids can access parts of your Household Hub - shopping lists, recipes, to-dos, and more. Set permissions in Settings to decide what each child can see and edit.",
    icon: <ListChecks className="h-8 w-8 text-blue" />,
    tip: "Involving kids in household planning helps them understand family coordination and responsibility.",
  },
];

interface ParentOnboardingTutorialProps {
  onComplete: () => void;
  forceOpen?: boolean;
}

export function ParentOnboardingTutorial({
  onComplete,
  forceOpen = false,
}: ParentOnboardingTutorialProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // Check if tutorial has been completed before
  useEffect(() => {
    const hasCompleted = localStorage.getItem("kids_parent_tutorial_completed");
    if (!hasCompleted || forceOpen) {
      setOpen(true);
    }
  }, [forceOpen]);

  const handleNext = () => {
    setCompletedSteps((prev) => new Set([...prev, TUTORIAL_STEPS[currentStep].id]));
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("kids_parent_tutorial_completed", "true");
    setOpen(false);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem("kids_parent_tutorial_completed", "true");
    setOpen(false);
    onComplete();
  };

  const step = TUTORIAL_STEPS[currentStep];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-lg">Getting Started</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Progress indicators */}
        <div className="flex gap-1 mb-4">
          {TUTORIAL_STEPS.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= currentStep ? "bg-sage" : "bg-gray-200"
              )}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sage-very-light rounded-xl">{step.icon}</div>
            <div>
              <h3 className="font-semibold text-text-dark">{step.title}</h3>
              <p className="text-xs text-text-medium">
                Step {currentStep + 1} of {TUTORIAL_STEPS.length}
              </p>
            </div>
          </div>

          <p className="text-sm text-text-medium leading-relaxed">
            {step.description}
          </p>

          {/* Remy tip */}
          <Card className="bg-sage-very-light border-sage-light">
            <CardContent className="p-3 flex gap-3">
              <RemyAvatar pose="small" size="sm" />
              <p className="text-sm text-sage-dark flex-1">{step.tip}</p>
            </CardContent>
          </Card>

          {/* Completed badge for previous steps */}
          {completedSteps.size > 0 && currentStep === TUTORIAL_STEPS.length - 1 && (
            <div className="flex items-center gap-2 text-sage text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>{completedSteps.size} steps reviewed</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            className="bg-sage hover:bg-sage-dark gap-1"
          >
            {currentStep === TUTORIAL_STEPS.length - 1 ? (
              "Get Started"
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Skip link */}
        <div className="text-center">
          <button
            onClick={handleSkip}
            className="text-xs text-text-light hover:text-text-medium underline"
          >
            Skip tutorial
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
