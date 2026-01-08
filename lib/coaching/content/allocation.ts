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
    "Use categories to group related envelopes together",
    "Archive envelopes you no longer need instead of deleting them",
  ],

  features: [
    {
      id: "income-progress",
      name: "Income Progress Cards",
      what: "Shows each income source and how much has been allocated from it.",
      why: "See at a glance how much of each pay is committed and what's left to allocate.",
      how: "Each card shows total income, amount allocated, and remaining surplus. Click to see detailed breakdown.",
    },
    {
      id: "priority-groups",
      name: "Priority Groups",
      what: "Envelopes grouped by how critical they are: Essential, Important, Flexible.",
      why: "When money's tight, you'll know exactly what to fund first and what can wait.",
      how: "Click the priority dot next to any envelope to change its group. Most people have 4-6 essential envelopes.",
    },
    {
      id: "category-groups",
      name: "Category Groups",
      what: "Organise envelopes into custom categories like Housing, Transport, or Food.",
      why: "Makes it easier to find envelopes and see spending by area of life.",
      how: "Click the folder icon on any envelope to assign it to a category. Create new categories in Settings.",
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
      id: "leveled-bills",
      name: "Leveled Bills",
      what: "Spread variable bills (like power or rates) evenly across the year.",
      why: "Avoid bill shock from seasonal variations. Pay the same amount each pay cycle.",
      how: "Click the thermometer icon on variable bills. Enter 12 months of amounts and the system calculates a level payment.",
    },
    {
      id: "transfer-funds",
      name: "Transfer Funds",
      what: "Move money between envelopes when plans change.",
      why: "Life happens. Transfers let you adjust without breaking your budget.",
      how: "Click the transfer icon or use the Transfer button. Select source and destination envelopes and the amount.",
    },
    {
      id: "archive-envelopes",
      name: "Archive Envelopes",
      what: "Hide envelopes you no longer need without losing history.",
      why: "Keep your active list clean while preserving data for reference.",
      how: "Click the three-dot menu on any envelope and select Archive. Archived envelopes can be restored anytime.",
    },
    {
      id: "snapshot-view",
      name: "Snapshot View",
      what: "A summary view of your budget state for quick review.",
      why: "Great for a quick check-in without scrolling through all envelopes.",
      how: "Toggle the snapshot view to see totals by priority and category.",
    },
    {
      id: "my-budget-way",
      name: "My Budget Way Widget",
      what: "Personalised guidance showing CC debt progress, suggested envelopes, and milestones.",
      why: "Stay motivated with progress tracking and personalised next steps.",
      how: "The widget adapts to your situation, showing debt payoff progress, envelope suggestions, or milestone celebrations.",
    },
    {
      id: "gift-allocation",
      name: "Gift Allocation",
      what: "Link celebration envelopes to specific gift recipients.",
      why: "Know exactly how much you're saving for each person's birthday or Christmas gift.",
      how: "Click the gift icon on celebration envelopes to assign recipients and track savings per person.",
    },
    {
      id: "sorting",
      name: "Column Sorting",
      what: "Sort envelopes by any column to find what you need quickly.",
      why: "See envelopes ordered by amount, due date, priority, or name.",
      how: "Click any column header to sort. Click again to reverse. Click a third time to clear the sort.",
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
    {
      question: "How does bill leveling work?",
      answer:
        "Enter your last 12 months of bills (or estimates). The system calculates an average and you fund that amount each pay cycle. Some months you'll have extra in the envelope, other months you'll use the buffer.",
    },
    {
      question: "When should I archive vs delete an envelope?",
      answer:
        "Archive if you might need it again or want to keep the history. Delete only if you're sure you won't need the data. Archived envelopes can be restored; deleted ones are gone forever.",
    },
    {
      question: "How do I move money between envelopes?",
      answer:
        "Use the Transfer Funds feature. Select where the money is coming from, where it's going, and the amount. This is better than reducing one and adding to another because it tracks the transfer.",
    },
  ],

  methodology:
    "When you tell your money where to go, you stop wondering where it went. Allocation is where you make those decisions, before the money gets spent.",

  commonMistakes: [
    "Setting targets too tight with no breathing room",
    "Forgetting irregular expenses like car rego or insurance",
    "Not adjusting after a few pay cycles of real data",
    "Treating surplus as spending money instead of a buffer",
    "Not using leveling for variable bills like power or rates",
    "Deleting envelopes instead of archiving them",
  ],
};
