/**
 * Master Envelope List for Onboarding
 *
 * A comprehensive list of all possible household expenses.
 * Users select which ones apply to their situation.
 *
 * Updated: January 2026 - Beta testing version
 */

export interface MasterEnvelope {
  id: string;
  name: string;
  icon: string;
  category: EnvelopeCategory;
  priority: 'essential' | 'important' | 'discretionary' | null; // null for tracking envelopes
  subtype: 'bill' | 'spending' | 'savings' | 'goal' | 'tracking' | 'debt';
  description?: string;
  defaultSelected?: boolean; // Pre-selected by default
  alwaysInclude?: boolean; // Cannot be deselected (e.g., Surplus)
  allowMultiple?: boolean; // Can have multiple instances (e.g., cars, phones)
  multipleLabel?: string; // Label for "Add another X" button
  // Locked envelope fields (for My Budget Way progression)
  isLocked?: boolean; // Cannot be edited/funded until conditions met
  lockedReason?: string; // Explanation shown to user
  unlockConditions?: string[]; // Conditions that must be met to unlock
}

/**
 * Available icons for custom envelopes and icon picker
 */
export const AVAILABLE_ICONS = [
  // Transport
  '🚗', '🚙', '🚕', '🏍️', '🚲', '🛵', '🚌', '🚂', '✈️', '🚁', '⛵', '🛳️',
  // Tech
  '📱', '💻', '🖥️', '📺', '🎮', '📷', '🎧', '⌚', '💾', '🖨️',
  // Home
  '🏠', '🏡', '🏢', '🏗️', '🔧', '🔨', '🛠️', '🔌', '💡', '🚿', '🛁',
  // Money
  '💰', '💵', '💳', '🏦', '💎', '📈', '📉', '💸',
  // Animals
  '🐕', '🐈', '🐇', '🐠', '🐦', '🐾', '🦜', '🐢', '🐹',
  // People
  '👶', '👧', '👦', '👨', '👩', '👴', '👵', '👨‍👩‍👧', '👨‍👧', '👩‍👧',
  // Health
  '🏥', '💊', '🩺', '🦷', '👓', '🏋️', '🧘', '🏃', '💆', '💪',
  // Food
  '🛒', '🍕', '🍽️', '☕', '🍷', '🥪', '🍔', '🥗',
  // Activities
  '🎬', '🎭', '🎨', '🎯', '⚽', '🎾', '🏈', '🎸', '🎹', '📚', '✏️', '🏉',
  // Nature
  '🌴', '🏖️', '⛰️', '🏕️', '🌺', '🌳', '🌱',
  // Celebrations
  '🎄', '🎂', '🐰', '🌸', '🕯️', '🎉',
  // Other
  '🎁', '❤️', '⭐', '🔔', '📦', '🗂️', '📁', '🏷️', '🔒', '🎓', '✨', '🛍️',
  '👔', '👗', '👕', '💇', '💇‍♀️', '🔥', '🅿️', '🧹', '☁️', '📋', '✅', '📝',
  '📸', '💝', '🎵', '📊', '🛡️', '🔄',
];

// Built-in category types - matches CSV categories
export type BuiltInCategory =
  | 'my-budget-way'  // The My Budget Way essentials (Starter Stash, Debt Destroyer, Safety Net)
  | 'bank'
  | 'celebrations'
  | 'extras'
  | 'giving'
  | 'goals'
  | 'health'
  | 'hobbies'
  | 'household'
  | 'insurance'
  | 'personal'
  | 'phone-internet'
  | 'school'
  | 'subscriptions'
  | 'vehicles';

// EnvelopeCategory can be built-in or custom (string starting with 'custom-')
export type EnvelopeCategory = BuiltInCategory | string;

// Category info structure
export interface CategoryInfo {
  label: string;
  icon: string;
  isCustom?: boolean;
}

export const CATEGORY_LABELS: Record<BuiltInCategory, CategoryInfo> = {
  'my-budget-way': { label: 'The My Budget Way', icon: '✨' },
  bank: { label: 'Bank', icon: '🏦' },
  celebrations: { label: 'Celebrations', icon: '🎉' },
  extras: { label: 'Extras', icon: '🛍️' },
  giving: { label: 'Giving', icon: '❤️' },
  goals: { label: 'Goals', icon: '🎯' },
  health: { label: 'Health', icon: '🏥' },
  hobbies: { label: 'Hobbies', icon: '🏉' },
  household: { label: 'Household', icon: '🏠' },
  insurance: { label: 'Insurance', icon: '🛡️' },
  personal: { label: 'Personal', icon: '💅' },
  'phone-internet': { label: 'Phone/Internet', icon: '📱' },
  school: { label: 'School', icon: '🏫' },
  subscriptions: { label: 'Subscriptions', icon: '📺' },
  vehicles: { label: 'Vehicles', icon: '🚗' },
};

// Custom category structure
export interface CustomCategory {
  id: string; // e.g., 'custom-1234567890'
  label: string;
  icon: string;
}

// Helper to get category info (built-in or custom)
export function getCategoryInfo(
  category: EnvelopeCategory,
  customCategories: CustomCategory[] = []
): CategoryInfo {
  // Check if it's a built-in category
  if (category in CATEGORY_LABELS) {
    return CATEGORY_LABELS[category as BuiltInCategory];
  }

  // Check if it's a custom category
  const custom = customCategories.find(c => c.id === category);
  if (custom) {
    return { label: custom.label, icon: custom.icon, isCustom: true };
  }

  // Fallback
  return { label: 'Unknown', icon: '📦', isCustom: true };
}

/**
 * The Master List - Comprehensive household expenses
 * Based on CSV template list for beta testing
 */
export const MASTER_ENVELOPE_LIST: MasterEnvelope[] = [
  // ========== THE MY BUDGET WAY ==========
  // These are the core "My Budget Way" progression envelopes
  {
    id: 'starter-stash',
    name: 'Starter Stash',
    icon: '🌱',
    category: 'my-budget-way',
    priority: 'essential',
    subtype: 'goal',
    description: 'First $1000 emergency fund (My Budget Way Step 1)',
    defaultSelected: true,
  },
  {
    id: 'debt-destroyer',
    name: 'Debt Destroyer',
    icon: '💪',
    category: 'my-budget-way',
    priority: 'essential',
    subtype: 'debt',
    description: 'Pay off all debt as fast as possible using snowball method (My Budget Way Step 2). Add your debts inside this envelope.',
    defaultSelected: true,
  },
  {
    id: 'safety-net',
    name: 'Safety Net',
    icon: '🛡️',
    category: 'my-budget-way',
    priority: 'essential',
    subtype: 'goal',
    description: '3 months essential expenses (My Budget Way Step 3)',
    defaultSelected: true,
    isLocked: true,
    lockedReason: 'Unlocks after Starter Stash is funded ($1,000) and all debt is paid off',
    unlockConditions: ['starter-stash-funded', 'debt-paid-off'],
  },

  // ========== BANK ==========
  {
    id: 'credit-card-holding',
    name: 'Credit Card Holding',
    icon: '💳',
    category: 'bank',
    priority: null,
    subtype: 'tracking',
    description: 'Tracks money set aside for credit card payments. Auto-created when credit cards enabled. Affects reconciliation: Available Cash = Bank Balance - CC Holding. Do not manually top up - system manages this automatically.',
    defaultSelected: true,
    alwaysInclude: true,
  },
  {
    id: 'surplus',
    name: 'Surplus',
    icon: '💰',
    category: 'bank',
    priority: null,
    subtype: 'tracking',
    description: 'Special envelope for unallocated funds - auto-created by system',
    defaultSelected: true,
    alwaysInclude: true,
  },
  {
    id: 'kids-pocket-money',
    name: 'Kids Pocket Money',
    icon: '👧',
    category: 'bank',
    priority: 'important',
    subtype: 'spending',
  },
  {
    id: 'work-bonus',
    name: 'Work Bonus',
    icon: '🎁',
    category: 'bank',
    priority: null,
    subtype: 'tracking',
  },
  {
    id: 'investing',
    name: 'Investing',
    icon: '📈',
    category: 'bank',
    priority: 'important',
    subtype: 'savings',
  },
  {
    id: 'ird-refunds',
    name: 'IRD Refunds',
    icon: '💵',
    category: 'bank',
    priority: null,
    subtype: 'tracking',
  },
  {
    id: 'reimbursements',
    name: 'Reimbursements',
    icon: '🔄',
    category: 'bank',
    priority: null,
    subtype: 'tracking',
  },
  {
    id: 'credit-card-fees',
    name: 'Credit Card Fees',
    icon: '💳',
    category: 'bank',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'mortgage-1',
    name: 'Mortgage 1',
    icon: '🏡',
    category: 'bank',
    priority: 'essential',
    subtype: 'bill',
    allowMultiple: true,
    multipleLabel: 'mortgage',
  },
  {
    id: 'mortgage-2',
    name: 'Mortgage 2',
    icon: '🏡',
    category: 'bank',
    priority: 'essential',
    subtype: 'bill',
  },

  // ========== CELEBRATIONS ==========
  {
    id: 'christmas',
    name: 'Christmas',
    icon: '🎄',
    category: 'celebrations',
    priority: 'discretionary',
    subtype: 'savings',
  },
  {
    id: 'birthdays',
    name: 'Birthdays',
    icon: '🎂',
    category: 'celebrations',
    priority: 'discretionary',
    subtype: 'savings',
  },
  {
    id: 'easter',
    name: 'Easter',
    icon: '🐰',
    category: 'celebrations',
    priority: 'discretionary',
    subtype: 'savings',
  },
  {
    id: 'mother-fathers-days',
    name: "Mother & Father's Days",
    icon: '🌸',
    category: 'celebrations',
    priority: 'discretionary',
    subtype: 'savings',
  },
  {
    id: 'religious-festivals',
    name: 'Religious Festivals',
    icon: '🕯️',
    category: 'celebrations',
    priority: 'discretionary',
    subtype: 'savings',
  },
  {
    id: 'gifts-general',
    name: 'Gifts',
    icon: '🎁',
    category: 'celebrations',
    priority: 'important',
    subtype: 'savings',
    description: "Anniversaries, housewarmings, weddings, new baby",
  },

  // ========== PERSONAL ==========
  {
    id: 'hair',
    name: 'Hair',
    icon: '💇',
    category: 'personal',
    priority: 'important',
    subtype: 'spending',
    description: 'General hair care budget. Add more envelopes if you want to track per person.',
  },
  {
    id: 'kids-hair',
    name: "Kid's Hair",
    icon: '💇‍♀️',
    category: 'personal',
    priority: 'important',
    subtype: 'spending',
    allowMultiple: true,
    multipleLabel: 'child',
  },
  {
    id: 'beauty-treatments',
    name: 'Beauty Treatments',
    icon: '💅',
    category: 'personal',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Nails, tanning, eyebrows, facials, etc.',
  },
  {
    id: 'makeup',
    name: 'Makeup',
    icon: '💄',
    category: 'personal',
    priority: 'discretionary',
    subtype: 'spending',
  },
  {
    id: 'clothing',
    name: 'Clothing',
    icon: '👔',
    category: 'personal',
    priority: 'important',
    subtype: 'spending',
    description: 'General clothing budget. Add more envelopes if you want to track per person.',
  },
  {
    id: 'kids-clothing',
    name: "Kid's Clothing",
    icon: '👕',
    category: 'personal',
    priority: 'important',
    subtype: 'spending',
    allowMultiple: true,
    multipleLabel: 'child',
  },

  // ========== EXTRAS ==========
  {
    id: 'fun-money',
    name: 'Fun Money',
    icon: '🎉',
    category: 'extras',
    priority: 'discretionary',
    subtype: 'spending',
  },
  {
    id: 'takeaways-restaurants',
    name: 'Takeaways/Restaurants',
    icon: '🍽️',
    category: 'extras',
    priority: 'discretionary',
    subtype: 'spending',
  },
  {
    id: 'holidays',
    name: 'Holiday Goal',
    icon: '✈️',
    category: 'extras',
    priority: 'important',
    subtype: 'goal',
    description: 'Save for travel and vacations',
  },
  {
    id: 'books-learning',
    name: 'Books/Learning',
    icon: '📚',
    category: 'extras',
    priority: 'discretionary',
    subtype: 'spending',
  },

  // ========== GIVING ==========
  {
    id: 'donations',
    name: 'Donations',
    icon: '❤️',
    category: 'giving',
    priority: 'discretionary',
    subtype: 'spending',
  },

  // ========== HEALTH ==========
  {
    id: 'medication',
    name: 'Medication',
    icon: '💊',
    category: 'health',
    priority: 'essential',
    subtype: 'spending',
  },
  {
    id: 'gp-medical',
    name: 'GP/Medical',
    icon: '🏥',
    category: 'health',
    priority: 'essential',
    subtype: 'spending',
  },
  {
    id: 'doctor',
    name: 'Doctor',
    icon: '🩺',
    category: 'health',
    priority: 'essential',
    subtype: 'spending',
  },
  {
    id: 'dentist',
    name: 'Dentist',
    icon: '🦷',
    category: 'health',
    priority: 'essential',
    subtype: 'spending',
  },
  {
    id: 'glasses-optometrist',
    name: 'Glasses/Optometrist',
    icon: '👓',
    category: 'health',
    priority: 'important',
    subtype: 'savings',
  },
  {
    id: 'physio-massage',
    name: 'Physio/Massage',
    icon: '💆',
    category: 'health',
    priority: 'important',
    subtype: 'spending',
  },
  {
    id: 'gym-membership',
    name: 'Gym Membership',
    icon: '💪',
    category: 'health',
    priority: 'important',
    subtype: 'bill',
  },

  // ========== HOBBIES ==========
  {
    id: 'sport-dance',
    name: 'Sport/Dance',
    icon: '🏉',
    category: 'hobbies',
    priority: 'important',
    subtype: 'spending',
    allowMultiple: true,
    multipleLabel: 'activity',
  },

  // ========== HOUSEHOLD ==========
  {
    id: 'rent-board',
    name: 'Rent/Board',
    icon: '🏠',
    category: 'household',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'rates',
    name: 'Rates',
    icon: '🏡',
    category: 'household',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'groceries',
    name: 'Groceries',
    icon: '🛒',
    category: 'household',
    priority: 'essential',
    subtype: 'spending',
  },
  {
    id: 'electricity',
    name: 'Electricity',
    icon: '⚡',
    category: 'household',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'firewood',
    name: 'Firewood',
    icon: '🔥',
    category: 'household',
    priority: 'essential',
    subtype: 'spending',
  },
  {
    id: 'water',
    name: 'Water',
    icon: '💧',
    category: 'household',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'pet-care',
    name: 'Pet Care',
    icon: '🐾',
    category: 'household',
    priority: 'important',
    subtype: 'spending',
    allowMultiple: true,
    multipleLabel: 'pet',
  },
  {
    id: 'drycleaning',
    name: 'Drycleaning',
    icon: '👔',
    category: 'household',
    priority: 'discretionary',
    subtype: 'spending',
  },
  {
    id: 'parking',
    name: 'Parking',
    icon: '🅿️',
    category: 'household',
    priority: 'important',
    subtype: 'spending',
  },
  {
    id: 'household-supplies',
    name: 'Household Supplies',
    icon: '🧹',
    category: 'household',
    priority: 'important',
    subtype: 'spending',
  },
  {
    id: 'home-maintenance',
    name: 'Home Maintenance',
    icon: '🔧',
    category: 'household',
    priority: 'essential',
    subtype: 'savings',
  },
  {
    id: 'garden-lawn',
    name: 'Garden/Lawn',
    icon: '🌱',
    category: 'household',
    priority: 'important',
    subtype: 'savings',
  },
  {
    id: 'technology-electronics',
    name: 'Technology/Electronics',
    icon: '💻',
    category: 'household',
    priority: 'important',
    subtype: 'savings',
  },

  // ========== INSURANCE ==========
  {
    id: 'car-insurance',
    name: 'Car Insurance',
    icon: '🚗',
    category: 'insurance',
    priority: 'essential',
    subtype: 'bill',
    allowMultiple: true,
    multipleLabel: 'vehicle',
  },
  {
    id: 'contents-insurance',
    name: 'Contents Insurance',
    icon: '🏠',
    category: 'insurance',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'health-insurance',
    name: 'Health Insurance',
    icon: '🏥',
    category: 'insurance',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'house-insurance',
    name: 'House Insurance',
    icon: '🏡',
    category: 'insurance',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'life-mortgage-protection',
    name: 'Life & Mortgage Protection',
    icon: '👨‍👩‍👧',
    category: 'insurance',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'pet-insurance',
    name: 'Pet Insurance',
    icon: '🐕',
    category: 'insurance',
    priority: 'important',
    subtype: 'bill',
    allowMultiple: true,
    multipleLabel: 'pet',
  },

  // ========== PHONE/INTERNET ==========
  {
    id: 'cellphone',
    name: 'Cellphone',
    icon: '📱',
    category: 'phone-internet',
    priority: 'essential',
    subtype: 'bill',
    allowMultiple: true,
    multipleLabel: 'phone',
  },
  {
    id: 'internet',
    name: 'Internet',
    icon: '🌐',
    category: 'phone-internet',
    priority: 'essential',
    subtype: 'bill',
  },

  // ========== SCHOOL ==========
  {
    id: 'school-fees',
    name: 'School Fees',
    icon: '🏫',
    category: 'school',
    priority: 'essential',
    subtype: 'bill',
    allowMultiple: true,
    multipleLabel: 'child',
  },
  {
    id: 'school-uniform',
    name: 'School Uniform',
    icon: '👕',
    category: 'school',
    priority: 'important',
    subtype: 'bill',
    allowMultiple: true,
    multipleLabel: 'child',
  },
  {
    id: 'school-stationery',
    name: 'School Stationery',
    icon: '📝',
    category: 'school',
    priority: 'important',
    subtype: 'bill',
    allowMultiple: true,
    multipleLabel: 'child',
  },
  {
    id: 'school-activities',
    name: 'School Activities',
    icon: '⚽',
    category: 'school',
    priority: 'important',
    subtype: 'bill',
    allowMultiple: true,
    multipleLabel: 'child',
  },
  {
    id: 'school-photos',
    name: 'School Photos',
    icon: '📸',
    category: 'school',
    priority: 'discretionary',
    subtype: 'bill',
  },
  {
    id: 'school-donations',
    name: 'School Donations',
    icon: '💝',
    category: 'school',
    priority: 'discretionary',
    subtype: 'bill',
  },

  // ========== SUBSCRIPTIONS ==========
  {
    id: 'apple-storage',
    name: 'Apple Storage',
    icon: '☁️',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
  },
  {
    id: 'netflix',
    name: 'Netflix',
    icon: '📺',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
  },
  {
    id: 'sky-tv',
    name: 'Sky TV',
    icon: '📺',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    icon: '🎵',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
  },
  {
    id: 'disney',
    name: 'Disney',
    icon: '🎬',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
  },
  {
    id: 'neon',
    name: 'Neon',
    icon: '📺',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
  },
  {
    id: 'gaming',
    name: 'Gaming',
    icon: '🎮',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
  },
  {
    id: 'my-budget-mate',
    name: 'My Budget Mate',
    icon: '✨',
    category: 'bank',
    priority: 'essential',
    subtype: 'bill',
    description: 'Your budgeting subscription - 14 day free trial, then $9.99/month',
    defaultSelected: true,
  },

  // ========== VEHICLES ==========
  {
    id: 'petrol',
    name: 'Petrol',
    icon: '⛽',
    category: 'vehicles',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'vehicle-maintenance',
    name: 'Car Maintenance',
    icon: '🔧',
    category: 'vehicles',
    priority: 'essential',
    subtype: 'savings',
  },
  {
    id: 'registration',
    name: 'Car Registration',
    icon: '📋',
    category: 'vehicles',
    priority: 'essential',
    subtype: 'bill',
    allowMultiple: true,
    multipleLabel: 'vehicle',
  },
  {
    id: 'wof',
    name: 'WOF',
    icon: '✅',
    category: 'vehicles',
    priority: 'essential',
    subtype: 'bill',
    allowMultiple: true,
    multipleLabel: 'vehicle',
  },
  {
    id: 'car-replacement-fund',
    name: 'Car Replacement Fund',
    icon: '🚙',
    category: 'vehicles',
    priority: 'important',
    subtype: 'goal',
  },
];

/**
 * Get envelopes grouped by category
 */
export function getEnvelopesByCategory(): Record<EnvelopeCategory, MasterEnvelope[]> {
  const grouped: Record<EnvelopeCategory, MasterEnvelope[]> = {
    'my-budget-way': [],
    bank: [],
    celebrations: [],
    extras: [],
    giving: [],
    goals: [],
    health: [],
    hobbies: [],
    household: [],
    insurance: [],
    personal: [],
    'phone-internet': [],
    school: [],
    subscriptions: [],
    vehicles: [],
  };

  MASTER_ENVELOPE_LIST.forEach(envelope => {
    if (envelope.category in grouped) {
      grouped[envelope.category].push(envelope);
    }
  });

  return grouped;
}

/**
 * Get category order for display
 */
export const CATEGORY_ORDER: EnvelopeCategory[] = [
  'my-budget-way',  // The My Budget Way essentials always first
  'bank',
  'household',
  'insurance',
  'phone-internet',
  'vehicles',
  'health',
  'school',
  'personal',
  'extras',
  'hobbies',
  'celebrations',
  'goals',
  'giving',
  'subscriptions',
];

/**
 * Get default envelopes (pre-selected for new users)
 */
export function getDefaultEnvelopes(): MasterEnvelope[] {
  return MASTER_ENVELOPE_LIST.filter(e => e.defaultSelected || e.alwaysInclude);
}

/**
 * Get always-included envelopes (cannot be deselected)
 */
export function getAlwaysIncludedEnvelopes(): MasterEnvelope[] {
  return MASTER_ENVELOPE_LIST.filter(e => e.alwaysInclude);
}
