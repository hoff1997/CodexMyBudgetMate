import type { PageCoaching } from "../types";

export const allocationCoaching: PageCoaching = {
  pageId: "allocation",
  pageName: "Allocation",

  purpose:
    "This is where you tell your money where to go. Plan your spending before it happens, so you're always in control.",

  remyIntro:
    "This is the engine room! When you tell your money where to go here, you stop wondering where it went later. Let's make sure every dollar has a destination.",

  quickTips: [
    "Start with essentials: the bills that keep the lights on and food on the table",
    "Fund in priority order: essentials first, then important, then extras",
    "Your target is what the envelope needs, not what you wish you could spend",
    "Surplus isn't 'spare' money. It's your flexibility fund and opportunity buffer",
    "It's okay to adjust as you learn your actual spending patterns",
  ],

  features: [
    {
      id: "priority-groups",
      name: "Priority Groups",
      what: "Envelopes grouped by how critical they are: Essential, Important, Extras.",
      why: "When money's tight, you'll know exactly what to fund first and what can wait.",
      how: "Click the priority dot next to any envelope to change its group. Most people have 4-6 essential envelopes.",
    },
    {
      id: "target-amount",
      name: "Target Amount",
      what: "How much this envelope needs each billing cycle.",
      why: "Knowing the target helps you see if you're on track or need to adjust.",
      how: "Click to edit. For bills, enter the actual bill amount. For spending categories, start with your best guess and adjust over time.",
    },
    {
      id: "funding-status",
      name: "Funding Status",
      what: "Shows whether each envelope has enough to cover its next target.",
      why: "Quickly spot which envelopes need attention this pay cycle.",
      how: "Funded shows in sage green, underfunded shows in blue. Focus on the blue ones first.",
    },
    {
      id: "due-dates",
      name: "Due Dates",
      what: "When each bill needs to be paid.",
      why: "Helps you prioritise which envelopes to fund first based on timing.",
      how: "Set due dates when creating envelopes. Bills due soonest should be funded first.",
    },
  ],

  faqs: [
    {
      question: "What if I don't have enough for all my envelopes?",
      answer:
        "That's exactly why we prioritise! Fund your essentials first, then work down the list. It's better to fully fund important things than partially fund everything. The extras can wait until next pay.",
    },
    {
      question: "How do I handle irregular income?",
      answer:
        "Budget based on your lowest typical income. When you earn more, the extra goes to surplus first. Then you can choose to boost envelopes, build your buffer, or pay extra on debt.",
    },
    {
      question: "Should I fund envelopes for next month?",
      answer:
        "Focus on the current cycle first. Once all your envelopes are funded and you have a healthy surplus buffer, you can start funding ahead. But don't stretch yourself thin trying to get ahead.",
    },
    {
      question: "What's the difference between target and balance?",
      answer:
        "Target is what you need. Balance is what you have. If balance equals or exceeds target, you're sorted for this cycle.",
    },
  ],

  methodology:
    "When you tell your money where to go, you stop wondering where it went. Allocation is where you make those decisions, before the money gets spent.",

  commonMistakes: [
    "Setting targets too tight with no breathing room",
    "Forgetting irregular expenses like car rego or insurance",
    "Not adjusting after a few pay cycles of real data",
    "Treating surplus as spending money instead of a buffer",
  ],
};
