import type { PageCoaching } from "../types";

export const dashboardCoaching: PageCoaching = {
  pageId: "dashboard",
  pageName: "Dashboard",

  purpose:
    "Your financial snapshot. See where you stand at a glance, then dive deeper when you need to.",

  remyIntro:
    "Kia ora! This is your home base. Everything you need to see is right here. When you're ready to take action, the other pages are just a click away.",

  quickTips: [
    "Check your envelope balance before you spend, purchase, or commit to anything",
    "Pop back here whenever you need to check a spending balance",
    "Check in after each pay day to see your updated balances",
    "Toggle the eye icon on envelopes you want to monitor closely",
    "The coaching widget gives you personalised tips based on your budget state",
  ],

  features: [
    {
      id: "summary-header",
      name: "Summary Header",
      what: "Your available balance, income this month, and overall budget health at a glance.",
      why: "Quickly see if you're on track without digging into the details.",
      how: "The health indicator shows green (healthy), amber (needs attention), or blue (critical). Click for more details.",
    },
    {
      id: "quick-actions",
      name: "Quick Actions",
      what: "One-click buttons for the most common tasks.",
      why: "Saves you navigating through menus for everyday actions.",
      how: "Use these to quickly add transactions, allocate funds, or jump to reconciliation.",
    },
    {
      id: "coaching-widget",
      name: "Coaching Widget",
      what: "Personalised tips from Remy based on your current budget state.",
      why: "Get guidance that's relevant to your situation right now.",
      how: "The widget analyses your envelopes and income to suggest what to focus on next.",
    },
    {
      id: "envelope-status",
      name: "Envelope Status",
      what: "A quick view of which envelopes need attention.",
      why: "Helps you spot potential issues before they become problems.",
      how: "Envelopes showing in blue are underfunded or have bills coming up soon.",
    },
    {
      id: "reconciliation-alert",
      name: "Reconciliation Alert",
      what: "Shows when you have transactions waiting to be categorised.",
      why: "Keeping transactions categorised keeps your envelope balances accurate.",
      how: "Click to go straight to reconciliation and clear your pending items.",
    },
    {
      id: "quick-glance",
      name: "Quick Glance",
      what: "Your monitored envelopes and surplus at a glance.",
      why: "Keep an eye on the envelopes that matter most to you.",
      how: "Toggle the eye icon on any envelope to add or remove it from Quick Glance.",
    },
    {
      id: "upcoming-bills",
      name: "Upcoming Bills",
      what: "Bills coming up soon, sorted by due date.",
      why: "Never be surprised by a bill again. See what's coming and plan ahead.",
      how: "Shows how many pay cycles until each bill is due, so you can prioritise funding.",
    },
    {
      id: "allocation-flow",
      name: "Allocation Flow",
      what: "Visual breakdown of where your income goes by priority.",
      why: "See the big picture of how your money is distributed.",
      how: "Shows Essential, Important, and Extras categories plus any unallocated surplus.",
    },
    {
      id: "celebration-reminders",
      name: "Celebration Reminders",
      what: "Upcoming birthdays and celebrations you're saving for.",
      why: "Stay on top of gift-giving without last-minute scrambles.",
      how: "Set up celebration envelopes and the dashboard will remind you when they're approaching.",
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
    {
      question: "What does the coaching widget suggest?",
      answer:
        "It looks at your budget state and gives relevant tips. If you have unallocated surplus, it might suggest where to put it. If envelopes are underfunded, it highlights which ones to focus on.",
    },
    {
      question: "How do I add an envelope to Quick Glance?",
      answer:
        "Toggle the eye icon next to any envelope. Monitored envelopes appear in the Quick Glance widget so you can track them easily.",
    },
  ],

  methodology:
    "When you tell your money where to go, you stop wondering where it went. The dashboard shows you whether your money is going where you planned.",
};
