/**
 * Remy's Coaching Messages
 * Universal financial coaching guidance for various scenarios
 *
 * Remy's Role: Financial coach - helping you tell your money where to go
 *
 * Voice Guidelines:
 * - Ask questions instead of giving directives
 * - Validate feelings ("That's tough," "I get it")
 * - Empower choice ("You know what's best," "Your call")
 * - No judgment on setbacks ("Life happens," "We're human")
 * - Celebrate progress ("Look at you!" "You're building momentum")
 */

export const remyCoachingMessages = {
  // Budget states
  balanced: {
    title: "Budget's balanced!",
    message: "You've allocated every dollar. That's the whole game - telling your money where to go before it disappears.",
  },

  surplus: {
    title: "You've got surplus",
    message: "Nice! You've covered everything and still have money left. What do you want to do with it? Emergency fund? Get ahead on a bill? Your call.",
  },

  shortfall: {
    title: "Budget's a bit short",
    message: "You're short this cycle. That's tough, but it's information. Look at your flexible spending - what could be trimmed if needed? You know your situation best.",
  },

  // Progress
  onTrack: {
    title: "You're on track",
    message: "Look at you! Your envelopes are where they should be. Keep this up and you're building a solid financial habit.",
  },

  needsAttention: {
    title: "Some envelopes need attention",
    message: "A few envelopes are running low. Not a crisis - just something to keep an eye on. What needs adjusting?",
  },

  // Setbacks
  overspent: {
    title: "Envelope's over budget",
    message: "Hey, it happens - we're human. Let's look at this as information: Was it a one-off, or is the budget unrealistic? Either way, no judgment. Let's just adjust and keep going.",
  },

  missedGoal: {
    title: "Didn't hit the goal this time",
    message: "Goals take time. The fact that you're trying matters more than one missed target. What got in the way? What can you learn from it?",
  },

  // Wins
  goalAchieved: {
    title: "You hit your goal!",
    message: "Take a moment to appreciate this. You made a plan, stuck with it, and got there. That takes real discipline. What's next?",
  },

  debtProgress: {
    title: "Debt's going down",
    message: "Every payment is progress. You're doing the hard work of getting yourself free. Keep going.",
  },

  // Encouragement
  struggling: {
    title: "Feeling overwhelmed?",
    message: "Budgeting is a skill - it takes practice. You don't need to be perfect, just consistent. What's one small thing you can focus on right now?",
  },

  newUser: {
    title: "Just getting started?",
    message: "The first month is always the messiest. You're learning what's realistic and what's not. Give yourself grace and keep adjusting.",
  },

  // Accountability (gentle)
  checkIn: {
    title: "Quick check-in",
    message: "How's your budget feeling? What's working? What's challenging? Be honest with yourself - that's the only way to improve.",
  },

  // Guidance
  bigPurchase: {
    title: "Big purchase coming up?",
    message: "Let's look at the numbers together. Can your budget handle it without wrecking other priorities? What does your surplus say?",
  },

  unexpectedExpense: {
    title: "Unexpected expense?",
    message: "Life happens. Let's see what we can shuffle around. This is exactly why emergency funds exist - to handle surprises without derailing everything.",
  },
};

/**
 * Get a coaching message based on budget state
 */
export function getCoachingMessage(state: keyof typeof remyCoachingMessages) {
  return remyCoachingMessages[state] || remyCoachingMessages.checkIn;
}

/**
 * Coaching questions for different scenarios
 */
export const coachingQuestions = {
  budgetSetup: [
    "What matters most to you financially right now?",
    "What would make you feel more secure?",
    "If money stress disappeared, what would that look like?",
  ],

  allocation: [
    "Does this feel realistic for how you actually live?",
    "What would happen if this envelope got less money?",
    "Is this sustainable month after month?",
  ],

  overspending: [
    "What's going on with this envelope?",
    "Was this a one-off or is the budget too tight?",
    "What needs to change here?",
  ],

  surplus: [
    "What do you want to do with the extra?",
    "What goal would this help you reach faster?",
    "Where would this money do the most good?",
  ],

  shortfall: [
    "Where could you trim if you absolutely had to?",
    "What's most important to protect right now?",
    "Is there income you could add?",
  ],
};

/**
 * Empowering phrases
 */
export const empoweringPhrases = [
  "You're in control here",
  "You know what's best for you",
  "This is your budget, your rules",
  "Trust yourself on this",
  "You've got this",
  "What feels right to you?",
  "You decide what matters most",
  "I'm in your corner",
  "Progress, not perfection",
  "You're building a solid habit",
];

/**
 * Get a random empowering phrase
 */
export function getRandomEmpoweringPhrase(): string {
  return empoweringPhrases[Math.floor(Math.random() * empoweringPhrases.length)];
}

/**
 * Remy's tagline
 */
export const REMY_TAGLINE = "Your financial coach - helping you tell your money where to go";
