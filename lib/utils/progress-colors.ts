/**
 * Progress Bar Color Utilities
 *
 * Implements the sage gradient system from STYLE-GUIDE.md:
 * - 0% funded:   sage-very-light (#E2EEEC) - barely visible, needs attention
 * - 25% funded:  blend toward sage-light
 * - 50% funded:  sage-light (#B8D4D0) - getting there
 * - 75% funded:  blend toward sage
 * - 100% funded: sage (#7A9E9A) - solid, confident, on track
 *
 * IMPORTANT: Never use red for financial negatives. Blue is used for
 * informational "needs attention" states.
 */

// Sage color palette from style guide
const SAGE_COLORS = {
  veryLight: "#E2EEEC",
  light: "#B8D4D0",
  medium: "#93B3AF", // Blend between light and default
  default: "#7A9E9A",
  dark: "#5A7E7A",
};

/**
 * Get solid progress bar color based on percentage filled
 * Uses intensifying sage gradient - lighter when underfunded, darker as funding increases
 */
export function getProgressColor(percentage: number): string {
  if (percentage >= 100) return SAGE_COLORS.default; // Fully funded
  if (percentage >= 75) return SAGE_COLORS.medium; // Nearly there
  if (percentage >= 50) return SAGE_COLORS.light; // Getting there
  if (percentage >= 25) return "#D0E1DF"; // Blend between very-light and light
  return SAGE_COLORS.veryLight; // Needs attention (but not punishing)
}

/**
 * Get CSS gradient for smoother transition effect
 * Creates a gradient that fills from left to right
 */
export function getProgressGradient(percentage: number): string {
  const fillPoint = Math.min(100, Math.max(0, percentage));

  // For very low percentages, use a subtle gradient
  if (fillPoint < 25) {
    return `linear-gradient(90deg,
      ${SAGE_COLORS.veryLight} 0%,
      ${SAGE_COLORS.veryLight} ${fillPoint}%
    )`;
  }

  // For higher percentages, create a gradient that intensifies
  return `linear-gradient(90deg,
    ${SAGE_COLORS.veryLight} 0%,
    ${SAGE_COLORS.light} ${Math.min(fillPoint, 50)}%,
    ${SAGE_COLORS.default} ${fillPoint}%
  )`;
}

/**
 * Get the progress bar indicator class name based on percentage
 * For use with Tailwind CSS classes
 */
export function getProgressIndicatorClass(percentage: number): string {
  if (percentage >= 100) return "bg-sage";
  if (percentage >= 75) return "bg-[#93B3AF]"; // Medium blend
  if (percentage >= 50) return "bg-sage-light";
  if (percentage >= 25) return "bg-[#D0E1DF]"; // Light blend
  return "bg-sage-very-light";
}

/**
 * Get status configuration based on envelope funding status
 */
export interface StatusConfig {
  dotColor: string;
  label: string;
  labelClass: string;
  valueClass: string;
}

export function getEnvelopeStatusConfig(
  currentAmount: number,
  targetAmount: number
): StatusConfig {
  if (targetAmount <= 0) {
    return {
      dotColor: "bg-silver",
      label: "No target",
      labelClass: "text-text-medium",
      valueClass: "text-text-medium",
    };
  }

  const percentage = (currentAmount / targetAmount) * 100;
  const surplus = currentAmount - targetAmount;

  if (percentage >= 100) {
    return {
      dotColor: "bg-sage",
      label: surplus > 0.01 ? `Surplus: $${surplus.toFixed(0)}` : "On track",
      labelClass: "text-sage-dark",
      valueClass: "text-sage",
    };
  }

  if (percentage >= 80) {
    return {
      dotColor: "bg-sage-light",
      label: "Nearly there",
      labelClass: "text-text-medium",
      valueClass: "text-sage-dark",
    };
  }

  // Under 80% - needs attention (blue, not red)
  return {
    dotColor: "bg-blue",
    label: "Needs attention",
    labelClass: "text-blue",
    valueClass: "text-blue",
  };
}

/**
 * Format percentage for display
 */
export function formatPercentage(
  current: number,
  target: number,
  decimals = 0
): string {
  if (target <= 0) return "—";
  const percentage = Math.min(100, Math.max(0, (current / target) * 100));
  return `${percentage.toFixed(decimals)}%`;
}
