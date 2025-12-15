// Remy Coaching System - Type Definitions

export interface PageCoaching {
  pageId: string;
  pageName: string;

  // Core content
  purpose: string; // 1-2 sentences, what is this page for?
  remyIntro: string; // Remy's welcome message for this page

  // Tips
  quickTips: string[]; // 3-5 practical tips

  // Features explained
  features: FeatureExplanation[];

  // FAQs
  faqs: FAQ[];

  // Coaching context
  methodology?: string; // Which financial principle applies
  commonMistakes?: string[]; // What to avoid
}

export interface FeatureExplanation {
  id: string;
  name: string;
  what: string; // What is it?
  why: string; // Why does it matter?
  how: string; // How to use it
}

export interface FAQ {
  question: string;
  answer: string;
}
