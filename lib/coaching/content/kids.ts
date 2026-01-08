import type { PageCoaching } from "../types";

// ============================================================================
// KIDS MODULE COACHING CONTENT
// For teens with real bank accounts learning money management
// ============================================================================

// Simple help content interface for RemyHelpButton
export interface KidsHelpContent {
  coaching: string[];
  tips: string[];
  features: string[];
  faqs: { question: string; answer: string }[];
}

// ============================================================================
// PARENT VIEWS
// ============================================================================

export const kidsParentDashboardHelp: KidsHelpContent = {
  coaching: [
    "You're doing something meaningful here. Teaching kids about money early helps them build habits that can serve them for life.",
    "It's not about raising accountants - it's about helping them feel confident with money decisions.",
    "Some weeks will be messier than others. That's real life, and that's okay.",
  ],
  tips: [
    "Check in weekly to review invoices and chore completions together",
    "Use 'expected chores' for daily habits they should do regardless of pay",
    "Extra chores are great for teaching the connection between effort and earning",
  ],
  features: [
    "See all your children's financial progress at a glance",
    "Approve invoices when your child has completed extra chores",
    "Track expected chore streaks to celebrate consistency",
  ],
  faqs: [
    {
      question: "Why can't my child set their own chore amounts?",
      answer:
        "You control the chores and amounts to ensure fair, age-appropriate expectations. This mirrors how real workplaces set pay rates.",
    },
    {
      question: "What if my child doesn't complete expected chores?",
      answer:
        "That's a conversation for you and your child. We track streaks to show patterns, but how you handle missed chores is your call as a parent.",
    },
    {
      question: "How do I know if the pocket money amount is right?",
      answer:
        "There's no magic number. Consider their age, what they're expected to buy themselves, and your family budget. You can adjust anytime.",
    },
  ],
};

export const choresSetupHelp: KidsHelpContent = {
  coaching: [
    "You're teaching them that contributing to the household matters - and that earning comes from effort.",
    "Expected chores help build responsibility. Extra chores show them how to earn beyond the basics.",
    "You know your child best. Set expectations that stretch them just a bit.",
  ],
  tips: [
    "Start with 2-3 expected chores that are age-appropriate",
    "Photo proof works well for chores you can't easily verify",
    "Extra chores are great for bigger one-off jobs like car washing or garden work",
  ],
  features: [
    "Expected chores: Part of pocket money, builds daily habits",
    "Extra chores: Invoice-able, teaches earning through extra effort",
    "Photo proof option for accountability without micromanaging",
  ],
  faqs: [
    {
      question: "What's the difference between expected and extra chores?",
      answer:
        "Expected chores are what they do to earn their regular pocket money - like making their bed or emptying the dishwasher. Extra chores are one-off jobs they can invoice you for - like mowing the lawn or washing the car.",
    },
    {
      question: "Should I require photo proof?",
      answer:
        "It's up to you. Photo proof works well when you're not home to check, or for building accountability. Skip it for simple daily tasks where trust is enough.",
    },
    {
      question: "How much should I pay for extra chores?",
      answer:
        "Consider how long the task takes and how unpleasant it is. There's no formula - just what feels fair to you and motivating for them.",
    },
  ],
};

export const pocketMoneySetupHelp: KidsHelpContent = {
  coaching: [
    "Setting up real bank accounts together is one of the most valuable financial lessons you can give.",
    "The 50/20/20/10 split is a guideline, not a rule. Adjust it to what makes sense for your family.",
    "You're teaching them to manage real money before the stakes get high. That's a gift.",
  ],
  tips: [
    "Set up the bank transfers together - it's a great teaching moment",
    "Savings accounts earn interest, which helps kids see their money grow",
    "The 'Transfer First' rule teaches them how real banking works",
  ],
  features: [
    "Track pocket money as an income source with set frequency",
    "Guide includes step-by-step bank setup instructions",
    "Akahu syncs balances automatically once accounts are linked",
  ],
  faqs: [
    {
      question: "Why do I need to set this up at the bank?",
      answer:
        "My Budget Mate doesn't move money - it tracks what happens. Real transfers at the bank teach kids how banking actually works, and the app shows them the results.",
    },
    {
      question: "Can my child change their split percentages?",
      answer:
        "The splits are set up as automatic transfers at the bank - you control them. If you want to adjust, do it together as a conversation about their changing needs.",
    },
    {
      question: "What if we want a different split than 50/20/20/10?",
      answer:
        "Go for it! Some families do 60/20/10/10, others 40/30/20/10. What matters is that you're teaching the concept of allocating money intentionally.",
    },
  ],
};

export const invoiceReviewHelp: KidsHelpContent = {
  coaching: [
    "Paying invoices teaches them that work leads to payment - a simple but powerful lesson.",
    "Taking the time to review together shows them their effort matters to you.",
    "This is practice for the real world, where they'll submit timesheets and expense reports.",
  ],
  tips: [
    "Set a regular day to review and pay invoices together",
    "Use the photo proof to verify work without micromanaging",
    "Akahu will automatically match your payment when you transfer the money",
  ],
  features: [
    "See all completed extra chores ready for invoicing",
    "Approve chores before they appear on the invoice",
    "Auto-reconciliation matches your bank transfer to the invoice",
  ],
  faqs: [
    {
      question: "How does payment reconciliation work?",
      answer:
        "When you transfer money from your account to your child's Everyday account, Akahu detects it. If the amount matches an unpaid invoice, we'll ask your child to confirm and mark it as paid.",
    },
    {
      question: "What if I don't approve a chore?",
      answer:
        "It won't appear on their invoice. Use this as a teaching moment - discuss what was missing and how they can do better next time.",
    },
    {
      question: "Can I pay partial invoices?",
      answer:
        "We match exact amounts for simplicity. If you want to pay less, discuss it with your child first, then have them adjust the invoice.",
    },
  ],
};

export const hubPermissionsHelp: KidsHelpContent = {
  coaching: [
    "Giving your child access to household features helps them feel part of the family team.",
    "Start with view-only access, then expand as they show responsibility.",
    "These permissions are about trust and inclusion, not just convenience.",
  ],
  tips: [
    "Shopping list access lets them add items they've noticed are running low",
    "Recipe access can spark interest in cooking and meal planning",
    "Calendar view helps them understand family scheduling",
  ],
  features: [
    "Four permission levels: Hidden, View Only, Can Edit, Full Access",
    "Set different levels for each feature (shopping, recipes, todos, etc.)",
    "Changes take effect immediately",
  ],
  faqs: [
    {
      question: "What's the difference between Edit and Full Access?",
      answer:
        "Edit lets them modify existing items. Full Access lets them create and delete items too. Start with Edit and upgrade to Full if they're handling it well.",
    },
    {
      question: "Will my child see everything I've added?",
      answer:
        "Yes - the household features are shared within the family. If there's something private, consider keeping that feature hidden from kids.",
    },
    {
      question: "Can I change permissions later?",
      answer:
        "Absolutely. Permissions are meant to evolve as your child demonstrates responsibility. Review and adjust anytime.",
    },
  ],
};

// ============================================================================
// KID VIEWS
// ============================================================================

export const kidDashboardHelp: KidsHelpContent = {
  coaching: [
    "This is your money dashboard - it shows what you've got and what you're working toward.",
    "Completing your expected chores builds your streak - that's something to be proud of!",
    "Extra chores are your chance to earn more when you want to.",
  ],
  tips: [
    "Check your balances regularly to know where you stand",
    "Complete expected chores daily to keep your streak going",
    "Mark extra chores as done to add them to your invoice",
  ],
  features: [
    "See your Spend, Save, Invest, and Give balances",
    "Track your expected chore streaks",
    "View available extra chores you can do to earn more",
  ],
  faqs: [
    {
      question: "Why are there four different accounts?",
      answer:
        "Spend is for everyday stuff. Save is for things you're saving up for. Invest is for the future. Give is for helping others. Each has its own purpose!",
    },
    {
      question: "How do I use money from my Save account?",
      answer:
        "You need to transfer it to your Spend account first (at the bank). Then you can use your debit card. This helps you think before you spend.",
    },
    {
      question: "What happens when I complete an extra chore?",
      answer:
        "It goes onto your invoice. When you submit your invoice, your parent will pay you and the money goes into your accounts!",
    },
  ],
};

export const kidInvoiceHelp: KidsHelpContent = {
  coaching: [
    "Your invoice is like a pay slip - it shows what you've earned from your extra chores.",
    "Submitting your invoice is like handing in a timesheet at work. Get used to it!",
    "When the money arrives in your account, you'll get a notification to confirm it.",
  ],
  tips: [
    "Check your invoice before submitting to make sure everything is there",
    "Take good photos of completed chores if photo proof is required",
    "Submit your invoice on time each week to keep the money flowing",
  ],
  features: [
    "See all your approved chores ready for payment",
    "Submit your invoice with one tap",
    "Confirm when payment arrives in your bank account",
  ],
  faqs: [
    {
      question: "What if a chore isn't showing on my invoice?",
      answer:
        "Your parent needs to approve the chore first. If you've completed it and uploaded a photo (if required), wait for them to check it. If it's been a while, ask them about it.",
    },
    {
      question: "When do I get paid?",
      answer:
        "After you submit your invoice, your parent will transfer the money to your Everyday account. This usually happens within a day or two.",
    },
    {
      question: "What happens to the money when I get paid?",
      answer:
        "It arrives in your Everyday account. If you've set up automatic splits, some will move to your Save, Invest, and Give accounts. The rest stays in Everyday for spending.",
    },
  ],
};

export const kidChoresHelp: KidsHelpContent = {
  coaching: [
    "Chores are how you contribute to the family - and expected chores are also how you earn your pocket money.",
    "Building a streak shows you're reliable. That's a skill that'll help you your whole life.",
    "Extra chores are opportunities. The more you do, the more you earn.",
  ],
  tips: [
    "Check off expected chores as soon as you do them to keep your streak accurate",
    "If a chore needs photo proof, take a clear photo showing the finished job",
    "Extra chores can be done anytime - mark them done when you've finished",
  ],
  features: [
    "Expected chores: Do these for your pocket money and build streaks",
    "Extra chores: Complete these to add money to your invoice",
    "Photo proof: Upload a photo to show you've done the job",
  ],
  faqs: [
    {
      question: "What happens if I miss an expected chore?",
      answer:
        "Your streak resets and you'll need to start building it again. Don't stress - just get back on track tomorrow.",
    },
    {
      question: "Do I get paid for expected chores?",
      answer:
        "Expected chores are included in your regular pocket money. You don't invoice for them separately - they're part of the deal.",
    },
    {
      question: "How do I get credit for an extra chore?",
      answer:
        "Mark the chore as done (and add a photo if required). Your parent will approve it, and then it shows up on your invoice ready for payment.",
    },
  ],
};

export const kidTransferRequestHelp: KidsHelpContent = {
  coaching: [
    "Wanting to use your Save, Invest, or Give money? You'll need to transfer it to Spend first.",
    "Requesting a transfer means asking your parent to move the money at the bank.",
    "This extra step helps you think about whether you really want to use that money.",
  ],
  tips: [
    "Include a reason for your transfer request - it helps your parent understand",
    "Think about whether this is worth dipping into your savings for",
    "If denied, chat with your parent about why and what you could do differently",
  ],
  features: [
    "Request transfers from Save, Invest, or Give to Spend",
    "Add a reason for your request",
    "See the status of your requests (pending, approved, denied)",
  ],
  faqs: [
    {
      question: "Why can't I just spend from my Save account?",
      answer:
        "Your Save, Invest, and Give accounts are savings accounts without debit cards. To spend that money, it needs to be in your Everyday (Spend) account first. This is how real banking works!",
    },
    {
      question: "How long does a transfer take?",
      answer:
        "Once your parent approves and makes the transfer at the bank, it usually shows up the same day or next day. Then you can spend it.",
    },
    {
      question: "What if my parent says no?",
      answer:
        "That's a chance to talk about it. Maybe they have a reason, or maybe you can work out a compromise. It's all part of learning to manage money as a family.",
    },
  ],
};

// ============================================================================
// FULL PAGE COACHING (For PageCoaching format)
// ============================================================================

export const kidsParentDashboardCoaching: PageCoaching = {
  pageId: "kids-parent-dashboard",
  pageName: "Kids Dashboard",

  purpose:
    "Manage your children's pocket money, chores, and invoices. Help them learn real money skills with real accounts.",

  remyIntro:
    "Kia ora! This is where you help your kids learn about money. You're giving them a head start - and that's pretty special.",

  quickTips: [
    "Check in weekly to review invoices and chore completions together",
    "Use expected chores for daily habits, extra chores for earning opportunities",
    "Celebrate streak milestones - consistency is a valuable skill",
    "Review invoices together before paying to make it a learning moment",
    "Adjust pocket money and chores as your child grows",
  ],

  features: [
    {
      id: "child-overview",
      name: "Child Overview",
      what: "See each child's balances across their Spend, Save, Invest, and Give accounts.",
      why: "Helps you keep track of their progress without looking over their shoulder.",
      how: "Click on a child to see their detailed dashboard, chores, and invoices.",
    },
    {
      id: "expected-chores",
      name: "Expected Chores",
      what: "Chores that are part of their regular pocket money.",
      why: "Builds daily habits and responsibility without extra payment.",
      how: "These track streaks but don't appear on invoices.",
    },
    {
      id: "extra-chores",
      name: "Extra Chores",
      what: "One-off jobs your child can complete to earn extra money.",
      why: "Teaches the connection between effort and earning.",
      how: "You set the amounts. Completed extra chores appear on invoices.",
    },
    {
      id: "invoice-system",
      name: "Invoice System",
      what: "Your child submits an invoice for completed extra chores.",
      why: "Teaches them how real-world payment works.",
      how: "Review, approve, and pay invoices. Akahu matches your payment automatically.",
    },
    {
      id: "hub-permissions",
      name: "Household Hub Access",
      what: "Control which household features your child can access.",
      why: "Involves them in family life at an appropriate level.",
      how: "Set view, edit, or full access for shopping lists, recipes, todos, and more.",
    },
  ],

  faqs: [
    {
      question: "Should I use virtual or real accounts?",
      answer:
        "If your teen has bank accounts, use real accounts with Akahu. They'll learn actual banking skills. Virtual is for younger kids not ready for real money.",
    },
    {
      question: "How do I set up the pocket money splits?",
      answer:
        "You set these up at your child's bank, not in the app. The guide walks you through creating automatic transfers that split their pocket money into Spend, Save, Invest, and Give.",
    },
    {
      question: "What if my child overspends their Spend account?",
      answer:
        "That's a learning moment! With a debit card (not credit), they can't actually go negative. If they run out, they need to wait for next pocket money or request a transfer from savings.",
    },
    {
      question: "How do I pay an invoice?",
      answer:
        "Transfer the exact invoice amount from your bank to their Everyday account. Akahu will detect the payment and automatically match it to the invoice.",
    },
  ],

  methodology:
    "Kids learn best by doing. Real bank accounts, real money, real decisions. We're just here to make it visible and structured.",

  commonMistakes: [
    "Over-complicating chores - start simple and add more over time",
    "Forgetting to celebrate streaks - consistency deserves recognition",
    "Paying invoices without reviewing together - miss the teaching moment",
    "Making pocket money too easy or too hard to earn",
  ],
};

export const kidDashboardCoaching: PageCoaching = {
  pageId: "kid-dashboard",
  pageName: "Your Money",

  purpose:
    "See your money, track your chores, and manage your invoices. This is your financial home base.",

  remyIntro:
    "Hey there! This is your money dashboard. You've got four accounts working together to help you spend, save, invest, and give. Let's make your money work for you!",

  quickTips: [
    "Check your Spend balance before buying anything",
    "Complete expected chores daily to build your streak",
    "Submit your invoice on time to get paid faster",
    "Watch your Save account grow over time",
    "Use Give for things that matter to you",
  ],

  features: [
    {
      id: "account-balances",
      name: "Your Four Accounts",
      what: "Spend (everyday), Save (goals), Invest (future), Give (helping others).",
      why: "Each account has a purpose. This helps you make smart choices.",
      how: "Your pocket money splits automatically between these accounts.",
    },
    {
      id: "chore-streaks",
      name: "Chore Streaks",
      what: "How many days in a row you've completed your expected chores.",
      why: "Being consistent is a skill that'll help you your whole life.",
      how: "Complete expected chores every day to build your streak.",
    },
    {
      id: "invoice",
      name: "Your Invoice",
      what: "A list of extra chores you've completed that you can get paid for.",
      why: "This is how real jobs work - you do work, you submit a timesheet, you get paid.",
      how: "Complete extra chores, get them approved, then submit your invoice.",
    },
    {
      id: "recent-transactions",
      name: "Recent Activity",
      what: "Your latest transactions from all accounts.",
      why: "See where your money is going without logging into your bank.",
      how: "Transactions sync automatically from your bank via Akahu.",
    },
  ],

  faqs: [
    {
      question: "Why can't I spend from my Save account?",
      answer:
        "Your Save, Invest, and Give accounts are savings accounts - they don't have cards. To spend that money, you need to transfer it to Spend first. Ask your parent to help with the transfer at the bank.",
    },
    {
      question: "What's the difference between expected and extra chores?",
      answer:
        "Expected chores are part of your pocket money - you do them as part of the family. Extra chores are opportunities to earn more by doing one-off jobs like washing the car.",
    },
    {
      question: "How do I get my invoice paid?",
      answer:
        "Submit your invoice when it's ready. Your parent will transfer the money to your Everyday account. When it arrives, you'll be asked to confirm and the invoice gets marked as paid.",
    },
    {
      question: "Why did my streak reset?",
      answer:
        "Streaks reset when you miss a day. Don't worry - just start fresh tomorrow. The longest streak you've ever achieved is still recorded!",
    },
  ],

  methodology:
    "Learning to manage money starts with seeing where it goes. Your four accounts help you balance spending today with saving for tomorrow.",
};
