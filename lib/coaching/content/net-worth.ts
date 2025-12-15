import type { PageCoaching } from "../types";

export const netWorthCoaching: PageCoaching = {
  pageId: "net-worth",
  pageName: "Net Worth",

  purpose:
    "Track your overall financial position. Assets minus liabilities equals your net worth.",

  remyIntro:
    "This is the long view. Day-to-day budgeting is important, but net worth shows how far you've come on your whole journey. Every debt paid and every dollar saved moves this number in the right direction.",

  quickTips: [
    "Don't stress if net worth is negative, many people start there",
    "Focus on the trend, not the number. Is it moving in the right direction?",
    "Update property and vehicle values once or twice a year",
    "Celebrate when you hit milestones, even small ones",
  ],

  features: [
    {
      id: "assets",
      name: "Assets",
      what: "Everything you own that has value: bank accounts, KiwiSaver, property, vehicles.",
      why: "These contribute positively to your net worth.",
      how: "Add accounts and assets in this page. Bank accounts sync automatically, others you update manually.",
    },
    {
      id: "liabilities",
      name: "Liabilities",
      what: "Everything you owe: credit cards, loans, mortgage, student loan.",
      why: "These reduce your net worth. Paying them down increases it.",
      how: "Add debt accounts and keep balances updated as you make payments.",
    },
    {
      id: "trend-chart",
      name: "Trend Chart",
      what: "Visual history of your net worth over time.",
      why: "Shows your progress. Even small improvements add up over months and years.",
      how: "The app takes snapshots automatically. Check back monthly to see your trend.",
    },
  ],

  faqs: [
    {
      question: "My net worth is negative. Is that bad?",
      answer:
        "It's common, especially if you have a mortgage or student loan. What matters is the direction. If it's moving up (or your debt is moving down), you're on the right track.",
    },
    {
      question: "Should I include my house?",
      answer:
        "It's up to you. Some people include property at a conservative estimate, others leave it out. Be consistent with whatever you choose.",
    },
    {
      question: "How accurate do values need to be?",
      answer:
        "Ballpark is fine for things like vehicles and property. Bank balances should be accurate. The goal is to see the overall picture and track progress.",
    },
  ],

  methodology:
    "Net worth is the ultimate score card. When you tell your money where to go and stick to the plan, this number moves in your favour over time.",
};
