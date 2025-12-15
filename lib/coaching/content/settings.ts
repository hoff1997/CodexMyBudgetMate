import type { PageCoaching } from "../types";

export const settingsCoaching: PageCoaching = {
  pageId: "settings",
  pageName: "Settings",

  purpose:
    "Customise how My Budget Mate works for you. Update your profile, manage income sources, and control your data.",

  remyIntro:
    "This is where you set things up to match your situation. Everyone's journey is different, so make sure the app knows about yours.",

  quickTips: [
    "Keep your income sources up to date, especially if your pay changes",
    "Set your default landing page to wherever you want to start each visit",
    "Connect your bank via Akahu for automatic transaction imports",
    "You can export all your data anytime",
  ],

  features: [
    {
      id: "income-sources",
      name: "Income Sources",
      what: "Your jobs, side hustles, and other income streams.",
      why: "The app uses this to help you plan around your pay cycles.",
      how: "Add each income source with its amount, frequency, and next pay date. Update when things change.",
    },
    {
      id: "bank-connections",
      name: "Bank Connections",
      what: "Links to your bank accounts via Akahu.",
      why: "Automatic transaction imports save you entering everything manually.",
      how: "Click Connect Bank and follow the Akahu setup. Your transactions will sync automatically.",
    },
    {
      id: "labels",
      name: "Labels",
      what: "Tags for tracking spending across multiple envelopes.",
      why: "Perfect for things like holidays or projects that span different categories.",
      how: "Create labels here, then apply them to transactions. Filter by label to see totals.",
    },
  ],

  faqs: [
    {
      question: "What happens if I change jobs?",
      answer:
        "Update your income sources. You can end the old income and add the new one. The app will adjust to your new pay cycle.",
    },
    {
      question: "Is my bank data secure?",
      answer:
        "Yes. Bank connections use Akahu, a secure NZ service. We never see your bank login details. You can disconnect anytime.",
    },
    {
      question: "Can I delete my account?",
      answer:
        "Yes. In Data & Privacy you can export all your data first, then delete your account. This removes everything permanently.",
    },
  ],
};
