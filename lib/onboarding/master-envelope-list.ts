/**
 * Master Envelope List for Onboarding
 *
 * A comprehensive list of all possible household expenses.
 * Users select which ones apply to their situation.
 *
 * Updated: January 2026 - Now uses Phosphor icon keys instead of emojis
 */

export interface MasterEnvelope {
  id: string;
  name: string;
  icon: string; // Now stores icon key (e.g., "groceries", "car") instead of emoji
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
 * Available icon keys for custom envelopes and icon picker
 * These map to Phosphor icons in lib/icons/phosphor-icon-map.tsx
 */
export const AVAILABLE_ICONS = [
  // Finance
  'bank', 'bill', 'cash', 'coin', 'dollar', 'money-plant', 'piggy-bank', 'safe', 'saving', 'trend-up', 'trend-down', 'wallet',
  // Shopping
  'bag', 'basket', 'box', 'card', 'card-2', 'card-3', 'shop', 'shopping-cart', 'tag', 'truck', 'location', 'offer', 'sale',
  // Home
  'home', 'bulb', 'key', 'lock', 'sofa', 'tv', 'tree', 'paint-bucket', 'paint-brush', 'paint-roller',
  // Health
  'first-aid', 'heart-beat', 'stethoscope', 'pills', 'tooth', 'bottle', 'injection', 'lungs', 'wheelchair',
  // Food & Drink
  'burger', 'pizza', 'cake', 'cutlery', 'dish', 'drink', 'water', 'ice-cream', 'candy', 'coffee-cup',
  // Transport
  'car', 'bus', 'plane', 'ship', 'rocket', 'hot-air-balloon',
  // Tech
  'phone', 'tablet', 'headphone', 'camera', 'video-camera', 'speaker', 'mic', 'chip', 'server', 'globe', 'cloud', 'signal',
  // Entertainment
  'music', 'play', 'guitar', 'movie-clapper', 'trophy', 'target', 'puzzle', 'balloon', 'crown',
  // People & Life
  'user', 'heart', 'star', 'gift', 'thumbs-up', 'suitcase', 'bell',
  // Education
  'bookmark', 'doc', 'folder', 'pencil', 'pen', 'ruler', 'calculator', 'file',
  // Nature
  'sun', 'fire', 'sunny', 'rain', 'snow', 'snowflake', 'wind',
  // Interface
  'shield', 'flag', 'info', 'tick', 'cross', 'sync', 'search', 'setting', 'dashboard', 'calendar', 'clock', 'pin', 'map', 'mail', 'zap',
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
  icon: string; // Now uses icon keys instead of emojis
  isCustom?: boolean;
}

// Category labels - alphabetically sorted (My Budget Way always first in display)
export const CATEGORY_LABELS: Record<BuiltInCategory, CategoryInfo> = {
  'my-budget-way': { label: 'The My Budget Way', icon: 'envelope' },
  bank: { label: 'Bank', icon: 'piggy-bank' },
  celebrations: { label: 'Celebrations', icon: 'confetti' },
  extras: { label: 'Extras', icon: 'bag' },
  giving: { label: 'Giving', icon: 'tip-jar' },
  goals: { label: 'Goals', icon: 'currency-circle-dollar' },
  health: { label: 'Health', icon: 'bandaids' },
  hobbies: { label: 'Hobbies', icon: 'person-simple' },
  household: { label: 'Household', icon: 'house' },
  insurance: { label: 'Insurance', icon: 'shield-check' },
  personal: { label: 'Personal', icon: 'user-rectangle' },
  'phone-internet': { label: 'Phone/Internet', icon: 'cell-tower' },
  school: { label: 'School', icon: 'buildings' },
  subscriptions: { label: 'Subscriptions', icon: 'airplay' },
  vehicles: { label: 'Vehicles', icon: 'tire' },
};

// Custom category structure
export interface CustomCategory {
  id: string; // e.g., 'custom-1234567890'
  label: string;
  icon: string; // Icon key
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
  return { label: 'Unknown', icon: 'box', isCustom: true };
}

/**
 * The Master List - Comprehensive household expenses
 * Based on CSV template list for beta testing
 * Now uses Phosphor icon keys instead of emojis
 */
export const MASTER_ENVELOPE_LIST: MasterEnvelope[] = [
  // ========== THE MY BUDGET WAY ==========
  // These are the core "My Budget Way" envelopes in order:
  // 1. Credit Card Holding, 2. Starter Stash, 3. Debt Destroyer, 4. Safety Net, 5. Future Fund, 6. My Budget Mate, 7. Surplus
  // Most are alwaysInclude: true - cannot be deselected during onboarding
  // Future Fund is optional (alwaysInclude: false) as users may already be investing
  {
    id: 'credit-card-holding',
    name: 'Credit Card Holding',
    icon: 'card',
    category: 'my-budget-way',
    priority: null,
    subtype: 'tracking',
    description: 'Tracks money set aside for credit card payments. Auto-created when credit cards enabled. Affects reconciliation: Available Cash = Bank Balance - CC Holding. Do not manually top up - system manages this automatically.',
    defaultSelected: true,
    alwaysInclude: true,
  },
  {
    id: 'starter-stash',
    name: 'Starter Stash',
    icon: 'plant',
    category: 'my-budget-way',
    priority: 'essential',
    subtype: 'goal',
    description: 'First $1000 emergency fund (My Budget Way Step 1)',
    defaultSelected: true,
    alwaysInclude: true,
  },
  {
    id: 'debt-destroyer',
    name: 'Debt Destroyer',
    icon: 'chart-line-down',
    category: 'my-budget-way',
    priority: 'essential',
    subtype: 'debt',
    description: 'Pay off all debt as fast as possible using snowball method (My Budget Way Step 2). Add your debts inside this envelope.',
    defaultSelected: true,
    alwaysInclude: true,
  },
  {
    id: 'safety-net',
    name: 'Safety Net',
    icon: 'potted-plant',
    category: 'my-budget-way',
    priority: 'essential',
    subtype: 'goal',
    description: '3 months essential expenses (My Budget Way Step 3)',
    defaultSelected: true,
    alwaysInclude: true,
    isLocked: true,
    lockedReason: 'Unlocks after Starter Stash is funded ($1,000) and all debt is paid off',
    unlockConditions: ['starter-stash-funded', 'debt-paid-off'],
  },
  {
    id: 'future-fund',
    name: 'Future Fund',
    icon: 'tree',
    category: 'my-budget-way',
    priority: 'important',
    subtype: 'savings',
    description: "If you aren't already investing, this step comes after your Safety Net goal is complete (My Budget Way Step 4). You're in control of when you're ready to start.",
    defaultSelected: false,
    alwaysInclude: false,
  },
  {
    id: 'my-budget-mate',
    name: 'My Budget Mate',
    icon: 'envelope-simple',
    category: 'my-budget-way',
    priority: 'essential',
    subtype: 'bill',
    description: 'Your budgeting subscription - 14 day free trial, then $9.99/month',
    defaultSelected: true,
    alwaysInclude: true,
  },
  {
    id: 'surplus',
    name: 'Surplus',
    icon: 'tip-jar',
    category: 'my-budget-way',
    priority: null,
    subtype: 'tracking',
    description: 'Special envelope for unallocated funds - auto-created by system',
    defaultSelected: true,
    alwaysInclude: true,
  },

  // ========== BANK ==========
  {
    id: 'kids-pocket-money',
    name: 'Kids Pocket Money',
    icon: 'hand-coins',
    category: 'bank',
    priority: 'important',
    subtype: 'spending',
  },
  {
    id: 'work-bonus',
    name: 'Work Bonus',
    icon: 'briefcase',
    category: 'bank',
    priority: null,
    subtype: 'tracking',
  },
  {
    id: 'ird-refunds',
    name: 'IRD Refunds',
    icon: 'swap',
    category: 'bank',
    priority: null,
    subtype: 'tracking',
  },
  {
    id: 'reimbursements',
    name: 'Reimbursements',
    icon: 'receipt',
    category: 'bank',
    priority: null,
    subtype: 'tracking',
  },
  {
    id: 'credit-card-fees',
    name: 'Credit Card Fees',
    icon: 'card',
    category: 'bank',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'mortgage-1',
    name: 'Mortgage 1',
    icon: 'house-line',
    category: 'bank',
    priority: 'essential',
    subtype: 'bill',
    allowMultiple: true,
    multipleLabel: 'mortgage',
  },
  {
    id: 'mortgage-2',
    name: 'Mortgage 2',
    icon: 'house-line',
    category: 'bank',
    priority: 'essential',
    subtype: 'bill',
  },

  // ========== CELEBRATIONS ==========
  {
    id: 'christmas',
    name: 'Christmas',
    icon: 'tree-evergreen',
    category: 'celebrations',
    priority: 'discretionary',
    subtype: 'savings',
  },
  {
    id: 'birthdays',
    name: 'Birthdays',
    icon: 'cake',
    category: 'celebrations',
    priority: 'discretionary',
    subtype: 'savings',
  },
  {
    id: 'easter',
    name: 'Easter',
    icon: 'cross',
    category: 'celebrations',
    priority: 'discretionary',
    subtype: 'savings',
  },
  {
    id: 'mother-fathers-days',
    name: "Mother & Father's Days",
    icon: 'flower-tulip',
    category: 'celebrations',
    priority: 'discretionary',
    subtype: 'savings',
  },
  {
    id: 'religious-festivals',
    name: 'Religious Festivals',
    icon: 'flame',
    category: 'celebrations',
    priority: 'discretionary',
    subtype: 'savings',
  },
  {
    id: 'gifts-general',
    name: 'Gifts',
    icon: 'gift',
    category: 'celebrations',
    priority: 'important',
    subtype: 'savings',
    description: "Anniversaries, housewarmings, weddings, new baby",
  },

  // ========== PERSONAL ==========
  {
    id: 'hair',
    name: 'Hair',
    icon: 'scissors',
    category: 'personal',
    priority: 'important',
    subtype: 'spending',
    description: 'General hair care budget. Add more envelopes if you want to track per person.',
  },
  {
    id: 'kids-hair',
    name: "Kid's Hair",
    icon: 'scissors',
    category: 'personal',
    priority: 'important',
    subtype: 'spending',
    allowMultiple: true,
    multipleLabel: 'child',
  },
  {
    id: 'beauty-treatments',
    name: 'Beauty Treatments',
    icon: 'eye-closed',
    category: 'personal',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Nails, tanning, eyebrows, facials, etc.',
  },
  {
    id: 'makeup',
    name: 'Makeup',
    icon: 'star',
    category: 'personal',
    priority: 'discretionary',
    subtype: 'spending',
  },
  {
    id: 'clothing',
    name: 'Clothing',
    icon: 'coat-hanger',
    category: 'personal',
    priority: 'important',
    subtype: 'spending',
    description: 'General clothing budget. Add more envelopes if you want to track per person.',
  },
  {
    id: 'kids-clothing',
    name: "Kid's Clothing",
    icon: 't-shirt',
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
    icon: 'wallet',
    category: 'extras',
    priority: 'discretionary',
    subtype: 'spending',
  },
  {
    id: 'takeaways-restaurants',
    name: 'Takeaways/Restaurants',
    icon: 'cutlery',
    category: 'extras',
    priority: 'discretionary',
    subtype: 'spending',
  },
  {
    id: 'holidays',
    name: 'Holiday Goal',
    icon: 'plane',
    category: 'extras',
    priority: 'important',
    subtype: 'goal',
    description: 'Save for travel and vacations',
  },
  {
    id: 'books-learning',
    name: 'Books/Learning',
    icon: 'book',
    category: 'extras',
    priority: 'discretionary',
    subtype: 'spending',
  },

  // ========== GIVING ==========
  {
    id: 'donations',
    name: 'Donations',
    icon: 'heart',
    category: 'giving',
    priority: 'discretionary',
    subtype: 'spending',
  },

  // ========== HEALTH ==========
  {
    id: 'medication',
    name: 'Medication',
    icon: 'pills',
    category: 'health',
    priority: 'essential',
    subtype: 'spending',
  },
  {
    id: 'doctor',
    name: 'Doctor',
    icon: 'stethoscope',
    category: 'health',
    priority: 'essential',
    subtype: 'spending',
  },
  {
    id: 'dentist',
    name: 'Dentist',
    icon: 'tooth',
    category: 'health',
    priority: 'essential',
    subtype: 'spending',
  },
  {
    id: 'glasses-optometrist',
    name: 'Glasses/Optometrist',
    icon: 'user',
    category: 'health',
    priority: 'important',
    subtype: 'savings',
  },
  {
    id: 'physio-massage',
    name: 'Physio/Massage',
    icon: 'person-simple-circle',
    category: 'health',
    priority: 'important',
    subtype: 'spending',
  },
  {
    id: 'gym-membership',
    name: 'Gym Membership',
    icon: 'heart-beat',
    category: 'health',
    priority: 'important',
    subtype: 'bill',
  },

  // ========== HOBBIES ==========
  {
    id: 'sport-dance',
    name: 'Sport/Dance',
    icon: 'person-simple-circle',
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
    icon: 'home',
    category: 'household',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'rates',
    name: 'Rates',
    icon: 'park',
    category: 'household',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'groceries',
    name: 'Groceries',
    icon: 'basket',
    category: 'household',
    priority: 'essential',
    subtype: 'spending',
  },
  {
    id: 'electricity',
    name: 'Electricity',
    icon: 'lightbulb',
    category: 'household',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'firewood',
    name: 'Firewood',
    icon: 'fire',
    category: 'household',
    priority: 'essential',
    subtype: 'spending',
  },
  {
    id: 'water',
    name: 'Water',
    icon: 'water',
    category: 'household',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'pet-care',
    name: 'Pet Care',
    icon: 'heart',
    category: 'household',
    priority: 'important',
    subtype: 'spending',
    allowMultiple: true,
    multipleLabel: 'pet',
  },
  {
    id: 'drycleaning',
    name: 'Drycleaning',
    icon: 'washing-machine',
    category: 'household',
    priority: 'discretionary',
    subtype: 'spending',
  },
  {
    id: 'parking',
    name: 'Parking',
    icon: 'letter-circle-p',
    category: 'household',
    priority: 'important',
    subtype: 'spending',
  },
  {
    id: 'home-maintenance',
    name: 'Home Maintenance',
    icon: 'paint-brush-household',
    category: 'household',
    priority: 'essential',
    subtype: 'savings',
  },
  {
    id: 'garden-lawn',
    name: 'Garden/Lawn',
    icon: 'leaf',
    category: 'household',
    priority: 'important',
    subtype: 'savings',
  },
  {
    id: 'technology-electronics',
    name: 'Technology/Electronics',
    icon: 'laptop',
    category: 'household',
    priority: 'important',
    subtype: 'savings',
  },

  // ========== INSURANCE ==========
  {
    id: 'car-insurance',
    name: 'Car Insurance',
    icon: 'car-profile',
    category: 'insurance',
    priority: 'essential',
    subtype: 'bill',
    allowMultiple: true,
    multipleLabel: 'vehicle',
  },
  {
    id: 'contents-insurance',
    name: 'Contents Insurance',
    icon: 'sketch-logo',
    category: 'insurance',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'health-insurance',
    name: 'Health Insurance',
    icon: 'pulse',
    category: 'insurance',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'house-insurance',
    name: 'House Insurance',
    icon: 'house-simple',
    category: 'insurance',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'life-mortgage-protection',
    name: 'Life & Mortgage Protection',
    icon: 'user-circle-check',
    category: 'insurance',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'pet-insurance',
    name: 'Pet Insurance',
    icon: 'shield-star',
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
    icon: 'device-mobile-speaker',
    category: 'phone-internet',
    priority: 'essential',
    subtype: 'bill',
    allowMultiple: true,
    multipleLabel: 'phone',
  },
  {
    id: 'internet',
    name: 'Internet',
    icon: 'wifi-high',
    category: 'phone-internet',
    priority: 'essential',
    subtype: 'bill',
  },

  // ========== SCHOOL ==========
  {
    id: 'school-fees',
    name: 'School Fees',
    icon: 'backpack',
    category: 'school',
    priority: 'essential',
    subtype: 'bill',
    allowMultiple: true,
    multipleLabel: 'child',
  },
  {
    id: 'school-uniform',
    name: 'School Uniform',
    icon: 'shirt-folded',
    category: 'school',
    priority: 'important',
    subtype: 'bill',
    allowMultiple: true,
    multipleLabel: 'child',
  },
  {
    id: 'school-stationery',
    name: 'School Stationery',
    icon: 'pencil',
    category: 'school',
    priority: 'important',
    subtype: 'bill',
    allowMultiple: true,
    multipleLabel: 'child',
  },
  {
    id: 'school-activities',
    name: 'School Activities',
    icon: 'tent',
    category: 'school',
    priority: 'important',
    subtype: 'bill',
    allowMultiple: true,
    multipleLabel: 'child',
  },
  {
    id: 'school-photos',
    name: 'School Photos',
    icon: 'user-rectangle',
    category: 'school',
    priority: 'discretionary',
    subtype: 'bill',
  },
  {
    id: 'school-donations',
    name: 'School Donations',
    icon: 'hand-deposit',
    category: 'school',
    priority: 'discretionary',
    subtype: 'bill',
  },

  // ========== SUBSCRIPTIONS ==========
  {
    id: 'apple-storage',
    name: 'Apple Storage',
    icon: 'apple-logo',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
  },
  {
    id: 'netflix',
    name: 'Netflix',
    icon: 'monitor-play',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
  },
  {
    id: 'sky-tv',
    name: 'Sky TV',
    icon: 'television',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    icon: 'spotify-logo',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
  },
  {
    id: 'disney',
    name: 'Disney',
    icon: 'castle-turret',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
  },
  {
    id: 'neon',
    name: 'Neon',
    icon: 'monitor-play',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
  },
  {
    id: 'gaming',
    name: 'Gaming',
    icon: 'game-controller',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
  },

  // ========== VEHICLES ==========
  {
    id: 'petrol',
    name: 'Petrol',
    icon: 'car',
    category: 'vehicles',
    priority: 'essential',
    subtype: 'bill',
  },
  {
    id: 'vehicle-maintenance',
    name: 'Car Maintenance',
    icon: 'car-battery',
    category: 'vehicles',
    priority: 'essential',
    subtype: 'savings',
  },
  {
    id: 'registration',
    name: 'Car Registration',
    icon: 'road-horizon',
    category: 'vehicles',
    priority: 'essential',
    subtype: 'bill',
    allowMultiple: true,
    multipleLabel: 'vehicle',
  },
  {
    id: 'wof',
    name: 'WOF',
    icon: 'sticker',
    category: 'vehicles',
    priority: 'essential',
    subtype: 'bill',
    allowMultiple: true,
    multipleLabel: 'vehicle',
  },
  {
    id: 'car-replacement-fund',
    name: 'Car Replacement Fund',
    icon: 'jeep',
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
 * Alphabetically sorted with My Budget Way always first
 */
export const CATEGORY_ORDER: EnvelopeCategory[] = [
  'my-budget-way',  // The My Budget Way essentials - ALWAYS FIRST
  'bank',
  'celebrations',
  'extras',
  'giving',
  'goals',
  'health',
  'hobbies',
  'household',
  'insurance',
  'personal',
  'phone-internet',
  'school',
  'subscriptions',
  'vehicles',
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
