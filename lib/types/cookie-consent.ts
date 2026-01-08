/**
 * Cookie Consent Types
 * For GDPR, PECR, and NZ Privacy Act compliance
 */

/**
 * Cookie categories that can be toggled by the user
 */
export interface CookiePreferences {
  /** Always enabled - required for basic site functionality */
  strictly_necessary: boolean;
  /** Analytics cookies for anonymized usage tracking */
  analytics: boolean;
  /** Marketing cookies for personalized ads (not currently used) */
  marketing: boolean;
}

/**
 * Full cookie preferences record from database
 */
export interface CookiePreferencesRecord extends CookiePreferences {
  id: string;
  user_id: string;
  consent_date: string;
  updated_at: string;
}

/**
 * Cookie consent state for the banner
 */
export type ConsentState = "pending" | "accepted" | "customized";

/**
 * Local storage key for cookie consent
 */
export const COOKIE_CONSENT_KEY = "mbm_cookie_consent";

/**
 * Default preferences (minimal - only strictly necessary)
 */
export const DEFAULT_COOKIE_PREFERENCES: CookiePreferences = {
  strictly_necessary: true,
  analytics: false,
  marketing: false,
};

/**
 * Cookie category descriptions for the UI
 */
export const COOKIE_CATEGORY_INFO: Record<
  keyof CookiePreferences,
  {
    name: string;
    description: string;
    required: boolean;
  }
> = {
  strictly_necessary: {
    name: "Strictly Necessary",
    description:
      "These cookies are essential for the website to function properly. They enable core functionality such as security, authentication, and session management. You cannot disable these cookies.",
    required: true,
  },
  analytics: {
    name: "Analytics",
    description:
      "These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve our services.",
    required: false,
  },
  marketing: {
    name: "Marketing",
    description:
      "These cookies are used to track visitors across websites to display relevant advertisements. We currently do not use marketing cookies.",
    required: false,
  },
};
