import type { PageCoaching } from "../types";

export const envelopeSummaryCoaching: PageCoaching = {
  pageId: "envelope-summary",
  pageName: "Envelope Summary",

  purpose:
    "See all your envelopes at a glance. Check balances, track progress, and spot any that need attention.",

  remyIntro:
    "Here's the big picture of all your envelopes. Think of each envelope as a little container for a specific purpose. The money inside is earmarked for that job and nothing else.",

  quickTips: [
    "Green balances mean you're on track for that envelope",
    "Blue balances mean the envelope needs more funding",
    "Click any envelope to see its transaction history",
    "Use categories to group related envelopes together",
  ],

  features: [
    {
      id: "envelope-balance",
      name: "Current Balance",
      what: "How much money is currently in each envelope.",
      why: "Shows exactly what you have available for each spending purpose.",
      how: "This updates automatically as you categorise transactions and make allocations.",
    },
    {
      id: "categories",
      name: "Categories",
      what: "Groups of related envelopes (e.g., Bills, Transport, Fun).",
      why: "Makes it easier to find envelopes and see totals by category.",
      how: "Assign categories when creating envelopes, or edit them anytime.",
    },
    {
      id: "progress-bars",
      name: "Progress Bars",
      what: "Visual indicator of how funded each envelope is.",
      why: "Quick visual scan to spot which envelopes need attention.",
      how: "Sage green means funded, partially filled means in progress.",
    },
  ],

  faqs: [
    {
      question: "What happens if an envelope goes negative?",
      answer:
        "It means you've spent more than you allocated. No stress, it happens! You can move money from another envelope or from surplus to cover it. The key is noticing it and adjusting.",
    },
    {
      question: "Can I have money in an envelope without a target?",
      answer:
        "Yes! Savings envelopes and goals often work this way. You add money when you can, and watch it grow over time.",
    },
    {
      question: "Should I empty envelopes at month end?",
      answer:
        "Not usually. Most envelopes roll over to the next month. This is especially important for bills that aren't monthly, savings goals, and buffer amounts.",
    },
  ],
};
