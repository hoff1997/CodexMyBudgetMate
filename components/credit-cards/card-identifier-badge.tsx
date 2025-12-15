'use client';

/**
 * Card Identifier Badge
 *
 * Displays a badge showing the card network and last 4 digits
 * extracted from transaction descriptions.
 */

import { CreditCard } from 'lucide-react';
import { parseCardIdentifierString, getNetworkColor } from '@/lib/utils/card-identifier-extractor';
import type { CardNetwork } from '@/lib/types/credit-card-onboarding';

interface CardIdentifierBadgeProps {
  identifier: string | null;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export function CardIdentifierBadge({
  identifier,
  size = 'sm',
  showIcon = true,
}: CardIdentifierBadgeProps) {
  if (!identifier) {
    return null;
  }

  const parsed = parseCardIdentifierString(identifier);
  if (!parsed) {
    return null;
  }

  const colorClasses = getNetworkColor(parsed.network as CardNetwork);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${sizeClasses[size]} ${colorClasses.bg} ${colorClasses.text}`}
      title={`${parsed.network.toUpperCase()} card ending in ${parsed.lastFour}`}
    >
      {showIcon && <CreditCard className={iconSizeClasses[size]} />}
      <span className="uppercase">{parsed.network}</span>
      <span>*{parsed.lastFour}</span>
    </span>
  );
}

/**
 * Compact badge showing just the last 4 digits
 */
export function CardIdentifierCompact({
  identifier,
}: {
  identifier: string | null;
}) {
  if (!identifier) {
    return null;
  }

  const parsed = parseCardIdentifierString(identifier);
  if (!parsed) {
    return null;
  }

  const colorClasses = getNetworkColor(parsed.network as CardNetwork);

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${colorClasses.text}`}
      title={`${parsed.network.toUpperCase()} *${parsed.lastFour}`}
    >
      <span className="opacity-60">•</span>
      <span>{parsed.lastFour}</span>
    </span>
  );
}

/**
 * Full card badge with network logo styling
 */
export function CardNetworkBadge({
  network,
  lastFour,
  className = '',
}: {
  network: string;
  lastFour: string;
  className?: string;
}) {
  const colorClasses = getNetworkColor(network as CardNetwork);

  // Network-specific styles
  const networkStyles: Record<string, string> = {
    visa: 'bg-blue-600 text-white',
    mastercard: 'bg-gradient-to-r from-red-500 to-yellow-500 text-white',
    amex: 'bg-blue-400 text-white',
    discover: 'bg-orange-500 text-white',
    unknown: 'bg-gray-400 text-white',
  };

  const style = networkStyles[network.toLowerCase()] || networkStyles.unknown;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold ${style} ${className}`}
    >
      <CreditCard className="w-3.5 h-3.5" />
      <span className="uppercase">{network}</span>
      <span className="opacity-80">*{lastFour}</span>
    </span>
  );
}
