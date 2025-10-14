import type { EnvelopeRow } from "@/lib/auth/types";

export function formatCurrency(value: number, currency = "NZD") {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(value);
}

export function getEnvelopeStatus(envelope: EnvelopeRow) {
  const target = Number(envelope.target_amount ?? 0);
  const current = Number(envelope.current_amount ?? 0);

  if (!target) {
    return { label: "No target", ratio: 0, colour: "hsl(174 62% 28%)" };
  }

  const ratio = Math.round((current / target) * 100);

  if (ratio >= 100) {
    return { label: "On track", ratio, colour: "hsl(154 45% 45%)" };
  }

  if (ratio >= 80) {
    return { label: "Nearly there", ratio, colour: "hsl(44 98% 50%)" };
  }

  return { label: "Needs attention", ratio, colour: "hsl(4 86% 58%)" };
}
