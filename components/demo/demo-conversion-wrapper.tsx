"use client";

import { useDemoConversion } from "@/hooks/use-demo-conversion";
import { DemoConversionBanner } from "./demo-conversion-banner";

/**
 * Wrapper component that handles demo conversion banner display logic
 * Use this in the dashboard to automatically show conversion prompts
 */
export function DemoConversionWrapper() {
  const {
    stats,
    isLoading,
    shouldShowBanner,
    variant,
    handleConvert,
    handleDismiss,
  } = useDemoConversion();

  if (isLoading || !shouldShowBanner || !stats) {
    return null;
  }

  return (
    <DemoConversionBanner
      daysInDemo={stats.daysInDemo || 0}
      achievementsEarned={stats.achievementsEarned || 0}
      envelopesCreated={stats.envelopesCreated || 0}
      transactionsTracked={stats.transactionsTracked || 0}
      onConvert={handleConvert}
      onDismiss={handleDismiss}
      variant={variant}
    />
  );
}
