/**
 * Utility functions for formatting values
 */

/**
 * Format a number as money (NZD)
 */
export function formatMoney(
  amount: number | null | undefined,
  options?: {
    showCents?: boolean;
    showSign?: boolean;
    currency?: string;
  }
): string {
  if (amount === null || amount === undefined) {
    return "$0.00";
  }

  const { showCents = true, showSign = false, currency = "NZD" } = options || {};

  const formatter = new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency,
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });

  const formatted = formatter.format(Math.abs(amount));

  if (showSign && amount !== 0) {
    return amount > 0 ? `+${formatted}` : `-${formatted}`;
  }

  return amount < 0 ? `-${formatted.replace("-", "")}` : formatted;
}

/**
 * Format a date for display
 */
export function formatDate(
  date: string | Date | null | undefined,
  options?: {
    format?: "short" | "medium" | "long";
    includeTime?: boolean;
  }
): string {
  if (!date) return "";

  const dateObj = typeof date === "string" ? new Date(date) : date;
  const { format = "medium", includeTime = false } = options || {};

  const dateOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: format === "short" ? "short" : format === "long" ? "long" : "short",
    year: format === "long" ? "numeric" : undefined,
  };

  if (includeTime) {
    dateOptions.hour = "numeric";
    dateOptions.minute = "2-digit";
  }

  return dateObj.toLocaleDateString("en-NZ", dateOptions);
}

/**
 * Format a percentage
 */
export function formatPercent(
  value: number | null | undefined,
  decimals: number = 0
): string {
  if (value === null || value === undefined) return "0%";
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a number with thousands separators
 */
export function formatNumber(
  value: number | null | undefined,
  decimals: number = 0
): string {
  if (value === null || value === undefined) return "0";

  return new Intl.NumberFormat("en-NZ", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
