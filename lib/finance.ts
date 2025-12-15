import type { EnvelopeRow } from "@/lib/auth/types";

export function formatCurrency(value: number, currency = "NZD") {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getEnvelopeStatus(envelope: EnvelopeRow) {
  const target = Number(envelope.target_amount ?? 0);
  const current = Number(envelope.current_amount ?? 0);

  if (!target) {
    return { label: "No target", ratio: 0, colour: "#9CA3AF" }; // silver
  }

  const ratio = Math.round((current / target) * 100);

  if (ratio >= 100) {
    return { label: "On track", ratio, colour: "#7A9E9A" }; // sage
  }

  if (ratio >= 80) {
    return { label: "Nearly there", ratio, colour: "#5A7E7A" }; // sage-dark
  }

  return { label: "Needs attention", ratio, colour: "#6B9ECE" }; // blue
}
