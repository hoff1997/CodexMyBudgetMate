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
    "Attach receipts to transactions for easy reference later",
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
    {
      id: "receipts",
      name: "Receipt Attachments",
      what: "Attach photos of receipts to any transaction.",
      why: "Keep proof of purchase for warranties, returns, or expense claims.",
      how: "Click the receipt icon on a transaction and upload a photo. The image is stored securely with the transaction.",
    },
    {
      id: "duplicates",
      name: "Duplicate Detection",
      what: "Automatically flags transactions that might be duplicates.",
      why: "Prevents double-counting when the same transaction appears from different sources.",
      how: "Flagged duplicates appear with a warning icon. Review them and mark as duplicate or keep as separate transactions.",
    },
    {
      id: "pay-plan",
      name: "Pay Plan Context",
      what: "See which pay cycle each transaction belongs to.",
      why: "Understand your spending patterns relative to your income timing.",
      how: "Transactions show which pay period they fall into based on your income source settings.",
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
        "You can split transactions! Click the split icon to divide the amount between multiple envelopes. Great for supermarket shops that include groceries and household items.",
    },
    {
      question: "How do I handle cash withdrawals?",
      answer:
        "Categorise the withdrawal to the envelope you'll spend it from. If it's general spending money, you might have a 'Cash' envelope for this.",
    },
    {
      question: "What do I do with a flagged duplicate?",
      answer:
        "Review both transactions. If they're the same, mark one as a duplicate. If they're genuinely separate (like two coffees on the same day), mark them as not duplicates.",
    },
    {
      question: "How do I find old transactions?",
      answer:
        "Use the search bar to find by merchant name or description. Use filters to narrow by date range, account, or envelope. You can also filter by label if you've tagged transactions.",
    },
  ],
};
