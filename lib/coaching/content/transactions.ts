import type { PageCoaching } from "../types";

export const transactionsCoaching: PageCoaching = {
  pageId: "transactions",
  pageName: "Transactions",

  purpose:
    "Review and categorise your transactions. This is how you track where your money actually went.",

  remyIntro:
    "Every transaction tells a story. Categorising them helps you see the real picture of your spending, not just what you planned.",

  quickTips: [
    "Categorise transactions regularly, it only takes a few minutes",
    "Uncategorised transactions show where money went but hasn't been tracked",
    "Use labels for things that span multiple envelopes (like a holiday)",
    "The search and filter options help you find specific transactions quickly",
  ],

  features: [
    {
      id: "categorisation",
      name: "Envelope Assignment",
      what: "Assigning each transaction to the envelope it should come from.",
      why: "This is how envelope balances stay accurate. It connects your real spending to your plan.",
      how: "Click the envelope dropdown on any transaction and select the right envelope.",
    },
    {
      id: "labels",
      name: "Labels",
      what: "Tags you can add to transactions across different envelopes.",
      why: "Perfect for tracking total spend on something that spans categories, like a holiday or renovation.",
      how: "Add labels when reviewing transactions. Later, filter by label to see totals.",
    },
    {
      id: "import",
      name: "Bank Import",
      what: "Automatic import of transactions from your connected bank accounts.",
      why: "Saves you entering transactions manually. Just review and categorise.",
      how: "Transactions sync automatically via Akahu. New ones appear in your 'To Review' list.",
    },
  ],

  faqs: [
    {
      question: "Do I need to categorise every single transaction?",
      answer:
        "For accurate envelope tracking, yes. But it doesn't have to be painful. Do a quick review every few days and it stays manageable.",
    },
    {
      question: "What if a transaction should split across envelopes?",
      answer:
        "You can split transactions! Click the split icon to divide the amount between multiple envelopes.",
    },
    {
      question: "How do I handle cash withdrawals?",
      answer:
        "Categorise the withdrawal to the envelope you'll spend it from. If it's general spending money, you might have a 'Cash' envelope for this.",
    },
  ],
};
