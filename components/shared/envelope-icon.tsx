"use client";

/**
 * Envelope Icon Component
 *
 * Renders an envelope icon using Phosphor Icons.
 * Used throughout the app wherever envelope icons need to be displayed.
 *
 * Handles:
 * - Icon keys (e.g., "groceries", "car") - renders Phosphor icon
 * - Legacy emojis (e.g., "🛒") - falls back to default icon
 * - Missing icons - shows default wallet icon
 */

import { PhosphorIcon, getPhosphorIcon, hasPhosphorIcon, ICON_COLORS } from "@/lib/icons/phosphor-icon-map";
import type { IconWeight } from "@phosphor-icons/react";

interface EnvelopeIconProps {
  /** Icon key or legacy emoji */
  icon: string;
  /** Size in pixels (default: 24) */
  size?: number;
  /** Color override (default: sage) */
  color?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show in a styled container */
  withBackground?: boolean;
  /** Background color when withBackground is true */
  backgroundColor?: string;
  /** Icon weight (default: regular) */
  weight?: IconWeight;
}

/**
 * Check if a string is an emoji (legacy icons)
 */
function isEmoji(str: string): boolean {
  if (!str) return false;
  // Emojis are typically longer than 2 characters when encoded
  // and contain characters outside basic ASCII range
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/u;
  return emojiRegex.test(str);
}

export function EnvelopeIcon({
  icon,
  size = 24,
  color = ICON_COLORS.sage,
  className = "",
  withBackground = false,
  backgroundColor = ICON_COLORS.sageLight,
  weight = "regular",
}: EnvelopeIconProps) {
  // If it's a legacy emoji, try to find a matching icon by name, otherwise use default
  const iconKey = isEmoji(icon) ? "wallet" : icon;

  if (withBackground) {
    const bgSize = size * 1.5;
    return (
      <div
        className={`flex items-center justify-center rounded-lg ${className}`}
        style={{
          width: bgSize,
          height: bgSize,
          backgroundColor,
        }}
      >
        <PhosphorIcon name={iconKey} size={size} color={color} weight={weight} />
      </div>
    );
  }

  return <PhosphorIcon name={iconKey} size={size} color={color} weight={weight} className={className} />;
}

/**
 * Get the icon component for an envelope (for direct rendering)
 */
export function getEnvelopeIconComponent(icon: string) {
  const iconKey = isEmoji(icon) ? "wallet" : icon;
  return getPhosphorIcon(iconKey);
}

/**
 * Check if an envelope has a valid icon
 */
export function hasValidIcon(icon: string): boolean {
  if (isEmoji(icon)) return false;
  return hasPhosphorIcon(icon);
}

// Re-export ICON_COLORS as DOODLE_COLORS for backwards compatibility
export { ICON_COLORS as DOODLE_COLORS } from "@/lib/icons/phosphor-icon-map";
