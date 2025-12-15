import type { PageCoaching } from "../types";

export const dashboardCoaching: PageCoaching = {
  pageId: "dashboard",
  pageName: "Dashboard",

  purpose:
    "Your financial snapshot. See where you stand at a glance, then dive deeper when you need to.",

  remyIntro:
    "Kia ora! This is your home base. Everything you need to see is right here. When you're ready to take action, the other pages are just a click away.",

  quickTips: [
    "Check in here after each pay day to see your updated balances",
    "The surplus shows money that's not yet allocated to an envelope",
    "Envelopes in blue need attention before their due date",
    "Your net worth tracks the big picture over time",
  ],

  features: [
    {
      id: "surplus-card",
      name: "Surplus",
      what: "Money sitting in your accounts that hasn't been allocated to an envelope yet.",
      why: "This is your flexibility fund. It's not 'spare' money, it's your buffer for unexpected things or extra debt payments.",
      how: "Click 'Allocate' to decide where this money should go. When you tell your money where to go, you stop wondering where it went.",
    },
    {
      id: "envelope-status",
      name: "Envelope Status",
      what: "A quick view of which envelopes need attention.",
      why: "Helps you spot potential issues before they become problems.",
      how: "Envelopes showing in blue are underfunded or have bills coming up soon.",
    },
    {
      id: "pays-until-due",
      name: "Pays Until Due",
      what: "How many pay cycles until each bill is due.",
      why: "Thinking in pay cycles (not calendar days) helps you plan better.",
      how: "If a bill is '1 pay away', make sure that envelope is funded this pay cycle.",
    },
  ],

  faqs: [
    {
      question: "What should I do first when I visit the dashboard?",
      answer:
        "Check your surplus. If there's money there, it means you have funds to allocate. Head to the Allocation page to tell that money where to go.",
    },
    {
      question: "Why is my surplus negative?",
      answer:
        "Your envelope balances add up to more than what's in your bank accounts. This usually means you've allocated money you don't have yet. Review your envelopes and adjust.",
    },
    {
      question: "How often should I check in?",
      answer:
        "Most people check after each pay day and once mid-cycle. Find what works for you. The goal is to stay on course without it becoming a chore.",
    },
  ],

  methodology:
    "When you tell your money where to go, you stop wondering where it went. The dashboard shows you whether your money is going where you planned.",
};
