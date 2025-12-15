/**
 * Master Envelope List for Onboarding
 *
 * A comprehensive list of all possible household expenses.
 * Users select which ones apply to their situation.
 */

export interface MasterEnvelope {
  id: string;
  name: string;
  icon: string;
  category: EnvelopeCategory;
  priority: 'essential' | 'important' | 'discretionary';
  subtype: 'bill' | 'spending' | 'savings';
  description?: string;
  defaultSelected?: boolean; // Pre-selected by default
  alwaysInclude?: boolean; // Cannot be deselected (e.g., Surplus)
  allowMultiple?: boolean; // Can have multiple instances (e.g., cars, phones)
  multipleLabel?: string; // Label for "Add another X" button
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
  '🏥', '💊', '🩺', '🦷', '👓', '🏋️', '🧘', '🏃',
  // Food
  '🛒', '🍕', '🍽️', '☕', '🍷', '🥪', '🍔', '🥗',
  // Activities
  '🎬', '🎭', '🎨', '🎯', '⚽', '🎾', '🏈', '🎸', '🎹', '📚', '✏️',
  // Nature
  '🌴', '🏖️', '⛰️', '🏕️', '🌺', '🌳',
  // Other
  '🎁', '❤️', '⭐', '🔔', '📦', '🗂️', '📁', '🏷️', '🔒', '🎓',
];

// Built-in category types
export type BuiltInCategory =
  | 'housing'
  | 'utilities'
  | 'transport'
  | 'insurance'
  | 'food'
  | 'health'
  | 'children'
  | 'pets'
  | 'personal'
  | 'entertainment'
  | 'subscriptions'
  | 'debt'
  | 'savings'
  | 'giving'
  | 'other';

// EnvelopeCategory can be built-in or custom (string starting with 'custom-')
export type EnvelopeCategory = BuiltInCategory | string;

// Category info structure
export interface CategoryInfo {
  label: string;
  icon: string;
  isCustom?: boolean;
}

export const CATEGORY_LABELS: Record<BuiltInCategory, CategoryInfo> = {
  housing: { label: 'Housing', icon: '🏠' },
  utilities: { label: 'Utilities & Bills', icon: '💡' },
  transport: { label: 'Transport', icon: '🚗' },
  insurance: { label: 'Insurance', icon: '🛡️' },
  food: { label: 'Food & Groceries', icon: '🛒' },
  health: { label: 'Health & Wellbeing', icon: '🏥' },
  children: { label: 'Children & Family', icon: '👶' },
  pets: { label: 'Pets', icon: '🐾' },
  personal: { label: 'Personal Care', icon: '💅' },
  entertainment: { label: 'Entertainment & Lifestyle', icon: '🎬' },
  subscriptions: { label: 'Subscriptions', icon: '📱' },
  debt: { label: 'Debt Payments', icon: '💳' },
  savings: { label: 'Savings & Goals', icon: '🎯' },
  giving: { label: 'Giving & Gifts', icon: '🎁' },
  other: { label: 'Other', icon: '📦' },
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
 */
export const MASTER_ENVELOPE_LIST: MasterEnvelope[] = [
  // ========== HOUSING ==========
  {
    id: 'rent',
    name: 'Rent',
    icon: '🏠',
    category: 'housing',
    priority: 'essential',
    subtype: 'bill',
    description: 'Monthly rent payment',
  },
  {
    id: 'mortgage',
    name: 'Mortgage',
    icon: '🏡',
    category: 'housing',
    priority: 'essential',
    subtype: 'bill',
    description: 'Home loan repayments',
  },
  {
    id: 'rates',
    name: 'Council Rates',
    icon: '🏛️',
    category: 'housing',
    priority: 'essential',
    subtype: 'bill',
    description: 'Local council rates',
  },
  {
    id: 'body-corp',
    name: 'Body Corporate',
    icon: '🏢',
    category: 'housing',
    priority: 'essential',
    subtype: 'bill',
    description: 'Body corporate or strata fees',
  },
  {
    id: 'home-maintenance',
    name: 'Home Maintenance',
    icon: '🔧',
    category: 'housing',
    priority: 'important',
    subtype: 'spending',
    description: 'Repairs and upkeep',
  },

  // ========== UTILITIES ==========
  {
    id: 'power',
    name: 'Power / Electricity',
    icon: '⚡',
    category: 'utilities',
    priority: 'essential',
    subtype: 'bill',
    description: 'Electricity bill',
  },
  {
    id: 'gas',
    name: 'Gas',
    icon: '🔥',
    category: 'utilities',
    priority: 'essential',
    subtype: 'bill',
    description: 'Natural gas bill',
  },
  {
    id: 'water',
    name: 'Water',
    icon: '💧',
    category: 'utilities',
    priority: 'essential',
    subtype: 'bill',
    description: 'Water bill',
  },
  {
    id: 'internet',
    name: 'Internet / Broadband',
    icon: '🌐',
    category: 'utilities',
    priority: 'essential',
    subtype: 'bill',
    description: 'Home internet',
  },
  {
    id: 'phone',
    name: 'Mobile Phone',
    icon: '📱',
    category: 'utilities',
    priority: 'essential',
    subtype: 'bill',
    description: 'Mobile phone plan',
    allowMultiple: true,
    multipleLabel: 'phone',
  },
  {
    id: 'landline',
    name: 'Landline',
    icon: '☎️',
    category: 'utilities',
    priority: 'important',
    subtype: 'bill',
    description: 'Home phone line',
  },

  // ========== TRANSPORT ==========
  {
    id: 'petrol',
    name: 'Petrol / Fuel',
    icon: '⛽',
    category: 'transport',
    priority: 'essential',
    subtype: 'spending',
    description: 'Vehicle fuel',
  },
  {
    id: 'car-rego',
    name: 'Car Registration',
    icon: '🚙',
    category: 'transport',
    priority: 'essential',
    subtype: 'bill',
    description: 'Annual vehicle registration',
    allowMultiple: true,
    multipleLabel: 'car',
  },
  {
    id: 'wof',
    name: 'WOF / Warrant',
    icon: '✅',
    category: 'transport',
    priority: 'essential',
    subtype: 'bill',
    description: 'Warrant of Fitness',
    allowMultiple: true,
    multipleLabel: 'vehicle',
  },
  {
    id: 'car-service',
    name: 'Car Servicing',
    icon: '🔧',
    category: 'transport',
    priority: 'important',
    subtype: 'spending',
    description: 'Regular car maintenance',
    allowMultiple: true,
    multipleLabel: 'car',
  },
  {
    id: 'car-loan',
    name: 'Car Loan / Finance',
    icon: '🚗',
    category: 'transport',
    priority: 'essential',
    subtype: 'bill',
    description: 'Vehicle finance payments',
    allowMultiple: true,
    multipleLabel: 'car loan',
  },
  {
    id: 'public-transport',
    name: 'Public Transport',
    icon: '🚌',
    category: 'transport',
    priority: 'essential',
    subtype: 'spending',
    description: 'Bus, train, ferry fares',
  },
  {
    id: 'parking',
    name: 'Parking',
    icon: '🅿️',
    category: 'transport',
    priority: 'important',
    subtype: 'spending',
    description: 'Parking fees',
  },
  {
    id: 'tolls',
    name: 'Road Tolls',
    icon: '🛣️',
    category: 'transport',
    priority: 'important',
    subtype: 'spending',
    description: 'Toll road charges',
  },
  {
    id: 'uber-taxi',
    name: 'Uber / Taxi',
    icon: '🚕',
    category: 'transport',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Ride-sharing and taxis',
  },

  // ========== INSURANCE ==========
  {
    id: 'car-insurance',
    name: 'Car Insurance',
    icon: '🚗',
    category: 'insurance',
    priority: 'essential',
    subtype: 'bill',
    description: 'Vehicle insurance',
    allowMultiple: true,
    multipleLabel: 'car',
  },
  {
    id: 'home-insurance',
    name: 'Home & Contents',
    icon: '🏠',
    category: 'insurance',
    priority: 'essential',
    subtype: 'bill',
    description: 'Home and contents insurance',
  },
  {
    id: 'contents-insurance',
    name: 'Contents Insurance',
    icon: '📦',
    category: 'insurance',
    priority: 'important',
    subtype: 'bill',
    description: 'Contents only insurance',
  },
  {
    id: 'health-insurance',
    name: 'Health Insurance',
    icon: '🏥',
    category: 'insurance',
    priority: 'important',
    subtype: 'bill',
    description: 'Private health insurance',
  },
  {
    id: 'life-insurance',
    name: 'Life Insurance',
    icon: '💚',
    category: 'insurance',
    priority: 'important',
    subtype: 'bill',
    description: 'Life cover',
  },
  {
    id: 'income-protection',
    name: 'Income Protection',
    icon: '🛡️',
    category: 'insurance',
    priority: 'important',
    subtype: 'bill',
    description: 'Income protection insurance',
  },
  {
    id: 'pet-insurance',
    name: 'Pet Insurance',
    icon: '🐾',
    category: 'insurance',
    priority: 'discretionary',
    subtype: 'bill',
    description: 'Pet health insurance',
    allowMultiple: true,
    multipleLabel: 'pet',
  },
  {
    id: 'travel-insurance',
    name: 'Travel Insurance',
    icon: '✈️',
    category: 'insurance',
    priority: 'discretionary',
    subtype: 'bill',
    description: 'Annual travel cover',
  },

  // ========== FOOD ==========
  {
    id: 'groceries',
    name: 'Groceries',
    icon: '🛒',
    category: 'food',
    priority: 'essential',
    subtype: 'spending',
    description: 'Weekly food shopping',
    defaultSelected: true,
  },
  {
    id: 'takeaways',
    name: 'Takeaways',
    icon: '🍕',
    category: 'food',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Takeaway food',
  },
  {
    id: 'dining-out',
    name: 'Dining Out',
    icon: '🍽️',
    category: 'food',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Restaurant meals',
  },
  {
    id: 'coffee',
    name: 'Coffee & Snacks',
    icon: '☕',
    category: 'food',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Daily coffees and treats',
  },
  {
    id: 'alcohol',
    name: 'Alcohol',
    icon: '🍷',
    category: 'food',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Wine, beer, spirits',
  },
  {
    id: 'work-lunches',
    name: 'Work Lunches',
    icon: '🥪',
    category: 'food',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Lunches at work',
  },

  // ========== HEALTH ==========
  {
    id: 'doctors',
    name: 'Doctor Visits',
    icon: '👨‍⚕️',
    category: 'health',
    priority: 'essential',
    subtype: 'spending',
    description: 'GP appointments',
  },
  {
    id: 'prescriptions',
    name: 'Prescriptions',
    icon: '💊',
    category: 'health',
    priority: 'essential',
    subtype: 'spending',
    description: 'Medication costs',
  },
  {
    id: 'dentist',
    name: 'Dentist',
    icon: '🦷',
    category: 'health',
    priority: 'important',
    subtype: 'spending',
    description: 'Dental care',
  },
  {
    id: 'optometrist',
    name: 'Optometrist / Glasses',
    icon: '👓',
    category: 'health',
    priority: 'important',
    subtype: 'spending',
    description: 'Eye care and glasses',
  },
  {
    id: 'gym',
    name: 'Gym Membership',
    icon: '🏋️',
    category: 'health',
    priority: 'discretionary',
    subtype: 'bill',
    description: 'Gym or fitness membership',
  },
  {
    id: 'sports',
    name: 'Sports & Fitness',
    icon: '⚽',
    category: 'health',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Sports fees and equipment',
  },
  {
    id: 'therapy',
    name: 'Therapy / Counselling',
    icon: '🧠',
    category: 'health',
    priority: 'important',
    subtype: 'spending',
    description: 'Mental health support',
  },
  {
    id: 'physio',
    name: 'Physio / Chiro',
    icon: '🦴',
    category: 'health',
    priority: 'important',
    subtype: 'spending',
    description: 'Physical therapy',
  },

  // ========== CHILDREN ==========
  {
    id: 'childcare',
    name: 'Childcare / Daycare',
    icon: '👶',
    category: 'children',
    priority: 'essential',
    subtype: 'bill',
    description: 'Childcare fees',
    allowMultiple: true,
    multipleLabel: 'child',
  },
  {
    id: 'school-fees',
    name: 'School Fees',
    icon: '🎒',
    category: 'children',
    priority: 'essential',
    subtype: 'bill',
    description: 'School tuition and fees',
    allowMultiple: true,
    multipleLabel: 'child',
  },
  {
    id: 'school-supplies',
    name: 'School Supplies',
    icon: '📚',
    category: 'children',
    priority: 'important',
    subtype: 'spending',
    description: 'Books, uniforms, supplies',
  },
  {
    id: 'kids-activities',
    name: 'Kids Activities',
    icon: '🎨',
    category: 'children',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Sports, music, dance classes',
  },
  {
    id: 'kids-clothing',
    name: 'Kids Clothing',
    icon: '👕',
    category: 'children',
    priority: 'important',
    subtype: 'spending',
    description: 'Children\'s clothes and shoes',
  },
  {
    id: 'nappies',
    name: 'Nappies & Baby',
    icon: '🍼',
    category: 'children',
    priority: 'essential',
    subtype: 'spending',
    description: 'Baby essentials',
  },
  {
    id: 'child-support',
    name: 'Child Support',
    icon: '👨‍👧',
    category: 'children',
    priority: 'essential',
    subtype: 'bill',
    description: 'Child support payments',
  },

  // ========== PETS ==========
  {
    id: 'pet-food',
    name: 'Pet Food',
    icon: '🦴',
    category: 'pets',
    priority: 'essential',
    subtype: 'spending',
    description: 'Food for pets',
    allowMultiple: true,
    multipleLabel: 'pet',
  },
  {
    id: 'vet',
    name: 'Vet Bills',
    icon: '🏥',
    category: 'pets',
    priority: 'important',
    subtype: 'spending',
    description: 'Veterinary care',
    allowMultiple: true,
    multipleLabel: 'pet',
  },
  {
    id: 'pet-grooming',
    name: 'Pet Grooming',
    icon: '✂️',
    category: 'pets',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Grooming and pet care',
  },
  {
    id: 'pet-supplies',
    name: 'Pet Supplies',
    icon: '🐕',
    category: 'pets',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Toys, beds, accessories',
  },

  // ========== PERSONAL ==========
  {
    id: 'clothing',
    name: 'Clothing',
    icon: '👔',
    category: 'personal',
    priority: 'important',
    subtype: 'spending',
    description: 'Clothes and shoes',
  },
  {
    id: 'haircuts',
    name: 'Haircuts',
    icon: '💇',
    category: 'personal',
    priority: 'important',
    subtype: 'spending',
    description: 'Hair care',
  },
  {
    id: 'beauty',
    name: 'Beauty & Skincare',
    icon: '💄',
    category: 'personal',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Beauty products',
  },
  {
    id: 'toiletries',
    name: 'Toiletries',
    icon: '🧴',
    category: 'personal',
    priority: 'essential',
    subtype: 'spending',
    description: 'Personal hygiene products',
  },

  // ========== ENTERTAINMENT ==========
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: '🎬',
    category: 'entertainment',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Movies, events, activities',
  },
  {
    id: 'hobbies',
    name: 'Hobbies',
    icon: '🎯',
    category: 'entertainment',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Hobby expenses',
  },
  {
    id: 'books',
    name: 'Books & Magazines',
    icon: '📖',
    category: 'entertainment',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Reading materials',
  },
  {
    id: 'gaming',
    name: 'Gaming',
    icon: '🎮',
    category: 'entertainment',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Games and gaming',
  },
  {
    id: 'holidays',
    name: 'Holidays',
    icon: '✈️',
    category: 'entertainment',
    priority: 'discretionary',
    subtype: 'savings',
    description: 'Travel and holidays',
  },
  {
    id: 'fun-money',
    name: 'Fun Money',
    icon: '🎉',
    category: 'entertainment',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Personal spending money',
  },

  // ========== SUBSCRIPTIONS ==========
  {
    id: 'netflix',
    name: 'Netflix',
    icon: '📺',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
    description: 'Netflix subscription',
  },
  {
    id: 'spotify',
    name: 'Spotify / Music',
    icon: '🎵',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
    description: 'Music streaming',
  },
  {
    id: 'streaming',
    name: 'Other Streaming',
    icon: '📱',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
    description: 'Disney+, Stan, etc.',
    allowMultiple: true,
    multipleLabel: 'streaming service',
  },
  {
    id: 'news',
    name: 'News / Magazines',
    icon: '📰',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
    description: 'News subscriptions',
  },
  {
    id: 'apps',
    name: 'Apps & Software',
    icon: '💻',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
    description: 'App subscriptions',
  },
  {
    id: 'cloud-storage',
    name: 'Cloud Storage',
    icon: '☁️',
    category: 'subscriptions',
    priority: 'discretionary',
    subtype: 'bill',
    description: 'iCloud, Google Drive, etc.',
  },

  // ========== DEBT ==========
  {
    id: 'credit-card',
    name: 'Credit Card',
    icon: '💳',
    category: 'debt',
    priority: 'essential',
    subtype: 'bill',
    description: 'Credit card payments',
    allowMultiple: true,
    multipleLabel: 'credit card',
  },
  {
    id: 'personal-loan',
    name: 'Personal Loan',
    icon: '📝',
    category: 'debt',
    priority: 'essential',
    subtype: 'bill',
    description: 'Personal loan repayments',
    allowMultiple: true,
    multipleLabel: 'loan',
  },
  {
    id: 'student-loan',
    name: 'Student Loan',
    icon: '🎓',
    category: 'debt',
    priority: 'essential',
    subtype: 'bill',
    description: 'Student loan repayments',
  },
  {
    id: 'buy-now-pay-later',
    name: 'Buy Now Pay Later',
    icon: '🛍️',
    category: 'debt',
    priority: 'essential',
    subtype: 'bill',
    description: 'Afterpay, Laybuy, etc.',
    allowMultiple: true,
    multipleLabel: 'BNPL',
  },
  {
    id: 'hire-purchase',
    name: 'Hire Purchase',
    icon: '📄',
    category: 'debt',
    priority: 'essential',
    subtype: 'bill',
    description: 'Hire purchase payments',
    allowMultiple: true,
    multipleLabel: 'hire purchase',
  },

  // ========== SAVINGS ==========
  {
    id: 'emergency-fund',
    name: 'Emergency Fund',
    icon: '🛡️',
    category: 'savings',
    priority: 'important',
    subtype: 'savings',
    description: '3-6 months expenses',
  },
  {
    id: 'general-savings',
    name: 'General Savings',
    icon: '💰',
    category: 'savings',
    priority: 'important',
    subtype: 'savings',
    description: 'General savings',
  },
  {
    id: 'house-deposit',
    name: 'House Deposit',
    icon: '🏡',
    category: 'savings',
    priority: 'important',
    subtype: 'savings',
    description: 'Saving for a home',
  },
  {
    id: 'investments',
    name: 'Investments',
    icon: '📈',
    category: 'savings',
    priority: 'important',
    subtype: 'savings',
    description: 'Investment contributions',
  },
  {
    id: 'kiwisaver',
    name: 'KiwiSaver Top-up',
    icon: '🥝',
    category: 'savings',
    priority: 'important',
    subtype: 'savings',
    description: 'Additional KiwiSaver',
  },
  {
    id: 'retirement',
    name: 'Retirement',
    icon: '🌴',
    category: 'savings',
    priority: 'important',
    subtype: 'savings',
    description: 'Retirement savings',
  },
  {
    id: 'big-purchase',
    name: 'Big Purchase',
    icon: '🎯',
    category: 'savings',
    priority: 'discretionary',
    subtype: 'savings',
    description: 'Saving for something big',
  },

  // ========== GIVING ==========
  {
    id: 'gifts',
    name: 'Gifts',
    icon: '🎁',
    category: 'giving',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Birthday and Christmas gifts',
  },
  {
    id: 'donations',
    name: 'Donations / Charity',
    icon: '❤️',
    category: 'giving',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Charitable giving',
  },
  {
    id: 'tithing',
    name: 'Tithing / Church',
    icon: '⛪',
    category: 'giving',
    priority: 'important',
    subtype: 'spending',
    description: 'Religious giving',
  },
  {
    id: 'family-support',
    name: 'Family Support',
    icon: '👨‍👩‍👧',
    category: 'giving',
    priority: 'important',
    subtype: 'spending',
    description: 'Supporting family members',
  },

  // ========== OTHER ==========
  {
    id: 'education',
    name: 'Education / Courses',
    icon: '📚',
    category: 'other',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Personal development',
  },
  {
    id: 'professional-fees',
    name: 'Professional Fees',
    icon: '👔',
    category: 'other',
    priority: 'important',
    subtype: 'bill',
    description: 'Memberships, licenses',
  },
  {
    id: 'union-fees',
    name: 'Union Fees',
    icon: '✊',
    category: 'other',
    priority: 'important',
    subtype: 'bill',
    description: 'Union membership',
  },
  {
    id: 'miscellaneous',
    name: 'Miscellaneous',
    icon: '📦',
    category: 'other',
    priority: 'discretionary',
    subtype: 'spending',
    description: 'Unexpected expenses',
  },

  // ========== ALWAYS INCLUDED ==========
  {
    id: 'credit-card-holding',
    name: 'Credit Card Holding',
    icon: '💳',
    category: 'debt',
    priority: 'essential',
    subtype: 'savings',
    description: 'Funds set aside to pay your credit card statement each time, everytime',
    defaultSelected: true,
  },
  {
    id: 'surplus',
    name: 'Surplus',
    icon: '💵',
    category: 'other',
    priority: 'discretionary',
    subtype: 'savings',
    description: 'Catch-all for any unallocated/surplus funds',
    alwaysInclude: true,
    defaultSelected: true,
  },
];

/**
 * Get envelopes grouped by category
 */
export function getEnvelopesByCategory(): Record<EnvelopeCategory, MasterEnvelope[]> {
  const grouped: Record<EnvelopeCategory, MasterEnvelope[]> = {
    housing: [],
    utilities: [],
    transport: [],
    insurance: [],
    food: [],
    health: [],
    children: [],
    pets: [],
    personal: [],
    entertainment: [],
    subscriptions: [],
    debt: [],
    savings: [],
    giving: [],
    other: [],
  };

  MASTER_ENVELOPE_LIST.forEach(envelope => {
    grouped[envelope.category].push(envelope);
  });

  return grouped;
}

/**
 * Get category order for display
 */
export const CATEGORY_ORDER: EnvelopeCategory[] = [
  'housing',
  'utilities',
  'transport',
  'insurance',
  'food',
  'health',
  'children',
  'pets',
  'personal',
  'entertainment',
  'subscriptions',
  'debt',
  'savings',
  'giving',
  'other',
];
