export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  celebrationTitle: string;
  celebrationMessage: string;
  remyMessage: string;
  category: "savings" | "debt" | "budgeting" | "consistency";
}

export const ACHIEVEMENTS: Record<string, AchievementDefinition> = {
  "starter-stash": {
    id: "starter-stash",
    name: "Starter Stash",
    description: "Save your first $1,000 emergency fund",
    icon: "🛡️",
    celebrationTitle: "Starter Stash Unlocked!",
    celebrationMessage:
      "You've saved your first $1,000 emergency fund. This is a massive milestone!",
    remyMessage:
      "You've done it! Your safety net is sorted. When life throws something your way, you're ready. This is what being sorted feels like.",
    category: "savings",
  },

  "first-envelope": {
    id: "first-envelope",
    name: "First Envelope",
    description: "Create your first envelope",
    icon: "📨",
    celebrationTitle: "First Envelope Created!",
    celebrationMessage:
      "You've taken the first step to telling your money where to go.",
    remyMessage:
      "Nice one! Your first envelope is set up. This is where the magic starts. When you tell your money where to go, you stop wondering where it went.",
    category: "budgeting",
  },

  "budget-boss": {
    id: "budget-boss",
    name: "Budget Boss",
    description: "Fully fund all essential envelopes",
    icon: "👑",
    celebrationTitle: "Budget Boss!",
    celebrationMessage:
      "All your essential envelopes are fully funded. Your basics are covered!",
    remyMessage:
      "Look at you! All your essentials are sorted. The roof over your head, food on the table, lights on. You've got the foundations locked in.",
    category: "budgeting",
  },

  "debt-destroyer": {
    id: "debt-destroyer",
    name: "Debt Destroyer",
    description: "Pay off your first debt completely",
    icon: "⚔️",
    celebrationTitle: "Debt Destroyed!",
    celebrationMessage:
      "You've paid off your first debt. The snowball is rolling!",
    remyMessage:
      "That's one debt gone! Feel that weight lifting? Take that payment and roll it into the next one. The snowball is picking up speed.",
    category: "debt",
  },

  "debt-free": {
    id: "debt-free",
    name: "Debt Free",
    description: "Pay off all your debts",
    icon: "🏆",
    celebrationTitle: "DEBT FREE!",
    celebrationMessage:
      "You've paid off ALL your debt. This is absolutely incredible!",
    remyMessage:
      "I'm genuinely proud of you. No more debt. No more payments going to interest. Every dollar you earn is now YOURS. This changes everything.",
    category: "debt",
  },

  "rainy-day-ready": {
    id: "rainy-day-ready",
    name: "Rainy Day Ready",
    description: "Save 3 months of expenses",
    icon: "☂️",
    celebrationTitle: "Rainy Day Ready!",
    celebrationMessage:
      "You've got 3 months of expenses saved. You're weatherproof!",
    remyMessage:
      "Three months of expenses in the bank. If something unexpected happens, you've got time to figure it out without panicking. That's real security.",
    category: "savings",
  },

  "fully-funded": {
    id: "fully-funded",
    name: "Fully Funded",
    description: "Save 6 months of expenses",
    icon: "🌈",
    celebrationTitle: "Fully Funded!",
    celebrationMessage:
      "6 months of expenses saved. You've reached the ultimate safety net!",
    remyMessage:
      "Six months. You've done what most people only dream about. Whatever comes your way, you're ready. You're not just surviving anymore, you're thriving.",
    category: "savings",
  },

  "century-club": {
    id: "century-club",
    name: "Century Club",
    description: "Categorise 100 transactions",
    icon: "💯",
    celebrationTitle: "Century Club!",
    celebrationMessage:
      "You've categorised 100 transactions. You really know where your money goes!",
    remyMessage:
      "100 transactions sorted! You've got a clear picture of your spending now. This kind of awareness is what separates those who wonder where their money went from those who know.",
    category: "consistency",
  },

  "consistency-club": {
    id: "consistency-club",
    name: "Consistency Club",
    description: "Reconcile 4 weeks in a row",
    icon: "📅",
    celebrationTitle: "Consistency Club!",
    celebrationMessage:
      "4 weeks of reconciling in a row. You've built a habit!",
    remyMessage:
      "Four weeks running! This is now a habit. Checking in regularly is what keeps everything on track. You're doing this properly.",
    category: "consistency",
  },

  "net-positive": {
    id: "net-positive",
    name: "Net Positive",
    description: "Net worth goes from negative to positive",
    icon: "📈",
    celebrationTitle: "Net Positive!",
    celebrationMessage:
      "Your net worth just went positive. You own more than you owe!",
    remyMessage:
      "This is HUGE. You now own more than you owe. Your assets outweigh your debts. From here, the graph only goes up.",
    category: "savings",
  },
};

export const getAchievement = (
  id: string
): AchievementDefinition | undefined => {
  return ACHIEVEMENTS[id];
};

export const getAllAchievements = (): AchievementDefinition[] => {
  return Object.values(ACHIEVEMENTS);
};
