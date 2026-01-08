import type { PageCoaching } from "../types";

export const financialPositionCoaching: PageCoaching = {
  pageId: "financial-position",
  pageName: "Financial Position",

  purpose:
    "Track your overall financial position. Assets minus liabilities equals your net worth.",

  remyIntro:
    "This is the long view. Day-to-day budgeting is important, but net worth shows how far you've come on your whole journey. Every debt paid and every dollar saved moves this number in the right direction.",

  quickTips: [
    "Don't stress if net worth is negative, many people start there",
    "Focus on the trend, not the number. Is it moving in the right direction?",
    "Update property and vehicle values once or twice a year",
    "Celebrate when you hit milestones, even small ones",
    "The budget allocation chart shows where your money goes each month",
  ],

  features: [
    {
      id: "net-worth-summary",
      name: "Net Worth Summary",
      what: "Your total assets minus total liabilities in one number.",
      why: "The ultimate scorecard for your financial health.",
      how: "This updates automatically as you record balances. Check it monthly to see your trend.",
    },
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
      id: "accounts",
      name: "Bank Accounts",
      what: "Your transaction, savings, and debt accounts.",
      why: "These are your primary cash assets and track your day-to-day balances.",
      how: "Accounts sync via Akahu if connected, or update manually. Debt accounts show as liabilities.",
    },
    {
      id: "trend-chart",
      name: "Trend Chart",
      what: "Visual history of your net worth over time.",
      why: "Shows your progress. Even small improvements add up over months and years.",
      how: "The app takes snapshots automatically. Check back monthly to see your trend.",
    },
    {
      id: "budget-allocation",
      name: "Budget Allocation by Category",
      what: "Pie chart showing how your budget is distributed across categories.",
      why: "See the big picture of where your money goes each month.",
      how: "Categories from your envelopes are used. Larger slices show where most of your budget is committed.",
    },
    {
      id: "asset-allocation",
      name: "Asset Allocation",
      what: "Breakdown of your assets by type: cash, investments, property, vehicles.",
      why: "Understand how diversified your wealth is.",
      how: "Shown as a visual breakdown. Most people have more cash early on, shifting to investments over time.",
    },
    {
      id: "monthly-snapshots",
      name: "Monthly Snapshots",
      what: "Point-in-time records of your financial position.",
      why: "Track progress month by month with consistent data points.",
      how: "Snapshots are taken automatically. Historical data helps you see patterns and celebrate progress.",
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
    {
      question: "What about my KiwiSaver?",
      answer:
        "Add it as an investment asset. Update the balance every few months when you get a statement. It's part of your long-term wealth.",
    },
    {
      question: "How often should I update manual assets?",
      answer:
        "Property and vehicle values: once or twice a year. Investment accounts: monthly or quarterly. Bank accounts: automatically if connected, otherwise weekly.",
    },
    {
      question: "What does the budget allocation chart show?",
      answer:
        "It shows your monthly budget commitments grouped by category. Larger slices represent categories where you allocate more money each month.",
    },
  ],

  methodology:
    "Net worth is the ultimate score card. When you tell your money where to go and stick to the plan, this number moves in your favour over time.",
};
