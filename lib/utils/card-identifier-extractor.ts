/**
 * Card Identifier Extractor Utilities
 *
 * Functions for extracting and parsing card identifiers from transaction data,
 * matching transactions to credit cards, and determining card networks.
 */

import type { CardNetwork } from '@/lib/types/credit-card-onboarding';
import type { AccountRow as Account } from '@/lib/types/accounts';

// =====================================================
// TYPES
// =====================================================

export interface ImportedTransaction {
  description: string;
  memo?: string;
  merchant_name?: string;
  card_info?: string;
  raw_data?: Record<string, unknown>;
}

export interface ParsedCardIdentifier {
  /** Full identifier string (e.g., "VISA *1234") */
  full: string;
  /** Card network */
  network: CardNetwork;
  /** Last 4 digits */
  lastFour: string;
  /** Confidence level (0-1) */
  confidence: number;
}

// =====================================================
// CARD IDENTIFIER EXTRACTION
// =====================================================

/**
 * Extract card identifier from imported transaction data
 * Looks in various fields for card information
 */
export function extractCardIdentifier(transactionData: ImportedTransaction): string | null {
  // Try dedicated card info field first
  if (transactionData.card_info) {
    const parsed = parseCardIdentifierString(transactionData.card_info);
    if (parsed) {
      return parsed.full;
    }
  }

  // Try raw data fields (common in bank exports)
  if (transactionData.raw_data) {
    const cardFields = ['card', 'card_number', 'card_last_four', 'card_info', 'payment_method'];
    for (const field of cardFields) {
      const value = transactionData.raw_data[field];
      if (typeof value === 'string' && value.length > 0) {
        const parsed = parseCardIdentifierString(value);
        if (parsed) {
          return parsed.full;
        }
      }
    }
  }

  // Try extracting from description
  const fromDescription = extractFromDescription(transactionData.description);
  if (fromDescription) {
    return fromDescription;
  }

  // Try memo field
  if (transactionData.memo) {
    const fromMemo = extractFromDescription(transactionData.memo);
    if (fromMemo) {
      return fromMemo;
    }
  }

  return null;
}

/**
 * Parse a card identifier string into components
 */
export function parseCardIdentifierString(identifier: string): ParsedCardIdentifier | null {
  if (!identifier) {
    return null;
  }

  const normalized = identifier.toUpperCase().trim();

  // Pattern: NETWORK *1234 or NETWORK XXXX1234 or NETWORK ending in 1234
  const patterns = [
    // "VISA *1234" or "VISA **** 1234"
    /\b(VISA|MASTERCARD|MASTER|MC|AMEX|AMERICAN EXPRESS|DISCOVER|DINERS|JCB)\s*[*X]+\s*(\d{4})\b/i,
    // "VISA ending in 1234"
    /\b(VISA|MASTERCARD|MASTER|MC|AMEX|AMERICAN EXPRESS|DISCOVER|DINERS|JCB)\s+(?:ending\s+in|ends?\s+in)\s*(\d{4})\b/i,
    // "Card ending 1234"
    /\b(?:card|cc)\s+(?:ending\s+in|ends?\s+in|#)\s*(\d{4})\b/i,
    // Just "*1234" or "X1234"
    /[*X]+\s*(\d{4})\b/,
    // Just last 4 digits after common separators
    /[-*#]\s*(\d{4})$/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      let network: CardNetwork = 'other';
      let lastFour: string;

      if (match.length === 3) {
        // Has network and last four
        network = parseCardNetwork(match[1]);
        lastFour = match[2];
      } else {
        // Just last four
        lastFour = match[1];
        // Try to determine network from context
        network = inferNetworkFromContext(normalized);
      }

      return {
        full: formatCardIdentifier(network, lastFour),
        network,
        lastFour,
        confidence: match.length === 3 ? 0.9 : 0.6,
      };
    }
  }

  return null;
}

/**
 * Extract card identifier from transaction description
 */
function extractFromDescription(description: string): string | null {
  if (!description) {
    return null;
  }

  const parsed = parseCardIdentifierString(description);
  if (parsed && parsed.confidence > 0.5) {
    return parsed.full;
  }

  return null;
}

// =====================================================
// CARD NETWORK PARSING
// =====================================================

/**
 * Parse card network from identifier string
 */
export function parseCardNetwork(identifier: string): CardNetwork {
  if (!identifier) {
    return 'other';
  }

  const normalized = identifier.toUpperCase().trim();

  // Visa
  if (normalized.includes('VISA')) {
    return 'visa';
  }

  // Mastercard
  if (
    normalized.includes('MASTERCARD') ||
    normalized.includes('MASTER CARD') ||
    normalized === 'MC' ||
    normalized === 'MASTER'
  ) {
    return 'mastercard';
  }

  // American Express
  if (
    normalized.includes('AMEX') ||
    normalized.includes('AMERICAN EXPRESS') ||
    normalized.includes('AMERICANEXPRESS')
  ) {
    return 'amex';
  }

  // Discover
  if (normalized.includes('DISCOVER')) {
    return 'discover';
  }

  return 'other';
}

/**
 * Try to infer card network from context clues
 */
function inferNetworkFromContext(text: string): CardNetwork {
  const upper = text.toUpperCase();

  if (upper.includes('VISA')) return 'visa';
  if (upper.includes('MC') || upper.includes('MASTERCARD')) return 'mastercard';
  if (upper.includes('AMEX') || upper.includes('AMERICAN')) return 'amex';
  if (upper.includes('DISCOVER')) return 'discover';

  return 'other';
}

/**
 * Format card identifier for display
 */
export function formatCardIdentifier(network: CardNetwork, lastFour: string): string {
  const networkName = getNetworkDisplayName(network);
  return `${networkName} *${lastFour}`;
}

/**
 * Get display name for card network
 */
export function getNetworkDisplayName(network: CardNetwork): string {
  switch (network) {
    case 'visa':
      return 'Visa';
    case 'mastercard':
      return 'Mastercard';
    case 'amex':
      return 'Amex';
    case 'discover':
      return 'Discover';
    default:
      return 'Card';
  }
}

// =====================================================
// TRANSACTION MATCHING
// =====================================================

/**
 * Match a transaction to a credit card based on card identifier
 */
export function matchTransactionToCard(
  transaction: { card_identifier?: string | null; description: string; account_id?: string },
  cards: Account[]
): Account | null {
  if (cards.length === 0) {
    return null;
  }

  // If transaction already has an account_id that matches a card, use that
  if (transaction.account_id) {
    const matchedCard = cards.find(c => c.id === transaction.account_id);
    if (matchedCard) {
      return matchedCard;
    }
  }

  // Try to match by card identifier
  if (transaction.card_identifier) {
    const parsed = parseCardIdentifierString(transaction.card_identifier);
    if (parsed) {
      // Try exact last-4 match
      const lastFourMatch = cards.find(card => {
        const cardLastFour = extractLastFourFromAccountName(card.name);
        return cardLastFour === parsed.lastFour;
      });
      if (lastFourMatch) {
        return lastFourMatch;
      }

      // Try network match if only one card of that network
      const networkMatches = cards.filter(card => {
        const cardNetwork = inferNetworkFromAccountName(card.name);
        return cardNetwork === parsed.network;
      });
      if (networkMatches.length === 1) {
        return networkMatches[0];
      }
    }
  }

  // Try to match by description keywords
  const descLower = transaction.description.toLowerCase();
  for (const card of cards) {
    const cardNameLower = card.name.toLowerCase();
    // Check if card name appears in description
    if (descLower.includes(cardNameLower)) {
      return card;
    }
    // Check common patterns
    const lastFour = extractLastFourFromAccountName(card.name);
    if (lastFour && descLower.includes(lastFour)) {
      return card;
    }
  }

  return null;
}

/**
 * Extract last 4 digits from account name if present
 */
function extractLastFourFromAccountName(name: string): string | null {
  // Common patterns: "Visa *1234", "Chase Freedom 1234", "Card ending 1234"
  const match = name.match(/\b(\d{4})\b/);
  return match ? match[1] : null;
}

/**
 * Infer network from account name
 */
function inferNetworkFromAccountName(name: string): CardNetwork {
  return parseCardNetwork(name);
}

// =====================================================
// BADGE STYLING
// =====================================================

/**
 * Get color for card network (for badge styling)
 */
export function getNetworkColor(network: CardNetwork): {
  bg: string;
  text: string;
  border: string;
} {
  switch (network) {
    case 'visa':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
      };
    case 'mastercard':
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        border: 'border-orange-200',
      };
    case 'amex':
      return {
        bg: 'bg-cyan-50',
        text: 'text-cyan-700',
        border: 'border-cyan-200',
      };
    case 'discover':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
      };
    default:
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-700',
        border: 'border-gray-200',
      };
  }
}

/**
 * Get icon/emoji for card network
 */
export function getNetworkIcon(network: CardNetwork): string {
  // Using simple representations - could be replaced with actual brand icons
  switch (network) {
    case 'visa':
      return '💳'; // Could use Visa logo
    case 'mastercard':
      return '💳'; // Could use Mastercard logo
    case 'amex':
      return '💳'; // Could use Amex logo
    case 'discover':
      return '💳'; // Could use Discover logo
    default:
      return '💳';
  }
}
