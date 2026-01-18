/**
 * Teen Envelope Templates
 *
 * A curated list of envelopes suitable for teens (13+) who are
 * beginning to manage their own money from jobs and side gigs.
 *
 * Limited to 6 envelopes in teen mode (conversion safeguard).
 * Teens choose from these templates during setup.
 *
 * Updated: January 2026
 */

export type TeenEnvelopeSubtype =
  | "bill"
  | "spending"
  | "savings"
  | "goal"
  | "tracking"
  | "debt";

export type TeenEnvelopePriority = "essential" | "important" | "discretionary";

export type TeenEnvelopeCategory =
  | "essentials"
  | "lifestyle"
  | "transport"
  | "savings"
  | "subscriptions";

export interface TeenEnvelopeTemplate {
  id: string;
  name: string;
  icon: string;
  category: TeenEnvelopeCategory;
  priority: TeenEnvelopePriority | null;
  subtype: TeenEnvelopeSubtype;
  description?: string;
  /** Suggested as default for teen setup */
  defaultSelected?: boolean;
  /** Common frequency for this expense */
  suggestedFrequency?: "weekly" | "fortnightly" | "monthly" | "annually";
  /** Typical amount range hint for teens (NZD) */
  typicalAmountHint?: string;
}

/**
 * Category labels and icons for teen envelopes
 */
export const TEEN_CATEGORY_LABELS: Record<
  TeenEnvelopeCategory,
  { label: string; icon: string }
> = {
  essentials: { label: "Essentials", icon: "📱" },
  lifestyle: { label: "Lifestyle", icon: "🎉" },
  transport: { label: "Transport", icon: "🚌" },
  savings: { label: "Savings & Goals", icon: "🎯" },
  subscriptions: { label: "Subscriptions", icon: "📺" },
};

/**
 * Teen Envelope Template List
 *
 * Ordered by typical teen priorities. Teens select up to 6 during setup.
 */
export const TEEN_ENVELOPE_TEMPLATES: TeenEnvelopeTemplate[] = [
  // ========== ESSENTIALS ==========
  {
    id: "phone-bill",
    name: "Phone Bill",
    icon: "📱",
    category: "essentials",
    priority: "essential",
    subtype: "bill",
    description:
      "Monthly mobile phone plan or prepay top-ups. Your connection to the world.",
    defaultSelected: true,
    suggestedFrequency: "monthly",
    typicalAmountHint: "$20-60/month",
  },
  {
    id: "food-snacks",
    name: "Food & Snacks",
    icon: "🍔",
    category: "essentials",
    priority: "important",
    subtype: "spending",
    description:
      "Lunch, snacks, and drinks when you're out. Separate from family groceries.",
    defaultSelected: true,
    typicalAmountHint: "$20-50/week",
  },

  // ========== TRANSPORT ==========
  {
    id: "transport",
    name: "Transport",
    icon: "🚌",
    category: "transport",
    priority: "essential",
    subtype: "spending",
    description:
      "Bus fares, train tickets, or Uber rides to get around. Top up your HOP card here.",
    defaultSelected: true,
    typicalAmountHint: "$10-30/week",
  },
  {
    id: "petrol",
    name: "Petrol",
    icon: "⛽",
    category: "transport",
    priority: "essential",
    subtype: "spending",
    description:
      "For when you're driving. Fill-ups add up fast, so track them here.",
    typicalAmountHint: "$50-100/week",
  },
  {
    id: "car-expenses",
    name: "Car Expenses",
    icon: "🚗",
    category: "transport",
    priority: "important",
    subtype: "savings",
    description:
      "WOF, registration, insurance, and repairs. Save a bit each pay for these big costs.",
    suggestedFrequency: "monthly",
    typicalAmountHint: "$30-60/fortnight",
  },

  // ========== LIFESTYLE ==========
  {
    id: "clothing",
    name: "Clothing",
    icon: "👕",
    category: "lifestyle",
    priority: "important",
    subtype: "spending",
    description:
      "Clothes, shoes, accessories. Save up for the items you really want.",
    defaultSelected: true,
    typicalAmountHint: "$20-50/fortnight",
  },
  {
    id: "entertainment",
    name: "Entertainment",
    icon: "🎬",
    category: "lifestyle",
    priority: "discretionary",
    subtype: "spending",
    description:
      "Movies, concerts, events, games. The fun stuff you work for.",
    defaultSelected: true,
    typicalAmountHint: "$20-40/week",
  },
  {
    id: "going-out",
    name: "Going Out",
    icon: "🎉",
    category: "lifestyle",
    priority: "discretionary",
    subtype: "spending",
    description:
      "Social activities with friends - coffee, movies, bowling, whatever you're into.",
    typicalAmountHint: "$30-50/week",
  },
  {
    id: "hobbies",
    name: "Hobbies",
    icon: "🎸",
    category: "lifestyle",
    priority: "discretionary",
    subtype: "spending",
    description:
      "Sports gear, music, art supplies, gaming equipment - your passion projects.",
    typicalAmountHint: "$20-40/fortnight",
  },
  {
    id: "personal-care",
    name: "Personal Care",
    icon: "💇",
    category: "lifestyle",
    priority: "important",
    subtype: "spending",
    description:
      "Haircuts, skincare, toiletries - looking after yourself.",
    typicalAmountHint: "$15-30/fortnight",
  },
  {
    id: "gifts",
    name: "Gifts",
    icon: "🎁",
    category: "lifestyle",
    priority: "discretionary",
    subtype: "savings",
    description:
      "Birthday and Christmas presents for friends and family. Save ahead so you're never caught short.",
    suggestedFrequency: "monthly",
    typicalAmountHint: "$10-20/fortnight",
  },

  // ========== SUBSCRIPTIONS ==========
  {
    id: "subscriptions",
    name: "Subscriptions",
    icon: "📺",
    category: "subscriptions",
    priority: "discretionary",
    subtype: "bill",
    description:
      "Netflix, Spotify, gaming subscriptions, cloud storage. Track all your monthly charges.",
    suggestedFrequency: "monthly",
    typicalAmountHint: "$15-40/month",
  },
  {
    id: "gaming",
    name: "Gaming",
    icon: "🎮",
    category: "subscriptions",
    priority: "discretionary",
    subtype: "spending",
    description:
      "Games, DLC, in-game purchases, console subscriptions like PlayStation Plus.",
    typicalAmountHint: "$20-50/month",
  },

  // ========== SAVINGS & GOALS ==========
  {
    id: "emergency-fund",
    name: "Emergency Fund",
    icon: "🛡️",
    category: "savings",
    priority: "essential",
    subtype: "savings",
    description:
      "Your safety net for unexpected costs. Aim for $500-1000 to start - you'll thank yourself later.",
    defaultSelected: true,
    typicalAmountHint: "Save $20-40/fortnight until you hit $500+",
  },
  {
    id: "car-savings",
    name: "Car Savings",
    icon: "🚗",
    category: "savings",
    priority: "important",
    subtype: "goal",
    description:
      "Saving for your first car or upgrading your current one. Set a target and watch it grow.",
    typicalAmountHint: "$50-100/fortnight",
  },
  {
    id: "tech-fund",
    name: "Tech Fund",
    icon: "💻",
    category: "savings",
    priority: "discretionary",
    subtype: "goal",
    description:
      "New phone, laptop, console, or other tech you're saving for.",
    typicalAmountHint: "$30-60/fortnight",
  },
  {
    id: "travel-fund",
    name: "Travel Fund",
    icon: "✈️",
    category: "savings",
    priority: "discretionary",
    subtype: "goal",
    description:
      "That trip you're dreaming about - festival, holiday, gap year adventure.",
    typicalAmountHint: "$20-50/fortnight",
  },
  {
    id: "education-fund",
    name: "Education Fund",
    icon: "🎓",
    category: "savings",
    priority: "important",
    subtype: "goal",
    description:
      "Saving for courses, uni fees, textbooks, or professional certifications.",
    typicalAmountHint: "$20-50/fortnight",
  },
  {
    id: "investing",
    name: "Investing",
    icon: "📈",
    category: "savings",
    priority: "discretionary",
    subtype: "savings",
    description:
      "Building long-term wealth through Sharesies, Hatch, or KiwiSaver contributions.",
    typicalAmountHint: "$10-30/fortnight",
  },
];

/**
 * Get teen envelope templates grouped by category
 */
export function getTeenEnvelopesByCategory(): Record<
  TeenEnvelopeCategory,
  TeenEnvelopeTemplate[]
> {
  const grouped: Record<TeenEnvelopeCategory, TeenEnvelopeTemplate[]> = {
    essentials: [],
    lifestyle: [],
    transport: [],
    savings: [],
    subscriptions: [],
  };

  TEEN_ENVELOPE_TEMPLATES.forEach((template) => {
    grouped[template.category].push(template);
  });

  return grouped;
}

/**
 * Category display order
 */
export const TEEN_CATEGORY_ORDER: TeenEnvelopeCategory[] = [
  "essentials",
  "transport",
  "lifestyle",
  "subscriptions",
  "savings",
];

/**
 * Get default teen envelopes (pre-selected for new teen setup)
 * Returns the 6 most common teen envelopes
 */
export function getDefaultTeenEnvelopes(): TeenEnvelopeTemplate[] {
  return TEEN_ENVELOPE_TEMPLATES.filter((t) => t.defaultSelected);
}

/**
 * Get teen envelope template by ID
 */
export function getTeenEnvelopeTemplate(
  id: string
): TeenEnvelopeTemplate | undefined {
  return TEEN_ENVELOPE_TEMPLATES.find((t) => t.id === id);
}

/**
 * Validate that a teen has not exceeded the envelope limit
 * @param currentCount - Current number of active envelopes
 * @returns Object with validation result
 */
export function validateTeenEnvelopeCount(currentCount: number): {
  canAdd: boolean;
  remaining: number;
  maxAllowed: number;
} {
  const maxAllowed = 6;
  const remaining = Math.max(0, maxAllowed - currentCount);

  return {
    canAdd: currentCount < maxAllowed,
    remaining,
    maxAllowed,
  };
}

/**
 * Suggested envelope combinations for different teen situations
 */
export const TEEN_STARTER_PACKS = {
  /** Teen with part-time job, no car */
  studentWorker: [
    "phone-bill",
    "food-snacks",
    "transport",
    "clothing",
    "entertainment",
    "emergency-fund",
  ],
  /** Teen with car */
  driverWorker: [
    "phone-bill",
    "petrol",
    "car-expenses",
    "food-snacks",
    "clothing",
    "emergency-fund",
  ],
  /** Teen focused on saving */
  saver: [
    "phone-bill",
    "food-snacks",
    "transport",
    "emergency-fund",
    "car-savings",
    "tech-fund",
  ],
  /** Teen with lots of subscriptions */
  digitalNative: [
    "phone-bill",
    "subscriptions",
    "gaming",
    "entertainment",
    "food-snacks",
    "emergency-fund",
  ],
} as const;

export type TeenStarterPackType = keyof typeof TEEN_STARTER_PACKS;

/**
 * Get a starter pack of envelope IDs for quick setup
 */
export function getTeenStarterPack(packType: TeenStarterPackType): string[] {
  return [...TEEN_STARTER_PACKS[packType]];
}
