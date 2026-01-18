"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Calculator,
  Layers,
  DollarSign,
  TrendingUp,
  Edit3,
  Target,
  PiggyBank,
  Sparkles,
  Thermometer,
  Sun,
  Gift,
  Cake,
  Calendar,
  Users,
  Shield,
} from "lucide-react";
import { RemyAvatar } from "@/components/onboarding/remy-tip";
import { cn } from "@/lib/cn";

interface TutorialStep {
  id: string;
  title: string;
  description: React.ReactNode;
  icon: React.ReactNode;
  tip: string;
  visual?: React.ReactNode;
  section?: "budget" | "seasonal" | "celebrations";
}

const TUTORIAL_STEPS: TutorialStep[] = [
  // === BUDGET BASICS SECTION ===
  {
    id: "welcome",
    title: "Your Budget at a Glance",
    description:
      "This is where you see your entire budget laid out. Each envelope shows how much you'll set aside from each pay to cover your expenses.",
    icon: <Layers className="h-6 w-6 text-sage" />,
    tip: "Think of this as your money roadmap. Every dollar from your pay already knows where it's going!",
    section: "budget",
  },
  {
    id: "income-cards",
    title: "Income Progress Cards",
    description:
      "The cards below show how much of your pay is allocated. Green means within budget, blue means you're over - but we can adjust!",
    icon: <DollarSign className="h-6 w-6 text-blue" />,
    tip: "Aim to keep some surplus for unexpected costs - life happens!",
    section: "budget",
  },
  {
    id: "category-headers",
    title: "Categories Keep Things Tidy",
    description:
      "Your envelopes are grouped by category. Click category headers to expand or collapse. The total for each category shows on the right.",
    icon: <Layers className="h-6 w-6 text-blue" />,
    tip: "Categories help you see where your money goes at a glance! You can customise this further once onboarding is over, you are in control.",
    section: "budget",
  },
  {
    id: "priority",
    title: "Priority Traffic Lights",
    description:
      "Green dot = Essential, Grey dot = Important, Blue dot = Flexible. Click any priority dot to change it.",
    icon: <Target className="h-6 w-6 text-sage" />,
    tip: "When money's tight, essentials get filled before flexibles - that's the My Budget Way.",
    section: "budget",
    visual: (
      <div className="flex items-center justify-center gap-4 py-1 bg-gray-50 rounded">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#5A7E7A]" />
          <span className="text-xs text-muted-foreground">Essential</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#9CA3AF]" />
          <span className="text-xs text-muted-foreground">Important</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#6B9ECE]" />
          <span className="text-xs text-muted-foreground">Flexible</span>
        </div>
      </div>
    ),
  },
  {
    id: "envelope-name",
    title: "Envelope Names",
    description:
      "Click any envelope name to edit it. The icon shows what type it is at a glance.",
    icon: <Edit3 className="h-6 w-6 text-gold" />,
    tip: "You're in control here - name things however makes sense to you!",
    section: "budget",
  },
  {
    id: "target-amount",
    title: "Target Amount",
    description: (
      <>
        This is how much the bill or expense costs. For bills that vary through the year like electricity, gas, or heating, look for the{" "}
        <span className="inline-flex items-center gap-0.5 text-blue font-medium">
          <Thermometer className="h-3.5 w-3.5" /> leveling icon
        </span>{" "}
        next to the envelope name - this helps you save a steady amount each pay so seasonal bills don't catch you out (more about that later).
      </>
    ),
    icon: <Calculator className="h-6 w-6 text-sage" />,
    tip: "Leveling smooths out those lumpy bills - no more winter power bill shocks!",
    section: "budget",
  },
  {
    id: "frequency",
    title: "Bill Frequency",
    description:
      "Weekly, fortnightly, monthly, quarterly, or annual - this affects how much you allocate each pay cycle.",
    icon: <TrendingUp className="h-6 w-6 text-blue" />,
    tip: "A $100/month bill = about $46 per fortnight. I do the math for you!",
    section: "budget",
  },
  {
    id: "per-pay",
    title: "Per Pay - The Magic Column!",
    description:
      "This is what you'll set aside each payday. It's calculated from target amount and frequency automatically.",
    icon: <Calculator className="h-6 w-6 text-sage" />,
    tip: "When your pay arrives, I'll recognise it and make sure funds get allocated to your envelopes. You just need to approve it!",
    section: "budget",
  },
  {
    id: "summary",
    title: "Keeping Things Balanced",
    description: (
      <>
        At the bottom you'll see your total allocation and surplus/shortfall. This is{" "}
        <strong>$0 balance budgeting</strong> - every dollar has a purpose. Put any surplus into your Surplus envelope, and if you've over-allocated, adjust your flexible expenses first until you're balanced.
      </>
    ),
    icon: <PiggyBank className="h-6 w-6 text-sage" />,
    tip: "That surplus can contribute to getting on track and following the My Budget Way - it's your buffer for life's surprises!",
    section: "budget",
  },

  // === SEASONAL BILLS SECTION ===
  {
    id: "seasonal-intro",
    title: "Seasonal Bills Explained",
    description: (
      <>
        Some bills change significantly throughout the year. In New Zealand, <strong>power and gas bills</strong> are
        much higher in winter (June-August) when you're heating your home, and lower in summer.
      </>
    ),
    icon: <Thermometer className="h-6 w-6 text-blue" />,
    tip: "Winter power bills in NZ can be 2-3 times higher than summer! That's a big swing to plan for.",
    section: "seasonal",
  },
  {
    id: "seasonal-leveling",
    title: "Bill Leveling - The Solution",
    description: (
      <>
        Bill leveling calculates your <strong>yearly average</strong> so you save the same amount each pay.
        During low-bill months, you build up a buffer. During high-bill months, that buffer covers the extra.
      </>
    ),
    icon: <Calculator className="h-6 w-6 text-sage" />,
    tip: "It's like paying yourself forward. Summer-you is saving for winter-you!",
    section: "seasonal",
    visual: (
      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        <p className="text-xs font-medium text-center text-muted-foreground">Example: Power Bill</p>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-blue-light rounded">
            <p className="font-medium">Winter</p>
            <p className="text-lg text-blue">$350</p>
          </div>
          <div className="p-2 bg-gold-light rounded">
            <p className="font-medium">Summer</p>
            <p className="text-lg text-gold">$150</p>
          </div>
          <div className="p-2 bg-sage-very-light rounded border-2 border-sage">
            <p className="font-medium">Leveled</p>
            <p className="text-lg text-sage-dark">$250</p>
          </div>
        </div>
        <p className="text-xs text-center text-muted-foreground">Save $250/month all year = no surprises!</p>
      </div>
    ),
  },
  {
    id: "seasonal-patterns",
    title: "Two Seasonal Patterns",
    description: (
      <>
        Most Kiwis will use <strong>Winter Peak</strong> for power and gas. Water depends on if you've got a garden to water!
        Look for the <Thermometer className="inline h-3.5 w-3.5 text-blue" /> icon next to seasonal bills to set them up.
      </>
    ),
    icon: <Sun className="h-6 w-6 text-gold" />,
    tip: "Don't know your exact bills? Check your power company's app or take your best guess. You can adjust later.",
    section: "seasonal",
    visual: (
      <div className="space-y-2">
        <div className="flex items-center gap-3 p-2 bg-blue-light rounded-lg">
          <Thermometer className="h-5 w-5 text-blue flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Winter Peak</p>
            <p className="text-xs text-muted-foreground">Power, gas, heating - higher Jun-Aug</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-2 bg-gold-light rounded-lg">
          <Sun className="h-5 w-5 text-gold flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Summer Peak</p>
            <p className="text-xs text-muted-foreground">Water, pool - higher Dec-Feb</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "seasonal-buffer",
    title: "Add a Safety Buffer",
    description: (
      <>
        I recommend adding a <strong>10% safety buffer</strong> on top of your leveled amount.
        This protects against unexpectedly cold winters or price increases without throwing off your budget. I'll work that out with you when you set up leveling.
      </>
    ),
    icon: <Shield className="h-6 w-6 text-sage" />,
    tip: "A small buffer beats scrambling to cover an unexpectedly high bill. Peace of mind is worth it!",
    section: "seasonal",
  },

  // === CELEBRATIONS SECTION ===
  {
    id: "celebrations-intro",
    title: "Budgeting for Celebrations",
    description: (
      <>
        Birthdays, Christmas, festivals, anniversaries - celebrations are wonderful but can blow your budget if you're not prepared.
        My Budget Mate helps you <strong>spread the cost throughout the year</strong>.
      </>
    ),
    icon: <Gift className="h-6 w-6 text-gold" />,
    tip: "December doesn't have to be a financial nightmare! A little planning goes a long way.",
    section: "celebrations",
  },
  {
    id: "celebrations-types",
    title: "Two Types of Celebrations",
    description: (
      <>
        <strong>Birthdays & Anniversaries</strong> have different dates for each person.
        <strong> Festivals</strong> like Christmas, Easter, Diwali and Chinese New Year are one-time events. I handle both!
      </>
    ),
    icon: <Calendar className="h-6 w-6 text-sage" />,
    tip: "Birthdays need individual dates, but Christmas is the same for everyone!",
    section: "celebrations",
    visual: (
      <div className="space-y-2">
        <div className="flex items-center gap-3 p-2 bg-gold-light rounded-lg">
          <Cake className="h-5 w-5 text-gold flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Birthdays & Anniversaries</p>
            <p className="text-xs text-muted-foreground">Different dates for each person</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-2 bg-sage-very-light rounded-lg">
          <Gift className="h-5 w-5 text-sage flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Festivals & Holidays</p>
            <p className="text-xs text-muted-foreground">Christmas, Easter, Diwali, Chinese New Year - one event/year</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "celebrations-recipients",
    title: "Track Gift Recipients",
    description: (
      <>
        For each celebration envelope, add who you're buying for with their <strong>gift amount</strong>,
        optional <strong>party budget</strong>, and <strong>date</strong> (for birthdays). I calculate the monthly savings automatically!
      </>
    ),
    icon: <Users className="h-6 w-6 text-blue" />,
    tip: "Add everyone you buy gifts for - see the total before you commit!",
    section: "celebrations",
    visual: (
      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Example: Birthday Recipients</p>
        <div className="space-y-1.5 text-sm">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_60px_60px] gap-2 px-1.5 text-xs text-muted-foreground">
            <span>Name</span>
            <span className="text-center">🎁 Gift</span>
            <span className="text-center">🎉 Party</span>
          </div>
          {/* Data rows */}
          <div className="grid grid-cols-[1fr_60px_60px] gap-2 p-1.5 bg-white rounded border items-center">
            <span>Mum - 15 Mar</span>
            <span className="font-medium text-center">$80</span>
            <span className="text-center text-muted-foreground">-</span>
          </div>
          <div className="grid grid-cols-[1fr_60px_60px] gap-2 p-1.5 bg-white rounded border items-center">
            <span>Partner - 22 Jul</span>
            <span className="font-medium text-center">$150</span>
            <span className="font-medium text-center">$100</span>
          </div>
          <div className="grid grid-cols-[1fr_60px_60px] gap-2 p-1.5 bg-white rounded border items-center">
            <span>Best mate - 5 Nov</span>
            <span className="font-medium text-center">$50</span>
            <span className="text-center text-muted-foreground">-</span>
          </div>
        </div>
        <div className="border-t pt-2 mt-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Annual total:</span>
          <span className="font-bold text-sage-dark">$380 = ~$32/month</span>
        </div>
      </div>
    ),
  },
  {
    id: "celebrations-setup",
    title: "Setting Up Celebrations",
    description: (
      <>
        Look for the <span className="inline-flex items-center gap-0.5 text-gold font-medium">
          <Gift className="h-3.5 w-3.5" /> gift icon
        </span> next to celebration envelopes like Birthdays, Christmas, Festivals, or Anniversaries.
        Click to add your recipients and start saving!
      </>
    ),
    icon: <Cake className="h-6 w-6 text-gold" />,
    tip: "Celebrations should be joyful, not stressful. You've got this sorted now!",
    section: "celebrations",
  },

  // === COMPLETION ===
  {
    id: "complete",
    title: "You're Ready!",
    description: (
      <>
        Take your time to review and adjust. Click <strong>Continue</strong> when you're happy. After onboarding, you can make changes anytime on the Budget Allocation page.
      </>
    ),
    icon: <Sparkles className="h-6 w-6 text-gold" />,
    tip: "You've got this. You're building a solid foundation for your financial future!",
  },
];

interface AllocationTutorialProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function AllocationTutorial({
  open,
  onOpenChange,
  onComplete,
}: AllocationTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = TUTORIAL_STEPS[currentStep];

  const handleNext = () => {
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

  const handleComplete = async () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("allocation_tutorial_completed", "true");

      // Award achievement for completing tutorial
      try {
        await fetch("/api/achievements/award", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ achievementKey: "budget-tutorial-complete" }),
        });
      } catch (error) {
        // Silently fail - achievement is a bonus, not critical
        console.error("Failed to award tutorial achievement:", error);
      }
    }
    setCurrentStep(0);
    onOpenChange(false);
    onComplete();
  };

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("allocation_tutorial_completed", "true");
    }
    setCurrentStep(0);
    onOpenChange(false);
    onComplete();
  };

  // Don't render if not open
  if (!open) return null;

  return (
    <Card className="border-sage bg-white shadow-md">
      <CardContent className="p-4 space-y-3">
        {/* Header with close button */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sage-very-light rounded-lg flex-shrink-0">
              {step.icon}
            </div>
            <h3 className="font-semibold text-text-dark">{step.title}</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 -mt-1 -mr-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1">
          {TUTORIAL_STEPS.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= currentStep ? "bg-sage" : "bg-gray-200"
              )}
            />
          ))}
        </div>

        {/* Description */}
        <p className="text-sm text-text-medium leading-relaxed">
          {step.description}
        </p>

        {/* Remy tip - same size as description text */}
        <div className="flex gap-2 p-2 bg-sage-very-light rounded-lg">
          <RemyAvatar
            pose={currentStep === TUTORIAL_STEPS.length - 1 ? "celebrating" : "small"}
            size="sm"
            className="!w-8 !h-8 !border-0 !shadow-none flex-shrink-0"
          />
          <p className="text-sm text-sage-dark italic leading-relaxed">
            "{step.tip}"
          </p>
        </div>

        {/* Visual examples for specific steps */}
        {step.visual && step.visual}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="gap-1 h-8"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <span className="text-xs text-muted-foreground">
            {currentStep + 1} / {TUTORIAL_STEPS.length}
          </span>

          <Button
            size="sm"
            onClick={handleNext}
            className="bg-sage hover:bg-sage-dark gap-1 h-8"
          >
            {currentStep === TUTORIAL_STEPS.length - 1 ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Done
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Dismiss link */}
        <div className="text-center -mb-1">
          <button
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-text-medium underline"
          >
            Dismiss tutorial
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
