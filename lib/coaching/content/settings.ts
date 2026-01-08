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
    "Create categories to organise your envelopes by area of life",
    "Check out your achievements to see how far you've come",
  ],

  features: [
    {
      id: "profile",
      name: "Profile Settings",
      what: "Your name, preferred name, avatar, and date of birth.",
      why: "Personalise the app and help Remy greet you properly.",
      how: "Update your details anytime. Your preferred name is what Remy calls you in messages.",
    },
    {
      id: "income-sources",
      name: "Income Sources",
      what: "Your jobs, side hustles, and other income streams.",
      why: "The app uses this to help you plan around your pay cycles.",
      how: "Add each income source with its amount, frequency, and next pay date. Update when things change.",
    },
    {
      id: "income-lifecycle",
      name: "Income Lifecycle",
      what: "End, archive, or replace income sources as your situation changes.",
      why: "Keep your income list accurate without losing historical data.",
      how: "Use the archive option for ended jobs. Create a replacement when you change jobs to keep history linked.",
    },
    {
      id: "bank-connections",
      name: "Bank Connections",
      what: "Links to your bank accounts via Akahu.",
      why: "Automatic transaction imports save you entering everything manually.",
      how: "Click Connect Bank and follow the Akahu setup. Your transactions will sync automatically.",
    },
    {
      id: "categories",
      name: "Envelope Categories",
      what: "Custom categories to organise your envelopes.",
      why: "Group related envelopes like Housing, Transport, or Food together.",
      how: "Create categories here, then assign envelopes to them on the Allocation page.",
    },
    {
      id: "labels",
      name: "Labels",
      what: "Tags for tracking spending across multiple envelopes.",
      why: "Perfect for things like holidays or projects that span different categories.",
      how: "Create labels here, then apply them to transactions. Filter by label to see totals.",
    },
    {
      id: "default-page",
      name: "Default Landing Page",
      what: "Choose which page opens when you log in.",
      why: "Go straight to where you spend the most time.",
      how: "Select your preferred starting page from the dropdown. Dashboard, Allocation, or Reconcile are popular choices.",
    },
    {
      id: "celebration-reminders",
      name: "Celebration Reminders",
      what: "Set how many weeks ahead to remind you about upcoming birthdays and celebrations.",
      why: "Never be caught off guard by a birthday or event.",
      how: "Choose 1-8 weeks. Reminders appear on the dashboard when celebrations are approaching.",
    },
    {
      id: "achievements",
      name: "Achievement Gallery",
      what: "View all the badges and milestones you've earned.",
      why: "Celebrate your progress and see how far you've come.",
      how: "Browse your achievements. Some unlock features, others are just for the satisfaction of collecting them.",
    },
    {
      id: "subscription",
      name: "Subscription",
      what: "Manage your My Budget Mate subscription.",
      why: "See your current plan and access billing options.",
      how: "View your subscription status and manage payments here.",
    },
  ],

  faqs: [
    {
      question: "What happens if I change jobs?",
      answer:
        "Update your income sources. You can end the old income and add the new one, or use 'Replace' to link them. The app will adjust to your new pay cycle.",
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
    {
      question: "What's the difference between categories and labels?",
      answer:
        "Categories organise your envelopes (one category per envelope). Labels tag individual transactions (multiple labels per transaction). Categories help structure your budget; labels help track projects or themes.",
    },
    {
      question: "How do I earn achievements?",
      answer:
        "Achievements unlock automatically as you use the app. Complete onboarding, pay off debt, hit savings goals, and maintain good habits to earn badges.",
    },
    {
      question: "What does the preferred name setting do?",
      answer:
        "It's the name Remy uses when greeting you. If your full name is 'Elizabeth Smith' but you go by 'Liz', set your preferred name to 'Liz' and Remy will say 'Kia ora, Liz!'",
    },
  ],
};
