import type { PageCoaching } from "../types";

export const reconcileCoaching: PageCoaching = {
  pageId: "reconcile",
  pageName: "Reconcile",

  purpose:
    "Make sure your envelope balances match reality. Reconciling keeps everything accurate and trustworthy.",

  remyIntro:
    "Reconciling is like checking your compass. It makes sure the numbers in the app match what's actually in your accounts. When everything lines up, you can trust what you see.",

  quickTips: [
    "Reconcile after each pay day for best accuracy",
    "The formula is: Bank Balance - Envelope Balances = Surplus",
    "If something's off, check for uncategorised transactions first",
    "Small rounding differences are normal and okay",
    "Use smart suggestions to speed up categorisation",
    "Split transactions when one purchase covers multiple envelopes",
  ],

  features: [
    {
      id: "account-balances",
      name: "Account Balances",
      what: "The actual balances in your bank accounts right now.",
      why: "This is your source of truth. Everything else needs to match this.",
      how: "Enter your current bank balance, or let it sync automatically if connected via Akahu.",
    },
    {
      id: "envelope-total",
      name: "Envelope Total",
      what: "The sum of all your envelope balances.",
      why: "This should equal your bank balance minus surplus. If not, something needs attention.",
      how: "This calculates automatically from your envelope balances.",
    },
    {
      id: "surplus-check",
      name: "Surplus Verification",
      what: "The difference between bank balance and envelope totals.",
      why: "Shows money that's in your accounts but not yet allocated to envelopes.",
      how: "A positive surplus is fine, even good. A negative surplus means you've over-allocated.",
    },
    {
      id: "smart-suggestions",
      name: "Smart Suggestions",
      what: "AI-powered suggestions for categorising transactions.",
      why: "Speeds up reconciliation by learning from your patterns.",
      how: "Accept suggestions with one click, or override if the system got it wrong. It learns from your choices.",
    },
    {
      id: "csv-import",
      name: "CSV Import",
      what: "Import transactions from a CSV file downloaded from your bank.",
      why: "Useful if your bank isn't connected via Akahu or for older transactions.",
      how: "Click Import CSV, upload your file, and map the columns to match your bank's format.",
    },
    {
      id: "receipt-upload",
      name: "Receipt Upload",
      what: "Attach receipt photos to transactions for record-keeping.",
      why: "Keep proof of purchase organised with the transaction it belongs to.",
      how: "Click the camera icon on any transaction and upload a photo of the receipt.",
    },
    {
      id: "split-transactions",
      name: "Split Transactions",
      what: "Divide a single transaction across multiple envelopes.",
      why: "Perfect for supermarket shops or other purchases that cover multiple categories.",
      how: "Click the split icon, enter amounts for each envelope, and save. The total must match the original transaction.",
    },
    {
      id: "duplicate-detection",
      name: "Duplicate Detection",
      what: "Flags transactions that might be duplicates.",
      why: "Prevents double-counting when importing from multiple sources.",
      how: "Review flagged items and mark as duplicate to ignore, or keep as separate if they're genuine.",
    },
    {
      id: "date-filters",
      name: "Date Filters",
      what: "Quick filters for common date ranges.",
      why: "Focus on recent transactions or review a specific period.",
      how: "Use presets like 'This Month' or 'Last 3 Months', or set a custom date range.",
    },
  ],

  faqs: [
    {
      question: "My numbers don't match. What should I check?",
      answer:
        "First, look for uncategorised transactions. They affect your bank balance but not your envelopes. Then check for any transactions that might be in the wrong envelope.",
    },
    {
      question: "How often should I reconcile?",
      answer:
        "After each pay day is ideal. Some people do it weekly, others daily. Find what works for you. The more often you check, the easier it is to spot issues.",
    },
    {
      question: "What if I'm a few dollars off?",
      answer:
        "Small differences happen, especially with rounding or timing. If it's under $5 and you've checked everything, you can adjust an envelope to make it balance.",
    },
    {
      question: "What about credit card balances?",
      answer:
        "Credit card debt shows as a liability. The holding envelope tracks money set aside to pay the card. The actual card balance is separate from your envelope system.",
    },
    {
      question: "How do smart suggestions learn?",
      answer:
        "The system looks at your past categorisation patterns. If you always assign 'Countdown' to Groceries, it will suggest that. The more you use it, the smarter it gets.",
    },
    {
      question: "Can I undo a split transaction?",
      answer:
        "Yes. Find the split transaction and click the split icon again. You can unsplit it back to a single transaction and recategorise.",
    },
  ],

  methodology:
    "Reconciling builds trust in your budget. When you know the numbers are accurate, you can make confident decisions about your money.",
};
