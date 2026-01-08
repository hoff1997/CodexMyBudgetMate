"use client";

import { RemyHelpButton } from "@/components/shared/remy-help-button";

const HELP_CONTENT = {
  coaching: [
    "Settings help you customize each child's experience with real money management.",
    "Teaching teens to manage real bank accounts prepares them for financial independence.",
    "Expected and Extra chores build habits while teaching the value of earning.",
  ],
  tips: [
    "Link their real bank accounts so they can see their actual money",
    "Set up pocket money with Expected chores to build daily habits",
    "Add Extra chores they can invoice you for to earn more",
  ],
  features: [
    "Link real bank accounts via Akahu for authentic money tracking",
    "Set pocket money amounts and chore expectations",
    "Configure invoice frequency for Extra chore earnings",
    "Control Household Hub access per child",
  ],
  faqs: [
    {
      question: "What are Expected vs Extra chores?",
      answer: "Expected chores are part of their pocket money - they should do them daily to build good habits. Extra chores earn them additional money that they can invoice you for.",
    },
    {
      question: "How does the invoice system work?",
      answer: "When your child completes Extra chores, they add them to an invoice. They submit the invoice to you, and when you pay them, Akahu detects the payment and marks it as paid.",
    },
    {
      question: "What is bank linking?",
      answer: "Teens can link their real bank accounts through Akahu. This lets them see their actual balances and teaches them real money management with their Spend, Save, Invest, and Give accounts.",
    },
  ],
};

export function KidsSettingsHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-text-dark">Kids Settings</h1>
        <p className="text-muted-foreground">
          Manage settings, permissions, and controls for your children
        </p>
      </div>
      <RemyHelpButton title="Kids Settings" content={HELP_CONTENT} />
    </div>
  );
}
