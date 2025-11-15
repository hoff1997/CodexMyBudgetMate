/**
 * User Personas for Onboarding
 *
 * Determines templates, guidance level, and feature suggestions
 */

export type PersonaType = 'beginner' | 'optimiser' | 'wealth_builder';

export interface Persona {
  key: PersonaType;
  label: string;
  icon: string;
  description: string;
  detailedDescription: string;
  color: string;
  // Onboarding configuration
  guidanceLevel: 'high' | 'medium' | 'low';
  suggestedEnvelopeCount: number;
  showTutorials: boolean;
  envelopeTemplates: EnvelopeTemplate[];
}

export interface EnvelopeTemplate {
  name: string;
  icon: string;
  suggestedPercentage?: number;
  priority: 'essential' | 'important' | 'discretionary';
  notes?: string;
}

/**
 * Persona Definitions
 */
export const PERSONAS: Record<PersonaType, Persona> = {
  beginner: {
    key: 'beginner',
    label: 'Just Starting Out',
    icon: '🌱',
    description: 'I\'m new to budgeting and need guidance',
    detailedDescription: 'Perfect for first-time budgeters who want step-by-step help building strong money habits.',
    color: 'emerald',
    guidanceLevel: 'high',
    suggestedEnvelopeCount: 6,
    showTutorials: true,
    envelopeTemplates: [
      {
        name: 'Housing',
        icon: '🏠',
        suggestedPercentage: 30,
        priority: 'essential',
        notes: 'Rent or mortgage payment',
      },
      {
        name: 'Groceries',
        icon: '🛒',
        suggestedPercentage: 15,
        priority: 'essential',
        notes: 'Food and household items',
      },
      {
        name: 'Transport',
        icon: '🚗',
        suggestedPercentage: 10,
        priority: 'essential',
        notes: 'Car, petrol, or public transport',
      },
      {
        name: 'Utilities',
        icon: '💡',
        suggestedPercentage: 10,
        priority: 'essential',
        notes: 'Power, water, internet',
      },
      {
        name: 'Savings',
        icon: '💰',
        suggestedPercentage: 20,
        priority: 'important',
        notes: 'Emergency fund and goals',
      },
      {
        name: 'Fun Money',
        icon: '🎉',
        suggestedPercentage: 15,
        priority: 'discretionary',
        notes: 'Entertainment and treats',
      },
      {
        name: 'Surplus',
        icon: '💵',
        suggestedPercentage: 0,
        priority: 'discretionary',
        notes: 'Catch-all for unallocated funds',
      },
    ],
  },

  optimiser: {
    key: 'optimiser',
    label: 'Already Budgeting',
    icon: '📊',
    description: 'I use spreadsheets and want to automate',
    detailedDescription: 'Ideal for organised budgeters ready to streamline their system and gain better insights.',
    color: 'blue',
    guidanceLevel: 'medium',
    suggestedEnvelopeCount: 10,
    showTutorials: false,
    envelopeTemplates: [
      {
        name: 'Housing',
        icon: '🏠',
        suggestedPercentage: 30,
        priority: 'essential',
      },
      {
        name: 'Groceries',
        icon: '🛒',
        suggestedPercentage: 12,
        priority: 'essential',
      },
      {
        name: 'Transport',
        icon: '🚗',
        suggestedPercentage: 8,
        priority: 'essential',
      },
      {
        name: 'Utilities',
        icon: '💡',
        suggestedPercentage: 8,
        priority: 'essential',
      },
      {
        name: 'Insurance',
        icon: '🛡️',
        suggestedPercentage: 5,
        priority: 'essential',
      },
      {
        name: 'Healthcare',
        icon: '⚕️',
        suggestedPercentage: 5,
        priority: 'important',
      },
      {
        name: 'Savings',
        icon: '💰',
        suggestedPercentage: 15,
        priority: 'important',
      },
      {
        name: 'Investments',
        icon: '📈',
        suggestedPercentage: 7,
        priority: 'important',
      },
      {
        name: 'Dining Out',
        icon: '🍽️',
        suggestedPercentage: 5,
        priority: 'discretionary',
      },
      {
        name: 'Miscellaneous',
        icon: '📦',
        suggestedPercentage: 5,
        priority: 'discretionary',
      },
      {
        name: 'Surplus',
        icon: '💵',
        suggestedPercentage: 0,
        priority: 'discretionary',
      },
    ],
  },

  wealth_builder: {
    key: 'wealth_builder',
    label: 'Building Wealth',
    icon: '💎',
    description: 'I\'m established and focused on goals',
    detailedDescription: 'Designed for goal-driven individuals managing multiple accounts and building long-term wealth.',
    color: 'purple',
    guidanceLevel: 'low',
    suggestedEnvelopeCount: 12,
    showTutorials: false,
    envelopeTemplates: [
      {
        name: 'Housing',
        icon: '🏠',
        suggestedPercentage: 25,
        priority: 'essential',
      },
      {
        name: 'Groceries',
        icon: '🛒',
        suggestedPercentage: 10,
        priority: 'essential',
      },
      {
        name: 'Transport',
        icon: '🚗',
        suggestedPercentage: 8,
        priority: 'essential',
      },
      {
        name: 'Utilities',
        icon: '💡',
        suggestedPercentage: 6,
        priority: 'essential',
      },
      {
        name: 'Insurance',
        icon: '🛡️',
        suggestedPercentage: 6,
        priority: 'essential',
      },
      {
        name: 'Healthcare',
        icon: '⚕️',
        suggestedPercentage: 4,
        priority: 'important',
      },
      {
        name: 'Emergency Fund',
        icon: '🛡️',
        suggestedPercentage: 10,
        priority: 'important',
      },
      {
        name: 'Investments',
        icon: '📈',
        suggestedPercentage: 15,
        priority: 'important',
      },
      {
        name: 'Property Fund',
        icon: '🏡',
        suggestedPercentage: 8,
        priority: 'important',
      },
      {
        name: 'Education',
        icon: '📚',
        suggestedPercentage: 3,
        priority: 'discretionary',
      },
      {
        name: 'Lifestyle',
        icon: '✨',
        suggestedPercentage: 3,
        priority: 'discretionary',
      },
      {
        name: 'Giving',
        icon: '🎁',
        suggestedPercentage: 2,
        priority: 'discretionary',
      },
      {
        name: 'Surplus',
        icon: '💵',
        suggestedPercentage: 0,
        priority: 'discretionary',
      },
    ],
  },
};

/**
 * Get persona by key
 */
export function getPersona(key: PersonaType): Persona {
  return PERSONAS[key];
}

/**
 * Get all personas for selection
 */
export function getAllPersonas(): Persona[] {
  return Object.values(PERSONAS);
}

/**
 * Get recommended features for persona
 */
export function getRecommendedFeatures(persona: PersonaType): string[] {
  switch (persona) {
    case 'beginner':
      return [
        'Start with basic envelopes',
        'Set up one simple goal',
        'Track transactions daily',
        'Try demo mode first',
      ];

    case 'optimiser':
      return [
        'Import your existing budget',
        'Connect bank with Akahu',
        'Set up auto-allocation',
        'Explore analytics',
      ];

    case 'wealth_builder':
      return [
        'Set multiple savings goals',
        'Track net worth',
        'Use scenario planning',
        'Monitor investment accounts',
      ];

    default:
      return [];
  }
}

/**
 * Get contextual help message for persona
 */
export function getContextualHelp(persona: PersonaType, context: string): string {
  const messages: Record<PersonaType, Record<string, string>> = {
    beginner: {
      envelopes: 'Think of envelopes like jars for different spending categories. Put money in each jar based on what you need.',
      goals: 'What are you saving for? A holiday? Emergency fund? Set a goal and watch your progress!',
      transactions: 'Every time you spend money, track it here. This builds awareness of where your money goes.',
    },
    optimiser: {
      envelopes: 'Import your categories from your spreadsheet or create new ones. You can customise everything.',
      goals: 'Set specific goals with target dates. The system will calculate how much you need to save each pay cycle.',
      transactions: 'Connect Akahu to automatically import transactions, or continue manual entry if you prefer.',
    },
    wealth_builder: {
      envelopes: 'Organise your budget with detailed categories. Track both spending and investment allocations.',
      goals: 'Set ambitious long-term goals. Use milestones to track progress on major objectives.',
      transactions: 'Sync multiple accounts and use auto-categorisation to save time on transaction management.',
    },
  };

  return messages[persona][context] || '';
}
